<?php

use App\Models\Article;
use App\Models\NewsItem;
use App\Models\NewsSource;
use App\Models\Region;
use App\Models\RegionDraft;
use App\Services\NewsFeedReader;
use App\Services\NewsPipeline;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('news:dispatch', function (NewsPipeline $pipeline) {
    $queued = NewsSource::where('active', true)->whereNotNull('fetch_interval_minutes')->get()
        ->filter(fn (NewsSource $source) => $source->isDue())
        ->filter(fn (NewsSource $source) => $pipeline->queue($source, 'schedule') !== null)
        ->count();
    $recovered = $pipeline->recoverStale();

    $this->info("{$queued} sumber masuk antrean, {$recovered} tugas macet dijalankan ulang.");
})->purpose('Ambil berita AI dari sumber yang sudah jadwalnya dan pulihkan tugas yang macet');

Schedule::command('news:dispatch')->everyFiveMinutes()->withoutOverlapping();
Schedule::command('horizon:snapshot')->everyFiveMinutes();

Artisan::command('news:backfill-images', function (NewsFeedReader $reader) {
    $fixed = 0;
    Article::where('is_ai_generated', true)->whereNull('cover_path')->whereNotNull('source_url')->each(function (Article $article) use ($reader, &$fixed) {
        $item = NewsItem::with('source')->where('article_id', $article->id)->first();
        $image = $item->image_url ?? $reader->imageFor((string) $article->source_url, $item->source->feed_url ?? $item->source->url ?? null);
        if ($image) {
            $article->update(['cover_path' => $image]);
            $fixed++;
        }
        $this->line(($image ? '✓ ' : '✗ ').$article->title);
    });

    $this->info("{$fixed} artikel AI mendapat foto.");
})->purpose('Cari foto untuk artikel AI yang belum punya gambar (RSS atau og:image situs sumber)');

Artisan::command('directory:draft {province? : Kode provinsi, misalnya 32} {--limit=50 : Maksimal daerah per perintah}', function () {
    // Only regions without any profile yet, so re-running continues where the last run stopped.
    $queued = Region::whereIn('level', [Region::PROVINCE, Region::CITY])
        ->when($this->argument('province'), fn ($q, $p) => $q->where(fn ($r) => $r->where('code', $p)->orWhere('parent_code', $p)))
        ->whereDoesntHave('profile')
        ->orderBy('code')->limit((int) $this->option('limit'))->pluck('code')
        ->filter(fn (string $code) => RegionDraft::queueFor($code) !== null)
        ->count();

    $this->info("{$queued} daerah masuk antrean draf AI (Hermes). Hasilnya perlu diverifikasi di Admin > Direktori.");
})->purpose('Susun draf direktori daerah dengan Hermes untuk daerah yang belum punya profil (memakai token AI)');
