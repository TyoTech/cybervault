<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\Note;
use App\Models\Tool;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SearchControllerTest extends TestCase
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

    public function test_search_returns_notes_challenges_and_tools_for_owner_only(): void
    {
        Note::create([
            'user_id' => $this->owner->id,
            'title' => 'SQL Injection Notes',
            'slug' => 'sql-notes-' . uniqid(),
            'content' => 'DOCX',
            'path_folder' => 'notes/sql-notes',
        ]);
        Note::create([
            'user_id' => $this->other->id,
            'title' => 'SQL Injection Notes Milik Orang Lain',
            'slug' => 'sql-notes-lain-' . uniqid(),
            'content' => 'DOCX',
            'path_folder' => 'notes/sql-notes-lain',
        ]);

        Challenge::create([
            'user_id' => $this->owner->id,
            'lab' => 'LabX',
            'kategori' => 'Web',
            'judul' => 'SQL Injection Challenge',
            'path_folder' => 'lab/LabX/Web/sqli-chal',
        ]);

        Tool::create([
            'user_id' => $this->owner->id,
            'name' => 'sqlmap',
            'workflow' => 'Web',
            'commands' => [['desc' => 'x', 'code' => 'sqlmap -u']],
        ]);

        $response = $this->actingAs($this->owner)
            ->getJson(route('search') . '?q=SQL')
            ->assertOk();

        $titles = array_column($response->json(), 'title');

        $this->assertContains('SQL Injection Notes', $titles);
        // Challenge dicari lewat kolom `judul` (bukan `title`)
        $this->assertContains('SQL Injection Challenge', $titles);
        $this->assertContains('sqlmap', $titles);
        // Scoping per user: note milik user lain tidak muncul
        $this->assertNotContains('SQL Injection Notes Milik Orang Lain', $titles);
    }

    public function test_search_payload_uses_file_based_source_of_truth(): void
    {
        Storage::disk('cyber')->put('payloads/SQLi.txt', implode("\n", [
            'ID: abc123',
            'Judul: Union Based SQLi',
            'Deskripsi: Test',
            'Payload:',
            "1' UNION SELECT 1-- -",
            '--- END ---',
            '',
        ]));

        $response = $this->actingAs($this->owner)
            ->getJson(route('search') . '?q=Union')
            ->assertOk();

        $payload = collect($response->json())->firstWhere('type', 'payload');

        $this->assertNotNull($payload);
        $this->assertEquals('Union Based SQLi', $payload['title']);
    }

    public function test_search_requires_query(): void
    {
        $this->actingAs($this->owner)
            ->getJson(route('search'))
            ->assertOk()
            ->assertExactJson([]);
    }
}