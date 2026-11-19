<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ArticleStatus;
use App\Enums\Permission;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Category;
use App\Models\Region;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Editors see their region; admins with article access see everything; everyone else sees their own work.
        $visible = Article::query()
            ->when($user->role === Role::Editor && $user->region_code, fn ($q) => $q->inRegion($user->region_code))
            ->when(! $user->hasRole(Role::Editor) && ! $user->canAccess(Permission::Articles), fn ($q) => $q->where('author_id', $user->id));

        // Dashboard tiles: per-status counts and total views over everything this user can see.
        $counts = (clone $visible)->reorder()->selectRaw('status, count(*) as total, sum(views) as views')
            ->groupBy('status')->get()->keyBy(fn ($row) => $row->status->value);
        $stats = [
            'total' => (int) $counts->sum('total'),
            'views' => (int) $counts->sum('views'),
            ...collect(ArticleStatus::cases())->mapWithKeys(fn (ArticleStatus $s) => [$s->value => (int) ($counts[$s->value]->total ?? 0)]),
        ];

        $articles = (clone $visible)
            ->with(['category:id,name', 'region:code,name', 'author:id,name', 'requester:id,name'])
            ->select(['id', 'title', 'slug', 'status', 'cover_path', 'category_id', 'region_code', 'author_id', 'requested_by', 'published_at', 'updated_at', 'views', 'is_headline', 'is_breaking', 'is_ai_generated'])
            ->when($request->string('status')->value(), fn ($q, $s) => $q->where('status', $s))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('title', 'like', "%$term%"))
            // ?requester=<user id> for AI articles that user fetched, 'auto' for scheduled ones.
            ->when($request->string('requester')->value(), fn ($q, $r) => $r === 'auto'
                ? $q->where('is_ai_generated', true)->whereNull('requested_by')
                : $q->where('requested_by', (int) $r))
            ->latest('updated_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Article $a) => [
                ...$a->toArray(),
                'can' => [
                    'update' => $user->can('update', $a),
                    'publish' => $user->can('publish', $a),
                    'submit' => $user->can('submit', $a),
                ],
            ]);

        return Inertia::render('admin/articles/index', [
            'articles' => $articles,
            'stats' => $stats,
            'filters' => $request->only('status', 'q', 'requester'),
            'requesters' => User::whereIn('id', (clone $visible)->reorder()->select('requested_by')->whereNotNull('requested_by')->distinct())
                ->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return $this->form(new Article);
    }

    public function store(Request $request): RedirectResponse
    {
        $article = new Article([
            'author_id' => $request->user()->id,
            'status' => ArticleStatus::Draft,
        ]);
        $this->save($request, $article);

        return to_route('admin.articles.edit', $article)->with('success', 'Artikel disimpan sebagai draft.');
    }

    public function edit(Article $article): Response
    {
        $this->authorize('update', $article);

        return $this->form($article);
    }

    public function update(Request $request, Article $article): RedirectResponse
    {
        $this->authorize('update', $article);
        $this->save($request, $article);

        return back()->with('success', 'Artikel diperbarui.');
    }

    public function destroy(Article $article): RedirectResponse
    {
        $this->authorize('delete', $article);
        $article->delete();

        return to_route('admin.articles.index')->with('success', 'Artikel dihapus.');
    }

    public function submit(Article $article): RedirectResponse
    {
        $this->authorize('submit', $article);
        $article->update(['status' => ArticleStatus::Review]);

        return back()->with('success', 'Artikel diajukan ke editor.');
    }

    public function publish(Request $request, Article $article): RedirectResponse
    {
        $this->authorize('publish', $article);
        $article->update([
            'status' => ArticleStatus::Published,
            'published_at' => $article->published_at ?? now(),
            'editor_id' => $request->user()->id,
        ]);

        return back()->with('success', 'Artikel diterbitkan.');
    }

    public function reject(Request $request, Article $article): RedirectResponse
    {
        $this->authorize('publish', $article);
        $article->update(['status' => ArticleStatus::Rejected, 'editor_id' => $request->user()->id]);

        return back()->with('success', 'Artikel dikembalikan ke penulis.');
    }

    private function form(Article $article): Response
    {
        return Inertia::render('admin/articles/form', [
            'article' => $article->exists ? $article->load('region:code,name,parent_code', 'tags:id,name') : null,
            'categories' => Category::orderBy('sort')->get(['id', 'name']),
            'provinces' => Region::provinces()->get(['code', 'name', 'slug']),
            'can' => [
                'publish' => $article->exists && request()->user()->can('publish', $article),
                'submit' => $article->exists && request()->user()->can('submit', $article),
                'flag' => $this->canFlag(request()->user()),
            ],
        ]);
    }

    /** Headline/breaking flags: editors and admins with article access. */
    private function canFlag(User $user): bool
    {
        return $user->hasRole(Role::Editor) || $user->canAccess(Permission::Articles);
    }

    private function save(Request $request, Article $article): void
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
            'region_code' => ['nullable', 'exists:regions,code'],
            'cover' => ['nullable', 'image', 'max:2048'],
            'is_headline' => ['boolean'],
            'is_breaking' => ['boolean'],
            'seo_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:160'],
            'social_post' => ['nullable', 'string', 'max:1000'],
            'tags' => ['nullable', 'string', 'max:500'],
            'sentiment' => ['nullable', Rule::in(Article::SENTIMENTS)],
        ]);

        $user = $request->user();
        // Region-bound editors cannot move an article outside their region.
        if ($user->role === Role::Editor && $user->region_code
            && ! (new Region(['code' => $user->region_code]))->contains($data['region_code'] ?? null)) {
            abort(422, 'Wilayah di luar cakupan editor.');
        }
        if (! $this->canFlag($user)) {
            unset($data['is_headline'], $data['is_breaking']);
        }

        if ($request->hasFile('cover')) {
            if ($article->cover_path) {
                Storage::disk('public')->delete($article->cover_path);
            }
            $data['cover_path'] = $request->file('cover')->store('covers', 'public');
        }
        unset($data['cover']);
        $tags = explode(',', (string) ($data['tags'] ?? ''));
        unset($data['tags']);

        if (! $article->exists) {
            $data['slug'] = Str::slug($data['title']).'-'.Str::lower(Str::random(5));
        }

        $article->fill($data)->save();
        $article->tags()->sync(Tag::idsFor($tags, 10));
    }
}
