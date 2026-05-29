<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function store(Request $request)
    {
        // Validasi: Maksimal 10MB, batasi ekstensi file yang aman
        $request->validate([
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,pdf,zip,txt,pcap,bin',
        ]);

        $file = $request->file('file');

        // Simpan ke storage/app/public/attachments dengan nama hash acak
        $path = $file->store('attachments', 'public');

        // Kembalikan URL absolut ke frontend
        return response()->json([
            'url' => asset('storage/' . $path),
            'name' => $file->getClientOriginalName(),
        ]);
    }
}
