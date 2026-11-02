// Ubah gambar berwarna jadi hitam-putih (greyscale) di browser. Transparansi dipertahankan.
// Hitung per piksel (bukan ctx.filter) agar jalan juga di Safari/iOS.
const MAX_SIDE = 1600;

export const luma = (r: number, g: number, b: number) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
console.assert(luma(255, 255, 255) === 255 && luma(0, 0, 0) === 0 && luma(255, 0, 0) === 76, 'luma');

export async function toGreyscale(src: string): Promise<string> {
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
  for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = luma(px[i], px[i + 1], px[i + 2]);
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}
