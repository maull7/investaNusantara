<?php

namespace App\Jobs;

use App\Enums\NewsTaskStatus;
use App\Models\AiRun;
use App\Models\ArticleReview;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\RegionDraft;
use App\Services\HermesClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Throwable;

/**
 * One Hermes run for a news fetch or item, driven as a small state machine.
 *
 * Each execution does one step (start the run, or poll it once) and releases itself
 * back onto the queue, so a single worker can follow several runs and never sleeps.
 * The run id lives in `ai_runs`, so a crashed worker or a retry resumes the same run.
 * Status and error are always written to the subject row, which the admin page shows.
 */
abstract class HermesTask implements ShouldQueue
{
    use Queueable;

    /** Releases are unlimited; failures are counted on the subject (MAX_ATTEMPTS). */
    public int $tries = 0;

    public int $maxExceptions = 3;

    public int $timeout = 120;

    public const MAX_ATTEMPTS = 3;

    public function __construct(public int $subjectId)
    {
        $this->onQueue(config('hermes.queue'));
    }

    abstract protected function subject(): NewsFetch|NewsItem|ArticleReview|RegionDraft|null;

    abstract protected function operation(): string;

    abstract protected function runTimeout(): int;

    /** Prompt for a new run, or null when the subject must not run (it set its own final status). */
    abstract protected function prompt(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?string;

    /**
     * Turn the run output into results and give the subject its final status. Throw to retry.
     *
     * @param  array<string, mixed>  $output
     */
    abstract protected function complete(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, array $output): void;

    /**
     * Output obtained without Hermes (an RSS feed, say), or null to ask Hermes.
     *
     * @return array<string, mixed>|null
     */
    protected function shortcut(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?array
    {
        return null;
    }

    /** Called once after the last attempt failed. */
    protected function gaveUp(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, string $message): void {}

    public function handle(HermesClient $hermes): void
    {
        $lock = Cache::lock('hermes-task:'.static::class.':'.$this->subjectId, $this->timeout);
        if (! $lock->get()) {
            // Another copy is mid-step; check back shortly.
            $this->again(10);

            return;
        }

        try {
            $this->step($hermes);
        } finally {
            $lock->release();
        }
    }

    private function step(HermesClient $hermes): void
    {
        $subject = $this->subject();
        if (! $subject || $subject->status->isFinal()) {
            return;
        }

        $run = $subject->runs()->where('operation', $this->operation())->where('status', 'running')->latest('id')->first();
        // A run row without a Hermes id means the worker died while creating it; start over.
        if ($run && ! $run->hermes_run_id) {
            $run->update(['status' => 'failed', 'error' => 'Terputus sebelum Hermes menerima run.', 'finished_at' => now()]);
            $run = null;
        }

        // Cheap path first; it needs no Hermes, so it also works while Hermes is paused.
        if (! $run) {
            try {
                if (($output = $this->shortcut($subject)) !== null) {
                    $subject->update([
                        'status' => NewsTaskStatus::Running,
                        'attempts' => $subject->attempts + 1,
                        'error' => null,
                        ...($subject instanceof NewsFetch && ! $subject->started_at ? ['started_at' => now()] : []),
                    ]);
                    $this->complete($subject, $output);

                    return;
                }
            } catch (Throwable $exception) {
                $this->failure($hermes, $subject, $exception);

                return;
            }
        }

        if (! $run && ! $hermes->enabled()) {
            $subject->update(['status' => NewsTaskStatus::Paused, 'error' => 'Pemakaian token Hermes dinonaktifkan oleh admin.']);
            $this->again(30);

            return;
        }

        if (! $run && ($wait = $hermes->pausedFor()) > 0) {
            $subject->update(['status' => NewsTaskStatus::Paused, 'error' => 'Menunggu Hermes: '.($hermes->lastError() ?? 'gateway/provider bermasalah')]);
            $this->again($wait);

            return;
        }

        try {
            if (! $run) {
                $this->start($hermes, $subject);

                return;
            }

            $subject->touch(); // heartbeat for the stale-task recovery
            if ($run->started_at?->addSeconds($this->runTimeout())->isPast()) {
                throw new RuntimeException('Hermes run timeout: melewati batas waktu '.$this->runTimeout().' detik.');
            }

            $result = $hermes->poll((string) $run->hermes_run_id);
            match ($result['status']) {
                'running' => $this->again((int) config('hermes.poll_seconds')),
                'failed' => throw new RuntimeException((string) $result['error']),
                'completed' => $this->finish($hermes, $subject, $run, $result['output'] ?? [], $result['usage']),
            };
        } catch (Throwable $exception) {
            $this->failure($hermes, $subject, $exception);
        }
    }

    private function start(HermesClient $hermes, NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): void
    {
        $inFlight = AiRun::where('status', 'running')->where('created_at', '>', now()->subMinutes(15))->count();
        if ($inFlight >= (int) config('hermes.max_concurrent_runs')) {
            $subject->update(['status' => NewsTaskStatus::Queued]);
            $this->again(15);

            return;
        }

        $input = $this->prompt($subject);
        if ($input === null) {
            return;
        }

        $run = $subject->runs()->create([
            'operation' => $this->operation(),
            'status' => 'running',
            'input' => $input,
            'started_at' => now(),
        ]);
        $subject->update([
            'status' => NewsTaskStatus::Running,
            'attempts' => $subject->attempts + 1,
            'error' => null,
            ...($subject instanceof NewsFetch && ! $subject->started_at ? ['started_at' => now()] : []),
        ]);

        $started = $hermes->start($input, $this->operation());
        if ($started['run_id'] === null) {
            $this->finish($hermes, $subject, $run, $started['output'] ?? [], $started['usage']);

            return;
        }
        $run->update(['hermes_run_id' => $started['run_id']]);
        $this->again((int) config('hermes.poll_seconds'));
    }

    /**
     * @param  array<string, mixed>  $output
     * @param  array<string, int|null>|null  $usage
     */
    private function finish(HermesClient $hermes, NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, AiRun $run, array $output, ?array $usage): void
    {
        $run->update(['status' => 'completed', 'output' => $output, ...($usage ?? []), 'finished_at' => now()]);
        $hermes->resume();
        $this->complete($subject, $output);
    }

    private function failure(HermesClient $hermes, NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, Throwable $exception): void
    {
        $message = $hermes->friendlyError($exception->getMessage());
        $subject->runs()->where('status', 'running')->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 2000), 'finished_at' => now()]);
        report($exception);

        if ($hermes->isProviderFailure($exception)) {
            // Not this item's fault: don't spend an attempt, wait for the provider.
            $wait = $hermes->pause($message);
            $subject->update(['status' => NewsTaskStatus::Paused, 'attempts' => max(0, $subject->attempts - 1), 'error' => $message]);
            $this->again($wait);

            return;
        }

        if ($subject->attempts < self::MAX_ATTEMPTS) {
            $subject->update(['status' => NewsTaskStatus::Queued, 'error' => $message.' (akan dicoba lagi)']);
            $this->again($subject->attempts === 1 ? 60 : 300);

            return;
        }

        $subject->update(['status' => NewsTaskStatus::Failed, 'error' => $message]);
        $this->gaveUp($subject, $message);
    }

    private function again(int $seconds): void
    {
        $this->release(max(1, $seconds));
    }
}
