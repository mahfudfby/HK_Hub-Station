// Nomor dokumen dengan susunan terkunci (mis. INV/2026/001): pengguna hanya mengisi kotak nomor & kode,
// pemisah (garis miring / strip) tetap dan tidak bisa diketik. Nilai tetap disimpan sebagai satu teks.

// Bagi teks lama ke n kotak; kelebihan bagian digabung ke kotak terakhir
export const splitParts = (v: string, n: number, sep: string) => {
  const p = (v || '').split(sep);
  return p.length > n ? [...p.slice(0, n - 1), p.slice(n - 1).join('')] : [...p, ...Array(n - p.length).fill('')];
};
// Hanya huruf, angka, titik, strip & spasi; pemisah format selalu dibuang
export const cleanPart = (v: string, sep: string) => v.replace(/[^\p{L}\p{N}.\- ]/gu, '').split(sep).join('');
console.assert(
  splitParts('INV/2026/001', 3, '/').join('|') === 'INV|2026|001' && splitParts('A/B/C/D', 3, '/')[2] === 'CD' &&
  splitParts('', 2, '-').join('|') === '|' && cleanPart('20/26', '/') === '2026' && cleanPart('Kes-3', '/') === 'Kes-3' && cleanPart('TRX-1', '-') === 'TRX1',
  'NumberFormatInput',
);

export default function NumberFormatInput({ parts, value, onChange, sep = '/' }: {
  parts: string[]; // label tiap kotak, mis. ['Kode', 'Tahun', 'No. urut']
  value: string;
  onChange: (v: string) => void;
  sep?: string;
}) {
  const vals = splitParts(value, parts.length, sep);
  const setPart = (i: number, v: string) => {
    const next = vals.map((p, j) => (j === i ? cleanPart(v, sep) : p));
    onChange(next.every((p) => !p) ? '' : next.join(sep));
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((label, i) => (
        <span key={label + i} className="flex items-center gap-1 flex-1 min-w-[4.5rem]">
          {i > 0 && <span aria-hidden="true" className="font-bold text-gray-700 select-none">{sep}</span>}
          <input value={vals[i]} onChange={(e) => setPart(i, e.target.value)} placeholder={label} aria-label={label}
            className="w-full min-w-0 p-2 border border-gray-300 rounded-lg text-sm text-center" />
        </span>
      ))}
    </div>
  );
}
