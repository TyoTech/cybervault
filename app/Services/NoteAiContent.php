<?php

namespace App\Services;

/**
 * Hasil ekstraksi content Note yang siap diproses AI (Phase 4).
 *
 * Value object READ-ONLY: semua properti final, tidak pernah dimodifikasi
 * setelah dibuat. DOCX tetap source-of-truth; objek ini hanyalah representasi
 * teks hasil transformasi.
 */
final class NoteAiContent
{
    public function __construct(
        public readonly string $title,
        public readonly string $plainText,
        public readonly string $markdown,
    ) {
    }

    /**
     * Representasi array (untuk log, payload API, atau debugging).
     */
    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'content' => $this->plainText,
            'plain_text' => $this->plainText,
            'markdown' => $this->markdown,
            'format' => 'markdown',
        ];
    }
}