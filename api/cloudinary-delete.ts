// Vercel Serverless Function — menghapus satu gambar dari galeri bersama (Cloudinary).
// Dipakai tombol "Hapus Foto" di pop-up Galeri Foto. Hanya gambar milik cloud HK Hub yang boleh dihapus.
// Env wajib di Vercel: CLOUDINARY_API_SECRET (tanpa prefix VITE_).
import { createHash } from 'node:crypto';

const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'tdja56xe';
const KEY = process.env.VITE_CLOUDINARY_API_KEY || '493779522596543';

// https://res.cloudinary.com/<cloud>/image/upload/v123/folder/nama.png -> "folder/nama"
export function publicIdOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null;
    const m = /^\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[A-Za-z0-9]+)?$/.exec(u.pathname);
    if (!m || m[1] !== CLOUD) return null;
    const id = decodeURIComponent(m[2]);
    return /^[\w\-./ ()]{1,200}$/.test(id) && !id.includes('..') ? id : null;
  } catch {
    return null;
  }
}
console.assert(publicIdOf(`https://res.cloudinary.com/${CLOUD}/image/upload/v17/hk/logo/a.png`) === 'hk/logo/a'
  && publicIdOf('https://evil.example/x/image/upload/a.png') === null
  && publicIdOf('https://res.cloudinary.com/lain/image/upload/a.png') === null, 'publicIdOf');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) return res.status(500).json({ error: 'CLOUDINARY_API_SECRET belum di-set di Vercel.' });

  const publicId = typeof req.body?.url === 'string' ? publicIdOf(req.body.url) : null;
  if (!publicId) return res.status(400).json({ error: 'URL gambar tidak valid.' });

  const timestamp = Math.floor(Date.now() / 1000);
  // Parameter ditandatangani urut abjad: invalidate, public_id, timestamp
  const signature = createHash('sha1').update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${secret}`).digest('hex');
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: KEY, signature, invalidate: 'true' });
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, { method: 'POST', body });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) return res.status(502).json({ error: data?.error?.message || `Cloudinary menolak (${r.status}).` });
  // 'not found' = sudah terhapus: anggap berhasil agar galeri ikut bersih
  if (data.result !== 'ok' && data.result !== 'not found') return res.status(502).json({ error: `Gambar tidak terhapus (${data.result || 'tanpa hasil'}).` });
  res.status(200).json({ ok: true });
}
