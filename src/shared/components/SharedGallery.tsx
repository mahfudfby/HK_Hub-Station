import { useEffect, useState } from 'react';

// Galeri foto bersama: semua gambar Data User di Cloudinary (lewat /api/cloudinary-list), untuk semua pengguna,
// sampai pemilik menghapusnya di Cloudinary. Klik gambar = pasang ke kolom gambar (logo/ttd/stempel).
export type SharedImage = { url: string; kind: string }; // kind '' = unggahan lama tanpa jenis, boleh dipakai di semua kolom
export const IMAGE_LABEL: Record<string, string> = { logo: 'Logo', ttd: 'Tanda tangan', stempel: 'Stempel', managerSignature: 'Tanda tangan manajer', signature: 'Tanda tangan' };

// Satu permintaan per kunjungan halaman, dipakai bersama Data User & Edit Canvas
let cache: Promise<SharedImage[]> | null = null;
const loadShared = () =>
  (cache ??= fetch('/api/cloudinary-list')
    .then((r) => (r.ok ? r.json() : { images: [] }))
    .then((d) => (Array.isArray(d.images) ? d.images : []))
    .catch(() => [])); // galeri opsional; gagal (mis. dev lokal tanpa /api) = kosong

export default function SharedGallery({ keys, data, onApply, onPicked, showEmpty = false }: {
  keys: readonly string[]; // kolom isian; hanya kolom gambar (lihat IMAGE_LABEL) yang dipakai
  data: object;
  onApply: (picked: Record<string, unknown>) => void;
  onPicked?: (message: string) => void;
  showEmpty?: boolean;
}) {
  const [shared, setShared] = useState<SharedImage[] | null>(null);
  const imageKeys = keys.filter((k) => k in IMAGE_LABEL);
  useEffect(() => {
    let on = true;
    if (imageKeys.length) loadShared().then((v) => on && setShared(v));
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!imageKeys.length) return null;
  const groups = imageKeys
    .map((k) => ({ k, imgs: (shared ?? []).filter((g) => g.kind === k || g.kind === '') }))
    .filter((g) => g.imgs.length);
  if (!groups.length) {
    if (!showEmpty) return null;
    return <p className="text-xs text-gray-600">{shared ? 'Galeri masih kosong. Gambar yang disimpan lewat Data User (Isi Formulir) akan muncul di sini.' : 'Memuat galeri…'}</p>;
  }
  return (
    <div className="space-y-2">
      {groups.map(({ k, imgs }) => (
        <div key={k}>
          <p className="text-xs font-bold text-gray-700">Galeri {IMAGE_LABEL[k].toLowerCase()} ({imgs.length})</p>
          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
            {imgs.map((g) => (
              <button key={g.url} type="button" title={`Pakai sebagai ${IMAGE_LABEL[k].toLowerCase()}`} aria-label={`Pakai gambar ini sebagai ${IMAGE_LABEL[k].toLowerCase()}`}
                onClick={() => { onApply({ [k]: g.url }); onPicked?.(`${IMAGE_LABEL[k]} dari galeri dipasang.`); }}
                className={`h-14 w-14 shrink-0 rounded-lg border bg-white p-1 ${(data as Record<string, unknown>)[k] === g.url ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-300'}`}>
                <img src={g.url.replace('/upload/', '/upload/w_112,h_112,c_fit/')} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
