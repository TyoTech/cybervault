<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Carbon\Carbon;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [App\Http\Controllers\DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::resource('notes', App\Http\Controllers\NoteController::class);
    Route::resource('challenges', App\Http\Controllers\ChallengeController::class);
    Route::resource('payloads', App\Http\Controllers\PayloadController::class);
    Route::resource('tools', App\Http\Controllers\ToolController::class);

    // Rate limit 10 request per menit untuk cegah spam upload
    Route::post('/upload', [App\Http\Controllers\UploadController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('upload');

    // Rate limit 60 request per menit untuk pencarian
    Route::get('/api/search', [App\Http\Controllers\SearchController::class, 'index'])
        ->middleware('throttle:60,1')
        ->name('search');

    // Route untuk membuka folder fisik challenge
    Route::post('/challenges/{challenge}/open-folder', [App\Http\Controllers\ChallengeController::class, 'openFolder'])->name('challenges.openFolder');
    Route::delete('/challenges/{challenge}/delete-file', [App\Http\Controllers\ChallengeController::class, 'deleteFile'])->name('challenges.deleteFile');

    // API untuk mendapatkan daftar lab, kategori, dan cek keberadaan folder
    Route::get('/api/labs', [App\Http\Controllers\ChallengeController::class, 'labs'])
        ->name('api.labs');
    Route::get('/api/labs/{lab}/categories', [App\Http\Controllers\ChallengeController::class, 'categories'])
        ->name('api.categories');
    Route::get('/api/labs/{lab}/check', [App\Http\Controllers\ChallengeController::class, 'checkLab'])
        ->name('api.labs.check');
    Route::get('/api/labs/{lab}/{category}/check', [App\Http\Controllers\ChallengeController::class, 'checkCategory'])
        ->name('api.categories.check');
    Route::post('/api/title/check', [App\Http\Controllers\ChallengeController::class, 'checkTitle'])
        ->name('api.title.check');

    // Route untuk membuka folder fisik note
    Route::post('/notes/{note}/open-folder', [App\Http\Controllers\NoteController::class, 'openFolder'])->name('notes.openFolder');
    Route::get('/notes/{note}/images/{filename}', [App\Http\Controllers\NoteController::class, 'serveImage'])->name('notes.image');
});

require __DIR__.'/auth.php';
