<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_known_email_receives_reset_link(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'reset@example.com']);

        $this->post(route('password.email'), ['email' => 'reset@example.com'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // Status generik ikut dikirim (bukan bocor detail token).
        $this->assertNotEmpty(session('status'));

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_unknown_email_gets_same_generic_response_no_enumeration(): void
    {
        Notification::fake();

        $this->post(route('password.email'), ['email' => 'tidak-ada@example.com'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // Respon SAMA seperti email terdaftar: sukses + status generik (bukan error).
        $this->assertNotEmpty(session('status'));

        // Tidak ada token dibuat untuk email yang tidak terdaftar.
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
        Notification::assertNothingSent();
    }

    public function test_missing_email_is_rejected(): void
    {
        Notification::fake();

        $this->post(route('password.email'), [])
            ->assertSessionHasErrors('email');

        Notification::assertNothingSent();
    }

    public function test_invalid_email_format_is_rejected(): void
    {
        Notification::fake();

        $this->post(route('password.email'), ['email' => 'bukan-email'])
            ->assertSessionHasErrors('email');

        Notification::assertNothingSent();
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'pulih@example.com',
            'password' => 'password-lama',
        ]);

        $token = Password::broker()->createToken($user);

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => 'pulih@example.com',
            'password' => 'password-baru-aman',
            'password_confirmation' => 'password-baru-aman',
        ])->assertRedirect(route('login'));

        // Token sekali pakai sudah dihapus.
        $this->assertSame(0, DB::table('password_reset_tokens')->count());

        // Login dengan password baru berhasil; password lama tidak.
        $this->assertTrue(Auth::attempt(['email' => 'pulih@example.com', 'password' => 'password-baru-aman']));
        $this->assertFalse(Auth::attempt(['email' => 'pulih@example.com', 'password' => 'password-lama']));
    }

    public function test_invalid_token_is_rejected_with_error(): void
    {
        $user = User::factory()->create(['email' => 'gagal@example.com']);

        $this->post(route('password.store'), [
            'token' => 'token-salah',
            'email' => 'gagal@example.com',
            'password' => 'password-baru',
            'password_confirmation' => 'password-baru',
        ])->assertSessionHasErrors('email');
    }

    public function test_expired_token_is_rejected_and_old_password_kept(): void
    {
        $user = User::factory()->create(['email' => 'kedaluwarsa@example.com']);

        $token = Password::broker()->createToken($user);

        // Simulasikan 60 menit (masa berlaku broker) sudah lewat.
        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update(['created_at' => now()->subMinutes(61)]);

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'password-baru',
            'password_confirmation' => 'password-baru',
        ])->assertSessionHasErrors('email');

        // Password lama tetap berlaku; password "baru" tidak terekam.
        // CATATAN: gunakan literal 'email' (getAuthIdentifierName() = 'id', bukan kolom email).
        $this->assertTrue(Auth::attempt(['email' => $user->email, 'password' => 'password']));
        $this->assertFalse(Auth::attempt(['email' => $user->email, 'password' => 'password-baru']));
    }

    public function test_reset_notification_renders_expected_content(): void
    {
        $user = User::factory()->create(['email' => 'konten@example.com']);

        $mail = (new ResetPasswordNotification('token-konten-123'))->toMail($user);
        $rendered = $mail->render();

        // Branding + isi wajib email (cocok dengan bahasa UI project).
        $this->assertStringContainsString('Cyber Vault', $rendered);
        $this->assertStringContainsString('Reset Password', $rendered);
        $this->assertStringContainsString('reset password untuk akun Anda', $rendered);
        $this->assertStringContainsString('kedaluwarsa', $rendered);
        $this->assertStringContainsString('tidak meminta reset password', $rendered);

        // Link reset mengarah ke route password.reset dengan APP_URL.
        $expectedUrl = url(route('password.reset', [
            'token' => 'token-konten-123',
            'email' => $user->email,
        ], false));
        $this->assertStringContainsString($expectedUrl, $rendered);
    }

    public function test_user_can_fetch_forgot_password_view(): void
    {
        $this->get(route('password.request'))->assertOk();
    }
}