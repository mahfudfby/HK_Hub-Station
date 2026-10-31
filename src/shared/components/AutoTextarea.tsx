import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

// Kolom teks yang menghormati Enter (baris baru) dan tingginya ikut isi,
// sehingga kartu form memanjang ke bawah. Pengganti <input> teks di semua menu.
export default function AutoTextarea({ rows = 1, className = '', style, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; // + tebal border
    };
    fit();
    // Lebar kolom berubah (rotasi layar, panel) -> jumlah baris ikut berubah. Perubahan tinggi diabaikan (hindari loop).
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return;
      w = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rest.value]);

  return <textarea ref={ref} rows={rows} className={`${className} resize-none overflow-hidden`} style={style} {...rest} />;
}
