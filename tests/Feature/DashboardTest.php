<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;
use Database\Seeders\RegionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_sees_own_dashboard(): void
    {
        $user = User::factory()->create(['role' => Role::Customer]);
        $user->bookmarks()->attach(Article::factory()->published()->create());

        $this->actingAs($user)->get('/akun')->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('bookmarkCount', 1)
            ->has('bookmarks', 1)
            ->where('application', null));
    }

    public function test_guest_and_staff_are_kept_out(): void
    {
        $this->get('/akun')->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => Role::Editor]))->get('/akun')->assertNotFound();
    }

    public function test_reader_follows_region_and_sees_its_news(): void
    {
        $this->seed(RegionSeeder::class);
        $province = Region::provinces()->firstOrFail();
        $city = $province->children()->firstOrFail();
        $other = Region::provinces()->where('code', '!=', $province->code)->firstOrFail();
        $inCity = Article::factory()->published()->create(['region_code' => $city->code]);
        Article::factory()->published()->create(['region_code' => $other->code]);
        $user = User::factory()->create(['role' => Role::Customer]);

        $this->actingAs($user)->post("/wilayah-ikuti/{$province->code}")->assertRedirect();
        $this->actingAs($user)->post("/wilayah-ikuti/{$province->code}");
        $this->assertSame(1, $user->followedRegions()->count());

        // A followed province brings in its kab/kota news, not other provinces'.
        $this->actingAs($user)->get('/akun')->assertInertia(fn (Assert $page) => $page
            ->has('regions', 1)
            ->has('feed', 1)
            ->where('feed.0.id', $inCity->id));

        $this->actingAs($user)->delete("/wilayah-ikuti/{$province->code}")->assertRedirect();
        $this->assertSame(0, $user->followedRegions()->count());
    }

    public function test_staff_cannot_follow(): void
    {
        $this->seed(RegionSeeder::class);
        $code = Region::provinces()->value('code');
        $this->actingAs(User::factory()->create(['role' => Role::Editor]))->post("/wilayah-ikuti/{$code}")->assertForbidden();
    }
}
