<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Challenges/Index', [
            'challenges' => Challenge::where('user_id', $request->user()->id)->latest()->paginate(10)
        ]);
    }

    public function create()
    {
        return Inertia::render('Challenges/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'lab' => 'required|string|max:255',
            'kategori' => 'required|string|max:255',
            'judul' => 'required|string|max:255',
            'files.*' => 'nullable|file',
        ]);

        $path = "lab/{$validated['lab']}/{$validated['kategori']}/{$validated['judul']}";

        Challenge::create([
            'user_id' => $request->user()->id,
            'lab' => $validated['lab'],
            'kategori' => $validated['kategori'],
            'judul' => $validated['judul'],
            'path_folder' => $path,
        ]);

        Storage::disk('cyber')->put("{$path}/writeup.txt", $request->input('konten_writeup') ?? '');

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $file->storeAs($path, $file->getClientOriginalName(), 'cyber');
            }
        }

        return redirect()->route('challenges.index');
    }

    public function show(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);
        return Inertia::render('Challenges/Show', [
            'challenge' => $this->getChallengeDataWithFiles($challenge)
        ]);
    }

    public function edit(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);
        return Inertia::render('Challenges/Edit', [
            'challenge' => $this->getChallengeDataWithFiles($challenge)
        ]);
    }

    public function update(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        $validated = $request->validate([
            'lab' => 'required|string|max:255',
            'kategori' => 'required|string|max:255',
            'judul' => 'required|string|max:255',
            'files.*' => 'nullable|file',
        ]);

        $pathLama = $challenge->path_folder;
        $pathBaru = "lab/{$validated['lab']}/{$validated['kategori']}/{$validated['judul']}";

        if ($pathLama !== $pathBaru && Storage::disk('cyber')->exists($pathLama)) {
            Storage::disk('cyber')->move($pathLama, $pathBaru);
        }

        $challenge->update([
            'lab' => $validated['lab'],
            'kategori' => $validated['kategori'],
            'judul' => $validated['judul'],
            'path_folder' => $pathBaru,
        ]);

        Storage::disk('cyber')->put("{$pathBaru}/writeup.txt", $request->input('konten_writeup') ?? '');

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $file->storeAs($pathBaru, $file->getClientOriginalName(), 'cyber');
            }
        }

        return redirect()->route('challenges.show', $challenge->id);
    }

    public function destroy(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);
        if (Storage::disk('cyber')->exists($challenge->path_folder)) {
            Storage::disk('cyber')->deleteDirectory($challenge->path_folder);
        }
        $challenge->delete();
        return redirect()->route('challenges.index');
    }

    public function openFolder(Request $request, Challenge $challenge)
    {
        abort_if($challenge->user_id !== $request->user()->id, 403);

        $fullPath = config('filesystems.disks.cyber.root')
            . DIRECTORY_SEPARATOR
            . $challenge->path_folder;

        if (!is_dir($fullPath)) {
            return back()->with('error', 'Folder tidak ditemukan.');
        }

        exec('xdg-open ' . escapeshellarg($fullPath) . ' > /dev/null 2>&1 &');

        return back()->with('success', 'Folder berhasil dibuka.');
    }

    public function deleteFile(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);
        $filename = $request->input('filename');
        Storage::disk('cyber')->delete($challenge->path_folder . '/' . $filename);
        return back();
    }

    public function labs()
    {
        return response()->json(
            $this->getDirectoryNames('lab')
        );
    }

    public function categories(string $lab)
    {
        return response()->json(
            $this->getDirectoryNames("lab/$lab")
        );
    }   

    public function checkLab(string $lab)
    {
        return response()->json([
            'exists' => Storage::disk('cyber')->exists("lab/$lab")
        ]);
    }

    private function getChallengeDataWithFiles(Challenge $challenge)
    {
        $path = $challenge->path_folder . '/writeup.txt';
        $challenge->writeup = Storage::disk('cyber')->exists($path) ? Storage::disk('cyber')->get($path) : '';

        // Ambil daftar file di folder selain writeup.txt
        $files = [];
        if (Storage::disk('cyber')->exists($challenge->path_folder)) {
            $allFiles = Storage::disk('cyber')->files($challenge->path_folder);
            foreach ($allFiles as $file) {
                $basename = basename($file);
                if ($basename !== 'writeup.txt') $files[] = $basename;
            }
        }
        $challenge->lampiran = $files;
        return $challenge;
    }

    public function checkCategory(string $lab, string $category)
    {
        return response()->json([
            'exists' => Storage::disk('cyber')
                ->exists("lab/$lab/$category")
        ]);
    }

    public function checkTitle(Request $request)
    {
        $lab = $request->lab;
        $kategori = $request->kategori;
        $judul = $request->judul;

        return response()->json([
            'exists' => Storage::disk('cyber')
                ->exists("lab/$lab/$kategori/$judul")
        ]);
    }

    private function getDirectoryNames(string $path)
    {
        return collect(Storage::disk('cyber')->directories($path))
            ->map(fn($dir) => basename($dir))
            ->sortBy(fn($v) => strtolower($v))
            ->values();
    }
}
