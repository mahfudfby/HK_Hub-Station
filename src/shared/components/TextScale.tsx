import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Ukuran teks dokumen: slider 70–150% + penjaga agar isi tidak keluar kertas.
// Cara pakai: simpan `skala` (persen) di state halaman, lalu
//   const k = useFitScale(skala / 100, () => pageEl, true, [data]);
// dan kalikan ukuran huruf/jarak dokumen dengan k (atau bungkus isi dengan <ScaleBox k={k}>).

export const SCALE_MIN = 70;
export const SCALE_MAX = 150;

// Turunkan skala bertahap (5%) sampai halaman tidak meluap. fixed=false (kertas gulung): hanya cek lebar.
export function useFitScale(desired: number, getPage: () => HTMLElement | null | undefined, fixed: boolean, deps: unknown[]) {
  const [eff, setEff] = useState(desired);
  const [fontTick, setFontTick] = useState(0);
  // Data/ukuran berubah: mulai lagi dari skala yang diminta
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => setEff(desired), [desired, fontTick, ...deps]);
  useLayoutEffect(() => {
    const el = getPage();
    if (!el) return;
    const over = el.scrollWidth > el.offsetWidth + 1 || (fixed && el.scrollHeight > el.offsetHeight + 1);
    if (over && eff > 0.3) setEff(Math.round((eff - 0.05) * 100) / 100); // batas bawah 30% agar tidak berulang tanpa akhir
  });
  // Font web selesai dimuat bisa mengubah tata letak: periksa ulang
  useEffect(() => {
    const f = () => setFontTick((t) => t + 1);
    document.fonts.addEventListener?.('loadingdone', f);
    return () => document.fonts.removeEventListener?.('loadingdone', f);
  }, []);
  return eff;
}

export function TextSizeSlider({ value, onChange, effective }: { value: number; onChange: (v: number) => void; effective: number }) {
  const shown = Math.round(effective * 100);
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between text-sm font-medium text-gray-700">
        <span>Ukuran teks</span>
        <span className="tabular-nums">{value}%</span>
      </label>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500" aria-hidden="true">A</span>
        <input type="range" min={SCALE_MIN} max={SCALE_MAX} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Ukuran teks" className="flex-1 accent-blue-600 h-11" />
        <span className="text-lg font-semibold text-gray-700" aria-hidden="true">A</span>
        <button type="button" onClick={() => onChange(100)} disabled={value === 100}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">Reset</button>
      </div>
      {shown < value && <p className="text-xs text-amber-700">Dikecilkan otomatis ke {shown}% agar isi tetap muat di kertas.</p>}
    </div>
  );
}

// Untuk dokumen yang ukuran hurufnya tidak bisa dikalikan langsung: isi diperkecil/diperbesar sebagai satu blok
// dengan lebar disesuaikan, jadi teks tetap membungkus (wrap) di dalam lebar kertas.
export function ScaleBox({ k, children }: { k: number; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number>();
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const fit = () => setH(el.offsetHeight * k); // tinggi luar = tinggi isi × skala (transform tidak mengubah tata letak)
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [k]);
  if (Math.abs(k - 1) < 0.001) return <>{children}</>;
  return (
    <div style={{ width: '100%', height: h }}>
      <div ref={inner} data-scale-box style={{ width: `${100 / k}%`, transform: `scale(${k})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
