// ============================================================
// Cloudinary — penyimpanan gambar UTAMA (logo, tanda tangan, dst.)
// Cloud name & API key = identifier publik (aman di frontend).
// API Secret TIDAK PERNAH ada di sini; ia hanya di server (api/cloudinary-sign.ts).
// Urutan upload: (1) signed via /api/cloudinary-sign  ->  (2) unsigned preset  ->  gagal (caller fallback lokal)
// ============================================================
export const CLOUDINARY_CLOUD_NAME: string = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'tdja56xe';
export const CLOUDINARY_API_KEY: string = import.meta.env.VITE_CLOUDINARY_API_KEY || '493779522596543';
const UPLOAD_PRESET: string = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'CloudDB_HKHUB_001';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export type UploadResult = { url: string; publicId: string };

// Folder kategori galeri ditentukan dari KOLOM FORM tempat gambar diunggah (bukan nama file):
// kolom logo → logo, kolom stempel/cap → stempel, kolom tanda tangan (ttd…, signature) → tanda-tangan.
// api/cloudinary-list.ts membaca folder ini untuk mengelompokkan galeri.
export function galleryFolder(fieldKey: string, source: string): string {
  const k = fieldKey.toLowerCase();
  const kategori = /logo/.test(k) ? 'logo' : /stempel|cap/.test(k) ? 'stempel' : /ttd|sign|tanda/.test(k) ? 'tanda-tangan' : 'lainnya';
  return `hk-hub-station/${kategori}/${source}`;
}
console.assert(galleryFolder('ttdRt', 'data-user') === 'hk-hub-station/tanda-tangan/data-user' && galleryFolder('managerSignature', 'x') === 'hk-hub-station/tanda-tangan/x'
  && galleryFolder('stempelRt', 'x') === 'hk-hub-station/stempel/x' && galleryFolder('logoBase64', 'x') === 'hk-hub-station/logo/x' && galleryFolder('foto', 'x') === 'hk-hub-station/lainnya/x', 'galleryFolder');

async function uploadSigned(file: Blob, folder: string): Promise<UploadResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signRes = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, timestamp }),
  });
  if (!signRes.ok) throw new Error(`Endpoint tanda tangan (signature) tidak tersedia (${signRes.status}).`);
  const { signature } = await signRes.json();
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', CLOUDINARY_API_KEY);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('asset_folder', folder); // mode dynamic folders: folder sebenarnya di Media Library
  body.append('signature', signature);
  return send(body);
}

async function uploadUnsigned(file: Blob, folder: string): Promise<UploadResult> {
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);
  body.append('folder', folder);
  body.append('asset_folder', folder); // mode dynamic folders: folder sebenarnya di Media Library
  return send(body);
}

async function send(body: FormData): Promise<UploadResult> {
  const res = await fetch(UPLOAD_URL, { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Upload Cloudinary gagal (${res.status}).`);
  return { url: data.secure_url, publicId: data.public_id };
}

export async function uploadImage(file: Blob, folder = 'hk-hub-station'): Promise<UploadResult> {
  try {
    return await uploadSigned(file, folder);
  } catch (signedErr) {
    if (!UPLOAD_PRESET) throw signedErr;
    return uploadUnsigned(file, folder);
  }
}
