<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Enums\NewsTaskStatus;
use App\Jobs\ReviewArticle;
use App\Models\Article;
use App\Models\ArticleReview;
use App\Models\Category;
use App\Models\Region;
use App\Services\NewsPipeline;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Public news pages. */
class PortalController extends Controller
{
    public function home(): Response
    {
        // Editors pick headlines; until five are picked, the newest articles with a photo fill the slider.
        $headlines = Article::published()->card()->where('is_headline', true)->limit(5)->get();
        if ($headlines->count() < 5) {
            $headlines = $headlines->concat(Article::published()->card()
                ->whereNotIn('id', $headlines->modelKeys())
                ->whereNotNull('cover_path')
                ->limit(5 - $headlines->count())->get());
        }

        return Inertia::render('home', [
            'headlines' => $headlines,
            'breaking' => Article::published()->card()->where('is_breaking', true)->limit(6)->get(),
            'latest' => Article::published()->card()->limit(12)->get(),
            'national' => Article::published()->card()->whereNull('region_code')->limit(6)->get(),
            'popular' => Article::published()->card()->trending()->limit(5)->get(),
            'provinceCounts' => $this->provinceCounts(),
        ]);
    }

    /** Province code => published article count (province + its regencies/cities). */
    private function provinceCounts(): \Illuminate\Support\Collection
    {
        return Article::published()->reorder()
            ->whereNotNull('region_code')
            ->selectRaw('substr(region_code, 1, 2) as province, count(*) as total')
            ->groupBy('province')
            ->pluck('total', 'province');
    }

    public function regions(): Response
    {
        return Inertia::render('region/index', [
            'provinceCounts' => $this->provinceCounts(),
        ]);
    }

    public function regionPreview(Region $province): JsonResponse
    {
        abort_unless($province->level === Region::PROVINCE, 404);

        return response()->json([
            'latest' => Article::published()->card()->inRegion($province)->limit(3)->get(),
        ]);
    }

    /**
     * Article counts for a province page: per kabupaten/kota, rolled up to the first two code levels
     * (so articles tagged to a district still count for their city).
     *
     * @return array<string, mixed>
     */
    private function regionStats(Region $province, Region $region): array
    {
        $perCode = Article::published()->reorder()->inRegion($province)
            ->selectRaw('substr(region_code, 1, 5) as code, count(*) as total')
            ->groupBy('code')->pluck('total', 'code');
        $cities = $province->children()->get(['code', 'name', 'slug', 'type'])
            ->map(fn (Region $c) => [...$c->only('code', 'name', 'slug', 'type'), 'total' => (int) ($perCode[$c->code] ?? 0)]);
        $ranked = $cities->where('total', '>', 0)->sortByDesc('total')->values();
        $pos = $region->is($province) ? false : $ranked->search(fn ($c) => $c['code'] === $region->code);

        return [
            'total' => (int) $cities->sum('total'),
            'cities_with_news' => $ranked->count(),
            // Every kabupaten/kota, busiest first (those without news last, by name).
            'cities' => $cities->sortBy([['total', 'desc'], ['name', 'asc']])->values(),
            // 1-based place of the viewed city among those with news; null for a province page or no news.
            'rank' => $pos === false ? null : $pos + 1,
        ];
    }

    public function region(Region $province, ?Region $child = null): Response
    {
        abort_unless($province->level === Region::PROVINCE, 404);
        $region = $child ?? $province;

        return Inertia::render('region/show', [
            'province' => $province->only('code', 'name', 'slug', 'image_url'),
            'region' => [...$region->only('code', 'name', 'slug', 'level', 'type'), 'landmark' => $region->landmark()],
            'cities' => $province->children()->get(['code', 'name', 'slug', 'type']),
            'articles' => Article::published()->card()->inRegion($region)->paginate(12),
            'popular' => Article::published()->card()->inRegion($region)->trending()->limit(5)->get(),
            'stats' => $this->regionStats($province, $region),
        ]);
    }

    public function category(Category $category): Response
    {
        return Inertia::render('category/show', [
            'category' => $category->only('name', 'slug'),
            'articles' => Article::published()->card()->whereBelongsTo($category)->paginate(12),
        ]);
    }

    public function article(Request $request, Article $article): Response
    {
        abort_unless($article->status === ArticleStatus::Published && $article->published_at?->isPast(), 404);
        // The review poll reloads only `review`; don't count it as another read.
        // One read per visitor per day, so refreshes and bots don't inflate "views" or Trending.
        if (! $request->header('X-Inertia-Partial-Data')) {
            $first = DB::table('article_views')->insertOrIgnore([
                'article_id' => $article->id,
                'viewed_on' => today()->toDateString(),
                'visitor' => $request->user() ? 'u'.$request->user()->id : sha1($request->ip().'|'.$request->userAgent()),
            ]);
            if ($first) {
                $article->increment('views');
            }
        }
        $article->load(['category:id,name,slug', 'region:code,name,slug,parent_code,level,image_url', 'region.parent:code,name,slug,image_url', 'author:id,name']);
        // Guests get only the "Ringkasan": the full body never leaves the server. Login brings them back here.
        if (! $request->user()) {
            $article->body = $article->source_excerpt ?? NewsPipeline::firstWords($article->body) ?? '';
            $article->excerpt = null;
            redirect()->setIntendedUrl($request->url());
        }

        return Inertia::render('article/show', [
            'article' => $article,
            'related' => Article::published()->card()
                ->whereKeyNot($article->id)
                ->when($article->region_code, fn ($q) => $q->inRegion(substr($article->region_code, 0, 2)), fn ($q) => $q->whereBelongsTo($article->category))
                ->limit(4)->get(),
            // "Review AI" is for signed-in readers only.
            'review' => fn () => $request->user() ? $article->review()->first(['status', 'points', 'body', 'error']) : null,
        ]);
    }

    /** "Review AI": the first signed-in reader to ask starts the run; everyone after sees the saved review. */
    public function review(Request $request, Article $article): RedirectResponse
    {
        abort_unless($article->status === ArticleStatus::Published && $article->published_at?->isPast(), 404);

        $review = ArticleReview::createOrFirst(['article_id' => $article->id], ['requested_by' => $request->user()->id]);
        if ($review->wasRecentlyCreated) {
            ReviewArticle::dispatch($review->id);
        } elseif ($review->status === NewsTaskStatus::Failed) {
            $review->update(['status' => NewsTaskStatus::Queued, 'attempts' => 0, 'error' => null]);
            ReviewArticle::dispatch($review->id);
        }

        return back();
    }

    public function search(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        return Inertia::render('search', [
            'q' => $q,
            'articles' => $q === '' ? null : Article::published()->card()->search($q)->paginate(12)->withQueryString(),
        ]);
    }

    /**
     * City list for the region dropdown.
     *
     * @return Collection<int, Region>
     */
    public function cities(Region $province): Collection
    {
        return $province->children()->get(['code', 'name', 'slug']);
    }

    /** Province profile for the /wilayah panel: editorial text and UMKM from province_profiles.json, plus live kab/kota counts. */
    public function profile(Region $province): array
    {
        abort_unless($province->level === Region::PROVINCE, 404);
        static $all;
        $all ??= json_decode((string) @file_get_contents(database_path('data/province_profiles.json')), true) ?: [];
        $children = $province->children()->get(['type']);

        return [
            ...($all[$province->code] ?? ['capital' => null, 'region' => null, 'summary' => null, 'icons' => [], 'umkm' => []]),
            'regencies' => $children->where('type', '!=', 'kota')->count(),
            'cities' => $children->where('type', 'kota')->count(),
        ];
    }

    public function sitemap(): HttpResponse
    {
        $urls = collect([route('home')])
            ->merge(Category::pluck('slug')->map(fn ($s) => route('category', $s)))
            ->merge(Region::with('parent:code,slug')->whereIn('level', [1, 2])->get(['code', 'slug', 'parent_code', 'level'])
                ->map(fn (Region $r) => $r->level === 1 ? route('region', $r->slug) : route('region', [$r->parent->slug, $r->slug])))
            ->merge(Article::published()->limit(5000)->pluck('slug')->map(fn ($s) => route('article', $s)));

        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            .$urls->map(fn ($u) => '<url><loc>'.e($u).'</loc></url>')->implode('')
            .'</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }
}
