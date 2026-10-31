import { useState, type ReactNode } from 'react';
import BgToggle from './BgToggle';
import { Spinner, type ToastType } from './Feedback';
import { unfitPreview } from './FitPreview';
import { canvasToBlob, saveFile } from '../lib/saveFile';
import { printImage } from '../lib/printImage';

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

// Isian data: miring + titik-titik di bawahnya
export const DOTTED = '1.5px dotted #000';
export const dataStyle = { fontStyle: 'italic', borderBottom: DOTTED } as const;
export const Dots = ({ w = '7em' }: { w?: string }) => (
  <span style={{ display: 'inline-block', width: w, borderBottom: DOTTED, verticalAlign: 'baseline' }} />
);
export const orDots = (v: string, w?: string) =>
  v ? <span style={{ fontStyle: 'italic', borderBottom: DOTTED, padding: '0 6px' }}>{v}</span> : <Dots w={w} />;

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
      <div className="flex items-center gap-3">
        {busy ? (
          <span className="h-14 w-14 flex items-center justify-center border rounded text-blue-600"><Spinner className="h-6 w-6" /></span>
        ) : (
          value && <img src={shown} alt={label} className="h-14 w-14 object-contain border rounded bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
        )}
        <input type="file" accept="image/*" disabled={busy} onChange={(e) => read(e.target.files?.[0])} className="text-sm flex-1 min-w-0" />
        <BgToggle checked={bg} onChange={onBg} busy={bgBusy} />
        {value && (
          <button type="button" onClick={remove} className="text-sm text-red-600">Hapus</button>
        )}
      </div>
    </Field>
  );
}

// ---------------- Ekspor ----------------
// Hasil selalu 1677×2382 px (≈288 DPI) & PDF A5, tidak bergantung layar/zoom perangkat
export async function exportLetter(page: HTMLElement, kind: ExportKind, fileName: string) {
  await document.fonts.ready; // font dokumen wajib termuat agar tata letak sama di semua perangkat
  if (page.scrollHeight > PAGE_H + 1) throw new Error('isi surat melebihi 1 halaman A5. Persingkat teksnya.');
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(page, { scale: 3, width: PAGE_W, height: PAGE_H, windowWidth: 1280, backgroundColor: '#fff', onclone: unfitPreview });
  if (kind === 'Print') return printImage(canvas.toDataURL('image/png'), fileName, { w: '148mm', h: '210mm' });
  if (kind === 'PNG') return saveFile(await canvasToBlob(canvas), `${fileName}.png`);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 148, 210); // JPEG: PNG bikin PDF ~8 MB
  saveFile(pdf.output('blob'), `${fileName}.pdf`);
}

// State + handler tombol PDF/PNG/Print dengan notifikasi
export function useLetterExport(getPage: () => HTMLElement, fileName: string, notify: Notify) {
  const [exporting, setExporting] = useState<'' | ExportKind>('');
  const run = async (kind: ExportKind) => {
    setExporting(kind);
    notify('loading', kind === 'Print' ? 'Menyiapkan cetakan…' : `Membuat file ${kind}…`);
    try {
      await exportLetter(getPage(), kind, fileName);
      notify('success', kind === 'Print' ? 'Jendela cetak dibuka.' : `${fileName}.${kind.toLowerCase()} berhasil diunduh.`);
    } catch (err: any) {
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
