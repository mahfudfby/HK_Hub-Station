import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseConfig } from './firebase';

// Login admin bersama (tombol mengambang, /login, Surat Dokter).
// Named app agar tidak bentrok dengan initializeApp() default milik halaman SPBU (login anonim).
const APP_NAME = 'admin';
const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp(firebaseConfig, APP_NAME);
export const auth = getAuth(app);

/** undefined = masih dicek, null = belum login */
export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(auth.currentUser ?? undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}
