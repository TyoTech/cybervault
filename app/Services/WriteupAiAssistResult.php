<?php

namespace App\Services;

/**
 * Hasil AI Assist untuk Writeup — Phase 10.
 *
 * Nilai sudah DIVALIDASI oleh WriteupAiAssistService. Value object READ-ONLY;
 * AI hanya memberi saran, tidak pernah menulis database/file.
 */
final class WriteupAiAssistResult
{
    /**
     * @param list<array{category: string, text: string}> $suggestions
     */
    public function __construct(
        public readonly string $title,
        public readonly string $markdown,
        public readonly array $suggestions,
        public readonly string $note,
    ) {
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'markdown' => $this->markdown,
            'suggestions' => $this->suggestions,
            'note' => $this->note,
        ];
    }
}