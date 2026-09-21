<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class NoteAiImproveTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_RESPONSE = '{"title":"Recon AI","markdown":"# Recon\\n\\nHasil scan.","suggestions":["Tambahkan versi Nmap."]}';

    private User $user;
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->other = User::factory()->create();

        // Arahkan disk cyber ke direktori temp agar test tidak menyentuh vault asli.
        config()->set('filesystems.disks.cyber.root', storage_path('app/cyber-tests'));
        Storage::forgetDisk('cyber');
        File::deleteDirectory(storage_path('app/cyber-tests'));

        // Stray request (pola fake tidak match) = kegagalan test, bukan request nyata
        // ke Ollama lokal (127.0.0.1 dapat hidup/mati tergantung mesin).
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/cyber-tests'));
        parent::tearDown();
    }

    private function storeNote(string $title, string $content): Note
    {
        $this->actingAs($this->user)
            ->post(route('notes.store'), ['title' => $title, 'content' => $content])
            ->assertRedirect(route('notes.index', ['kind' => 'note']));

        return Note::where('slug', Str::slug($title))->firstOrFail();
    }

    // ------------------------------------------------------------------
    // Routing & authorization
    // ------------------------------------------------------------------

    public function test_improve_route_is_registered(): void
    {
        $this->assertTrue(Route::has('notes.ai.improve'));
    }

    public function test_guest_is_redirected_to_login(): void
    {
        Http::fake();

        $this->post(route('notes.ai.improve', 'any-id'))
            ->assertRedirect(route('login'));
    }

    public function test_other_user_cannot_improve_someone_elses_note(): void
    {
        $note = $this->storeNote('Note Rahasia', '<p>konten</p>');

        $this->actingAs($this->other)
            ->post(route('notes.ai.improve', $note->id))
            ->assertForbidden();
    }

    // ------------------------------------------------------------------
    // Endpoint success & validation
    // ------------------------------------------------------------------

    public function test_owner_can_improve_and_receives_structured_suggestion(): void
    {
        $note = $this->storeNote('Recon Box ' . uniqid(), '<h1>Recon</h1><p>Scanning.</p>');

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['model' => 'qwen3:1.7b', 'response' => self::VALID_RESPONSE, 'done' => true]),
        ]);

        $this->actingAs($this->user)
            ->post(route('notes.ai.improve', $note->id))
            ->assertOk()
            ->assertJsonPath('data.title', 'Recon AI')
            ->assertJsonPath('data.markdown', "# Recon\n\nHasil scan.")
            ->assertJsonPath('data.suggestions.0', 'Tambahkan versi Nmap.');
    }

    public function test_empty_note_rejected_with_validation_error(): void
    {
        $note = $this->storeNote('Kosong ' . uniqid(), '<p></p>');

        Http::fake();

        // postJson → kirim Accept: application/json, sehingga ValidationException
        // menghasilkan 422 JSON (sama seperti axios di frontend asli).
        $this->actingAs($this->user)
            ->postJson(route('notes.ai.improve', $note->id))
            ->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    public function test_improve_does_not_modify_database_or_docx(): void
    {
        $note = $this->storeNote('Tetap Aman ' . uniqid(), '<h1>Recon</h1><p>Scanning.</p>');
        $docxPath = Storage::disk('cyber')->path($note->path_folder . '/catatan.docx');
        $hashBefore = hash_file('sha256', $docxPath);

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['response' => self::VALID_RESPONSE]),
        ]);

        $this->actingAs($this->user)
            ->post(route('notes.ai.improve', $note->id))
            ->assertOk();

        // DB tidak berubah: content tetap literal 'DOCX', title sama.
        $fresh = $note->fresh();
        $this->assertSame('DOCX', $fresh->content);
        $this->assertSame($note->title, $fresh->title);

        // DOCX sebagai source-of-truth tidak tersentuh.
        $this->assertSame($hashBefore, hash_file('sha256', $docxPath));
    }

    // ------------------------------------------------------------------
    // Error handling yang aman (tidak membocorkan internal)
    // ------------------------------------------------------------------

    public function test_malformed_ai_response_returns_safe_502(): void
    {
        $note = $this->storeNote('Malformed ' . uniqid(), '<p>konten</p>');

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['response' => 'garbage tanpa json']),
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('notes.ai.improve', $note->id));

        $response->assertStatus(502);
        $response->assertJsonPath('message', 'The AI response could not be processed. Please try again.');

        $body = $response->getContent();
        $this->assertStringNotContainsString('stack', strtolower($body));
        $this->assertStringNotContainsString('AiServiceException', $body);
        $this->assertStringNotContainsString(storage_path(), $body);
        $this->assertStringNotContainsString('/home/', $body);
    }

    public function test_ollama_down_returns_safe_503(): void
    {
        $note = $this->storeNote('Down ' . uniqid(), '<p>konten</p>');

        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        $response = $this->actingAs($this->user)
            ->post(route('notes.ai.improve', $note->id));

        $response->assertStatus(503);
        $response->assertJsonPath('message', 'Local AI service is unavailable.');

        $body = $response->getContent();
        $this->assertStringNotContainsString('Connection refused', $body);
        $this->assertStringNotContainsString('stack', strtolower($body));
        $this->assertStringNotContainsString(storage_path(), $body);
    }

    public function test_model_not_found_returns_safe_message(): void
    {
        $note = $this->storeNote('Model ' . uniqid(), '<p>konten</p>');

        Http::fake([
            '127.0.0.1:11434/*' => Http::response(['error' => 'model not found'], 404),
        ]);

        $this->actingAs($this->user)
            ->post(route('notes.ai.improve', $note->id))
            ->assertStatus(503)
            ->assertJsonPath('message', 'Configured AI model is unavailable.');
    }
}