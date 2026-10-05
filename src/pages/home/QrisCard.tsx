import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ============================================================
// SECTION: Config — ganti URL gambar QRIS di sini (atau lewat env)
// Opsi 1: taruh file di public/qris.png  -> '/qris.png'
// Opsi 2: upload ke Cloudinary lalu isi VITE_QRIS_IMAGE_URL (URL secure_url)
// ============================================================
const QRIS_IMAGE_URL: string = import.meta.env.VITE_QRIS_IMAGE_URL || '/qris.png';

// ============================================================
// SECTION: Modal QRIS (top-level)
// ============================================================
function QrisModal({ onClose }: { onClose: () => void }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QRIS"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <h2 className="mb-3 pr-8 text-lg font-bold text-slate-800">Scan QRIS</h2>
        {failed ? (
          <p className="py-8 text-sm text-slate-600">Gambar QRIS belum tersedia. Letakkan file di <code>public/qris.png</code> atau isi <code>VITE_QRIS_IMAGE_URL</code>.</p>
        ) : (
          <img src={QRIS_IMAGE_URL} alt="Kode QRIS" onError={() => setFailed(true)} className="mx-auto max-h-[70vh] w-full rounded-lg object-contain" />
        )}
        <p className="mt-3 text-sm text-slate-600">Terima kasih banyak atas traktirannya!</p>
      </div>
    </div>
  );
}

// ============================================================
// SECTION: Kartu Traktir (tampil di Home)
// ============================================================
export default function QrisCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-8 rounded-2xl bg-white p-6 text-center shadow-lg" aria-label="Traktir">
      <p className="mb-4 text-base font-bold text-slate-700 [text-shadow:none]">Traktir Saya Dengan Cara Klik Tombol di Bawah Ini:</p>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-extrabold uppercase leading-tight tracking-wide text-white shadow-md transition-all duration-200 hover:bg-red-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 [text-shadow:none]"
      >
        SCAN - Q R I S<br />DISINI BRO
      </button>
      {open && <QrisModal onClose={() => setOpen(false)} />}
    </section>
  );
}
