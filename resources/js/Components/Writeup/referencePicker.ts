/**
 * Logika murni Reference Picker (dipisahkan dari komponen agar mudah dites).
 *
 * Selection disimpan sebagai array id bilangan bulat terpisah dari hasil
 * filter/search, sehingga pilihan checkbox tetap bertahan saat filter berubah.
 */

export interface ReferenceOption {
    id: number;
    title: string;
    lab: string;
    kategori: string;
}

export interface ReferenceFilters {
    search: string;
    lab: string;
    kategori: string;
}

export const MAX_REFERENCES = 5;

export const emptyFilters = (): ReferenceFilters => ({
    search: '',
    lab: '',
    kategori: '',
});

/** Ambil daftar lab unik (terurut, case-insensitive). */
export function referenceLabs(references: ReferenceOption[]): string[] {
    return [...new Map(references.map((r) => [r.lab, r.lab])).values()].sort((a, b) =>
        a.localeCompare(b),
    );
}

/**
 * Ambil daftar kategori unik untuk referensi tertentu.
 * Saat `lab` diisi, daftar kategori di-scope ke lab tersebut.
 */
export function referenceCategories(
    references: ReferenceOption[],
    lab: string,
): string[] {
    const scoped = lab !== '' ? references.filter((r) => r.lab === lab) : references;

    return [...new Map(scoped.map((r) => [r.kategori, r.kategori])).values()].sort((a, b) =>
        a.localeCompare(b),
    );
}

/** Filter + search reference. Murni — tidak mengubah selection. */
export function filterReferences(
    references: ReferenceOption[],
    filters: ReferenceFilters,
): ReferenceOption[] {
    const query = filters.search.trim().toLowerCase();

    return references.filter((r) => {
        if (filters.lab !== '' && r.lab !== filters.lab) {
            return false;
        }
        if (filters.kategori !== '' && r.kategori !== filters.kategori) {
            return false;
        }
        if (query === '') {
            return true;
        }

        return (
            r.title.toLowerCase().includes(query) ||
            r.lab.toLowerCase().includes(query) ||
            r.kategori.toLowerCase().includes(query)
        );
    });
}

/**
 * Toggle sebuah reference dalam selection. Maksimal MAX_REFERENCES.
 * Id selalu dikembalikan sebagai array baru (immutable).
 */
export function toggleReference(selected: number[], id: number): number[] {
    if (selected.includes(id)) {
        return selected.filter((existing) => existing !== id);
    }

    if (selected.length >= MAX_REFERENCES) {
        return selected;
    }

    return [...selected, id];
}

/** True jika sudah memilih maksimal reference. */
export function isReferenceMaxed(selected: number[]): boolean {
    return selected.length >= MAX_REFERENCES;
}

/** Reference yang dipilih tapi sudah tidak ada di daftar (mis. dihapus). */
export function pruneMissingSelection(
    selected: number[],
    references: ReferenceOption[],
): number[] {
    const available = new Set(references.map((r) => r.id));

    return selected.filter((id) => available.has(id));
}