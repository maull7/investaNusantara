<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\Category;
use App\Models\Region;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
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
            'popular' => Article::published()->card()->reorder('views', 'desc')->limit(5)->get(),
            // Province code => published article count (province + its regencies/cities).
            'provinceCounts' => Article::published()->reorder()
                ->whereNotNull('region_code')
                ->selectRaw('substr(region_code, 1, 2) as province, count(*) as total')
                ->groupBy('province')
                ->pluck('total', 'province'),
        ]);
    }

    public function region(Region $province, ?Region $child = null): Response
    {
        abort_unless($province->level === Region::PROVINCE, 404);
        $region = $child ?? $province;

        return Inertia::render('region/show', [
            'province' => $province->only('code', 'name', 'slug', 'image_url'),
            'region' => $region->only('code', 'name', 'slug', 'level', 'type'),
            'cities' => $province->children()->get(['code', 'name', 'slug', 'type']),
            'articles' => Article::published()->card()->inRegion($region)->paginate(12),
        ]);
    }

    public function category(Category $category): Response
    {
        return Inertia::render('category/show', [
            'category' => $category->only('name', 'slug'),
            'articles' => Article::published()->card()->whereBelongsTo($category)->paginate(12),
        ]);
    }

    public function article(Article $article): Response
    {
        abort_unless($article->status === ArticleStatus::Published && $article->published_at?->isPast(), 404);
        $article->increment('views');
        $article->load(['category:id,name,slug', 'region:code,name,slug,parent_code,level,image_url', 'region.parent:code,name,slug,image_url', 'author:id,name']);

        return Inertia::render('article/show', [
            'article' => $article,
            'related' => Article::published()->card()
                ->whereKeyNot($article->id)
                ->when($article->region_code, fn ($q) => $q->inRegion(substr($article->region_code, 0, 2)), fn ($q) => $q->whereBelongsTo($article->category))
                ->limit(4)->get(),
        ]);
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
