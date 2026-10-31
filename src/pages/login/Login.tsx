import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, isAdmin, useAuthUser } from '../../shared/lib/auth';
import { Spinner, Toast, type ToastState } from '../../shared/components/Feedback';

const REMEMBER_KEY = 'hk-remember-me';
const readRemember = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
};

function errorText(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation')
    return 'Metode login ini belum diaktifkan di Firebase Console.';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code))
    return 'Email atau password salah.';
  if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (code === 'auth/popup-blocked') return 'Pop-up login diblokir browser. Izinkan pop-up lalu coba lagi.';
  if (code === 'auth/unauthorized-domain') return 'Domain ini belum didaftarkan di Firebase (Authentication → Settings → Authorized domains).';
  if (code === 'auth/network-request-failed') return 'Koneksi internet bermasalah.';
  return `Login gagal: ${err?.message || code}`;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function Login() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(readRemember);
  const [busy, setBusy] = useState<'' | 'email' | 'google' | 'reset'>('');
  const [toast, setToast] = useState<ToastState>(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setPersistence(auth, readRemember() ? browserLocalPersistence : browserSessionPersistence).catch(() => {});
  }, []);

  if (user && !busy) return <Navigate to="/" replace />;

  const done = () => navigate('/', { replace: true, state: { toast: 'Login berhasil. Silakan pilih fitur.' } });

  // Persistence diset saat centang berubah (bukan saat klik login) agar pop-up Google tidak diblokir Safari.
  const changeRemember = async (value: boolean) => {
    setRemember(value);
    try {
      localStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
    } catch {
      /* mode privat: abaikan */
    }
    try {
      await setPersistence(auth, value ? browserLocalPersistence : browserSessionPersistence);
      setToast({ type: 'info', message: value ? 'Login akan diingat di perangkat ini.' : 'Login berakhir saat browser ditutup.' });
    } catch (err: any) {
      setToast({ type: 'error', message: `Gagal mengatur "Ingat saya": ${err?.message}` });
    }
  };

  const loginEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('email');
    setToast({ type: 'loading', message: 'Sedang masuk…' });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      done();
    } catch (err) {
      setToast({ type: 'error', message: errorText(err) });
      setBusy('');
    }
  };

  const loginGoogle = async () => {
    setBusy('google');
    setToast({ type: 'loading', message: 'Membuka login Google…' });
    try {
      const { user: u } = await signInWithPopup(auth, new GoogleAuthProvider());
      if (!isAdmin(u)) {
        await signOut(auth);
        throw { message: `Akun ${u.email} tidak terdaftar sebagai admin.` };
      }
      done();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request')
        setToast({ type: 'info', message: 'Login Google dibatalkan.' });
      else setToast({ type: 'error', message: err?.code ? errorText(err) : err?.message });
      setBusy('');
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) return setToast({ type: 'error', message: 'Isi email dulu, lalu klik "Lupa password?".' });
    setBusy('reset');
    setToast({ type: 'loading', message: 'Mengirim link reset password…' });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setToast({ type: 'success', message: `Jika ${email.trim()} terdaftar, link reset password sudah dikirim. Cek inbox/spam.` });
    } catch (err) {
      setToast({ type: 'error', message: errorText(err) });
    } finally {
      setBusy('');
    }
  };

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-slate-100';

  return (
    <main className="hub min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <form onSubmit={loginEmail} className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4 shadow-xl">
        <Link to="/" className="text-sm text-sky-300 hover:text-sky-200">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-xl font-bold">Login Admin</h1>

        <label className="block text-sm font-medium">
          Email
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium">Password</label>
          <div className="relative">
            <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'} aria-pressed={showPassword}
              className="absolute right-1 top-1/2 mt-0.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-300 hover:bg-slate-700">
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => changeRemember(e.target.checked)} className="h-4 w-4" />
            Ingat saya
          </label>
          <button type="button" onClick={forgotPassword} disabled={!!busy} className="flex items-center gap-1 text-sky-300 hover:text-sky-200 disabled:opacity-60">
            {busy === 'reset' && <Spinner />} Lupa password?
          </button>
        </div>

        <button disabled={!!busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
          {busy === 'email' ? <><Spinner /> Memproses…</> : 'Masuk'}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-600" /> atau <span className="h-px flex-1 bg-slate-600" />
        </div>

        <button type="button" onClick={loginGoogle} disabled={!!busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60">
          {busy === 'google' ? <Spinner /> : <GoogleIcon />} Masuk dengan Google
        </button>
      </form>
      <Toast toast={toast} onClose={closeToast} />
    </main>
  );
}
