<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use App\Models\Challenge;
use App\Models\Note;
use App\Models\Payload;
use App\Models\Tool;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $last7Days = collect(range(6, 0))->map(function ($days) use ($userId) {
            $date = Carbon::today()->subDays($days);
            $count = Challenge::where('user_id', $userId)
                        ->whereDate('updated_at', $date)
                        ->count();
            return ['name' => $date->format('d M'), 'solved' => $count];
        });

        return Inertia::render('Dashboard', [
            'stats' => [
                'challenges_solved' => Challenge::where('user_id', $userId)->count(),
                'total_notes' => Note::where('user_id', $userId)->count(),
                'total_payloads' => Payload::where('user_id', $userId)->count(),
                'total_tools' => Tool::where('user_id', $userId)->count(),
            ],
            'recentDrafts' => Note::where('user_id', $userId)
                                ->orderBy('updated_at', 'desc')
                                ->take(5)
                                ->get(['id', 'title', 'updated_at']),
            'activityData' => $last7Days
        ]);
    }
}
