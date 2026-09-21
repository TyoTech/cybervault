import { describe, expect, it } from 'vitest';
import axios, { AxiosError } from 'axios';
import { improveErrorMessage } from '@/Utils/aiImproveError';

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

describe('improveErrorMessage', () => {
    it('menampilkan pesan backend 502 invalid_response, bukan pesan generic', () => {
        const e = axiosError(502, 'The AI response could not be processed. Please try again.');
        expect(improveErrorMessage(e)).toBe(
            'The AI response could not be processed. Please try again.',
        );
    });

    it('menampilkan pesan backend 503 unavailable', () => {
        const e = axiosError(503, 'Local AI service is unavailable.');
        expect(improveErrorMessage(e)).toBe('Local AI service is unavailable.');
    });

    it('tidak menyembunyikan error Ziggy (route hilang) jadi service unavailable', () => {
        const e = new Error("Ziggy error: route 'notes.ai.improve' is not in the route list.");
        expect(improveErrorMessage(e)).toContain('Endpoint AI tidak ditemukan');
    });

    it('membedakan 403 tanpa pesan server', () => {
        expect(improveErrorMessage(axiosError(403))).toBe(
            'Anda tidak memiliki akses ke catatan ini.',
        );
    });

    it('membedakan 429 tanpa pesan server', () => {
        expect(improveErrorMessage(axiosError(429))).toContain('Terlalu banyak permintaan');
    });

    it('membedakan 500 tanpa pesan server dari 503', () => {
        expect(improveErrorMessage(axiosError(500))).toBe(
            'Terjadi kesalahan tak terduga di server. Coba lagi.',
        );
    });

    it('memetakan kegagalan jaringan (tanpa response) ke pesan koneksi', () => {
        expect(improveErrorMessage(axiosError(undefined))).toContain('Tidak dapat terhubung');
    });

    it('fallback generic untuk error tak dikenal', () => {
        expect(improveErrorMessage('something')).toBe('Local AI service is unavailable.');
    });

    it('axios.isAxiosError menandai AxiosError nyata', () => {
        expect(axios.isAxiosError(axiosError(502))).toBe(true);
    });
});