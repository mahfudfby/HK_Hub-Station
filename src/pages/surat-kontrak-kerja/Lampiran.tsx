import { inputCls } from '../../shared/components/LetterKit';
import { terbilangRupiah } from '../../shared/lib/money';

// Lampiran dokumen multi-halaman. Otomatis = lembar sesudah halaman pertama ("2 (dua) lembar"); 1 halaman = "-".
// Dihitung dari hasil paginasi (ranges.length) yang sudah stabil, jadi tidak memicu render berulang.
export const lampiranOtomatis = (pages: number) =>
  pages > 1 ? `${pages - 1} (${terbilangRupiah(pages - 1).replace(/ rupiah$/, '').toLowerCase()}) lembar` : '-';
console.assert(lampiranOtomatis(1) === '-' && lampiranOtomatis(3) === '2 (dua) lembar' && lampiranOtomatis(12) === '11 (sebelas) lembar', 'lampiranOtomatis');

export const lampiranTeks = (auto: boolean, manual: string, pages: number) => (auto ? lampiranOtomatis(pages) : manual.trim() || '-');

export function LampiranField({ auto, manual, pages, onAuto, onManual }: {
  auto: boolean; manual: string; pages: number; onAuto: (v: boolean) => void; onManual: (v: string) => void;
}) {
  const tab = (on: boolean) => `flex-1 min-h-[40px] rounded-md text-sm font-medium ${on ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`;
  return (
    <div className="text-sm font-medium text-gray-700">
      <p className="mb-1">Lampiran</p>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="Mode lampiran">
        <button type="button" className={tab(auto)} aria-pressed={auto} onClick={() => onAuto(true)}>Otomatis</button>
        <button type="button" className={tab(!auto)} aria-pressed={!auto} onClick={() => onAuto(false)}>Manual</button>
      </div>
      {auto ? (
        <input readOnly aria-label="Lampiran (otomatis)" className={`${inputCls} mt-1 bg-gray-50 text-gray-700`} value={`${lampiranOtomatis(pages)} — dokumen ${pages} halaman`} />
      ) : (
        <input aria-label="Lampiran (manual)" placeholder="mis. 1 (satu) berkas" className={`${inputCls} mt-1`} value={manual} onChange={(e) => onManual(e.target.value)} />
      )}
    </div>
  );
}
