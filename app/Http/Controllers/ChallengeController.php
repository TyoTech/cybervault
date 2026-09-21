<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Services\ChallengeWriteupService;
use App\Services\WriteupAiAssistService;
use App\Services\StructuredWriteupAiAssistService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    public function __construct(
        private readonly ChallengeWriteupService $writeups,
    ) {
    }

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
            'writeup' => 'nullable|array',
        ]);

        $path = "lab/{$validated['lab']}/{$validated['kategori']}/{$validated['judul']}";

        $challenge = Challenge::create([
            'user_id' => $request->user()->id,
            'lab' => $validated['lab'],
            'kategori' => $validated['kategori'],
            'judul' => $validated['judul'],
            'path_folder' => $path,
        ]);

        Storage::disk('cyber')->makeDirectory($path);

        // Structured writeup (JSON source-of-truth) + artefak .txt.
        // Dukungan konten_writeup lama dipertahankan untuk kompatibilitas.
        if (is_array($request->input('writeup'))) {
            $this->writeups->save($challenge, $request->input('writeup'));
        } elseif ($request->filled('konten_writeup')) {
            $this->writeups->save($challenge, ['notes' => (string) $request->input('konten_writeup')]);
        } else {
            $this->writeups->save($challenge, []);
        }

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $file->storeAs($path, $file->getClientOriginalName(), 'cyber');
            }
        }

        return redirect()->route('challenges.show', $challenge->id);
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
            'writeup' => 'nullable|array',
        ]);

        $pathLama = $challenge->path_folder;
        $pathBaru = "lab/{$validated['lab']}/{$validated['kategori']}/{$validated['judul']}";

        if ($pathLama !== $pathBaru) {
            if (Storage::disk('cyber')->exists($pathLama)) {
                Storage::disk('cyber')->move($pathLama, $pathBaru);
            } else {
                Storage::disk('cyber')->makeDirectory($pathBaru);
            }
        }

        $challenge->update([
            'lab' => $validated['lab'],
            'kategori' => $validated['kategori'],
            'judul' => $validated['judul'],
            'path_folder' => $pathBaru,
        ]);

        // Structured writeup + artefak .txt (kompatibel dengan payload lama juga).
        if (is_array($request->input('writeup'))) {
            $this->writeups->save($challenge, $request->input('writeup'));
        } elseif ($request->filled('konten_writeup')) {
            $this->writeups->save($challenge, ['notes' => (string) $request->input('konten_writeup')]);
        }

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
        if ($challenge->user_id !== $request->user()->id) {
            abort(403);
        }

        $fullPath = Storage::disk('cyber')->path($challenge->path_folder);

        if (!is_dir($fullPath)) {
            abort(404, 'Folder challenge tidak ditemukan.');
        }

        exec('xdg-open ' . escapeshellarg($fullPath) . ' > /dev/null 2>&1 &');

        return back();
    }

    public function deleteFile(Request $request, Challenge $challenge)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        // basename() + whitelist karakter untuk mencegah path traversal.
        // writeup.json & writeup.txt adalah source-of-truth/artefak → tidak bisa dihapus.
        $filename = basename((string) $request->input('filename'));

        if ($filename === '' || $filename === '.' || $filename === '..'
            || $filename === 'writeup.txt'
            || $filename === 'writeup.json'
            || !preg_match('/^[A-Za-z0-9._-]+$/', $filename)) {
            return back()->with('error', 'Nama file tidak valid.');
        }

        Storage::disk('cyber')->delete($challenge->path_folder . '/' . $filename);
        return back();
    }

    /**
     * AI Assist — SUGGESTION ONLY.
     *
     * - READ-ONLY terhadap writeup: service hanya menghasilkan saran; tidak ada
     *   penulisan database/file di sini. Penyimpanan tetap lewat challenges.update.
     * - ownership check + throttle route (5/menit).
     */

    /**
     * Structured AI Assist untuk Create/Edit Writeup.
     *
     * Read-only: menerima draft dari client, meminta Ollama menyusunnya,
     * lalu mengembalikan preview. Tidak membaca/menulis challenge storage.
     */
    public function assistStructured(
        Request $request,
        StructuredWriteupAiAssistService $ai
    ) {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'writeup' => 'required|array',
        ]);

        try {
            $result = $ai->structure(
                (string) ($validated['title'] ?? ''),
                $validated['writeup']
            );

            return response()->json([
                'writeup' => $result->writeup,
                'warnings' => $result->warnings,
            ]);
        } catch (\Throwable $e) {
            \Log::error('Structured AI controller failed', [
                'class' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'AI tidak dapat memproses writeup saat ini.',
                'debug' => app()->environment('local')
                    ? $e->getMessage()
                    : null,
            ], 502);
        }
    }

    public function assist(Request $request, Challenge $challenge, WriteupAiAssistService $ai)
    {
        if ($challenge->user_id !== $request->user()->id) abort(403);

        $data = $this->writeups->read($challenge);
        $markdown = $this->writeups->toMarkdown($data);

        if (trim($markdown) === '') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'writeup' => 'Writeup masih kosong — tidak ada konten yang bisa dibantu.',
            ]);
        }

        try {
            $result = $ai->assist($challenge->judul, $markdown);
        } catch (\App\Exceptions\AiServiceException $e) {
            return response()->json(['message' => $e->friendlyMessage()], $e->httpStatus());
        }

        return response()->json(['data' => $result->toArray()]);
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

    private function getChallengeDataWithFiles(Challenge $challenge)
    {
        // Structured writeup (source-of-truth). Data lama writeup.txt dibaca
        // ulang secara READ-ONLY (masuk ke field `notes`) sampai user Save.
        $challenge->writeup_data = $this->writeups->read($challenge);
        $challenge->writeup_markdown = $this->writeups->toMarkdown($challenge->writeup_data);

        // Ambil daftar file di folder selain source-of-truth & artefak.
        $files = [];
        if (Storage::disk('cyber')->exists($challenge->path_folder)) {
            $allFiles = Storage::disk('cyber')->files($challenge->path_folder);
            foreach ($allFiles as $file) {
                $basename = basename($file);
                if (! in_array($basename, ['writeup.txt', 'writeup.json'], true)) {
                    $files[] = $basename;
                }
            }
        }
        $challenge->lampiran = $files;
        return $challenge;
    }

    private function getDirectoryNames(string $path)
    {
        return collect(Storage::disk('cyber')->directories($path))
            ->map(fn($dir) => basename($dir))
            ->sortBy(fn($v) => strtolower($v))
            ->values();
    }
}