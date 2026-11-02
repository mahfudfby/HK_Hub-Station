# HK Hub Station — WAJIB DIBACA SEBELUM MENGUBAH REPO

Baca file ini dulu setiap kali clone/import repo. Isinya aturan baku membuat menu baru,
jadi **tidak perlu menganalisa ulang struktur repo** (hemat waktu & token).
Balas pemilik repo dalam Bahasa Indonesia.

> **Aturan pemeliharaan:** setiap kali ada aturan/pola baru untuk membuat menu
> (komponen bersama baru, kategori baru, kebiasaan ekspor, dll.), **perbarui file ini
> dan ikutkan dalam commit yang sama** lalu push. File ini harus selalu sesuai kode.

## Stack
Vite + React 18 + TypeScript + Tailwind + react-router-dom 6, Firebase (login/data),
Cloudinary (foto), html2canvas + jsPDF (ekspor). Deploy Vercel dari branch `main`.
- Lokal: `npm install && npm run dev` · Build: `npm run build`
- `vercel.json` sudah me-rewrite semua rute ke `index.html` → **rute baru tidak perlu
  ditambah di `vercel.json`**.

## Struktur
- Root hanya `public/`, `src/`, `api/` + file config. Jangan buat folder lain di root.
- **1 menu = 1 slug = 1 folder** `src/pages/<slug>/` berisi semua file menu itu
  (komponen, helper, tipe). Tidak ada file menu di luar foldernya.
- Kode yang dipakai >1 menu → `src/shared/components/` atau `src/shared/lib/`.
- Router pusat: `src/router/routes.ts` (satu objek per menu). `App.tsx` jangan diubah.

## Langkah membuat menu baru
1. Folder `src/pages/<slug>/` (slug = kebab-case, Bahasa Indonesia, mis. `surat-izin-cuti`).
2. `src/pages/<slug>/<NamaPascal>.tsx` → `export default function NamaPascal()`.
3. `src/pages/<slug>/index.ts` → `export { default } from './<NamaPascal>';`
4. Tambah satu objek di `src/router/routes.ts`:
   ```ts
   {
     path: '/<slug>/*',        // selalu pakai /* (menu internal dibaca dari URL)
     cat: 'surat',             // kategori Home, lihat tabel di bawah
     // login: true,           // hanya tampil di Home setelah login (menu khusus dokter)
     component: lazy(() => import('../pages/<slug>')),
     title: 'Judul Kartu di Home',
     desc: 'Satu kalimat: isi dokumen + fitur utama (mis. ekspor PDF, PNG & Print).',
   },
   ```
   Tanpa `title` = tidak tampil di Home. Urutan di Home mengikuti urutan di `routes.ts`
   dalam kategori yang sama.
5. Menu ganti nama/slug: pindahkan folder (git mv), ubah `path`, dan pakai
   `STORAGE_KEY` baru bila bentuk data berubah supaya tidak bercampur dengan data lama.

### Kategori Home (`CATEGORIES` di `src/pages/home/Home.tsx`)
| `cat` | Judul grup |
|---|---|
| `gaji` | Gaji & Kepegawaian |
| `invoice` | Invoice & Faktur |
| `surat` | Surat Perusahaan |
| `warga` | Surat Warga, Sekolah & Desa |
| `pribadi` | Surat Pribadi & Lamaran |
| `kesehatan` | Kesehatan (Khusus Dokter) — wajib `login: true` + `RequireLogin` |
| `nota` | Nota & Resi |

Kategori baru = tambah di `CATEGORIES` **dan** di tabel ini.

## Aturan isi menu
- **Wajib ekspor PDF, PNG, dan Print** (semua menu sudah punya ketiganya).
  Surat: `useLetterExport` / `ExportButton` dari `shared/components/LetterKit`.
  Thermal: `ThermalNota` / `ThermalStruk` (PNG 384px untuk 58mm, 576px untuk 80mm, siap RawBT).
- Data form disimpan di `localStorage` dengan `const STORAGE_KEY = '<slug>:v1';`
  (naikkan `v2` bila bentuk data berubah).
- Menu internal (mis. `/spbu/edit`) pindah lewat `navigate()`, bukan `useState`,
  agar tombol Back browser berfungsi.
- Menu khusus login: bungkus dengan
  `<RequireLogin>{(user) => <Editor user={user} notify={notify} />}</RequireLogin>`.
- Tata letak ponsel (iOS Safari): grid pakai `minmax(0,1fr)` dan input tanggal boleh
  menyusut (`min-w-0`) agar kolom tidak saling menimpa.
- Untuk masalah unduh/share di iPhone, ikuti skill `fix-ios-download-share` / `shared/lib/saveFile.ts`.
- Penanda bagian kode: `// ===== SECTION: <Nama> =====` seperti file lain.

## Pakai ulang, jangan tulis ulang
Contoh terbaik untuk ditiru: surat → `src/pages/surat-hutang-ringkas/`,
nota thermal → `src/pages/tiket-travel-58mm/` (cukup 5 baris memakai `ThermalStruk`).

| Kebutuhan | Pakai |
|---|---|
| Field, upload gambar, pilih kertas, ekspor, format tanggal | `shared/components/LetterKit` |
| Tata letak surat, blok tanda tangan, baris info | `shared/components/LetterLayouts` |
| Opsi nomor surat / template kosong (`isian`, `nomorTampil`, `Switch`) | `shared/components/DocOptions` |
| Seksi form & narasi yang bisa diedit | `shared/components/FormSection` |
| Pratinjau pas layar, skala teks | `FitPreview`, `TextScale` (`useFitScale`) |
| Geser logo/ttd/stempel | `PositionPad` |
| Mode kanvas, galeri foto bersama, data user | `CanvasMode`, `SharedGallery`, `UserData` |
| Toast/notifikasi | `Feedback` (`Toast`, `ToastState`) |
| Input angka/rupiah, terbilang | `NumberFormatInput`, `shared/lib/money` |
| Nomor surat otomatis, angka Romawi | `shared/lib/docNumber` |
| Kontak kop (telp/email/web) | `KontakFields` |
| Hapus latar foto/ttd | `shared/lib/removeBg` |
| Nota/struk thermal | `ThermalNota`, `ThermalStruk` |
| Faktur/invoice | `SalesDoc` |

## Git & rilis — EKSEKUSI MANDIRI OTOMATIS
Setelah perubahan selesai dan `npm run build` lolos, **langsung jalankan semuanya sendiri
tanpa bertanya/meminta izin lagi**:
1. Branch baru (`git checkout -b <nama-singkat>`), commit dengan pesan Bahasa Indonesia
   (gaya: "Menu X; perbaikan Y").
2. `git push -u origin <branch>` lalu `gh pr create`.
3. **Langsung merge** ke `main`: `gh pr merge --squash --delete-branch` (tidak menunggu review).
4. Vercel otomatis deploy produksi dari `main`; pastikan statusnya `success` lewat
   `gh api repos/mahfudfby/HK_Hub-Station/deployments` → `.../deployments/<id>/statuses`
   (jangan polling situs langsung).
5. `git checkout main && git pull`, lalu laporkan hasilnya (link PR + status deploy).

Berhenti dan tanya **hanya** bila build gagal, deploy gagal, atau perubahan berisiko
menghapus data pengguna.
- Jangan commit `node_modules`, `dist`, `.env*`, atau file lokal yang tidak terkait perubahan.
