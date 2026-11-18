<?php

namespace App\Http\Controllers\Admin;

use App\Enums\NewsTaskStatus;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AiRun;
use App\Models\Category;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\NewsSource;
use App\Models\Region;
use App\Services\HermesClient;
use App\Services\NewsPipeline;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Berita AI": Hermes news sources and a live view of the queue. Super admin only (see routes). */
class AiNewsController extends Controller
{
    public function index(Request $request, HermesClient $hermes): Response
    {
        $province = $this->province($request);
        $bySource = fn ($q) => $q->whereHas('source', fn ($s) => $s->inProvince($province));
        $today = now()->startOfDay();
        $items = NewsItem::where('created_at', '>=', $today)->when($province, $bySource)->selectRaw('status, count(*) as total')->groupBy('status')->toBase()->pluck('total', 'status');
        $active = NewsFetch::whereIn('status', NewsTaskStatus::activeValues())->when($province, $bySource)->count()
            + NewsItem::whereIn('status', NewsTaskStatus::activeValues())->when($province, $bySource)->count();

        return Inertia::render('admin/ai/index', [
            'hermes' => $hermes->status(),
            'stats' => [
                'published' => (int) ($items[NewsTaskStatus::Published->value] ?? 0),
                'review' => (int) ($items[NewsTaskStatus::Review->value] ?? 0),
                'failed' => (int) ($items[NewsTaskStatus::Failed->value] ?? 0),
                'duplicate' => (int) ($items[NewsTaskStatus::Duplicate->value] ?? 0),
                'active' => $active,
                // ponytail: tokens stay global; filter through ai_runs' subject when per-province cost matters.
                'tokens' => (int) AiRun::where('created_at', '>=', $today)->sum('total_tokens'),
            ],
            'fetches' => NewsFetch::when($province, $bySource)->with([
                'source:id,name,url',
                'items' => fn ($q) => $q->with('article:id,slug,status')->latest('id'),
            ])->latest('id')->limit(15)->get(),
            'sources' => NewsSource::where('active', true)->inProvince($province)->orderBy('name')->get(['id', 'name']),
            'province' => $province,
            'provinces' => Region::provinces()->get(['code', 'name']),
        ]);
    }

    public function sources(Request $request): Response
    {
        $province = $this->province($request);

        return Inertia::render('admin/ai/sources', [
            'province' => $province,
            'sources' => NewsSource::inProvince($province)->with(['region:code,name', 'category:id,name'])
                ->withCount(['fetches as active_fetches' => fn ($q) => $q->whereIn('status', NewsTaskStatus::activeValues())])
                ->orderBy('name')->get(),
            'counts' => NewsItem::selectRaw('news_source_id, status, count(*) as total')->groupBy('news_source_id', 'status')->toBase()->get()
                ->groupBy('news_source_id')
                ->map(fn ($rows) => $rows->pluck('total', 'status')),
            'categories' => Category::orderBy('sort')->get(['id', 'name']),
            'provinces' => Region::provinces()->get(['code', 'name', 'slug']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        NewsSource::create($this->validated($request));

        return back()->with('success', 'Sumber berita ditambahkan.');
    }

    public function update(Request $request, NewsSource $source): RedirectResponse
    {
        $source->update($this->validated($request));

        return back()->with('success', 'Sumber berita diperbarui.');
    }

    public function destroy(NewsSource $source): RedirectResponse
    {
        $source->delete();

        return back()->with('success', 'Sumber berita dihapus. Artikel yang sudah dibuat tetap ada.');
    }

    public function fetch(Request $request, NewsSource $source, NewsPipeline $pipeline): RedirectResponse
    {
        $fetch = $pipeline->queue($source, 'manual', $request->user());
        if ($fetch) {
            ActivityLog::record('news_source.fetched', "menjalankan pencarian berita di “{$source->name}”", $source);
        }

        return $fetch
            ? to_route('admin.ai.index')->with('success', "Hermes mulai mencari berita di {$source->name}.")
            : back()->with('error', $source->active ? 'Sumber ini masih dalam antrean.' : 'Sumber nonaktif.');
    }

    public function retryFetch(NewsFetch $fetch, NewsPipeline $pipeline): RedirectResponse
    {
        abort_unless(in_array($fetch->status, [NewsTaskStatus::Failed, NewsTaskStatus::Paused], true), 422, 'Hanya proses gagal/dijeda yang bisa diulang.');
        $pipeline->retryFetch($fetch);

        return back()->with('success', 'Pencarian berita diulang.');
    }

    public function retryItem(NewsItem $item, NewsPipeline $pipeline): RedirectResponse
    {
        abort_unless(in_array($item->status, [NewsTaskStatus::Failed, NewsTaskStatus::Paused], true) && ! $item->article_id, 422, 'Hanya berita gagal/dijeda yang bisa diulang.');
        $pipeline->retryItem($item);

        return back()->with('success', 'Sinopsis berita diulang.');
    }

    /** ?province= from the filter: '' (all), 'nasional', or a province code. Anything else counts as all. */
    private function province(Request $request): string
    {
        $value = (string) $request->query('province', '');

        return $value === 'nasional' || Region::where('code', $value)->where('level', Region::PROVINCE)->exists() ? $value : '';
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'url' => ['required', 'url:http,https', 'max:2048'],
            'feed_url' => ['nullable', 'url:http,https', 'max:2048'],
            'region_code' => ['nullable', 'exists:regions,code'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'instruction' => ['nullable', 'string', 'max:1000'],
            'max_articles' => ['required', 'integer', 'min:1', 'max:20'],
            'fetch_interval_minutes' => ['nullable', 'integer', 'min:15', 'max:1440'],
            'auto_publish' => ['boolean'],
            'active' => ['boolean'],
        ]);
    }
}
