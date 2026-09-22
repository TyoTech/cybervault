<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use App\Services\WriteupContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Test fitur Writeup (kind=writeup): structured content tersimpan di
 * content_json, DOCX tetap digenerate, halaman show/edit memakai view
 * Writeups, dan data lama (kind=note) tidak terpengaruh.
 */
class WriteupNoteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        config()->set('filesystems.disks.cyber.root', storage_path('app/cyber-tests'));
        Storage::forgetDisk('cyber');
        File::deleteDirectory(storage_path('app/cyber-tests'));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/cyber-tests'));
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function sampleWriteup(): array
    {
        return [
            'goal' => 'Menganalisis apakah endpoint /api/users rentan IDOR.',
            'scope' => "Target: lab.local\nEnvironment: lab\nTools: curl, burp",
            'hypotheses' => [
                ['text' => 'Endpoint mungkin rentan IDOR.', 'status' => 'unverified'],
            ],
            'steps' => [
                [
                    'title' => 'Recon endpoint',
                    'objective' => 'Mengetahui response baseline.',
                    'approach' => 'Request normal.',
                    'command' => 'curl -i https://lab.local/api/users/1',
                    'output' => 'HTTP/1.1 200 OK',
                    'result' => 'Endpoint mengembalikan HTTP 200.',
                    'interpretation' => 'Baseline normal.',
                ],
                [
                    'title' => 'Ubah id',
                    'objective' => 'Uji IDOR.',
                    'approach' => 'Ganti id ke 2.',
                    'command' => 'curl -i https://lab.local/api/users/2',
                    'output' => 'HTTP/1.1 403',
                    'result' => 'Akses ditolak.',
                    'interpretation' => 'Authorization check ada.',
                ],
            ],
            'attempts' => [
                [
                    'hypothesis' => 'Parameter id mungkin SQLi.',
                    'approach' => 'Inject payload sederhana.',
                    'command' => "curl 'https://lab.local/api/users/1\'",
                    'expected' => 'Database error.',
                    'actual' => 'HTTP 200 normal.',
                    'error' => '',
                    'status' => 'failed',
                    'lesson' => 'Belum ada evidence SQLi; lanjut ke parameter lain.',
                ],
            ],
            'evidence' => [
                ['type' => 'response', 'label' => 'GET /api/users/2', 'content' => 'HTTP/1.1 403 Forbidden'],
            ],
            'interpretation' => 'IDOR tidak terbukti.',
            'risk_impact' => 'Rendah.',
            'recommendations' => 'Pertahankan authorization check per-object.',
            'strategy_changes' => 'Berpindah dari SQLi ke access control testing.',
            'lesson_learned' => [
                'learned' => 'Response behavior lebih informatif dari status code saja.',
                'patterns' => 'Endpoint dengan response berbeda per parameter.',
                'mistakes' => 'Terlalu cepat menyimpulkan vulnerability.',
                'revisit' => 'Perbedaan error-based evidence vs proof of exploitability.',
                'relevance' => 'Membantu identifikasi access-control boundary.',
            ],
        ];
    }

    private function storeWriteup(string $title = 'IDOR Analysis'): Note
    {
        $this->actingAs($this->user)->post(route('notes.store'), [
            'title' => $title,
            'kind' => 'writeup',
            'writeup' => $this->sampleWriteup(),
        ])->assertRedirect(route('notes.index', ['kind' => 'writeup']));

        return Note::where('slug', Str::slug($title))->firstOrFail();
    }

    public function test_store_writeup_saves_structured_content_and_generates_docx(): void
    {
        $note = $this->storeWriteup();

        $this->assertSame('writeup', $note->kind);
        $this->assertSame('IDOR Analysis', $note->title);
        $this->assertSame('Menganalisis apakah endpoint /api/users rentan IDOR.', $note->content_json['goal']);
        $this->assertCount(2, $note->content_json['steps']);
        $this->assertCount(1, $note->content_json['attempts']);
        $this->assertSame('failed', $note->content_json['attempts'][0]['status']);
        $this->assertSame('unverified', $note->content_json['hypotheses'][0]['status']);

        // DOCX tetap ditulis sebagai artifact readable.
        Storage::disk('cyber')->assertExists($note->path_folder . '/catatan.docx');
    }

    public function test_store_writeup_rejects_empty_content(): void
    {
        $this->actingAs($this->user)->post(route('notes.store'), [
            'title' => 'Kosong',
            'kind' => 'writeup',
            'writeup' => ['goal' => ''],
        ])->assertSessionHasErrors('writeup');

        $this->assertDatabaseMissing('notes', ['title' => 'Kosong']);
    }

    public function test_writeup_show_and_edit_use_writeup_views(): void
    {
        $note = $this->storeWriteup('Show Writeup');

        $this->actingAs($this->user)->get(route('notes.show', $note->id))
            ->assertOk();

        $this->actingAs($this->user)->get(route('notes.edit', $note->id))
            ->assertOk();
    }

    public function test_update_writeup_persists_changes_and_rewrites_docx(): void
    {
        $note = $this->storeWriteup('Update Writeup');

        $updated = $this->sampleWriteup();
        $updated['goal'] = 'Tujuan yang direvisi.';
        $updated['attempts'][0]['status'] = 'successful';

        $this->actingAs($this->user)->put(route('notes.update', $note->id), [
            'title' => 'Update Writeup',
            'writeup' => $updated,
        ])->assertRedirect(route('notes.show', $note->id));

        $note->refresh();
        $this->assertSame('Tujuan yang direvisi.', $note->content_json['goal']);
        $this->assertSame('successful', $note->content_json['attempts'][0]['status']);
    }

    public function test_notes_index_filters_by_kind(): void
    {
        $this->storeWriteup('Writeup Terfilter');

        $this->actingAs($this->user)->post(route('notes.store'), [
            'title' => 'Catatan Biasa',
            'content' => '<p>isi</p>',
        ])->assertRedirect(route('notes.index', ['kind' => 'note']));

        $this->assertSame(1, Note::where('kind', 'writeup')->count());
        $this->assertSame(1, Note::where('kind', 'note')->count());
    }

    public function test_existing_note_flow_is_not_affected(): void
    {
        // kind default 'note' untuk request lama tanpa parameter kind.
        $this->actingAs($this->user)->post(route('notes.store'), [
            'title' => 'Note Lama',
            'content' => '<p>konten lama</p>',
        ]);

        $note = Note::where('slug', 'note-lama')->firstOrFail();
        $this->assertSame('note', $note->kind);
        $this->assertNull($note->content_json);

        $this->actingAs($this->user)->get(route('notes.show', $note->id))->assertOk();
    }

    public function test_writeup_normalization_drops_unknown_keys_and_empty_items(): void
    {
        $data = $this->sampleWriteup();
        $data['evil_key'] = 'not allowed';
        $data['steps'][] = ['title' => '', 'objective' => '', 'approach' => '', 'command' => '', 'output' => '', 'result' => '', 'interpretation' => ''];

        $content = WriteupContent::fromArray($data);

        $this->assertArrayNotHasKey('evil_key', $content->data);
        $this->assertCount(2, $content->data['steps']); // item kosong dibuang
        $this->assertNotFalse(strpos($content->toHtml(), 'Langkah Analisis'));
    }

    public function test_writeup_cannot_be_accessed_by_other_user(): void
    {
        $note = $this->storeWriteup('Private Writeup');
        $other = User::factory()->create();

        $this->actingAs($other)->get(route('notes.show', $note->id))->assertForbidden();
        $this->actingAs($other)->get(route('notes.edit', $note->id))->assertForbidden();
    }
}
