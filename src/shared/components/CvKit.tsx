import type { Paper } from './LetterKit';

// Bahan bersama menu CV (Creative & ATS): bentuk data, contoh isian, label dua bahasa, palet berkontras aman,
// penerjemah bulan lokal, dan cetak teks asli (agar PDF ATS bisa dibaca mesin).

// ============================================================
// SECTION: Data
// ============================================================
export type Bahasa = 'id' | 'en';
export type Job = { id: string; posisi: string; perusahaan: string; bidang: string; periode: string; poin: string[] };
export type Edu = { id: string; jurusan: string; institusi: string; ket: string; poin?: string[] };
export type Pelatihan = { id: string; judul: string; rincian: string[] };
export type Ref = { id: string; nama: string; jabatan: string; perusahaan: string; ket: string; poin?: string[] };
export type Org = { id: string; peran: string; organisasi: string; ket: string; poin: string[] };

export const BAGIAN = ['ringkasan', 'pengalaman', 'pendidikan', 'keahlian', 'alat', 'pelatihan', 'referensi', 'hobi', 'organisasi'] as const;
export type Bagian = (typeof BAGIAN)[number];

export type Cv = {
  gaya: string; paper: string; skala: number; bahasa: Bahasa; sembunyi: Bagian[];
  foto: string; nama: string; jabatan: string; email: string; telepon: string; web: string; alamat: string;
  ringkasan: string; ringkasanPoin?: string[];
  pengalaman: Job[]; pendidikan: Edu[]; keahlian: string[]; alat: string[];
  pelatihan: Pelatihan[]; referensi: Ref[]; hobi: string[]; organisasi: Org[];
};

export const newId = () => Math.random().toString(36).slice(2, 8);

// Contoh: orang fiktif, bentuk isian sama dengan CV acuan
export const CV_DEFAULT: Cv = {
  gaya: 'replika', paper: 'A4', skala: 100, bahasa: 'id', sembunyi: [],
  foto: '', nama: 'Raka Aditya Wijaya, S.T.', jabatan: 'Administrasi & Sumber Daya Manusia',
  email: 'raka.wijaya@contoh.id', telepon: '0812-0000-1234', web: 'linkedin.com/in/rakawijaya', alamat: 'Surabaya, Jawa Timur',
  ringkasan: 'Profesional multidisiplin di bidang SDM, penggajian, umum, dukungan IT, dan administrasi operasional dengan pengalaman langsung di industri manufaktur. Pernah menjabat di beberapa departemen dalam satu perusahaan, dipercaya berdasarkan hasil kerja di setiap peran. Kompeten dalam penggajian, analisis beban kerja, BPJS, pengelolaan lebih dari 100 perangkat IT, dan koordinasi operasional. Lulusan Teknik Industri dengan IPK 3,45.',
  pengalaman: [
    { id: 'j1', posisi: 'Staf SDM / Umum', perusahaan: 'PT Nusantara Boga Sejahtera', bidang: 'Manufaktur & Distribusi Makanan', periode: 'Juni 2025 - Juni 2026', poin: [
      'Memproses penggajian bulanan untuk 120 karyawan, termasuk gaji, potongan, dan perhitungan bonus.',
      'Menghitung dan mengadministrasikan iuran BPJS Kesehatan dan BPJS Ketenagakerjaan bagi 120 karyawan, memastikan kepatuhan dan pembayaran tepat waktu.',
      'Mengelola perizinan usaha melalui platform OSS, termasuk pendaftaran dan perpanjangan NIB, akta, SK Kemenkumham, NPWP, dan SIUP.',
      'Menyusun uraian jabatan dan melakukan evaluasi KPI di 6 divisi untuk menentukan perpanjangan kontrak dan kebutuhan tenaga kerja.',
    ] },
    { id: 'j2', posisi: 'Spesialis Dukungan IT', perusahaan: 'PT Nusantara Boga Sejahtera', bidang: 'Manufaktur & Distribusi Makanan', periode: 'Januari 2025 - Juni 2025', poin: [
      'Menjaga ketersediaan perangkat 90% pada 30 komputer dan perangkat kantor melalui perawatan berkala.',
      'Menangani 1-3 tiket bantuan per hari; masalah ringan selesai dalam 30 menit dan masalah besar dalam 1-2 jam.',
      'Menurunkan insiden IT berulang sebesar 50% dengan membentuk fungsi dukungan IT internal.',
    ] },
    { id: 'j3', posisi: 'Staf Administrasi Gudang & Produksi', perusahaan: 'PT Nusantara Boga Sejahtera', bidang: 'Manufaktur & Distribusi Makanan', periode: 'Juni 2024 - Desember 2024', poin: [
      'Mengelola administrasi produksi harian untuk 25 SKU, memantau pemakaian bahan baku sekitar 100 kg per SKU.',
      'Menerapkan metode FIFO / FEFO untuk menekan bahan baku terbuang dan menjaga kesegaran produk.',
      'Merancang sistem ERP berbasis web untuk menggantikan laporan Excel manual, memangkas waktu pelaporan dari 4 jam menjadi di bawah 1 jam.',
    ] },
  ],
  pendidikan: [{ id: 'e1', jurusan: 'Teknik Industri, IPK 3,45', institusi: 'Institut Teknologi Nusantara', ket: 'Surabaya [ Kelas Karyawan ]' }],
  keahlian: ['Administrasi Penggajian', 'Pemecahan Masalah IT', 'Analisis KPI', 'Penyelesaian Konflik', 'Dukungan Jaringan', 'Kepemimpinan', 'Manajemen Waktu', 'Hubungan Vendor', 'Hubungan Masyarakat'],
  alat: ['Microsoft Excel, Word, PowerPoint', 'Google Workspace (Sheets, Docs, Forms)', 'Platform OSS', 'ERP / SaaS (Dikembangkan Sendiri)', 'Mikrotik & Wireshark', 'Adobe Photoshop', 'SIPP BPJS Ketenagakerjaan', 'e-Dabu BPJS Kesehatan'],
  pelatihan: [
    { id: 't1', judul: 'Badan Nasional Sertifikasi Profesi (BNSP) - Certified Human Resources Generalist (2026 - 2029)', rincian: [] },
    { id: 't2', judul: 'Pelatihan MSDM - Lembaga Pelatihan Contoh', rincian: ['Menyusun Uraian Jabatan', 'Melakukan Administrasi Jaminan Sosial', 'Melakukan Analisis Beban Kerja'] },
    { id: 't3', judul: 'Sertifikasi Excel untuk Administrasi', rincian: [] },
  ],
  referensi: [{ id: 'r1', nama: 'Budi Santoso', jabatan: 'General Manager', perusahaan: 'PT Nusantara Boga Sejahtera', ket: 'No. Surat Referensi 001/SR-HRD/NBS/06/2026' }],
  hobi: ['Riset Otomasi AI', 'Pemrograman Web', 'Menulis Konten', 'Kegiatan Sosial'],
  organisasi: [{ id: 'o1', peran: 'Kepala Divisi Humas Internal', organisasi: 'Paguyuban Mahasiswa Daerah', ket: 'Paguyuban mahasiswa perantau', poin: [
    'Menangani konflik internal organisasi.', 'Menjaga solidaritas anggota.', 'Pengembangan karakter dan soft skill anggota.',
  ] }],
};

// ============================================================
// SECTION: Label dua bahasa (judul bagian)
// ============================================================
export type Lbl = Record<'kontak' | Bagian | 'email' | 'telepon' | 'web' | 'alamat', string>;
export const LBL: Record<Bahasa, Lbl> = {
  id: { kontak: 'Kontak', ringkasan: 'Ringkasan', pengalaman: 'Pengalaman Kerja', pendidikan: 'Pendidikan', keahlian: 'Keahlian', alat: 'Alat & Aplikasi', pelatihan: 'Pelatihan & Sertifikasi', referensi: 'Referensi', hobi: 'Hobi', organisasi: 'Pengalaman Organisasi', email: 'Email', telepon: 'Telepon', web: 'Situs', alamat: 'Alamat' },
  en: { kontak: 'Contact', ringkasan: 'Summary', pengalaman: 'Work Experience', pendidikan: 'Education', keahlian: 'Skills and Expertise', alat: 'Tools and Apps', pelatihan: 'Training & Certification', referensi: 'References', hobi: 'Hobbies', organisasi: 'Organizational Experience', email: 'Email', telepon: 'Phone', web: 'Website', alamat: 'Address' },
};

// ============================================================
// SECTION: Bulan & periode (lokal, tanpa API: hasil pasti)
// ============================================================
const BULAN: [RegExp, string][] = [
  [/\bJanuari\b/gi, 'January'], [/\bFebruari\b/gi, 'February'], [/\bMaret\b/gi, 'March'], [/\bMei\b/gi, 'May'], [/\bJuni\b/gi, 'June'], [/\bJuli\b/gi, 'July'],
  [/\bAgustus\b/gi, 'August'], [/\bOktober\b/gi, 'October'], [/\bDesember\b/gi, 'December'], [/\b(Sekarang|Saat ini|Sekarang ini)\b/gi, 'Present'],
];
export const periodeEn = (s: string) => BULAN.reduce((t, [re, en]) => t.replace(re, en), s);
console.assert(periodeEn('Juni 2025 - Juni 2026') === 'June 2025 - June 2026' && periodeEn('Mei 2024 - Sekarang') === 'May 2024 - Present' && periodeEn('2020 - 2024') === '2020 - 2024', 'periodeEn');

// Teks yang diterjemahkan oleh Auto-Translate. Nama orang, perusahaan, institusi, email, telepon, situs, alamat sengaja TIDAK diterjemahkan.
export function collectTexts(c: Cv): string[] {
  const t: string[] = [c.jabatan, c.ringkasan, ...(c.ringkasanPoin ?? []), ...c.keahlian, ...c.alat, ...c.hobi];
  c.pengalaman.forEach((j) => t.push(j.posisi, j.bidang, ...j.poin));
  c.pendidikan.forEach((e) => t.push(e.jurusan, e.ket, ...(e.poin ?? [])));
  c.pelatihan.forEach((p) => t.push(p.judul, ...p.rincian));
  c.referensi.forEach((r) => t.push(r.jabatan, r.ket, ...(r.poin ?? [])));
  c.organisasi.forEach((o) => t.push(o.peran, o.ket, ...o.poin));
  return [...new Set(t.filter((s) => s.trim()))];
}

// ============================================================
// SECTION: Palet (kontras WCAG AA ≥ 4,5:1 diperiksa di bawah)
// ============================================================
export type Pal = { id: string; ink: string; muted: string; accent: string; accentInk: string; soft: string; fill: boolean };
export const PALET: Record<string, Pal> = {
  hitam: { id: 'hitam', ink: '#111111', muted: '#404040', accent: '#111111', accentInk: '#ffffff', soft: '#f1f1f1', fill: true },
  navy: { id: 'navy', ink: '#0f172a', muted: '#475569', accent: '#1e3a5f', accentInk: '#ffffff', soft: '#e8eef6', fill: true },
  marun: { id: 'marun', ink: '#1f1f1f', muted: '#52525b', accent: '#9b1c1c', accentInk: '#ffffff', soft: '#fdecec', fill: true },
  hijau: { id: 'hijau', ink: '#10231a', muted: '#4b5563', accent: '#166534', accentInk: '#ffffff', soft: '#e7f5ec', fill: true },
  ungu: { id: 'ungu', ink: '#1e1233', muted: '#52525b', accent: '#5b21b6', accentInk: '#ffffff', soft: '#f1ebfb', fill: true },
  teal: { id: 'teal', ink: '#0b2321', muted: '#4b5563', accent: '#0f766e', accentInk: '#ffffff', soft: '#e0f4f1', fill: true },
  jingga: { id: 'jingga', ink: '#2a1408', muted: '#57534e', accent: '#9a3412', accentInk: '#ffffff', soft: '#fdeee3', fill: true },
  magenta: { id: 'magenta', ink: '#2b0a1a', muted: '#52525b', accent: '#9d174d', accentInk: '#ffffff', soft: '#fce8f1', fill: true },
  samudra: { id: 'samudra', ink: '#0b1b4d', muted: '#475569', accent: '#1d4ed8', accentInk: '#ffffff', soft: '#e6edff', fill: true },
  emas: { id: 'emas', ink: '#2a1a05', muted: '#57534e', accent: '#78350f', accentInk: '#ffffff', soft: '#fbf0dc', fill: true },
  // ATS: hitam putih saja, tanpa isi warna
  ats: { id: 'ats', ink: '#000000', muted: '#222222', accent: '#000000', accentInk: '#ffffff', soft: '#ffffff', fill: false },
};

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const kontras = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
console.assert(Math.abs(kontras('#000000', '#ffffff') - 21) < 0.01, 'kontras hitam/putih');
console.assert(Object.values(PALET).every((p) => [
  kontras(p.ink, '#ffffff'), kontras(p.muted, '#ffffff'), kontras(p.accent, '#ffffff'), kontras(p.accentInk, p.accent),
  kontras(p.ink, p.soft), kontras(p.muted, p.soft), kontras(p.accent, p.soft),
].every((r) => r >= 4.5)), 'PALET: semua pasangan teks/latar >= 4,5:1 (WCAG AA)');

// ============================================================
// SECTION: Margin tepi 1,5 cm
// ============================================================
export const MARGIN_MM = 15;
export const marginPx = Math.round((MARGIN_MM * 96) / 25.4); // 57 px
console.assert(marginPx === 57, 'margin 1,5 cm = 57 px');

// ============================================================
// SECTION: Cetak teks asli (untuk PDF ATS yang bisa dibaca mesin; ekspor PDF/PNG biasa berupa gambar)
// ============================================================
export function printText(pages: HTMLElement[], title: string, paper: Paper): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      iframe.remove();
      return reject(new Error('Browser tidak mendukung cetak.'));
    }
    const w = `${paper.w}mm`;
    const h = `${paper.h}mm`;
    const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('');
    const css = `@page { size: ${w} ${h}; margin: 0; } html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cv-sheet { width: ${w}; height: ${h}; overflow: hidden; break-after: page; page-break-after: always; }
      .cv-sheet:last-child { break-after: auto; page-break-after: auto; }
      .cv-sheet > [data-page] { transform-origin: top left; box-shadow: none !important; }`;
    // Halaman CV berukuran px tetap; dibungkus per lembar agar pas satu kertas
    const W = pages[0]?.offsetWidth || 794;
    const scale = (paper.w * 96) / 25.4 / W;
    const sheets = pages.map((p) => `<div class="cv-sheet"><div style="width:${W}px;transform:scale(${scale});transform-origin:top left">${p.outerHTML}</div></div>`).join('');
    doc.open();
    doc.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${title.replace(/[<>&"]/g, '')}</title>${styles}<style>${css}</style></head><body>${sheets}</body></html>`);
    doc.close();
    let removed = false;
    const cleanup = () => { if (!removed) iframe.remove(); removed = true; };
    win.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 120_000);
    setTimeout(() => { try { win.focus(); win.print(); resolve(); } catch (e) { cleanup(); reject(e); } }, 400); // beri waktu gaya & font termuat
  });
}
