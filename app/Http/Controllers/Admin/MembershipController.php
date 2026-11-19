<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MembershipApplication;
use App\Models\MembershipPlan;
use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admin > Langganan: review readers' applications and edit plans, prices and benefits. */
class MembershipController extends Controller
{
    public function index(Request $request): Response
    {
        $status = in_array($request->query('status'), ['pending', 'approved', 'rejected', 'all'], true) ? $request->query('status') : 'pending';

        return Inertia::render('admin/memberships/index', [
            'status' => $status,
            'counts' => MembershipApplication::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'applications' => MembershipApplication::with(['user:id,name,email,role,subscription_ends_at', 'plan:id,name,max_provinces'])
                ->when($status !== 'all', fn ($q) => $q->where('status', $status))
                ->latest('id')->paginate(20)->withQueryString(),
            'plans' => MembershipPlan::orderBy('sort')->get(),
            'provinceNames' => Region::provinces()->pluck('name', 'code'),
        ]);
    }

    public function approve(Request $request, MembershipApplication $application): RedirectResponse
    {
        abort_unless($application->status === 'pending', 422, 'Pengajuan ini sudah diproses.');
        $application->approve($request->user(), $request->string('admin_note')->value() ?: null);

        return back()->with('success', "Langganan {$application->organization} aktif hingga ".$application->user->subscription_ends_at->translatedFormat('j F Y').'.');
    }

    public function reject(Request $request, MembershipApplication $application): RedirectResponse
    {
        abort_unless($application->status === 'pending', 422, 'Pengajuan ini sudah diproses.');
        $data = $request->validate(['admin_note' => ['required', 'string', 'max:500']], ['admin_note.required' => 'Tulis alasan agar pemohon tahu.']);
        $application->update(['status' => 'rejected', 'admin_note' => $data['admin_note'], 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        return back()->with('success', 'Pengajuan ditolak.');
    }

    public function updatePlan(Request $request, MembershipPlan $plan): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'price' => ['required', 'integer', 'min:0'],
            'max_provinces' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:38'],
            'sort' => ['sometimes', 'required', 'integer', 'min:0', 'max:65535'],
            'benefits' => ['required', 'string', 'max:3000', 'regex:/\S/u'], // one per line
            'highlighted' => ['boolean'],
            'active' => ['boolean'],
        ]);
        $data['benefits'] = collect(preg_split('/\r?\n/', $data['benefits']))->map(fn ($b) => trim($b))->filter()->values()->all();
        $plan->update($data);

        return back()->with('success', "Paket {$plan->name} diperbarui.");
    }
}
