// Cetak satu gambar (hasil html2canvas) lewat iframe tersembunyi: tanpa pop-up, jalan di Chrome, Edge & Safari.
export function printImage(src: string, title = 'Cetak'): Promise<void> {
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
    const safeTitle = title.replace(/[<>&"]/g, '');
    doc.open();
    doc.write(`<!doctype html><html><head><title>${safeTitle}</title><style>
      @page { margin: 8mm; }
      html, body { margin: 0; }
      img { display: block; margin: 0 auto; max-width: 100%; max-height: 100vh; object-fit: contain; }
    </style></head><body><img alt=""></body></html>`);
    doc.close();

    let removed = false;
    const cleanup = () => {
      if (!removed) iframe.remove();
      removed = true;
    };
    win.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 120_000); // cadangan bila 'afterprint' tidak terpanggil

    const img = doc.querySelector('img') as HTMLImageElement;
    img.onload = () => {
      win.focus();
      win.print();
      resolve();
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Gambar gagal dimuat untuk dicetak.'));
    };
    img.src = src;
  });
}
