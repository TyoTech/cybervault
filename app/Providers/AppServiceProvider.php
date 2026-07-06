<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        // Aktifkan strict mode hanya saat development.
        // Saat production, aplikasi tidak akan crash tapi performa tetap terjaga.
        Model::shouldBeStrict(! app()->isProduction());


        // paksa semua URL menggunakan HTTPS saat aplikasi berjalan di lingkungan selain local.
        if (env('APP_ENV') !== 'local') {
            URL::forceScheme('https');
        }
    }
}
