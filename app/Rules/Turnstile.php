<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Cloudflare Turnstile token check. Skipped while TURNSTILE_SECRET_KEY is empty,
 * so local development and tests work without keys.
 */
class Turnstile implements ValidationRule
{
    public const FIELD = 'cf-turnstile-response';

    /** Run even when the field is missing, so skipping the widget fails too. */
    public bool $implicit = true;

    public static function enabled(): bool
    {
        return filled(config('services.turnstile.secret_key'));
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! self::enabled()) {
            return;
        }
        if (! is_string($value) || $value === '') {
            $fail('Selesaikan verifikasi captcha terlebih dahulu.');

            return;
        }

        try {
            $result = Http::asForm()->timeout(5)->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => config('services.turnstile.secret_key'),
                'response' => $value,
                'remoteip' => request()->ip(),
            ])->json();
        } catch (Throwable $e) {
            Log::warning('Turnstile verification unreachable', ['error' => $e->getMessage()]);
            $fail('Verifikasi captcha sedang bermasalah. Coba lagi sebentar.');

            return;
        }

        if (! ($result['success'] ?? false)) {
            $fail('Verifikasi captcha gagal. Silakan coba lagi.');
        }
    }

    /** @return array<string, array<int, mixed>> */
    public static function rules(): array
    {
        return self::enabled() ? [self::FIELD => [new self]] : [];
    }
}
