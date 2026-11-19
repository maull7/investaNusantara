<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * A reader asking for a membership plan. Approval turns them into a Klien Data.
 *
 * @property int $id
 * @property int $user_id
 * @property int $membership_plan_id
 * @property string $organization
 * @property string $contact
 * @property list<string>|null $provinces
 * @property int $months
 * @property string|null $note
 * @property string $status pending|approved|rejected
 * @property string|null $admin_note
 * @property Carbon|null $reviewed_at
 */
class MembershipApplication extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['provinces' => 'array', 'reviewed_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<MembershipPlan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'membership_plan_id');
    }

    /**
     * Grant the plan: Klien Data role, the chosen provinces, and the subscription
     * extended from today or from the current end date, whichever is later.
     */
    public function approve(User $reviewer, ?string $note = null): void
    {
        DB::transaction(function () use ($reviewer, $note) {
            $user = $this->user;
            $from = $user->subscription_ends_at && $user->subscription_ends_at->gte(today()) ? $user->subscription_ends_at : today();
            $user->forceFill([
                'role' => Role::Client,
                'organization' => $this->organization,
                'client_regions' => $this->plan->max_provinces === null ? null : $this->provinces,
                'subscription_ends_at' => $from->copy()->addMonths($this->months),
            ])->save();
            $this->update(['status' => 'approved', 'admin_note' => $note, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now()]);
        });
    }
}
