// Memuat gambar ke HTMLImageElement dengan aman tanpa terkena batasan CORS browser cache
// (mengunduh sebagai blob terlebih dahulu untuk remote URL sehingga Canvas tidak tainted).
export async function loadSafeImage(src: string): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    const img = new Image();
    img.src = src;
    await img.decode();
    return { img, cleanup: () => {} };
  }

  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = blobUrl;
    await img.decode();
    return { img, cleanup: () => URL.revokeObjectURL(blobUrl) };
  } catch {
    // Fallback muat langsung dengan crossOrigin
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await img.decode();
    return { img, cleanup: () => {} };
  }
}
