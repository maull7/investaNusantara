<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Article;
use App\Models\MembershipApplication;
use App\Models\MembershipPlan;
use App\Models\Region;
use App\Models\User;
use Database\Seeders\MembershipPlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MembershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Region::insert([
            ['code' => '32', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Barat', 'slug' => 'jawa-barat'],
            ['code' => '51', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Bali', 'slug' => 'bali'],
        ]);
        $this->seed(MembershipPlanSeeder::class);
    }

    private function plan(string $slug): MembershipPlan
    {
        return MembershipPlan::where('slug', $slug)->firstOrFail();
    }

    public function test_promotion_page_lists_plans_and_asks_guests_to_log_in(): void
    {
        $this->get('/langganan')->assertOk()
            ->assertSee('<title>Langganan Media Intelligence', false)
            ->assertInertia(fn (Assert $page) => $page
                ->component('membership/index')
                ->has('plans', 3)
                ->where('plans.1.highlighted', true)
                ->where('canApply', false));

        $this->post('/langganan', [])->assertRedirect('/login');
    }

    public function test_reader_applies_and_admin_approval_turns_them_into_a_client(): void
    {
        $reader = User::factory()->create(['role' => Role::Customer]);
        $daerah = $this->plan('daerah');

        // Plan "Daerah" allows exactly one province.
        $this->actingAs($reader)->post('/langganan', [
            'plan' => $daerah->id, 'organization' => 'Pemkab Contoh', 'contact' => '0812-1111-2222',
            'months' => 3, 'provinces' => ['32', '51'],
        ])->assertSessionHasErrors('provinces');

        $this->actingAs($reader)->post('/langganan', [
            'plan' => $daerah->id, 'organization' => 'Pemkab Contoh', 'contact' => '0812-1111-2222',
            'months' => 3, 'provinces' => ['32'],
        ])->assertSessionHasNoErrors();

        // One open application at a time.
        $this->actingAs($reader)->post('/langganan', [
            'plan' => $daerah->id, 'organization' => 'Lagi', 'contact' => '0812', 'months' => 1, 'provinces' => ['32'],
        ])->assertSessionHasErrors('plan');

        $application = MembershipApplication::firstOrFail();
        $this->actingAs($reader)->get('/admin/langganan')->assertRedirect(); // readers stay out of the newsroom

        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $this->actingAs($admin)->get('/admin/langganan')->assertInertia(fn (Assert $page) => $page
            ->where('counts.pending', 1)
            ->where('applications.data.0.organization', 'Pemkab Contoh'));
        $this->actingAs($admin)->post("/admin/langganan/{$application->id}/setujui")->assertRedirect();

        $reader->refresh();
        $this->assertSame(Role::Client, $reader->role);
        $this->assertSame('Pemkab Contoh', $reader->organization);
        $this->assertSame(['32'], $reader->client_regions);
        $this->assertSame(today()->addMonths(3)->toDateString(), $reader->subscription_ends_at->toDateString());
        $this->assertSame('approved', $application->refresh()->status);

        // As a member, the next approved application extends from the current end date.
        $this->actingAs($reader)->post('/langganan', [
            'plan' => $this->plan('nasional')->id, 'organization' => 'Pemkab Contoh', 'contact' => '0812', 'months' => 1,
        ])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post('/admin/langganan/'.MembershipApplication::latest('id')->value('id').'/setujui');
        $reader->refresh();
        $this->assertNull($reader->client_regions); // nationwide
        $this->assertSame(today()->addMonths(3)->addMonth()->toDateString(), $reader->subscription_ends_at->toDateString());
    }

    public function test_rejection_needs_a_reason_and_staff_cannot_apply(): void
    {
        $reader = User::factory()->create(['role' => Role::Customer]);
        $application = MembershipApplication::create([
            'user_id' => $reader->id, 'membership_plan_id' => $this->plan('regional')->id,
            'organization' => 'PT Contoh', 'contact' => '0812', 'provinces' => ['32'], 'months' => 1,
        ]);
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);

        $this->actingAs($admin)->post("/admin/langganan/{$application->id}/tolak")->assertSessionHasErrors('admin_note');
        $this->actingAs($admin)->post("/admin/langganan/{$application->id}/tolak", ['admin_note' => 'Data belum lengkap'])->assertRedirect();
        $this->assertSame('rejected', $application->refresh()->status);
        $this->assertSame(Role::Customer, $reader->refresh()->role);

        $this->actingAs(User::factory()->create(['role' => Role::Journalist]))
            ->post('/langganan', ['plan' => $this->plan('daerah')->id])->assertForbidden();
    }

    public function test_admin_edits_plan_price_and_benefits(): void
    {
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $plan = $this->plan('daerah');

        $this->actingAs($admin)->put("/admin/langganan/paket/{$plan->id}", [
            'name' => 'Daerah Plus', 'tagline' => 'Untuk pemkab', 'price' => 750000,
            'benefits' => "Benefit satu\n\n  Benefit dua  ", 'highlighted' => false, 'active' => true,
        ])->assertRedirect();

        $plan->refresh();
        $this->assertSame(750000, $plan->price);
        $this->assertSame(['Benefit satu', 'Benefit dua'], $plan->benefits);

        $editor = User::factory()->create(['role' => Role::Editor]);
        $this->actingAs($editor)->get('/admin/langganan')->assertForbidden();
    }

    public function test_plan_configuration_controls_public_offers_and_validates_scope(): void
    {
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $plan = $this->plan('daerah');
        $data = [
            'name' => 'Daerah Plus', 'tagline' => 'Pantau wilayah pilihan', 'price' => 650000,
            'benefits' => "Laporan daerah\nEkspor data", 'highlighted' => true, 'active' => true,
            'max_provinces' => 2, 'sort' => 10,
        ];
        $this->actingAs($admin)->put("/admin/langganan/paket/{$plan->id}", $data)->assertSessionHasNoErrors();
        $this->assertDatabaseHas('membership_plans', ['id' => $plan->id, 'max_provinces' => 2, 'sort' => 10]);
        $this->get('/langganan')->assertInertia(fn (Assert $page) => $page
            ->where('plans.2.name', 'Daerah Plus')->where('plans.2.price', 650000)
            ->where('plans.2.highlighted', true)->where('plans.2.max_provinces', 2));

        $this->put("/admin/langganan/paket/{$plan->id}", [...$data, 'max_provinces' => 0, 'sort' => -1])
            ->assertSessionHasErrors(['max_provinces', 'sort']);
        $this->put("/admin/langganan/paket/{$plan->id}", [...$data, 'max_provinces' => null, 'active' => false])
            ->assertSessionHasNoErrors();
        $this->get('/langganan')->assertInertia(fn (Assert $page) => $page->has('plans', 2));
        $this->assertNull($plan->refresh()->max_provinces);
    }

    public function test_article_offer_uses_active_admin_configured_plan(): void
    {
        $article = Article::factory()->published()->create();
        $plan = $this->plan('regional');
        $plan->update(['price' => 990000, 'benefits' => ['Benefit terbaru']]);
        $this->get("/berita/{$article->slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('membershipOffer.id', $plan->id)
            ->where('membershipOffer.price', 990000)
            ->where('membershipOffer.benefits', ['Benefit terbaru']));
        MembershipPlan::query()->update(['active' => false]);
        $this->get("/berita/{$article->slug}")->assertInertia(fn (Assert $page) => $page->where('membershipOffer', null));
    }
}
