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

## WAJIB: 20 template varian tata letak
Setiap menu baru **wajib punya 20 template** yang tata letaknya berbeda total
(posisi kop, judul, blok data, tabel, tanda tangan, bingkai/ornamen), tetapi
**isi datanya sama persis**: satu objek data dari form dirender oleh 20 komponen layout.
Pengguna memilih template lewat dropdown, data tidak berubah saat ganti template.
- **Surat** (A4/A5/F4): pakai `LETTER_LAYOUTS` (20 layout) dari `shared/components/LetterLayouts`:
  susun data ke `LayoutDoc`, render `<LayoutLetter layout={f.gaya} doc={doc} … />`,
  pilih dengan `<LayoutPicker value={f.gaya} onChange={…} />`. Simpan id terpilih di form (`gaya`).
- **Nota thermal**: `ThermalNota` (`TEMPLATES`, 20). Jenis dokumen lain (resi, receipt,
  undangan lipat) membuat `TEMPLATES` sendiri di folder menunya, contoh
  `pages/resi-80mm/Resi80.tsx`, `pages/receipt-olshop/OrderDoc.tsx`, `pages/undangan-yasinan/templates.ts`.
- Format daftar: `{ id, name: '01. Nama', desc: 'ciri tata letak', render }`, id unik kebab-case,
  nama bernomor 01–20, template pertama = default.
- Wajib self-check di bawah daftar:
  `console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20, '<slug>: 20 template unik');`
  Lebih baik lagi, juga assert bahwa kombinasi properti tata letaknya unik (lihat `ThermalNota.tsx`)
  supaya tidak ada dua template yang cuma beda warna.
- Beda warna/font saja **tidak dihitung** sebagai varian; yang dihitung adalah beda penataan & posisi.

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
| 20 tata letak surat, blok tanda tangan, baris info | `shared/components/LetterLayouts` |
| 20 gaya kop/judul/font surat (tambahan, bukan pengganti layout) | `shared/components/LetterStyles` |
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

## Menu CV (Creative & ATS) — pola khusus
- Dua menu `/cv-creative` dan `/cv-ats` memakai satu mesin: `shared/components/CvMenu.tsx` (form + ekspor),
  `CvTemplates.tsx` (20 template per menu + pembuat halaman), `CvKit.tsx` (data, label, palet, cetak teks).
  Halaman menu hanya 5 baris: `<CvMenu mode="creative" | "ats" />`.
- 20 template = konfigurasi `Tpl` (keluarga tata letak `lay`, kolom samping, gaya judul, penanda butir, bentuk foto,
  daftar, kop pekerjaan, kop halaman, font). `console.assert` memastikan 20 susunan unik. Template baru = tambah
  `mk(...)`/`ats(...)` di `CvTemplates.tsx`; jangan menulis komponen halaman baru.
- Margin tepi 1,5 cm = `marginPx` (57 px) di SEMUA template; kolom memakai grid tetap; garis lurus; teks ≥ 12 px.
- WCAG AA: semua pasangan warna di `PALET` (CvKit) wajib kontras ≥ 4,5:1 (dicek `console.assert`). Palet baru ikut dicek.
- Banyak halaman otomatis: isi dipecah jadi unit (`Unit`) lalu `usePagination` dipanggil per kolom (`data-flow="main"|"side"`).
  Daftar butir = satu unit per butir agar bisa terpotong antarhalaman. Tambah pekerjaan/deskripsi/poin langsung menambah halaman.
- Isian selalu Bahasa Indonesia; pilihan English memanggil `/api/translate` (cache di `shared/lib/translate.ts`).
  Nama, perusahaan, institusi, email, situs, alamat TIDAK diterjemahkan; bulan/periode diterjemahkan lokal (`periodeEn`).
- ATS: tanpa foto, hitam putih. PDF/PNG biasa berupa gambar; tombol "PDF Teks Asli (ATS)" memakai cetak browser (teks asli).
- **ATURAN DOCX (wajib untuk menu yang punya preview dokumen): isi file Word 100% persis preview, memakai Shape dan Text Box.**
  Tombol "Unduh DOCX (bisa diedit)" memakai `shared/lib/cvDocx.ts` yang MEMBACA DOM halaman preview (`[data-page]`):
  tiap kotak/garis/foto/bulatan menjadi Shape (DrawingML `wps`, terjangkar ke halaman), tiap blok teks menjadi Text Box
  di posisi yang sama (teks tetap bisa diedit, mis. koreksi terjemahan). Jangan membuat DOCX satu-kolom terpisah dari preview.
  - Template baru otomatis ikut karena konverter membaca hasil render, bukan data. Syaratnya: layout pakai CSS biasa
    (posisi, warna polos, border, `background-image` untuk foto); tanpa gradient/filter/transform pada isi halaman.
  - Ukuran huruf wajib kelipatan 0,5 pt (`halfPt` di CvTemplates) karena Word hanya mengenal setengah-poin; font Arimo→Arial, Tinos→Times New Roman.
  - SEMUA Text Box memakai `wrap="square"`. JANGAN pakai `wrap="none"`: Word mengabaikan rata kanan/tengah pada kotak tanpa bungkus
    sehingga teks menempel ke kiri (terbukti saat uji di Word: nama perusahaan bergeser & inisial foto tidak di tengah).
    Teks satu baris: kotak dilebarkan (cadangan ≥ 24 px / 25%) ke sisi yang berlawanan dengan perataan, tepi aslinya tetap.
  - Teks banyak baris = Text Box selebar kolom (bungkus baris Word bisa berbeda tipis).
  - Bahasa dokumen mengikuti pilihan CV (`en-US` / `id-ID`) agar Word tidak meminta alat pemeriksa bahasa yang tidak terpasang.
  - Status uji di Word asli (Windows, Word 2016+): file terbuka tanpa error, Shape & Text Box tampil dan teks bisa diedit.
  - Dokumen memakai `compatibilityMode 15` (settings.xml) agar Shape/Text Box tidak diabaikan Word. Zip lewat `fflate` (tanpa pustaka berat).
  - Setelah mengubah template/konverter: uji di browser untuk SEMUA template bahwa kata di DOCX = kata di preview dan XML valid
    (buka dev server, pilih tiap template, panggil `buildCvDocx(pages, W, H)`, baca `word/document.xml`). Belum bisa diuji di Word asli dari lingkungan kerja ini.
- Data contoh wajib orang fiktif, bukan data pribadi nyata.

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
