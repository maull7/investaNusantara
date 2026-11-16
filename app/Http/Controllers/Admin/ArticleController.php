<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Category;
use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ArticleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $articles = Article::query()
            ->with(['category:id,name', 'region:code,name', 'author:id,name'])
            ->select(['id', 'title', 'slug', 'status', 'category_id', 'region_code', 'author_id', 'published_at', 'updated_at', 'views'])
            ->when($request->string('status')->value(), fn ($q, $s) => $q->where('status', $s))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('title', 'like', "%$term%"))
            // Editors see their region; writers see their own work; super admin sees everything.
            ->when($user->role === Role::Editor && $user->region_code, fn ($q) => $q->inRegion($user->region_code))
            ->when($user->hasRole(Role::Journalist, Role::Contributor), fn ($q) => $q->where('author_id', $user->id))
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
            'filters' => $request->only('status', 'q'),
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
            'article' => $article->exists ? $article->load('region:code,name,parent_code') : null,
            'categories' => Category::orderBy('sort')->get(['id', 'name']),
            'provinces' => Region::provinces()->get(['code', 'name', 'slug']),
            'can' => [
                'publish' => $article->exists && request()->user()->can('publish', $article),
                'submit' => $article->exists && request()->user()->can('submit', $article),
                'flag' => request()->user()->hasRole(Role::SuperAdmin, Role::Editor),
            ],
        ]);
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
        ]);

        $user = $request->user();
        // Region-bound editors cannot move an article outside their region.
        if ($user->role === Role::Editor && $user->region_code
            && ! (new Region(['code' => $user->region_code]))->contains($data['region_code'] ?? null)) {
            abort(422, 'Wilayah di luar cakupan editor.');
        }
        if (! $user->hasRole(Role::SuperAdmin, Role::Editor)) {
            unset($data['is_headline'], $data['is_breaking']);
        }

        if ($request->hasFile('cover')) {
            if ($article->cover_path) {
                Storage::disk('public')->delete($article->cover_path);
            }
            $data['cover_path'] = $request->file('cover')->store('covers', 'public');
        }
        unset($data['cover']);

        if (! $article->exists) {
            $data['slug'] = Str::slug($data['title']).'-'.Str::lower(Str::random(5));
        }

        $article->fill($data)->save();
    }
}
