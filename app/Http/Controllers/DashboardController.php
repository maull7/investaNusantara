<?php

namespace App\Http\Controllers;

use App\Models\DirectoryEntry;
use App\Models\MembershipApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** "Dashboard Saya": a reader's own corner - membership, saved news, agenda. */
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        // Staff work in /admin; this page is for Pelanggan and Klien Data.
        abort_if($user->role->isStaff(), 404);

        $page = Inertia::render('dashboard', [
            'member' => [
                'role' => $user->role->label(),
                'organization' => $user->organization,
                'ends_at' => $user->subscription_ends_at?->toDateString(),
                'active' => $user->role->value === 'client' && $user->subscriptionActive(),
            ],
            'application' => MembershipApplication::with('plan:id,name')->where('user_id', $user->id)->latest('id')
                ->first(['id', 'membership_plan_id', 'status', 'admin_note', 'created_at']),
            'bookmarks' => $user->bookmarks()->published()->card()->reorder('bookmarks.created_at', 'desc')->limit(4)->get(),
            'bookmarkCount' => $user->bookmarks()->count(),
            'upcoming' => DirectoryEntry::where('type', 'event')->public()->limit(4)
                ->get(['id', 'slug', 'name', 'starts_on', 'ends_on', 'organizer']),
            'submissions' => DirectoryEntry::where('submitted_by', $user->id)->where('type', 'event')->latest('id')->limit(5)
                ->get(['id', 'slug', 'name', 'starts_on', 'verified_at']),
        ]);

        return $this->seo($page, 'Dashboard Saya', 'Ringkasan langganan, berita tersimpan, dan agenda Anda.');
    }
}
