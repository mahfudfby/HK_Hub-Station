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
// SECTION: Template Harga (HARGA CONTOH, sesuaikan manual)
// ============================================================
export const PRICE_TEMPLATES = [
  { label: 'Pertalite - 10.000', productName: 'Pertalite', pricePerLiter: 10000 },
  { label: 'Pertamax - 12.500', productName: 'Pertamax', pricePerLiter: 12500 },
  { label: 'Pertamax Turbo - 13.500', productName: 'Pertamax Turbo', pricePerLiter: 13500 },
  { label: 'Biosolar - 6.800', productName: 'Biosolar', pricePerLiter: 6800 },
  { label: 'Dexlite - 13.000', productName: 'Dexlite', pricePerLiter: 13000 },
  { label: 'Pertamina Dex - 13.500', productName: 'Pertamina Dex', pricePerLiter: 13500 },
];

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
  { id: 'umum', label: 'SPBU Umum', svg: wrap(`<rect x="3" y="12" width="198" height="46" fill="#111"/>` + txt(102, 46, 28, 'SPBU UMUM', 'text-anchor="middle" fill="#fff"')) },
  { id: 'station', label: 'Fuel Station', svg: wrap(PUMP + txt(58, 33, 18, 'FUEL') + txt(58, 54, 18, 'STATION')) },
];

export const svgToDataUri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
