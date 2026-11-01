import { useEffect, useId, useState, type ReactNode } from 'react';

// Galeri foto bersama: semua gambar HK Hub di Cloudinary (lewat /api/cloudinary-list), untuk semua pengguna,
// sampai pemilik menghapusnya di Cloudinary. Dikelompokkan per kategori (Logo / Tanda tangan / Stempel / Lainnya);
// klik gambar = pasang ke kolom gambar menu ("Pasang ke" bisa dipilih).
export type SharedImage = { url: string; kind: string; folder?: string }; // kind '' = kategori Lainnya
export const IMAGE_LABEL: Record<string, string> = { logo: 'Logo', ttd: 'Tanda tangan', stempel: 'Stempel', managerSignature: 'Tanda tangan manajer', signature: 'Tanda tangan' };

const CATS = [
  { kind: 'stempel', label: 'Stempel' },
  { kind: 'logo', label: 'Logo' },
  { kind: 'ttd', label: 'Tanda Tangan' },
  { kind: '', label: 'Lainnya' },
];
// Kategori sebuah kolom gambar menu: ttdRt/ttdRw/managerSignature → ttd, stempelRt → stempel, dst.
export const catOfKey = (k: string) => (/logo|foto/i.test(k) ? 'logo' : /stempel|cap/i.test(k) ? 'stempel' : /ttd|sign/i.test(k) ? 'ttd' : '');
console.assert(catOfKey('ttdRw') === 'ttd' && catOfKey('managerSignature') === 'ttd' && catOfKey('stempelRt') === 'stempel' && catOfKey('logo') === 'logo', 'catOfKey');
const labelOf = (k: string) => IMAGE_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
// Kolom gambar = kolom bernama logo/ttd/stempel/signature (+ akhiran, mis. ttdRt)
const isImageKey = (k: string) => k in IMAGE_LABEL || catOfKey(k) !== '';

// Bingkai "Galeri Foto" dengan tombol ciutkan/lebarkan untuk seluruh galeri
export function GaleriLipat({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [buka, setBuka] = useState(true);
  const id = useId();
  return (
    <div className={`space-y-2 ${className}`}>
      <button type="button" aria-expanded={buka} aria-controls={id} onClick={() => setBuka(!buka)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-1 text-left font-bold text-gray-800">
        <span>Galeri Foto</span>
        <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
          {buka ? 'Ciutkan' : 'Lebarkan'}
          <span aria-hidden="true" className={`text-base transition-transform ${buka ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </button>
      {buka && <div id={id}>{children}</div>}
    </div>
  );
}

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
  const [ciut, setCiut] = useState<Record<string, boolean>>({}); // kategori yang diciutkan
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
      {groups.map((g) => {
        const id = g.kind || 'lain';
        const buka = !ciut[id];
        return (
        <div key={id} className="rounded-lg border border-gray-200">
          <button type="button" aria-expanded={buka} aria-controls={`galeri-${id}`} onClick={() => setCiut((c) => ({ ...c, [id]: buka }))}
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-100">
            <span>{g.label} ({g.imgs.length})</span>
            <span aria-hidden="true" className={`transition-transform ${buka ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {buka && <div id={`galeri-${id}`} className="flex flex-wrap gap-2 p-2">
            {g.imgs.map((img) => {
              const k = keyFor(g.kind);
              // Klik 1 = pasang; klik 2 (foto sudah terpasang) = lepas dari semua kolom yang memakainya
              const dipakai = imageKeys.filter((x) => current[x] === img.url);
              const aktif = dipakai.length > 0;
              return (
                <button key={img.url} type="button" aria-pressed={aktif}
                  title={aktif ? 'Klik lagi untuk melepas' : `Pakai sebagai ${labelOf(k).toLowerCase()}`}
                  aria-label={aktif ? `Lepas gambar ${g.label.toLowerCase()} ini` : `Pakai gambar ${g.label.toLowerCase()} ini sebagai ${labelOf(k).toLowerCase()}`}
                  onClick={() => {
                    if (aktif) {
                      onApply(Object.fromEntries(dipakai.map((x) => [x, ''])));
                      onPicked?.(`${dipakai.map(labelOf).join(', ')} dilepas.`);
                    } else {
                      onApply({ [k]: img.url });
                      onPicked?.(`${labelOf(k)} dari galeri dipasang.`);
                    }
                  }}
                  className={`h-14 w-14 shrink-0 rounded-lg border-2 p-1 transition duration-150 ${aktif
                    ? 'translate-y-0.5 scale-95 !border-blue-600 bg-blue-50 shadow-[inset_0_3px_6px_rgba(0,0,0,0.35)]'
                    : 'border-gray-300 bg-white shadow-md hover:-translate-y-0.5'}`}>
                  <img src={img.url.replace('/upload/', '/upload/w_112,h_112,c_fit/')} alt="" loading="lazy" className="h-full w-full object-contain" />
                </button>
              );
            })}
          </div>}
        </div>
        );
      })}
    </div>
  );
}
