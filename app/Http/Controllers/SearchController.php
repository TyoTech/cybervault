<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Note;
use App\Models\Challenge;
use App\Models\Tool;
use App\Services\ChallengeWriteupService;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = trim((string) $request->input('q'));
        $userId = $request->user()->id;

        if ($query === '') {
            return response()->json([]);
        }

        // Escape wildcard agar input pengguna tidak diperlakukan sebagai pola pencarian.
        // LIKE dengan LOWER() agar case-insensitive dan kompatibel dengan SQLite maupun PostgreSQL.
        $needle = '%' . addcslashes($query, '%_') . '%';

        $notes = Note::where('user_id', $userId)
            ->whereRaw('LOWER(title) LIKE LOWER(?)', [$needle])
            ->take(5)
            ->get()
            ->map(fn ($item) => [
                'type' => 'note', 'title' => $item->title, 'url' => route('notes.show', $item->id)
            ]);

        // Tabel challenges memakai kolom `judul` (bukan `title`).
        $challengeItems = Challenge::where('user_id', $userId)
            ->whereRaw('LOWER(judul) LIKE LOWER(?)', [$needle])
            ->take(5)
            ->get();

        $challenges = $challengeItems->map(fn ($item) => [
            'type' => 'challenge', 'title' => $item->judul, 'url' => route('challenges.show', $item->id)
        ]);

        // Cari juga di Question/Objective (unit pekerjaan) di dalam writeup.json.
        // Batasi scan ke challenge terbaru agar tetap ringan; hasil diberi tipe
        // khusus supaya user tahu ini cocok lewat question-nya, bukan judul.
        $matchedIds = $challengeItems->pluck('id');

        $questionMatches = Challenge::where('user_id', $userId)
            ->whereNotIn('id', $matchedIds)
            ->latest()
            ->limit(30)
            ->get()
            ->filter(function (Challenge $item) use ($query) {
                $data = app(ChallengeWriteupService::class)->read($item);
                foreach ($data['questions'] as $q) {
                    if (mb_stripos($q['question'], $query) !== false
                        || mb_stripos($q['notes'], $query) !== false) {
                        return true;
                    }
                }
                return false;
            })
            ->take(5)
            ->map(fn ($item) => [
                'type' => 'challenge-question',
                'title' => $item->judul . ' — Question/Objective',
                'url' => route('challenges.show', $item->id),
            ]);

        // Source of truth payload adalah file teks di disk cyber (dikelola PayloadController),
        // bukan tabel database. Cari dari sumber yang sama agar hasil konsisten.
        $payloads = collect((new PayloadController)->getAllPayloads())
            ->filter(fn ($payload) => mb_stripos($payload['title'], $query) !== false)
            ->take(5)
            ->values()
            ->map(fn ($item) => [
                'type' => 'payload', 'title' => $item['title'], 'url' => route('payloads.edit', $item['id'])
            ]);

        $tools = Tool::where('user_id', $userId)
            ->whereRaw('LOWER(name) LIKE LOWER(?)', [$needle])
            ->take(5)
            ->get()
            ->map(fn ($item) => [
                'type' => 'tool', 'title' => $item->name, 'url' => route('tools.edit', $item->id)
            ]);

        $results = collect([])->merge($notes)->merge($challenges)->merge($questionMatches)->merge($payloads)->merge($tools);

        return response()->json($results->values());
    }
}