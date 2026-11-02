// Terjemahan otomatis Indonesia → Inggris lewat /api/translate, dengan cache per kalimat di perangkat
// (teks yang sama tidak diterjemahkan ulang, hemat kuota & cepat saat ganti template).
const CACHE_KEY = 'translate:id-en:v1';
const CACHE_MAX = 3000;

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(c: Record<string, string>) {
  const keys = Object.keys(c);
  if (keys.length > CACHE_MAX) keys.slice(0, keys.length - CACHE_MAX).forEach((k) => delete c[k]); // buang yang paling lama
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* penyimpanan penuh: cache hanya di memori */
  }
}

let memo: Record<string, string> | null = null;
export const cached = (text: string) => (memo ??= readCache())[text];

// Terjemahkan teks yang belum ada di cache; kembalikan peta teks asli → terjemahan.
export async function translateAll(texts: string[]): Promise<Record<string, string>> {
  const cache = (memo ??= readCache());
  const todo = [...new Set(texts.filter((t) => t.trim() && !(t in cache)))];
  for (let i = 0; i < todo.length; i += 150) {
    const q = todo.slice(i, i + 150);
    const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(data.t)) throw new Error(data.error || `server ${r.status}`);
    q.forEach((s, j) => (cache[s] = data.t[j] ?? s));
  }
  if (todo.length) writeCache(cache);
  return cache;
}
