import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, useAuthUser } from '../lib/auth';
import { Spinner, Toast, type ToastState } from './Feedback';

// Bulat kecil (44px) supaya tidak menutupi isi halaman di ponsel
const dot =
  'flex h-11 w-11 items-center justify-center rounded-full border shadow-lg opacity-90 hover:opacity-100 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300';

// Tombol mengambang permanen (semua halaman kecuali /login): Login Admin / status login + Keluar.
export default function AdminFab() {
  const user = useAuthUser();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const logout = async () => {
    setBusy(true);
    setToast({ type: 'loading', message: 'Sedang keluar…' });
    try {
      await signOut(auth);
      setToast({ type: 'success', message: 'Berhasil keluar.' });
      setOpen(false);
    } catch (err: any) {
      setToast({ type: 'error', message: `Gagal keluar: ${err?.message}` });
    } finally {
      setBusy(false);
    }
  };

  if (pathname === '/login') return null;

  return (
    <>
      <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2 font-sans print:hidden">
        {user && open && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-900 p-1 pl-3 text-sm text-emerald-50 shadow-lg">
            <span className="max-w-[12rem] truncate" title={user.email ?? ''}>{user.email}</span>
            <button onClick={logout} disabled={busy}
              className="flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 font-semibold hover:bg-emerald-600 disabled:opacity-60">
              {busy ? <Spinner /> : <LogOut size={16} aria-hidden="true" />} Keluar
            </button>
          </div>
        )}
        {user === undefined ? (
          <span className={`${dot} border-slate-600 bg-slate-800 text-slate-300`} role="status" aria-label="Cek login"><Spinner /></span>
        ) : user ? (
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Login sebagai ${user.email}`} title={user.email ?? ''}
            className={`${dot} border-emerald-600 bg-emerald-700 text-white`}>
            <ShieldCheck size={20} aria-hidden="true" />
          </button>
        ) : (
          <Link to="/login" aria-label="Login Admin" title="Login Admin" className={`${dot} border-sky-500 bg-sky-600 text-white hover:bg-sky-500`}>
            <LogIn size={20} aria-hidden="true" />
          </Link>
        )}
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
