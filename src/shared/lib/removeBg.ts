import { useEffect, useState } from 'react';

// Hapus background polos (mis. kertas putih di foto tanda tangan/stempel/logo), jalan di browser tanpa upload.
// shortcut: hanya untuk background satu warna; foto dengan background ramai butuh model AI (mis. @imgly/background-removal).
const NEAR = 28; // selisih warna <= NEAR dari background -> transparan penuh
const FAR = 90; // selisih >= FAR -> tetap utuh; di antaranya transparan sebagian (tepi halus)

export const alphaFor = (dist: number) => Math.min(1, Math.max(0, (dist - NEAR) / (FAR - NEAR)));
console.assert(alphaFor(0) === 0 && alphaFor(NEAR) === 0 && alphaFor(FAR) === 1 && alphaFor(255) === 1, 'alphaFor');

const MAX_SIDE = 1600;

export async function removeBackground(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Warna background = rata-rata piksel tepi gambar yang tidak transparan
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (px[i + 3] < 128) return;
    r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
  if (!n) return src; // tepi sudah transparan: background sudah tidak ada
  r /= n; g /= n; b /= n;

  for (let i = 0; i < px.length; i += 4) {
    const dist = Math.max(Math.abs(px[i] - r), Math.abs(px[i + 1] - g), Math.abs(px[i + 2] - b));
    px[i + 3] = Math.round(px[i + 3] * alphaFor(dist));
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

// Gambar yang ditampilkan: versi tanpa background bila `on`, selain itu gambar asli. Gambar asli tidak diubah.
export function useBgRemoved(src: string, on: boolean, onError?: (msg: string) => void) {
  const [out, setOut] = useState({ key: '', src: '' });
  const key = on && src ? src : '';
  useEffect(() => {
    if (!key) return;
    let alive = true;
    removeBackground(key)
      .then((res) => alive && setOut({ key, src: res }))
      .catch((err) => {
        if (!alive) return;
        setOut({ key, src: key });
        onError?.(`Hapus background gagal: ${err?.message || 'gambar tidak bisa dibaca'}.`);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { src, busy: false };
  return out.key === key ? { src: out.src, busy: false } : { src, busy: true };
}
