<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChallengeAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->other = User::factory()->create();
    }

    private function makeChallenge(User $user): Challenge
    {
        return Challenge::create([
            'user_id' => $user->id,
            'lab' => 'LabX',
            'kategori' => 'Web',
            'judul' => 'Challenge ' . uniqid(),
            'path_folder' => 'lab/LabX/Web/challenge-' . uniqid(),
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->get(route('challenges.index'))->assertRedirect(route('login'));
        $this->get(route('challenges.show', $challenge))->assertRedirect(route('login'));
    }

    public function test_owner_can_view_their_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->owner)
            ->get(route('challenges.show', $challenge))
            ->assertOk();
    }

    public function test_other_user_cannot_view_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->other)
            ->get(route('challenges.show', $challenge))
            ->assertForbidden();
    }

    public function test_other_user_cannot_edit_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->other)
            ->get(route('challenges.edit', $challenge))
            ->assertForbidden();
    }

    public function test_other_user_cannot_update_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->other)
            ->patch(route('challenges.update', $challenge), [
                'lab' => 'LabY',
                'kategori' => 'Web',
                'judul' => 'Dibajak',
            ])
            ->assertForbidden();
    }

    public function test_other_user_cannot_delete_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->other)
            ->delete(route('challenges.destroy', $challenge))
            ->assertForbidden();

        $this->assertDatabaseHas('challenges', ['id' => $challenge->id]);
    }

    public function test_owner_can_delete_their_challenge(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->owner)
            ->delete(route('challenges.destroy', $challenge))
            ->assertRedirect(route('challenges.index'));

        $this->assertDatabaseMissing('challenges', ['id' => $challenge->id]);
    }
}