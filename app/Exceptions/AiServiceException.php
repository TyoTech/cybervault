<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Kegagalan service AI lokal (Ollama).
 *
 * Exception ini TIDAK pernah membawa isi note, prompt, atau path internal;
 * hanya kategori error + throwable asli (untuk log internal, tanpa pesan mentah
 * ke user). Controller mengubah `friendlyMessage()` menjadi pesan user-friendly.
 */
class AiServiceException extends RuntimeException
{
    public const UNAVAILABLE = 'unavailable';
    public const TIMEOUT = 'timeout';
    public const MODEL_UNAVAILABLE = 'model_unavailable';
    public const INVALID_RESPONSE = 'invalid_response';

    public function __construct(
        public readonly string $kind,
        string $message = '',
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message !== '' ? $message : $kind, 0, $previous);
    }

    public function httpStatus(): int
    {
        return match ($this->kind) {
            self::TIMEOUT => 504,
            self::INVALID_RESPONSE => 502,
            default => 503,
        };
    }

    /**
     * Pesan aman untuk user — tanpa stack trace, path filesystem, atau detail internal.
     */
    public function friendlyMessage(): string
    {
        return match ($this->kind) {
            self::TIMEOUT => 'AI request timed out. Please try again.',
            self::MODEL_UNAVAILABLE => 'Configured AI model is unavailable.',
            self::INVALID_RESPONSE => 'The AI response could not be processed. Please try again.',
            default => 'Local AI service is unavailable.',
        };
    }
}