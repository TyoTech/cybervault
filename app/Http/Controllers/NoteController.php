<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Note;
use App\Services\AiWriteupService;
use App\Services\NoteContentExtractor;
use App\Services\NoteDocumentService;
use App\Services\WriteupContent;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Shared\Html;

class NoteController extends Controller
{
    /**
     * Whitelist MIME image yang didukung.
     * Ekstensi keluar HANYA dari whitelist ini sehingga tidak mungkin mengandung
     * karakter path traversal ('/' atau '..').
     */
    private const SUPPORTED_IMAGE_MIMES = [
        'png' => 'png',
        'jpeg' => 'jpg',
        'jpg' => 'jpg',
        'gif' => 'gif',
        'webp' => 'webp',
    ];

    public function __construct(
        private readonly NoteDocumentService $documents,
    ) {
    }

    public function index(Request $request)
    {
        $kind = $request->string('kind')->toString();
        $kind = in_array($kind, [Note::KIND_NOTE, Note::KIND_WRITEUP], true) ? $kind : null;

        $notes = Note::where('user_id', $request->user()->id)
            ->when($kind, fn ($q) => $q->where('kind', $kind))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Notes/Index', [
            'notes' => $notes,
            'kind' => $kind,
        ]);
    }

    public function create(Request $request)
    {
        if ($request->string('kind')->toString() === Note::KIND_WRITEUP) {
            return Inertia::render('Writeups/Create');
        }

        return Inertia::render('Notes/Create');
    }

    public function store(Request $request)
    {
        $kind = $request->string('kind')->toString() === Note::KIND_WRITEUP
            ? Note::KIND_WRITEUP
            : Note::KIND_NOTE;

        $rules = ['title' => 'required|string|max:255'];

        if ($kind === Note::KIND_WRITEUP) {
            $rules += WriteupContent::rules();
        } else {
            $rules['content'] = 'required|string';
        }

        $validated = $request->validate($rules);

        $writeup = null;
        if ($kind === Note::KIND_WRITEUP) {
            $writeup = WriteupContent::fromArray($validated['writeup']);
            if ($writeup->isEmpty()) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'writeup' => 'Writeup belum memiliki isi. Isi minimal satu bagian.'
                ]);
            }
        }

        $slug = Str::slug($validated['title']);
        $path = ($kind === Note::KIND_WRITEUP ? 'writeups' : 'notes') . "/{$slug}";

        // Validasi: Tolak jika folder sudah ada
        if (Storage::disk('cyber')->exists($path)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'title' => 'Judul ini sudah ada. Silakan gunakan judul lain agar folder tidak bentrok.'
            ]);
        }

        Note::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'slug' => $slug,
            'kind' => $kind,
            'content' => 'DOCX',
            'content_json' => $writeup?->data,
            'path_folder' => $path,
        ]);

        Storage::disk('cyber')->makeDirectory($path);
        $fullPath = Storage::disk('cyber')->path($path);

        // kind=note: HTML dari editor (existing flow).
        // kind=writeup: HTML di-render dari structured content (DOCX = artifact readable).
        $html = $writeup ? $writeup->toHtml() : $validated['content'];
        $this->saveToDocx($html, $fullPath . '/catatan.docx', $fullPath);

        return redirect()->route('notes.index', ['kind' => $kind]);
    }
    
    public function show(Note $note)
    {
        if ($note->user_id !== request()->user()->id) abort(403);

        if ($note->isWriteup()) {
            return Inertia::render('Writeups/Show', ['note' => $note]);
        }

        $note->content = $this->documents->readHtmlFromDocx(Storage::disk('cyber')->path("{$note->path_folder}/catatan.docx"));

        return Inertia::render('Notes/Show', ['note' => $note]);
    }

    public function edit(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) abort(403);

        if ($note->isWriteup()) {
            return Inertia::render('Writeups/Edit', ['note' => $note]);
        }

        $note->content = $this->documents->readHtmlFromDocx(Storage::disk('cyber')->path("{$note->path_folder}/catatan.docx"));

        return Inertia::render('Notes/Edit', ['note' => $note]);
    }

    public function update(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) abort(403);

        if ($note->isWriteup()) {
            return $this->updateWriteup($request, $note);
        }

        $validated = $request->validate(['title' => 'required|string|max:255', 'content' => 'required|string']);
        $note->update(['title' => $validated['title']]);

        $fullPath = Storage::disk('cyber')->path($note->path_folder);

        // Catat file img_* lama SEBELUM menulis ulang DOCX, supaya file img_* baru
        // yang dibuat oleh saveToDocx() di bawah tidak ikut terhapus.
        $oldImages = $this->existingImages($note->path_folder);

        $this->saveToDocx($validated['content'], $fullPath . '/catatan.docx', $fullPath);

        // DOCX baru hanya mereferensikan file img_* yang baru saja ditulis (nama uniqid baru),
        // sehingga semua file img_* dari versi sebelumnya sudah tidak dipakai → aman dihapus.
        foreach ($oldImages as $oldImage) {
            Storage::disk('cyber')->delete($note->path_folder . '/' . $oldImage);
        }

        return redirect()->route('notes.show', $note->id);
    }

    /**
     * Update khusus writeup: content_json adalah edit-source; DOCX ditulis ulang
     * dari structured content agar fitur "Buka Folder" & AI extractor tetap jalan.
     */
    private function updateWriteup(Request $request, Note $note)
    {
        $validated = $request->validate(
            ['title' => 'required|string|max:255'] + WriteupContent::rules()
        );

        $writeup = WriteupContent::fromArray($validated['writeup'] ?? []);
        if ($writeup->isEmpty()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'writeup' => 'Writeup belum memiliki isi. Isi minimal satu bagian.'
            ]);
        }

        $note->update(['title' => $validated['title'], 'content_json' => $writeup->data]);

        $fullPath = Storage::disk('cyber')->path($note->path_folder);
        $this->saveToDocx($writeup->toHtml(), $fullPath . '/catatan.docx', $fullPath);

        return redirect()->route('notes.show', $note->id);
    }

    public function destroy(Note $note)
    {
        if ($note->user_id !== request()->user()->id) abort(403);

        if (Storage::disk('cyber')->exists($note->path_folder)) {
            Storage::disk('cyber')->deleteDirectory($note->path_folder);
        }
        $note->delete();

        return redirect()->route('notes.index');
    }

    public function openFolder(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) abort(403);

        $fullPath = Storage::disk('cyber')->path($note->path_folder);

        exec('xdg-open ' . escapeshellarg($fullPath) . ' > /dev/null 2>&1 &');

        return back();
    }

    /**
     * "Improve Writeup" (Phase 4): minta saran perbaikan dari AI lokal (Ollama).
     *
     * READ-ONLY terhadap note: AI hanya menghasilkan suggestion; tidak ada
     * penulisan database/DOCX di sini. Penyimpanan tetap lewat flow notes.update.
     */
    public function improve(
        Request $request,
        Note $note,
        NoteContentExtractor $extractor,
        AiWriteupService $ai,
    ) {
        if ($note->user_id !== $request->user()->id) abort(403);

        $content = $extractor->getAiContent($note);

        if (trim($content->markdown) === '' && trim($content->plainText) === '') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'content' => 'Catatan kosong — tidak ada konten yang bisa diperbaiki.',
            ]);
        }

        try {
            $suggestion = $ai->improve($content);
        } catch (\App\Exceptions\AiServiceException $e) {
            // Pesan user-friendly & status HTTP; detail internal hanya di log service.
            return response()->json(['message' => $e->friendlyMessage()], $e->httpStatus());
        }

        return response()->json(['data' => $suggestion->toArray()]);
    }

    private function saveToDocx(string $html, string $filePath, string $folderPath)
    {
        // Ubah gambar Base64 menjadi file fisik.
        // MIME divalidasi ketat terhadap whitelist dan isi dicek magic bytes-nya,
        // sehingga MIME manipulatif (mis. "x/../../etc", "svg+xml") TIDAK pernah ditulis ke disk.
        $html = preg_replace_callback('/<img([^>]+)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/i', function ($matches) use ($folderPath) {
            $mime = strtolower($matches[2]);

            if (!isset(self::SUPPORTED_IMAGE_MIMES[$mime])) {
                return ''; // MIME tidak dikenal → buang seluruh tag img, jangan tulis file apa pun
            }

            $ext = self::SUPPORTED_IMAGE_MIMES[$mime];
            $data = base64_decode($matches[3], true);

            if ($data === false || !$this->matchesImageMagicBytes($mime, $data)) {
                return ''; // isi tidak sesuai MIME yang diklaim → buang tag img
            }

            $imgName = 'img_' . uniqid() . '.' . $ext;
            $imgPath = $folderPath . '/' . $imgName;

            file_put_contents($imgPath, $data);
            return '<img' . $matches[1] . 'src="' . $imgPath . '"' . $matches[4] . '/>';
        }, $html);

        $html = preg_replace('/<br\s*\/?>/i', '<br/>', $html);
        $html = preg_replace('/<hr\s*\/?>/i', '<hr/>', $html);
        $html = preg_replace('/<img([^>]+)(?<!\/)>/i', '<img$1/>', $html);

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        libxml_use_internal_errors(true);
        Html::addHtml($section, $html, false, false);
        libxml_clear_errors();

        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($filePath);
    }

    /**
     * Cek magic bytes hasil decode agar konten sesuai dengan MIME yang diklaim.
     */
    private function matchesImageMagicBytes(string $mime, string $data): bool
    {
        return match ($mime) {
            'png' => str_starts_with($data, "\x89PNG\r\n\x1a\n"),
            'jpg', 'jpeg' => str_starts_with($data, "\xFF\xD8\xFF"),
            'gif' => str_starts_with($data, 'GIF87a') || str_starts_with($data, 'GIF89a'),
            'webp' => str_starts_with($data, 'RIFF') && substr($data, 8, 4) === 'WEBP',
            default => false,
        };
    }

    /**
     * Daftar file di dalam folder note selain catatan.docx (digunakan untuk cleanup orphan).
     */
    private function existingImages(string $path): array
    {
        return collect(Storage::disk('cyber')->files($path))
            ->map(fn ($file) => basename($file))
            ->filter(fn ($file) => $file !== 'catatan.docx')
            ->values()
            ->all();
    }
}
