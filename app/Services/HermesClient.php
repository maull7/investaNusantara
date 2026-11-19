<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Thin client for the Hermes agent gateway.
 *
 * Runs are asynchronous: start() creates a run and returns its id, poll() checks it once.
 * Jobs store the run id and poll across queue releases, so no worker sleeps on a run
 * and a retried job resumes the same run instead of paying for a new one.
 */
class HermesClient
{
    private const PAUSE_UNTIL = 'hermes.pause_until';

    private const PAUSE_MINUTES = 'hermes.pause_minutes';

    private const LAST_ERROR = 'hermes.last_error';

    public function enabled(): bool
    {
        return (bool) (DB::table('ai_settings')->where('key', 'hermes_enabled')->value('enabled') ?? true);
    }

    public function setEnabled(bool $enabled): void
    {
        DB::table('ai_settings')->updateOrInsert(['key' => 'hermes_enabled'], ['enabled' => $enabled]);
        Cache::forget('hermes.health');
    }

    /**
     * `output` is set instead of `run_id` when the gateway answered synchronously.
     *
     * @return array{run_id: string|null, output: array<string, mixed>|null, usage: array<string, int|null>|null}
     */
    public function start(string $input, string $operation): array
    {
        if (! $this->enabled()) {
            throw new RuntimeException('Pemakaian token Hermes dinonaktifkan oleh admin.');
        }

        $response = $this->request()->post(config('hermes.endpoints.runs'), [
            'input' => $input,
            'session_id' => 'nusantara-'.$operation.'-'.now()->format('YmdHis').'-'.Str::lower(Str::random(6)),
        ]);
        if ($response->failed()) {
            throw new RuntimeException('Hermes gagal membuat run (HTTP '.$response->status().'): '.Str::limit($response->body(), 400));
        }

        $data = (array) $response->json();
        $runId = $data['run_id'] ?? $data['id'] ?? null;

        return [
            'run_id' => $runId ? (string) $runId : null,
            'output' => $runId ? null : $this->decode($data['output'] ?? $data),
            'usage' => $this->usage($data),
        ];
    }

    /**
     * @return array{status: 'running'|'completed'|'failed', output: array<string, mixed>|null, error: string|null, usage: array<string, int|null>|null}
     */
    public function poll(string $runId): array
    {
        $response = $this->request()->get(rtrim(config('hermes.endpoints.runs'), '/').'/'.$runId);
        if ($response->failed()) {
            throw new RuntimeException('Hermes polling gagal (HTTP '.$response->status().'): '.Str::limit($response->body(), 400));
        }

        $data = (array) $response->json();
        $status = strtolower((string) ($data['status'] ?? ''));

        return match (true) {
            in_array($status, ['completed', 'complete', 'succeeded', 'success', 'done'], true) => [
                'status' => 'completed',
                'output' => $this->decode($data['output'] ?? $data['result'] ?? $data),
                'error' => null,
                'usage' => $this->usage($data),
            ],
            in_array($status, ['failed', 'error', 'cancelled', 'canceled', 'stopped', 'expired'], true) => [
                'status' => 'failed',
                'output' => null,
                'error' => 'Hermes run berstatus '.$status.': '.Str::limit((string) ($data['error'] ?? $data['message'] ?? 'tanpa detail'), 400),
                'usage' => null,
            ],
            default => ['status' => 'running', 'output' => null, 'error' => null, 'usage' => null],
        };
    }

    /** @return array{status: 'online'|'offline'|'paused'|'disabled', paused_until: string|null, last_error: string|null, checked_at: string} */
    public function status(): array
    {
        if (! $this->enabled()) {
            return ['status' => 'disabled', 'paused_until' => null, 'last_error' => null, 'checked_at' => now()->toIso8601String()];
        }

        $online = Cache::remember('hermes.health', 15, function (): bool {
            try {
                return $this->request()->connectTimeout(2)->timeout(4)->get($this->healthUrl())->successful();
            } catch (Throwable) {
                return false;
            }
        });
        $paused = $this->pausedFor();

        return [
            'status' => ! $online ? 'offline' : ($paused > 0 ? 'paused' : 'online'),
            'paused_until' => $paused > 0 ? now()->addSeconds($paused)->toIso8601String() : null,
            'last_error' => $this->lastError(),
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Gateway down, credits exhausted, rate limited: every job waits instead of failing.
     * The pause doubles each time (5 → 10 → 20 → 40 → 60 minutes) until a run succeeds.
     */
    public function pause(string $reason): int
    {
        $minutes = min(max((int) Cache::get(self::PAUSE_MINUTES, 5), 5), 60);
        Cache::put(self::PAUSE_UNTIL, now()->addMinutes($minutes)->getTimestamp(), now()->addMinutes($minutes));
        Cache::put(self::PAUSE_MINUTES, min($minutes * 2, 60), now()->addDay());
        Cache::put(self::LAST_ERROR, $reason, now()->addDay());

        return $minutes * 60;
    }

    public function lastError(): ?string
    {
        return Cache::get(self::LAST_ERROR);
    }

    public function pausedFor(): int
    {
        return max(0, (int) Cache::get(self::PAUSE_UNTIL, 0) - now()->getTimestamp());
    }

    public function resume(): void
    {
        Cache::forget(self::PAUSE_UNTIL);
        Cache::forget(self::PAUSE_MINUTES);
        Cache::forget(self::LAST_ERROR);
    }

    /** Failures of Hermes or its AI provider (not of this one article) pause the whole queue. */
    public function isProviderFailure(Throwable $exception): bool
    {
        if ($exception instanceof ConnectionException) {
            return true;
        }
        $message = Str::lower($exception->getMessage());

        return Str::contains($message, [
            'http 401', 'http 402', 'http 403', 'http 429', 'http 500', 'http 502', 'http 503', 'http 504',
            'connection error', 'connection refused', 'could not resolve', 'curl error',
            'no credit', 'insufficient', 'quota', 'billing', 'rate limit', 'unauthorized',
        ]);
    }

    public function friendlyError(string $message): string
    {
        $m = Str::lower($message);

        return match (true) {
            Str::contains($m, ['curl error 7', 'connection refused', 'could not resolve', 'curl error 28', 'connection timed out']) => 'Hermes tidak bisa dihubungi. Pastikan SSH tunnel / gateway Hermes menyala.',
            Str::contains($m, ['no credit', 'insufficient', 'quota', 'billing', 'http 402']) => 'Kredit/token provider AI habis atau billing bermasalah.',
            Str::contains($m, ['http 401', 'http 403', 'unauthorized']) => 'Token Hermes ditolak. Periksa HERMES_TOKEN.',
            Str::contains($m, ['http 429', 'rate limit']) => 'Batas permintaan provider AI tercapai. Antrean dijeda sementara.',
            Str::contains($m, ['run timeout', 'melewati batas waktu']) => 'Hermes melewati batas waktu proses.',
            default => Str::limit($message, 450),
        };
    }

    private function request(): PendingRequest
    {
        $request = Http::baseUrl(rtrim((string) config('hermes.base_url'), '/'))
            ->acceptJson()
            ->connectTimeout((int) config('hermes.connect_timeout'))
            ->timeout((int) config('hermes.timeout'));

        return config('hermes.token') ? $request->withToken((string) config('hermes.token')) : $request;
    }

    private function healthUrl(): string
    {
        if ($url = config('hermes.endpoints.health')) {
            return (string) $url;
        }
        $parts = parse_url((string) config('hermes.base_url'));

        return ($parts['scheme'] ?? 'http').'://'.($parts['host'] ?? '127.0.0.1').(isset($parts['port']) ? ':'.$parts['port'] : '').'/health';
    }

    /**
     * Agents often wrap JSON in prose or ``` fences; pull out the outermost object.
     *
     * @return array<string, mixed>
     */
    public function decode(mixed $output): array
    {
        if (is_array($output)) {
            // Some gateways nest the text: {"output": "..."} or {"text": "..."}.
            foreach (['output', 'text', 'content', 'message'] as $key) {
                if (count($output) <= 3 && isset($output[$key]) && is_string($output[$key])) {
                    return $this->decode($output[$key]);
                }
            }

            return $output;
        }
        $text = trim((string) $output);
        $decoded = json_decode($text, true);
        if (! is_array($decoded)) {
            $start = strpos($text, '{');
            $end = strrpos($text, '}');
            $decoded = $start !== false && $end > $start ? json_decode(substr($text, $start, $end - $start + 1), true) : null;
        }

        return is_array($decoded) ? $decoded : ['raw' => Str::limit($text, 4000)];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{input_tokens: int|null, output_tokens: int|null, total_tokens: int|null}|null
     */
    private function usage(array $payload): ?array
    {
        $usage = data_get($payload, 'usage') ?? data_get($payload, 'output.usage') ?? data_get($payload, 'metadata.usage');
        if (! is_array($usage)) {
            return null;
        }
        $in = $usage['input_tokens'] ?? $usage['prompt_tokens'] ?? null;
        $out = $usage['output_tokens'] ?? $usage['completion_tokens'] ?? null;
        $total = $usage['total_tokens'] ?? (is_numeric($in) && is_numeric($out) ? (int) $in + (int) $out : null);

        return [
            'input_tokens' => is_numeric($in) ? (int) $in : null,
            'output_tokens' => is_numeric($out) ? (int) $out : null,
            'total_tokens' => is_numeric($total) ? (int) $total : null,
        ];
    }
}
