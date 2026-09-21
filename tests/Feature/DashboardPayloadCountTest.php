<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardPayloadCountTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('cyber');
        $this->user = User::factory()->create();
    }

    public function test_dashboard_shows_zero_when_no_payload_files(): void
    {
        $this->actingAs($this->user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('stats.total_payloads', 0));
    }

    public function test_dashboard_counts_payloads_from_files(): void
    {
        $this->actingAs($this->user)->post(route('payloads.store'), [
            'title' => 'Payload Satu',
            'category' => 'SQLi',
            'description' => '',
            'content' => 'a',
        ])->assertRedirect(route('payloads.index'));

        $this->actingAs($this->user)->post(route('payloads.store'), [
            'title' => 'Payload Dua',
            'category' => 'XSS',
            'description' => '',
            'content' => 'b',
        ])->assertRedirect(route('payloads.index'));

        $this->actingAs($this->user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('stats.total_payloads', 2));
    }
}