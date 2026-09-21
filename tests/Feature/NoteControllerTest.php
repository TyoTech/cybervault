<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class NoteControllerTest extends TestCase
{
    use RefreshDatabase;

    /** PNG 1x1 valid (magic bytes \x89PNG\r\n\x1a\n) — gambar A */
    private const PNG_A = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    /** PNG 2x2 valid — gambar B (beda dari A) */
    private const PNG_B = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8Dwn4GBgYGJAQALdQKB4uqNVwAAAABJRU5ErkJggg==';

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

    private function imagesIn(Note $note): array
    {
        return collect(Storage::disk('cyber')->files($note->path_folder))
            ->filter(fn (string $file) => str_starts_with(basename($file), 'img_'))
            ->values()
            ->all();
    }

    public function test_guest_cannot_create_note(): void
    {
        $this->post(route('notes.store'), ['title' => 'x', 'content' => '<p>x</p>'])
            ->assertRedirect(route('login'));
    }

    public function test_store_creates_folder_and_docx_file(): void
    {
        $title = 'Catatan Audit ' . uniqid();
        $note = $this->storeNote($title, '<p>isi catatan</p>');

        $this->assertSame('notes/' . Str::slug($title), $note->path_folder);
        $this->assertSame('DOCX', $note->content);
        $this->assertTrue(Storage::disk('cyber')->exists($note->path_folder . '/catatan.docx'));
        $this->assertSame([$note->path_folder . '/catatan.docx'], Storage::disk('cyber')->files($note->path_folder));
    }

    public function test_duplicate_title_is_rejected(): void
    {
        $title = 'Catatan Ganda';

        $this->storeNote($title, '<p>pertama</p>');

        $this->actingAs($this->user)
            ->post(route('notes.store'), ['title' => $title, 'content' => '<p>kedua</p>'])
            ->assertSessionHasErrors('title');

        $this->assertCount(1, Storage::disk('cyber')->directories('notes'));
    }

    public function test_store_with_valid_png_writes_image_inside_note_folder(): void
    {
        $note = $this->storeNote('Dokumen Gambar ' . uniqid(), '<p>dok</p><img src="data:image/png;base64,' . self::PNG_A . '" alt="gambar">');

        $images = $this->imagesIn($note);
        $this->assertCount(1, $images);
        $this->assertStringEndsWith('.png', $images[0]);
        $this->assertSame(base64_decode(self::PNG_A), Storage::disk('cyber')->get($images[0]));
    }

    public function test_image_mime_with_traversal_attempt_cannot_escape_note_folder(): void
    {
        $note = $this->storeNote('Traversal ' . uniqid(), '<p>x</p><img src="data:image/../../evil;base64,' . self::PNG_A . '">');

        // MIME mencurigakan → tag img dibuang, tidak ada file gambar ditulis.
        $this->assertSame([$note->path_folder . '/catatan.docx'], Storage::disk('cyber')->files($note->path_folder));
        $this->assertCount(1, Storage::disk('cyber')->allFiles());
        $this->assertCount(0, $this->imagesIn($note));
    }

    public function test_unknown_image_mime_is_dropped(): void
    {
        $note = $this->storeNote('Svg ' . uniqid(), '<p>x</p><img src="data:image/svg+xml;base64,' . base64_encode('<svg></svg>') . '">');

        $this->assertSame([$note->path_folder . '/catatan.docx'], Storage::disk('cyber')->files($note->path_folder));
        $this->assertCount(0, $this->imagesIn($note));
    }

    public function test_image_with_wrong_magic_bytes_is_dropped(): void
    {
        $note = $this->storeNote('Fake Png ' . uniqid(), '<p>x</p><img src="data:image/png;base64,' . base64_encode('ini bukan gambar') . '">');

        $this->assertSame([$note->path_folder . '/catatan.docx'], Storage::disk('cyber')->files($note->path_folder));
        $this->assertCount(0, $this->imagesIn($note));
    }

    public function test_show_reads_content_back_from_docx(): void
    {
        $note = $this->storeNote('Roundtrip ' . uniqid(), '<p>Halo <strong>dunia</strong>!</p>');

        $response = $this->actingAs($this->user)->get(route('notes.show', $note));
        $response->assertOk();

        $page = $response->viewData('page');
        $content = $page['props']['note']['content'] ?? '';
        $this->assertStringContainsString('Halo', $content);
        $this->assertStringContainsString('dunia', $content);
    }

    public function test_update_replaces_content_in_docx(): void
    {
        $note = $this->storeNote('Update ' . uniqid(), '<p>Versi satu</p>');

        $this->actingAs($this->user)
            ->patch(route('notes.update', $note), ['title' => $note->title, 'content' => '<p>Versi dua</p>'])
            ->assertRedirect(route('notes.show', $note->id));

        $response = $this->actingAs($this->user)->get(route('notes.show', $note));
        $content = $response->viewData('page')['props']['note']['content'] ?? '';
        $this->assertStringContainsString('Versi dua', $content);
        $this->assertStringNotContainsString('Versi satu', $content);
    }

    public function test_update_removes_orphan_image_and_keeps_new_one(): void
    {
        $note = $this->storeNote('Orphan ' . uniqid(), '<p>versi A</p><img src="data:image/png;base64,' . self::PNG_A . '">');

        $imagesA = $this->imagesIn($note);
        $this->assertCount(1, $imagesA);
        $oldBasename = basename($imagesA[0]);

        // Update: gambar diganti menjadi B (nama baru via uniqid).
        $this->actingAs($this->user)
            ->patch(route('notes.update', $note), ['title' => $note->title, 'content' => '<p>versi B</p><img src="data:image/png;base64,' . self::PNG_B . '">'])
            ->assertRedirect(route('notes.show', $note->id));

        $imagesB = $this->imagesIn($note);
        $this->assertCount(1, $imagesB);
        $this->assertNotSame($oldBasename, basename($imagesB[0]));
        $this->assertFalse(Storage::disk('cyber')->exists($note->path_folder . '/' . $oldBasename));
        $this->assertSame(base64_decode(self::PNG_B), Storage::disk('cyber')->get($imagesB[0]));
    }

    public function test_update_without_images_removes_all_images(): void
    {
        $note = $this->storeNote('Hapus Gambar ' . uniqid(), '<p>dengan gambar</p><img src="data:image/png;base64,' . self::PNG_A . '">');

        $this->assertCount(1, $this->imagesIn($note));

        $this->actingAs($this->user)
            ->patch(route('notes.update', $note), ['title' => $note->title, 'content' => '<p>tanpa gambar</p>'])
            ->assertRedirect(route('notes.show', $note->id));

        $this->assertCount(0, $this->imagesIn($note));
        $this->assertSame([$note->path_folder . '/catatan.docx'], Storage::disk('cyber')->files($note->path_folder));
    }

    public function test_destroy_deletes_folder_and_row(): void
    {
        $note = $this->storeNote('Hapus Note ' . uniqid(), '<p>isi</p>');

        $this->actingAs($this->user)
            ->delete(route('notes.destroy', $note))
            ->assertRedirect(route('notes.index'));

        $this->assertDatabaseMissing('notes', ['id' => $note->id]);
        $this->assertFalse(Storage::disk('cyber')->exists($note->path_folder));
    }

    public function test_notes_image_route_is_no_longer_registered(): void
    {
        $this->assertFalse(Route::has('notes.image'));
    }
}