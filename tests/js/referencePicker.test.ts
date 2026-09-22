import { describe, expect, it } from 'vitest';
import {
    emptyFilters,
    filterReferences,
    isReferenceMaxed,
    MAX_REFERENCES,
    pruneMissingSelection,
    referenceCategories,
    referenceLabs,
    ReferenceOption,
    toggleReference,
} from '@/Components/Writeup/referencePicker';

const refs: ReferenceOption[] = [
    { id: 1, title: 'SQLi di id', lab: 'THM', kategori: 'Web' },
    { id: 2, title: 'XSS stored', lab: 'THM', kategori: 'Web' },
    { id: 3, title: 'PrivEsc Linux', lab: 'HTB', kategori: 'Privilege Escalation' },
    { id: 4, title: 'Buffer Overflow', lab: 'HTB', kategori: 'Binary' },
    { id: 5, title: 'SQLi melalui login', lab: 'THM', kategori: 'Web' },
];

describe('referencePicker filter & search', () => {
    it('mengembalikan semua reference tanpa filter', () => {
        expect(filterReferences(refs, emptyFilters())).toHaveLength(5);
    });

    it('search mencocokkan judul', () => {
        const result = filterReferences(refs, { ...emptyFilters(), search: 'sqli' });
        expect(result.map((r) => r.id)).toEqual([1, 5]);
    });

    it('search case-insensitive dan mencocokkan lab/kategori', () => {
        const byLab = filterReferences(refs, { ...emptyFilters(), search: 'htb' });
        expect(byLab.map((r) => r.id)).toEqual([3, 4]);

        const byCategory = filterReferences(refs, { ...emptyFilters(), search: 'binary' });
        expect(byCategory.map((r) => r.id)).toEqual([4]);
    });

    it('filter lab membatasi hasil', () => {
        const result = filterReferences(refs, { ...emptyFilters(), lab: 'THM' });
        expect(result.map((r) => r.id)).toEqual([1, 2, 5]);
    });

    it('kombinasi filter lab + kategori', () => {
        const result = filterReferences(refs, { ...emptyFilters(), lab: 'THM', kategori: 'Web' });
        expect(result.map((r) => r.id)).toEqual([1, 2, 5]);
    });

    it('kategori yang tidak cocok dengan lab menghasilkan hasil kosong', () => {
        const result = filterReferences(refs, { ...emptyFilters(), lab: 'THM', kategori: 'Binary' });
        expect(result).toHaveLength(0);
    });

    it('filter bersifat murni — tidak memodifikasi daftar asli', () => {
        const before = refs.map((r) => r.id);
        filterReferences(refs, { ...emptyFilters(), lab: 'THM' });
        expect(refs.map((r) => r.id)).toEqual(before);
    });
});

describe('referencePicker selection persistence', () => {
    it('selection tidak bergantung pada hasil filter', () => {
        // Simulasi: pilih id 3 (HTB), lalu ganti filter ke THM.
        // Seluruh id terpilih dipertahankan di state terpisah.
        const selected = toggleReference([], 3);
        expect(selected).toEqual([3]);

        const filtered = filterReferences(refs, { ...emptyFilters(), lab: 'THM' });
        expect(filtered.map((r) => r.id)).not.toContain(3);

        // State selection tetap utuh meskipun referensi tidak terlihat.
        const restored = pruneMissingSelection(selected, refs);
        expect(restored).toEqual([3]);
    });

    it('toggle menambah dan menghapus id', () => {
        let selected: number[] = [];
        selected = toggleReference(selected, 1);
        selected = toggleReference(selected, 2);
        expect(selected).toEqual([1, 2]);

        selected = toggleReference(selected, 1);
        expect(selected).toEqual([2]);
    });

    it('tidak melebihi MAX_REFERENCES', () => {
        let selected: number[] = [];
        for (let id = 1; id <= 6; id++) {
            selected = toggleReference(selected, id);
        }
        expect(selected).toHaveLength(MAX_REFERENCES);
        expect(isReferenceMaxed(selected)).toBe(true);
    });

    it('toggle saat sudah maksimal tidak menambah reference baru', () => {
        let selected: number[] = [1, 2, 3, 4, 5];
        expect(isReferenceMaxed(selected)).toBe(true);

        // Menambah id baru dibatalkan, tetapi mencabut lalu menambah tetap valid.
        expect(toggleReference(selected, 6)).toEqual([1, 2, 3, 4, 5]);
        selected = toggleReference(selected, 5);
        expect(selected).toEqual([1, 2, 3, 4]);
        expect(toggleReference(selected, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('pruneMissingSelection menghapus id yang tidak lagi tersedia', () => {
        const selected = [1, 99, 3];
        const available = refs.filter((r) => r.id !== 99);
        expect(pruneMissingSelection(selected, available)).toEqual([1, 3]);
    });

    it('filter berubah beberapa kali: selection tetap utuh', () => {
        let selected: number[] = [1, 3];

        filterReferences(refs, { ...emptyFilters(), search: 'sqli' });
        filterReferences(refs, { ...emptyFilters(), lab: 'HTB' });
        filterReferences(refs, { ...emptyFilters(), kategori: 'Web' });

        expect(pruneMissingSelection(selected, refs)).toEqual([1, 3]);
        expect(selected).toEqual([1, 3]);
    });
});

describe('referencePicker lab/kategori lists', () => {
    it('referenceLabs unik & terurut', () => {
        expect(referenceLabs(refs)).toEqual(['HTB', 'THM']);
    });

    it('referenceCategories di-scope ke lab saat lab dipilih', () => {
        expect(referenceCategories(refs, 'HTB')).toEqual(['Binary', 'Privilege Escalation']);
        expect(referenceCategories(refs, 'THM')).toEqual(['Web']);
        expect(referenceCategories(refs, '')).toHaveLength(3);
    });
});