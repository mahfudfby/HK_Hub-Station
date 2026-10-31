import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Check, Copy, Search, X } from 'lucide-react';
import { routes } from '../../router/routes';
import QrisCard from '../../shared/components/QrisCard';

// ============================================================
// SECTION: Types & Constants
// ============================================================
type ToastState = { type: 'success' | 'error'; message: string } | null;

const cardClass =
  'group flex items-center gap-4 min-h-[44px] rounded-2xl border border-gray-300 bg-white p-4 shadow-sm ' +
  'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg ' +
  'active:translate-y-0 active:scale-[0.98]';

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
        ok ? 'border-green-600 bg-white text-green-800' : 'border-red-600 bg-white text-red-800'
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
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-gray-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

// ============================================================
// SECTION: Hiasan latar (bulatan pastel melayang + parallax mouse)
// ============================================================
const ORBS = [
  { color: '#9FA8DA', size: 420, top: '-8%', left: '-12%', depth: 18, delay: '0s' },
  { color: '#F8BBD0', size: 340, top: '18%', left: '68%', depth: -24, delay: '-6s' },
  { color: '#B2DFDB', size: 380, top: '62%', left: '-6%', depth: 14, delay: '-11s' },
  { color: '#FFE0B2', size: 300, top: '78%', left: '72%', depth: -16, delay: '-3s' },
];

function BackgroundOrbs() {
  useEffect(() => {
    // Hanya untuk mouse & bila pengguna tidak memilih "kurangi animasi"
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = document.documentElement.style;
        r.setProperty('--mx', String(e.clientX / innerWidth - 0.5)); // -0.5..0.5
        r.setProperty('--my', String(e.clientY / innerHeight - 0.5));
      });
    };
    addEventListener('pointermove', move);
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="bg-orbs" aria-hidden="true">
      {ORBS.map((o) => (
        <span key={o.color} className="bg-orb"
          style={{ background: o.color, width: o.size, height: o.size, top: o.top, left: o.left, animationDelay: o.delay, ['--depth' as string]: `${o.depth}px` }} />
      ))}
    </div>
  );
}

// ============================================================
// SECTION: Home (Linktree Hub)
// ============================================================
export default function Home() {
  const [toast, setToast] = useState<ToastState>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Pesan dari halaman lain (mis. "Login berhasil"), lalu bersihkan state agar tidak muncul lagi saat refresh.
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast;
    if (!msg) return;
    setToast({ type: 'success', message: msg });
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  const apps = routes
    .filter((r) => r.path !== '/' && 'title' in r)
    .map((r, i) => ({ ...r, path: r.path.replace(/\/\*$/, ''), no: String(i + 1).padStart(2, '0') })); // '/spbu/*' -> '/spbu'
  const [q, setQ] = useState('');
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = apps.filter((a) => {
    const text = String(a.title).toLowerCase(); // hanya judul, nomor tidak ikut dicari
    return words.every((w) => text.includes(w));
  });

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
    <main className="relative min-h-screen bg-gray-100 px-4 py-12 text-gray-900 sm:py-16">
      <BackgroundOrbs />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-bold text-white shadow-md" aria-hidden="true">HK</div>
          <h1 className="text-2xl font-bold tracking-tight">HK Hub Station</h1>
          <p className="mt-2 text-sm text-gray-700">Kumpulan aplikasi web praktis dalam satu tautan.</p>
        </header>

        <QrisCard />

        <div className="relative mb-4">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu, mis. surat, nota, invoice…"
            aria-label="Cari menu" className="w-full min-h-[44px] rounded-2xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm shadow-sm" />
        </div>
        {!shown.length && <p className="mb-3 text-center text-sm text-gray-700" role="status">Menu "{q}" tidak ditemukan.</p>}

        <ul className="space-y-3">
          {shown.map((app) => (
            <li key={app.path} className="flex items-stretch gap-2">
              <Link to={app.path} className={`${cardClass} flex-1`} aria-label={`Buka ${app.title}`}>
                <span className="shrink-0 self-start font-bold tabular-nums text-primary-700">{app.no}.</span>
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold">{app.title}</span>
                  <span className="mt-0.5 block whitespace-pre-line text-sm text-gray-700">{app.desc}</span>
                </div>
                <ArrowUpRight size={20} aria-hidden="true" className="shrink-0 text-primary-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <button
                onClick={() => copyLink(app.path, app.title as string)}
                aria-label={`Salin tautan ${app.title}`}
                className="flex min-h-[44px] w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-300 bg-white text-primary-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 active:translate-y-0 active:scale-[0.98]"
              >
                <Copy size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <footer className="mt-12 text-center text-xs text-gray-600">HK Hub Station</footer>
      </div>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
