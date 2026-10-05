# SPBU — Hub SPA (Linktree-style)

Aturan: **1 slug = 1 folder** di `src/pages/`. Root hanya `public/` dan `src/`.

## Tambah SPA baru
1. Buat `src/pages/<slug>/<Slug>.tsx` + `index.ts` (`export { default } from './<Slug>';`)
2. Tambah satu baris di `src/router/routes.ts` (isi `title` & `desc` agar muncul di Home)

## Deploy Vercel
1. Push ke GitHub, import di Vercel (Framework: Vite, otomatis)
2. Config Firebase sudah terpasang di `src/shared/lib/firebase.ts`. Environment Variables bersifat opsional (lihat `.env.example`)
3. Deploy. `vercel.json` sudah menangani rewrite SPA.

Lokal: `npm install && npm run dev`

## Menu internal = slug sendiri
SPA dengan beberapa menu memakai `path: '/<slug>/*'` di `routes.ts`; menu dibaca dari URL (contoh SPBU: `/spbu`, `/spbu/edit`, `/spbu/baru`) sehingga tombol Back browser berfungsi. Pindah menu = `navigate()`, bukan `useState`.
