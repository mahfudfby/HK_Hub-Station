import { useEffect } from 'react';

// Google Fonts dimuat saat dibutuhkan (template yang dipilih), bukan di index.html, agar halaman tetap ringan.
// Ekspor (exportPage) memanggil fontsReady() supaya hasil unduhan selalu memakai font yang benar.

export type WebFont = { family: string; weights?: number[] };

const pending = new Map<string, Promise<void>>();

export function loadGoogleFont({ family, weights = [400, 700] }: WebFont): Promise<void> {
  const key = `${family}:${weights.join(',')}`;
  const known = pending.get(key);
  if (known) return known;
  const p = new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}&display=swap`;
    link.onload = () => {
      Promise.all(weights.map((w) => document.fonts.load(`${w} 16px "${family}"`))).then(() => resolve(), () => resolve());
    };
    link.onerror = () => resolve(); // offline: pakai font cadangan, jangan gantung ekspor
    document.head.appendChild(link);
  });
  pending.set(key, p);
  return p;
}

// Tunggu semua font yang pernah diminta + font bawaan halaman
export async function fontsReady() {
  await Promise.all(pending.values());
  await document.fonts.ready;
}

// Muat font milik template aktif; aman dipanggil tiap render
export function useGoogleFonts(fonts: (WebFont | undefined | null)[]) {
  const key = fonts.filter(Boolean).map((f) => `${f!.family}:${(f!.weights ?? []).join(',')}`).join('|');
  useEffect(() => {
    fonts.forEach((f) => f && void loadGoogleFont(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// Nilai CSS font-family dengan cadangan
export const cssFamily = (family: string, fallback = 'sans-serif') => `"${family}", ${fallback}`;
