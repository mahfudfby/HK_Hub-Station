// 20 template Surat Keterangan Keterampilan (2 halaman). Isi data SAMA; yang berbeda adalah penataan:
// bingkai, kop, judul, blok nama, kotak kualifikasi, penempatan foto/QR/tanda tangan (halaman 1),
// gaya daftar kompetensi dan posisi pengesah (halaman 2). Beda warna/font saja tidak dihitung.

// Bingkai batik & ornamen (motif SVG, lihat FRAMES di Render.tsx)
export type Frame = 'guilloche' | 'kawung' | 'mega-mendung' | 'filigree' | 'parang' | 'sulur' | 'truntum' | 'tumpal' | 'ketupat' | 'meander';
export type Head = 'kiri' | 'tengah' | 'kanan' | 'banner' | 'sidebar' | 'dua-sisi' | 'kecil';
export type Title = 'tengah' | 'kiri' | 'bar' | 'garis' | 'kotak';
export type Who = 'rows' | 'besar' | 'kartu' | 'garis';
export type Qual = 'kotak' | 'tabel' | 'pita' | 'dua' | 'polos';
export type Media = 'tiga' | 'cermin' | 'foto-who' | 'tengah' | 'kolom-kanan' | 'strip';
export type List = 'angka' | 'dua' | 'kartu' | 'tabel' | 'titik';
export type Sign = 'kotak' | 'kanan' | 'kiri' | 'tengah' | 'strip';

export type Tpl = {
  id: string; name: string; desc: string;
  body: string; head: string; // font (Google Fonts); Arimo = bawaan aplikasi
  ink: string; accent: string; soft: string; // teks, warna utama, warna lembut (pita/latar kartu)
  frame: Frame; kop: Head; title: Title; who: Who; qual: Qual; media: Media;
  list: List; sign: Sign;
  kop2: boolean; // halaman 2 memakai kop kecil di atas judul
};

const t = (
  id: string, name: string, desc: string, body: string, headF: string, ink: string, accent: string, soft: string,
  frame: Frame, kop: Head, title: Title, who: Who, qual: Qual, media: Media, list: List, sign: Sign, kop2 = false,
): Tpl => ({ id, name, desc, body, head: headF, ink, accent, soft, frame, kop, title, who, qual, media, list, sign, kop2 });

export const TEMPLATES: Tpl[] = [
  t('referensi', '01. Sertifikat Referensi', 'Bingkai batik guilloche, kop kiri, kotak kualifikasi, QR–foto–tanda tangan sebaris', 'Arimo', 'Arimo', '#111111', '#1f2a5c', '#c9cbe9',
    'guilloche', 'kiri', 'tengah', 'rows', 'kotak', 'tiga', 'angka', 'kotak'),
  t('emas-klasik', '02. Emas Klasik', 'Bingkai batik kawung, kop tengah, nama besar di tengah, foto & QR di tengah atas tanda tangan', 'Lora', 'Playfair Display', '#2b2218', '#8a6a1f', '#efe3c3',
    'kawung', 'tengah', 'garis', 'besar', 'polos', 'tengah', 'dua', 'tengah'),
  t('korporat-biru', '03. Korporat Biru', 'Banner kop penuh, judul bar, kolom foto-QR-tanda tangan di kanan, daftar tabel', 'Montserrat', 'Montserrat', '#16213a', '#1d4ed8', '#dbe6ff',
    'tumpal', 'banner', 'bar', 'rows', 'tabel', 'kolom-kanan', 'tabel', 'strip', true),
  t('sidebar-teal', '04. Sidebar Teal', 'Kolom kop di kiri, kartu nama, pita kualifikasi, foto di samping nama', 'Poppins', 'Poppins', '#12312f', '#0f766e', '#cdeeea',
    'ketupat', 'sidebar', 'kiri', 'kartu', 'pita', 'foto-who', 'kartu', 'kanan'),
  t('minimalis', '05. Minimalis Abu', 'Bingkai meander, kop satu baris kecil, nama bergaris, tanda tangan–foto–QR terbalik', 'Raleway', 'Raleway', '#222222', '#4b5563', '#eceef1',
    'meander', 'kecil', 'kiri', 'garis', 'polos', 'cermin', 'titik', 'kiri', true),
  t('hijau-bingkai', '06. Hijau Bingkai', 'Bingkai batik mega mendung, kop dua sisi bergaris, judul berkotak, dua kartu kualifikasi', 'Merriweather', 'Merriweather', '#14301d', '#166534', '#d6efdc',
    'mega-mendung', 'dua-sisi', 'kotak', 'besar', 'dua', 'tiga', 'dua', 'kotak'),
  t('marun-sudut', '07. Marun Sudut', 'Ornamen sudut filigree, kop tengah, judul tengah, kotak kualifikasi, tanda tangan–foto–QR', 'EB Garamond', 'EB Garamond', '#2a1216', '#7f1d2d', '#f1d9dc',
    'filigree', 'tengah', 'tengah', 'rows', 'kotak', 'cermin', 'angka', 'tengah'),
  t('hitam-tegas', '08. Hitam Tegas', 'Bingkai batik parang, judul bar hitam, kartu nama, strip QR + keterangan di bawah', 'Roboto Slab', 'Roboto Slab', '#0b0b0b', '#111111', '#e5e5e5',
    'parang', 'kiri', 'bar', 'kartu', 'tabel', 'strip', 'angka', 'strip'),
  t('oranye-bulat', '09. Oranye Sudut Bulat', 'Bingkai sulur batik, kop tengah, nama berformat tabel, pita kualifikasi, foto di samping nama', 'Nunito', 'Nunito', '#3a2410', '#c2410c', '#fde3d0',
    'sulur', 'tengah', 'garis', 'rows', 'pita', 'foto-who', 'kartu', 'kanan'),
  t('krem-sisipan', '10. Krem Sisipan', 'Bingkai batik truntum, kop rata kanan, nama besar, tanda tangan–foto–QR', 'Libre Baskerville', 'Libre Baskerville', '#3d2b12', '#7c5a2a', '#efe4cc',
    'truntum', 'kanan', 'tengah', 'besar', 'polos', 'tiga', 'tabel', 'kotak'),
  t('hijau-ornamen', '11. Hijau Ornamen', 'Bingkai batik guilloche, banner kop, judul berkotak, dua kartu kualifikasi, kolom kanan', 'Source Sans 3', 'Source Sans 3', '#10291a', '#15803d', '#d3efdb',
    'guilloche', 'banner', 'kotak', 'garis', 'dua', 'kolom-kanan', 'dua', 'tengah', true),
  t('ungu-ganda', '12. Ungu Ganda', 'Bingkai batik kawung, kop satu baris, judul bar, kartu nama, foto & QR tengah', 'Lato', 'Lato', '#241238', '#6b21a8', '#eadcf7',
    'kawung', 'kecil', 'bar', 'kartu', 'kotak', 'tengah', 'kartu', 'strip', true),
  t('merah-pita', '13. Merah Pita', 'Pita tumpal atas–bawah, kop kiri, nama tabel, tanda tangan–foto–QR, daftar bertitik', 'Open Sans', 'Open Sans', '#2b1111', '#b91c1c', '#f8d9d9',
    'tumpal', 'kiri', 'garis', 'rows', 'tabel', 'cermin', 'titik', 'kanan'),
  t('teal-sudut', '14. Teal Sudut', 'Ornamen sudut filigree, kop dua sisi, nama besar, pita kualifikasi, kolom kanan', 'Nunito', 'Nunito', '#0f2f33', '#0e7490', '#cdeaf1',
    'filigree', 'dua-sisi', 'kiri', 'besar', 'pita', 'kolom-kanan', 'angka', 'kiri'),
  t('hitam-sidebar', '15. Hitam Sidebar', 'Bilah ketupat kiri–kanan, kolom kop kiri, judul tengah, dua kartu, tanda tangan–foto–QR', 'Montserrat', 'Oswald', '#141414', '#27272a', '#e4e4e7',
    'ketupat', 'sidebar', 'tengah', 'rows', 'dua', 'tiga', 'tabel', 'kotak'),
  t('biru-tebal', '16. Biru Tebal', 'Bingkai batik parang biru, banner kop, judul bergaris, kartu nama, foto samping nama', 'Roboto Slab', 'Roboto Slab', '#0f1e3d', '#1e3a8a', '#d9e2f7',
    'parang', 'banner', 'garis', 'kartu', 'polos', 'foto-who', 'dua', 'strip'),
  t('slate-tunggal', '17. Slate Tunggal', 'Bingkai batik mega mendung, kop rata kanan, judul bar, nama bergaris, strip QR bawah', 'Source Sans 3', 'Source Sans 3', '#1e293b', '#475569', '#e2e8f0',
    'mega-mendung', 'kanan', 'bar', 'garis', 'kotak', 'strip', 'kartu', 'tengah'),
  t('pink-bulat', '18. Rose Sudut Bulat', 'Bingkai sulur batik, kop satu baris, judul berkotak, nama besar, pita kualifikasi', 'Lora', 'Lora', '#3b1224', '#be185d', '#fbdbe9',
    'sulur', 'kecil', 'kotak', 'besar', 'pita', 'tengah', 'titik', 'kanan'),
  t('emas-sisipan', '19. Emas Sisipan', 'Bingkai batik truntum, kop tengah, judul kiri, kartu nama, tanda tangan–foto–QR, daftar angka', 'Cormorant Garamond', 'Cinzel', '#2b2110', '#a16207', '#f3e6bd',
    'truntum', 'tengah', 'kiri', 'kartu', 'tabel', 'cermin', 'angka', 'kiri'),
  t('polos-tegas', '20. Polos Tegas', 'Bingkai meander, kop kiri, judul berkotak, kolom kanan, daftar tabel, pengesah kotak', 'Arimo', 'Arimo', '#000000', '#000000', '#ebebeb',
    'meander', 'kiri', 'kotak', 'rows', 'polos', 'kolom-kanan', 'tabel', 'kotak'),
];

export const getTpl = (id: string) => TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0];

// Self-check: 20 template unik, dan tiap dua template beda penataan minimal pada 3 dari 8 sifat tata letak
const KEYS = ['frame', 'kop', 'title', 'who', 'qual', 'media', 'list', 'sign'] as const;
const minDiff = TEMPLATES.reduce((m, a, i) => TEMPLATES.slice(i + 1).reduce((mm, b) => Math.min(mm, KEYS.filter((k) => a[k] !== b[k]).length), m), 8);
console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((x) => x.id)).size === 20, 'surat-keterangan-keterampilan: 20 template unik');
console.assert(new Set(TEMPLATES.map((x) => KEYS.map((k) => x[k]).join('|'))).size === 20 && minDiff >= 3, `surat-keterangan-keterampilan: tata letak unik (beda minimal ${minDiff} sifat)`);
