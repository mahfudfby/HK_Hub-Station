// Vercel Serverless Function — daftar gambar Data User di Cloudinary (galeri bersama untuk semua pengguna).
// Gambar yang dihapus pemilik di Cloudinary otomatis hilang dari daftar ini.
// Env wajib di Vercel: CLOUDINARY_API_SECRET. Hanya folder data-user yang boleh dibaca.
const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dl4pyan8v';
const KEY = process.env.VITE_CLOUDINARY_API_KEY || '654582583389542';
const PREFIX = 'hk-hub-station/data-user';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) return res.status(500).json({ error: 'CLOUDINARY_API_SECRET belum di-set di Vercel.' });

  // shortcut: maks 500 gambar tanpa paging (next_cursor), tambah paging bila galeri melebihi itu
  const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload?prefix=${encodeURIComponent(PREFIX + '/')}&max_results=500`;
  const r = await fetch(url, { headers: { Authorization: 'Basic ' + Buffer.from(`${KEY}:${secret}`).toString('base64') } });
  if (!r.ok) return res.status(502).json({ error: `Cloudinary menolak (${r.status}).` });
  const data = await r.json();
  const images = (data.resources || [])
    .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((x: any) => {
      const rest = String(x.public_id).slice(PREFIX.length + 1); // "logo/abc" atau "abc" (unggahan lama tanpa jenis)
      return { url: x.secure_url, kind: rest.includes('/') ? rest.split('/')[0] : '' };
    });
  // Cache di edge 60 dtk: batasi kuota Admin API; gambar terhapus hilang paling lambat 1 menit
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
  res.status(200).json({ images });
}
