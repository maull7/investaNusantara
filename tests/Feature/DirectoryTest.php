<?php

namespace Tests\Feature;

use App\Enums\NewsTaskStatus;
use App\Enums\Role;
use App\Jobs\DraftRegion;
use App\Models\DirectoryEntry;
use App\Models\Region;
use App\Models\RegionDraft;
use App\Models\RegionProfile;
use App\Models\User;
use App\Services\HermesClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['hermes.base_url' => 'http://hermes.test/v1', 'hermes.token' => 'secret']);
        Region::insert([
            ['code' => '32', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Barat', 'slug' => 'jawa-barat'],
            ['code' => '32.71', 'parent_code' => '32', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Bogor', 'slug' => 'kota-bogor'],
            ['code' => '33', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Tengah', 'slug' => 'jawa-tengah'],
        ]);
    }

    public function test_ai_draft_keeps_only_sourced_items_and_never_publishes(): void
    {
        $draft = RegionDraft::create(['region_code' => '32.71']);
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => json_encode([
            'status' => 'ok',
            'facts' => [
                'population' => ['value' => '1.052.359', 'source' => 'https://kotabogor.bps.go.id/x', 'as_of' => '2024'],
                'head' => ['value' => 'Tanpa Sumber', 'source' => null], // dropped: no source
                'unknown' => ['value' => 'x', 'source' => 'https://a.go.id'], // dropped: not a known fact
            ],
            'description' => ['text' => "Paragraf satu.\n\nParagraf dua.", 'source' => 'https://kotabogor.go.id'],
            'wisata' => [
                ['name' => 'Kebun Raya Bogor', 'description' => 'Kebun botani.', 'source' => 'https://krb.go.id'],
                ['name' => 'Tempat Karangan', 'source' => ''], // dropped
            ],
            'events' => [
                ['name' => 'Cap Go Meh', 'starts_on' => now()->addMonth()->toDateString(), 'source' => 'https://kotabogor.go.id/e'],
                ['name' => 'Tanpa Tanggal', 'source' => 'https://kotabogor.go.id/e2'], // dropped: events need a date
            ],
        ])])]);

        (new DraftRegion($draft->id))->handle(app(HermesClient::class));

        $this->assertSame(NewsTaskStatus::Completed, $draft->refresh()->status);
        $profile = RegionProfile::find('32.71');
        $this->assertSame(['population'], array_keys($profile->facts));
        $this->assertSame('2024', $profile->facts['population']['as_of']);
        $this->assertNull($profile->verified_at);
        $this->assertSame(['Cap Go Meh', 'Kebun Raya Bogor'], DirectoryEntry::orderBy('name')->pluck('name')->all());
        $this->assertSame(0, DirectoryEntry::whereNotNull('verified_at')->count());

        // Nothing is public until an editor verifies it.
        $this->get('/wilayah/jawa-barat/kota-bogor')->assertInertia(fn (Assert $page) => $page
            ->where('directory.profile', null)
            ->has('directory.entries', 0));
    }

    public function test_verified_profile_is_not_overwritten_by_a_new_draft(): void
    {
        RegionProfile::create(['region_code' => '32.71', 'facts' => ['population' => ['value' => '1', 'source' => 'https://a.go.id', 'as_of' => '2024']], 'verified_at' => now()]);
        $draft = RegionDraft::create(['region_code' => '32.71']);
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => json_encode([
            'facts' => ['population' => ['value' => '999', 'source' => 'https://b.go.id', 'as_of' => '2025']],
        ])])]);

        (new DraftRegion($draft->id))->handle(app(HermesClient::class));

        $this->assertSame('1', RegionProfile::find('32.71')->facts['population']['value']);
    }

    public function test_editor_manages_and_verifies_only_their_region(): void
    {
        Queue::fake();
        $editor = User::factory()->create(['role' => Role::Editor, 'region_code' => '32']);

        $this->actingAs($editor)->get('/admin/direktori')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('regions.data', 2)); // Jawa Barat + Kota Bogor, not Jawa Tengah
        $this->actingAs($editor)->get('/admin/direktori/33')->assertForbidden();
        $this->actingAs($editor)->post('/admin/direktori/33/draf')->assertForbidden();

        $this->actingAs($editor)->post('/admin/direktori/32.71/draf')->assertRedirect();
        $this->actingAs($editor)->post('/admin/direktori/32.71/draf')->assertSessionHas('error'); // already running
        Queue::assertPushed(DraftRegion::class, 1);

        // A fact without a source is rejected.
        $this->actingAs($editor)->put('/admin/direktori/32.71/profil', [
            'facts' => ['population' => ['value' => '1.052.359', 'source' => '']],
        ])->assertSessionHasErrors('facts.population.source');

        $this->actingAs($editor)->put('/admin/direktori/32.71/profil', [
            'facts' => ['population' => ['value' => '1.052.359', 'source' => 'https://bps.go.id', 'as_of' => '2024']],
            'verify' => true,
        ])->assertRedirect();
        $this->actingAs($editor)->post('/admin/direktori/32.71/entri', [
            'type' => 'wisata', 'name' => 'Kebun Raya Bogor', 'source_url' => 'https://krb.go.id', 'verify' => true,
        ])->assertRedirect();
        $this->actingAs($editor)->post('/admin/direktori/32.71/entri', [
            'type' => 'event', 'name' => 'Festival Lama', 'source_url' => 'https://a.go.id',
            'starts_on' => now()->subMonth()->toDateString(), 'verify' => true,
        ])->assertRedirect();

        $this->get('/wilayah/jawa-barat/kota-bogor')->assertInertia(fn (Assert $page) => $page
            ->where('directory.profile.facts.population.value', '1.052.359')
            ->has('directory.entries', 1) // the past event is hidden
            ->where('directory.entries.0.name', 'Kebun Raya Bogor'));
    }

    public function test_journalists_cannot_open_the_directory(): void
    {
        $journalist = User::factory()->create(['role' => Role::Journalist]);

        $this->actingAs($journalist)->get('/admin/direktori')->assertForbidden();
    }

    public function test_topic_page_shows_verified_data_for_that_topic(): void
    {
        RegionProfile::create(['region_code' => '32.71', 'verified_at' => now(), 'facts' => [
            'umk' => ['value' => 'Rp 5.126.897', 'source' => 'https://jabarprov.go.id', 'as_of' => '2026'],
            'ipm' => ['value' => '78,5', 'source' => 'https://bps.go.id', 'as_of' => '2025'],
        ]]);
        DirectoryEntry::create(['region_code' => '32.71', 'type' => 'industri', 'name' => 'Kawasan A', 'source_url' => 'https://a.go.id', 'verified_at' => now()]);
        DirectoryEntry::create(['region_code' => '32.71', 'type' => 'pendidikan', 'name' => 'Kampus B', 'source_url' => 'https://b.go.id', 'verified_at' => now()]);

        $this->get('/investasi/jawa-barat/kota-bogor')->assertOk()
            ->assertSee('<title>Investasi Kota Bogor: Data &amp; Informasi Terbaru', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('region/topic')
                ->has('facts', 1) // umk only; ipm belongs to "pendidikan"
                ->where('facts.0.key', 'umk')
                ->has('entries', 1)
                ->where('entries.0.name', 'Kawasan A'));
        $this->get('/pendidikan/jawa-barat/kota-bogor')->assertInertia(fn (Assert $page) => $page->where('entries.0.name', 'Kampus B'));
        $this->get('/bukan-topik/jawa-barat/kota-bogor')->assertNotFound();
        $this->get('/investasi/jawa-tengah/kota-bogor')->assertNotFound(); // child must belong to the province
    }

    public function test_compare_page_ranks_regions_by_number(): void
    {
        Region::insert(['code' => '32.01', 'parent_code' => '32', 'level' => 2, 'type' => 'kabupaten', 'name' => 'Kabupaten Bogor', 'slug' => 'kabupaten-bogor']);
        foreach (['32.71' => 'Rp 5.126.897', '32.01' => 'Rp 5.161.769'] as $code => $umk) {
            RegionProfile::create(['region_code' => $code, 'verified_at' => now(), 'facts' => ['umk' => ['value' => $umk, 'source' => 'https://a.go.id', 'as_of' => '2026']]]);
        }
        RegionProfile::create(['region_code' => '32', 'facts' => ['umk' => ['value' => 'Rp 9.999.999', 'source' => 'https://a.go.id']]]); // unverified

        $this->get('/data/umk')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('rows', 2)
            ->where('rows.0.name', 'Kabupaten Bogor')
            ->where('rows.0.number', 5161769));
        $this->get('/data/apbd')->assertNotFound(); // not a comparable fact

        $this->assertSame(5126897.0, RegionProfile::number('Rp 5.126.897'));
        $this->assertSame(78.5, RegionProfile::number('78,5'));
        $this->assertSame(5.12, RegionProfile::number('5,12 %'));
        $this->assertNull(RegionProfile::number('tidak ada'));
    }

    public function test_event_submission_waits_for_approval_then_appears_with_schema(): void
    {
        $this->post('/agenda/ajukan', [])->assertRedirect('/login');
        $reader = User::factory()->create(['role' => Role::Journalist]);
        $start = now()->addDays(10)->toDateString();

        $this->actingAs($reader)->post('/agenda/ajukan', [
            'name' => 'Pameran UMKM Bogor', 'category' => 'pameran', 'region_code' => '32.71',
            'description' => 'Pameran produk UMKM.', 'address' => 'GOR Pajajaran', 'organizer' => 'Dinas KUMKM',
            'contact' => '0812-0000-0000', 'starts_on' => $start, 'featured_requested' => true,
        ])->assertRedirect('/agenda');

        $event = DirectoryEntry::firstOrFail();
        $this->assertNull($event->verified_at);
        $this->assertNotNull($event->slug);
        $this->get("/agenda/{$event->slug}")->assertNotFound();
        $this->get('/agenda?bulan='.substr($start, 0, 7))->assertInertia(fn (Assert $page) => $page->has('events', 0));

        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $this->actingAs($admin)->get('/admin/direktori/agenda')->assertInertia(fn (Assert $page) => $page
            ->where('events.data.0.contact', '0812-0000-0000'));
        $this->actingAs($admin)->post("/admin/direktori/entri/{$event->id}/verifikasi")->assertRedirect();
        $this->actingAs($admin)->post("/admin/direktori/entri/{$event->id}/unggulan")->assertRedirect();
        $this->assertNotNull($event->refresh()->featured_at);

        $this->get('/agenda?bulan='.substr($start, 0, 7))->assertInertia(fn (Assert $page) => $page
            ->has('events', 1)
            ->has('featured', 1)
            ->missing('events.0.contact')); // organizer contact never leaves the newsroom
        $this->get("/agenda/{$event->slug}")->assertOk()
            ->assertSee('"@type":"Event"', false)
            ->assertSee('"startDate":"'.$start.'"', false)
            ->assertDontSee('0812-0000-0000');
        $this->get("/agenda/{$event->slug}/kalender.ics")->assertOk()
            ->assertHeader('Content-Type', 'text/calendar; charset=utf-8')
            ->assertSee('SUMMARY:Pameran UMKM Bogor', false);
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('agenda.0.name', 'Pameran UMKM Bogor'));
    }
}
