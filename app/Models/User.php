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
#[Fillable(['name', 'email', 'password', 'role', 'region_code', 'permissions'])]
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
        ];
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

    /** Super Admin opens every admin area; a Sub Admin only the ones granted to them. */
    public function canAccess(Permission|string $permission): bool
    {
        $permission = $permission instanceof Permission ? $permission : Permission::from($permission);

        return match ($this->role) {
            Role::SuperAdmin => true,
            Role::SubAdmin => in_array($permission->value, $this->permissions ?? [], true),
            default => false,
        };
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
