import { FormEventHandler, useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { ArrowLeft, Save, X, FileText, ChevronDown, Folder, Upload, FolderOpen, File as FileIcon } from 'lucide-react';
import { useChallengeValidation } from '@/Hooks/useChallengeValidation';

interface PreviewFile {
  file: File;
  preview?: string;
}

export default function ChallengeEdit({ challenge }: { challenge: any }) {
  const { data, setData, post, processing } = useForm({
    _method: 'put',
    lab: challenge.lab || '',
    kategori: challenge.kategori || '',
    judul: challenge.judul || '',
    konten_writeup: challenge.writeup || '',
    files: [] as File[],
  });

  const [labs, setLabs] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showLabDropdown, setShowLabDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredLabs, setFilteredLabs] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const { labExists, categoryExists, titleExists } = useChallengeValidation(data.lab, data.kategori, data.judul);

  // Jika nama lab, kategori, dan judul tidak berubah, maka jangan anggap judul bentrok (konflik)
  const isSameAsOriginal = data.lab === challenge.lab && data.kategori === challenge.kategori && data.judul === challenge.judul;
  const isTitleConflict = titleExists && !isSameAsOriginal;

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('challenges.update', challenge.id));
  };

  const hapusFileServer = (filename: string) => {
    if (confirm(`Hapus file ${filename}?`)) {
      router.delete(route('challenges.deleteFile', challenge.id), { data: { filename } });
    }
  };

  useEffect(() => {
    fetch(route('api.labs'))
      .then((res) => res.json())
      .then((data) => {
        setLabs(data);
        setFilteredLabs(data);
      });
  }, []);

  useEffect(() => {
    if (!data.lab) {
      setCategories([]);
      return;
    }
    fetch(route('api.categories', data.lab))
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setFilteredCategories(data);
      });
  }, [data.lab]);

  useEffect(() => {
    setFilteredLabs(labs.filter((lab) => lab.toLowerCase().includes(data.lab.toLowerCase())));
  }, [data.lab, labs]);

  useEffect(() => {
    setFilteredCategories(categories.filter((category) => category.toLowerCase().includes(data.kategori.toLowerCase())));
  }, [data.kategori, categories]);

  useEffect(() => {
    const previews = data.files.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setPreviewFiles(previews);

    return () => {
      previews.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
    };
  }, [data.files]);

  const selectLab = (lab: string) => {
    setData('lab', lab);
    setData('kategori', '');
    setShowLabDropdown(false);
  };

  const selectCategory = (category: string) => {
    setData('kategori', category);
    setShowCategoryDropdown(false);
  };

  const removeNewFile = (index: number) => {
    setData('files', data.files.filter((_, i) => i !== index));
  };

  const addFiles = (files: File[]) => {
    setData('files', [...data.files, ...files]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const browseFile = () => {
    fileInputRef.current?.click();
  };

  const handleChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (labRef.current && !labRef.current.contains(event.target as Node)) setShowLabDropdown(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setShowCategoryDropdown(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    <AuthenticatedLayout header="Edit Challenge">
      <Head title={`Edit ${challenge.judul}`} />

      <div className="flex justify-between items-center mb-6">
        <Link href={route('challenges.show', challenge.id)} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Batal Edit
        </Link>
        <Button type="button" variant="secondary" onClick={() => router.post(route('challenges.openFolder', challenge.id))}>
          <FolderOpen className="w-4 h-4 mr-2" /> Buka Folder Lokal
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6 max-w-7xl mx-auto" encType="multipart/form-data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div ref={labRef} className="relative z-50">
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lab</label>
            <div className="relative">
              <Input
                value={data.lab}
                required
                onChange={(e) => {
                  setData('lab', e.target.value);
                  setShowLabDropdown(true);
                }}
              />
              <button
                type="button"
                onClick={() => setShowLabDropdown(!showLabDropdown)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </button>

              {showLabDropdown && (
                <div className="absolute top-full left-0 mt-1 z-50 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-56 overflow-auto">
                  {filteredLabs.length === 0 ? (
                    <div className="p-3 text-zinc-500">Tidak ada folder.</div>
                  ) : (
                    filteredLabs.map((lab) => (
                      <button
                        key={lab}
                        type="button"
                        onClick={() => selectLab(lab)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4 text-blue-500" />
                        {lab}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {data.lab !== '' && (
              <p className={`mt-2 text-sm ${labExists ? 'text-green-400' : 'text-blue-400'}`}>
                {labExists ? '✓ Folder ditemukan' : 'ℹ Folder otomatis dibuat'}
              </p>
            )}
          </div>

          <div ref={categoryRef} className="relative z-40">
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
            <div className="relative">
              <Input
                value={data.kategori}
                required
                onChange={(e) => {
                  setData('kategori', e.target.value);
                  setShowCategoryDropdown(true);
                }}
              />
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 z-50 w-full rounded-lg bg-zinc-900 border border-zinc-700 max-h-56 overflow-auto shadow-xl">
                  {filteredCategories.length === 0 ? (
                    <div className="p-3 text-zinc-500 text-sm">Tidak ada folder.</div>
                  ) : (
                    filteredCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => selectCategory(category)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Folder className="w-4 h-4 text-green-500" />
                        {category}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {data.kategori !== '' && (
              <p className={`mt-2 text-sm ${categoryExists ? 'text-green-400' : 'text-blue-400'}`}>
                {categoryExists ? '✓ Folder ditemukan' : 'ℹ Folder otomatis dibuat'}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Challenge</label>
          <Input
            value={data.judul}
            onChange={(e) => setData('judul', e.target.value)}
            required
            className={isTitleConflict ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {data.judul !== '' && !isSameAsOriginal && (
             <p className={`mt-2 text-sm ${isTitleConflict ? 'text-red-500' : 'text-green-400'}`}>
               {isTitleConflict ? '⚠ Judul sudah ada di folder tersebut' : '✓ Judul tersedia (Folder akan direname)'}
             </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Isi Writeup (.txt)</label>
          <textarea
            rows={8}
            className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={data.konten_writeup}
            onChange={e => setData('konten_writeup', e.target.value)}
          />
        </div>

        <div className="bg-zinc-950 p-4 border border-white/10 rounded-lg">
          <label className="block text-sm font-medium text-zinc-300 mb-3">File Tersimpan di Server</label>
          <ul className="space-y-2 mb-4">
            {challenge.lampiran.map((file: string) => (
              <li key={file} className="flex justify-between items-center text-sm text-zinc-400 bg-zinc-900 px-3 py-2 rounded">
                <span className="flex items-center"><FileIcon className="w-4 h-4 mr-2" /> {file}</span>
                <button type="button" onClick={() => hapusFileServer(file)} className="text-red-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
            {challenge.lampiran.length === 0 && <li className="text-sm text-zinc-600">Tidak ada file tambahan tersimpan.</li>}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Tambah File Baru (Opsional)</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleChooseFile}
          />
          <div
            onClick={browseFile}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed cursor-pointer p-10 transition ${
              dragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700'
            }`}
          >
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-blue-500" />
              <p className="mt-3 text-zinc-200">Klik untuk memilih file</p>
              <p className="text-sm text-zinc-500">atau drag & drop file di sini</p>
            </div>
          </div>
        </div>

        {previewFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {previewFiles.map((item, index) => (
              <div key={index} className="relative rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                <button
                  type="button"
                  onClick={() => removeNewFile(index)}
                  className="absolute top-2 right-2 z-20 rounded-full bg-red-600 p-1 hover:bg-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
                {item.preview ? (
                  <img src={item.preview} className="w-full h-36 object-cover" />
                ) : (
                  <div className="h-36 flex flex-col justify-center items-center">
                    <FileText className="w-12 h-12 text-blue-500" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm truncate text-zinc-200">{item.file.name}</p>
                  <p className="text-xs text-zinc-500">{(item.file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button type="submit" disabled={processing || isTitleConflict}>
            <Save className="w-4 h-4 mr-2" />
            {processing ? 'Menyimpan...' : 'Update Database & File'}
          </Button>
        </div>
      </form>
    </AuthenticatedLayout>
  );
}
