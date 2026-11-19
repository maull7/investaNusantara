<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Region;
use App\Models\Tag;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Media Intelligence dashboard: what is read, where news happens, which keywords rise,
 * the tone per region, and issues spreading across provinces.
 *
 * Every number compares the chosen period with the period just before it.
 * Nationwide, rows are provinces; with a province picked, rows are its regencies/cities.
 */
class InsightsController extends Controller
{
    private const PERIODS = [7, 30, 90];

    /** Longest custom range, so one request never scans years of reads. */
    private const MAX_DAYS = 366;

    /** An issue is "national" once it shows up in at least this many provinces. */
    private const ISSUE_MIN_PROVINCES = 3;

    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! $user->subscriptionActive()) {
            return Inertia::render('admin/insights/expired', [
                'endedAt' => $user->subscription_ends_at?->toDateString(),
                'organization' => $user->organization,
            ]);
        }

        return Inertia::render('admin/insights/index', [
            ...$this->report($request),
            // Side panel: top articles behind one topic (?tag=) or region (?wilayah=), loaded on click.
            'detail' => Inertia::optional(fn () => $this->detail($request)),
        ]);
    }

    /** The same report as a CSV file (semicolon separated, opens directly in Indonesian Excel). */
    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()->subscriptionActive(), 403, 'Langganan Media Intelligence sudah berakhir.');
        $r = $this->report($request);
        $name = 'media-intelligence-'.$r['filters']['dari'].'-'.$r['filters']['sampai'].($r['filters']['provinsi'] ? '-'.$r['filters']['provinsi'] : '').'.csv';

        return response()->streamDownload(function () use ($r) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\u{FEFF}"); // BOM: Excel reads UTF-8
            $put = fn (array $row) => fputcsv($out, $row, ';');
            $section = function (string $title, array $head, iterable $rows) use ($put) {
                $put([]);
                $put([$title]);
                $put($head);
                foreach ($rows as $row) {
                    $put($row);
                }
            };

            $put(['Media Intelligence', config('app.name')]);
            $put(['Periode', $r['filters']['dari'].' s.d. '.$r['filters']['sampai'], 'Pembanding', $r['previous']['dari'].' s.d. '.$r['previous']['sampai']]);
            $put(['Wilayah', $r['scopeName']]);
            $section('Ringkasan', ['Indikator', 'Periode ini', 'Periode lalu'], [
                ['Pembaca', $r['kpi']['views'], $r['kpi']['views_prev']],
                ['Artikel terbit', $r['kpi']['published'], $r['kpi']['published_prev']],
                ['Daerah aktif', $r['kpi']['regions'], ''],
                ...collect($r['kpi']['sentiment'])->map(fn ($n, $s) => ['Sentimen '.$s, $n, ''])->values(),
            ]);
            $section('Pembaca per hari', ['Tanggal', 'Pembaca', 'Tanggal pembanding', 'Pembaca pembanding'],
                collect($r['daily'])->map(fn ($d, $i) => [$d['date'], $d['views'], $r['dailyPrevious'][$i]['date'] ?? '', $r['dailyPrevious'][$i]['views'] ?? '']));
            $section('Topik paling banyak dibaca', ['Topik', 'Pembaca', 'Artikel dibaca'],
                $r['topics']->map(fn ($t) => [$t['name'], $t['views'], $t['articles']]));
            $section('Daerah paling aktif', ['Kode', 'Daerah', 'Artikel', 'Pembaca'],
                $r['regions']->map(fn ($x) => [$x['code'], $x['name'], $x['articles'], $x['views']]));
            $section('Kata kunci yang sedang naik', ['Kata kunci', 'Periode lalu', 'Periode ini', 'Pertumbuhan %'],
                $r['rising']->map(fn ($x) => [$x['name'], $x['before'], $x['now'], $x['growth'] ?? 'baru']));
            $section('Sentimen per daerah', ['Kode', 'Daerah', 'Negatif', 'Netral', 'Positif', 'Total'],
                $r['sentimentByRegion']->map(fn ($x) => [$x['code'], $x['name'], $x['negatif'], $x['netral'], $x['positif'], $x['total']]));
            $section('Isu nasional berkembang', ['Isu', 'Artikel', 'Provinsi', 'Provinsi periode lalu'],
                $r['issues']->map(fn ($x) => [$x['name'], $x['articles'], $x['provinces'], $x['provinces_before']]));
            fclose($out);
        }, $name, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Province to analyse. Clients are held to the provinces they subscribe to:
     * anything else falls back to their first one (so they never see "all of Indonesia").
     *
     * @return array{0: Region|null, 1: list<string>|null} province, allowed codes (null = all)
     */
    private function scope(Request $request): array
    {
        $allowed = $request->user()->insightProvinces();
        $code = $request->string('provinsi')->value();
        if ($allowed !== null && ! in_array($code, $allowed, true)) {
            $code = $allowed[0];
        }

        return [Region::where('level', Region::PROVINCE)->whereKey($code)->first(), $allowed];
    }

    /** @return array<string, mixed> */
    private function report(Request $request): array
    {
        [$province, $allowed] = $this->scope($request);
        [$start, $end, $preset] = $this->range($request);
        $days = (int) $start->diffInDays($end->copy()->startOfDay()) + 1;
        // The comparison period has the same length and ends the day before.
        $prevStart = $start->copy()->subDays($days);
        $prevEnd = $start->copy()->subSecond();

        $views = $this->viewsIn($start, $end, $province)->sum('v.views');
        $prevViews = $this->viewsIn($prevStart, $prevEnd, $province)->sum('v.views');
        $published = $this->published($start, $end, $province)->count();
        $prevPublished = $this->published($prevStart, $prevEnd, $province)->count();
        $sentiment = $this->published($start, $end, $province)->whereNotNull('a.sentiment')
            ->selectRaw('a.sentiment, count(*) as total')->groupBy('a.sentiment')->pluck('total', 'sentiment');

        $user = $request->user();

        return [
            'filters' => [
                'periode' => $preset,
                'dari' => $start->toDateString(),
                'sampai' => $end->toDateString(),
                'provinsi' => $province?->code,
            ],
            'days' => $days,
            'previous' => ['dari' => $prevStart->toDateString(), 'sampai' => $prevEnd->toDateString()],
            'periods' => self::PERIODS,
            'today' => today()->toDateString(),
            'provinces' => Region::provinces()->when($allowed !== null, fn ($q) => $q->whereIn('code', $allowed))->get(['code', 'name']),
            'nationwide' => $allowed === null,
            'scope' => $province ? "Kabupaten/kota di {$province->name}" : 'Provinsi',
            'scopeName' => $province?->name ?? 'Seluruh Indonesia',
            'client' => $user->role === Role::Client ? [
                'organization' => $user->organization,
                'ends_at' => $user->subscription_ends_at?->toDateString(),
            ] : null,
            'kpi' => [
                'views' => (int) $views,
                'views_prev' => (int) $prevViews,
                'published' => $published,
                'published_prev' => $prevPublished,
                'regions' => $this->published($start, $end, $province)->whereNotNull('a.region_code')
                    ->distinct()->count(DB::raw($this->regionKey($province))),
                'sentiment' => collect(Article::SENTIMENTS)->mapWithKeys(fn ($s) => [$s => (int) ($sentiment[$s] ?? 0)]),
            ],
            'daily' => $this->daily($start, $days, $province),
            'dailyPrevious' => $this->daily($prevStart, $days, $province),
            'topics' => $this->topics($start, $end, $province),
            'regions' => $this->activeRegions($start, $end, $province),
            'rising' => $this->rising($start, $end, $prevStart, $prevEnd, $province),
            'sentimentByRegion' => $this->sentimentByRegion($start, $end, $province),
            'issues' => $this->issues($start, $end, $prevStart, $prevEnd, $province),
        ];
    }

    /**
     * Top articles behind one topic (?tag=slug) or one region (?wilayah=code) in the chosen window.
     *
     * @return array<string, mixed>|null
     */
    private function detail(Request $request): ?array
    {
        [$province] = $this->scope($request);
        [$start, $end] = $this->range($request);
        $tag = Tag::where('slug', $request->string('tag')->value())->first();
        $region = $tag ? null : Region::find($request->string('wilayah')->value());
        if (! $tag && ! $region) {
            return null;
        }
        // A client never drills outside the provinces they subscribe to.
        if ($region && ! $this->inScope($request, $region->code)) {
            return null;
        }

        $filter = fn (Builder $q) => $tag
            ? $q->whereExists(fn ($e) => $e->from('article_tag')->whereColumn('article_tag.article_id', 'a.id')->where('article_tag.tag_id', $tag->id))
            : $q->where(fn ($r) => $r->where('a.region_code', $region->code)->orWhere('a.region_code', 'like', $region->code.'.%'));

        $reads = $filter($this->viewsIn($start, $end, $province))
            ->selectRaw('a.id, sum(v.views) as views')->groupBy('a.id')->pluck('views', 'id');
        $ids = $reads->sortDesc()->keys()->take(8)
            ->merge($filter($this->published($start, $end, $province))->latest('a.published_at')->limit(8)->pluck('a.id'))
            ->unique()->take(8);
        $articles = Article::with('region:code,name')->whereKey($ids)->get(['id', 'title', 'slug', 'region_code', 'sentiment', 'published_at'])
            ->map(fn (Article $a) => [...$a->only('id', 'title', 'slug', 'sentiment'), 'region' => $a->region?->name, 'published_at' => $a->published_at?->toDateString(), 'views' => (int) ($reads[$a->id] ?? 0)])
            ->sortByDesc('views')->values();

        return [
            'kind' => $tag ? 'tag' : 'region',
            'key' => $tag?->slug ?? $region->code,
            'title' => $tag ? '#'.$tag->name : $region->name,
            'views' => (int) $reads->sum(),
            'articles' => $articles,
            'canDrill' => $region?->level === Region::PROVINCE && ! $province,
        ];
    }

    /** Inside a province, its own (province-level) news gets a clear label next to its regencies. */
    private function regionName(Collection $names, string $code, ?Region $province): string
    {
        $name = $names[$code] ?? $code;

        return $province && $code === $province->code ? "{$name} (tingkat provinsi)" : $name;
    }

    private function inScope(Request $request, string $code): bool
    {
        $allowed = $request->user()->insightProvinces();

        return $allowed === null || in_array(substr($code, 0, 2), $allowed, true);
    }

    /**
     * The window to analyse: a preset (?periode=7|30|90) or a calendar range (?dari=&sampai=),
     * capped at one year and never past today.
     *
     * @return array{0: CarbonInterface, 1: CarbonInterface, 2: int|null} start, end, preset (null for a custom range)
     */
    private function range(Request $request): array
    {
        $date = fn (string $key) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query($key))
            ? rescue(fn () => CarbonImmutable::createFromFormat('Y-m-d', $request->query($key))->startOfDay(), null, false)
            : null;
        $from = $date('dari');
        $to = $date('sampai');

        if ($from && $to) {
            [$from, $to] = $from->gt($to) ? [$to, $from] : [$from, $to];
            $to = $to->min(today());
            $from = $from->max($to->subDays(self::MAX_DAYS - 1))->min($to);

            return [$from, $to->endOfDay(), null];
        }

        $days = in_array($request->integer('periode'), self::PERIODS, true) ? $request->integer('periode') : 30;

        return [today()->subDays($days - 1)->startOfDay(), today()->endOfDay(), $days];
    }

    /** Published articles in a window, optionally inside one province ("a" alias). */
    private function published(CarbonInterface $from, CarbonInterface $to, ?Region $province): Builder
    {
        return DB::table('articles as a')
            ->whereNull('a.deleted_at')
            ->where('a.status', ArticleStatus::Published->value)
            ->whereBetween('a.published_at', [$from, $to])
            ->when($province, fn ($q) => $this->inProvince($q, $province));
    }

    /** Daily read rows in a window ("v" alias, joined to "a"). */
    private function viewsIn(CarbonInterface $from, CarbonInterface $to, ?Region $province): Builder
    {
        return DB::table('article_daily_views as v')
            ->join('articles as a', 'a.id', '=', 'v.article_id')
            ->whereBetween('v.date', [$from->toDateString(), $to->toDateString()])
            ->when($province, fn ($q) => $this->inProvince($q, $province));
    }

    private function inProvince(Builder $query, Region $province): Builder
    {
        return $query->where(fn ($q) => $q->where('a.region_code', $province->code)->orWhere('a.region_code', 'like', $province->code.'.%'));
    }

    /** Province code nationwide; regency/city code (first 5 chars, e.g. "32.71") inside a province. */
    private function regionKey(?Region $province): string
    {
        return $province ? 'substr(a.region_code, 1, 5)' : 'substr(a.region_code, 1, 2)';
    }

    /** @return list<array{date: string, views: int}> one row per day, zeros included */
    private function daily(CarbonInterface $start, int $days, ?Region $province): array
    {
        $rows = $this->viewsIn($start, $start->copy()->addDays($days - 1)->endOfDay(), $province)
            ->selectRaw('v.date as day, sum(v.views) as total')->groupBy('v.date')
            ->pluck('total', 'day')->mapWithKeys(fn ($total, $day) => [substr((string) $day, 0, 10) => (int) $total]);

        return collect(range(0, $days - 1))
            ->map(fn ($i) => $start->copy()->addDays($i)->toDateString())
            ->map(fn ($date) => ['date' => $date, 'views' => $rows[$date] ?? 0])
            ->all();
    }

    /** "Topik paling banyak dibaca": tags by reads in the period. */
    private function topics(CarbonInterface $from, CarbonInterface $to, ?Region $province): Collection
    {
        return $this->viewsIn($from, $to, $province)
            ->join('article_tag as at', 'at.article_id', '=', 'a.id')
            ->join('tags as t', 't.id', '=', 'at.tag_id')
            ->selectRaw('t.name, t.slug, sum(v.views) as views, count(distinct a.id) as articles')
            ->groupBy('t.id', 't.name', 't.slug')
            ->orderByDesc('views')->limit(10)->get()
            ->map(fn ($r) => ['name' => $r->name, 'slug' => $r->slug, 'views' => (int) $r->views, 'articles' => (int) $r->articles]);
    }

    /** "Daerah paling aktif": articles published and reads, per region. */
    private function activeRegions(CarbonInterface $from, CarbonInterface $to, ?Region $province): Collection
    {
        $key = $this->regionKey($province);
        $articles = $this->published($from, $to, $province)->whereNotNull('a.region_code')
            ->selectRaw("{$key} as code, count(*) as total")->groupByRaw($key)->pluck('total', 'code');
        $reads = $this->viewsIn($from, $to, $province)->whereNotNull('a.region_code')
            ->selectRaw("{$key} as code, sum(v.views) as total")->groupByRaw($key)->pluck('total', 'code');
        $names = Region::whereIn('code', $articles->keys()->merge($reads->keys())->unique())->pluck('name', 'code');

        return $articles->keys()->merge($reads->keys())->unique()
            ->map(fn ($code) => ['code' => $code, 'name' => $this->regionName($names, (string) $code, $province), 'articles' => (int) ($articles[$code] ?? 0), 'views' => (int) ($reads[$code] ?? 0)])
            ->sortByDesc(fn ($r) => [$r['articles'], $r['views']])->take(10)->values();
    }

    /** Tag => number of articles published in the window. */
    private function tagCounts(CarbonInterface $from, CarbonInterface $to, ?Region $province): Collection
    {
        return $this->published($from, $to, $province)
            ->join('article_tag as at', 'at.article_id', '=', 'a.id')
            ->join('tags as t', 't.id', '=', 'at.tag_id')
            ->selectRaw('t.slug, max(t.name) as name, count(distinct a.id) as total, count(distinct substr(a.region_code, 1, 2)) as provinces')
            ->groupBy('t.slug')->get()->keyBy('slug');
    }

    /** "Kata kunci yang sedang naik": tags with the biggest growth vs the previous period. */
    private function rising(CarbonInterface $from, CarbonInterface $to, CarbonInterface $prevFrom, CarbonInterface $prevTo, ?Region $province): Collection
    {
        $now = $this->tagCounts($from, $to, $province);
        $before = $this->tagCounts($prevFrom, $prevTo, $province);

        return $now->filter(fn ($r) => $r->total >= 2)
            ->map(fn ($r) => [
                'name' => $r->name,
                'slug' => $r->slug,
                'now' => (int) $r->total,
                'before' => (int) ($before[$r->slug]->total ?? 0),
            ])
            ->filter(fn ($r) => $r['now'] > $r['before'])
            ->map(fn ($r) => [...$r, 'growth' => $r['before'] ? round(($r['now'] - $r['before']) / $r['before'] * 100) : null])
            // New keywords (no previous articles) first, then by growth, then by volume.
            ->sortByDesc(fn ($r) => [$r['growth'] === null ? 1 : 0, $r['growth'] ?? $r['now'], $r['now']])
            ->take(10)->values();
    }

    /** "Sentimen berita per daerah": positif/netral/negatif counts per region. */
    private function sentimentByRegion(CarbonInterface $from, CarbonInterface $to, ?Region $province): Collection
    {
        $key = $this->regionKey($province);
        $rows = $this->published($from, $to, $province)->whereNotNull('a.region_code')->whereNotNull('a.sentiment')
            ->selectRaw("{$key} as code, a.sentiment, count(*) as total")->groupByRaw("{$key}, a.sentiment")->get();
        $names = Region::whereIn('code', $rows->pluck('code')->unique())->pluck('name', 'code');

        return $rows->groupBy('code')
            ->map(fn ($group, $code) => [
                'code' => $code,
                'name' => $this->regionName($names, (string) $code, $province),
                ...collect(Article::SENTIMENTS)->mapWithKeys(fn ($s) => [$s => (int) ($group->firstWhere('sentiment', $s)->total ?? 0)]),
            ])
            ->map(fn ($r) => [...$r, 'total' => $r['positif'] + $r['netral'] + $r['negatif']])
            ->sortByDesc('total')->take(12)->values();
    }

    /** "Isu nasional yang sedang berkembang": tags spreading over several provinces, growing. */
    private function issues(CarbonInterface $from, CarbonInterface $to, CarbonInterface $prevFrom, CarbonInterface $prevTo, ?Region $province): Collection
    {
        if ($province) {
            return collect(); // by definition nationwide
        }
        $before = $this->tagCounts($prevFrom, $prevTo, null);

        return $this->tagCounts($from, $to, null)
            ->filter(fn ($r) => $r->provinces >= self::ISSUE_MIN_PROVINCES)
            ->map(fn ($r) => [
                'name' => $r->name,
                'slug' => $r->slug,
                'articles' => (int) $r->total,
                'provinces' => (int) $r->provinces,
                'provinces_before' => (int) ($before[$r->slug]->provinces ?? 0),
            ])
            ->sortByDesc(fn ($r) => [$r['provinces'] - $r['provinces_before'], $r['provinces'], $r['articles']])
            ->take(8)->values();
    }
}
