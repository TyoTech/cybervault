<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChallengeWriteupTest extends TestCase
{
    use RefreshDatabase;

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

    private function storeWriteup(array $writeup): Challenge
    {
        $this->actingAs($this->user)
            ->post(route('challenges.store'), [
                'lab' => 'LabT',
                'kategori' => 'Web',
                'judul' => 'Challenge ' . uniqid(),
                'writeup' => $writeup,
            ])
            ->assertRedirect();

        return Challenge::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }

    private function jsonPath(Challenge $challenge): string
    {
        return $challenge->path_folder . '/writeup.json';
    }

    private function txtPath(Challenge $challenge): string
    {
        return $challenge->path_folder . '/writeup.txt';
    }

    public function test_store_creates_writeup_json_and_txt_artifacts(): void
    {
        $challenge = $this->storeWriteup([
            'goal' => ['problem' => 'Masalah X', 'objective' => 'Buktikan Y'],
            'notes' => 'Catatan bebas',
        ]);

        $this->assertTrue(Storage::disk('cyber')->exists($this->jsonPath($challenge)));
        $this->assertTrue(Storage::disk('cyber')->exists($this->txtPath($challenge)));

        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);
        $this->assertSame('Masalah X', $json['goal']['problem']);
        $this->assertSame('Catatan bebas', $json['notes']);

        $txt = (string) Storage::disk('cyber')->get($this->txtPath($challenge));
        $this->assertStringContainsString("## 1. Tujuan", $txt);
    }

    public function test_legacy_konten_writeup_stored_into_notes(): void
    {
        $this->actingAs($this->user)
            ->post(route('challenges.store'), [
                'lab' => 'LabT',
                'kategori' => 'Web',
                'judul' => 'Legacy ' . uniqid(),
                'konten_writeup' => "Ini writeup lama plain text.",
            ])
            ->assertRedirect();

        $challenge = Challenge::where('user_id', $this->user->id)->latest('id')->firstOrFail();
        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);
        $this->assertSame('Ini writeup lama plain text.', $json['notes']);
    }

    public function test_show_sends_structured_writeup_data(): void
    {
        $challenge = $this->storeWriteup([
            'goal' => ['problem' => 'Masalah Z', 'objective' => '', 'proof' => ''],
            'hypotheses' => [
                ['id' => 'h1', 'text' => 'SQLi di id', 'status' => 'hypothesis'],
            ],
            'steps' => [
                ['id' => 's1', 'title' => 'Enum', 'type' => 'test', 'command' => 'nmap -sV'],
            ],
        ]);

        $response = $this->actingAs($this->user)->get(route('challenges.show', $challenge));
        $response->assertOk();

        $page = $response->viewData('page');
        $writeup = $page['props']['challenge']['writeup_data'] ?? [];
        $this->assertSame('Masalah Z', $writeup['goal']['problem']);
        $this->assertSame('SQLi di id', $writeup['hypotheses'][0]['text']);
        $this->assertSame('nmap -sV', $writeup['steps'][0]['command']);

        // writeup.txt lama yang diregenerasi juga ikut dikirim (backward compat).
        $this->assertIsString($page['props']['challenge']['writeup_markdown'] ?? null);
    }

    public function test_normalize_whitelists_keys_and_strips_unknown(): void
    {
        $challenge = $this->storeWriteup([
            'goal' => ['problem' => 'P', 'objective' => '', 'proof' => '', 'evil' => 'tidak boleh'],
            'evilRoot' => 'tidak boleh',
            'notes' => 'catatan',
            'hypotheses' => [
                // item tanpa isi dibuang
                ['id' => 'empty', 'text' => '', 'status' => 'hypothesis'],
            ],
        ]);

        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);

        $this->assertArrayNotHasKey('evilRoot', $json);
        $this->assertArrayNotHasKey('evil', $json['goal']);
        $this->assertSame(['problem', 'objective', 'proof'], array_keys($json['goal']));
        $this->assertSame([], $json['hypotheses']);
    }

    public function test_item_without_content_is_dropped(): void
    {
        $challenge = $this->storeWriteup([
            'recommendations' => [
                ['id' => 'r1', 'text' => 'Fix auth'],
                ['id' => 'r2', 'text' => '   '],
            ],
            'strategyChanges' => [],
        ]);

        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);
        $this->assertCount(1, $json['recommendations']);
        $this->assertSame('Fix auth', $json['recommendations'][0]['text']);
    }

    public function test_legacy_writeup_txt_is_read_only_migrated_to_notes(): void
    {
        // Simulasikan data lama: hanya writeup.txt, belum ada writeup.json.
        $challenge = Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabT',
            'kategori' => 'Web',
            'judul' => 'Migrasi ' . uniqid(),
            'path_folder' => 'lab/LabT/Web/migrasi-' . uniqid(),
        ]);
        Storage::disk('cyber')->put($this->txtPath($challenge), "Legacy content lama.");

        $response = $this->actingAs($this->user)->get(route('challenges.show', $challenge));
        $response->assertOk();

        $writeup = $response->viewData('page')['props']['challenge']['writeup_data'] ?? [];
        $this->assertSame('Legacy content lama.', $writeup['notes']);

        // READ-ONLY: selama belum ada Save, writeup.json belum dibuat.
        $this->assertFalse(Storage::disk('cyber')->exists($this->jsonPath($challenge)));
    }

    public function test_update_persists_writeup_and_regenerates_txt(): void
    {
        $challenge = $this->storeWriteup(['notes' => 'versi satu']);

        $this->actingAs($this->user)
            ->put(route('challenges.update', $challenge), [
                'lab' => 'LabT',
                'kategori' => 'Web',
                'judul' => $challenge->judul,
                'writeup' => [
                    'goal' => ['problem' => 'Updated', 'objective' => '', 'proof' => ''],
                    'notes' => 'versi dua',
                ],
            ])
            ->assertRedirect(route('challenges.show', $challenge->id));

        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);
        $this->assertSame('Updated', $json['goal']['problem']);
        $this->assertSame('versi dua', $json['notes']);
        $this->assertArrayHasKey('updated_at_iso', $json);

        $txt = (string) Storage::disk('cyber')->get($this->txtPath($challenge));
        $this->assertStringContainsString('versi dua', $txt);
    }

    public function test_show_render_markdown_for_ai_input(): void
    {
        $challenge = $this->storeWriteup([
            'riskImpact' => 'Risk sedang',
        ]);

        $page = $this->actingAs($this->user)->get(route('challenges.show', $challenge))
            ->assertOk()
            ->viewData('page');

        $this->assertStringContainsString('Risk sedang', $page['props']['challenge']['writeup_markdown']);
    }

    public function test_store_rejects_path_traversal_in_folder_segments(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('challenges.store'), [
                'lab' => '../..',
                'kategori' => 'Web',
                'judul' => 'X',
                'writeup' => [],
            ]);

        $response->assertSessionHasErrors('lab');

        // Tidak ada row challenge yang dibuat dari input traversal.
        $this->assertCount(0, Challenge::all());
    }

    public function test_store_rejects_backslash_or_slash_in_segments(): void
    {
        $this->actingAs($this->user)
            ->post(route('challenges.store'), [
                'lab' => 'a/b',
                'kategori' => 'Web',
                'judul' => 'X',
                'writeup' => [],
            ])
            ->assertSessionHasErrors('lab');

        $this->actingAs($this->user)
            ->post(route('challenges.store'), [
                'lab' => 'Lab',
                'kategori' => 'C:\\evil',
                'judul' => 'X',
                'writeup' => [],
            ])
            ->assertSessionHasErrors('kategori');

        $this->assertCount(0, Challenge::all());
    }

    public function test_update_rejects_path_traversal_renaming(): void
    {
        $challenge = $this->storeWriteup(['notes' => 'asli']);

        $this->actingAs($this->user)
            ->put(route('challenges.update', $challenge), [
                'lab' => 'LabBaru',
                'kategori' => 'Web',
                'judul' => '../evil',
                'writeup' => [],
            ])
            ->assertSessionHasErrors('judul');

        $challenge->refresh();
        $this->assertSame('LabT', $challenge->lab);
        $this->assertStringContainsString('LabT', $challenge->path_folder);
    }

    public function test_check_title_endpoint_rejects_traversal(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('api.title.check'), [
                'lab' => '..',
                'kategori' => '..',
                'judul' => 'x',
            ])
            ->assertStatus(422);
    }

    public function test_categories_endpoint_rejects_traversal(): void
    {
        // "%2E%2E" ter-decode menjadi ".." oleh router — harus ditolak 422.
        $this->actingAs($this->user)
            ->getJson(route('api.categories', ['lab' => '%2E%2E']))
            ->assertStatus(422);
    }

    public function test_check_category_endpoint_rejects_traversal(): void
    {
        $this->actingAs($this->user)
            ->getJson(route('api.categories.check', ['lab' => '..', 'category' => 'Web']))
            ->assertStatus(422);

        $this->actingAs($this->user)
            ->getJson(route('api.categories.check', ['lab' => 'Lab', 'category' => '%2E%2E']))
            ->assertStatus(422);
    }

    public function test_evidence_kind_lainya_roundtrips(): void
    {
        $challenge = $this->storeWriteup([
            'evidence' => [
                ['id' => 'ev1', 'label' => 'Tangkapan', 'kind' => 'lainya', 'content' => 'isi bukti'],
            ],
        ]);

        $json = json_decode((string) Storage::disk('cyber')->get($this->jsonPath($challenge)), true);
        $this->assertSame('lainya', $json['evidence'][0]['kind']);
    }
}