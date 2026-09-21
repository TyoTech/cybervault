import axios from 'axios';

/**
 * Pemetaan error "Improve with AI" menjadi pesan user-friendly.
 *
 * Aturan:
 * - Backend AI (AiServiceException) SELALU mengirim {message} user-friendly
 *   sesuai HTTP status (403/422/429/502/503/504) — pesan ini dipakai apa adanya.
 * - Error Ziggy (route tidak ada di daftar route client) dan error jaringan
 *   BUKAN masalah Ollama — jangan disembunyikan jadi "service unavailable".
 * - 500 tanpa pesan JSON dari server dipisahkan dari 503 (AI unavailable).
 */
const GENERIC_ERROR = 'Local AI service is unavailable.';
const NETWORK_ERROR = 'Tidak dapat terhubung ke layanan AI lokal. Coba lagi.';

export function improveErrorMessage(e: unknown): string {
    // Error Ziggy: route tidak dikenal di daftar route client (mis. ziggy.js
    // stale) — bukan masalah AI/Ollama, beri pesan yang jujur.
    if (e instanceof Error && e.message.startsWith('Ziggy error')) {
        return 'Endpoint AI tidak ditemukan. Muat ulang halaman, lalu coba lagi.';
    }

    if (axios.isAxiosError(e)) {
        const serverMessage = (e.response?.data as { message?: unknown } | undefined)?.message;

        // Backend selalu mengirim message untuk error terkelola (403/422/429/502/503/504).
        if (typeof serverMessage === 'string' && serverMessage !== '') {
            return serverMessage;
        }

        // Fallback per-status bila request gagal sebelum server mengirim JSON.
        switch (e.response?.status) {
            case 403:
                return 'Anda tidak memiliki akses ke catatan ini.';
            case 422:
                return 'Catatan kosong atau data tidak valid.';
            case 429:
                return 'Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.';
            case 419:
                return 'Sesi berakhir. Muat ulang halaman, lalu coba lagi.';
            case 500:
                return 'Terjadi kesalahan tak terduga di server. Coba lagi.';
            case undefined: // request tidak pernah sampai ke server
                return NETWORK_ERROR;
            default:
                return GENERIC_ERROR;
        }
    }

    return GENERIC_ERROR;
}