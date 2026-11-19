<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\MembershipApplication;
use App\Models\MembershipPlan;
use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Public "Langganan": plans with their benefits, and the reader's own application. */
class MembershipController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        if (! $user) {
            redirect()->setIntendedUrl(route('membership')); // "Masuk untuk mengajukan" comes back here
        }
        $page = Inertia::render('membership/index', [
            'plans' => MembershipPlan::where('active', true)->orderBy('sort')->get(),
            'provinces' => Region::provinces()->get(['code', 'name']),
            'application' => $user ? MembershipApplication::with('plan:id,name')->where('user_id', $user->id)->latest('id')
                ->first(['id', 'membership_plan_id', 'status', 'admin_note', 'months', 'created_at']) : null,
            'member' => $user?->role === Role::Client ? [
                'organization' => $user->organization,
                'ends_at' => $user->subscription_ends_at?->toDateString(),
                'active' => $user->subscriptionActive(),
            ] : null,
            // Staff already have the dashboard; the form is for readers and members.
            'canApply' => $user && in_array($user->role, [Role::Customer, Role::Client], true),
        ]);

        return $this->seo($page, 'Langganan Media Intelligence', 'Pantau topik, sentimen, dan isu daerah di seluruh Indonesia. Pilih paket Daerah, Regional, atau Nasional untuk pemda, perusahaan, dan konsultan.');
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [Role::Customer, Role::Client], true), 403, 'Akun tim redaksi sudah memiliki akses dashboard.');
        if (MembershipApplication::where('user_id', $user->id)->where('status', 'pending')->exists()) {
            throw ValidationException::withMessages(['plan' => 'Pengajuan Anda sebelumnya masih diproses.']);
        }

        $data = $request->validate([
            'plan' => ['required', Rule::exists('membership_plans', 'id')->where('active', true)],
            'organization' => ['required', 'string', 'max:255'],
            'contact' => ['required', 'string', 'max:100'],
            'months' => ['required', 'integer', Rule::in([1, 3, 6, 12])],
            'provinces' => ['array'],
            'provinces.*' => [Rule::exists('regions', 'code')->where('level', Region::PROVINCE)],
            'note' => ['nullable', 'string', 'max:1000'],
        ], [], ['organization' => 'organisasi', 'contact' => 'kontak', 'months' => 'durasi', 'provinces' => 'provinsi']);

        $plan = MembershipPlan::findOrFail($data['plan']);
        $provinces = array_values(array_unique($data['provinces'] ?? []));
        if ($plan->max_provinces !== null && (count($provinces) < 1 || count($provinces) > $plan->max_provinces)) {
            throw ValidationException::withMessages(['provinces' => "Pilih 1 sampai {$plan->max_provinces} provinsi untuk paket {$plan->name}."]);
        }

        MembershipApplication::create([
            'user_id' => $user->id,
            'membership_plan_id' => $plan->id,
            'organization' => $data['organization'],
            'contact' => $data['contact'],
            'months' => $data['months'],
            'provinces' => $plan->max_provinces === null ? null : $provinces,
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', 'Pengajuan terkirim. Tim kami akan menghubungi Anda melalui kontak yang diberikan.');
    }
}
