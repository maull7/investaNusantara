<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\DirectoryEntry;
use App\Models\Region;
use App\Models\RegionDraft;
use App\Models\RegionProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Directory desk: AI drafts each region, the team corrects and verifies it. */
class DirectoryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $scope = $user->role === Role::Editor ? $user->region_code : null;
        $province = $request->string('province')->value() ?: ($scope ? substr($scope, 0, 2) : '');
        $status = $request->string('status')->value();

        $regions = Region::query()
            ->whereIn('level', [Region::PROVINCE, Region::CITY])
            ->when($scope, fn ($q) => $q->where(fn ($r) => $r->where('code', $scope)->orWhere('code', 'like', $scope.'.%')))
            ->when($province, fn ($q) => $q->where(fn ($r) => $r->where('code', $province)->orWhere('parent_code', $province)))
            ->when($request->string('q')->trim()->value(), fn ($q, $term) => $q->where('name', 'like', "%$term%"))
            ->when($status === 'verified', fn ($q) => $q->whereHas('profile', fn ($p) => $p->whereNotNull('verified_at')))
            ->when($status === 'draft', fn ($q) => $q->whereHas('profile', fn ($p) => $p->whereNull('verified_at')))
            ->when($status === 'empty', fn ($q) => $q->whereDoesntHave('profile'))
            ->with(['profile:region_code,verified_at,facts', 'drafts' => fn ($q) => $q->latest('id')->limit(1)])
            ->withCount(['entries', 'entries as pending_count' => fn ($q) => $q->whereNull('verified_at')])
            ->orderBy('code')
            ->paginate(30)->withQueryString()
            ->through(fn (Region $r) => [
                ...$r->only('code', 'name', 'level', 'entries_count', 'pending_count'),
                'facts' => count($r->profile->facts ?? []),
                'verified' => (bool) $r->profile?->verified_at,
                'has_profile' => (bool) $r->profile,
                'draft' => $r->drafts->first()?->only('status', 'error'),
            ]);

        return Inertia::render('admin/directory/index', [
            'regions' => $regions,
            'provinces' => Region::provinces()
                ->when($scope, fn ($q) => $q->where('code', substr($scope, 0, 2)))
                ->get(['code', 'name']),
            'filters' => [...$request->only('q', 'status'), 'province' => $province],
            'stats' => [
                'verified' => RegionProfile::whereNotNull('verified_at')->count(),
                'draft' => RegionProfile::whereNull('verified_at')->count(),
                'regions' => Region::whereIn('level', [Region::PROVINCE, Region::CITY])->count(),
                'pending_entries' => DirectoryEntry::whereNull('verified_at')->count(),
            ],
        ]);
    }

    /** Moderation queue for events: organizer submissions and AI finds across the regions this user manages. */
    public function agenda(Request $request): Response
    {
        $user = $request->user();
        $scope = $user->role === Role::Editor ? $user->region_code : null;
        $status = $request->string('status')->value() ?: 'pending';

        $events = DirectoryEntry::where('type', 'event')
            ->when($scope, fn ($q) => $q->where(fn ($r) => $r->where('region_code', $scope)->orWhere('region_code', 'like', $scope.'.%')))
            ->when($status === 'pending', fn ($q) => $q->whereNull('verified_at'))
            ->when($status === 'featured_requested', fn ($q) => $q->where('featured_requested', true)->whereNull('featured_at'))
            ->when($status === 'featured', fn ($q) => $q->whereNotNull('featured_at'))
            ->when($status === 'verified', fn ($q) => $q->whereNotNull('verified_at'))
            ->with(['region:code,name,parent_code', 'region.parent:code,name', 'submitter:id,name'])
            ->orderBy('starts_on')
            ->paginate(30)->withQueryString();
        $events->getCollection()->each->makeVisible('contact');

        return Inertia::render('admin/directory/agenda', [
            'events' => $events,
            'status' => $status,
            'categories' => DirectoryEntry::EVENT_CATEGORIES,
        ]);
    }

    /** Quick approve/hide from the agenda queue. */
    public function verify(Request $request, DirectoryEntry $entry): RedirectResponse
    {
        $this->authorizeRegion($request, $entry->region);
        $on = ! $entry->verified_at;
        $entry->update([
            'verified_at' => $on ? now() : null,
            'verified_by' => $on ? $request->user()->id : null,
            ...($on ? [] : ['featured_at' => null]),
        ]);

        return back()->with('success', $on ? 'Event disetujui dan tampil di agenda.' : 'Event disembunyikan.');
    }

    public function show(Request $request, Region $region): Response
    {
        $this->authorizeRegion($request, $region);
        $region->load(['parent:code,name,slug', 'profile.verifier:id,name']);

        return Inertia::render('admin/directory/show', [
            'region' => $region->only('code', 'name', 'slug', 'level', 'parent'),
            'profile' => $region->profile,
            'factFields' => collect(RegionProfile::FACTS)->map(fn ($f, $key) => ['key' => $key, 'label' => $f[0], 'unit' => $f[1]])->values(),
            'entries' => $region->entries()->with('submitter:id,name')->orderBy('type')->orderBy('name')->get()->makeVisible('contact'),
            'types' => DirectoryEntry::TYPES,
            'eventCategories' => DirectoryEntry::EVENT_CATEGORIES,
            'draft' => $region->drafts()->latest('id')->first(['id', 'status', 'error', 'updated_at']),
        ]);
    }

    /** "Simpan" keeps it as a draft; "Simpan & verifikasi" publishes it to readers. */
    public function updateProfile(Request $request, Region $region): RedirectResponse
    {
        $this->authorizeRegion($request, $region);
        $keys = array_keys(RegionProfile::FACTS);
        $data = $request->validate([
            'facts' => ['array'],
            'facts.*.value' => ['nullable', 'string', 'max:200'],
            'facts.*.source' => ['nullable', 'url:http,https', 'max:2048', 'required_with:facts.*.value'],
            'facts.*.as_of' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:5000'],
            'description_source' => ['nullable', 'url:http,https', 'max:2048', 'required_with:description'],
            'verify' => ['boolean'],
        ], ['facts.*.source.required_with' => 'Sumber wajib diisi.', 'description_source.required_with' => 'Sumber wajib diisi.']);

        $facts = collect($data['facts'] ?? [])->only($keys)
            ->filter(fn ($f) => filled($f['value'] ?? null))
            ->map(fn ($f) => ['value' => trim($f['value']), 'source' => $f['source'], 'as_of' => $f['as_of'] ?? null])
            ->all();
        $verify = $request->boolean('verify');

        RegionProfile::updateOrCreate(['region_code' => $region->code], [
            'facts' => $facts ?: null,
            'description' => $data['description'] ?? null,
            'description_source' => $data['description_source'] ?? null,
            'verified_at' => $verify ? now() : null,
            'verified_by' => $verify ? $request->user()->id : null,
        ]);

        return back()->with('success', $verify ? 'Profil diverifikasi dan tampil di situs.' : 'Profil disimpan sebagai draf.');
    }

    public function draft(Request $request, Region $region): RedirectResponse
    {
        $this->authorizeRegion($request, $region);

        return RegionDraft::queueFor($region->code, $request->user()->id)
            ? back()->with('success', 'Hermes mulai menyusun draf. Hasilnya muncul sebagai draf yang perlu diverifikasi.')
            : back()->with('error', 'Draf AI untuk daerah ini masih berjalan.');
    }

    public function storeEntry(Request $request, Region $region): RedirectResponse
    {
        $this->authorizeRegion($request, $region);
        $region->entries()->create($this->entryData($request, null));

        return back()->with('success', 'Entri ditambahkan.');
    }

    public function updateEntry(Request $request, DirectoryEntry $entry): RedirectResponse
    {
        $this->authorizeRegion($request, $entry->region);
        $entry->update($this->entryData($request, $entry));

        return back()->with('success', $entry->verified_at ? 'Entri diverifikasi.' : 'Entri disimpan sebagai draf.');
    }

    /** "Unggulan": shown on top of the agenda and on the home page. Only verified events qualify. */
    public function feature(Request $request, DirectoryEntry $entry): RedirectResponse
    {
        $this->authorizeRegion($request, $entry->region);
        abort_unless($entry->type === 'event' && $entry->verified_at, 422, 'Verifikasi event terlebih dulu.');
        $entry->update(['featured_at' => $entry->featured_at ? null : now()]);

        return back()->with('success', $entry->featured_at ? 'Event dijadikan unggulan.' : 'Event tidak lagi unggulan.');
    }

    public function destroyEntry(Request $request, DirectoryEntry $entry): RedirectResponse
    {
        $this->authorizeRegion($request, $entry->region);
        $entry->delete();

        return back()->with('success', 'Entri dihapus.');
    }

    /** @return array<string, mixed> */
    private function entryData(Request $request, ?DirectoryEntry $entry): array
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(DirectoryEntry::TYPES))],
            'category' => ['nullable', 'required_if:type,event', Rule::in(array_keys(DirectoryEntry::EVENT_CATEGORIES))],
            'organizer' => ['nullable', 'string', 'max:200'],
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'address' => ['nullable', 'string', 'max:250'],
            'website' => ['nullable', 'url:http,https', 'max:2048'],
            // Organizer submissions are their own source; everything else must cite one.
            'source_url' => [Rule::requiredIf(! $entry?->submitted_by), 'nullable', 'url:http,https', 'max:2048'],
            'starts_on' => ['nullable', 'required_if:type,event', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'verify' => ['boolean'],
        ], ['source_url.required' => 'Sumber wajib diisi.', 'starts_on.required_if' => 'Tanggal mulai wajib untuk event.']);

        $verify = $request->boolean('verify');
        unset($data['verify']);
        if ($data['type'] !== 'event') {
            $data['starts_on'] = $data['ends_on'] = $data['category'] = $data['organizer'] = null;
        }

        return [
            ...$data,
            'verified_at' => $verify ? now() : null,
            'verified_by' => $verify ? $request->user()->id : null,
            // A hidden event cannot stay featured.
            ...($verify ? [] : ['featured_at' => null]),
        ];
    }

    private function authorizeRegion(Request $request, Region $region): void
    {
        abort_unless($request->user()->canManageRegion($region->code), 403, 'Daerah di luar cakupan Anda.');
    }
}
