import { useState } from 'react';

// "Data User": simpan data umum (nama usaha, alamat, logo, tanda tangan) dengan nama, lalu pakai lagi dari dropdown
// supaya pengguna cukup mengisi data transaksi. Terpisah dari Template bawaan (gaya): ganti template, Data User tetap menempel.
// Disimpan di perangkat ini.
type Saved = { name: string; data: Record<string, unknown> };

export const pickKeys = (obj: Record<string, unknown>, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
console.assert(JSON.stringify(pickKeys({ a: 1, b: 2, c: 3 }, ['a', 'c', 'x'])) === '{"a":1,"c":3}', 'pickKeys');

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
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const entry = { name: n, data: pickKeys(data as Record<string, unknown>, keys) };
    if (persist([entry, ...list.filter((t) => t.name !== n)])) {
      setSel(n);
      setName('');
      setMsg(`Data user "${n}" tersimpan.`);
    }
  };
  const apply = (n: string) => {
    setSel(n);
    const t = list.find((x) => x.name === n);
    if (!t) return;
    onApply(t.data);
    setMsg(`Data user "${n}" dipakai. Tinggal isi data transaksi.`);
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
        <button type="button" onClick={save} disabled={!name.trim()} className="shrink-0 px-3 rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-50">Simpan</button>
      </div>
      {msg && <p className="text-xs text-gray-700" role="status">{msg}</p>}
    </section>
  );
}
