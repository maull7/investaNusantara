<?php

namespace App\Http\Controllers\Admin;

use App\Enums\NewsTaskStatus;
use App\Http\Controllers\Controller;
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
    public function index(HermesClient $hermes): Response
    {
        $today = now()->startOfDay();
        $items = NewsItem::where('created_at', '>=', $today)->selectRaw('status, count(*) as total')->groupBy('status')->toBase()->pluck('total', 'status');
        $active = NewsFetch::whereIn('status', NewsTaskStatus::activeValues())->count()
            + NewsItem::whereIn('status', NewsTaskStatus::activeValues())->count();

        return Inertia::render('admin/ai/index', [
            'hermes' => $hermes->status(),
            'stats' => [
                'published' => (int) ($items[NewsTaskStatus::Published->value] ?? 0),
                'review' => (int) ($items[NewsTaskStatus::Review->value] ?? 0),
                'failed' => (int) ($items[NewsTaskStatus::Failed->value] ?? 0),
                'duplicate' => (int) ($items[NewsTaskStatus::Duplicate->value] ?? 0),
                'active' => $active,
                'tokens' => (int) AiRun::where('created_at', '>=', $today)->sum('total_tokens'),
            ],
            'fetches' => NewsFetch::with([
                'source:id,name,url',
                'items' => fn ($q) => $q->with('article:id,slug,status')->latest('id'),
            ])->latest('id')->limit(15)->get(),
            'sources' => NewsSource::where('active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function sources(): Response
    {
        return Inertia::render('admin/ai/sources', [
            'sources' => NewsSource::with(['region:code,name', 'category:id,name'])
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
