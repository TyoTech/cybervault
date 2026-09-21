<?php

namespace App\Services;

/**
 * Hasil saran perbaikan writeup dari AI (Ollama) — Phase 4.
 *
 * Nilai sudah DIVALIDASI oleh AiWriteupService (tipe, panjang, jumlah item).
 * Value object READ-ONLY; AI hanya memberi saran, tidak pernah menulis database.
 */
final class AiWriteupSuggestion
{
    /**
     * @param list<string> $suggestions saran perbaikan singkat (maks 20 item)
     */
    public function __construct(
        public readonly string $title,
        public readonly string $markdown,
        public readonly array $suggestions,
    ) {
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'markdown' => $this->markdown,
            'suggestions' => $this->suggestions,
        ];
    }
}