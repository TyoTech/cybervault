<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Challenge;
use Illuminate\Support\Str;

class ChallengeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Inertia::render('Challenges/Index', [
            'challenges' => Challenge::where('user_id', $request->user()->id)->latest()->paginate(10)
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Challenges/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_name' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'category' => 'required|string',
            'difficulty' => 'required|string',
            'status' => 'required|string',
            'points' => 'nullable|integer',
            'flag' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'writeup' => 'nullable|string',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['slug'] = \Illuminate\Support\Str::slug($validated['title']) . '-' . uniqid();

        Challenge::create($validated);
        return redirect()->route('challenges.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(\Illuminate\Http\Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        return Inertia::render('Challenges/Show', [
            'challenge' => $challenge
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(\Illuminate\Http\Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        return \Inertia\Inertia::render('Challenges/Edit', [
            'challenge' => $challenge
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        $validated = $request->validate([
            'event_name' => 'nullable|string|max:255',
            'title' => 'required|string|max:255',
            'category' => 'required|string',
            'difficulty' => 'required|string',
            'status' => 'required|string',
            'points' => 'nullable|integer',
            'flag' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'writeup' => 'nullable|string',
        ]);

        $challenge->update($validated);
        return redirect()->route('challenges.show', $challenge->id);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(\Illuminate\Http\Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        $challenge->delete();
        return redirect()->route('challenges.index');
    }
}
