<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChallengeDeleteFileTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('cyber');

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

    public function test_owner_can_delete_attachment_file(): void
    {
        $challenge = $this->makeChallenge($this->owner);
        Storage::disk('cyber')->put("{$challenge->path_folder}/bukti.txt", 'konten');

        $this->actingAs($this->owner)
            ->delete(route('challenges.deleteFile', $challenge), ['filename' => 'bukti.txt'])
            ->assertRedirect();

        Storage::disk('cyber')->assertMissing("{$challenge->path_folder}/bukti.txt");
    }

    public function test_other_user_cannot_delete_file(): void
    {
        $challenge = $this->makeChallenge($this->owner);
        Storage::disk('cyber')->put("{$challenge->path_folder}/bukti.txt", 'konten');

        $this->actingAs($this->other)
            ->delete(route('challenges.deleteFile', $challenge), ['filename' => 'bukti.txt'])
            ->assertForbidden();

        Storage::disk('cyber')->assertExists("{$challenge->path_folder}/bukti.txt");
    }

    public function test_path_traversal_filename_cannot_delete_file_outside_folder(): void
    {
        $challenge = $this->makeChallenge($this->owner);
        Storage::disk('cyber')->put("{$challenge->path_folder}/bukti.txt", 'konten');
        Storage::disk('cyber')->put('rahasia.txt', 'rahasia');

        // Panggilan dengan traversal: basename() + whitelist harus mencegah target di luar folder challenge
        $this->actingAs($this->owner)
            ->delete(route('challenges.deleteFile', $challenge), ['filename' => '../rahasia.txt'])
            ->assertRedirect();

        Storage::disk('cyber')->assertExists('rahasia.txt');
        Storage::disk('cyber')->assertExists("{$challenge->path_folder}/bukti.txt");
    }

    public function test_writeup_file_cannot_be_deleted_via_endpoint(): void
    {
        $challenge = $this->makeChallenge($this->owner);
        Storage::disk('cyber')->put("{$challenge->path_folder}/writeup.txt", 'writeup');

        $this->actingAs($this->owner)
            ->delete(route('challenges.deleteFile', $challenge), ['filename' => 'writeup.txt'])
            ->assertRedirect();

        Storage::disk('cyber')->assertExists("{$challenge->path_folder}/writeup.txt");
    }

    public function test_invalid_filename_is_rejected(): void
    {
        $challenge = $this->makeChallenge($this->owner);

        $this->actingAs($this->owner)
            ->delete(route('challenges.deleteFile', $challenge), ['filename' => 'file dengan spasi!.pdf'])
            ->assertRedirect();
    }
}