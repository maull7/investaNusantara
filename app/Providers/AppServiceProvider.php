<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\ActivityLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Minishlink\WebPush\WebPush;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Breaking-news notifications (see App\Jobs\SendBreakingPush).
        $this->app->bind(WebPush::class, fn () => new WebPush(['VAPID' => [
            'subject' => config('services.webpush.subject'),
            'publicKey' => config('services.webpush.public_key'),
            'privateKey' => config('services.webpush.private_key'),
        ]]));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::define('super-admin', fn (User $user) => $user->role === Role::SuperAdmin);
        // `can:access-users` etc: Super Admin, or a Sub Admin granted that area.
        foreach (Permission::cases() as $permission) {
            Gate::define("access-{$permission->value}", fn (User $user) => $user->canAccess($permission));
        }

        Event::listen(Login::class, fn (Login $e) => ActivityLog::record('auth.login', 'masuk ke ruang redaksi', user: $e->user));
        Event::listen(Logout::class, fn (Logout $e) => ActivityLog::record('auth.logout', 'keluar dari ruang redaksi', user: $e->user));
        Event::listen(Failed::class, fn (Failed $e) => ActivityLog::record(
            'auth.failed',
            'gagal masuk dengan email '.($e->credentials['email'] ?? '-'),
            properties: ['email' => $e->credentials['email'] ?? null],
            user: $e->user,
        ));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
