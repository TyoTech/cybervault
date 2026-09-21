<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use App\Services\NoteContentExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class NoteAiContentTest extends TestCase
{
    use RefreshDatabase;

    /** PNG 1x1 valid. */
    private const PNG_A = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // Arahkan disk cyber ke direktori temp agar test tidak menyentuh vault asli.
        config()->set('filesystems.disks.cyber.root', storage_path('app/cyber-tests'));
        Storage::forgetDisk('cyber');
        File::deleteDirectory(storage_path('app/cyber-tests'));
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

    public function test_get_ai_content_extracts_from_docx_source_of_truth(): void
    {
        $note = $this->storeNote(
            'Recon AI ' . uniqid(),
            '<h1>Recon</h1><p>Scanning <strong>Nmap</strong> dan <em>nuclei</em>.</p><h2>Result</h2><p>Port 22 terbuka.</p>'
        );

        $content = app(NoteContentExtractor::class)->getAiContent($note);

        $this->assertSame($note->title, $content->title);

        // Heading bertahan pada roundtrip DOCX -> HTML (terverifikasi).
        $this->assertStringContainsString('# Recon', $content->markdown);
        $this->assertStringContainsString('## Result', $content->markdown);

        // Isi teks ada di plain text dan markdown.
        $this->assertStringContainsString('Scanning', $content->plainText);
        $this->assertStringContainsString('Nmap', $content->markdown);
        $this->assertStringContainsString('Port 22 terbuka', $content->plainText);

        // DOCX tetap source-of-truth dan tidak diubah oleh ekstraksi.
        $this->assertSame('DOCX', $note->fresh()->content);
        $this->assertTrue(Storage::disk('cyber')->exists($note->path_folder . '/catatan.docx'));
    }

    public function test_get_ai_content_never_leaks_image_or_path_from_docx(): void
    {
        $note = $this->storeNote(
            'Gambar AI ' . uniqid(),
            '<p>diagram:</p><img src="data:image/png;base64,' . self::PNG_A . '" alt="vault">'
        );

        $content = app(NoteContentExtractor::class)->getAiContent($note);
        $combined = $content->plainText . "\n" . $content->markdown;

        // Data URI base64 (dari roundtrip DOCX) tidak pernah bocor.
        $this->assertStringNotContainsString('data:image', $combined);
        $this->assertStringNotContainsString('base64', $combined);
        $this->assertStringNotContainsString(self::PNG_A, $combined);

        // Path storage internal tidak bocor.
        $this->assertStringNotContainsString('storage/app', $combined);
        $this->assertStringNotContainsString(storage_path(), $combined);

        // Teks note tetap ada.
        $this->assertStringContainsString('diagram', $combined);

        // Roundtrip DOCX -> HTML menghasilkan bentuk literal "img border=...";
        // extractor wajib menggantinya dengan placeholder, bukan membocorkannya.
        $this->assertStringContainsString('[Image]', $combined);
    }
}