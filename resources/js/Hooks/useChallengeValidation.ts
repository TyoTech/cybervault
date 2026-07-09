import { useState, useEffect } from 'react';

export function useChallengeValidation(lab: string, kategori: string, judul: string) {
  const [labExists, setLabExists] = useState(true);
  const [categoryExists, setCategoryExists] = useState(true);
  const [titleExists, setTitleExists] = useState(false);

  useEffect(() => {
    if (!lab) return;
    const delay = setTimeout(() => {
      fetch(route('api.labs.check', lab))
        .then((r) => r.json())
        .then((r) => setLabExists(r.exists));
    }, 500);
    return () => clearTimeout(delay);
  }, [lab]);

  useEffect(() => {
    if (!lab || !kategori) return;
    const delay = setTimeout(() => {
      fetch(route('api.categories.check', { lab, category: kategori }))
        .then((r) => r.json())
        .then((r) => setCategoryExists(r.exists));
    }, 500);
    return () => clearTimeout(delay);
  }, [lab, kategori]);

  useEffect(() => {
    if (!lab || !kategori || !judul) return;

    const delay = setTimeout(() => {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      fetch(route('api.title.check'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ lab, kategori, judul }),
      })
        .then((r) => r.json())
        .then((r) => setTitleExists(r.exists))
        .catch((e) => console.error(e));
    }, 500);

    return () => clearTimeout(delay);
  }, [lab, kategori, judul]);

  return { labExists, categoryExists, titleExists };
}
