<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Payload;
use Illuminate\Support\Str;

class PayloadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Inertia::render('Payloads/Index', [
            'payloads' => Payload::where('user_id', $request->user()->id)->latest()->paginate(10)
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Payloads/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'content' => 'required|string',
        ]);

        $validated['user_id'] = $request->user()->id;
        Payload::create($validated);

        return redirect()->route('payloads.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(\Illuminate\Http\Request $request, Payload $payload)
    {
        if ($payload->user_id !== $request->user()->id) abort(403);
        return Inertia::render('Payloads/Edit', ['payload' => $payload]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(\Illuminate\Http\Request $request, Payload $payload)
    {
        if ($payload->user_id !== $request->user()->id) abort(403);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'content' => 'required|string',
        ]);

        $payload->update($validated);
        return redirect()->route('payloads.index')->with('success', 'Payload diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(\Illuminate\Http\Request $request, Payload $payload)
    {
        if ($payload->user_id !== $request->user()->id) abort(403);
        $payload->delete();
        return redirect()->back();
    }
}
