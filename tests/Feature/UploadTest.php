<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_upload(): void
    {
        Storage::fake('public');

        $this->post(route('upload'), [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ])->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_upload_single_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('upload'), [
            'file' => UploadedFile::fake()->image('photo.jpg'),
        ]);

        $response->assertOk();

        // API contract tetap: { url, name }
        $response->assertJsonStructure(['url', 'name']);

        // URL mengarah ke attachments
        $this->assertStringContainsString('/storage/attachments/', $response->json('url'));

        // Hanya satu file tersimpan di attachments — double-store sudah dihapus
        $this->assertCount(1, Storage::disk('public')->files('attachments'));
        Storage::disk('public')->assertMissing('uploads');
    }

    public function test_upload_requires_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('upload'))
            ->assertUnprocessable();
    }
}