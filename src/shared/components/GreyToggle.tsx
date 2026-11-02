import { useEffect, useRef, useState } from 'react';
import BgToggle from './BgToggle';
import type { ToastType } from './Feedback';
import { toGreyscale } from '../lib/greyscale';

// Toggle geser "Greyscale" di sebelah "Hapus BG": mengubah gambar berwarna (data URL / link) jadi hitam-putih.
// Gambar berwarna disimpan di ref, jadi toggle dimatikan = warna kembali. Gambar diganti dari luar
// (upload baru, hapus, galeri) = toggle otomatis mati.
export default function GreyToggle({ value, onChange, notify }: {
  value: string;
  onChange: (v: string) => void;
  notify: (type: ToastType, message: string) => void;
}) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const orig = useRef('');
  const own = useRef('');
  useEffect(() => { if (on && value !== own.current) setOn(false); }, [value, on]);
  const toggle = async (v: boolean) => {
    if (!v) { onChange(orig.current); setOn(false); return; }
    if (!value || busy) return;
    setBusy(true);
    try {
      orig.current = value;
      own.current = await toGreyscale(value);
      onChange(own.current);
      setOn(true);
    } catch {
      notify('error', 'Greyscale gagal: gambar tidak bisa dibaca.');
    }
    setBusy(false);
  };
  return <BgToggle checked={on} onChange={toggle} busy={busy} disabled={!value} label="Greyscale" aria="Ubah gambar jadi hitam putih" />;
}
