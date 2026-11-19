<?php

namespace App\Http\Controllers;

use App\Models\DirectoryEntry;
use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** National agenda: calendar of verified events, event pages, and organizer submissions. */
class AgendaController extends Controller
{
    private const CARD = ['id', 'slug', 'region_code', 'category', 'name', 'description', 'address', 'organizer', 'starts_on', 'ends_on', 'featured_at'];

    public function index(Request $request): Response
    {
        $month = preg_match('/^\d{4}-\d{2}$/', (string) $request->query('bulan')) ? $request->query('bulan') : now()->format('Y-m');
        $start = Carbon::createFromFormat('Y-m-d', $month.'-01')->startOfDay();
        $end = $start->copy()->endOfMonth();
        $province = (string) $request->query('provinsi', '');
        $category = (string) $request->query('kategori', '');

        $events = DirectoryEntry::where('type', 'event')->whereNotNull('verified_at')
            ->where('starts_on', '<=', $end->toDateString())
            ->where(fn ($q) => $q->where('ends_on', '>=', $start->toDateString())
                ->orWhere(fn ($e) => $e->whereNull('ends_on')->where('starts_on', '>=', $start->toDateString())))
            ->when($province, fn ($q) => $q->where(fn ($r) => $r->where('region_code', $province)->orWhere('region_code', 'like', $province.'.%')))
            ->when(isset(DirectoryEntry::EVENT_CATEGORIES[$category]), fn ($q) => $q->where('category', $category))
            ->with(['region:code,name,slug,parent_code', 'region.parent:code,name,slug'])
            ->orderBy('starts_on')->limit(300)
            ->get(self::CARD);

        $page = Inertia::render('agenda/index', [
            'month' => $month,
            'events' => $events,
            'featured' => DirectoryEntry::where('type', 'event')->whereNotNull('verified_at')->whereNotNull('featured_at')
                ->where(fn ($q) => $q->where('ends_on', '>=', today())->orWhere(fn ($e) => $e->whereNull('ends_on')->where('starts_on', '>=', today())))
                ->with(['region:code,name,slug,parent_code', 'region.parent:code,name,slug'])
                ->orderBy('starts_on')->limit(6)->get(self::CARD),
            'filters' => ['provinsi' => $province, 'kategori' => $category],
            'provinces' => Region::provinces()->get(['code', 'name']),
            'categories' => DirectoryEntry::EVENT_CATEGORIES,
        ]);

        $label = $start->locale('id')->translatedFormat('F Y');

        return $this->seo($page, "Agenda & Event Nasional {$label}", "Kalender event daerah, seminar, workshop, festival, dan pameran di seluruh Indonesia bulan {$label}.");
    }

    public function show(DirectoryEntry $entry): Response
    {
        abort_unless($entry->type === 'event' && $entry->verified_at, 404);
        $entry->load(['region:code,name,slug,parent_code', 'region.parent:code,name,slug']);
        $place = $entry->region?->name;

        $jsonLd = array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Event',
            'name' => $entry->name,
            'description' => $entry->description,
            'startDate' => $entry->starts_on?->toDateString(),
            'endDate' => ($entry->ends_on ?? $entry->starts_on)?->toDateString(),
            'eventStatus' => 'https://schema.org/EventScheduled',
            'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
            'location' => ['@type' => 'Place', 'name' => $entry->address ?: $place, 'address' => array_filter([
                '@type' => 'PostalAddress', 'streetAddress' => $entry->address, 'addressLocality' => $place,
                'addressRegion' => $entry->region?->parent?->name, 'addressCountry' => 'ID',
            ])],
            'organizer' => $entry->organizer ? ['@type' => 'Organization', 'name' => $entry->organizer, 'url' => $entry->website] : null,
            'url' => route('agenda.show', $entry->slug),
        ]);

        $page = Inertia::render('agenda/show', [
            'event' => $entry->only([...self::CARD, 'website', 'source_url']) + ['region' => $entry->region],
            'categories' => DirectoryEntry::EVENT_CATEGORIES,
        ]);

        return $this->seo(
            $page,
            $entry->name.($place ? " - {$place}" : ''),
            $entry->description ?: "{$entry->name}, {$entry->starts_on?->locale('id')->translatedFormat('j F Y')}".($place ? " di {$place}" : '').'.',
            jsonLd: $jsonLd,
        );
    }

    /** iCalendar file for "Tambah ke kalender". */
    public function ics(DirectoryEntry $entry): HttpResponse
    {
        abort_unless($entry->type === 'event' && $entry->verified_at && $entry->starts_on, 404);
        $escape = fn (?string $s) => str_replace(['\\', ';', ',', "\n"], ['\\\\', '\;', '\\,', '\\n'], (string) $s);
        $ics = implode("\r\n", [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//'.$escape(config('app.name')).'//Agenda//ID', 'BEGIN:VEVENT',
            'UID:event-'.$entry->id.'@'.request()->getHost(),
            'DTSTAMP:'.now()->utc()->format('Ymd\THis\Z'),
            'DTSTART;VALUE=DATE:'.$entry->starts_on->format('Ymd'),
            // All-day events: DTEND is exclusive.
            'DTEND;VALUE=DATE:'.($entry->ends_on ?? $entry->starts_on)->copy()->addDay()->format('Ymd'),
            'SUMMARY:'.$escape($entry->name),
            'DESCRIPTION:'.$escape(trim($entry->description."\n".route('agenda.show', $entry->slug))),
            'LOCATION:'.$escape($entry->address),
            'END:VEVENT', 'END:VCALENDAR', '',
        ]);

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.Str::limit($entry->slug, 60, '').'.ics"',
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('agenda/create', [
            'provinces' => Region::provinces()->get(['code', 'name', 'slug']),
            'categories' => DirectoryEntry::EVENT_CATEGORIES,
        ]);
    }

    /** Organizer submission: waits for a newsroom check before it appears anywhere. */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'category' => ['required', Rule::in(array_keys(DirectoryEntry::EVENT_CATEGORIES))],
            'region_code' => ['required', Rule::exists('regions', 'code')->whereIn('level', [Region::PROVINCE, Region::CITY])],
            'description' => ['required', 'string', 'max:1000'],
            'address' => ['required', 'string', 'max:250'],
            'organizer' => ['required', 'string', 'max:200'],
            'contact' => ['required', 'string', 'max:200'],
            'website' => ['nullable', 'url:http,https', 'max:2048'],
            'starts_on' => ['required', 'date', 'after_or_equal:today'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'featured_requested' => ['boolean'],
        ], [], [
            'name' => 'nama event', 'region_code' => 'daerah', 'description' => 'deskripsi', 'address' => 'lokasi',
            'organizer' => 'penyelenggara', 'contact' => 'kontak', 'starts_on' => 'tanggal mulai', 'ends_on' => 'tanggal selesai',
        ]);

        DirectoryEntry::create([...$data, 'type' => 'event', 'submitted_by' => $request->user()->id]);

        return to_route('agenda')->with('success', 'Terima kasih! Event Anda dikirim dan akan tampil setelah diperiksa redaksi.');
    }
}
