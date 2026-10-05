import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { routes } from '../../router/routes';
import QrisCard from '../../shared/components/QrisCard';

// ============================================================
// SECTION: Types & Constants
// ============================================================
type ToastState = { type: 'success' | 'error'; message: string } | null;

const cardClass =
  'group flex items-center gap-4 min-h-[44px] rounded-2xl border border-slate-700 bg-slate-800/70 p-4 ' +
  'transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800 hover:shadow-lg ' +
  'active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300';

// ============================================================
// SECTION: Toast (top-level, bukan di dalam komponen lain)
// ============================================================
function Toast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const ok = toast.type === 'success';
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-xl border p-4 shadow-xl animate-[toastIn_250ms_ease-out] ${
        ok ? 'border-emerald-700 bg-emerald-950 text-emerald-100' : 'border-red-700 bg-red-950 text-red-100'
      }`}
    >
      <span aria-hidden="true" className="mt-0.5">{ok ? <Check size={18} /> : <AlertCircle size={18} />}</span>
      <div className="flex-1 text-sm">
        <strong className="block">{ok ? 'Berhasil' : 'Gagal'}</strong>
        <p>{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

// ============================================================
// SECTION: Home (Linktree Hub)
// ============================================================
export default function Home() {
  const [toast, setToast] = useState<ToastState>(null);
  const apps = routes
    .filter((r) => r.path !== '/' && 'title' in r)
    .map((r) => ({ ...r, path: r.path.replace(/\/\*$/, '') })); // '/spbu/*' -> '/spbu'

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================================
  // SECTION: Handler — Salin Tautan
  // ============================================================
  const copyLink = useCallback(async (path: string, title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setToast({ type: 'success', message: `Tautan "${title}" berhasil disalin ke clipboard.` });
    } catch {
      setToast({ type: 'error', message: 'Gagal menyalin tautan: izin clipboard ditolak oleh browser.' });
    }
  }, []);

  // ============================================================
  // SECTION: Render
  // ============================================================
  return (
    <main className="hub min-h-screen bg-slate-900 px-4 py-12 text-slate-100 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600 bg-slate-800 text-2xl font-bold" aria-hidden="true">HK</div>
          <h1 className="text-2xl font-bold tracking-tight">HK Hub Station</h1>
          <p className="mt-2 text-sm text-slate-300">Kumpulan aplikasi web praktis dalam satu tautan.</p>
        </header>

        <QrisCard />

        <ul className="space-y-3">
          {apps.map((app) => (
            <li key={app.path} className="flex items-stretch gap-2">
              <Link to={app.path} className={`${cardClass} flex-1`} aria-label={`Buka ${app.title}`}>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold">{app.title}</span>
                  <span className="mt-0.5 block whitespace-pre-line text-sm text-slate-300">{app.desc}</span>
                </div>
                <ArrowUpRight size={20} aria-hidden="true" className="shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <button
                onClick={() => copyLink(app.path, app.title as string)}
                aria-label={`Salin tautan ${app.title}`}
                className="flex min-h-[44px] w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/70 text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                <Copy size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <footer className="mt-12 text-center text-xs text-slate-400">HK Hub Station</footer>
      </div>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
