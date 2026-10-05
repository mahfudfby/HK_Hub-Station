// Vercel Serverless Function — menandatangani parameter upload Cloudinary.
// Env wajib di Vercel: CLOUDINARY_API_SECRET (tanpa prefix VITE_). Jangan commit secret.
import { createHash } from 'node:crypto';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) return res.status(500).json({ error: 'CLOUDINARY_API_SECRET belum di-set di Vercel.' });

  const { folder, timestamp } = req.body || {};
  const ts = Number(timestamp);
  if (!folder || typeof folder !== 'string' || !/^[\w\-/]{1,60}$/.test(folder)) return res.status(400).json({ error: 'folder tidak valid' });
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 600) return res.status(400).json({ error: 'timestamp tidak valid' });

  // Parameter ditandatangani urut abjad: folder, timestamp
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${ts}${secret}`).digest('hex');
  res.status(200).json({ signature });
}
