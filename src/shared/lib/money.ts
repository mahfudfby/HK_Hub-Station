// Format & terbilang Rupiah untuk invoice, faktur, dan nota.

export const rupiah = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));
export const num = (v: string | number) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const S = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function words(n: number): string {
  if (n < 12) return S[n];
  if (n < 20) return `${words(n - 10)} belas`;
  if (n < 100) return `${words(Math.floor(n / 10))} puluh ${words(n % 10)}`;
  if (n < 200) return `seratus ${words(n - 100)}`;
  if (n < 1000) return `${words(Math.floor(n / 100))} ratus ${words(n % 100)}`;
  if (n < 2000) return `seribu ${words(n - 1000)}`;
  const units: [number, string][] = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']];
  for (const [u, name] of units) if (n >= u) return `${words(Math.floor(n / u))} ${name} ${words(n % u)}`;
  return '';
}

// "Satu juta dua ratus lima puluh ribu rupiah"
export function terbilangRupiah(n: number): string {
  const v = Math.round(Math.abs(n));
  const t = v === 0 ? 'nol' : words(v).replace(/\s+/g, ' ').trim();
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}

console.assert(
  terbilangRupiah(1250000) === 'Satu juta dua ratus lima puluh ribu rupiah' &&
    terbilangRupiah(1011) === 'Seribu sebelas rupiah' &&
    terbilangRupiah(215) === 'Dua ratus lima belas rupiah' &&
    terbilangRupiah(0) === 'Nol rupiah',
  'terbilangRupiah',
);
