<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Jika mode lokal, izinkan Vite server (port 5173) dan WebSockets untuk live-reload.
        // Origin development dikunci ke 127.0.0.1 saja (vite.config.js server.host)
        // dan APP_URL=http://127.0.0.1:8000. 'self' = origin halaman (127.0.0.1:8000),
        // sehingga request Axios/Inertia ke route Laravel (termasuk /register)
        // selalu tercakup. localhost:5173 / ws://localhost:5173 sengaja TIDAK
        // dimasukkan karena Vite tidak lagi bind ke localhost (mencegah [::1]).
        if (app()->environment('local')) {
            $csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:5173; connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173; style-src 'self' 'unsafe-inline' http://127.0.0.1:5173; img-src 'self' data: blob:; font-src 'self' data:;";
        } else {
            // Mode production yang ketat: script hanya dari file eksternal build (tanpa unsafe-inline/unsafe-eval).
            // Ziggy memakai file generated (resources/js/ziggy.js) sehingga tidak ada inline script lagi,
            // kecuali SATU: script tema anti-FOUC di app.blade.php. Diizinkan lewat hash sha256 di bawah ini —
            // JAGA HASH TERSEBUT SINKRON bila mengubah isi script tema di app.blade.php.
            $scriptHash = "'sha256-2WXCCvTKJp7DNCKs+iEQwPqbyrnu51V4uiB/4YCkkUw='";
            $csp = "default-src 'self'; script-src 'self' {$scriptHash}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;";
        }

        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('Content-Security-Policy', $csp);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return $response;
    }
}
