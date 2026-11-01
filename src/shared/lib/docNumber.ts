// Nomor dokumen acak tapi tetap mengikuti susunan format, untuk isian bawaan (nomor tidak pernah kosong).
// Pola: {n3} = angka acak 3 digit (001–999), {nN} = N digit; {rom} = bulan romawi; {mm} bulan 2 digit;
// {dd} tanggal; {yyyy} / {yy} tahun; {A3} = 3 huruf kapital acak. Contoh: '{n3}/UND/{rom}/{yyyy}' -> '047/UND/XI/2026'.
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const rnd = (max: number) => Math.floor(Math.random() * max);

export function randomDocNo(pattern: string, d = new Date()): string {
  return pattern.replace(/\{(n(\d)|A(\d)|rom|mm|dd|yyyy|yy)\}/g, (_, t: string, nd?: string, ad?: string) => {
    if (nd) {
      const n = Number(nd);
      return String(1 + rnd(10 ** n - 1)).padStart(n, '0');
    }
    if (ad) return Array.from({ length: Number(ad) }, () => String.fromCharCode(65 + rnd(26))).join('');
    if (t === 'rom') return ROMAN[d.getMonth()];
    if (t === 'mm') return String(d.getMonth() + 1).padStart(2, '0');
    if (t === 'dd') return String(d.getDate()).padStart(2, '0');
    if (t === 'yyyy') return String(d.getFullYear());
    return String(d.getFullYear()).slice(2); // yy
  });
}

// Isi nomor kosong (mis. data lama tersimpan) dengan nomor acak sesuai pola
export const orRandomNo = (v: string | undefined, pattern: string) => (v && v.trim() ? v : randomDocNo(pattern));

{
  const d = new Date(2026, 10, 5);
  const a = randomDocNo('{n3}/UND/{rom}/{yyyy}', d);
  const b = randomDocNo('INV/{yy}{mm}{dd}/{n4}-{A3}', d);
  console.assert(/^\d{3}\/UND\/XI\/2026$/.test(a) && a !== '000/UND/XI/2026', 'randomDocNo rom', a);
  console.assert(/^INV\/261105\/\d{4}-[A-Z]{3}$/.test(b), 'randomDocNo mix', b);
  console.assert(orRandomNo('  ', 'X-{n2}').startsWith('X-') && orRandomNo('ABC', 'X') === 'ABC', 'orRandomNo');
}
