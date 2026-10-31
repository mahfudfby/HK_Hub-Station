import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseConfig } from './firebase';

// Login admin bersama (tombol mengambang, /login, Surat Dokter).
// Named app agar tidak bentrok dengan initializeApp() default milik halaman SPBU (login anonim).
const APP_NAME = 'admin';
const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(firebaseConfig, APP_NAME);
export const auth = getAuth(app);

// Login Google hanya untuk email di daftar ini (akun email/password dibuat manual di Firebase Console, jadi selalu boleh).
// Override di Vercel: VITE_ADMIN_EMAILS="a@gmail.com,b@gmail.com"
// Tanpa VITE_ADMIN_EMAILS: login Google admin nonaktif (akun email/password tetap bisa login).
export const ADMIN_EMAILS: string[] = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  if (user.providerData.some((p) => p.providerId === 'password')) return true;
  return ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}

/** undefined = masih dicek, null = belum login / bukan admin */
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(isAdmin(u) ? u : null)), []);
  return user;
}
