import { useEffect, useState } from 'react';
import { uploadImage } from '../lib/cloudinary';
import SharedGallery, { IMAGE_LABEL as LABEL } from './SharedGallery';

// "Data User": simpan data umum (nama usaha, alamat, logo, tanda tangan) dengan nama, lalu pakai lagi dari dropdown
// supaya pengguna cukup mengisi data transaksi. Terpisah dari Template bawaan (gaya): ganti template, Data User tetap menempel.
// Teks disimpan di perangkat ini; gambar diunggah ke Cloudinary dan yang disimpan hanya link-nya.
type Saved = { name: string; data: Record<string, unknown> };

export const pickKeys = (obj: Record<string, unknown>, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
console.assert(JSON.stringify(pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c', 'x'])) === '{"a":1,"c":3}', 'pickKeys');

// ---------- Gambar: Cloudinary ----------
const isDataImage = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/');
const isRemoteImage = (v: unknown): v is string => typeof v === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(v);
console.assert(isDataImage('data:image/png;base64,AA') && !isDataImage('https://x') && isRemoteImage('https://res.cloudinary.com/a/b.png') && !isRemoteImage('data:image/png'), 'image kinds');

// Gambar terhapus di Cloudinary -> 404. Gagal jaringan (offline) dianggap masih ada agar tidak terhapus karena salah sangka.
async function imageGone(url: string) {
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return r.status === 404 || r.status === 410;
  } catch {
    return false;
  }
}
// Kolom gambar yang link-nya sudah tidak ada
async function deadImages(data: Record<string, unknown>) {
  const keys = Object.keys(data).filter((k) => isRemoteImage(data[k]));
  const gone = await Promise.all(keys.map((k) => imageGone(data[k] as string)));
  return keys.filter((_, i) => gone[i]);
}
const deadMsg = (keys: string[]) =>
  `${keys.map((k) => LABEL[k] ?? k).join(', ')} sudah terhapus dari Cloudinary. Silakan upload ulang gambarnya, lalu simpan Data User lagi.`;

const load = (key: string): Saved[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};

export default function UserData({ storageKey, keys, data, onApply }: {
  storageKey: string; // mis. 'data-user:invoice'
  keys: readonly string[]; // kolom data umum yang ikut disimpan (jangan masukkan kolom gaya/template)
  data: object;
  onApply: (picked: Record<string, unknown>) => void; // halaman menggabungkan ke isian saat ini
}) {
  const [list, setList] = useState<Saved[]>(() => load(storageKey));
  const [sel, setSel] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Halaman dibuka: gambar di isian saat ini (hasil Data User sebelumnya) dicek, bila terhapus segera diberi tahu
  useEffect(() => {
    let on = true;
    deadImages(pickKeys(data as Record<string, unknown>, keys)).then((dead) => {
      if (!on || !dead.length) return;
      onApply(Object.fromEntries(dead.map((k) => [k, ''])));
      setMsg(deadMsg(dead));
    });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: Saved[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setList(next);
      return true;
    } catch {
      setMsg('Penyimpanan perangkat penuh (gambar terlalu besar). Hapus data user lain atau perkecil gambar.');
      return false;
    }
  };
  const save = async () => {
    const n = name.trim();
    if (!n || busy) return;
    const picked = pickKeys(data as Record<string, unknown>, keys);
    const imgs = Object.keys(picked).filter((k) => isDataImage(picked[k]));
    let failed = 0;
    if (imgs.length) {
      setBusy(true);
      setMsg('Mengunggah gambar ke Cloudinary…');
      const urls: Record<string, string> = {};
      for (const k of imgs) {
        try {
          const blob = await (await fetch(picked[k] as string)).blob();
          urls[k] = (await uploadImage(blob, `hk-hub-station/data-user/${k}`)).url; // subfolder = jenis gambar, dipakai galeri
        } catch {
          failed++; // tetap disimpan di perangkat sebagai cadangan
        }
      }
      Object.assign(picked, urls);
      if (Object.keys(urls).length) onApply(urls); // isian ikut memakai link, tidak lagi gambar besar
      setBusy(false);
    }
    if (persist([{ name: n, data: picked }, ...list.filter((t) => t.name !== n)])) {
      setSel(n);
      setName('');
      setMsg(failed
        ? `Data user "${n}" tersimpan, tapi ${failed} gambar gagal diunggah ke Cloudinary (disimpan di perangkat).`
        : `Data user "${n}" tersimpan.`);
    }
  };
  const apply = async (n: string) => {
    setSel(n);
    const t = list.find((x) => x.name === n);
    if (!t) return;
    onApply(t.data);
    setMsg(`Data user "${n}" dipakai. Tinggal isi data transaksi.`);
    const dead = await deadImages(t.data);
    if (!dead.length) return;
    // Hanya gambar yang hilang dikosongkan; data user lain tetap tersimpan
    onApply(Object.fromEntries(dead.map((k) => [k, ''])));
    const cleaned = { ...t.data, ...Object.fromEntries(dead.map((k) => [k, ''])) };
    persist(list.map((x) => (x.name === n ? { ...x, data: cleaned } : x)));
    setMsg(deadMsg(dead));
  };
  const remove = () => {
    if (!sel || !confirm(`Hapus data user "${sel}"?`)) return;
    if (persist(list.filter((t) => t.name !== sel))) {
      setMsg(`Data user "${sel}" dihapus.`);
      setSel('');
    }
  };

  return (
    <section className="space-y-2 rounded-xl border border-gray-300 p-3">
      <h2 className="font-bold">Data User</h2>
      <p className="text-xs text-gray-600">Simpan data umum (nama usaha, alamat, logo, tanda tangan) agar tidak perlu diketik ulang. Template tampilan dipilih terpisah.</p>
      <div className="flex gap-2">
        <select aria-label="Pilih data user" className="w-full min-w-0 p-2 border border-gray-300 rounded-lg text-sm" value={sel} onChange={(e) => apply(e.target.value)}>
          <option value="">{list.length ? 'Pilih data user…' : 'Belum ada data user tersimpan'}</option>
          {list.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <button type="button" onClick={remove} disabled={!sel} className="shrink-0 px-3 rounded-lg border border-red-200 text-sm font-medium text-red-600 disabled:opacity-40">Hapus</button>
      </div>
      <div className="flex gap-2">
        <input aria-label="Nama data user baru" placeholder="Nama data user, mis. Toko Cabang 1" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
          className="w-full min-w-0 p-2 border border-gray-300 rounded-lg text-sm" />
        <button type="button" onClick={save} disabled={!name.trim() || busy} className="shrink-0 px-3 rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Mengunggah…' : 'Simpan'}</button>
      </div>
      <SharedGallery keys={keys} data={data} onApply={onApply} onPicked={setMsg} />
      {msg && <p className={`text-xs ${msg.includes('terhapus dari Cloudinary') ? 'font-bold text-red-700' : 'text-gray-700'}`} role="status">{msg}</p>}
    </section>
  );
}
