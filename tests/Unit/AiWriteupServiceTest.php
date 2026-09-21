<?php

namespace Tests\Unit;

use App\Exceptions\AiServiceException;
use App\Services\AiWriteupService;
use App\Services\NoteAiContent;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiWriteupServiceTest extends TestCase
{
    private const VALID_RESPONSE = '{"title":"Recon yang Diperbaiki","markdown":"# Recon\\n\\nHasil scan satu-dua.","suggestions":["Tambahkan versi Nmap.","Jelaskan servis pada port 22."]}';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.ollama.base_url', 'http://ollama.test:11434');
        config()->set('services.ollama.model', 'qwen3:1.7b');
        config()->set('services.ollama.timeout', 5);

        // Stray request (pola fake tidak match) = kegagalan test, bukan request nyata.
        Http::preventStrayRequests();
    }

    private function service(): AiWriteupService
    {
        return new AiWriteupService();
    }

    private function content(): NoteAiContent
    {
        return new NoteAiContent('Judul Asli', 'Teks polos.', "# Judul Asli\n\nTeks polos.");
    }

    public function test_success_parses_structured_response(): void
    {
        // Pola harus match URL lengkap termasuk port: 'ollama.test/*' TIDAK match
        // karena di URL ada ':11434' setelah host (Laravel 13 membiarkan stray
        // request jatuh ke handler nyata jika tidak ada stub yang match).
        Http::fake([
            '*ollama.test*' => Http::response(['model' => 'qwen3:1.7b', 'response' => self::VALID_RESPONSE, 'done' => true]),
        ]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Recon yang Diperbaiki', $suggestion->title);
        $this->assertStringContainsString('# Recon', $suggestion->markdown);
        $this->assertSame(['Tambahkan versi Nmap.', 'Jelaskan servis pada port 22.'], $suggestion->suggestions);

        // Pastikan payload dikirim sesuai spesifikasi: format json + tidak streaming.
        Http::assertSent(function ($request) {
            return $request->url() === 'http://ollama.test:11434/api/generate'
                && $request['model'] === 'qwen3:1.7b'
                && $request['stream'] === false
                && $request['format'] === 'json'
                && $request['think'] === false;
        });
    }

    public function test_success_tolerates_json_wrapped_in_code_fence(): void
    {
        Http::fake([
            '*ollama.test*' => Http::response(['response' => "```json\n" . self::VALID_RESPONSE . "\n```"]),
        ]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Recon yang Diperbaiki', $suggestion->title);
        $this->assertStringContainsString('# Recon', $suggestion->markdown);
    }

    public function test_empty_ai_title_falls_back_to_original_title(): void
    {
        $raw = '{"title":"","markdown":"# Baru","suggestions":[]}';
        Http::fake(['*ollama.test*' => Http::response(['response' => $raw])]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Judul Asli', $suggestion->title);
    }

    public function test_suggestions_are_capped_and_strings_only(): void
    {
        $items = [];
        for ($i = 0; $i < 30; $i++) {
            $items[] = 'Saran ke-' . $i;
        }
        $raw = json_encode(['title' => 'T', 'markdown' => 'M', 'suggestions' => $items]);
        Http::fake(['*ollama.test*' => Http::response(['response' => $raw])]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertCount(20, $suggestion->suggestions);
    }

    public function test_connection_refused_throws_unavailable(): void
    {
        Http::fake(fn () => throw new ConnectionException('Connection refused'));

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::UNAVAILABLE, $e->kind);
            $this->assertSame('Local AI service is unavailable.', $e->friendlyMessage());
            $this->assertSame(503, $e->httpStatus());
        }
    }

    public function test_connection_timeout_throws_timeout(): void
    {
        Http::fake(fn () => throw new ConnectionException('Operation timed out after 5000 milliseconds'));

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::TIMEOUT, $e->kind);
            $this->assertSame('AI request timed out. Please try again.', $e->friendlyMessage());
            $this->assertSame(504, $e->httpStatus());
        }
    }

    public function test_model_not_found_throws_model_unavailable(): void
    {
        Http::fake([
            '*ollama.test*' => Http::response(['error' => 'model not found'], 404),
        ]);

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::MODEL_UNAVAILABLE, $e->kind);
            $this->assertSame('Configured AI model is unavailable.', $e->friendlyMessage());
        }
    }

    public function test_server_error_throws_unavailable(): void
    {
        Http::fake([
            '*ollama.test*' => Http::response(['error' => 'boom'], 500),
        ]);

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::UNAVAILABLE, $e->kind);
        }
    }

    public function test_malformed_json_throws_invalid_response(): void
    {
        Http::fake([
            '*ollama.test*' => Http::response(['response' => 'ini bukan json sama sekali']),
        ]);

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::INVALID_RESPONSE, $e->kind);
            $this->assertSame(502, $e->httpStatus());
        }
    }

    public function test_missing_markdown_falls_back_to_original_content(): void
    {
        // Kontrak: AI boleh mengembalikan {title, suggestions} tanpa markdown;
        // markdown jatuh ke konten asli agar editor tidak pernah dikosongkan.
        Http::fake([
            '*ollama.test*' => Http::response(['response' => '{"title":"x","suggestions":[]}']),
        ]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('x', $suggestion->title);
        $this->assertSame("# Judul Asli\n\nTeks polos.", $suggestion->markdown);
    }

    public function test_real_ollama_title_suggestions_response_parses(): void
    {
        // Bentuk response Ollama nyata (tanpa markdown):
        // {"title":"Test","suggestions":[]}
        Http::fake([
            '*ollama.test*' => Http::response(['response' => '{"title":"Test","suggestions":[]}']),
        ]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Test', $suggestion->title);
        $this->assertSame([], $suggestion->suggestions);
        $this->assertSame("# Judul Asli\n\nTeks polos.", $suggestion->markdown);
    }

    public function test_real_ollama_object_suggestions_response_parses(): void
    {
        // Bentuk response Ollama nyata dengan suggestion objek terstruktur:
        // {"title":"Improved Title","suggestions":[{"type":"grammar","original":"hello","improved":"Hello","reason":"Capitalization"}]}
        $raw = '{"title":"Improved Title","suggestions":[{"type":"grammar","original":"hello","improved":"Hello","reason":"Capitalization"}]}';
        Http::fake(['*ollama.test*' => Http::response(['response' => $raw])]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Improved Title', $suggestion->title);
        $this->assertSame(['hello → Hello (Capitalization)'], $suggestion->suggestions);
        $this->assertSame("# Judul Asli\n\nTeks polos.", $suggestion->markdown);
    }

    public function test_markdown_containing_code_fences_is_parsed_correctly(): void
    {
        // Root cause asli: markdown berisi ``` TIDAK boleh memotong ekstraksi JSON.
        $markdown = "# Recon\n\n```bash\nnmap -sV 10.0.0.1\n```\n\n```\nid\n```\n";
        $raw = json_encode(['title' => 'Recon', 'markdown' => $markdown, 'suggestions' => ['s1', 's2']], JSON_UNESCAPED_SLASHES);
        Http::fake(['*ollama.test*' => Http::response(['response' => $raw])]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Recon', $suggestion->title);
        // Parser me-trim markdown (buang newline/space tepi), isi dalam tetap utuh.
        $this->assertSame(trim($markdown), $suggestion->markdown);
        $this->assertSame(['s1', 's2'], $suggestion->suggestions);
    }

    public function test_fence_wrapped_response_containing_inner_code_fences_parses(): void
    {
        // Wrapper ```json ... ``` SELURUH response + fence di dalam markdown.
        $markdown = "# Recon\n\n```bash\nnmap -sV 10.0.0.1\n```\n";
        $inner = json_encode(['title' => 'Recon', 'markdown' => $markdown, 'suggestions' => []], JSON_UNESCAPED_SLASHES);
        Http::fake(['*ollama.test*' => Http::response(['response' => "```json\n{$inner}\n```"])]);

        $suggestion = $this->service()->improve($this->content());

        $this->assertSame('Recon', $suggestion->title);
        $this->assertSame(trim($markdown), $suggestion->markdown);
    }

    public function test_empty_json_object_throws_invalid_response(): void
    {
        // Response "{}" murni tidak membawa konten AI apa pun -> tetap ditolak.
        Http::fake(['*ollama.test*' => Http::response(['response' => '{}'])]);

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::INVALID_RESPONSE, $e->kind);
            $this->assertSame(502, $e->httpStatus());
        }
    }

    public function test_oversized_response_throws_invalid_response(): void
    {
        Http::fake([
            '*ollama.test*' => Http::response(['response' => str_repeat('a', 300_000)]),
        ]);

        try {
            $this->service()->improve($this->content());
            $this->fail('Harusnya throw AiServiceException');
        } catch (AiServiceException $e) {
            $this->assertSame(AiServiceException::INVALID_RESPONSE, $e->kind);
        }
    }
}