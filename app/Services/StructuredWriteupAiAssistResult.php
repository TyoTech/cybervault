<?php

namespace App\Services;

final class StructuredWriteupAiAssistResult
{
    /**
     * @param array<string,mixed> $writeup
     * @param list<string> $warnings
     */
    public function __construct(
        public readonly array $writeup,
        public readonly array $warnings = [],
    ) {}
}
