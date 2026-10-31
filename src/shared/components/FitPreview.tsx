import { ReactNode, useLayoutEffect, useRef, useState } from 'react';

// Mengecilkan preview dokumen (hanya tampilan) agar muat satu layar ponsel.
// Ukuran asli dokumen tidak berubah; saat export pakai `onclone: unfitPreview` agar skala dilepas.
export default function FitPreview({ children, maxVh = 0.8 }: { children: ReactNode; maxVh?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ k: 1, w: 0, h: 0 });

  useLayoutEffect(() => {
    const fit = () => {
      if (!outer.current || !inner.current) return;
      const w = inner.current.offsetWidth; // offset* tidak terpengaruh transform
      const h = inner.current.offsetHeight;
      const k = Math.min(1, outer.current.clientWidth / w, (window.innerHeight * maxVh) / h);
      setBox({ k, w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer.current!);
    ro.observe(inner.current!);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [maxVh]);

  return (
    <div ref={outer} className="w-full flex justify-center overflow-hidden">
      <div style={{ width: box.w * box.k || undefined, height: box.h * box.k || undefined }}>
        <div ref={inner} data-fit-preview style={{ display: 'flow-root', width: 'max-content', transform: `scale(${box.k})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// html2canvas onclone: lepas skala preview supaya file export berukuran kertas asli.
export function unfitPreview(doc: Document) {
  doc.querySelectorAll<HTMLElement>('[data-fit-preview]').forEach((el) => (el.style.transform = 'none'));
}
