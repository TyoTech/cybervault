import { useEffect, useRef, useState } from 'react';
import Input from '@/Components/UI/Input';
import { ChevronDown, Folder } from 'lucide-react';
import { cn } from '@/Utils/cn';
import { useChallengeValidation } from '@/Hooks/useChallengeValidation';

export interface FolderFieldValues {
    lab: string;
    kategori: string;
    judul: string;
}

interface FolderFieldsProps {
    values: FolderFieldValues;
    onChange: (key: 'lab' | 'kategori' | 'judul', value: string) => void;
    /** Set untuk mode edit: identitas asli challenge (untuk deteksi konflik judul). */
    original?: FolderFieldValues;
}

/**
 * Field Lab / Kategori / Judul dengan dropdown folder + validasi keberadaan
 * folder & konflik judul. Dipakai bersama oleh halaman Create & Edit agar
 * perilaku folder konsisten.
 */
export default function FolderFields({ values, onChange, original }: FolderFieldsProps) {
    const [labs, setLabs] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [showLabDropdown, setShowLabDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [filteredLabs, setFilteredLabs] = useState<string[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<string[]>([]);

    const labRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);

    const { labExists, categoryExists, titleExists } = useChallengeValidation(
        values.lab,
        values.kategori,
        values.judul
    );

    const isSameAsOriginal =
        !!original &&
        values.lab === original.lab &&
        values.kategori === original.kategori &&
        values.judul === original.judul;
    const isTitleConflict = titleExists && !isSameAsOriginal;

    useEffect(() => {
        fetch(route('api.labs'))
            .then((res) => res.json())
            .then((data) => {
                setLabs(data);
                setFilteredLabs(data);
            });
    }, []);

    useEffect(() => {
        if (!values.lab) {
            setCategories([]);
            setFilteredCategories([]);
            return;
        }
        fetch(route('api.categories', values.lab))
            .then((res) => res.json())
            .then((data) => {
                setCategories(data);
                setFilteredCategories(data);
            });
    }, [values.lab]);

    useEffect(() => {
        setFilteredLabs(labs.filter((lab) => lab.toLowerCase().includes(values.lab.toLowerCase())));
    }, [values.lab, labs]);

    useEffect(() => {
        setFilteredCategories(
            categories.filter((c) => c.toLowerCase().includes(values.kategori.toLowerCase()))
        );
    }, [values.kategori, categories]);

    useEffect(() => {
        const listener = (event: MouseEvent) => {
            if (labRef.current && !labRef.current.contains(event.target as Node)) setShowLabDropdown(false);
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, []);

    const selectLab = (lab: string) => {
        onChange('lab', lab);
        onChange('kategori', '');
        setShowLabDropdown(false);
    };

    const selectCategory = (category: string) => {
        onChange('kategori', category);
        setShowCategoryDropdown(false);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div ref={labRef} className="relative z-50">
                    <label className="block text-sm font-medium text-body mb-1.5">Lab</label>
                    <div className="relative">
                        <Input
                            value={values.lab}
                            required
                            onChange={(e) => {
                                onChange('lab', e.target.value);
                                setShowLabDropdown(true);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowLabDropdown(!showLabDropdown)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-body"
                            aria-label="Pilih lab"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {showLabDropdown && (
                            <div className="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-edge bg-elevated shadow-xl max-h-56 overflow-auto">
                                {filteredLabs.length === 0 ? (
                                    <div className="p-3 text-faint text-sm">Tidak ada folder.</div>
                                ) : (
                                    filteredLabs.map((lab) => (
                                        <button
                                            key={lab}
                                            type="button"
                                            onClick={() => selectLab(lab)}
                                            className="w-full text-left px-3 py-2 text-sm text-body hover:bg-surface flex items-center gap-2"
                                        >
                                            <Folder className="w-4 h-4 text-accent" />
                                            {lab}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    {values.lab !== '' && (
                        <p className={`mt-2 text-sm ${labExists ? 'text-success' : 'text-accent'}`}>
                            {labExists ? '✓ Folder ditemukan' : 'ℹ Folder otomatis dibuat'}
                        </p>
                    )}
                </div>

                <div ref={categoryRef} className="relative z-40">
                    <label className="block text-sm font-medium text-body mb-1.5">Kategori</label>
                    <div className="relative">
                        <Input
                            value={values.kategori}
                            required
                            onChange={(e) => {
                                onChange('kategori', e.target.value);
                                setShowCategoryDropdown(true);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-body"
                            aria-label="Pilih kategori"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        {showCategoryDropdown && (
                            <div className="absolute top-full left-0 mt-1 z-50 w-full rounded-md bg-elevated border border-edge max-h-56 overflow-auto shadow-xl">
                                {filteredCategories.length === 0 ? (
                                    <div className="p-3 text-faint text-sm">Tidak ada folder.</div>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => selectCategory(category)}
                                            className="w-full text-left px-3 py-2 text-sm text-body hover:bg-surface flex items-center gap-2"
                                        >
                                            <Folder className="w-4 h-4 text-success" />
                                            {category}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    {values.kategori !== '' && (
                        <p className={`mt-2 text-sm ${categoryExists ? 'text-success' : 'text-accent'}`}>
                            {categoryExists ? '✓ Folder ditemukan' : 'ℹ Folder otomatis dibuat'}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-body mb-1.5">Judul Challenge</label>
                <Input
                    value={values.judul}
                    onChange={(e) => onChange('judul', e.target.value)}
                    required
                    className={cn(
                        isTitleConflict && 'border-danger focus:border-danger focus:ring-danger'
                    )}
                />
                {values.judul !== '' && !isSameAsOriginal && (
                    <p className={`mt-2 text-sm ${isTitleConflict ? 'text-danger' : 'text-success'}`}>
                        {isTitleConflict
                            ? '⚠ Judul sudah ada di folder tersebut'
                            : original
                              ? '✓ Judul tersedia (Folder akan direname)'
                              : '✓ Judul tersedia (Folder akan dibuat)'}
                    </p>
                )}
            </div>
        </>
    );
}