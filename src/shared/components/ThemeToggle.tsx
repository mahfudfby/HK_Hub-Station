import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Mode gelap/terang untuk tampilan website (dokumen di pratinjau tetap kertas putih).
// Kelas `dark` di <html> dipasang lebih awal oleh skrip di index.html agar tidak berkedip.
const KEY = 'hk:tema';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(KEY, next ? 'dark' : 'light'); } catch { /* mode privat: berlaku selama sesi */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={dark}
      aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}
      className="fixed top-3 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-primary-700 shadow-md print:hidden">
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
