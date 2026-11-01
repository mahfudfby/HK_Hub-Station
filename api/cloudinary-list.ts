// Vercel Serverless Function — daftar gambar HK Hub di Cloudinary (galeri bersama untuk semua pengguna).
// Gambar yang dihapus pemilik di Cloudinary otomatis hilang dari daftar ini.
// Env wajib di Vercel: CLOUDINARY_API_SECRET. Akun ini khusus HK Hub, jadi SEMUA gambar ikut ditampilkan.
// Kategori = folder kategori yang dibuat saat upload dari form (galleryFolder di src/shared/lib/cloudinary.ts):
// hk-hub-station/logo/…, hk-hub-station/stempel/…, hk-hub-station/tanda-tangan/…; selain itu = Lainnya.
const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'tdja56xe';
const KEY = process.env.VITE_CLOUDINARY_API_KEY || '493779522596543';
const MAX_PAGES = 6; // 6 × 500 = 3000 gambar

// Kategori dari folder (bukan nama file). Segmen folder persis logo / stempel / tanda-tangan;
// folder lama per kolom (data-user/ttdRt, data-user/stempelRt, data-user/logo) tetap dikenali.
export function kindOf(folder: string): string {
  for (const seg of folder.toLowerCase().split('/')) {
    if (/^logo/.test(seg)) return 'logo';
    if (/^(stempel|cap)/.test(seg)) return 'stempel';
    if (/^(ttd|signature|managersignature|tanda-?tangan)/.test(seg)) return 'ttd';
  }
  return '';
}
console.assert(kindOf('hk-hub-station/logo/data-user') === 'logo' && kindOf('hk-hub-station/stempel/data-user') === 'stempel'
  && kindOf('hk-hub-station/tanda-tangan/slip-gaji') === 'ttd' && kindOf('hk-hub-station/data-user/ttdRt') === 'ttd'
  && kindOf('hk-hub-station/lainnya/data-user') === '' && kindOf('') === '', 'kindOf');

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) return res.status(500).json({ error: 'CLOUDINARY_API_SECRET belum di-set di Vercel.' });
  const auth = 'Basic ' + Buffer.from(`${KEY}:${secret}`).toString('base64');

  // Tanpa prefix: di mode "dynamic folders" folder tidak lagi menjadi bagian public_id,
  // jadi semua gambar dibaca lalu disaring dari asset_folder / folder / public_id.
  const all: any[] = [];
  let cursor = '';
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload?max_results=500${cursor ? `&next_cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: auth } });
    if (!r.ok) return res.status(502).json({ error: `Cloudinary menolak (${r.status}).` });
    const data = await r.json();
    all.push(...(data.resources || []));
    cursor = data.next_cursor || '';
    if (!cursor) break;
  }
  const images = all
    .map((x: any) => {
      const pid = String(x.public_id || '');
      const pidFolder = pid.includes('/') ? pid.slice(0, pid.lastIndexOf('/')) : '';
      // asset_folder kosong (unggahan lama masuk akar): pakai jalur di public_id bila ada
      const folder = String(x.asset_folder || x.folder || pidFolder);
      return { x, folder };
    })
    .sort((a, b) => String(b.x.created_at).localeCompare(String(a.x.created_at)))
    .map(({ x, folder }) => ({ url: x.secure_url, kind: kindOf(folder), folder }));
  // Cache di edge 60 dtk: batasi kuota Admin API; gambar terhapus hilang paling lambat 1 menit
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
  res.status(200).json({ images });
}
