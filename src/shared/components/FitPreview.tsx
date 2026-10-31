import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const MIN_ZOOM = 25;
const MAX_ZOOM = 150;

// Preview dokumen (hanya tampilan): awalnya selebar kolom tanpa geser ke samping.
// Desktop: slider zoom 25–150%. Ponsel: tombol Perbesar (100%) / Perkecil.
// Ukuran dokumen tidak berubah; saat export pakai `onclone: unfitPreview` agar skala dilepas.
export default function FitPreview({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ k: 1, w: 0, h: 0 });
  const [zoom, setZoom] = useState<number | null>(null); // null = pas selebar kolom

  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const w = inner.current.offsetWidth; // offset* tidak terpengaruh transform
      const h = inner.current.offsetHeight;
      setBox({ k: Math.min(1, outer.current.clientWidth / w), w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current!);
    ro.observe(inner.current!);
    return () => ro.disconnect();
  }, []);

  const k = zoom ?? box.k;
  const pct = Math.round(k * 100);
  const bigger = k > box.k + 0.001;

  return (
    // min-w-0: tanpa ini kolom grid/flex induk ikut melebar mengikuti isi, sehingga skala tidak pernah mengecil
    <div className="w-full min-w-0">
      {/* Desktop: slider zoom */}
      <div className="mb-2 hidden items-center justify-end gap-2 text-sm text-gray-700 md:flex">
        <ZoomOut size={16} aria-hidden="true" />
        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={5} value={pct}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          aria-label="Zoom preview" className="w-40 accent-blue-600" />
        <ZoomIn size={16} aria-hidden="true" />
        <span className="w-11 text-right tabular-nums">{pct}%</span>
        <button type="button" onClick={() => setZoom(null)} disabled={zoom === null}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 font-medium hover:bg-gray-50 disabled:opacity-50">
          Pas
        </button>
      </div>
      {/* Ponsel: tombol Perbesar */}
      {box.k < 1 && (
        <div className="mb-2 flex justify-end md:hidden">
          <button type="button" onClick={() => setZoom(bigger ? null : 1)} aria-pressed={bigger}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {bigger ? <ZoomOut size={16} aria-hidden="true" /> : <ZoomIn size={16} aria-hidden="true" />}
            {bigger ? 'Perkecil' : 'Perbesar (100%)'}
          </button>
        </div>
      )}
      <div ref={outer} className={`w-full flex ${bigger ? 'overflow-auto max-h-[85vh]' : 'justify-center overflow-hidden'}`}>
        <div className="shrink-0" style={{ width: box.w * k || undefined, height: box.h * k || undefined }}>
          <div ref={inner} data-fit-preview style={{ display: 'flow-root', width: 'max-content', transform: `scale(${k})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// html2canvas onclone: lepas skala preview supaya file export berukuran kertas asli.
export function unfitPreview(doc: Document) {
  doc.querySelectorAll<HTMLElement>('[data-fit-preview]').forEach((el) => (el.style.transform = 'none'));
}
