import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { LETTER_FONT, inputCls } from '../../shared/components/LetterKit';
import { LayoutLetter, SignBlock, splitSigners, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { terbilangRupiah } from '../../shared/lib/money';
import { usePagination } from '../surat-kontrak-kerja/usePagination';

// Surat multi-halaman berbasis LetterLayouts (dipakai Penawaran Kerja, SK Karyawan Tetap, PHK, BAST Jabatan):
// halaman 1 = template terpilih, isi dipecah jadi unit dan berlanjut ke halaman berikut (paginasi Kontrak Kerja),
// huruf tetap ukuran normal; penutup + tanda tangan selalu di halaman terakhir.

export type Unit = { el: ReactNode; g: number }; // g = kelompok (unit sekelompok diusahakan satu halaman)
export const SIGN = -99; // kelompok paragraf terakhir + penutup tanda tangan: tidak pernah terpisah

// ---- Lampiran otomatis: jumlah lembar sesudah halaman pertama
export const lampiranOtomatis = (pages: number) => {
  const n = pages - 1;
  return n > 0 ? `${n} (${terbilangRupiah(n).replace(/ rupiah$/, '').toLowerCase()}) lembar` : '-';
};
console.assert(lampiranOtomatis(1) === '-' && lampiranOtomatis(3) === '2 (dua) lembar' && lampiranOtomatis(13) === '12 (dua belas) lembar', 'lampiranOtomatis');

export function LampiranField({ manual, value, auto, onManual, onValue }: {
  manual: boolean; value: string; auto: string; onManual: (v: boolean) => void; onValue: (v: string) => void;
}) {
  const tab = (on: boolean) => `px-3 min-h-[40px] rounded-lg border text-sm font-medium ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`;
  return (
    <div className="space-y-1 text-sm font-medium text-gray-700">
      <p>Lampiran</p>
      <div className="flex gap-2">
        <button type="button" className={tab(!manual)} aria-pressed={!manual} onClick={() => onManual(false)}>Otomatis</button>
        <button type="button" className={tab(manual)} aria-pressed={manual} onClick={() => onManual(true)}>Manual</button>
      </div>
      {manual
        ? <input aria-label="Lampiran (manual)" placeholder="mis. 1 (satu) berkas" className={inputCls} value={value} onChange={(e) => onValue(e.target.value)} />
        : <input aria-label="Lampiran (otomatis dari jumlah halaman)" readOnly className={`${inputCls} bg-gray-50 text-gray-600`} value={auto} />}
      {!manual && <p className="text-xs font-normal text-gray-500">Mengikuti jumlah lembar sesudah halaman pertama.</p>}
    </div>
  );
}

// ---- Penutup: tempat/tanggal, tanda tangan (utama kanan; 2+ lainnya sebaris, utama di tengah bawahnya), catatan
export function ClosingSigns({ placeDate, signers, title, footer, k }: { placeDate: string; signers: LayoutSigner[]; title?: string; footer?: ReactNode; k: number }) {
  const { main, others } = signers.length ? splitSigners(signers) : { main: undefined, others: [] };
  const w = signers.length >= 3 ? 140 : 170;
  const row = (list: ReactNode, justify: string) => <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: justify, alignItems: 'flex-end', gap: 16 * k }}>{list}</div>;
  const othersEl = others.map((s, i) => <SignBlock key={i} s={s} k={k} width={w} />);
  return (
    <div style={{ paddingTop: 8 * k }}>
      {placeDate && <div style={{ textAlign: 'right', marginBottom: 2 * k }}>{placeDate}</div>}
      {others.length >= 2 ? <>
        {row(othersEl, 'space-between')}
        {main && <div style={{ marginTop: 10 * k }}>{title && <div style={{ textAlign: 'center' }}>{title}</div>}{row(<SignBlock s={main} k={k} width={w} />, 'center')}</div>}
      </> : main && row(<>{othersEl}{<SignBlock s={main} k={k} align="right" width={w} />}</>, others.length ? 'space-between' : 'flex-end')}
      {footer && <div style={{ marginTop: 10 * k, fontSize: '0.85em' }}>{footer}</div>}
    </div>
  );
}

// ---- Paginasi + render halaman. deps: semua yang mengubah tinggi isi (form, gambar).
export function usePagedLetter(units: Unit[], deps: unknown[], rootRef: RefObject<HTMLElement>, o: { gaya: string; pg: { W: number; H: number; f: number }; kk: number; title?: string; nomor?: string }) {
  // Font halaman lanjutan = font template halaman 1 (dibaca dari hasil render)
  const [look, setLook] = useState({ ff: LETTER_FONT, fs: '', lh: '1.45' });
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    const bump = () => setFontTick((x) => x + 1); // font web selesai dimuat: tata letak berubah, hitung ulang
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => document.fonts.removeEventListener?.('loadingdone', bump);
  }, []);
  useLayoutEffect(() => {
    const root = rootRef.current?.querySelector('[data-page]')?.firstElementChild;
    if (!root) return;
    const cs = getComputedStyle(root);
    if (cs.fontFamily !== look.ff || cs.fontSize !== look.fs || cs.lineHeight !== look.lh) setLook({ ff: cs.fontFamily, fs: cs.fontSize, lh: cs.lineHeight });
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageKey = useMemo(() => ({}), [...deps, o.gaya, o.pg.W, o.pg.H, o.kk, look, fontTick]);
  const ranges = usePagination(units.length, units.map((u) => u.g), pageKey, () => rootRef.current);

  const { pg, kk } = o;
  const flow = ([a, b]: readonly [number, number]) => <div data-flow>{units.slice(a, b).map((u, i) => <div key={a + i} style={{ display: 'flow-root' }}>{u.el}</div>)}</div>;
  const pageBox = { position: 'relative', width: pg.W, height: pg.H, overflow: 'hidden', background: '#fff' } as const;
  // shortcut: P/InfoRows memakai gaya template hanya di halaman 1; halaman lanjutan memakai gaya bawaan.
  const render = (doc: Omit<LayoutDoc, 'body'>) => ranges.map((r, i) => (
    <div key={i} data-page className="shadow-lg" style={pageBox}>
      {i === 0 ? <LayoutLetter layout={o.gaya} doc={{ ...doc, body: flow(r) }} k={kk} W={pg.W} H={pg.H} pf={pg.f} /> : (
        <div style={{ height: '100%', boxSizing: 'border-box', padding: `${40 * pg.f}px ${56 * pg.f}px`, color: '#000', fontFamily: look.ff, fontSize: look.fs || 13 * kk, lineHeight: look.lh, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 * kk, fontSize: '0.8em', color: '#444', borderBottom: '1px solid #999', paddingBottom: 3 * kk, marginBottom: 12 * kk }}>
            <span>{o.title?.replace(/\s*\n\s*/g, ' ')}</span>
            {o.nomor && <span style={{ textAlign: 'right' }}>Nomor: {o.nomor}</span>}
          </div>
          {flow(r)}
        </div>
      )}
      {ranges.length > 1 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: (o.gaya === 'bingkai' ? 5 : 14) * pg.f, textAlign: 'center', fontFamily: look.ff, fontSize: 10 * kk, color: '#444' }}>
          Halaman {i + 1} dari {ranges.length}
        </div>
      )}
    </div>
  ));
  return { count: ranges.length, render };
}
