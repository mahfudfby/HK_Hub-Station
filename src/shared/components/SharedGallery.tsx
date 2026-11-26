import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  FileImage,
  Palette,
  RefreshCw,
  Scissors,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { galleryFolder, uploadImage } from '../lib/cloudinary';
import { toGreyscale } from '../lib/greyscale';
import { removeBackground } from '../lib/removeBg';
import BgToggle from './BgToggle';
import { Spinner } from './Feedback';
import GreyToggle from './GreyToggle';

// ============================================================
// SECTION: Types & Constants
// ============================================================
// id slot WAJIB diawali 'ttd' atau 'stempel' agar masuk kategori galeri yang benar
export type ImageSlot = { id: string; label: string; value: string; set: (v: string) => void };
export type SharedImage = { url: string; kind: string; folder?: string }; // kind '' = kategori Lainnya
export const IMAGE_LABEL: Record<string, string> = {
  logo: 'Logo',
  ttd: 'Tanda tangan',
  stempel: 'Stempel',
  managerSignature: 'Tanda tangan manajer',
  signature: 'Tanda tangan',
  ttdPemohon: 'Tanda tangan pemohon',
  ttdAtasan: 'Tanda tangan atasan',
  ttdHrd: 'Tanda tangan HRD',
  ttd1: 'Tanda tangan pihak 1',
  ttd2: 'Tanda tangan pihak 2',
  qr: 'QR Code',
};

const CATS = [
  { kind: 'stempel', label: 'Stempel' },
  { kind: 'logo', label: 'Logo' },
  { kind: 'ttd', label: 'Tanda Tangan' },
  { kind: '', label: 'Lainnya' },
];

export const catOfKey = (k: string) =>
  /logo|foto/i.test(k) ? 'logo' : /stempel|cap/i.test(k) ? 'stempel' : /ttd|sign/i.test(k) ? 'ttd' : '';

const baseLabelOf = (k: string) =>
  IMAGE_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const isImageKey = (k: string) => k in IMAGE_LABEL || catOfKey(k) !== '';

// ============================================================
// SECTION: GaleriLipat Container
// ============================================================
export function GaleriLipat({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [buka, setBuka] = useState(true);
  const id = useId();
  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        aria-expanded={buka}
        aria-controls={id}
        onClick={() => setBuka(!buka)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-2 text-left font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileImage size={18} className="text-primary-600 dark:text-primary-400" />
          <span>Galeri Foto & Aset Gambar</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {buka ? 'Ciutkan' : 'Lebarkan'}
          <ChevronDown size={16} className={`transition-transform duration-200 ${buka ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {buka && <div id={id}>{children}</div>}
    </div>
  );
}

// ============================================================
// SECTION: Cache & Global Listeners
// ============================================================
let cache: Promise<SharedImage[]> | null = null;
const loadShared = () =>
  (cache ??= fetch('/api/cloudinary-list')
    .then((r) => (r.ok ? r.json() : { images: [] }))
    .then((d) => (Array.isArray(d.images) ? d.images : []))
    .catch(() => []));

const listeners = new Set<(v: SharedImage[]) => void>();

export async function addSharedImage(img: SharedImage) {
  const next = [img, ...(await loadShared()).filter((g) => g.url !== img.url)];
  cache = Promise.resolve(next);
  listeners.forEach((f) => f(next));
}

export async function removeSharedImage(url: string) {
  const next = (await loadShared()).filter((g) => g.url !== url);
  cache = Promise.resolve(next);
  listeners.forEach((f) => f(next));
}

// ============================================================
// SECTION: SharedGallery Main Component
// ============================================================
export default function SharedGallery({
  keys: baseKeys,
  data: baseData,
  onApply: baseApply,
  slots = [],
  onPicked,
  showEmpty = false,
  labels,
}: {
  labels?: Record<string, string>; // nama slot khusus menu (menimpa label bawaan)
  slots?: ImageSlot[]; // slot di luar keys: tanda tangan kedua, saksi, penanda tangan tambahan
  keys: readonly string[];
  data: object;
  onApply: (picked: Record<string, unknown>) => void;
  onPicked?: (message: string) => void;
  showEmpty?: boolean;
}) {
  const [shared, setShared] = useState<SharedImage[] | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const keys = [...baseKeys, ...slots.map((x) => x.id)];
  const data: object = { ...baseData, ...Object.fromEntries(slots.map((x) => [x.id, x.value])) };
  const onApply = (picked: Record<string, unknown>) => {
    const rest = { ...picked };
    // Setter diambil dari render TERBARU: upload selesai belakangan, setter daftar saksi lama akan menimpa isian baru
    for (const x of slotsRef.current) if (x.id in rest) { x.set(String(rest[x.id] ?? '')); delete rest[x.id]; }
    if (Object.keys(rest).length) baseApply(rest);
  };
  const imageKeys = keys.filter(isImageKey);
  const labelOf = (k: string) => slots.find((x) => x.id === k)?.label ?? labels?.[k] ?? baseLabelOf(k);
  const [target, setTarget] = useState('');
  const [ciut, setCiut] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<{ img: SharedImage; label: string } | null>(null);
  const [yakin, setYakin] = useState(false);
  const [hapusBusy, setHapusBusy] = useState(false);
  const [galat, setGalat] = useState('');

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    img: SharedImage;
    label: string;
  } | null>(null);
  const [busyAction, setBusyAction] = useState<string>(''); // 'hapusBg' | 'greyscale' | 'pasang' | 'hapus'

  // Upload Status in Edit Tampilan
  const [uploadBusyKey, setUploadBusyKey] = useState<string>('');
  const [bgRemovedMap, setBgRemovedMap] = useState<Record<string, boolean>>({});

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tutup = () => {
    setSel(null);
    setYakin(false);
    setGalat('');
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu / modal on escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
        if (!hapusBusy) tutup();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [hapusBusy]);

  useEffect(() => {
    let on = true;
    if (imageKeys.length) loadShared().then((v) => on && setShared(v));
    const sub = (v: SharedImage[]) => {
      if (on) setShared(v);
    };
    listeners.add(sub);
    return () => {
      on = false;
      listeners.delete(sub);
    };
  }, [imageKeys.length]);

  if (!imageKeys.length) return null;

  const current = data as Record<string, unknown>;

  // Target key resolver
  const keyFor = (kind: string) => target || imageKeys.find((k) => catOfKey(k) === kind) || imageKeys[0];

  // ============================================================
  // SECTION: Handler Upload Langsung di Edit Tampilan
  // ============================================================
  const handleUploadFile = (k: string, file?: File) => {
    if (!file) return;
    const label = labelOf(k);
    if (!file.type.startsWith('image/')) {
      onPicked?.(`${label}: berkas bukan gambar.`);
      return;
    }
    setUploadBusyKey(k);
    onPicked?.(`Memuat ${label.toLowerCase()}...`);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      onApply({ [k]: dataUrl });
      onPicked?.(`${label} berhasil dipasang.`);
      setUploadBusyKey('');

      // Auto upload ke Cloudinary dan masuk Galeri Foto
      const folder = galleryFolder(label, 'upload');
      uploadImage(file, folder)
        .then(({ url }) => {
          const kat = folder.split('/')[1];
          addSharedImage({ url, kind: kat === 'tanda-tangan' ? 'ttd' : kat === 'lainnya' ? '' : kat });
          onApply({ [k]: url });
          onPicked?.(`${label} masuk Galeri Foto.`);
        })
        .catch(() => {
          // Tetap terpasang secara lokal
        });
    };
    reader.onerror = () => {
      onPicked?.(`Gagal membaca ${label}.`);
      setUploadBusyKey('');
    };
    reader.readAsDataURL(file);
  };

  // ============================================================
  // SECTION: Handler Context Menu (Klik Kanan)
  // ============================================================
  const handlePasangDariContext = (img: SharedImage, targetKeyOverride?: string) => {
    const k = targetKeyOverride || keyFor(img.kind || '');
    onApply({ [k]: img.url });
    onPicked?.(`${labelOf(k)} berhasil dipasang dari galeri.`);
    closeContextMenu();
    tutup();
  };

  const handleLepasDariContext = (k: string) => {
    onApply({ [k]: '' });
    onPicked?.(`${labelOf(k)} dilepas.`);
    closeContextMenu();
    tutup();
  };

  const handleHapusBgDariContext = async (img: SharedImage, targetKeyOverride?: string) => {
    setBusyAction('hapusBg');
    try {
      const transparentDataUrl = await removeBackground(img.url);
      const k = targetKeyOverride || keyFor(img.kind || '');
      onApply({ [k]: transparentDataUrl });

      // Coba upload ke Cloudinary agar tersimpan permanen
      try {
        const blob = await (await fetch(transparentDataUrl)).blob();
        const folder = galleryFolder(img.kind || 'lainnya', 'hapus-bg');
        const uploaded = await uploadImage(blob, folder);
        await addSharedImage({ url: uploaded.url, kind: img.kind, folder });
        onApply({ [k]: uploaded.url });
      } catch {
        await addSharedImage({ url: transparentDataUrl, kind: img.kind });
      }

      onPicked?.('Background berhasil dihapus dan gambar langsung dipasang.');
      closeContextMenu();
      tutup();
    } catch (err: any) {
      onPicked?.(`Gagal menghapus background: ${err?.message || 'gambar tidak dapat diproses'}.`);
    } finally {
      setBusyAction('');
    }
  };

  const handleGreyscaleDariContext = async (img: SharedImage, targetKeyOverride?: string) => {
    setBusyAction('greyscale');
    try {
      const greyscaleDataUrl = await toGreyscale(img.url);
      const k = targetKeyOverride || keyFor(img.kind || '');
      onApply({ [k]: greyscaleDataUrl });

      // Coba upload ke Cloudinary agar tersimpan permanen
      try {
        const blob = await (await fetch(greyscaleDataUrl)).blob();
        const folder = galleryFolder(img.kind || 'lainnya', 'greyscale');
        const uploaded = await uploadImage(blob, folder);
        await addSharedImage({ url: uploaded.url, kind: img.kind, folder });
        onApply({ [k]: uploaded.url });
      } catch {
        await addSharedImage({ url: greyscaleDataUrl, kind: img.kind });
      }

      onPicked?.('Gambar berhasil diubah ke Greyscale dan langsung dipasang.');
      closeContextMenu();
      tutup();
    } catch (err: any) {
      onPicked?.(`Gagal mengubah ke Greyscale: ${err?.message || 'gambar tidak dapat diproses'}.`);
    } finally {
      setBusyAction('');
    }
  };

  const handleHapusDariGaleri = async (img: SharedImage) => {
    setHapusBusy(true);
    setGalat('');
    try {
      const res = await fetch('/api/cloudinary-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: img.url }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Server menolak (${res.status}).`);
      }

      const dipakai = imageKeys.filter((x) => current[x] === img.url);
      if (dipakai.length) onApply(Object.fromEntries(dipakai.map((x) => [x, ''])));
      await removeSharedImage(img.url);
      onPicked?.('Foto berhasil dihapus dari galeri.');
      tutup();
      closeContextMenu();
    } catch (e: any) {
      setGalat(`Gagal menghapus: ${e?.message || 'periksa koneksi lalu coba lagi.'}`);
      onPicked?.(`Foto belum terhapus: ${e?.message || 'periksa koneksi.'}`);
    } finally {
      setHapusBusy(false);
    }
  };

  // Right-click trigger
  const triggerContextMenu = (e: React.MouseEvent, img: SharedImage, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 260;
    const menuHeight = 340;
    const x = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 10));
    const y = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 10));
    setContextMenu({ x, y, img, label });
  };

  // Long press for touch devices
  const handleTouchStart = (e: React.TouchEvent, img: SharedImage, label: string) => {
    const touch = e.touches[0];
    const menuWidth = 260;
    const menuHeight = 340;
    const x = Math.max(10, Math.min(touch.clientX, window.innerWidth - menuWidth - 10));
    const y = Math.max(10, Math.min(touch.clientY, window.innerHeight - menuHeight - 10));
    touchTimerRef.current = setTimeout(() => {
      setContextMenu({ x, y, img, label });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const groups = CATS.map((c) => ({
    ...c,
    imgs: (shared ?? []).filter((g) => (g.kind || '') === c.kind),
  })).filter((g) => g.imgs.length);

  return (
    <div className="space-y-5">
      {/* ============================================================
          BAGIAN 1: UPLOAD LOGO, TANDA TANGAN & STEMPEL DI EDIT TAMPILAN
         ============================================================ */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/90 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary-600 dark:bg-primary-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Upload Logo, Tanda Tangan & Stempel
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {imageKeys.length} Slot Gambar
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {imageKeys.map((k) => {
            const val = String(current[k] || '');
            const label = labelOf(k);
            const isBusy = uploadBusyKey === k;
            const isBgRemoved = !!bgRemovedMap[k];

            return (
              <div
                key={k}
                className="flex flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/60 dark:bg-gray-900/40"
              >
                <div>
                  {k.startsWith('logo')
                    ? <span className="pita-emas mb-2 max-w-full truncate !text-xs">{label}</span>
                    : <span className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 truncate">{label}</span>}

                  {/* Thumbnail / Upload Area */}
                  {isBusy ? (
                    <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-primary-600">
                      <Spinner className="h-6 w-6 mr-2" /> Memuat...
                    </div>
                  ) : val ? (
                    <div className="space-y-2">
                      <div className="relative flex h-28 w-full items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] dark:bg-[repeating-conic-gradient(#374151_0_25%,#1f2937_0_50%)] bg-[length:14px_14px] p-2">
                        <img
                          src={val}
                          alt={label}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <label className="cursor-pointer text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">
                          Ganti
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadFile(k, e.target.files?.[0])}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => onApply({ [k]: '' })}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200/80 dark:border-gray-700/60">
                        <BgToggle
                          checked={isBgRemoved}
                          onChange={async (v) => {
                            setBgRemovedMap((prev) => ({ ...prev, [k]: v }));
                            if (v) {
                              try {
                                const clean = await removeBackground(val);
                                onApply({ [k]: clean });
                              } catch {
                                // Ignore
                              }
                            }
                          }}
                          label="Hapus BG"
                        />
                        <GreyToggle
                          value={val}
                          onChange={(next) => onApply({ [k]: next })}
                          notify={(_t, m) => onPicked?.(m)}
                        />
                      </div>
                    </div>
                  ) : (
                    <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-500 dark:hover:border-primary-400 transition-colors p-3 text-center">
                      <Upload size={20} className="text-gray-400 mb-1" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Pilih File</span>
                      <span className="text-[10px] text-gray-400">PNG, JPG, SVG</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadFile(k, e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          BAGIAN 2: GALERI FOTO (DENGAN KLIK KANAN: PASANG, HAPUS, HAPUS BG, GREYSCALE)
         ============================================================ */}
      <div className="space-y-3">
        {imageKeys.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Pasang gambar ke">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Pasang ke:</span>
            {['', ...imageKeys].map((k) => (
              <button
                key={k || 'auto'}
                type="button"
                role="radio"
                aria-checked={target === k}
                onClick={() => setTarget(k)}
                className={`px-3 min-h-[32px] rounded-full border text-xs font-semibold transition-colors ${
                  target === k
                    ? 'bg-primary-600 border-primary-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {k ? labelOf(k) : 'Otomatis'}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-2.5 text-xs text-blue-800 dark:text-blue-300">
          <strong>Tips:</strong> Klik kanan pada foto di bawah untuk menu cepat: <b>Pasang</b>, <b>Hapus</b>, <b>Hapus BG</b>, dan <b>Greyscale</b>.
        </div>

        {!groups.length ? (
          showEmpty ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              {shared ? 'Galeri masih kosong. Upload logo/tanda tangan di atas untuk menyimpannya di sini.' : 'Memuat galeri...'}
            </p>
          ) : null
        ) : (
          groups.map((g) => {
            const id = g.kind || 'lain';
            const buka = !ciut[id];
            return (
              <div key={id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={buka}
                  aria-controls={`galeri-${id}`}
                  onClick={() => setCiut((c) => ({ ...c, [id]: buka }))}
                  className="flex min-h-[40px] w-full items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 px-3 text-left text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>{g.label} ({g.imgs.length})</span>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${buka ? 'rotate-180' : ''}`} />
                </button>
                {buka && (
                  <div id={`galeri-${id}`} className="flex flex-wrap gap-2.5 p-3">
                    {g.imgs.map((img) => {
                      const dipakai = imageKeys.filter((x) => current[x] === img.url);
                      const aktif = dipakai.length > 0;
                      return (
                        <div
                          key={img.url}
                          onContextMenu={(e) => triggerContextMenu(e, img, g.label)}
                          onTouchStart={(e) => handleTouchStart(e, img, g.label)}
                          onTouchEnd={handleTouchEnd}
                          onClick={() => {
                            if (contextMenu) {
                              closeContextMenu();
                              return;
                            }
                            setSel({ img, label: g.label });
                            setYakin(false);
                            setGalat('');
                          }}
                          className={`relative h-22 w-22 sm:h-20 sm:w-20 shrink-0 cursor-pointer rounded-xl border-2 p-1.5 transition-all select-none ${
                            aktif
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/60 shadow-md ring-2 ring-primary-500/30'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs hover:-translate-y-0.5 hover:border-primary-400'
                          }`}
                          title="Klik kiri: Buka pratinjau | Klik kanan: Menu Pasang, Hapus, Hapus BG & Greyscale"
                        >
                          <img
                            src={img.url.replace('/upload/', '/upload/w_240,h_240,c_fit/')}
                            alt={g.label}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                          {aktif && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold shadow-xs">
                              <Check size={11} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================
          FLOATING CONTEXT MENU (KLIK KANAN PADA FOTO GALERI)
         ============================================================ */}
      {contextMenu && (
        <>
          {/* Backdrop transparan: klik / klik kanan di luar langsung menutup menu tanpa efek samping */}
          <div
            className="fixed inset-0 z-[119] bg-black/10 dark:bg-black/30 backdrop-blur-[1px]"
            onClick={() => closeContextMenu()}
            onContextMenu={(e) => {
              e.preventDefault();
              closeContextMenu();
            }}
          />

          <div
            role="menu"
            aria-label="Menu Tindakan Foto"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[120] w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-2xl text-xs font-semibold text-gray-800 dark:text-gray-200 animate-in fade-in duration-150"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            {/* Header thumbnail & label */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700/60 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={contextMenu.img.url.replace('/upload/', '/upload/w_80,h_80,c_fit/')}
                  alt=""
                  className="h-7 w-7 rounded-lg object-contain border border-gray-200 dark:border-gray-700 shrink-0 bg-white"
                />
                <span className="truncate font-bold text-gray-900 dark:text-gray-100">{contextMenu.label}</span>
              </div>
              <button
                type="button"
                onClick={() => closeContextMenu()}
                className="h-6 w-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bagian 1: Pasang / Lepas ke slot yang tersedia */}
            <div className="space-y-1 mb-1">
              <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Pasang ke Dokumen:
              </p>
              {imageKeys.map((k) => {
                const isInstalled = current[k] === contextMenu.img.url;
                return isInstalled ? (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    disabled={!!busyAction}
                    onClick={() => handleLepasDariContext(k)}
                    className="flex min-h-[34px] w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
                      <span className="truncate">Lepas dari <b>{labelOf(k)}</b></span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 text-primary-600 font-bold border border-primary-200 dark:border-primary-800">
                      Aktif
                    </span>
                  </button>
                ) : (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    disabled={!!busyAction}
                    onClick={() => handlePasangDariContext(contextMenu.img, k)}
                    className="flex min-h-[34px] w-full items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left"
                  >
                    <Check size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">Pasang ke <b>{labelOf(k)}</b></span>
                  </button>
                );
              })}
            </div>

            <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />

            {/* Bagian 2: Manipulasi Gambar */}
            <div className="space-y-1">
              <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Tindakan Foto:
              </p>
              {/* Opsi: Hapus BG */}
              <button
                type="button"
                role="menuitem"
                disabled={!!busyAction}
                onClick={() => handleHapusBgDariContext(contextMenu.img)}
                className="flex min-h-[36px] w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left"
              >
                {busyAction === 'hapusBg' ? (
                  <RefreshCw size={15} className="animate-spin text-purple-600 shrink-0" />
                ) : (
                  <Scissors size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                )}
                <span>{busyAction === 'hapusBg' ? 'Memproses Hapus BG...' : 'Hapus BG (Transparan)'}</span>
              </button>

              {/* Opsi: Greyscale */}
              <button
                type="button"
                role="menuitem"
                disabled={!!busyAction}
                onClick={() => handleGreyscaleDariContext(contextMenu.img)}
                className="flex min-h-[36px] w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left"
              >
                {busyAction === 'greyscale' ? (
                  <RefreshCw size={15} className="animate-spin text-amber-600 shrink-0" />
                ) : (
                  <Palette size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span>{busyAction === 'greyscale' ? 'Memproses Greyscale...' : 'Ubah ke Greyscale'}</span>
              </button>
            </div>

            <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />

            {/* Bagian 3: Hapus Foto dari Galeri */}
            <button
              type="button"
              role="menuitem"
              disabled={!!busyAction || hapusBusy}
              onClick={() => {
                if (confirm('Hapus foto ini dari galeri bersama?')) {
                  handleHapusDariGaleri(contextMenu.img);
                }
              }}
              className="flex min-h-[34px] w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors text-left"
            >
              {hapusBusy ? (
                <RefreshCw size={14} className="animate-spin shrink-0" />
              ) : (
                <Trash2 size={14} className="shrink-0" />
              )}
              <span>{hapusBusy ? 'Menghapus...' : 'Hapus dari Galeri'}</span>
            </button>
          </div>
        </>
      )}

      {/* ============================================================
          POP-UP DIALOG PRATINJAU FOTO BIASA (KLIK KIRI)
         ============================================================ */}
      {sel && (() => {
        const { img, label } = sel;
        const kind = img.kind || '';
        const k = keyFor(kind);
        const dipakai = imageKeys.filter((x) => current[x] === img.url);
        const aktif = dipakai.length > 0;

        const pasang = () => {
          onApply({ [k]: img.url });
          onPicked?.(`${labelOf(k)} dari galeri berhasil dipasang.`);
          tutup();
        };

        const lepas = () => {
          onApply(Object.fromEntries(dipakai.map((x) => [x, ''])));
          onPicked?.(`${dipakai.map(labelOf).join(', ')} dilepas.`);
          tutup();
        };

        const btn = 'min-h-[44px] w-full rounded-xl px-4 text-sm font-bold disabled:opacity-60 transition-colors';

        return (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 backdrop-blur-xs p-3 sm:items-center"
            onClick={() => !hapusBusy && tutup()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Gambar ${label}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md space-y-3.5 rounded-3xl bg-white dark:bg-gray-800 p-5 text-gray-800 dark:text-gray-200 shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-900 dark:text-gray-100">Galeri — {label}</p>
                <button
                  type="button"
                  onClick={tutup}
                  disabled={hapusBusy}
                  aria-label="Tutup"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex h-[36vh] items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] dark:bg-[repeating-conic-gradient(#374151_0_25%,#1f2937_0_50%)] bg-[length:16px_16px] p-2">
                <img
                  src={img.url.replace('/upload/', '/upload/w_900,h_900,c_fit/')}
                  alt={`Gambar ${label.toLowerCase()}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {aktif ? (
                  <button
                    type="button"
                    onClick={lepas}
                    disabled={hapusBusy}
                    className={`${btn} border border-primary-600 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400`}
                  >
                    Lepas dari {dipakai.map(labelOf).join(', ')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pasang}
                    disabled={hapusBusy}
                    className={`${btn} bg-primary-600 hover:bg-primary-700 text-white shadow-xs`}
                  >
                    Pasang sebagai {labelOf(k)}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!!busyAction}
                    onClick={() => handleHapusBgDariContext(img)}
                    className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 text-xs font-bold text-purple-700 dark:text-purple-300"
                  >
                    <Scissors size={14} /> Hapus BG
                  </button>
                  <button
                    type="button"
                    disabled={!!busyAction}
                    onClick={() => handleGreyscaleDariContext(img)}
                    className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-xs font-bold text-amber-700 dark:text-amber-300"
                  >
                    <Palette size={14} /> Greyscale
                  </button>
                </div>

                {!yakin ? (
                  <button
                    type="button"
                    onClick={() => setYakin(true)}
                    disabled={hapusBusy}
                    className={`${btn} border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs`}
                  >
                    Hapus dari Galeri
                  </button>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-3">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                      Hapus foto ini dari galeri untuk SEMUA pengguna? Tidak bisa dibatalkan.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setYakin(false)}
                        disabled={hapusBusy}
                        className={`${btn} border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs`}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHapusDariGaleri(img)}
                        disabled={hapusBusy}
                        className={`${btn} bg-red-600 text-white text-xs`}
                      >
                        {hapusBusy ? 'Menghapus...' : 'Ya, Hapus'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {galat && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{galat}</p>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
