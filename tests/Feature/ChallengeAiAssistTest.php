<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChallengeAiAssistTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_RESPONSE = '{"title":"Writeup Lebih Baik","markdown":"# Analisis\\n\\nHasil.","suggestions":[{"category":"clarity","text":"Tambahkan versi Nmap."}]}';

    private User $user;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->other = User::factory()->create();

        config()->set('filesystems.disks.cyber.root', storage_path('app/cyber-tests'));
        Storage::forgetDisk('cyber');
        File::deleteDirectory(storage_path('app/cyber-tests'));

        // Stray request = kegagalan test, bukan request nyata ke Ollama lokal.
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/cyber-tests'));
        parent::tearDown();
    }

    private function makeChallengeWithWriteup(): Challenge
    {
        $challenge = Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabT',
            'kategori' => 'Web',
            'judul' => 'Writeup ' . uniqid(),
            'path_folder' => 'lab/LabT/Web/writeup-' . uniqid(),
        ]);

        Storage::disk('cyber')->put(
            $challenge->path_folder . '/writeup.txt',
            "## 1. Tujuan\n**Masalah yang dianalisis:** Endpoint debug terbuka.\n\n## Catatan\nRekap awal.\n"
        );

        return $challenge;
    }

    private function makeEmptyChallenge(): Challenge
    {
        return Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabT',
            'kategori' => 'Web',
            'judul' => 'Kosong ' . uniqid(),
            'path_folder' => 'lab/LabT/Web/kosong-' . uniqid(),
        ]);
    }

    // ------------------------------------------------------------------
    // Routing & authorization
    // ------------------------------------------------------------------

    public function test_assist_route_is_registered(): void
    {
        $this->assertTrue(Route::has('challenges.ai.assist'));
    }

    public function test_guest_is_redirected_to_login(): void
    {
        Http::fake();

        $this->post(route('challenges.ai.assist', 'any-id'))
            ->assertRedirect(route('login'));
    }

    public function test_other_user_cannot_assist_someone_elses_writeup(): void
    {
        $challenge = $this->makeChallengeWithWriteup();

        $this->actingAs($this->other)
            ->post(route('challenges.ai.assist', $challenge->id))
            ->assertForbidden();
    }

    // ------------------------------------------------------------------
    // Endpoint success & validation
    // ------------------------------------------------------------------

    public function test_owner_can_assist_and_receives_structured_suggestion(): void
    {
        $challenge = $this->makeChallengeWithWriteup();

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['model' => 'qwen3:1.7b', 'response' => self::VALID_RESPONSE, 'done' => true]),
        ]);

        $this->actingAs($this->user)
            ->post(route('challenges.ai.assist', $challenge->id))
            ->assertOk()
            ->assertJsonPath('data.title', 'Writeup Lebih Baik')
            ->assertJsonPath('data.markdown', "# Analisis\n\nHasil.")
            ->assertJsonPath('data.suggestions.0.category', 'clarity')
            ->assertJsonPath('data.note', 'AI suggestion / requires verification');
    }

    public function test_empty_writeup_rejected_with_validation_error(): void
    {
        $challenge = $this->makeEmptyChallenge();

        Http::fake();

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist', $challenge->id))
            ->assertStatus(422)
            ->assertJsonValidationErrors('writeup');
    }

    public function test_assist_does_not_modify_files_on_disk(): void
    {
        $challenge = $this->makeChallengeWithWriteup();
        $jsonPath = $challenge->path_folder . '/writeup.json';
        $txtPath = $challenge->path_folder . '/writeup.txt';

        // writeup.json sudah ada sebagai source-of-truth.
        Storage::disk('cyber')->put($jsonPath, json_encode(['version' => 1, 'notes' => 'isi']));
        $txtBefore = (string) Storage::disk('cyber')->get($txtPath);
        $jsonBefore = (string) Storage::disk('cyber')->get($jsonPath);

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['response' => self::VALID_RESPONSE]),
        ]);

        $this->actingAs($this->user)
            ->post(route('challenges.ai.assist', $challenge->id))
            ->assertOk();

        // READ-ONLY: AI assist tidak menulis apa pun ke disk.
        $this->assertSame($jsonBefore, (string) Storage::disk('cyber')->get($jsonPath));
        $this->assertSame($txtBefore, (string) Storage::disk('cyber')->get($txtPath));
        $this->assertStringNotContainsString('# Analisis', (string) Storage::disk('cyber')->get($txtPath));
        $json = json_decode((string) Storage::disk('cyber')->get($jsonPath), true);
        $this->assertSame('isi', $json['notes']);
    }

    // ------------------------------------------------------------------
    // Error handling yang aman (tidak membocorkan internal)
    // ------------------------------------------------------------------

    public function test_malformed_ai_response_returns_safe_502(): void
    {
        $challenge = $this->makeChallengeWithWriteup();

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['response' => 'garbage tanpa json']),
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('challenges.ai.assist', $challenge->id));

        $response->assertStatus(502);
        $response->assertJsonPath('message', 'The AI response could not be processed. Please try again.');

        $body = $response->getContent();
        $this->assertStringNotContainsString('stack', strtolower($body));
        $this->assertStringNotContainsString('AiServiceException', $body);
        $this->assertStringNotContainsString(storage_path(), $body);
    }

    public function test_ollama_down_returns_safe_503(): void
    {
        $challenge = $this->makeChallengeWithWriteup();

        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        $response = $this->actingAs($this->user)
            ->post(route('challenges.ai.assist', $challenge->id));

        $response->assertStatus(503);
        $response->assertJsonPath('message', 'Local AI service is unavailable.');

        $body = $response->getContent();
        $this->assertStringNotContainsString('Connection refused', $body);
        $this->assertStringNotContainsString('stack', strtolower($body));
        $this->assertStringNotContainsString(storage_path(), $body);
    }

    public function test_model_not_found_returns_safe_message(): void
    {
        $challenge = $this->makeChallengeWithWriteup();

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['error' => 'model not found'], 404),
        ]);

        $this->actingAs($this->user)
            ->post(route('challenges.ai.assist', $challenge->id))
            ->assertStatus(503)
            ->assertJsonPath('message', 'Configured AI model is unavailable.');
    }
}