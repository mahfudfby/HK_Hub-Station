import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import FormSection from './FormSection';
import { GaleriLipat } from './SharedGallery';

// Setiap menu punya dua halaman:
// - "Isi Formulir": isian + preview dokumen
// - "Edit Tampilan": tampilan (ukuran teks, analog, template, kertas), galeri foto, unduh/simpan + preview
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return [canvas, setCanvas] as const;
}

// ModeTabs dipindahkan ke dekat Preview Dokumen (di dalam FitPreview) agar selalu terlihat.
// Komponen ini mengembalikan null agar tidak terjadi tombol ganda di bagian atas formulir.
export function ModeTabs(_props?: { canvas?: boolean; onChange?: (canvas: boolean) => void }) {
  return null;
}

// Isi kartu kiri di halaman Edit Tampilan: tampilan, galeri foto, tombol unduh (desktop & ponsel sama-sama di sini)
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
        <GaleriLipat>{galeri}</GaleriLipat>
      )}
    </>
  );
}
