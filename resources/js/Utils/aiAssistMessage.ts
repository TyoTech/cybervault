import axios from 'axios';

/**
 * Pemetaan error "AI Writeup Assistant" (challenges.ai.assist) menjadi pesan
 * user-friendly.
 *
 * Backend StructuredWriteupAiAssistService mengirim {message} yang sudah aman
 * dipakai apa adanya. Fallback per-status dipakai bila request gagal sebelum
 * server mengirim JSON (jaringan / route Ziggy / rate limit 429).
 */
const GENERIC_ERROR = 'AI tidak dapat memproses writeup saat ini.';
const NETWORK_ERROR = 'Tidak dapat terhubung ke layanan AI lokal. Coba lagi.';

export function aiAssistMessage(e: unknown): string {
    if (e instanceof Error && e.message.startsWith('Ziggy error')) {
        return 'Endpoint AI tidak ditemukan. Muat ulang halaman, lalu coba lagi.';
    }

    if (axios.isAxiosError(e)) {
        const serverMessage = (e.response?.data as { message?: unknown } | undefined)?.message;

        if (typeof serverMessage === 'string' && serverMessage !== '') {
            return serverMessage;
        }

        switch (e.response?.status) {
            case 422:
                return 'Data yang dikirim tidak valid. Periksa reference yang dipilih.';
            case 429:
                return 'Terlalu banyak permintaan AI. Tunggu sebentar, lalu coba lagi.';
            case 419:
                return 'Sesi berakhir. Muat ulang halaman, lalu coba lagi.';
            case 504:
                return 'AI request timed out. Please try again.';
            case 502:
                return 'AI merespons tidak sesuai format. Coba lagi.';
            case 503:
                return 'Layanan AI lokal sedang tidak tersedia.';
            case 500:
                return 'Terjadi kesalahan tak terduga di server. Coba lagi.';
            case undefined:
                return NETWORK_ERROR;
            default:
                return GENERIC_ERROR;
        }
    }

    return GENERIC_ERROR;
}