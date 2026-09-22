<?php

namespace App\Http\Controllers;

use App\Models\Challenge;
use App\Services\ChallengeWriteupService;
use App\Services\WriteupAiAssistService;
use App\Services\StructuredWriteupAiAssistService;
use App\Services\ChallengeExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ChallengeController extends Controller
{
    public function __construct(
        private readonly ChallengeWriteupService $writeups,
        private readonly ChallengeExportService $exporter,
    ) {
    }

    public function index(Request $request)
    {
        $challenges = Challenge::where('user_id', $request->user()->id)->latest()->paginate(10);

        // Progress Question/Objective dihitung dari writeup.json (source of truth)
        // secara on-the-fly — tanpa kolom baru di database.
        foreach ($challenges as $challenge) {
            $data = $this->writeups->read($challenge);
            $challenge->question_stats = $this->writeups->questionStats($data);
        }

        return Inertia::render('Challenges/Index', [
            'challenges' => $challenges
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('Challenges/Create', [
            'referenceOptions' => $this->getReferenceOptions($request->user()->id),
        ]);
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

        // Nama folder hanya boleh karakter aman — mencegah path traversal
        // keluar dari root vault via "lab/../..".
        $invalid = $this->invalidPathSegments($validated);
        if ($invalid !== null) {
            return back()->withErrors([
                $invalid => 'Nama Lab / Kategori / Judul tidak boleh mengandung karakter path (/  \\  ..).',
            ])->withInput();
        }

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
            'challenge' => $this->getChallengeDataWithFiles($challenge),
            'referenceOptions' => $this->getReferenceOptions($request->user()->id, $challenge->id),
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

        $invalid = $this->invalidPathSegments($validated);
        if ($invalid !== null) {
            return back()->withErrors([
                $invalid => 'Nama Lab / Kategori / Judul tidak boleh mengandung karakter path (/  \\  ..).',
            ])->withInput();
        }

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
     * Export writeup on-demand (READ-ONLY).
     *
     * Membaca data dari writeup.json (source-of-truth), membangun dokumen di
     * memory, lalu mendownload — TIDAK pernah menulis ke folder challenge dan
     * tidak mengubah source JSON. Format di-whitelist ketat.
     */
    public function export(Request $request, Challenge $challenge, string $format)
    {
        if ($challenge->user_id !== $request->user()->id) {
            abort(403);
        }

        $format = strtolower(trim($format));
        $data = $this->writeups->read($challenge);
        $base = Str::slug($challenge->judul) !== '' ? Str::slug($challenge->judul) : 'writeup';

        return match ($format) {
            'json' => $this->downloadString(
                (string) json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $base . '.writeup.json',
                'application/json; charset=utf-8'
            ),
            'md' => $this->downloadString(
                $this->exporter->markdown($data, $challenge->judul),
                $base . '.writeup.md',
                'text/markdown; charset=utf-8'
            ),
            'txt' => $this->downloadString(
                $this->exporter->plainText($data, $challenge->judul),
                $base . '.writeup.txt',
                'text/plain; charset=utf-8'
            ),
            'docx' => $this->downloadString(
                $this->exporter->docx($data, $challenge->judul),
                $base . '.writeup.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ),
            'pdf' => $this->downloadString(
                $this->exporter->pdf($data, $challenge->judul),
                $base . '.writeup.pdf',
                'application/pdf'
            ),
            default => abort(404, 'Format export tidak didukung.'),
        };
    }

    private function downloadString(string $content, string $filename, string $mime)
    {
        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => $mime,
        ]);
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
            'current_challenge_id' => 'nullable|integer',
            'reference_ids' => 'nullable|array',
            'reference_ids.*' => 'integer',
        ]);

        $userId = $request->user()->id;
        $currentChallengeId = $validated['current_challenge_id'] ?? null;

        if ($currentChallengeId !== null) {
            Challenge::where('user_id', $userId)->findOrFail($currentChallengeId);
        }

        // Dedup dulu BARU hitung maksimal 5 (duplikat tidak menambah hitungan).
        $referenceIds = array_values(array_unique($validated['reference_ids'] ?? []));
        if (count($referenceIds) > 5) {
            return response()->json(['message' => 'Maksimal 5 reference writeup.'], 422);
        }

        if ($currentChallengeId !== null) {
            $referenceIds = array_values(array_filter(
                $referenceIds,
                fn (int $id): bool => $id !== (int) $currentChallengeId
            ));
        }

        $references = Challenge::where('user_id', $userId)
            ->whereIn('id', $referenceIds)
            ->get()
            ->map(fn (Challenge $reference): array => [
                'id' => $reference->id,
                'title' => $reference->judul,
                'lab' => $reference->lab,
                'kategori' => $reference->kategori,
                'writeup' => $this->writeups->read($reference),
            ])
            ->values()
            ->all();

        // Reference harus milik user ini dan benar-benar ada. ID yang tidak
        // ter-resolve ditolak agar data user lain tidak pernah ikut terbaca.
        if (count($references) !== count($referenceIds)) {
            return response()->json([
                'message' => 'Beberapa reference tidak tersedia atau bukan milik Anda.',
            ], 422);
        }

        try {
            $result = $ai->structure(
                (string) ($validated['title'] ?? ''),
                $validated['writeup'],
                $references
            );

            return response()->json([
                'writeup' => $result->writeup,
                'warnings' => $result->warnings,
            ]);
        } catch (\App\Exceptions\AiServiceException $e) {
            // Pesan user-friendly + status HTTP spesifik (timeout 504, invalid
            // response 502, model/service unavailable 503). Detail internal
            // hanya muncul di log service, bukan ke response.
            return response()->json(['message' => $e->friendlyMessage()], $e->httpStatus());
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
        if (!$this->validPathSegment($lab)) {
            return response()->json(['message' => 'Nama lab tidak valid.'], 422);
        }

        return response()->json(
            $this->getDirectoryNames("lab/$lab")
        );
    }

    public function checkLab(string $lab)
    {
        if (!$this->validPathSegment($lab)) {
            return response()->json(['message' => 'Nama lab tidak valid.'], 422);
        }

        return response()->json([
            'exists' => Storage::disk('cyber')->exists("lab/$lab")
        ]);
    }

    public function checkCategory(string $lab, string $category)
    {
        if (!$this->validPathSegment($lab) || !$this->validPathSegment($category)) {
            return response()->json(['message' => 'Nama lab/kategori tidak valid.'], 422);
        }

        return response()->json([
            'exists' => Storage::disk('cyber')
                ->exists("lab/$lab/$category")
        ]);
    }

    public function checkTitle(Request $request)
    {
        $lab = (string) $request->lab;
        $kategori = (string) $request->kategori;
        $judul = (string) $request->judul;

        if (!$this->validPathSegment($lab) || !$this->validPathSegment($kategori) || !$this->validPathSegment($judul)) {
            return response()->json(['message' => 'Nama lab/kategori/judul tidak valid.'], 422);
        }

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

    private function getReferenceOptions(int $userId, ?int $excludeId = null)
    {
        return Challenge::where('user_id', $userId)
            ->when($excludeId !== null, fn ($query) => $query->where('id', '!=', $excludeId))
            ->select('id', 'judul', 'lab', 'kategori')
            ->latest()
            ->get()
            ->map(fn (Challenge $challenge): array => [
                'id' => $challenge->id,
                'title' => $challenge->judul,
                'lab' => $challenge->lab,
                'kategori' => $challenge->kategori,
            ])
            ->values();
    }

    private function getDirectoryNames(string $path)
    {
        return collect(Storage::disk('cyber')->directories($path))
            ->map(fn($dir) => basename($dir))
            ->sortBy(fn($v) => strtolower($v))
            ->values();
    }

    /**
     * Nama folder vault hanya boleh karakter aman — cegah path traversal
     * ("..", "/", "\") pada lab/kategori/judul yang dipakai sebagai path.
     *
     * @param array<string, mixed> $values
     * @return string|null key pertama yang invalid, atau null bila semua valid
     */
    private function invalidPathSegments(array $values): ?string
    {
        foreach (['lab', 'kategori', 'judul'] as $key) {
            if (!$this->validPathSegment((string) ($values[$key] ?? ''))) {
                return $key;
            }
        }

        return null;
    }

    private function validPathSegment(string $segment): bool
    {
        $segment = trim($segment);

        if ($segment === '' || $segment === '.' || $segment === '..') {
            return false;
        }

        // Blokir karakter pemisah path & null byte — segmen lain (spasi, unicode)
        // tetap diperbolehkan agar folder lama "Challenge X" tidak rusak.
        return preg_match('#[\\\\/\0]#', $segment) !== 1;
    }
}