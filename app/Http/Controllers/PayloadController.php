<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class PayloadController extends Controller
{
    private $disk = 'cyber';
    private $dir = 'payloads';

    private function getAllPayloads()
    {
        $all = [];
        if (!Storage::disk($this->disk)->exists($this->dir)) {
            Storage::disk($this->disk)->makeDirectory($this->dir);
        }

        $files = Storage::disk($this->disk)->files($this->dir);
        foreach ($files as $file) {
            if (Str::endsWith($file, '.txt')) {
                $category = str_replace('.txt', '', basename($file));
                $all = array_merge($all, $this->parseFile($category));
            }
        }

        usort($all, fn($a, $b) => $b['id'] <=> $a['id']);
        return $all;
    }

    private function parseFile($category)
    {
        $path = "{$this->dir}/{$category}.txt";
        if (!Storage::disk($this->disk)->exists($path)) return [];

        $content = Storage::disk($this->disk)->get($path);
        $blocks = explode("--- END ---", $content);
        $payloads = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block)) continue;

            preg_match('/ID: (.*?)\n/', $block, $idMatch);
            preg_match('/Judul: (.*?)\n/', $block, $titleMatch);
            preg_match('/Deskripsi: (.*?)\n/', $block, $descMatch);
            preg_match('/Payload:\n(.*)/s', $block, $payloadMatch);

            if (isset($idMatch[1])) {
                $payloads[] = [
                    'id' => trim($idMatch[1]),
                    'title' => trim($titleMatch[1] ?? ''),
                    'description' => trim($descMatch[1] ?? ''),
                    'content' => trim($payloadMatch[1] ?? ''),
                    'category' => $category
                ];
            }
        }
        return $payloads;
    }

    private function saveToFile($category, $payloads)
    {
        $path = "{$this->dir}/{$category}.txt";
        $content = "";

        foreach ($payloads as $p) {
            $content .= "ID: {$p['id']}\n";
            $content .= "Judul: {$p['title']}\n";
            $content .= "Deskripsi: {$p['description']}\n";
            $content .= "Payload:\n{$p['content']}\n";
            $content .= "--- END ---\n\n";
        }

        Storage::disk($this->disk)->put($path, $content);
    }

    public function index(Request $request)
    {
        return Inertia::render('Payloads/Index', [
            'payloads' => $this->getAllPayloads()
        ]);
    }

    public function create()
    {
        return Inertia::render('Payloads/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'content' => 'required|string',
        ]);

        $category = $validated['category'];
        $payloads = $this->parseFile($category);

        $payloads[] = [
            'id' => uniqid(),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? '',
            'content' => $validated['content'],
            'category' => $category
        ];

        $this->saveToFile($category, $payloads);
        return redirect()->route('payloads.index');
    }

    public function edit(Request $request, $id)
    {
        $all = $this->getAllPayloads();
        $payload = collect($all)->firstWhere('id', $id);
        if (!$payload) abort(404);

        return Inertia::render('Payloads/Edit', ['payload' => $payload]);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'description' => 'nullable|string',
            'content' => 'required|string',
        ]);

        $all = $this->getAllPayloads();
        $oldPayload = collect($all)->firstWhere('id', $id);
        if (!$oldPayload) abort(404);

        if ($oldPayload['category'] !== $validated['category']) {
            $oldPayloads = $this->parseFile($oldPayload['category']);
            $oldPayloads = array_filter($oldPayloads, fn($p) => $p['id'] !== $id);
            $this->saveToFile($oldPayload['category'], $oldPayloads);

            $newPayloads = $this->parseFile($validated['category']);
            $newPayloads[] = [
                'id' => $id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? '',
                'content' => $validated['content'],
                'category' => $validated['category']
            ];
            $this->saveToFile($validated['category'], $newPayloads);
        } else {
            $payloads = $this->parseFile($validated['category']);
            foreach ($payloads as &$p) {
                if ($p['id'] === $id) {
                    $p['title'] = $validated['title'];
                    $p['description'] = $validated['description'] ?? '';
                    $p['content'] = $validated['content'];
                }
            }
            $this->saveToFile($validated['category'], $payloads);
        }

        return redirect()->route('payloads.index');
    }

    public function destroy(Request $request, $id)
    {
        $all = $this->getAllPayloads();
        $payload = collect($all)->firstWhere('id', $id);
        if (!$payload) return back();

        $payloads = $this->parseFile($payload['category']);
        $payloads = array_filter($payloads, fn($p) => $p['id'] !== $id);
        $this->saveToFile($payload['category'], $payloads);

        return redirect()->route('payloads.index');
    }
}
