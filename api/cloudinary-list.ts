// Vercel Serverless Function — daftar gambar HK Hub di Cloudinary (galeri bersama untuk semua pengguna).
// Gambar yang dihapus pemilik di Cloudinary otomatis hilang dari daftar ini.
// Env wajib di Vercel: CLOUDINARY_API_SECRET. Hanya gambar di folder hk-hub-station/** yang ikut.
const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dl4pyan8v';
const KEY = process.env.VITE_CLOUDINARY_API_KEY || '654582583389542';
const ROOT = 'hk-hub-station';
const MAX_PAGES = 6; // 6 × 500 = 3000 gambar

// Kategori dari nama folder: data-user/logo, slip-gaji/ttd-manager, dst.
export function kindOf(folder: string): string {
  const f = folder.toLowerCase();
  if (/logo/.test(f)) return 'logo';
  if (/stempel|cap\b/.test(f)) return 'stempel';
  if (/ttd|sign|tanda/.test(f)) return 'ttd';
  return '';
}

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
  // shortcut: diagnosa sementara (?debug=1) — hanya nama folder & jumlah, tanpa URL; hapus setelah galeri terisi
  if (req.query?.debug) {
    const count: Record<string, number> = {};
    for (const x of all) {
      const pid = String(x.public_id || '');
      const f = String(x.asset_folder || x.folder || '(akar)') + ' | id:' + (pid.includes('/') ? pid.slice(0, pid.lastIndexOf('/')) : '-');
      count[f] = (count[f] || 0) + 1;
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ total: all.length, hasAssetFolder: all.some((x) => 'asset_folder' in x), folders: count });
  }
  const images = all
    .map((x: any) => {
      const pid = String(x.public_id || '');
      const pidFolder = pid.includes('/') ? pid.slice(0, pid.lastIndexOf('/')) : '';
      // asset_folder kosong (unggahan lama masuk akar): pakai jalur di public_id bila ada
      const folder = String(x.asset_folder || x.folder || pidFolder);
      return { x, folder };
    })
    .filter(({ folder }) => folder === ROOT || folder.startsWith(ROOT + '/'))
    .sort((a, b) => String(b.x.created_at).localeCompare(String(a.x.created_at)))
    .map(({ x, folder }) => ({ url: x.secure_url, kind: kindOf(folder.slice(ROOT.length + 1)), folder }));
  // Cache di edge 60 dtk: batasi kuota Admin API; gambar terhapus hilang paling lambat 1 menit
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=60');
  res.status(200).json({ images });
}
