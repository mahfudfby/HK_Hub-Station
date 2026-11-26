import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Image, Printer } from 'lucide-react';
import { Spinner } from './Feedback';
import type { ExportKind } from './LetterKit';
import { QRIS_IMAGE_URL } from './QrisCard';

const DETIK = 4;
const PILIHAN = [
  { kind: 'PNG', label: 'Gambar', Icon: Image },
  { kind: 'PDF', label: 'PDF', Icon: FileText },
  { kind: 'Print', label: 'Print', Icon: Printer },
] as const;

// ===== SECTION: Pop-up QRIS + hitung mundur 4 titik sebelum unduhan dimulai =====
function QrisTunggu({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [sisa, setSisa] = useState(DETIK);

  useEffect(() => {
    if (sisa === 0) return onDone();
    const t = setTimeout(() => setSisa(sisa - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Menyiapkan unduhan" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[260px] rounded-2xl bg-white p-4 text-center shadow-2xl">
        <img src={QRIS_IMAGE_URL} alt="Kode QRIS" className="mx-auto max-h-[45vh] min-h-[140px] w-full rounded-lg object-contain" />
        <p className="unduh-ambang mt-3 whitespace-nowrap text-[13px] font-extrabold text-green-800 [text-shadow:none]">Jangan Lupa Ber-terimakasih</p>
        <div className="mt-3 flex justify-center gap-3" aria-hidden="true">
          {Array.from({ length: DETIK }, (_, i) => (
            <span key={i} className={`h-4 w-4 rounded-full border-2 border-green-500 ${i < sisa ? 'bg-green-500' : 'bg-transparent'}`} />
          ))}
        </div>
        <p role="status" className="mt-2 text-sm font-medium text-gray-700 [text-shadow:none]">Unduhan dimulai dalam {sisa} detik</p>
      </div>
    </div>,
    document.body,
  );
}

// ===== SECTION: Tombol DOWNLOAD + menu pilihan =====
export function ExportMenu({ exporting, disabled, onRun }: {
  exporting: boolean | '' | ExportKind; disabled?: boolean; onRun: (k: ExportKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tunggu, setTunggu] = useState<'' | ExportKind>('');
  const sibuk = !!exporting;

  const pilih = (kind: ExportKind) => {
    setOpen(false);
    // Print langsung: jendela cetak sebagian browser hanya boleh dibuka dari klik pengguna
    if (kind === 'Print') onRun(kind);
    else setTunggu(kind);
  };

  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen((v) => !v)} disabled={sibuk || disabled} aria-expanded={open}
        className="unduh-menyala flex min-h-[60px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-green-700 px-3 py-4 text-lg font-extrabold text-white sm:text-xl hover:bg-green-800 disabled:opacity-60 [text-shadow:none]">
        {sibuk ? <Spinner /> : <Download size={24} aria-hidden="true" />}
        {sibuk ? 'Memproses…' : 'DOWNLOAD Here !'}
      </button>
      {/* Menu ikut alur halaman (bukan melayang) agar tidak terpotong panel di ponsel */}
      {open && !sibuk && !disabled && (
        <div className="mt-2 overflow-hidden rounded-xl border-2 border-green-700 bg-white shadow-lg">
          {PILIHAN.map(({ kind, label, Icon }) => (
            <button key={kind} type="button" onClick={() => pilih(kind)}
              className="flex min-h-[48px] w-full items-center gap-3 border-b border-gray-200 px-5 py-3 text-left text-base font-bold text-gray-800 last:border-b-0 hover:bg-green-50 [text-shadow:none]">
              <Icon size={20} className="text-green-700" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      )}
      {tunggu && <QrisTunggu onDone={() => { setTunggu(''); onRun(tunggu); }} onCancel={() => setTunggu('')} />}
    </div>
  );
}
