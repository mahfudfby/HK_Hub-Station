import { useEffect, useState } from 'react';
import { Share2, X } from 'lucide-react';
import { SHARE_EVENT } from '../lib/saveFile';
import { Spinner } from './Feedback';

// Muncul setelah saveFile(): tombol Share untuk "Simpan ke Foto" / "Simpan ke Files" / kirim ke aplikasi lain.
export default function ShareSheet() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'' | 'sharing' | 'error'>('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onFile = (e: Event) => {
      setFile((e as CustomEvent<File>).detail);
      setStatus('');
    };
    window.addEventListener(SHARE_EVENT, onFile);
    return () => window.removeEventListener(SHARE_EVENT, onFile);
  }, []);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFile(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [file]);

  if (!file) return null;

  const share = async () => {
    setStatus('sharing');
    try {
      await navigator.share({ files: [file], title: file.name });
      setFile(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return setStatus(''); // user menutup lembar share
      setError(err?.message || 'Share gagal.');
      setStatus('error');
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Simpan atau bagikan file"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center font-sans print:hidden"
      onClick={() => setFile(null)}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 text-center text-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setFile(null)} aria-label="Tutup"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
          <X size={18} aria-hidden="true" />
        </button>
        <h2 className="pr-8 text-lg font-bold">File siap</h2>
        <p className="mt-1 break-all text-sm text-slate-600">{file.name}</p>
        <p className="mt-3 text-sm text-slate-600">
          Ketuk <strong>Bagikan / Simpan</strong>, lalu pilih <strong>Simpan Gambar</strong> (Foto/Galeri), <strong>Simpan ke File</strong>, atau aplikasi lain.
        </p>
        {status === 'error' && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <button onClick={share} disabled={status === 'sharing'}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-60">
          {status === 'sharing' ? <Spinner /> : <Share2 size={18} aria-hidden="true" />} Bagikan / Simpan
        </button>
        <button onClick={() => setFile(null)} className="mt-2 w-full rounded-xl py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          Tutup
        </button>
      </div>
    </div>
  );
}
