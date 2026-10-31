import { useState, type ReactNode } from 'react';
import BgToggle from './BgToggle';
import { Spinner, type ToastType } from './Feedback';
import { unfitPreview } from './FitPreview';
import { canvasToBlob, saveFile } from '../lib/saveFile';
import { printImage } from '../lib/printImage';
import { fontsReady } from '../lib/fonts';
import { isStaleChunkError, reloadForNewVersion } from '../lib/staleChunk';

// Bahan bersama surat dokter (A5): ukuran halaman, font, isian data, form, dan ekspor PDF/PNG/Print.

export type Notify = (type: ToastType, message: string) => void;
export type ExportKind = 'PDF' | 'PNG' | 'Print';

// Halaman terkunci A5 asli @96 DPI (148×210 mm = 559×794 px): teks 13px ≈ 10pt di kertas
export const PAGE_W = 559;
export const PAGE_H = 794;
// Helvetica; perangkat tanpa Helvetica memakai Arimo (bawaan aplikasi, ukuran huruf identik) agar tata letak sama
export const LETTER_FONT = 'Helvetica, Arimo, Arial, sans-serif';

export const fmtTanggal = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

// Isian data: miring + titik-titik di bawahnya.
// Jarak 0.22em di bawah teks agar ekor huruf (g/j/p/y) tidak menempel ke titik-titik, juga di hasil html2canvas.
export const DOTTED = '1.5px dotted #000';
const GAP = '0.22em';
export const dataStyle = { fontStyle: 'italic', borderBottom: DOTTED, paddingBottom: GAP } as const;
export const Dots = ({ w = '7em' }: { w?: string }) => (
  <span style={{ display: 'inline-block', width: w, borderBottom: DOTTED, verticalAlign: `-${GAP}` }} />
);
export const orDots = (v: string, w?: string) =>
  v ? <span style={{ fontStyle: 'italic', borderBottom: DOTTED, padding: `0 6px ${GAP}` }}>{v}</span> : <Dots w={w} />;

// ---------------- Form ----------------
export const inputCls = 'w-full p-2 border border-gray-300 rounded-lg text-sm';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function ImageUpload({ label, value, onChange, notify, bg, onBg, shown, bgBusy }: {
  label: string; value: string; onChange: (v: string) => void; notify: Notify;
  bg: boolean; onBg: (v: boolean) => void; shown: string; bgBusy: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const read = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('error', `${label}: file "${file.name}" bukan gambar.`);
    setBusy(true);
    notify('loading', `Memuat ${label.toLowerCase()}…`);
    const r = new FileReader();
    r.onload = () => {
      onChange(String(r.result));
      notify('success', `${label} berhasil dipasang.`);
      setBusy(false);
    };
    r.onerror = () => {
      notify('error', `${label} gagal dibaca.`);
      setBusy(false);
    };
    r.readAsDataURL(file);
  };
  const remove = () => {
    onChange('');
    notify('info', `${label} dihapus.`);
  };
  return (
    <Field label={label}>
      {/* Kotak 3D hanya untuk upload; toggle Hapus BG di luar kotak */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="upload-box flex flex-1 min-w-0 flex-wrap items-center gap-3">
        {busy ? (
          <span className="h-14 w-14 flex items-center justify-center border rounded text-blue-600"><Spinner className="h-6 w-6" /></span>
        ) : (
          value && <img src={shown} alt={label} className="h-14 w-14 object-contain border rounded bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
        )}
        <input type="file" accept="image/*" disabled={busy} onChange={(e) => read(e.target.files?.[0])} className="text-sm flex-1 min-w-0" />
        {value && (
          <button type="button" onClick={remove} className="text-sm text-red-600">Hapus</button>
        )}
      </div>
      <BgToggle checked={bg} onChange={onBg} busy={bgBusy} />
      </div>
    </Field>
  );
}

// ---------------- Ekspor ----------------
export type Paper = { w: number; h: number }; // mm
export const A5: Paper = { w: 148, h: 210 };
export const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4); // 96 DPI CSS

// Pilihan kertas surat. Isi surat dirancang untuk A5; di kertas lain huruf & margin ikut diperbesar (f).
export const LETTER_PAPERS: Record<string, Paper & { label: string }> = {
  A5: { w: 148, h: 210, label: 'A5 (148×210 mm)' },
  A4: { w: 210, h: 297, label: 'A4 (210×297 mm)' },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216×279 mm)' },
  F4: { w: 215, h: 330, label: 'F4 / Folio (215×330 mm)' },
};
export function letterPage(paperId: string, landscape: boolean) {
  const b = LETTER_PAPERS[paperId] ?? LETTER_PAPERS.A5;
  const paper: Paper = landscape ? { w: b.h, h: b.w } : { w: b.w, h: b.h };
  const W = mmToPx(paper.w);
  const H = mmToPx(paper.h);
  return { paper, W, H, f: Math.min(W, H) / PAGE_W }; // f = 1 untuk A5 vertikal
}
console.assert(letterPage('A5', false).W === PAGE_W && letterPage('A5', false).H === PAGE_H && letterPage('A4', true).W > letterPage('A4', true).H, 'letterPage');

export function PaperPicker({ paper, landscape, onPaper, onLandscape }: {
  paper: string; landscape: boolean; onPaper: (v: string) => void; onLandscape: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
      <Field label="Ukuran kertas">
        <select className={inputCls} value={paper} onChange={(e) => onPaper(e.target.value)}>
          {Object.entries(LETTER_PAPERS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </select>
      </Field>
      <div className="flex gap-2" role="radiogroup" aria-label="Orientasi kertas">
        {[false, true].map((ls) => (
          <button key={String(ls)} type="button" role="radio" aria-checked={landscape === ls} onClick={() => onLandscape(ls)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${landscape === ls ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {ls ? 'Landscape' : 'Vertikal'}
          </button>
        ))}
      </div>
    </div>
  );
}

// Render halaman (ukuran px tetap) ke PNG/PDF/Print sesuai ukuran kertas; tidak bergantung layar/zoom perangkat.
// scale 3 ≈ 288 DPI di kertas.
export async function exportPage(page: HTMLElement, kind: ExportKind, fileName: string, paper: Paper, scale = 3) {
  await fontsReady(); // font dokumen (termasuk Google Fonts template) wajib termuat agar tata letak sama di semua perangkat
  const width = page.offsetWidth;
  const height = page.offsetHeight;
  if (page.scrollHeight > height + 1) throw new Error('isi melebihi 1 halaman. Kurangi isinya atau pilih kertas lebih besar.');
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(page, { scale, width, height, windowWidth: 1280, backgroundColor: '#fff', useCORS: true, onclone: unfitPreview });
  if (kind === 'Print') return printImage(canvas.toDataURL('image/png'), fileName, { w: `${paper.w}mm`, h: `${paper.h}mm` });
  if (kind === 'PNG') return saveFile(await canvasToBlob(canvas), `${fileName}.png`);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: [paper.w, paper.h], orientation: paper.w > paper.h ? 'landscape' : 'portrait' });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, paper.w, paper.h); // JPEG: PNG bikin PDF ~8 MB
  saveFile(pdf.output('blob'), `${fileName}.pdf`);
}

// State + handler tombol PDF/PNG/Print dengan notifikasi. paper/scale bawaan: surat A5.
export function useLetterExport(getPage: () => HTMLElement, fileName: string, notify: Notify, paper: Paper | ((page: HTMLElement) => Paper) = A5, scale = 3) {
  const [exporting, setExporting] = useState<'' | ExportKind>('');
  const run = async (kind: ExportKind) => {
    setExporting(kind);
    notify('loading', kind === 'Print' ? 'Menyiapkan cetakan…' : `Membuat file ${kind}…`);
    try {
      const page = getPage();
      await exportPage(page, kind, fileName, typeof paper === 'function' ? paper(page) : paper, scale);
      notify('success', kind === 'Print' ? 'Jendela cetak dibuka.' : `${fileName}.${kind.toLowerCase()} berhasil diunduh.`);
    } catch (err: any) {
      if (isStaleChunkError(err) && reloadForNewVersion()) {
        notify('info', 'Aplikasi baru saja diperbarui. Memuat ulang… lalu tekan Unduh sekali lagi.');
        return;
      }
      notify('error', `Gagal ${kind === 'Print' ? 'mencetak' : `membuat ${kind}`}: ${err?.message || 'proses render gagal.'}`);
    } finally {
      setExporting('');
    }
  };
  return { exporting, run };
}

export function ExportButton({ kind, color, exporting, disabled, onRun }: {
  kind: ExportKind; color: string; exporting: '' | ExportKind; disabled?: boolean; onRun: (k: ExportKind) => void;
}) {
  return (
    <button onClick={() => onRun(kind)} disabled={!!exporting || disabled}
      className={`px-5 py-2 rounded-lg text-white font-semibold flex items-center gap-2 disabled:opacity-60 ${color}`}>
      {exporting === kind && <Spinner />} {kind === 'Print' ? 'Print' : `Unduh ${kind}`}
    </button>
  );
}
