<?php

namespace Tests\Feature;

use App\Services\StructuredWriteupAiAssistResult;
use App\Services\StructuredWriteupAiAssistService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Mockery;
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

        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'model' => 'qwen3:1.7b',
                'response' => json_encode([
                    'goal' => [
                        'problem' => 'Endpoint debug terbuka',
                        'objective' => 'Memverifikasi akses endpoint',
                        'proof' => '',
                    ],
                    'environment' => $writeup['environment'],
                    'hypotheses' => [],
                    'steps' => [],
                    'experiments' => [],
                    'evidence' => [],
                    'strategyChanges' => [],
                    'riskImpact' => '',
                    'recommendations' => [],
                    'lessonLearned' => $writeup['lessonLearned'],
                    'references' => '',
                    'notes' => 'Hasil pengujian awal.',
                ]),
                'done' => true,
            ]),
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
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'response' => json_encode($this->writeup()),
                'done' => true,
            ]),
        ]);

        $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'writeup' => $this->writeup(),
            ])
            ->assertOk()
            ->assertJsonStructure(['writeup', 'warnings']);
    }

    public function test_ai_failure_returns_502(): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'response' => 'garbage tanpa JSON',
            ]),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('challenges.ai.assist'), [
                'title' => 'Test',
                'writeup' => $this->writeup(),
            ]);

        $response
            ->assertStatus(502)
            ->assertJsonPath(
                'message',
                'AI tidak dapat memproses writeup saat ini.'
            );
    }

    public function test_ai_assist_does_not_modify_persistent_data(): void
    {
        Http::fake([
            '127.0.0.1:11434/*' => Http::response([
                'response' => json_encode($this->writeup()),
                'done' => true,
            ]),
        ]);

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
}