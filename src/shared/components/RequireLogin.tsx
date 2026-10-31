import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { useAuthUser } from '../lib/auth';
import { Spinner } from './Feedback';

// Bungkus fitur yang butuh login: <RequireLogin>{(user) => <Fitur user={user} />}</RequireLogin>
// Belum login -> ke /login; setelah login berhasil kembali ke Home.
export default function RequireLogin({ children }: { children: (user: User) => ReactNode }) {
  const user = useAuthUser();
  if (user === undefined)
    return (
      <div role="status" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 text-gray-500">
        <Spinner className="h-10 w-10 text-blue-600" /> Memeriksa login…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children(user)}</>;
}
