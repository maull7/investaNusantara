<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Concerns\LogsActivity;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property Role $role
 * @property string|null $region_code
 * @property list<string>|null $permissions
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'organization', 'email', 'password', 'role', 'region_code', 'permissions', 'client_regions', 'subscription_ends_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    use LogsActivity {
        logActivity as traitLogActivity;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'permissions' => 'array',
            'client_regions' => 'array',
            'subscription_ends_at' => 'date',
        ];
    }

    /** "Berita tersimpan", newest save first. @return BelongsToMany<Article, $this> */
    public function bookmarks(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'bookmarks')->withTimestamps();
    }

    /** Provinces and kab/kota the reader follows ("Ikuti wilayah"). @return BelongsToMany<Region, $this> */
    public function followedRegions(): BelongsToMany
    {
        return $this->belongsToMany(Region::class, 'region_follows', 'user_id', 'region_code')->withTimestamps();
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    public function hasRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Super Admin opens every admin area; a Sub Admin only the ones granted to them.
     * Editors also manage the directory, limited to their own region (see canManageRegion).
     */
    public function canAccess(Permission|string $permission): bool
    {
        $permission = $permission instanceof Permission ? $permission : Permission::from($permission);

        return match ($this->role) {
            Role::SuperAdmin => true,
            Role::SubAdmin => in_array($permission->value, $this->permissions ?? [], true),
            Role::Editor => $permission === Permission::Directory,
            // The expiry is checked by the dashboard itself, which explains it instead of a bare 403.
            Role::Client => $permission === Permission::Insights,
            default => false,
        };
    }

    public function subscriptionActive(): bool
    {
        // The end date itself is still included.
        return $this->role !== Role::Client || ! $this->subscription_ends_at || $this->subscription_ends_at->gte(today());
    }

    /**
     * Provinces this user may analyse in Media Intelligence; null = all of Indonesia.
     *
     * @return list<string>|null
     */
    public function insightProvinces(): ?array
    {
        return $this->role === Role::Client && $this->client_regions ? array_values($this->client_regions) : null;
    }

    /** Directory rows of this region: needs Directory access; region editors only inside their region. */
    public function canManageRegion(string $code): bool
    {
        if (! $this->canAccess(Permission::Directory)) {
            return false;
        }

        return $this->role !== Role::Editor || ! $this->region_code
            || (new Region(['code' => $this->region_code]))->contains($code);
    }

    /** @return list<string> Admin areas this user may open. */
    public function access(): array
    {
        return array_values(array_map(
            fn (Permission $p) => $p->value,
            array_filter(Permission::cases(), fn (Permission $p) => $this->canAccess($p)),
        ));
    }

    public function activityNoun(): string
    {
        return 'pengguna';
    }

    /**
     * Public sign-up happens before login, so the new user is credited as the actor.
     *
     * @param  array<string, mixed>  $properties
     */
    protected function logActivity(string $event, string $verb, array $properties = []): void
    {
        if ($event === 'created' && ! auth()->check() && request()->is('register', 'auth/google/callback')) {
            $role = ($this->role ?? Role::Contributor)->label();
            ActivityLog::record('user.registered', "mendaftar sebagai {$role}", $this, [], $this);

            return;
        }
        $this->traitLogActivity($event, $verb, $properties);
    }
}
