<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChallengeExportTest extends TestCase
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

    private function createChallenge(array $writeup, ?User $owner = null): Challenge
    {
        $owner ??= $this->user;

        $challenge = Challenge::create([
            'user_id' => $owner->id,
            'lab' => 'LabExp',
            'kategori' => 'Web',
            'judul' => 'Export Challenge',
            'path_folder' => 'lab/LabExp/Web/export-' . uniqid(),
        ]);

        Storage::disk('cyber')->put(
            $challenge->path_folder . '/writeup.json',
            (string) json_encode($writeup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        return $challenge;
    }

    private function writeupWithQuestions(): array
    {
        return [
            'goal' => ['problem' => 'Masalah Y', 'objective' => 'Buktikan Z', 'proof' => ''],
            'environment' => ['target' => 'lab.local', 'environment' => 'local', 'host' => '', 'application' => '', 'os' => '', 'tools' => '', 'scope' => ''],
            'hypotheses' => [],
            'steps' => [
                ['id' => 's1', 'title' => 'Scan', 'question' => 'Apa port terbuka?', 'goal' => '', 'approach' => 'nmap', 'command' => 'nmap -sV lab.local', 'output' => '80/tcp open http', 'result' => 'port 80', 'interpretation' => '', 'type' => 'test'],
            ],
            'experiments' => [],
            'evidence' => [
                ['id' => 'e1', 'label' => 'Bukti', 'kind' => 'command', 'content' => 'curl -v http://lab.local'],
            ],
            'strategyChanges' => [],
            'riskImpact' => '',
            'recommendations' => [],
            'lessonLearned' => ['learned' => 'Belajar nmap', 'patterns' => '', 'mistakes' => '', 'concepts' => '', 'different' => '', 'relevance' => ''],
            'references' => 'https://example.org',
            'notes' => 'Catatan akhir.',
            'questions' => [
                [
                    'id' => 'q1',
                    'order' => 1,
                    'question' => 'Temukan flag di port 80',
                    'notes' => 'Fokus pada service http.',
                    'status' => 'solved',
                    'result' => 'FLAG{test-export}',
                    'steps' => [],
                    'evidence' => [],
                ],
            ],
        ];
    }

    public function test_export_json_is_canonical_and_preserves_source(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());
        $jsonPath = $challenge->path_folder . '/writeup.json';
        $before = Storage::disk('cyber')->get($jsonPath);

        $response = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'json']))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/json; charset=utf-8');

        $payload = json_decode($response->streamedContent(), true);
        $this->assertSame('Catatan akhir.', $payload['notes']);
        $this->assertSame('Temukan flag di port 80', $payload['questions'][0]['question']);
        $this->assertSame('FLAG{test-export}', $payload['questions'][0]['result']);

        // Export tidak mengubah source-of-truth.
        $this->assertSame($before, Storage::disk('cyber')->get($jsonPath));
    }

    public function test_export_markdown_contains_questions_and_title(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());

        $content = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'md']))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/markdown; charset=utf-8')
            ->streamedContent();

        $this->assertStringContainsString('# Export Challenge', $content);
        $this->assertStringContainsString('## Questions / Objectives', $content);
        $this->assertStringContainsString('Temukan flag di port 80 [SOLVED]', $content);
        $this->assertStringContainsString('FLAG{test-export}', $content);
        $this->assertStringContainsString('nmap -sV lab.local', $content);
    }

    public function test_export_txt_is_plain_text_without_markdown_symbols(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());

        $content = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'txt']))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8')
            ->streamedContent();

        $this->assertStringNotContainsString('##', $content);
        $this->assertStringNotContainsString('**', $content);
        $this->assertStringNotContainsString('```', $content);
        $this->assertStringContainsString('Temukan flag di port 80 [SOLVED]', $content);
        $this->assertStringContainsString('curl -v http://lab.local', $content);
        $this->assertStringContainsString('Export Challenge', $content);
    }

    public function test_export_docx_returns_docx_bytes_without_writing_files(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());
        $folderFilesBefore = Storage::disk('cyber')->files($challenge->path_folder);

        $response = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'docx']))
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );

        $this->assertGreaterThan(0, strlen((string) $response->streamedContent()));

        // Tidak menulis file baru ke folder challenge (read-only export).
        $this->assertSame($folderFilesBefore, Storage::disk('cyber')->files($challenge->path_folder));
    }

    public function test_export_pdf_returns_pdf_bytes_without_writing_files(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());
        $folderFilesBefore = Storage::disk('cyber')->files($challenge->path_folder);

        // DomPDF memerlukan config paper/url base di beberapa env; pastikan tidak menulis apa pun.
        $response = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'pdf']))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $content = (string) $response->streamedContent();
        $this->assertStringStartsWith('%PDF', $content);
        $this->assertSame($folderFilesBefore, Storage::disk('cyber')->files($challenge->path_folder));
    }

    public function test_export_open_ended_challenge_works(): void
    {
        $challenge = $this->createChallenge(['notes' => 'Open ended tanpa soal']);

        $json = $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'json']))
            ->assertOk()
            ->json();

        $this->assertSame([], $json['questions']);

        $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'pdf']))
            ->assertOk();
    }

    public function test_export_unknown_format_returns_404(): void
    {
        $challenge = $this->createChallenge($this->writeupWithQuestions());

        $this->actingAs($this->user)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'zip']))
            ->assertNotFound();
    }

    public function test_export_forbidden_for_other_user(): void
    {
        $other = User::factory()->create();
        $challenge = $this->createChallenge($this->writeupWithQuestions());

        $this->actingAs($other)
            ->get(route('challenges.export', ['challenge' => $challenge->id, 'format' => 'md']))
            ->assertForbidden();
    }
}