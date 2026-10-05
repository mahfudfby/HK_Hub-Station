import { lazy } from 'react';

// Satu baris = satu slug = satu folder di src/pages.
// SPA dengan menu internal: pakai path '/<slug>/*' lalu baca location di dalam SPA.
// Tambah SPA baru: buat folder src/pages/<slug>/ (+ index.ts), lalu tambah SATU baris di bawah.
// title/desc dipakai otomatis oleh halaman Home (kartu Linktree). Tanpa title = tidak tampil di Home.
export const routes = [
  { path: '/', component: lazy(() => import('../pages/home')) },
  {
    path: '/spbu/*', // wildcard: menu internal (/spbu/edit, /spbu/baru) ditangani di dalam SPA
    component: lazy(() => import('../pages/spbu')),
    title: 'Generator Nota SPBU',
    desc: 'Buat dan cetak nota BBM dengan template SPBU yang tersimpan.',
  },
];
