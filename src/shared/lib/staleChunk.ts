// Setelah deploy baru, tab yang masih terbuka menunjuk file lama (mis. jspdf-xxxx.js) yang sudah tidak ada,
// sehingga Unduh PDF / pindah menu gagal. Solusi: muat ulang sekali ke versi terbaru (isian tersimpan di perangkat).

const RELOAD_KEY = 'hk:reload-after-deploy';

// Pesan error browser saat file JS versi lama hilang (Chrome, Safari, Firefox)
export const isStaleChunkError = (err: unknown) =>
  /dynamically imported module|Importing a module script failed|module script|MIME type|error loading dynamically|Failed to fetch dynamically/i.test(
    String((err as Error)?.message ?? err),
  );

export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false; // cegah muat ulang berulang
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* tanpa sessionStorage tetap muat ulang */
  }
  window.location.reload();
  return true;
}

console.assert(
  isStaleChunkError(new TypeError("'text/html' is not a valid JavaScript MIME type for module script 'https://x/assets/jspdf.js'.")) &&
    isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js')) &&
    !isStaleChunkError(new Error('isi melebihi 1 halaman')),
  'isStaleChunkError',
);
