<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\DirectoryEntry;
use App\Models\MembershipApplication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Dashboard Saya": a reader's own corner - followed regions, membership, saved news, agenda. */
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        // Staff work in /admin; this page is for Pelanggan and Klien Data.
        abort_if($user->role->isStaff(), 404);

        $regions = $user->followedRegions()->with('parent:code,name,slug,image_url')
            ->orderBy('region_follows.created_at')->get(['regions.code', 'name', 'slug', 'level', 'type', 'parent_code', 'image_url']);
        $codes = $regions->pluck('code');
        // A followed province also covers its kab/kota.
        $inFollowed = fn (Builder $q, string $column) => $q->where(function (Builder $w) use ($codes, $column) {
            foreach ($codes as $code) {
                $w->orWhere($column, $code)->orWhere($column, 'like', $code.'.%');
            }
        });

        $page = Inertia::render('dashboard', [
            'member' => [
                'organization' => $user->organization,
                'ends_at' => $user->subscription_ends_at?->toDateString(),
                'active' => $user->role->value === 'client' && $user->subscriptionActive(),
            ],
            'application' => MembershipApplication::with('plan:id,name')->where('user_id', $user->id)->latest('id')
                ->first(['id', 'membership_plan_id', 'status', 'admin_note', 'created_at']),
            'regions' => $regions,
            'feed' => $codes->isEmpty() ? [] : Article::published()->card()
                ->tap(fn ($q) => $inFollowed($q, 'region_code'))->limit(6)->get(),
            'bookmarks' => $user->bookmarks()->published()->card()->reorder('bookmarks.created_at', 'desc')->limit(4)->get(),
            'bookmarkCount' => $user->bookmarks()->count(),
            // Followed regions first; with none followed, the national agenda.
            'upcoming' => DirectoryEntry::where('type', 'event')->public()
                ->when($codes->isNotEmpty(), fn ($q) => $inFollowed($q, 'region_code'))->limit(4)
                ->get(['id', 'slug', 'name', 'starts_on', 'ends_on', 'organizer']),
            'submissions' => DirectoryEntry::where('submitted_by', $user->id)->where('type', 'event')->latest('id')->limit(5)
                ->get(['id', 'slug', 'name', 'starts_on', 'verified_at']),
            'submissionCount' => DirectoryEntry::where('submitted_by', $user->id)->where('type', 'event')->count(),
        ]);

        return $this->seo($page, 'Dashboard Saya', 'Ringkasan wilayah yang diikuti, langganan, berita tersimpan, dan agenda Anda.');
    }
}
