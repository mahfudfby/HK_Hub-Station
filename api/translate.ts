// Vercel Serverless Function — terjemahan otomatis Indonesia → Inggris untuk menu CV.
// POST { q: string[] } → { t: string[] } (urutan sama).
// Penyedia, berurutan (yang gagal dilewati):
//   1. Google Cloud Translation resmi — bila env GOOGLE_TRANSLATE_API_KEY di-set di Vercel (paling andal, kuota gratis 500 rb karakter/bulan).
//   2. Endpoint publik Google Translate (tanpa kunci; tidak resmi, kadang ditolak 429).
//   3. MyMemory (tanpa kunci; kuota harian kecil, mutu lebih rendah).
// shortcut: tanpa kunci resmi, kualitas & ketersediaan tidak dijamin; set GOOGLE_TRANSLATE_API_KEY bila sering gagal.
const MAX_ITEMS = 300;
const MAX_CHARS = 30000;

async function cloud(q: string[], sl: string, tl: string, key: string): Promise<string[]> {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, source: sl, target: tl, format: 'text' }),
  });
  if (!r.ok) throw new Error(`Google Cloud ${r.status}`);
  const d = await r.json();
  return (d?.data?.translations ?? []).map((x: any) => String(x.translatedText ?? ''));
}

async function gtx(text: string, sl: string, tl: string): Promise<string> {
  const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
  if (!r.ok) throw new Error(`Google ${r.status}`);
  const d = await r.json();
  return (d?.[0] ?? []).map((s: any) => s?.[0] ?? '').join('');
}

// MyMemory membatasi ±500 karakter per permintaan: pecah per kalimat
function chunks(text: string, max = 450): string[] {
  const out: string[] = [];
  let cur = '';
  for (const part of text.split(/(?<=[.!?;])\s+/)) {
    if ((cur + ' ' + part).trim().length > max && cur) { out.push(cur); cur = part; } else cur = (cur + ' ' + part).trim();
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => (c.length > max ? c.match(new RegExp(`.{1,${max}}`, 'g')) ?? [c] : [c]));
}
async function memory(text: string, sl: string, tl: string): Promise<string> {
  const parts = await Promise.all(chunks(text).map(async (c) => {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=${sl}|${tl}`);
    if (!r.ok) throw new Error(`MyMemory ${r.status}`);
    const d = await r.json();
    const t = d?.responseData?.translatedText;
    if (d?.responseStatus !== 200 || typeof t !== 'string') throw new Error(`MyMemory: ${d?.responseDetails || 'gagal'}`);
    return t;
  }));
  return parts.join(' ');
}

async function one(text: string, sl: string, tl: string): Promise<string> {
  if (!text.trim()) return text;
  try { return await gtx(text, sl, tl); } catch { return memory(text, sl, tl); }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { q, sl = 'id', tl = 'en' } = req.body || {};
  if (!Array.isArray(q) || q.length > MAX_ITEMS || !q.every((s) => typeof s === 'string')) return res.status(400).json({ error: 'q harus array teks (maks 300).' });
  if (q.join('').length > MAX_CHARS) return res.status(400).json({ error: 'Teks terlalu panjang.' });
  if (!/^[a-z]{2}$/.test(sl) || !/^[a-z]{2}$/.test(tl)) return res.status(400).json({ error: 'Kode bahasa tidak valid.' });

  let out: string[] | undefined;
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (key) {
    try { out = await cloud(q, sl, tl, key); } catch { /* lanjut ke penyedia tanpa kunci */ }
  }
  if (!out) {
    out = new Array(q.length);
    let next = 0;
    try {
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (next < q.length) {
          const i = next++;
          out![i] = await one(q[i], sl, tl);
        }
      }));
    } catch (e: any) {
      return res.status(502).json({ error: `Terjemahan gagal: ${e?.message || 'layanan tidak merespons'}` });
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ t: out });
}
