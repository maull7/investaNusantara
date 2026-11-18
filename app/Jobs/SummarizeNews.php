<?php

namespace App\Jobs;

use App\Enums\ArticleStatus;
use App\Enums\NewsTaskStatus;
use App\Models\Article;
use App\Models\ArticleReview;
use App\Models\Category;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\Region;
use App\Services\NewsFeedReader;
use App\Services\NewsPipeline;
use App\Services\NewsPrompts;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Hermes reads one article and writes a synopsis in its own words.
 * It is published directly when it passes the guards, otherwise it waits for an editor.
 */
class SummarizeNews extends HermesTask
{
    /** Synopsis words for auto publish. Shorter fails, longer is likely a copy. */
    public const MIN_WORDS = 120;

    public const MAX_WORDS = 700;

    /** Share of 6-word phrases copied from the source above which an editor must look. */
    public const MAX_OVERLAP = 0.3;

    protected function subject(): ?NewsItem
    {
        return NewsItem::with('source')->find($this->subjectId);
    }

    protected function operation(): string
    {
        return 'summarize';
    }

    protected function runTimeout(): int
    {
        return (int) config('hermes.run_timeout');
    }

    protected function prompt(NewsFetch|NewsItem|ArticleReview $subject): ?string
    {
        /** @var NewsItem $subject */
        return NewsPrompts::summarize(
            $subject,
            Category::orderBy('sort')->get(['name'])->map(fn (Category $c) => $c->name)->values()->all(),
            $this->regions($subject)->map(fn (Region $r) => $r->name)->values()->all(),
        );
    }

    /** @param  array<string, mixed>  $output */
    protected function complete(NewsFetch|NewsItem|ArticleReview $subject, array $output): void
    {
        /** @var NewsItem $subject */
        if (($output['status'] ?? 'ok') === 'not_article') {
            $subject->update(['status' => NewsTaskStatus::Failed, 'error' => 'Dilewati Hermes: '.Str::limit((string) ($output['reason'] ?? 'bukan artikel berita'), 300)]);

            return;
        }

        $title = Str::limit(trim(strip_tags((string) ($output['title'] ?? ''))), 250, '');
        $synopsis = $this->paragraphs((string) ($output['synopsis'] ?? ''));
        $words = NewsPipeline::wordCount($synopsis);
        if ($title === '' || $words < 60) {
            throw new RuntimeException("Output Hermes tidak lengkap: judul/sinopsis kosong atau terlalu pendek ({$words} kata).");
        }

        $pipeline = app(NewsPipeline::class);
        if ($pipeline->similarTitleExists($title, $subject->id)) {
            $subject->update(['status' => NewsTaskStatus::Duplicate, 'error' => 'Berita serupa sudah ada.']);

            return;
        }

        // Guards: anything doubtful goes to an editor instead of the front page.
        // Compare against everything we know of the original: its opening and the feed text.
        $overlap = max(
            NewsPipeline::overlap($synopsis, (string) ($output['source_opening'] ?? '')),
            NewsPipeline::overlap($synopsis, (string) $subject->feed_excerpt),
        );
        $reasons = array_filter([
            ! $subject->source->auto_publish ? 'terbit otomatis dimatikan untuk sumber ini' : null,
            $words < self::MIN_WORDS ? "sinopsis pendek ({$words} kata)" : null,
            $words > self::MAX_WORDS ? "sinopsis terlalu panjang ({$words} kata)" : null,
            $overlap > self::MAX_OVERLAP ? 'kemiripan dengan teks asli '.round($overlap * 100).'%' : null,
            ($output['read_from'] ?? null) === 'rss' ? 'ditulis dari ringkasan RSS karena halaman tidak bisa dibuka' : null,
        ]);
        $publish = $reasons === [];

        // Resolved before the transaction: the fallbacks make HTTP requests.
        $cover = NewsPipeline::validUrl($output['image_url'] ?? null)
            ?? $subject->image_url
            ?? rescue(fn () => app(NewsFeedReader::class)->imageFor($subject->url, $subject->source->feed_url ?? $subject->source->url), null, false);

        DB::transaction(function () use ($subject, $output, $title, $synopsis, $publish, $reasons, $pipeline, $cover) {
            $item = NewsItem::lockForUpdate()->find($subject->id);
            if (! $item || $item->article_id) {
                return; // finished by another copy of this job
            }

            $article = Article::create([
                'title' => $title,
                'slug' => (Str::slug($title) ?: 'berita').'-'.Str::lower(Str::random(5)),
                'excerpt' => Str::limit(trim(strip_tags((string) ($output['excerpt'] ?? ''))), 280) ?: Str::limit($synopsis, 200),
                'body' => $synopsis,
                // Hotlinked: we store the URL only, the image stays on the source site.
                'cover_path' => $cover,
                'category_id' => $this->category((string) ($output['category'] ?? ''), $subject),
                'region_code' => $this->region((string) ($output['region'] ?? ''), $subject),
                'author_id' => $pipeline->author()->id,
                'requested_by' => $subject->fetch->requested_by,
                'status' => $publish ? ArticleStatus::Published : ArticleStatus::Review,
                'published_at' => $publish ? now() : null,
                'source_name' => $subject->source->name,
                'source_url' => $subject->url,
                'source_title' => Str::limit(trim(strip_tags((string) ($output['source_title'] ?? ''))), 250, '') ?: $subject->title,
                'source_excerpt' => NewsPipeline::firstWords((string) ($output['source_opening'] ?? '') ?: (string) $subject->feed_excerpt),
                'is_ai_generated' => true,
            ]);

            $item->update([
                'article_id' => $article->id,
                'status' => $publish ? NewsTaskStatus::Published : NewsTaskStatus::Review,
                'error' => $publish ? null : 'Perlu review: '.implode(', ', $reasons).'.',
                'source_published_at' => $item->source_published_at
                    ?? rescue(fn () => filled($output['source_published_at'] ?? null) ? now()->parse($output['source_published_at']) : null, null, false),
            ]);
        });
    }

    /** Normalise line breaks into blank-line separated paragraphs (how the article page renders the body). */
    private function paragraphs(string $text): string
    {
        $text = trim(strip_tags(str_replace(['\\n', "\r"], ["\n", ''], $text)));
        $parts = preg_split('/\n\s*\n|\n/u', $text) ?: [];

        return collect($parts)->map(fn ($p) => trim($p))->filter()->implode("\n\n");
    }

    private function category(string $name, NewsItem $item): int
    {
        return Category::whereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))])->value('id')
            ?? $item->source->category_id
            ?? (int) Category::orderBy('sort')->value('id');
    }

    /** Hermes may narrow the source's region to one of its cities/regencies; never outside it. */
    private function region(string $name, NewsItem $item): ?string
    {
        $match = $name !== ''
            ? $this->regions($item)->first(fn (Region $r) => mb_strtolower($r->name) === mb_strtolower(trim($name)))
            : null;

        return $match->code ?? $item->source->region_code;
    }

    /** @return Collection<int, Region> */
    private function regions(NewsItem $item)
    {
        return $item->source->region_code
            ? Region::where('parent_code', $item->source->region_code)->orderBy('name')->get(['code', 'name'])
            : collect();
    }
}
