import { describe, expect, it } from 'vitest';
import axios, { AxiosError } from 'axios';
import { aiAssistMessage } from '@/Utils/aiAssistMessage';

function axiosError(status: number | undefined, message?: string): AxiosError {
    return new AxiosError(
        'Request failed',
        undefined,
        undefined,
        undefined,
        status === undefined
            ? undefined
            : ({ status, data: message !== undefined ? { message } : {} } as any),
    );
}

describe('aiAssistMessage', () => {
    it('menampilkan pesan backend langsung (mis. 504 timeout)', () => {
        const e = axiosError(504, 'AI request timed out. Please try again.');
        expect(aiAssistMessage(e)).toBe('AI request timed out. Please try again.');
    });

    it('menampilkan pesan invalid response 502 dari backend', () => {
        expect(aiAssistMessage(axiosError(502, 'The AI response could not be processed. Please try again.'))).toBe(
            'The AI response could not be processed. Please try again.',
        );
    });

    it('menampilkan pesan unavailable 503 dari backend', () => {
        expect(aiAssistMessage(axiosError(503, 'Local AI service is unavailable.'))).toBe(
            'Local AI service is unavailable.',
        );
    });

    it('fallback 504 tanpa pesan server', () => {
        expect(aiAssistMessage(axiosError(504))).toBe('AI request timed out. Please try again.');
    });

    it('fallback 429 rate limit', () => {
        expect(aiAssistMessage(axiosError(429))).toContain('Terlalu banyak permintaan AI');
    });

    it('fallback 422 data tidak valid', () => {
        expect(aiAssistMessage(axiosError(422))).toBe(
            'Data yang dikirim tidak valid. Periksa reference yang dipilih.',
        );
    });

    it('fallback 500 dianggap kesalahan server', () => {
        expect(aiAssistMessage(axiosError(500))).toBe(
            'Terjadi kesalahan tak terduga di server. Coba lagi.',
        );
    });

    it('error jaringan tanpa response → pesan koneksi', () => {
        expect(aiAssistMessage(axiosError(undefined))).toContain('Tidak dapat terhubung');
    });

    it('error Ziggy → pesan endpoint tidak ditemukan', () => {
        expect(aiAssistMessage(new Error("Ziggy error: route 'challenges.ai.assist' is not in the route list"))).toContain(
            'Endpoint AI tidak ditemukan',
        );
    });

    it('fallback generic untuk input tak dikenal', () => {
        expect(aiAssistMessage('something')).toBe('AI tidak dapat memproses writeup saat ini.');
    });

    it('axios.isAxiosError menandai AxiosError nyata', () => {
        expect(axios.isAxiosError(axiosError(503))).toBe(true);
    });
});