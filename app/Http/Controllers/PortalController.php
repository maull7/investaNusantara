<?php

namespace App\Http\Controllers;

use App\Enums\ArticleStatus;
use App\Enums\NewsTaskStatus;
use App\Jobs\ReviewArticle;
use App\Models\Article;
use App\Models\ArticleReview;
use App\Models\Category;
use App\Models\DirectoryEntry;
use App\Models\MembershipPlan;
use App\Models\Region;
use App\Models\RegionProfile;
use App\Models\Tag;
use App\Services\NewsPipeline;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

        $page = Inertia::render('home', [
            'headlines' => $headlines,
            'breaking' => Article::published()->card()->where('is_breaking', true)->limit(6)->get(),
            'latest' => Article::published()->card()->limit(12)->get(),
            'national' => Article::published()->card()->whereNull('region_code')->limit(6)->get(),
            'popular' => Article::published()->card()->trending()->limit(5)->get(),
            // "Sentimen" box: tone of the last 30 days, links to /sentimen.
            'sentiment' => Article::published()->reorder()->whereNotNull('sentiment')->where('published_at', '>=', now()->subDays(30))
                ->selectRaw('sentiment, count(*) as total')->groupBy('sentiment')->pluck('total', 'sentiment'),
            // Agenda box: featured events first, then the next upcoming ones.
            'agenda' => DirectoryEntry::where('type', 'event')->whereNotNull('verified_at')
                ->where(fn ($q) => $q->where('ends_on', '>=', today())->orWhere(fn ($e) => $e->whereNull('ends_on')->where('starts_on', '>=', today())))
                ->with('region:code,name')
                ->orderByRaw('featured_at is null')->orderBy('starts_on')->limit(4)
                ->get(['id', 'slug', 'region_code', 'category', 'name', 'starts_on', 'ends_on', 'featured_at']),
            'provinceCounts' => $this->provinceCounts(),
        ]);

        return $this->seo($page, 'Berita Nasional & Daerah Hari Ini', 'Berita terbaru hari ini dari 38 provinsi dan 514 kabupaten/kota di Indonesia: politik, ekonomi, UMKM, wisata, dan peristiwa daerah.', jsonLd: [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => config('app.name'),
            'url' => route('home'),
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => route('search').'?q={q}',
                'query-input' => 'required name=q',
            ],
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

        $page = Inertia::render('region/show', [
            'province' => $province->only('code', 'name', 'slug', 'image_url'),
            'region' => [...$region->only('code', 'name', 'slug', 'level', 'type'), 'landmark' => $region->landmark()],
            'cities' => $province->children()->get(['code', 'name', 'slug', 'type']),
            'articles' => Inertia::scroll(fn () => Article::published()->card()->inRegion($region)->paginate(12)),
            // Directory ("Profil", "Wisata", "UMKM", "Event" tabs): verified rows only.
            'directory' => fn () => [
                'profile' => RegionProfile::whereKey($region->code)->whereNotNull('verified_at')
                    ->first(['facts', 'description', 'description_source', 'verified_at']),
                'factFields' => collect(RegionProfile::FACTS)->map(fn ($f, $key) => ['key' => $key, 'label' => $f[0], 'unit' => $f[1]])->values(),
                'entries' => DirectoryEntry::public()->where('region_code', $region->code)
                    ->get(['id', 'type', 'slug', 'category', 'name', 'description', 'address', 'website', 'source_url', 'starts_on', 'ends_on']),
                'types' => DirectoryEntry::TYPES,
                'topics' => collect(RegionProfile::TOPICS)->map(fn ($t, $key) => ['key' => $key, 'label' => $t['label']])->values(),
            ],
            'popular' => Article::published()->card()->inRegion($region)->trending()->limit(5)->get(),
            'stats' => $this->regionStats($province, $region),
        ]);
        $place = $child ? "{$child->name}, {$province->name}" : $province->name;

        return $this->seo($page, "Berita {$region->name} Hari Ini & Terbaru", "Kumpulan berita {$place} hari ini: peristiwa, pemerintahan, ekonomi, UMKM, dan wisata terbaru.", $province->image_url);
    }

    /** "Pusat Data Daerah": e.g. /investasi/jawa-barat/kabupaten-bekasi. Verified data only. */
    public function topic(string $topic, Region $province, ?Region $child = null): Response
    {
        abort_unless($province->level === Region::PROVINCE, 404);
        $config = RegionProfile::TOPICS[$topic];
        $region = $child ?? $province;
        $profile = RegionProfile::whereKey($region->code)->whereNotNull('verified_at')->first();
        $facts = collect($config['facts'])
            ->filter(fn ($key) => isset($profile?->facts[$key]))
            ->map(fn ($key) => ['key' => $key, 'label' => RegionProfile::FACTS[$key][0], 'unit' => RegionProfile::FACTS[$key][1], ...$profile->facts[$key]])
            ->values();
        $articles = Article::published()->card()->inRegion($region)
            ->whereHas('category', fn ($q) => $q->where('slug', $config['category']))->limit(6)->get();

        $page = Inertia::render('region/topic', [
            'topic' => ['key' => $topic, 'label' => $config['label']],
            'province' => $province->only('code', 'name', 'slug', 'image_url'),
            'region' => $region->only('code', 'name', 'slug', 'level', 'type'),
            'facts' => $facts,
            'entries' => DirectoryEntry::public()->where('region_code', $region->code)->whereIn('type', $config['types'])
                ->get(['id', 'type', 'slug', 'category', 'name', 'description', 'address', 'website', 'source_url', 'starts_on', 'ends_on']),
            'types' => collect($config['types'])->mapWithKeys(fn ($t) => [$t => DirectoryEntry::TYPES[$t]]),
            'articles' => $articles->isNotEmpty() ? $articles : Article::published()->card()->inRegion($region)->limit(6)->get(),
            'topics' => collect(RegionProfile::TOPICS)->map(fn ($t, $key) => ['key' => $key, 'label' => $t['label']])->values(),
            'comparable' => collect(RegionProfile::COMPARABLE)->intersect($config['facts'])->values(),
        ]);
        $labels = $facts->pluck('label')->take(4)->implode(', ');

        return $this->seo(
            $page,
            "{$config['label']} {$region->name}: Data & Informasi Terbaru",
            "Data {$config['label']} {$region->name}".($child ? ", {$province->name}" : '').($labels ? ": {$labels}." : '.').' Lengkap dengan sumber resmi dan berita terbaru.',
            $province->image_url,
        );
    }

    /** Nationwide ranking of one fact, e.g. /data/umk. */
    public function compare(string $fact): Response
    {
        [$label, $unit] = RegionProfile::FACTS[$fact];
        $rows = RegionProfile::whereNotNull('verified_at')->with('region:code,name,slug,level,parent_code', 'region.parent:code,name,slug')->get()
            ->filter(fn (RegionProfile $p) => isset($p->facts[$fact]))
            ->map(fn (RegionProfile $p) => [
                'code' => $p->region_code,
                'name' => $p->region->name,
                'slug' => $p->region->slug,
                'level' => $p->region->level,
                'parent' => $p->region->parent?->only('name', 'slug'),
                'value' => $p->facts[$fact]['value'],
                'number' => RegionProfile::number($p->facts[$fact]['value']),
                'as_of' => $p->facts[$fact]['as_of'] ?? null,
                'source' => $p->facts[$fact]['source'] ?? null,
            ])
            ->sortByDesc('number')->values();

        $page = Inertia::render('data/compare', [
            'fact' => ['key' => $fact, 'label' => $label, 'unit' => $unit],
            'rows' => $rows,
            'facts' => collect(RegionProfile::COMPARABLE)->map(fn ($k) => ['key' => $k, 'label' => RegionProfile::FACTS[$k][0]])->values(),
        ]);
        $top = $rows->first();

        return $this->seo(
            $page,
            "{$label} Seluruh Kabupaten/Kota di Indonesia",
            "Perbandingan {$label} {$rows->count()} daerah di Indonesia".($top ? ", tertinggi {$top['name']} ({$top['value']})" : '').'. Data bersumber resmi.',
        );
    }

    public function category(Category $category): Response
    {
        $page = Inertia::render('category/show', [
            'category' => $category->only('name', 'slug'),
            'articles' => Inertia::scroll(fn () => Article::published()->card()->whereBelongsTo($category)->paginate(12)),
        ]);

        return $this->seo($page, "Berita {$category->name} Terbaru", "Berita {$category->name} terbaru dari seluruh daerah di Indonesia.");
    }

    /** Tag pages reuse the category layout. */
    public function tag(Tag $tag): Response
    {
        $page = Inertia::render('category/show', [
            'category' => ['name' => '#'.$tag->name, 'slug' => $tag->slug],
            'articles' => Inertia::scroll(fn () => Article::published()->card()
                ->whereHas('tags', fn ($q) => $q->whereKey($tag->id))->paginate(12)),
        ]);

        return $this->seo($page, "Berita {$tag->name} Terbaru", "Kumpulan berita terbaru tentang {$tag->name}.");
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
                $article->recordView();
            }
        }
        $article->load(['category:id,name,slug', 'region:code,name,slug,parent_code,level,image_url', 'region.parent:code,name,slug,image_url', 'author:id,name', 'tags:id,name,slug']);
        // Read before the guest swap so search engines get the real description and keywords.
        $seo = $this->articleSeo($article);
        // Guests get only the "Ringkasan": the full body never leaves the server. Login brings them back here.
        if (! $request->user()) {
            $article->body = $article->source_excerpt ?? NewsPipeline::firstWords($article->body) ?? '';
            $article->excerpt = null;
            redirect()->setIntendedUrl($request->url());
        }

        $page = Inertia::render('article/show', [
            'article' => $article,
            'membershipOffer' => fn () => MembershipPlan::where('active', true)
                ->orderByDesc('highlighted')->orderBy('sort')->orderBy('id')
                ->first(['id', 'name', 'tagline', 'price', 'benefits']),
            'related' => Article::published()->card()
                ->whereKeyNot($article->id)
                ->when($article->region_code, fn ($q) => $q->inRegion($article->region_code), fn ($q) => $q->whereBelongsTo($article->category))
                ->limit(4)->get(),
            // Internal links across regions: the rest of the province (other regencies/cities).
            'nearby' => $article->region?->parent_code
                ? Article::published()->card()->inRegion($article->region->parent_code)
                    ->where('region_code', 'not like', $article->region_code.'%')
                    ->limit(4)->get()
                : [],
            // "Review AI" is for signed-in readers only.
            'review' => fn () => $request->user() ? $article->review()->first(['status', 'points', 'body', 'error']) : null,
        ]);

        return $this->seo($page, ...$seo);
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

    /** Public "Sentimen berita": tone of the last 30 days per province, and articles by tone. */
    public function sentiment(Request $request): Response
    {
        $tone = in_array($request->query('nada'), Article::SENTIMENTS, true) ? $request->query('nada') : null;
        $province = Region::where('level', Region::PROVINCE)->whereKey((string) $request->query('provinsi'))->first();
        $recent = fn () => Article::published()->reorder()->whereNotNull('sentiment')->where('published_at', '>=', now()->subDays(30))
            ->when($province, fn ($q) => $q->inRegion($province));

        $totals = $recent()->selectRaw('sentiment, count(*) as total')->groupBy('sentiment')->pluck('total', 'sentiment');
        $key = $province ? 'substr(region_code, 1, 5)' : 'substr(region_code, 1, 2)';
        $rows = $recent()->whereNotNull('region_code')->selectRaw("{$key} as code, sentiment, count(*) as total")
            ->groupByRaw("{$key}, sentiment")->get();
        $names = Region::whereIn('code', $rows->pluck('code')->unique())->get(['code', 'name', 'slug', 'parent_code'])->keyBy('code');

        $page = Inertia::render('sentiment', [
            'tone' => $tone,
            'province' => $province?->only('code', 'name'),
            'provinces' => Region::provinces()->get(['code', 'name']),
            'totals' => collect(Article::SENTIMENTS)->mapWithKeys(fn ($s) => [$s => (int) ($totals[$s] ?? 0)]),
            'regions' => $rows->groupBy('code')
                ->map(fn ($group, $code) => [
                    'code' => $code,
                    'name' => $names[$code]->name ?? $code,
                    ...collect(Article::SENTIMENTS)->mapWithKeys(fn ($s) => [$s => (int) ($group->firstWhere('sentiment', $s)->total ?? 0)]),
                    'total' => (int) $group->sum('total'),
                ])
                ->sortByDesc('total')->values(),
            'articles' => Article::published()->card()->whereNotNull('sentiment')
                ->when($tone, fn ($q) => $q->where('sentiment', $tone))
                ->when($province, fn ($q) => $q->inRegion($province))
                ->paginate(12)->withQueryString(),
        ]);

        return $this->seo($page, 'Sentimen Berita Daerah Hari Ini', 'Peta nada berita (positif, netral, negatif) dari seluruh provinsi di Indonesia selama 30 hari terakhir.');
    }

    public function search(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        return Inertia::render('search', [
            'q' => $q,
            'articles' => $q === '' ? null : Inertia::scroll(fn () => Article::published()->card()->search($q)->paginate(12)->withQueryString()),
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
            // Data pages only where verified data exists (empty topic pages are thin content).
            ->merge(RegionProfile::whereNotNull('verified_at')->with('region.parent:code,slug')->get()
                ->flatMap(fn (RegionProfile $p) => collect(array_keys(RegionProfile::TOPICS))->map(fn ($topic) => route('topic', array_filter([
                    'topic' => $topic,
                    'province' => $p->region->parent->slug ?? $p->region->slug,
                    'child' => $p->region->parent ? $p->region->slug : null,
                ])))))
            ->merge(collect(RegionProfile::COMPARABLE)->map(fn ($fact) => route('data.compare', $fact)))
            ->push(route('agenda'))
            ->merge(DirectoryEntry::where('type', 'event')->whereNotNull('verified_at')->whereNotNull('slug')
                ->where('starts_on', '>=', now()->subMonths(6))->limit(5000)->pluck('slug')->map(fn ($s) => route('agenda.show', $s)))
            ->merge(Tag::has('articles', '>=', 3)->limit(5000)->pluck('slug')->map(fn ($s) => route('tag', $s)))
            ->merge(Article::published()->limit(5000)->pluck('slug')->map(fn ($s) => route('article', $s)));

        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            .$urls->map(fn ($u) => '<url><loc>'.e($u).'</loc></url>')->implode('')
            .'</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    /** Google News sitemap: only articles from the last 2 days, at most 1000 (Google's limits). */
    public function newsSitemap(): HttpResponse
    {
        $name = e(config('app.name'));
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
            .Article::published()->where('published_at', '>=', now()->subDays(2))->limit(1000)->get(['slug', 'title', 'published_at'])
                ->map(fn (Article $a) => '<url><loc>'.e(route('article', $a->slug)).'</loc><news:news>'
                    ."<news:publication><news:name>{$name}</news:name><news:language>id</news:language></news:publication>"
                    .'<news:publication_date>'.$a->published_at->toAtomString().'</news:publication_date>'
                    .'<news:title>'.e($a->title).'</news:title></news:news></url>')
                ->implode('')
            .'</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    /**
     * Title, description, image and JSON-LD for one article.
     *
     * @return array{title: string, description: string, image: string|null, jsonLd: array<string, mixed>}
     */
    private function articleSeo(Article $article): array
    {
        $description = $article->meta_description ?: Str::limit((string) ($article->excerpt ?: $article->body), 155);
        $publisher = ['@type' => 'NewsMediaOrganization', 'name' => config('app.name'), 'url' => route('home'),
            'logo' => ['@type' => 'ImageObject', 'url' => asset('icon-512.png')]];

        return [
            'title' => $article->seo_title ?: $article->title,
            'description' => $description,
            'image' => $article->cover_url,
            'jsonLd' => array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'NewsArticle',
                'mainEntityOfPage' => route('article', $article->slug),
                'headline' => Str::limit($article->title, 110, ''),
                'description' => $description,
                'image' => $article->cover_url ? [$article->cover_url] : null,
                'datePublished' => $article->published_at?->toAtomString(),
                'dateModified' => $article->updated_at?->toAtomString(),
                'author' => $article->author && ! $article->is_ai_generated
                    ? ['@type' => 'Person', 'name' => $article->author->name]
                    : $publisher,
                'publisher' => $publisher,
                'articleSection' => $article->category->name,
                'keywords' => $article->tags->pluck('name')->implode(', ') ?: null,
                'contentLocation' => $article->region ? ['@type' => 'Place', 'name' => $article->region->name] : null,
            ]),
        ];
    }
}
