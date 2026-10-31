import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, useAuthUser } from '../../shared/lib/auth';
import { Spinner, Toast, type ToastState } from '../../shared/components/Feedback';

export default function Login() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const closeToast = useCallback(() => setToast(null), []);

  if (user && !busy) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setToast({ type: 'loading', message: 'Sedang masuk…' });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/', { replace: true, state: { toast: 'Login berhasil. Silakan pilih fitur.' } });
    } catch (err: any) {
      const code = err?.code || '';
      setToast({
        type: 'error',
        message:
          code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation'
            ? 'Login email/password belum diaktifkan di Firebase Console.'
            : code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email'
              ? 'Email atau password salah.'
              : code === 'auth/too-many-requests'
                ? 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
                : `Login gagal: ${err?.message || code}`,
      });
      setBusy(false);
    }
  };

  return (
    <main className="hub min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4 shadow-xl">
        <Link to="/" className="text-sm text-sky-300 hover:text-sky-200">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-xl font-bold">Login Admin</h1>
        <label className="block text-sm font-medium">
          Email
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100" />
        </label>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
          {busy ? <><Spinner /> Memproses…</> : 'Masuk'}
        </button>
      </form>
      <Toast toast={toast} onClose={closeToast} />
    </main>
  );
}
