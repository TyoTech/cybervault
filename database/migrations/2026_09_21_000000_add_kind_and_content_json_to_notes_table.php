<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membedakan "Notes" (knowledge base) dan "Writeup" (dokumentasi analisis
 * terstruktur) dalam satu tabel `notes` yang sudah ada.
 *
 * Backward compatible:
 * - `kind` default 'note' → semua baris existing otomatis tetap note biasa.
 * - `content_json` nullable → hanya dipakai writeup.
 *
 * DOCX tetap source-of-truth untuk kind=note (tidak berubah sama sekali).
 * Untuk kind=writeup, `content_json` adalah edit-source; DOCX tetap ditulis
 * (di-render dari content_json) agar fitur existing seperti "Buka Folder"
 * dan AI content extractor tetap berfungsi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('kind', 16)->default('note')->after('slug')->index();
            $table->json('content_json')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn(['kind', 'content_json']);
        });
    }
};
