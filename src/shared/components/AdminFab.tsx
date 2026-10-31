import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, useAuthUser } from '../lib/auth';
import { Spinner, Toast, type ToastState } from './Feedback';

const pill =
  'flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg font-sans ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300';

// Tombol mengambang permanen (semua halaman kecuali /login): Login Admin / status login + Keluar.
export default function AdminFab() {
  const user = useAuthUser();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const logout = async () => {
    setBusy(true);
    setToast({ type: 'loading', message: 'Sedang keluar…' });
    try {
      await signOut(auth);
      setToast({ type: 'success', message: 'Berhasil keluar.' });
    } catch (err: any) {
      setToast({ type: 'error', message: `Gagal keluar: ${err?.message}` });
    } finally {
      setBusy(false);
    }
  };

  if (pathname === '/login') return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        {user === undefined ? (
          <span className={`${pill} border-slate-600 bg-slate-800 text-slate-300`}><Spinner /> Cek login…</span>
        ) : user ? (
          <div className={`${pill} border-emerald-600 bg-emerald-900 text-emerald-50 pr-1`}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span className="max-w-[10rem] truncate" title={user.email ?? ''}>{user.email}</span>
            <button onClick={logout} disabled={busy} aria-label="Keluar"
              className="ml-1 flex h-9 items-center gap-1 rounded-full bg-emerald-700 px-3 hover:bg-emerald-600 disabled:opacity-60">
              {busy ? <Spinner /> : <LogOut size={16} aria-hidden="true" />} Keluar
            </button>
          </div>
        ) : (
          <Link to="/login" className={`${pill} border-sky-500 bg-sky-600 text-white hover:bg-sky-500`}>
            <LogIn size={18} aria-hidden="true" /> Login Admin
          </Link>
        )}
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
