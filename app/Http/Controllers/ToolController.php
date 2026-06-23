<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Tool;
use Illuminate\Support\Str;

class ToolController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        return Inertia::render('Tools/Index', [
            'tools' => Tool::where('user_id', $request->user()->id)->latest()->paginate(10)
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Tools/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'workflow' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'commands' => 'required|array',
        ]);

        $validated['user_id'] = $request->user()->id;
        Tool::create($validated);

        return redirect()->route('tools.index');
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
    public function edit(\Illuminate\Http\Request $request, Tool $tool)
    {
        if ($tool->user_id !== $request->user()->id) abort(403);
        return Inertia::render('Tools/Edit', ['tool' => $tool]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(\Illuminate\Http\Request $request, Tool $tool)
    {
        if ($tool->user_id !== $request->user()->id) abort(403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'workflow' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'commands' => 'required|array',
        ]);

        $tool->update($validated);
        return redirect()->route('tools.index')->with('success', 'Tool berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(\Illuminate\Http\Request $request, Tool $tool)
    {
        if ($tool->user_id !== $request->user()->id) abort(403);
        $tool->delete();
        return redirect()->back();
    }
}
