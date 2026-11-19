import React, { useEffect, useState } from 'react';
import { QrCode, X } from 'lucide-react';

const QRIS_IMAGE_URL = 'https://res.cloudinary.com/dl4pyan8v/image/upload/v1791206224/HK_Qris_dyxbaq.jpg';

interface QrisModalProps {
  onClose: () => void;
}

export default function QrisModal({ onClose }: QrisModalProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan QRIS Donasi"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-gray-800 p-6 text-center shadow-2xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Tutup modal QRIS"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-sm">
          <img src="/favicon.svg" alt="HK" className="h-full w-full" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Dukung Pengembang
        </h2>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Scan QRIS untuk donasi seikhlasnya agar kami terus merawat & menambah template baru.
        </p>

        <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 p-3 border border-gray-100 dark:border-gray-700/60">
          {failed ? (
            <p className="py-12 text-xs text-red-600 dark:text-red-400">
              Gambar QRIS gagal dimuat. Periksa koneksi internet Anda.
            </p>
          ) : (
            <div className="relative flex min-h-[260px] items-center justify-center">
              {!loaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  Memuat QRIS...
                </div>
              )}
              <img
                src={QRIS_IMAGE_URL}
                alt="Kode QRIS HK Hub Station"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className={`mx-auto max-h-[60vh] w-full rounded-xl object-contain ${loaded ? '' : 'opacity-0'}`}
              />
            </div>
          )}
        </div>

        <p className="mt-4 text-xs font-medium text-gray-700 dark:text-gray-300">
          Mendukung <span className="font-bold">Semua Bank (BCA, Mandiri, BRI, BNI) & E-Wallet (GoPay, OVO, DANA, ShopeePay)</span>
        </p>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Terima kasih banyak atas apresiasi Anda!
        </p>
      </div>
    </div>
  );
}
