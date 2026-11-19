import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

// Mode gelap/terang untuk tampilan website (dokumen di pratinjau tetap kertas putih).
// Kelas `dark` di <html> dipasang lebih awal oleh skrip di index.html agar tidak berkedip.
const KEY = 'hk:tema';

export default function ThemeToggle() {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ dark: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.dark === 'boolean') {
        setDark(customEvent.detail.dark);
      } else {
        setDark(document.documentElement.classList.contains('dark'));
      }
    };
    window.addEventListener('hk:theme-changed', handleThemeChange);
    return () => window.removeEventListener('hk:theme-changed', handleThemeChange);
  }, []);

  // Di halaman Home (/), tombol tema sudah terpasang rapi di dalam MaterialHeader (App Bar),
  // sehingga tombol mengambang disembunyikan agar tidak ganda.
  if (pathname === '/') return null;

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* mode privat: berlaku selama sesi */
    }
    window.dispatchEvent(new CustomEvent('hk:theme-changed', { detail: { dark: next } }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      className="fixed bottom-3 left-3 sm:bottom-auto sm:left-auto sm:top-3 sm:right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-primary-700 dark:text-amber-400 shadow-lg transition-colors print:hidden hover:scale-105 active:scale-95"
    >
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
