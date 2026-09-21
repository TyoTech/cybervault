<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as LaravelResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Notifikasi email reset password — Bahasa Indonesia (menyesuaikan UI).
 *
 * Kelas ini TIDAK membuat sistem token baru: ia mewarisi seluruh mekanisme
 * Laravel Password Broker (token, expiry 60 menit, URL reset dari APP_URL +
 * route `password.reset`), hanya isi EMAIL-nya yang disesuaikan.
 *
 * Jika isi email Bahasa Indonesia tidak diperlukan, class ini bisa dibuang
 * dan Laravel akan kembali ke notification default (`ResetPassword` bawaan).
 */
class ResetPasswordNotification extends LaravelResetPassword
{
    /**
     * Bangun isi email dalam Bahasa Indonesia.
     *
     * @param  string  $url  URL reset dari Laravel Password Broker.
     */
    protected function buildMailMessage($url): MailMessage
    {
        $appName = (string) config('app.name', 'Cyber Vault');
        $expire  = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Reset Password — '.$appName)
            ->greeting('Halo!')
            ->line('Anda menerima email ini karena kami menerima permintaan reset password untuk akun Anda di '.$appName.'.')
            ->action('Reset Password', $url)
            ->line('Link reset password ini akan kedaluwarsa dalam '.$expire.' menit.')
            ->line('Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan diubah.')
            ->salutation('Salam hangat, '.$appName);
    }
}