import { useEffect } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';

// Spinner & Toast bersama (dipakai QrisCard, SPBU, Surat Dokter).
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export type ToastType = 'success' | 'error' | 'info' | 'loading';
export type ToastState = { type: ToastType; message: string } | null;

const STYLE: Record<ToastType, string> = {
  success: 'border-emerald-600 bg-emerald-50 text-emerald-900',
  error: 'border-red-600 bg-red-50 text-red-900',
  info: 'border-sky-600 bg-sky-50 text-sky-900',
  loading: 'border-slate-500 bg-white text-slate-800',
};
const TITLE: Record<ToastType, string> = { success: 'Berhasil', error: 'Gagal', info: 'Info', loading: 'Memproses…' };

// Hilang sendiri setelah 5 dtk, kecuali 'loading' (diganti oleh status berikutnya) dan 'error' (ditutup manual).
export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast || toast.type === 'loading' || toast.type === 'error') return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const Icon = { success: Check, error: AlertCircle, info: Info, loading: null }[toast.type];
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 font-sans shadow-xl ${STYLE[toast.type]}`}
    >
      <span className="mt-0.5">{Icon ? <Icon size={18} aria-hidden="true" /> : <Spinner className="h-[18px] w-[18px]" />}</span>
      <div className="flex-1 text-sm">
        <strong className="block">{TITLE[toast.type]}</strong>
        <p>{toast.message}</p>
      </div>
      <button onClick={onClose} aria-label="Tutup notifikasi" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/5">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
