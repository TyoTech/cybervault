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

Route::get('/dashboard', function (Request $request) {
    $userId = $request->user()->id;
    $last7Days = collect(range(6, 0))->map(function ($days) use ($userId) {
        $date = Carbon::today()->subDays($days);
        $count = \App\Models\Challenge::where('user_id', $userId)
                    ->where('status', 'Solved')
                    ->whereDate('updated_at', $date)
                    ->count();
        return ['name' => $date->format('d M'), 'solved' => $count];
    });

    return Inertia::render('Dashboard', [
        'stats' => [
            'challenges_solved' => \App\Models\Challenge::where('user_id', $userId)->where('status', 'Solved')->count(),
            'total_notes' => \App\Models\Note::where('user_id', $userId)->count(),
            'total_payloads' => \App\Models\Payload::where('user_id', $userId)->count(),
            'total_tools' => \App\Models\Tool::where('user_id', $userId)->count(),
        ],
        'recentDrafts' => \App\Models\Note::where('user_id', $userId)
                            ->orderBy('updated_at', 'desc')
                            ->take(5)
                            ->get(['id', 'title', 'updated_at']),
        'activityData' => $last7Days
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

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
});

require __DIR__.'/auth.php';
