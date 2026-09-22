<?php

namespace Tests\Feature;

use App\Models\Challenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChallengeAiAssistTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Http::preventStrayRequests();

        // Arahkan disk cyber ke direktori temp agar tidak menyentuh vault asli.
        config()->set('filesystems.disks.cyber.root', storage_path('app/cyber-tests'));
        Storage::forgetDisk('cyber');
        File::deleteDirectory(storage_path('app/cyber-tests'));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/cyber-tests'));
        parent::tearDown();
    }

    private function writeup(): array
    {
        return [
            'goal' => [
                'problem' => 'Endpoint debug terbuka',
                'objective' => 'Memverifikasi akses endpoint',
                'proof' => '',
            ],
            'environment' => [
                'target' => 'lab.local',
                'environment' => 'local',
                'host' => '',
                'application' => '',
                'os' => 'Fedora',
                'tools' => 'curl',
                'scope' => '',
            ],
            'hypotheses' => [],
            'steps' => [],
            'experiments' => [],
            'evidence' => [],
            'strategyChanges' => [],
            'riskImpact' => '',
            'recommendations' => [],
            'lessonLearned' => [
                'learned' => '',
                'patterns' => '',
                'mistakes' => '',
                'concepts' => '',
                'different' => '',
                'relevance' => '',
            ],
            'references' => '',
            'notes' => 'Hasil pengujian awal.',
        ];
    }

    /** Buat challenge reference milik user (atau owner lain) dengan writeup.json. */
    private function createReference(array $writeup, ?User $owner = null): Challenge
    {
        $owner ??= $this->user;

        $challenge = Challenge::create([
            'user_id' => $owner->id,
            'lab' => 'LabRef',
            'kategori' => 'Web',
            'judul' => 'Ref ' . uniqid(),
            'path_folder' => 'lab/LabRef/Web/ref-' . uniqid(),
        ]);

        Storage::disk('cyber')->put(
            $challenge->path_folder . '/writeup.json',
            (string) json_encode($writeup, JSON_PRETTY_PRINT)
        );

        return $challenge;
    }

    private function fakeOllamaJson(array $payload): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'model' => 'qwen3:1.7b',
                'response' => (string) json_encode($payload),
                'done' => true,
            ]),
        ]);
    }

    public function test_assist_route_is_registered(): void
    {
        $this->assertTrue(Route::has('challenges.ai.assist'));
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->postJson(route('challenges.ai.assist'), [
            'title' => 'Test',
            'writeup' => $this->writeup(),
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_receives_structured_suggestion(): void
    {
        $writeup = $this->writeup();

        $this->fakeOllamaJson([
            'goal' => $writeup['goal'],
            'environment' => $writeup['environment'],
            'steps' => [],
            'lessonLearned' => $writeup['lessonLearned'],
            'notes' => 'Hasil pengujian awal.',
        ]);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Writeup Test',
                'writeup' => $writeup,
            ])
            ->assertOk()
            ->assertJsonPath(
                'writeup.goal.objective',
                'Memverifikasi akses endpoint'
            )
            ->assertJsonStructure([
                'writeup',
                'warnings',
            ]);
    }

    public function test_empty_writeup_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('writeup');
    }

    public function test_title_is_optional(): void
    {
        $this->fakeOllamaJson($this->writeup());

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'writeup' => $this->writeup(),
            ])
            ->assertOk()
            ->assertJsonStructure(['writeup', 'warnings']);
    }

    public function test_ai_failure_returns_502_with_friendly_message(): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'response' => 'garbage tanpa JSON',
            ]),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertStatus(502)
            ->assertJsonPath(
                'message',
                'The AI response could not be processed. Please try again.'
            );
    }

    public function test_ai_assist_does_not_modify_persistent_data(): void
    {
        $this->fakeOllamaJson($this->writeup());

        $before = User::find($this->user->id)->toArray();

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertOk();

        $after = User::find($this->user->id)->toArray();

        $this->assertSame($before, $after);
    }

    // ---------------------------------------------------------------------
    // References
    // ---------------------------------------------------------------------

    public function test_ai_with_single_reference_sends_compact_context_only(): void
    {
        $reference = $this->createReference([
            'goal' => ['problem' => 'P', 'objective' => 'O', 'proof' => ''],
            'environment' => ['target' => 'ref.local', 'environment' => 'lab', 'host' => '', 'application' => '', 'os' => '', 'tools' => '', 'scope' => ''],
            'steps' => [
                [
                    'title' => 'Enum',
                    'question' => 'Port apa terbuka?',
                    'approach' => 'nmap',
                    'command' => 'nmap -sV -p- target',
                    'output' => '80/tcp open  http',
                    'result' => 'HTTP terbuka.',
                    'interpretation' => 'Lanju ke enumerasi web.',
                ],
            ],
            'evidence' => [
                ['label' => 'Nmap', 'kind' => 'command', 'content' => 'SENSITIVE_OUTPUT_RAHASIA'],
            ],
            'notes' => 'SENSITIVE_NOTES_RAHASIA',
        ]);

        $captured = null;

        Http::fake(function (Request $request) use (&$captured) {
            $captured = $request;

            return Http::response([
                'response' => '{}',
                'done' => true,
            ]);
        });

        $payload = $this->writeup();
        $payload['notes'] = 'Catatan current yang mau dirapikan.';

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $payload,
                'reference_ids' => [$reference->id],
            ])
            ->assertOk();

        $this->assertNotNull($captured);

        $sent = $captured->data();
        $prompt = $sent['prompt'] ?? '';

        // Reference hanya boleh jadi konteks — data teknis & sensitif tidak dikirim.
        $this->assertStringContainsString($reference->judul, $prompt);
        $this->assertStringNotContainsString('SENSITIVE_OUTPUT_RAHASIA', $prompt);
        $this->assertStringNotContainsString('SENSITIVE_NOTES_RAHASIA', $prompt);
        $this->assertStringNotContainsString('nmap -sV -p- target', $prompt);
        // Field deskriptif reference tetap ada sebagai konteks pendekatan.
        $this->assertStringContainsString('Enum', $prompt);
        $this->assertStringContainsString('Port apa terbuka?', $prompt);
    }

    public function test_ai_with_five_references_accepted(): void
    {
        $ids = [];
        foreach (range(1, 5) as $i) {
            $ids[] = $this->createReference([
                'goal' => ['problem' => "Masalah $i", 'objective' => "Tujuan $i", 'proof' => ''],
                'notes' => "Catatan ref $i",
            ])->id;
        }

        $this->fakeOllamaJson(['notes' => 'Hasil rapi dari 5 konteks.']);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'reference_ids' => $ids,
            ])
            ->assertOk();
    }

    public function test_more_than_five_distinct_references_are_rejected(): void
    {
        $ids = [];
        foreach (range(1, 6) as $i) {
            $ids[] = $this->createReference(['notes' => 'x'])->id;
        }

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'reference_ids' => $ids,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Maksimal 5 reference writeup.');
    }

    public function test_duplicate_reference_ids_are_deduplicated(): void
    {
        $reference = $this->createReference(['notes' => 'satu']);

        $this->fakeOllamaJson(['notes' => 'ok']);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'reference_ids' => [
                    $reference->id,
                    $reference->id,
                    $reference->id,
                    $reference->id,
                    $reference->id,
                    $reference->id,
                ],
            ])
            ->assertOk();
    }

    public function test_reference_of_another_user_is_rejected(): void
    {
        $other = User::factory()->create();
        $reference = $this->createReference(['notes' => 'rahasia user lain'], $other);

        Http::preventStrayRequests();

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'reference_ids' => [$reference->id],
            ])
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Beberapa reference tidak tersedia atau bukan milik Anda.'
            );

        // Reference user lain tidak boleh ikut terbaca/dikirim.
        Http::assertNothingSent();
    }

    public function test_current_challenge_cannot_be_its_own_reference(): void
    {
        $challenge = $this->createReference(['notes' => 'current']);

        $sent = null;
        Http::fake(function (Request $request) use (&$sent) {
            $sent = $request->data()['prompt'] ?? '';
            return Http::response(['response' => '{}', 'done' => true]);
        });

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'current_challenge_id' => $challenge->id,
                'reference_ids' => [$challenge->id],
            ])
            ->assertOk();

        // Self-reference difilter di controller: tidak ada references terkirim.
        $this->assertNotNull($sent);
        $this->assertStringContainsString('references":[]', $sent);
    }

    public function test_legacy_txt_only_reference_works(): void
    {
        // Reference hanya punya writeup.txt lama (belum ada writeup.json).
        $challenge = Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabRef',
            'kategori' => 'Web',
            'judul' => 'Legacy Ref',
            'path_folder' => 'lab/LabRef/Web/legacy-' . uniqid(),
        ]);
        Storage::disk('cyber')->put(
            $challenge->path_folder . '/writeup.txt',
            "Legacy content tanpa json."
        );

        $this->fakeOllamaJson(['notes' => 'rapi']);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'reference_ids' => [$challenge->id],
            ])
            ->assertOk();
    }

    // ---------------------------------------------------------------------
    // Error handling: timeout / unavailable / model / malformed
    // ---------------------------------------------------------------------

    public function test_ai_timeout_returns_504(): void
    {
        Http::fake(function () {
            throw new ConnectionException(
                'cURL error 28: Operation timed out after 60001 milliseconds with 0 bytes received'
            );
        });

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertStatus(504)
            ->assertJsonPath('message', 'AI request timed out. Please try again.');
    }

    public function test_ollama_unavailable_returns_503(): void
    {
        Http::fake(function () {
            throw new ConnectionException('cURL error 7: Failed to connect to 127.0.0.1 port 11434: Connection refused');
        });

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Local AI service is unavailable.');
    }

    public function test_model_not_found_returns_503(): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([], 404),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Configured AI model is unavailable.');
    }

    public function test_malformed_json_with_code_fence_is_handled(): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'response' => "```json\n{\"goal\":{\"problem\":\"Berhasil diparse\"}}\n```",
                'done' => true,
            ]),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ])
            ->assertOk()
            ->assertJsonPath('writeup.goal.problem', 'Berhasil diparse');
    }

    // ---------------------------------------------------------------------
    // Data safety: AI tidak menghapus evidence / command / output / result
    // ---------------------------------------------------------------------

    public function test_ai_apply_preserves_evidence_and_technical_fields(): void
    {
        $writeup = $this->writeup();
        $writeup['evidence'] = [
            ['id' => 'ev1', 'label' => 'HTTP response', 'kind' => 'response', 'content' => 'HTTP/1.1 403 Forbidden'],
        ];
        $writeup['steps'] = [
            [
                'id' => 's1',
                'title' => 'Recon',
                'question' => '',
                'goal' => '',
                'approach' => '',
                'command' => 'curl -i https://lab.local/admin',
                'output' => 'HTTP/1.1 200 OK',
                'result' => 'Admin terbuka tanpa auth.',
                'interpretation' => '',
                'type' => 'test',
            ],
        ];

        // AI mencoba menimpa evidence & membuang command/output.
        $this->fakeOllamaJson([
            'goal' => ['problem' => 'Rewrite AI', 'objective' => '', 'proof' => ''],
            'environment' => [],
            'steps' => [], // AI tidak menyusun steps -> step asli harus dipertahankan
            'lessonLearned' => ['learned' => 'Pelajaran AI', 'patterns' => '', 'mistakes' => '', 'concepts' => '', 'different' => '', 'relevance' => ''],
            'notes' => '',
            'evidence' => [], // field yang tidak ada di PATCH schema -> diabaikan
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $writeup,
            ])
            ->assertOk();

        $out = $response->json('writeup');

        // Evidence tidak pernah hilang/dihapus AI.
        $this->assertNotEmpty($out['evidence']);
        $this->assertSame('HTTP/1.1 403 Forbidden', $out['evidence'][0]['content']);
        $this->assertSame('response', $out['evidence'][0]['kind']);

        // Steps asli + command/output/result dipertahankan.
        $this->assertNotEmpty($out['steps']);
        $this->assertSame('curl -i https://lab.local/admin', $out['steps'][0]['command']);
        $this->assertSame('HTTP/1.1 200 OK', $out['steps'][0]['output']);
        $this->assertSame('Admin terbuka tanpa auth.', $out['steps'][0]['result']);

        // Goal boleh dirapikan AI; notes kosong tidak menimpa notes asli.
        $this->assertSame('Rewrite AI', $out['goal']['problem']);
        $this->assertSame('Hasil pengujian awal.', $out['notes']);
    }

    public function test_ai_apply_does_not_replace_technical_fields_in_steps(): void
    {
        $writeup = $this->writeup();
        $writeup['steps'] = [
            [
                'id' => 's1',
                'title' => 'Old title',
                'question' => '',
                'goal' => '',
                'approach' => '',
                'command' => 'ORIGINAL_COMMAND',
                'output' => 'ORIGINAL_OUTPUT',
                'result' => 'ORIGINAL_RESULT',
                'interpretation' => '',
                'type' => 'test',
            ],
        ];

        // AI mengirim step yang berusaha mengubah command/output — harus ditolak.
        $this->fakeOllamaJson([
            'steps' => [
                [
                    'title' => 'New title',
                    'question' => '',
                    'goal' => '',
                    'approach' => '',
                    'command' => 'FAKE_COMMAND',
                    'output' => 'FAKE_OUTPUT',
                    'result' => 'FAKE_RESULT',
                    'interpretation' => 'Interpretasi baru',
                ],
            ],
        ]);

        $out = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $writeup,
            ])
            ->assertOk()
            ->json('writeup');

        $step = $out['steps'][0];
        $this->assertSame('New title', $step['title']);
        $this->assertSame('Interpretasi baru', $step['interpretation']);
        $this->assertSame('ORIGINAL_COMMAND', $step['command']);
        $this->assertSame('ORIGINAL_OUTPUT', $step['output']);
        $this->assertSame('ORIGINAL_RESULT', $step['result']);
    }

    public function test_ai_reject_leaves_persisted_writeup_untouched(): void
    {
        // Reject dilakukan di client (Batal). Endpoint AI tidak membaca/menulis
        // file challenge: buktikan file writeup.json challenge tidak berubah.
        $challenge = Challenge::create([
            'user_id' => $this->user->id,
            'lab' => 'LabRef',
            'kategori' => 'Web',
            'judul' => 'Milik Sendiri',
            'path_folder' => 'lab/LabRef/Web/milik-' . uniqid(),
        ]);
        $originalJson = '{"notes":"versi asli"}';
        Storage::disk('cyber')->put($challenge->path_folder . '/writeup.json', $originalJson);

        $this->fakeOllamaJson(['notes' => 'versi AI']);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Current',
                'writeup' => $this->writeup(),
                'current_challenge_id' => $challenge->id,
            ])
            ->assertOk();

        // READ-ONLY: file tetap seperti semula sampai user Save lewat update.
        $this->assertSame(
            $originalJson,
            Storage::disk('cyber')->get($challenge->path_folder . '/writeup.json')
        );
    }

    // ---------------------------------------------------------------------
    // Throttle & route protection
    // ---------------------------------------------------------------------

    public function test_ai_route_is_rate_limited(): void
    {
        $middleware = Route::getRoutes()->getByName('challenges.ai.assist')->gatherMiddleware();

        $this->assertContains('throttle:5,1', $middleware);
    }

    // ---------------------------------------------------------------------
    // AI & Questions/Objectives (structural inference yang aman)
    // ---------------------------------------------------------------------

    public function test_ai_adds_questions_when_current_has_none(): void
    {
        $this->fakeOllamaJson([
            'questions' => [
                [
                    'question' => 'Level 1: temukan flag XSS',
                    'notes' => 'Dari konteks, level pertama memerlukan penyisipan payload.',
                    // Fakta teknis yang dikirim AI TIDAK boleh diadopsi:
                    'result' => 'FLAG{dari-ai}',
                    'status' => 'solved',
                    'steps' => [['title' => 'Step buatan AI', 'command' => 'curl -X POST ...']],
                    'evidence' => [['kind' => 'command', 'content' => 'curl ...']],
                ],
            ],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Natas',
                'writeup' => $this->writeup(),
            ]);

        $response->assertOk()
            ->assertJsonPath('writeup.questions.0.question', 'Level 1: temukan flag XSS')
            ->assertJsonPath('writeup.questions.0.notes', 'Dari konteks, level pertama memerlukan penyisipan payload.')
            // Status/result/steps/evidence tetap netral — fakta teknis milik user.
            ->assertJsonPath('writeup.questions.0.status', 'unsolved')
            ->assertJsonPath('writeup.questions.0.result', '')
            ->assertJsonPath('writeup.questions.0.steps', [])
            ->assertJsonPath('writeup.questions.0.evidence', []);
    }

    public function test_ai_does_not_overwrite_existing_questions(): void
    {
        $this->fakeOllamaJson([
            'questions' => [
                ['question' => 'Question yang diusulkan AI', 'notes' => 'tidak boleh menimpa'],
            ],
        ]);

        $writeup = $this->writeup();
        $writeup['questions'] = [
            [
                'question' => 'Soal asli user',
                'notes' => 'Analisis asli',
                'status' => 'solved',
                'result' => 'FLAG{asli}',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Natas',
                'writeup' => $writeup,
            ]);

        $response->assertOk()
            ->assertJsonPath('writeup.questions.0.question', 'Soal asli user')
            ->assertJsonPath('writeup.questions.0.notes', 'Analisis asli')
            ->assertJsonPath('writeup.questions.0.status', 'solved')
            ->assertJsonPath('writeup.questions.0.result', 'FLAG{asli}');

        $warnings = (array) $response->json('warnings');
        $this->assertContains(
            'Daftar Questions/Objectives asli dipertahankan — AI tidak menimpa unit pekerjaan yang sudah ada.',
            $warnings
        );
    }

    public function test_ai_keeps_questions_intact_when_patch_omits_them(): void
    {
        $this->fakeOllamaJson([
            'notes' => 'Catatan yang dirapikan AI',
        ]);

        $writeup = $this->writeup();
        $writeup['questions'] = [
            [
                'question' => 'Soal milik user',
                'notes' => '',
                'status' => 'in_progress',
                'result' => '',
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Natas',
                'writeup' => $writeup,
            ]);

        $response->assertOk()
            ->assertJsonPath('writeup.questions.0.question', 'Soal milik user')
            ->assertJsonPath('writeup.questions.0.status', 'in_progress');
    }
}