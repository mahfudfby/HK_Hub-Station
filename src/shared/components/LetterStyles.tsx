import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Field, LETTER_FONT, inputCls } from './LetterKit';
import { cssFamily, useGoogleFonts, type WebFont } from '../lib/fonts';

// 20 gaya surat dokter (Surat Keterangan Dokter & Sehat): font, kop, garis kop, judul, baris data, tanda tangan.
// 'klasik' = tampilan asli (harus tetap sama persis). Semua CSS aman untuk html2canvas (warna polos, border, flex/grid).

export type Gaya = {
  id: string;
  name: string;
  desc: string;
  font: string; // font-family isi surat
  size: number; // ukuran huruf isi (px)
  web?: WebFont; // Google Font isi (tegak + miring 400 dimuat)
  head?: string; // font-family nama kop & judul (bila beda)
  headWeb?: WebFont;
  kop: 'center' | 'left' | 'boxed';
  spaced: boolean; // nama kop berjarak
  rule: 'double' | 'thinThick' | 'thick' | 'thin2' | 'short' | 'none';
  title: 'underline' | 'spaced' | 'boxed' | 'lines' | 'bar' | 'plain';
  rowGap: number;
  labelExtra: number; // tambahan lebar label baris data (px)
  sign: 'underline' | 'overline' | 'plain';
  accent: string; // warna garis, judul, nama kop
};

const BASE = {
  size: 13, kop: 'center', spaced: false, rule: 'double', title: 'underline', rowGap: 2, labelExtra: 0, sign: 'underline', accent: '#000',
} as const;

const TINOS = 'Tinos, "Times New Roman", serif';
const CARLITO = 'Carlito, Calibri, Arimo, sans-serif';
const COUSINE = 'Cousine, "Courier New", monospace';
const NAVY = '#1e3a5f';
const GREEN = '#14532d';
const MAROON = '#6b1d1d';
const gf = (family: string, fallback = 'serif') => ({ font: cssFamily(family, fallback), web: { family } });

export const LETTER_STYLES: Gaya[] = ([
  { id: 'klasik', name: 'Klasik', desc: 'Helvetica, garis ganda', font: LETTER_FONT },
  { id: 'times', name: 'Resmi Times', desc: 'Times, kop tengah', font: TINOS, size: 13.5 },
  { id: 'kantor', name: 'Kantor', desc: 'Calibri, kop rata kiri', font: CARLITO, size: 13.5, kop: 'left', rule: 'thick', title: 'spaced', sign: 'overline', accent: NAVY },
  { id: 'bingkai', name: 'Bingkai', desc: 'Kop & judul berbingkai', font: LETTER_FONT, kop: 'boxed', rule: 'none', title: 'boxed' },
  { id: 'ketik', name: 'Mesin Ketik', desc: 'Huruf mesin ketik', font: COUSINE, size: 12, rule: 'thin2', sign: 'plain' },
  { id: 'merriweather', name: 'Merriweather', desc: 'Serif tegas, biru tua', ...gf('Merriweather'), size: 12, title: 'lines', accent: NAVY },
  { id: 'lora', name: 'Lora', desc: 'Serif elegan, marun', ...gf('Lora'), rule: 'short', title: 'spaced', sign: 'overline', accent: MAROON },
  { id: 'baskerville', name: 'Baskerville', desc: 'Serif klasik lapang', ...gf('Libre Baskerville'), size: 12, rowGap: 3 },
  { id: 'garamond', name: 'Garamond', desc: 'Nama kop berjarak', ...gf('EB Garamond'), size: 14, spaced: true, rule: 'thinThick', title: 'bar' },
  { id: 'crimson', name: 'Crimson', desc: 'Serif buku, kop kiri', ...gf('Crimson Pro'), size: 14, kop: 'left', rule: 'thick', title: 'plain', labelExtra: 10 },
  { id: 'source-serif', name: 'Source Serif', desc: 'Hijau tua, judul kotak', ...gf('Source Serif 4'), rule: 'thin2', title: 'boxed', accent: GREEN },
  { id: 'pt-serif', name: 'PT Serif', desc: 'Kop berbingkai biru', ...gf('PT Serif'), size: 12.5, kop: 'boxed', rule: 'none', accent: NAVY },
  { id: 'noto-serif', name: 'Noto Serif', desc: 'Judul bergaris samping', ...gf('Noto Serif'), size: 12, rule: 'thinThick', title: 'lines' },
  { id: 'playfair', name: 'Playfair', desc: 'Judul Playfair, isi Lato', ...gf('Lato', 'sans-serif'), size: 12.5, head: cssFamily('Playfair Display', 'serif'), headWeb: { family: 'Playfair Display' }, rule: 'short', title: 'spaced', sign: 'overline' },
  { id: 'source-sans', name: 'Source Sans', desc: 'Sans rapi, kop kiri', ...gf('Source Sans 3', 'sans-serif'), size: 13.5, kop: 'left', rule: 'thick', title: 'bar', accent: NAVY },
  { id: 'open-sans', name: 'Open Sans', desc: 'Sans lebar, judul kotak', ...gf('Open Sans', 'sans-serif'), size: 12, title: 'boxed' },
  { id: 'plex-serif', name: 'Plex Serif', desc: 'Nama berjarak, hijau', ...gf('IBM Plex Serif'), size: 12.5, spaced: true, rule: 'thin2', accent: GREEN },
  { id: 'plex-sans', name: 'Plex Sans', desc: 'Teknis, kop kiri', ...gf('IBM Plex Sans', 'sans-serif'), size: 12.5, kop: 'left', rule: 'thick', title: 'lines' },
  { id: 'roboto', name: 'Roboto', desc: 'Modern, kop berbingkai', ...gf('Roboto', 'sans-serif'), size: 12.5, kop: 'boxed', rule: 'none', title: 'spaced', sign: 'plain' },
  { id: 'nunito', name: 'Nunito Sans', desc: 'Lembut, marun', ...gf('Nunito Sans', 'sans-serif'), rule: 'short', accent: MAROON, rowGap: 3, labelExtra: 10 },
] as Partial<Gaya>[]).map((s) => ({ ...BASE, ...s }) as Gaya);

console.assert(LETTER_STYLES.length === 20 && new Set(LETTER_STYLES.map((s) => s.id)).size === 20, 'LETTER_STYLES: 20 id unik');

export const getGaya = (id?: string) => LETTER_STYLES.find((s) => s.id === id) ?? LETTER_STYLES[0];

// Font template + versi miring (isian data ditulis miring); ekspor menunggu keduanya lewat fontsReady
export function useLetterFonts(g: Gaya) {
  useGoogleFonts([g.web && { ...g.web, italic: [400] }, g.headWeb]);
}

// ---------------- Potongan surat ----------------
// Kop: logo opsional (kiri), nama/instansi + baris kecil (children). k = skala ukuran teks (slider).
export function Kop({ g, name, nameStyle, logo, logoH = 58, k = 1, logoOffset = { x: 0, y: 0 }, children }: {
  g: Gaya; name: ReactNode; nameStyle: CSSProperties; logo?: string; logoH?: number; k?: number; logoOffset?: { x: number; y: number; s?: number; a?: number }; children?: ReactNode;
}) {
  const left = g.kop === 'left';
  const boxed = g.kop === 'boxed';
  const nameCss: CSSProperties = {
    ...nameStyle,
    fontFamily: g.head,
    color: g.accent === '#000' ? undefined : g.accent,
    ...(g.spaced && { letterSpacing: 3 * k, fontSize: Number(nameStyle.fontSize) - 4 * k }),
  };
  return (
    <div style={{ position: 'relative', textAlign: left ? 'left' : 'center', minHeight: logo ? logoH : undefined, ...(boxed && { border: `1.5px solid ${g.accent}`, padding: '8px 10px' }) }}>
      {logo && <img src={logo} alt="Logo" style={{ position: 'absolute', left: (boxed ? 10 : 0) + logoOffset.x, top: (boxed ? 8 : 0) + logoOffset.y, height: logoH * (logoOffset.s ?? 100) / 100, maxWidth: 70 * (logoOffset.s ?? 100) / 100, opacity: (logoOffset.a ?? 100) / 100, objectFit: 'contain' }} />}
      <div style={{ padding: logo ? (left ? '0 0 0 72px' : '0 72px') : 0 }}>
        <div style={nameCss}>{name}</div>
        {children}
      </div>
    </div>
  );
}

// Satu baris kop yang tidak boleh pindah baris: huruf dikecilkan seperlunya (maks. 30%) agar muat lebar
export function FitLine({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const text = typeof children === 'string' ? children : '';
  useLayoutEffect(() => setScale(1), [text, style?.fontSize]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || scale !== 1) return;
    if (el.scrollWidth > el.clientWidth + 1) setScale(Math.max(0.7, (el.clientWidth / el.scrollWidth) * 0.99));
  });
  const fs = typeof style?.fontSize === 'number' ? style.fontSize * scale : undefined;
  return <div ref={ref} style={{ ...style, ...(fs ? { fontSize: fs } : {}), whiteSpace: 'nowrap', overflow: 'hidden' }}>{children}</div>;
}

// Garis ganda: garis tebal + garis tipis bertumpuk dengan celah tipis (blok warna, tajam di html2canvas)
const DoubleRule = ({ c, m, thinFirst = false }: { c: string; m: string; thinFirst?: boolean }) => {
  const thick = <div style={{ height: 3, background: c }} />;
  const thin = <div style={{ height: 1, background: c }} />;
  return (
    <div style={{ margin: m }}>
      {thinFirst ? thin : thick}
      <div style={{ height: 2 }} />
      {thinFirst ? thick : thin}
    </div>
  );
};

// Garis pemisah kop; mb = jarak ke isi
export function Rule({ g, mb }: { g: Gaya; mb: number }) {
  const c = g.accent;
  const m = `6px 0 ${mb}px`;
  switch (g.rule) {
    case 'thinThick': return <DoubleRule c={c} m={m} thinFirst />;
    case 'thick': return <div style={{ borderTop: `2px solid ${c}`, margin: m }} />;
    case 'thin2': return <div style={{ borderTop: `1px solid ${c}`, borderBottom: `1px solid ${c}`, height: 2, margin: m }} />;
    case 'short': return <div style={{ width: '30%', borderTop: `2px solid ${c}`, margin: `8px auto ${mb}px` }} />;
    case 'none': return <div style={{ height: mb }} />;
    default: return <DoubleRule c={c} m={m} />;
  }
}

// Judul surat (dibungkus div rata tengah oleh halaman)
export function Title({ g, k = 1, children }: { g: Gaya; k?: number; children: ReactNode }) {
  const base: CSSProperties = { fontWeight: 700, fontSize: 14 * k, letterSpacing: 1, color: g.accent, fontFamily: g.head };
  const line = `1px solid ${g.accent}`;
  switch (g.title) {
    case 'spaced': return <div style={{ ...base, letterSpacing: 4 }}>{children}</div>;
    case 'boxed': return <div><span style={{ ...base, display: 'inline-block', border: `1.5px solid ${g.accent}`, padding: '3px 14px 5px' }}>{children}</span></div>;
    case 'lines':
      return (
        <div style={{ ...base, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, borderTop: line }} />{children}<span style={{ flex: 1, borderTop: line }} />
        </div>
      );
    case 'bar': return <div style={{ ...base, letterSpacing: 2, borderTop: line, borderBottom: line, padding: '3px 0 5px' }}>{children}</div>;
    case 'plain': return <div style={{ ...base, fontSize: 16 * k, letterSpacing: 0.5 }}>{children}</div>;
    default: return <div style={{ ...base }}><Underlined color={g.accent}>{children}</Underlined></div>;
  }
}

// Garis bawah berjarak dari huruf (g/j/p/y tidak menempel). Bukan text-decoration: html2canvas
// menggambarnya terputus di sela huruf renggang dan terlalu rapat ke teks.
function Underlined({ color = '#000', children }: { color?: string; children: ReactNode }) {
  return <span style={{ display: 'inline-block', borderBottom: `1.5px solid ${color}`, paddingBottom: '0.12em', lineHeight: 1.15 }}>{children}</span>;
}

// Nama dokter di bawah tanda tangan
export function SignName({ g, k = 1, children }: { g: Gaya; k?: number; children: ReactNode }) {
  if (g.sign === 'overline') {
    return <div><span style={{ display: 'inline-block', minWidth: 150 * k, textAlign: 'center', borderTop: '1px solid #000', paddingTop: 2, fontWeight: 700 }}>{children}</span></div>;
  }
  return <div style={{ fontWeight: 700 }}>{g.sign === 'plain' ? children : <Underlined>{children}</Underlined>}</div>;
}

// ---------------- Pemilih gaya (form) ----------------
export function StylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Template surat">
      <select className={inputCls} value={getGaya(value).id} onChange={(e) => onChange(e.target.value)}>
        {LETTER_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </Field>
  );
}
