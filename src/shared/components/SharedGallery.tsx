import { useEffect, useState } from 'react';

// Galeri foto bersama: semua gambar HK Hub di Cloudinary (lewat /api/cloudinary-list), untuk semua pengguna,
// sampai pemilik menghapusnya di Cloudinary. Dikelompokkan per kategori (Logo / Tanda tangan / Stempel / Lainnya);
// klik gambar = pasang ke kolom gambar menu ("Pasang ke" bisa dipilih).
export type SharedImage = { url: string; kind: string; folder?: string }; // kind '' = kategori Lainnya
export const IMAGE_LABEL: Record<string, string> = { logo: 'Logo', ttd: 'Tanda tangan', stempel: 'Stempel', managerSignature: 'Tanda tangan manajer', signature: 'Tanda tangan' };

const CATS = [
  { kind: 'logo', label: 'Logo' },
  { kind: 'ttd', label: 'Tanda tangan' },
  { kind: 'stempel', label: 'Stempel' },
  { kind: '', label: 'Lainnya' },
];
// Kategori sebuah kolom gambar menu: ttdRt/ttdRw/managerSignature → ttd, stempelRt → stempel, dst.
export const catOfKey = (k: string) => (/logo|foto/i.test(k) ? 'logo' : /stempel|cap/i.test(k) ? 'stempel' : /ttd|sign/i.test(k) ? 'ttd' : '');
console.assert(catOfKey('ttdRw') === 'ttd' && catOfKey('managerSignature') === 'ttd' && catOfKey('stempelRt') === 'stempel' && catOfKey('logo') === 'logo', 'catOfKey');
const labelOf = (k: string) => IMAGE_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
// Kolom gambar = kolom bernama logo/ttd/stempel/signature (+ akhiran, mis. ttdRt)
const isImageKey = (k: string) => k in IMAGE_LABEL || catOfKey(k) !== '';

// Satu permintaan per kunjungan halaman, dipakai bersama Data User & Edit Canvas
let cache: Promise<SharedImage[]> | null = null;
const loadShared = () =>
  (cache ??= fetch('/api/cloudinary-list')
    .then((r) => (r.ok ? r.json() : { images: [] }))
    .then((d) => (Array.isArray(d.images) ? d.images : []))
    .catch(() => [])); // galeri opsional; gagal (mis. dev lokal tanpa /api) = kosong

export default function SharedGallery({ keys, data, onApply, onPicked, showEmpty = false }: {
  keys: readonly string[]; // kolom isian menu; hanya kolom gambar yang dipakai
  data: object;
  onApply: (picked: Record<string, unknown>) => void;
  onPicked?: (message: string) => void;
  showEmpty?: boolean;
}) {
  const [shared, setShared] = useState<SharedImage[] | null>(null);
  const imageKeys = keys.filter(isImageKey);
  const [target, setTarget] = useState(''); // '' = otomatis sesuai kategori gambar
  useEffect(() => {
    let on = true;
    if (imageKeys.length) loadShared().then((v) => on && setShared(v));
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!imageKeys.length) return null;
  const groups = CATS.map((c) => ({ ...c, imgs: (shared ?? []).filter((g) => (g.kind || '') === c.kind) })).filter((g) => g.imgs.length);
  if (!groups.length) {
    if (!showEmpty) return null;
    return <p className="text-xs text-gray-600">{shared ? 'Galeri masih kosong. Gambar yang disimpan lewat Data User (Isi Formulir) akan muncul di sini.' : 'Memuat galeri…'}</p>;
  }
  // Kolom tujuan: pilihan "Pasang ke", atau kolom pertama yang sekategori, atau kolom gambar pertama
  const keyFor = (kind: string) => target || imageKeys.find((k) => catOfKey(k) === kind) || imageKeys[0];
  const current = data as Record<string, unknown>;
  return (
    <div className="space-y-3">
      {imageKeys.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Pasang gambar ke">
          <span className="text-xs font-bold text-gray-700">Pasang ke:</span>
          {['', ...imageKeys].map((k) => (
            <button key={k || 'auto'} type="button" role="radio" aria-checked={target === k} onClick={() => setTarget(k)}
              className={`px-3 min-h-[36px] rounded-full border text-xs font-medium ${target === k ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>
              {k ? labelOf(k) : 'Otomatis'}
            </button>
          ))}
        </div>
      )}
      {groups.map((g) => (
        <div key={g.kind || 'lain'}>
          <p className="text-xs font-bold text-gray-700">{g.label} ({g.imgs.length})</p>
          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {g.imgs.map((img) => {
              const k = keyFor(g.kind);
              return (
                <button key={img.url} type="button" title={`Pakai sebagai ${labelOf(k).toLowerCase()}`} aria-label={`Pakai gambar ${g.label.toLowerCase()} ini sebagai ${labelOf(k).toLowerCase()}`}
                  onClick={() => { onApply({ [k]: img.url }); onPicked?.(`${labelOf(k)} dari galeri dipasang.`); }}
                  className={`h-14 w-14 shrink-0 rounded-lg border bg-white p-1 ${imageKeys.some((x) => current[x] === img.url) ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-300'}`}>
                  <img src={img.url.replace('/upload/', '/upload/w_112,h_112,c_fit/')} alt="" loading="lazy" className="h-full w-full object-contain" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
