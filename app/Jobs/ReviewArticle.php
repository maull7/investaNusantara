<?php

namespace App\Jobs;

use App\Enums\NewsTaskStatus;
use App\Models\ArticleReview;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\RegionDraft;
use App\Services\NewsPrompts;
use Illuminate\Support\Str;
use RuntimeException;

/** Hermes writes the "Review AI" of one article once; every reader after that sees the saved text. */
class ReviewArticle extends HermesTask
{
    protected function subject(): ?ArticleReview
    {
        return ArticleReview::with('article')->find($this->subjectId);
    }

    protected function operation(): string
    {
        return 'review';
    }

    protected function runTimeout(): int
    {
        return (int) config('hermes.run_timeout');
    }

    protected function prompt(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?string
    {
        /** @var ArticleReview $subject */
        return NewsPrompts::review($subject->article);
    }

    /** @param  array<string, mixed>  $output */
    protected function complete(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, array $output): void
    {
        $points = collect((array) ($output['points'] ?? []))
            ->map(fn ($p) => Str::limit(trim(strip_tags((string) $p)), 300))
            ->filter()->take(5)->values()->all();
        $body = collect(preg_split('/\n\s*\n|\n/u', trim(strip_tags(str_replace(['\\n', "\r"], ["\n", ''], (string) ($output['review'] ?? ''))))) ?: [])
            ->map(fn ($p) => trim($p))->filter()->implode("\n\n");
        if ($points === [] || mb_strlen($body) < 100) {
            throw new RuntimeException('Output Hermes tidak lengkap: poin atau review kosong.');
        }

        $subject->update(['status' => NewsTaskStatus::Completed, 'points' => $points, 'body' => $body, 'error' => null]);
    }
}
