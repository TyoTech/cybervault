<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use App\Services\ChallengeWriteupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ChallengeQuestionTest extends TestCase
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
                'lab' => 'LabQ',
                'kategori' => 'Web',
                'judul' => 'Question Challenge ' . uniqid(),
                'writeup' => $writeup,
            ])
            ->assertRedirect();

        return Challenge::where('user_id', $this->user->id)->latest('id')->firstOrFail();
    }

    private function question(string $text, string $status = 'unsolved', string $result = ''): array
    {
        return [
            'question' => $text,
            'notes' => 'Analisis ' . $text,
            'status' => $status,
            'result' => $result,
            'steps' => [],
            'evidence' => [],
        ];
    }

    public function test_challenge_without_question_is_open_ended(): void
    {
        $challenge = $this->storeWriteup(['notes' => 'Open ended']);

        $data = app(ChallengeWriteupService::class)->read($challenge);
        $stats = app(ChallengeWriteupService::class)->questionStats($data);

        $this->assertSame([], $data['questions']);
        $this->assertSame(0, $stats['total']);
        $this->assertSame('none', $stats['status']);
    }

    public function test_single_question_roundtrip(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('Level 1: XSS', 'solved', 'FLAG{satu}'),
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertCount(1, $data['questions']);
        $this->assertSame('Level 1: XSS', $data['questions'][0]['question']);
        $this->assertSame('solved', $data['questions'][0]['status']);
        $this->assertSame('FLAG{satu}', $data['questions'][0]['result']);
        $this->assertSame(1, $data['questions'][0]['order']);
    }

    public function test_multiple_questions_preserve_order_and_status(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('Soal A'),
                $this->question('Soal B', 'in_progress'),
                $this->question('Soal C', 'solved'),
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertCount(3, $data['questions']);
        $this->assertSame([1, 2, 3], array_column($data['questions'], 'order'));
        $this->assertSame(
            ['unsolved', 'in_progress', 'solved'],
            array_column($data['questions'], 'status')
        );
    }

    public function test_progress_counts_solved_questions(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('1', 'solved'),
                $this->question('2', 'solved'),
                $this->question('3'),
                $this->question('4', 'in_progress'),
                $this->question('5'),
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);
        $stats = app(ChallengeWriteupService::class)->questionStats($data);

        $this->assertSame(5, $stats['total']);
        $this->assertSame(2, $stats['solved']);
        $this->assertSame(1, $stats['inProgress']);
        $this->assertSame(40, $stats['percent']);
        $this->assertSame('progress', $stats['status']);
    }

    public function test_all_solved_is_completed(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('1', 'solved'),
                $this->question('2', 'solved'),
                $this->question('3', 'solved'),
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);
        $stats = app(ChallengeWriteupService::class)->questionStats($data);

        $this->assertSame(100, $stats['percent']);
        $this->assertSame('completed', $stats['status']);
    }

    public function test_invalid_question_status_defaults_to_unsolved(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('Soal dengan status aneh', 'dancing'),
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertSame('unsolved', $data['questions'][0]['status']);
    }

    public function test_unknown_question_keys_are_dropped_and_order_cannot_be_spoofed(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                [
                    'id' => 'palsu-id',
                    'order' => 999,
                    'question' => 'Soal aman',
                    'secret' => 'rahasia-tidak-boleh-masuk',
                    'status' => 'unsolved',
                ],
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertCount(1, $data['questions']);
        $this->assertSame('Soal aman', $data['questions'][0]['question']);
        $this->assertSame(1, $data['questions'][0]['order']);
        $this->assertArrayNotHasKey('secret', $data['questions'][0]);
        $this->assertArrayNotHasKey('palsu-id', $data['questions'][0]);
    }

    public function test_question_steps_and_evidence_are_normalized(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                [
                    'question' => 'Soal dengan langkah',
                    'status' => 'unsolved',
                    'steps' => [
                        [
                            'title' => 'Coba parameter',
                            'command' => 'curl -v http://target',
                            'output' => 'HTTP/1.1 200 OK',
                            'type' => 'bukan-tipe',
                            'rogue' => 'dibuang',
                        ],
                    ],
                    'evidence' => [
                        [
                            'label' => 'Bukti utama',
                            'kind' => 'coomand', // typo → default 'log'
                            'content' => 'output mentah',
                        ],
                    ],
                ],
            ],
        ]);

        $data = app(ChallengeWriteupService::class)->read($challenge);
        $q = $data['questions'][0];

        $this->assertSame('Coba parameter', $q['steps'][0]['title']);
        $this->assertSame('curl -v http://target', $q['steps'][0]['command']);
        $this->assertSame('test', $q['steps'][0]['type']);
        $this->assertArrayNotHasKey('rogue', $q['steps'][0]);

        $this->assertSame('Bukti utama', $q['evidence'][0]['label']);
        $this->assertSame('log', $q['evidence'][0]['kind']);
    }

    public function test_questions_are_capped_at_maximum(): void
    {
        $questions = [];
        for ($i = 1; $i <= 205; $i++) {
            $questions[] = $this->question('Soal ke-' . $i);
        }

        $challenge = $this->storeWriteup(['questions' => $questions]);

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertCount(200, $data['questions']);
    }

    public function test_legacy_json_without_questions_reads_as_empty(): void
    {
        // writeup.json lama tanpa key `questions` (data sebelum fitur ini).
        $challenge = Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabQ',
            'kategori' => 'Web',
            'judul' => 'Legacy tanpa questions',
            'path_folder' => 'lab/LabQ/Web/legacy-' . uniqid(),
        ]);

        Storage::disk('cyber')->put(
            $challenge->path_folder . '/writeup.json',
            (string) json_encode(['version' => 1, 'notes' => 'Writeup lama'], JSON_PRETTY_PRINT)
        );

        $data = app(ChallengeWriteupService::class)->read($challenge);

        $this->assertSame([], $data['questions']);
        $this->assertSame('Writeup lama', $data['notes']);
    }

    public function test_questions_appear_in_txt_artifact_markdown(): void
    {
        $challenge = $this->storeWriteup([
            'questions' => [
                $this->question('Temukan flag', 'solved', 'FLAG{aktif}'),
            ],
        ]);

        $txt = (string) Storage::disk('cyber')->get($challenge->path_folder . '/writeup.txt');

        $this->assertStringContainsString('## Questions / Objectives', $txt);
        $this->assertStringContainsString('Temukan flag [SOLVED]', $txt);
        $this->assertStringContainsString('Answer / Flag', $txt);
    }

    public function test_index_lists_question_stats_per_challenge(): void
    {
        $this->storeWriteup([
            'questions' => [
                $this->question('A', 'solved'),
                $this->question('B'),
            ],
        ]);
        // satu challenge open-ended (tanpa question)
        $this->storeWriteup(['notes' => 'tanpa soal']);

        $response = $this->actingAs($this->user)
            ->get(route('challenges.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Challenges/Index')
                ->has('challenges.data', 2)
                ->has('challenges.data.0.question_stats')
                ->has('challenges.data.1.question_stats')
            );

        // Urutan `latest()` tidak deterministik bila created_at sama → periksa
        // berdasarkan isi statistik, bukan posisi item.
        $page = $response->viewData('page');
        $totals = collect($page['props']['challenges']['data'])
            ->pluck('question_stats.total')
            ->sort()
            ->values()
            ->all();

        $this->assertSame([0, 2], $totals);
    }
}