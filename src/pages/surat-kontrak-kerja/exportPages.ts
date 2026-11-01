import { useState } from 'react';
import { unfitPreview } from '../../shared/components/FitPreview';
import type { ExportKind, Notify, Paper } from '../../shared/components/LetterKit';
import { canvasToBlob, saveFile } from '../../shared/lib/saveFile';
import { fontsReady } from '../../shared/lib/fonts';
import { isStaleChunkError, reloadForNewVersion } from '../../shared/lib/staleChunk';

// Ekspor dokumen banyak halaman (versi multi-halaman dari exportPage di LetterKit):
// PDF = satu file, satu halaman per lembar; PNG = satu file per halaman (-hal1, -hal2…); Print = semua halaman.
async function exportPages(pages: HTMLElement[], kind: ExportKind, fileName: string, paper: Paper, scale = 3) {
  await fontsReady();
  const { default: html2canvas } = await import('html2canvas');
  const canvases: HTMLCanvasElement[] = [];
  for (const [i, page] of pages.entries()) {
    const width = page.offsetWidth;
    const height = page.offsetHeight;
    if (page.scrollHeight > height + 1) throw new Error(`isi halaman ${i + 1} melebihi kertas.`);
    canvases.push(await html2canvas(page, { scale, width, height, windowWidth: 1280, backgroundColor: '#fff', useCORS: true, onclone: unfitPreview }));
  }
  if (kind === 'Print') return printPages(canvases.map((c) => c.toDataURL('image/png')), fileName, paper);
  if (kind === 'PNG') {
    for (const [i, c] of canvases.entries()) saveFile(await canvasToBlob(c), `${fileName}-hal${i + 1}.png`);
    return;
  }
  const { jsPDF } = await import('jspdf');
  const orientation = paper.w > paper.h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [paper.w, paper.h], orientation });
  canvases.forEach((c, i) => {
    if (i) pdf.addPage([paper.w, paper.h], orientation);
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, paper.w, paper.h); // JPEG: PNG bikin PDF sangat besar
  });
  saveFile(pdf.output('blob'), `${fileName}.pdf`);
}

// Seperti printImage (shared/lib), tapi satu <img> per halaman dengan pemisah halaman:
// gambar tidak pernah terbelah antarhalaman dan ukuran kertas terkunci.
function printPages(srcs: string[], title: string, paper: Paper): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      iframe.remove();
      return reject(new Error('Browser tidak mendukung cetak.'));
    }
    const w = `${paper.w}mm`;
    const h = `${paper.h}mm`;
    const css = `@page { size: ${w} ${h}; margin: 0; }
      html, body { margin: 0; width: ${w}; }
      img { display: block; width: ${w}; height: ${h}; break-after: page; page-break-after: always; }
      img:last-child { break-after: auto; page-break-after: auto; }`;
    doc.open();
    doc.write(`<!doctype html><html><head><title>${title.replace(/[<>&"]/g, '')}</title><style>${css}</style></head><body>${srcs.map(() => '<img alt="">').join('')}</body></html>`);
    doc.close();

    let removed = false;
    const cleanup = () => {
      if (!removed) iframe.remove();
      removed = true;
    };
    win.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 120_000); // cadangan bila 'afterprint' tidak terpanggil

    const imgs = [...doc.querySelectorAll('img')];
    let left = imgs.length;
    imgs.forEach((img, i) => {
      img.onload = () => {
        if (--left) return;
        win.focus();
        win.print();
        resolve();
      };
      img.onerror = () => {
        cleanup();
        reject(new Error('Gambar gagal dimuat untuk dicetak.'));
      };
      img.src = srcs[i];
    });
  });
}

// State + handler tombol PDF/PNG/Print (pola sama dengan useLetterExport, termasuk penanganan versi lama)
export function usePagesExport(getPages: () => HTMLElement[], fileName: string, notify: Notify, paper: Paper) {
  const [exporting, setExporting] = useState<'' | ExportKind>('');
  const run = async (kind: ExportKind) => {
    setExporting(kind);
    notify('loading', kind === 'Print' ? 'Menyiapkan cetakan…' : `Membuat file ${kind}…`);
    try {
      const pages = getPages();
      await exportPages(pages, kind, fileName, paper);
      notify('success', kind === 'Print' ? 'Jendela cetak dibuka.' : kind === 'PNG' ? `${pages.length} file PNG (${fileName}-hal1…) berhasil diunduh.` : `${fileName}.pdf (${pages.length} halaman) berhasil diunduh.`);
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
