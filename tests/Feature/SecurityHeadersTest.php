<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_csp_removes_unsafe_inline_and_unsafe_eval_from_script_src(): void
    {
        // Env 'testing' bukan 'local', sehingga branch production CSP yang aktif.
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('notes.index'));
        $csp = $response->headers->get('Content-Security-Policy');

        $this->assertNotNull($csp, 'Header Content-Security-Policy tidak ada');

        preg_match('/script-src\s+([^;]*)/i', $csp, $matches);
        $this->assertNotEmpty($matches, 'Direktif script-src tidak ditemukan di CSP: ' . $csp);

        $this->assertStringNotContainsString('unsafe-inline', $matches[1]);
        $this->assertStringNotContainsString('unsafe-eval', $matches[1]);
        $this->assertStringContainsString("'self'", $matches[1]);

        // img-src tetap mengizinkan data: (gambar base64 hasil DOCX → HTML).
        $this->assertStringContainsString('data:', $csp);
        $this->assertStringContainsString('img-src', $csp);
    }

    public function test_security_headers_are_present(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('notes.index'));

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
    }
}