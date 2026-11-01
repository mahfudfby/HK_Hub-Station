// 20 template undangan tahlil/yasin lipat 3. Beda warna blok panel, bingkai, komposisi sampul,
// susunan waktu & tempat, dan font (bukan sekadar ganti font). CSS aman html2canvas saja.

export type Tone = { bg: string; ink: string; accent: string };
export type Tpl = {
  id: string; name: string;
  body: string; head: string; headW?: number[]; script?: boolean; arab: string;
  paper: string; ink: string; accent: string; tone: Tone;
  // cover: sampul saja berwarna; alt: sampul + panel waktu; all: semua panel; band: pita atas-bawah; none: polos
  fill: 'cover' | 'alt' | 'all' | 'band' | 'none';
  frame: 'none' | 'single' | 'double' | 'rounded' | 'inset' | 'side' | 'corners';
  photo: 'round' | 'square' | 'arch';
  cover: 'top' | 'bottom' | 'medallion' | 'vertical' | 'big';
  time: 'table' | 'center' | 'card' | 'timeline' | 'pills';
};

const dark = (bg: string, ink: string, accent: string) => ({ paper: bg, ink, accent, tone: { bg, ink, accent } });

export const TEMPLATES: Tpl[] = [
  { id: 'hijau-klasik', name: 'Hijau Islami Klasik', body: 'Lora', head: 'Great Vibes', headW: [400], script: true, arab: 'Amiri',
    paper: '#ffffff', ink: '#1f2937', accent: '#166534', tone: { bg: '#14532d', ink: '#ffffff', accent: '#d4af37' },
    fill: 'cover', frame: 'double', photo: 'round', cover: 'top', time: 'table' },
  { id: 'emas-krem', name: 'Emas Krem Medali', body: 'Cormorant Garamond', head: 'Cinzel', arab: 'Scheherazade New',
    paper: '#fbf6e9', ink: '#3b2f1e', accent: '#a07d2e', tone: { bg: '#efe2c2', ink: '#3b2f1e', accent: '#a07d2e' },
    fill: 'none', frame: 'corners', photo: 'round', cover: 'medallion', time: 'center' },
  { id: 'hitam-putih', name: 'Hitam Putih Tegas', body: 'Roboto', head: 'Oswald', arab: 'Noto Naskh Arabic',
    paper: '#ffffff', ink: '#111111', accent: '#111111', tone: { bg: '#111111', ink: '#ffffff', accent: '#ffffff' },
    fill: 'cover', frame: 'single', photo: 'square', cover: 'big', time: 'table' },
  { id: 'biru-dongker', name: 'Biru Dongker Kartu', body: 'Lato', head: 'Playfair Display', arab: 'Amiri',
    paper: '#ffffff', ink: '#1e293b', accent: '#1e2a4a', tone: { bg: '#1e2a4a', ink: '#ffffff', accent: '#e5c07b' },
    fill: 'alt', frame: 'rounded', photo: 'square', cover: 'bottom', time: 'card' },
  { id: 'marun', name: 'Marun Elegan', body: 'Cormorant Garamond', head: 'Dancing Script', script: true, arab: 'Amiri',
    ...dark('#6b1d2a', '#fdf2e9', '#e8c9a0'), fill: 'all', frame: 'double', photo: 'round', cover: 'medallion', time: 'center' },
  { id: 'abu-modern', name: 'Abu Modern Garis Waktu', body: 'Montserrat', head: 'Montserrat', arab: 'Reem Kufi',
    paper: '#f3f4f6', ink: '#1f2937', accent: '#4b5563', tone: { bg: '#4b5563', ink: '#ffffff', accent: '#ffffff' },
    fill: 'band', frame: 'none', photo: 'square', cover: 'vertical', time: 'timeline' },
  { id: 'hijau-daun', name: 'Hijau Daun Lengkung', body: 'Nunito', head: 'Great Vibes', headW: [400], script: true, arab: 'Lateef',
    paper: '#f0fdf4', ink: '#14532d', accent: '#15803d', tone: { bg: '#15803d', ink: '#ffffff', accent: '#ffffff' },
    fill: 'none', frame: 'rounded', photo: 'arch', cover: 'top', time: 'pills' },
  { id: 'hitam-emas', name: 'Hitam Emas Mewah', body: 'EB Garamond', head: 'Cinzel', arab: 'Amiri',
    ...dark('#121212', '#f5e6b8', '#d4af37'), fill: 'all', frame: 'corners', photo: 'arch', cover: 'medallion', time: 'card' },
  { id: 'minimalis', name: 'Minimalis Putih', body: 'Raleway', head: 'Raleway', arab: 'Noto Naskh Arabic',
    paper: '#ffffff', ink: '#222222', accent: '#6b7280', tone: { bg: '#e5e7eb', ink: '#111111', accent: '#6b7280' },
    fill: 'none', frame: 'none', photo: 'round', cover: 'big', time: 'center' },
  { id: 'krem-kaligrafi', name: 'Krem Kaligrafi', body: 'Libre Baskerville', head: 'Great Vibes', headW: [400], script: true, arab: 'Amiri',
    paper: '#f7f1e3', ink: '#3d2b12', accent: '#7c5a2a', tone: { bg: '#e9dcc0', ink: '#3d2b12', accent: '#7c5a2a' },
    fill: 'cover', frame: 'inset', photo: 'round', cover: 'bottom', time: 'table' },
  { id: 'toska', name: 'Toska Teduh', body: 'Poppins', head: 'Poppins', arab: 'Lateef',
    paper: '#ffffff', ink: '#134e4a', accent: '#0f766e', tone: { bg: '#0f766e', ink: '#ffffff', accent: '#ccfbf1' },
    fill: 'alt', frame: 'side', photo: 'square', cover: 'vertical', time: 'timeline' },
  { id: 'lavender', name: 'Lavender Lembut', body: 'Quicksand', head: 'Dancing Script', script: true, arab: 'Scheherazade New',
    paper: '#faf5ff', ink: '#3b0764', accent: '#7e22ce', tone: { bg: '#6b21a8', ink: '#ffffff', accent: '#ffffff' },
    fill: 'band', frame: 'double', photo: 'round', cover: 'medallion', time: 'pills' },
  { id: 'cokelat-kayu', name: 'Cokelat Kayu', body: 'Source Sans 3', head: 'Merriweather', arab: 'Amiri',
    paper: '#fffaf3', ink: '#3f2a14', accent: '#8b5a2b', tone: { bg: '#5b3a1e', ink: '#ffffff', accent: '#f2d7a6' },
    fill: 'cover', frame: 'corners', photo: 'square', cover: 'top', time: 'card' },
  { id: 'hijau-emas', name: 'Hijau Emas Penuh', body: 'Amiri', head: 'Amiri', arab: 'Amiri',
    ...dark('#064e3b', '#ecfdf5', '#fcd34d'), fill: 'all', frame: 'double', photo: 'round', cover: 'big', time: 'table' },
  { id: 'biru-langit', name: 'Biru Langit', body: 'Open Sans', head: 'Satisfy', headW: [400], script: true, arab: 'Noto Naskh Arabic',
    paper: '#eff6ff', ink: '#1e3a8a', accent: '#1d4ed8', tone: { bg: '#1d4ed8', ink: '#ffffff', accent: '#ffffff' },
    fill: 'none', frame: 'single', photo: 'arch', cover: 'bottom', time: 'center' },
  { id: 'abu-tegas', name: 'Abu Tegas Medali', body: 'Roboto Condensed', head: 'Bebas Neue', headW: [400], arab: 'Reem Kufi',
    paper: '#ffffff', ink: '#111827', accent: '#374151', tone: { bg: '#374151', ink: '#ffffff', accent: '#ffffff' },
    fill: 'alt', frame: 'inset', photo: 'round', cover: 'medallion', time: 'timeline' },
  { id: 'klasik-hitam', name: 'Klasik Hitam Ganda', body: 'Old Standard TT', head: 'Old Standard TT', arab: 'Amiri',
    paper: '#ffffff', ink: '#000000', accent: '#000000', tone: { bg: '#f3f4f6', ink: '#000000', accent: '#000000' },
    fill: 'none', frame: 'double', photo: 'square', cover: 'top', time: 'table' },
  { id: 'marun-emas', name: 'Marun Emas Vertikal', body: 'Crimson Text', head: 'Cinzel', arab: 'Scheherazade New',
    paper: '#fdf8f0', ink: '#4a1520', accent: '#9f7a2e', tone: { bg: '#7a1f2b', ink: '#fdf2e9', accent: '#e8c9a0' },
    fill: 'cover', frame: 'rounded', photo: 'arch', cover: 'vertical', time: 'pills' },
  { id: 'sage', name: 'Hijau Sage', body: 'Josefin Sans', head: 'Allura', headW: [400], script: true, arab: 'Lateef',
    paper: '#f4f7f2', ink: '#2f3e2c', accent: '#5f7f55', tone: { bg: '#7a9a70', ink: '#ffffff', accent: '#ffffff' },
    fill: 'band', frame: 'corners', photo: 'round', cover: 'big', time: 'card' },
  { id: 'dongker-emas', name: 'Dongker Emas Malam', body: 'Cormorant Garamond', head: 'Great Vibes', headW: [400], script: true, arab: 'Amiri',
    ...dark('#0b1d3a', '#f8f1dc', '#d4af37'), fill: 'all', frame: 'side', photo: 'square', cover: 'bottom', time: 'center' },
];

console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20, 'undangan-yasinan: 20 template unik');

export const getTpl = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
