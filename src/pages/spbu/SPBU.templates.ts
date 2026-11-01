// ============================================================
// SECTION: Template Alamat (data fiktif, maksimal 2 baris)
// ============================================================
export const ADDRESS_TEMPLATES = [
  { label: 'Jalan Raya (Kota Besar)', value: 'JL. RAYA UTAMA NO. 100\nKOTA CONTOH, PROV. CONTOH' },
  { label: 'Jalan Protokol', value: 'JL. JENDERAL CONTOH KM. 5\nKEC. TENGAH, KOTA CONTOH' },
  { label: 'Jalur Lintas Provinsi', value: 'JL. LINTAS PROVINSI KM. 27\nKAB. CONTOH, PROV. CONTOH' },
  { label: 'Jalan Tol (Rest Area)', value: 'JL. TOL CONTOH KM. 112 B\nREST AREA CONTOH' },
  { label: 'Pinggir Kota', value: 'JL. LINGKAR SELATAN NO. 8\nKEC. SELATAN, KOTA CONTOH' },
  { label: 'Kawasan Industri', value: 'JL. INDUSTRI RAYA BLOK C-3\nKAWASAN INDUSTRI CONTOH' },
  { label: 'Pesisir', value: 'JL. PANTAI INDAH NO. 15\nKEC. PESISIR, KAB. CONTOH' },
  { label: 'Pedesaan', value: 'JL. DESA MAKMUR NO. 3\nKEC. SUKAMAJU, KAB. CONTOH' },
];

// ============================================================
// SECTION: Template Harga (harga resmi Pertamina wilayah Jabodetabek per 1 November 2026; daerah lain bisa beda karena PBBKB)
// ============================================================
export const PRICE_TEMPLATES = [
  { label: 'Pertalite - 10.000', productName: 'Pertalite', pricePerLiter: 10000 },
  { label: 'Pertamax - 15.950', productName: 'Pertamax', pricePerLiter: 15950 },
  { label: 'Pertamax Green 95 - 19.150', productName: 'Pertamax Green 95', pricePerLiter: 19150 },
  { label: 'Pertamax Turbo - 19.600', productName: 'Pertamax Turbo', pricePerLiter: 19600 },
  { label: 'Biosolar - 6.800', productName: 'Biosolar', pricePerLiter: 6800 },
  { label: 'Dexlite - 23.700', productName: 'Dexlite', pricePerLiter: 23700 },
  { label: 'Pertamina Dex - 25.200', productName: 'Pertamina Dex', pricePerLiter: 25200 },
];

// Daftar BBM bawaan untuk template SPBU yang belum punya pengaturan harga sendiri
export const DEFAULT_FUELS = PRICE_TEMPLATES.map((t) => ({ name: t.productName, price: t.pricePerLiter }));

// ============================================================
// SECTION: Template Plat Nomor (kode wilayah + nomor acak)
// ============================================================
export const PLATE_REGIONS = [
  { code: 'B', area: 'Jakarta' }, { code: 'D', area: 'Bandung' }, { code: 'F', area: 'Bogor' },
  { code: 'E', area: 'Cirebon' }, { code: 'H', area: 'Semarang' }, { code: 'AB', area: 'Yogyakarta' },
  { code: 'AD', area: 'Surakarta' }, { code: 'L', area: 'Surabaya' }, { code: 'N', area: 'Malang' },
  { code: 'BK', area: 'Sumatera Utara' }, { code: 'BA', area: 'Sumatera Barat' }, { code: 'BM', area: 'Riau' },
  { code: 'KT', area: 'Kalimantan Timur' }, { code: 'DD', area: 'Sulawesi Selatan' }, { code: 'DK', area: 'Bali' },
  { code: 'DR', area: 'Lombok' },
];

const PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // tanpa I dan O
const pick = (n: number) => Math.floor(Math.random() * n);

export const buildPlate = (code: string) => {
  const digits = 1000 + pick(9000);
  const len = 2 + pick(2);
  let letters = '';
  for (let i = 0; i < len; i++) letters += PLATE_LETTERS[pick(PLATE_LETTERS.length)];
  return `${code} ${digits} ${letters}`;
};

export const randomRegionCode = () => PLATE_REGIONS[pick(PLATE_REGIONS.length)].code;

// ============================================================
// SECTION: Logo Generik (SVG buatan sendiri, bebas dipakai; bukan merek asli)
// ============================================================
const PUMP = '<g fill="none" stroke="#111" stroke-width="3" stroke-linejoin="round"><rect x="12" y="14" width="22" height="40" rx="2"/><rect x="17" y="19" width="12" height="10"/><path d="M34 24h6l5 6v18a3 3 0 0 0 6 0V28"/><path d="M8 58h30"/></g>';
const DROP = '<path d="M30 10C30 10 14 30 14 42a16 16 0 0 0 32 0C46 30 30 10 30 10z" fill="none" stroke="#111" stroke-width="3" stroke-linejoin="round"/>';
const wrap = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="204" height="70" viewBox="0 0 204 70"><rect width="204" height="70" fill="#fff"/>${inner}</svg>`;
const txt = (x: number, y: number, size: number, s: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${size}" fill="#111" ${extra}>${s}</text>`;

export const GENERIC_LOGOS = [
  { id: 'pompa', label: 'SPBU Pompa', svg: wrap(PUMP + txt(60, 42, 30, 'SPBU')) },
  { id: 'energi', label: 'Energi Mandiri', svg: wrap(`<rect x="3" y="3" width="198" height="64" rx="8" fill="none" stroke="#111" stroke-width="3"/>` + txt(102, 36, 20, 'ENERGI MANDIRI', 'text-anchor="middle"') + txt(102, 55, 12, 'BAHAN BAKAR MINYAK', 'text-anchor="middle"')) },
  { id: 'tetes', label: 'BBM Nusantara', svg: wrap(DROP + txt(56, 36, 20, 'BBM') + txt(56, 56, 15, 'NUSANTARA')) },
  { id: 'umum', label: 'SPBU Umum', svg: wrap(`<rect x="3" y="12" width="198" height="46" fill="#111"/>` + txt(102, 46, 28, 'SPBU UMUM', 'text-anchor="middle" style="fill:#fff"')) },
  { id: 'station', label: 'Fuel Station', svg: wrap(PUMP + txt(58, 33, 18, 'FUEL') + txt(58, 54, 18, 'STATION')) },
];

export const svgToDataUri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

// ============================================================
// SECTION: Gaya Nota (tampilan visual struk; BUKAN "Template SPBU" yang berisi data stasiun)
// Pilihan disimpan di localStorage. Semua gaya hanya pakai #000/#fff (kertas thermal).
// ============================================================
export type GayaNota = {
  id: string;
  name: string;
  desc: string;
  font: { family: string; weights?: number[]; google?: boolean; fallback: string };
  size: number; // px teks dasar
  header: 'center' | 'left'; // logo di atas tengah / logo di kiri nama
  title: 'plain' | 'invert' | 'box' | 'spaced';
  sep: 'dash' | 'eq' | 'dot' | 'star' | 'solid' | 'double' | 'dashline';
  meta: 'grid' | 'rows'; // Shift/No.Trans/Tanggal/Jam
  rows: 'cols' | 'stack' | 'table';
  total: 'plain' | 'invert' | 'box' | 'big';
  footer: 'bold' | 'normal' | 'invert';
  upper?: boolean;
};

export const GAYA_NOTA_KEY = 'spbu:gaya-nota:v1';

const mono = (family: string, weights = [400, 700]) => ({ family, weights, google: true, fallback: 'monospace' });
const sans = (family: string, weights = [400, 700]) => ({ family, weights, google: true, fallback: 'sans-serif' });
const local = (family: string, fallback: string) => ({ family, fallback });

export const GAYA_NOTA: GayaNota[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Tampilan asli', font: local('Arimo', 'sans-serif'), size: 16, header: 'center', title: 'plain', sep: 'dashline', meta: 'grid', rows: 'cols', total: 'plain', footer: 'bold' },
  { id: 'space-mono', name: 'Struk Mono', desc: 'Space Mono, garis -', font: mono('Space Mono'), size: 13, header: 'center', title: 'plain', sep: 'dash', meta: 'grid', rows: 'cols', total: 'plain', footer: 'bold' },
  { id: 'plex', name: 'Kasir Plex', desc: 'Nama & total blok hitam', font: mono('IBM Plex Mono'), size: 14, header: 'center', title: 'invert', sep: 'eq', meta: 'rows', rows: 'cols', total: 'invert', footer: 'bold' },
  { id: 'roboto-mono', name: 'Logo Kiri', desc: 'Roboto Mono, berkotak', font: mono('Roboto Mono'), size: 13, header: 'left', title: 'box', sep: 'solid', meta: 'rows', rows: 'cols', total: 'box', footer: 'normal' },
  { id: 'source-code', name: 'Total Besar', desc: 'Source Code Pro, titik', font: mono('Source Code Pro'), size: 14, header: 'center', title: 'spaced', sep: 'dot', meta: 'grid', rows: 'stack', total: 'big', footer: 'bold' },
  { id: 'jetbrains', name: 'Tabel', desc: 'JetBrains Mono, tabel', font: mono('JetBrains Mono'), size: 13, header: 'center', title: 'invert', sep: 'double', meta: 'rows', rows: 'table', total: 'invert', footer: 'normal' },
  { id: 'courier', name: 'Mesin Ketik', desc: 'Courier Prime, kapital', font: mono('Courier Prime'), size: 14, header: 'center', title: 'plain', sep: 'dash', meta: 'rows', rows: 'cols', total: 'plain', footer: 'bold', upper: true },
  { id: 'inconsolata', name: 'Kiri Tabel', desc: 'Inconsolata, garis =', font: mono('Inconsolata'), size: 15, header: 'left', title: 'plain', sep: 'eq', meta: 'grid', rows: 'table', total: 'box', footer: 'normal' },
  { id: 'share-tech', name: 'Digital', desc: 'Share Tech Mono, bintang', font: mono('Share Tech Mono', [400]), size: 15, header: 'center', title: 'spaced', sep: 'star', meta: 'rows', rows: 'cols', total: 'invert', footer: 'normal' },
  { id: 'pt-mono', name: 'Bertumpuk', desc: 'PT Mono, label di atas', font: mono('PT Mono', [400]), size: 14, header: 'center', title: 'box', sep: 'dot', meta: 'grid', rows: 'stack', total: 'big', footer: 'normal' },
  { id: 'fira-mono', name: 'Fira Garis', desc: 'Fira Mono, garis tegas', font: mono('Fira Mono', [400, 500, 700]), size: 13, header: 'center', title: 'invert', sep: 'solid', meta: 'rows', rows: 'cols', total: 'box', footer: 'invert' },
  { id: 'vt323', name: 'Dot Matrix', desc: 'VT323 retro', font: mono('VT323', [400]), size: 19, header: 'center', title: 'plain', sep: 'dash', meta: 'rows', rows: 'cols', total: 'invert', footer: 'normal', upper: true },
  { id: 'condensed', name: 'Ramping', desc: 'Roboto Condensed', font: sans('Roboto Condensed'), size: 16, header: 'left', title: 'invert', sep: 'dashline', meta: 'rows', rows: 'table', total: 'big', footer: 'bold' },
  { id: 'oswald', name: 'Poster', desc: 'Oswald, kapital renggang', font: sans('Oswald'), size: 15, header: 'center', title: 'spaced', sep: 'double', meta: 'grid', rows: 'stack', total: 'invert', footer: 'invert', upper: true },
  { id: 'barlow', name: 'Barlow', desc: 'Barlow Condensed, kotak', font: sans('Barlow Condensed'), size: 17, header: 'center', title: 'box', sep: 'solid', meta: 'rows', rows: 'cols', total: 'big', footer: 'bold' },
  { id: 'tinos', name: 'Formal', desc: 'Tinos serif, garis ganda', font: local('Tinos', 'serif'), size: 15, header: 'center', title: 'plain', sep: 'double', meta: 'rows', rows: 'cols', total: 'box', footer: 'normal' },
  { id: 'cousine', name: 'Cousine', desc: 'Mono bawaan, tabel', font: local('Cousine', 'monospace'), size: 13, header: 'center', title: 'box', sep: 'eq', meta: 'grid', rows: 'table', total: 'plain', footer: 'bold' },
  { id: 'carlito', name: 'Modern', desc: 'Carlito, logo kiri', font: local('Carlito', 'sans-serif'), size: 16, header: 'left', title: 'spaced', sep: 'dashline', meta: 'grid', rows: 'stack', total: 'invert', footer: 'normal' },
  { id: 'minimal', name: 'Minimal', desc: 'Arimo, garis tipis', font: local('Arimo', 'sans-serif'), size: 15, header: 'center', title: 'plain', sep: 'solid', meta: 'rows', rows: 'cols', total: 'big', footer: 'normal' },
  { id: 'tebal', name: 'Tebal', desc: 'Arimo, blok hitam', font: local('Arimo', 'sans-serif'), size: 16, header: 'center', title: 'invert', sep: 'eq', meta: 'grid', rows: 'cols', total: 'invert', footer: 'invert', upper: true },
];
