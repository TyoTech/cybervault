import { useEffect, useMemo, useState } from 'react';
import Input from '@/Components/UI/Input';
import Select from '@/Components/UI/Select';
import { Search, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/Utils/cn';
import {
    emptyFilters,
    filterReferences,
    isReferenceMaxed,
    MAX_REFERENCES,
    referenceCategories,
    referenceLabs,
    ReferenceFilters,
    ReferenceOption,
    toggleReference,
} from '@/Components/Writeup/referencePicker';

interface ReferencePickerProps {
    references: ReferenceOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    /** True saat request AI sedang diproses — seluruh kontrol dinonaktifkan. */
    disabled?: boolean;
    loading?: boolean;
}

/**
 * Picker reference writeup:
 * - daftar checkbox (bukan select bertumpuk):
 * - search by judul/lab/kategori;
 * - filter Lab dan Kategori;
 * - maksimal MAX_REFERENCES (5);
 * - counter "X / 5 selected";
 * - selection disimpan sebagai array id yang TIDAK bergantung pada hasil
 *   filter — pilihan tetap bertahan saat search/filter berubah;
 * - state kosong dan pemuatan yang ringan.
 */
export default function ReferencePicker({
    references,
    selectedIds,
    onChange,
    disabled = false,
    loading = false,
}: ReferencePickerProps) {
    const [filters, setFilters] = useState<ReferenceFilters>(emptyFilters());

    const labs = useMemo(() => referenceLabs(references), [references]);
    const categories = useMemo(
        () => referenceCategories(references, filters.lab),
        [references, filters.lab],
    );

    const visible = useMemo(
        () => filterReferences(references, filters),
        [references, filters],
    );

    // Saat filter Lab berubah, reset filter Kategori yang tidak lagi valid.
    useEffect(() => {
        if (filters.kategori !== '' && !categories.includes(filters.kategori)) {
            setFilters((current) => ({ ...current, kategori: '' }));
        }
    }, [filters.kategori, categories]);

    const atMax = isReferenceMaxed(selectedIds);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-medium text-strong">
                    Reference (opsional — hanya konteks untuk AI)
                </label>
                <span
                    className={cn(
                        'rounded-md border px-2 py-0.5 font-mono text-[11px]',
                        atMax
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-edge text-muted',
                    )}
                >
                    {selectedIds.length} / {MAX_REFERENCES} selected
                </span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <Input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="Cari berdasarkan judul, lab, atau kategori…"
                    disabled={disabled}
                    className="h-9 pl-8 text-[13px]"
                    aria-label="Cari reference"
                />
            </div>

            {/* Filter Lab + Kategori */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                    value={filters.lab}
                    onChange={(e) => setFilters((f) => ({ ...f, lab: e.target.value }))}
                    disabled={disabled}
                    aria-label="Filter lab"
                    className="h-9 text-[13px]"
                >
                    <option value="">Semua Lab</option>
                    {labs.map((lab) => (
                        <option key={lab} value={lab}>
                            {lab}
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.kategori}
                    onChange={(e) => setFilters((f) => ({ ...f, kategori: e.target.value }))}
                    disabled={disabled}
                    aria-label="Filter kategori"
                    className="h-9 text-[13px]"
                >
                    <option value="">Semua Kategori</option>
                    {categories.map((kategori) => (
                        <option key={kategori} value={kategori}>
                            {kategori}
                        </option>
                    ))}
                </Select>
            </div>

            {/* Daftar checkbox */}
            <div className="max-h-56 overflow-y-auto rounded-md border border-edge bg-surface">
                {loading && (
                    <div className="flex items-center gap-2 px-3 py-4 text-xs text-faint">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Memuat daftar reference…
                    </div>
                )}

                {!loading && references.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-4 text-xs text-faint">
                        <Inbox className="h-3.5 w-3.5 shrink-0" />
                        Belum ada writeup lain untuk dijadikan reference.
                    </div>
                )}

                {!loading && references.length > 0 && visible.length === 0 && (
                    <div className="px-3 py-4 text-xs text-faint">
                        Tidak ada reference yang cocok dengan pencarian/filter.
                    </div>
                )}

                {!loading && visible.length > 0 && (
                    <ul className="divide-y divide-edge">
                        {visible.map((reference) => {
                            const checked = selectedIds.includes(reference.id);
                            const blocked = !checked && atMax;

                            return (
                                <li key={reference.id}>
                                    <label
                                        className={cn(
                                            'flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-elevated/60',
                                            blocked && 'cursor-not-allowed opacity-50',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled || (blocked && !checked)}
                                            onChange={() => onChange(toggleReference(selectedIds, reference.id))}
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-edge text-accent focus:ring-accent/40 disabled:cursor-not-allowed"
                                        />
                                        <span className="min-w-0">
                                            <span className="block truncate text-[13px] font-medium text-strong">
                                                {reference.title}
                                            </span>
                                            <span className="block truncate text-[11px] text-faint">
                                                {reference.lab} · {reference.kategori}
                                            </span>
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {selectedIds.length > 0 && !disabled && (
                <p className="text-[11px] text-faint">
                    AI hanya membaca reference sebagai konteks dan tidak mengubahnya.
                </p>
            )}
        </div>
    );
}