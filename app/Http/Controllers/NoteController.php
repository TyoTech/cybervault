<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Note;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Shared\Html;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Notes/Index', [
            'notes' => Note::where('user_id', $request->user()->id)->latest()->paginate(10)
        ]);
    }

    public function create()
    {
        return Inertia::render('Notes/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        $slug = Str::slug($validated['title']);
        $path = "notes/{$slug}";

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
            'content' => 'DOCX',
            'path_folder' => $path,
        ]);

        Storage::disk('cyber')->makeDirectory($path);
        $fullPath = Storage::disk('cyber')->path($path);
        $this->saveToDocx($validated['content'], $fullPath . '/catatan.docx', $fullPath);

        return redirect()->route('notes.index');
    }
    
    public function show(Note $note)
    {
        if ($note->user_id !== request()->user()->id) abort(403);
        $note->content = $this->readFromDocx(Storage::disk('cyber')->path("{$note->path_folder}/catatan.docx"));

        return Inertia::render('Notes/Show', ['note' => $note]);
    }

    public function edit(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) abort(403);
        $note->content = $this->readFromDocx(Storage::disk('cyber')->path("{$note->path_folder}/catatan.docx"));

        return Inertia::render('Notes/Edit', ['note' => $note]);
    }

    public function update(Request $request, Note $note)
    {
        if ($note->user_id !== $request->user()->id) abort(403);
        $validated = $request->validate(['title' => 'required|string|max:255', 'content' => 'required|string']);
        $note->update(['title' => $validated['title']]);

        $fullPath = Storage::disk('cyber')->path($note->path_folder);
        $this->saveToDocx($validated['content'], $fullPath . '/catatan.docx', $fullPath);

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

    private function saveToDocx(string $html, string $filePath, string $folderPath)
    {
        // Ubah gambar Base64 menjadi file fisik
        $html = preg_replace_callback('/<img([^>]+)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/i', function ($matches) use ($folderPath) {
            $ext = $matches[2] === 'jpeg' ? 'jpg' : $matches[2];
            $data = base64_decode($matches[3]);
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

    private function readFromDocx(string $filePath)
    {
        if (!file_exists($filePath)) return '';
        $phpWord = IOFactory::load($filePath, 'Word2007');
        $writer = IOFactory::createWriter($phpWord, 'HTML');
        $temp = tempnam(sys_get_temp_dir(), 'docx');
        $writer->save($temp);
        $html = file_get_contents($temp);
        unlink($temp);

        preg_match('/<body>(.*)<\/body>/is', $html, $matches);
        return $matches[1] ?? $html;
    }
}
