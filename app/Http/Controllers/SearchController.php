<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Note;
use App\Models\Challenge;
use App\Models\Payload;
use App\Models\Tool;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->input('q');
        $userId = $request->user()->id;

        if (!$query) {
            return response()->json([]);
        }

        $notes = Note::where('user_id', $userId)->where('title', 'ILIKE', "%{$query}%")->take(5)->get()->map(fn($item) => [
            'type' => 'note', 'title' => $item->title, 'url' => route('notes.show', $item->id)
        ]);

        $challenges = Challenge::where('user_id', $userId)->where('title', 'ILIKE', "%{$query}%")->take(5)->get()->map(fn($item) => [
            'type' => 'challenge', 'title' => $item->title, 'url' => route('challenges.show', $item->id)
        ]);

        $payloads = Payload::where('user_id', $userId)->where('title', 'ILIKE', "%{$query}%")->take(5)->get()->map(fn($item) => [
            'type' => 'payload', 'title' => $item->title, 'url' => route('payloads.edit', $item->id)
        ]);

        $tools = Tool::where('user_id', $userId)->where('name', 'ILIKE', "%{$query}%")->take(5)->get()->map(fn($item) => [
            'type' => 'tool', 'title' => $item->name, 'url' => route('tools.edit', $item->id)
        ]);

        $results = collect([])->merge($notes)->merge($challenges)->merge($payloads)->merge($tools);

        return response()->json($results);
    }
}
