import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Palette } from 'lucide-react';
import FormSection from './FormSection';

// Setiap menu punya dua halaman:
// - "Isi Formulir": isian + preview dokumen
// - "Edit Canvas": tampilan (ukuran teks, analog, template, kertas), galeri foto, unduh/simpan + preview
// Disimpan di URL (?mode=canvas) agar tombol Kembali browser & tautan langsung berfungsi.
export function useCanvasMode() {
  const [sp, setSp] = useSearchParams();
  const canvas = sp.get('mode') === 'canvas';
  const setCanvas = (v: boolean) => {
    if (v === canvas) return;
    const next = new URLSearchParams(sp);
    if (v) next.set('mode', 'canvas');
    else next.delete('mode');
    setSp(next);
    window.scrollTo({ top: 0 });
  };
  return [canvas, setCanvas] as const;
}

export function ModeTabs({ canvas, onChange }: { canvas: boolean; onChange: (canvas: boolean) => void }) {
  const tab = (on: boolean) =>
    `flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl border text-sm font-bold ${on ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'}`;
  return (
    <div className="mb-5 flex flex-col items-center gap-1.5">
      <div role="tablist" aria-label="Halaman menu" className="grid w-full max-w-md grid-cols-2 gap-2">
        <button type="button" role="tab" aria-selected={!canvas} onClick={() => onChange(false)} className={tab(!canvas)}>
          <FileText size={18} aria-hidden="true" /> Isi Formulir
        </button>
        <button type="button" role="tab" aria-selected={canvas} onClick={() => onChange(true)} className={tab(canvas)}>
          <Palette size={18} aria-hidden="true" /> Edit Canvas
        </button>
      </div>
      <p className="text-base font-bold text-gray-800">Download dan simpan dari menu <b>Edit Canvas</b>.</p>
    </div>
  );
}

// Isi kartu kiri di halaman Edit Canvas: tampilan, galeri foto, tombol unduh (desktop & ponsel sama-sama di sini)
export function CanvasPanel({ tampilan, galeri, unduh }: { tampilan?: ReactNode; galeri?: ReactNode; unduh: ReactNode }) {
  return (
    <>
      <FormSection title="Download & Simpan">
        <div className="flex flex-wrap gap-3">{unduh}</div>
      </FormSection>
      {tampilan && (
        <FormSection title="Tampilan">
          {tampilan}
        </FormSection>
      )}
      {galeri && (
        <section className="space-y-2">
          <h2 className="font-bold">Galeri Foto</h2>
          {galeri}
        </section>
      )}
    </>
  );
}
