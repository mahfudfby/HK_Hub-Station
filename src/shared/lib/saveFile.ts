// Simpan file hasil fitur: (1) unduh otomatis ke Files/Downloads, (2) tawarkan tombol Share.
// Safari iOS tidak bisa menyimpan langsung ke Foto/Files; harus lewat lembar Share, dan navigator.share()
// wajib dipanggil dari klik user, jadi tombolnya muncul di <ShareSheet> setelah file siap.
export const SHARE_EVENT = 'hk:share-file';

export function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); // blob URL (bukan data URL) agar Safari mengunduh, bukan membuka file
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) window.dispatchEvent(new CustomEvent(SHARE_EVENT, { detail: file }));
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar.'))), type, quality),
  );
}
