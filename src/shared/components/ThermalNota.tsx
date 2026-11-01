import UserData from './UserData';
import NumberFormatInput from './NumberFormatInput';
import AutoTextarea from './AutoTextarea';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from './FitPreview';
import { CanvasPanel, ModeTabs, useCanvasMode } from './CanvasMode';
import SharedGallery from './SharedGallery';
import { Toast, type ToastState } from './Feedback';
import { ExportButton, Field, ImageUpload, inputCls, mmToPx, orient, paperOf, PaperPicker, useLetterExport, type Notify } from './LetterKit';
import { useBgRemoved } from '../lib/removeBg';
import { num, rupiah } from '../lib/money';
import { orRandomNo, randomDocNo } from '../lib/docNumber';
import { cssFamily, useGoogleFonts, type WebFont } from '../lib/fonts';
import { TextSizeSlider, useFitScale } from './TextScale';

// Nota pembelian untuk printer thermal 58mm / 80mm.
// Lebar nota × skala 2 = lebar titik cetak printer: 58mm → 192px → PNG 384px (±32 karakter/baris),
// 80mm → 288px → PNG 576px (±42 karakter/baris). Cocok untuk RawBT dll.
export type ThermalWidth = 58 | 80;
// pad = [atas, kiri/kanan, bawah] dalam px
export const THERMAL: Record<ThermalWidth, { px: number; font: number; logoW: number; pad: [number, number, number] }> = {
  58: { px: 192, font: 10, logoW: 120, pad: [8, 6, 14] },
  80: { px: 288, font: 13, logoW: 200, pad: [14, 16, 20] }, // 80mm: huruf lebih besar + margin putih lebih lega
};

// Tata letak nota per kertas. Thermal gulung 58/80 = persis THERMAL (lebar titik printer, RawBT).
// Kertas lain: lebar = ukuran kertas @96 DPI, huruf/margin menurut sisi terpendek; h = tinggi halaman tetap (undefined = ikut isi).
type Layout = { px: number; h?: number; font: number; logoW: number; pad: [number, number, number]; roll: boolean; paper: { w: number; h: number } };
export function notaLayout(paperId: string, landscape: boolean, mm: ThermalWidth): Layout {
  const def = paperOf(paperId, `T${mm}`);
  const paper = orient(def, landscape);
  if (def.roll && (def.w === 58 || def.w === 80)) return { ...THERMAL[def.w as ThermalWidth], roll: true, paper };
  const px = mmToPx(paper.w);
  const min = Math.min(paper.w, paper.h);
  const size = min < 100 ? { font: 13, logoW: 200, pad: [14, 16, 20] as [number, number, number] }
    : min < 160 ? { font: 14, logoW: 220, pad: [30, 40, 30] as [number, number, number] }
      : { font: 15, logoW: 260, pad: [45, 60, 45] as [number, number, number] };
  return { px, h: def.roll ? undefined : mmToPx(paper.h), ...size, roll: !!def.roll, paper };
}
console.assert(notaLayout('T58', false, 58).px === 192 && notaLayout('T80', false, 58).px === 288 && notaLayout('A4', true, 80).px === mmToPx(297) && notaLayout('xx', false, 80).px === 288, 'notaLayout');

type Item = { nama: string; qty: string; harga: string };
type Nota = {
  toko: string;
  alamat: string;
  telp: string;
  logo: string;
  nomor: string;
  waktu: string; // datetime-local
  kasir: string;
  pelanggan: string;
  items: Item[];
  pajak: string; // persen
  biayaLabel: string;
  biaya: string; // Rp
  diskonMode: '%' | 'Rp';
  diskon: string;
  metode: 'Tunai' | 'Non-Tunai';
  nonTunai: string; // QRIS, Transfer Bank, dll.
  bayar: string;
  footer: string;
  template: string; // id di TEMPLATES
  skala: number; // ukuran teks nota (%)
  paper: string; // id di PAPERS; bawaan T58/T80 sesuai menu
  landscape: boolean;
};

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const NO_FMT = 'TRX-{yy}{mm}{dd}-{n4}'; // nomor nota acak sesuai pola, tidak pernah kosong
const DEFAULT: Nota = {
  toko: 'TOKO ANDA',
  alamat: 'Jl. Contoh No. 1, Kota',
  telp: '0812-0000-0000',
  logo: '',
  nomor: randomDocNo(NO_FMT), // diganti nomor baru saat editor dibuka
  waktu: nowLocal(),
  kasir: 'Kasir 1',
  pelanggan: '',
  items: [
    { nama: 'Kopi Susu', qty: '2', harga: '18000' },
    { nama: 'Roti Bakar Coklat', qty: '1', harga: '22000' },
  ],
  pajak: '',
  biayaLabel: 'Kemasan (Take Away)',
  biaya: '',
  diskonMode: '%',
  diskon: '',
  metode: 'Tunai',
  nonTunai: 'QRIS',
  bayar: '100000',
  footer: 'Terima kasih atas kunjungan Anda\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan',
  template: 'klasik',
  skala: 100,
  paper: 'T58', // diganti T80 di menu 80mm
  landscape: false,
};

// total = jumlah harga produk; pajak % dari total; diskon % dari total atau nominal; bayarTotal = akhir
function calc(n: Nota) {
  const lines = n.items.map((it) => num(it.qty) * num(it.harga));
  const total = lines.reduce((a, b) => a + b, 0);
  const pajak = Math.round((total * num(n.pajak)) / 100);
  const biaya = num(n.biaya);
  const diskon = Math.min(total, n.diskonMode === '%' ? Math.round((total * num(n.diskon)) / 100) : num(n.diskon));
  const bayarTotal = total + pajak + biaya - diskon;
  const bayar = num(n.bayar);
  return { lines, total, pajak, biaya, diskon, bayarTotal, bayar, kembali: bayar - bayarTotal };
}
{
  // 58000; pajak 10% = 5800; kemasan 2000; diskon 5% = 2900; akhir 62900; kembali 37100
  const c = calc({ ...DEFAULT, pajak: '10', biaya: '2000', diskonMode: '%', diskon: '5' });
  console.assert(c.total === 58000 && c.pajak === 5800 && c.diskon === 2900 && c.bayarTotal === 62900 && c.kembali === 37100, 'Nota58 calc %');
  const d = calc({ ...DEFAULT, diskonMode: 'Rp', diskon: '8000' });
  console.assert(d.bayarTotal === 50000, 'Nota58 calc Rp');
}

const fmtWaktu = (v: string) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ---------------- Tampilan nota ----------------
// Template: isi nota sama, tata letak tiap bagian (kepala, info transaksi, barang, total, bayar, kaki) berbeda.
// Thermal hanya mencetak hitam: pakai #000/#fff/abu saja; CSS aman html2canvas (tanpa gradient/transform/shadow).
type Sep = 'dash' | 'eq' | 'dot' | 'solid' | 'double' | 'star' | 'thick' | 'space';
type Tpl = {
  id: string;
  name: string;
  desc: string;
  font: string; // CSS font-family isi nota
  web?: WebFont; // Google Font untuk isi
  headFont?: string; // font khusus nama toko
  headWeb?: WebFont;
  size?: number; // koreksi ukuran font (±px)
  lh?: number; // tinggi baris
  upper?: boolean; // seluruh nota huruf kapital
  head: 'center' | 'left' | 'logoLeft' | 'split' | 'invert' | 'box' | 'double' | 'spaced' | 'huge';
  sep: Sep;
  meta: 'table' | 'colon' | 'center' | 'pair' | 'box';
  metaBottom?: boolean; // info No/Tgl di bawah, bukan di atas
  items: 'two' | 'one' | 'cols' | 'num' | 'dots' | 'block';
  box?: boolean; // daftar barang dalam kotak
  nameBold?: boolean;
  sumRight?: boolean; // rincian total rata kanan (kolom sempit)
  total: 'plain' | 'invert' | 'box' | 'big' | 'double' | 'center';
  pay: 'rows' | 'cols' | 'box';
  foot: 'plain' | 'box' | 'sep' | 'invert' | 'code' | 'left';
};
const COUSINE = 'Cousine, "Courier New", monospace';
const ARIMO = 'Arimo, Arial, sans-serif';
const CARLITO = 'Carlito, Calibri, sans-serif';
const TINOS = 'Tinos, "Times New Roman", serif';
const mono = (family: string, weights?: number[]) => ({ font: cssFamily(family, 'monospace'), web: { family, weights } });
const ONLY400 = [400];

export const TEMPLATES: Tpl[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Mono, tengah, garis putus, barang 2 baris', font: COUSINE, head: 'center', sep: 'dash', meta: 'table', items: 'two', total: 'plain', pay: 'rows', foot: 'plain' },
  { id: 'minimarket', name: 'Struk Minimarket', desc: 'Kepala blok hitam, barang 1 baris, bar TOTAL, barcode', font: ARIMO, head: 'invert', sep: 'dash', meta: 'pair', items: 'one', sumRight: true, total: 'invert', pay: 'cols', foot: 'code' },
  { id: 'kafe', name: 'Kafe', desc: 'Renggang, tanpa garis, titik penuntun, total tengah', ...mono('Space Mono'), head: 'spaced', sep: 'space', meta: 'center', metaBottom: true, items: 'dots', total: 'center', pay: 'rows', foot: 'box' },
  { id: 'restoran', name: 'Restoran', desc: 'Serif, garis ganda, tabel Qty|Item|Total', font: TINOS, head: 'double', sep: 'double', meta: 'table', items: 'cols', nameBold: true, sumRight: true, total: 'double', pay: 'rows', foot: 'sep' },
  { id: 'modern', name: 'Modern', desc: 'Nama kiri + telp kanan, total besar, info di bawah', ...mono('IBM Plex Mono'), head: 'split', sep: 'solid', meta: 'colon', metaBottom: true, items: 'two', sumRight: true, total: 'big', pay: 'cols', foot: 'left' },
  { id: 'retro', name: 'Retro', desc: 'Kapital, bintang ****, barang bernomor, kotak', ...mono('Courier Prime'), upper: true, head: 'box', sep: 'star', meta: 'colon', items: 'num', total: 'box', pay: 'rows', foot: 'box' },
  { id: 'teknik', name: 'Teknik', desc: 'Rata kiri, tabel dalam kotak, bar TOTAL', ...mono('JetBrains Mono'), head: 'left', sep: 'dot', meta: 'box', items: 'cols', box: true, total: 'invert', pay: 'box', foot: 'plain' },
  { id: 'ringkas', name: 'Ringkas', desc: 'Rapat, kecil, tanpa garis, barang 1 baris', ...mono('Roboto Mono'), size: -1, lh: 1.2, head: 'center', sep: 'space', meta: 'pair', items: 'one', total: 'plain', pay: 'rows', foot: 'plain' },
  { id: 'butik', name: 'Butik', desc: 'Sans renggang, titik penuntun, bayar 2 kolom', font: CARLITO, size: 1, head: 'spaced', sep: 'dot', meta: 'center', items: 'dots', nameBold: true, sumRight: true, total: 'center', pay: 'cols', foot: 'sep' },
  { id: 'grosir', name: 'Toko Bangunan', desc: 'Huruf besar, nama raksasa, tabel kotak', font: ARIMO, size: 2, headFont: cssFamily('Oswald'), headWeb: { family: 'Oswald', weights: [700] }, head: 'huge', sep: 'thick', meta: 'pair', items: 'cols', box: true, total: 'big', pay: 'box', foot: 'invert' },
  { id: 'apotek', name: 'Apotek', desc: 'Logo kiri, barang blok Qty/Harga/Jml, info bawah', ...mono('Source Code Pro'), head: 'logoLeft', sep: 'dash', meta: 'table', metaBottom: true, items: 'block', sumRight: true, total: 'double', pay: 'rows', foot: 'box' },
  { id: 'bengkel', name: 'Bengkel', desc: 'Kapital, rata kiri, garis ====, bernomor', ...mono('Share Tech Mono', ONLY400), size: 1, upper: true, head: 'left', sep: 'eq', meta: 'colon', metaBottom: true, items: 'num', total: 'invert', pay: 'cols', foot: 'sep' },
  { id: 'warung', name: 'Warung', desc: 'Nama raksasa, bintang, bernomor, total tengah', ...mono('Ubuntu Mono'), size: 1, head: 'huge', sep: 'star', meta: 'center', metaBottom: true, items: 'num', nameBold: true, total: 'center', pay: 'rows', foot: 'plain' },
  { id: 'bakery', name: 'Bakery', desc: 'Condensed, garis bawah ganda, barang dalam kotak', font: cssFamily('Roboto Condensed'), web: { family: 'Roboto Condensed' }, size: 1, head: 'double', sep: 'dot', meta: 'center', items: 'one', box: true, sumRight: true, total: 'double', pay: 'cols', foot: 'box' },
  { id: 'pustaka', name: 'Pustaka', desc: 'Kepala kotak, barang blok, barcode', ...mono('PT Mono', ONLY400), head: 'box', sep: 'eq', meta: 'colon', items: 'block', total: 'plain', pay: 'box', foot: 'code' },
  { id: 'elektronik', name: 'Elektronik', desc: 'Logo kiri, tabel, bar TOTAL, kaki rata kiri', ...mono('Overpass Mono'), head: 'logoLeft', sep: 'double', meta: 'table', items: 'cols', sumRight: true, total: 'invert', pay: 'cols', foot: 'left' },
  { id: 'fashion', name: 'Fashion', desc: 'Kapital renggang, garis tebal, info di bawah', ...mono('Fira Mono'), upper: true, head: 'spaced', sep: 'thick', meta: 'pair', metaBottom: true, items: 'one', total: 'box', pay: 'rows', foot: 'plain' },
  { id: 'laundry', name: 'Laundry', desc: 'Kepala hitam, bernomor dalam kotak', ...mono('Inconsolata'), size: 1, head: 'invert', sep: 'dot', meta: 'colon', items: 'num', box: true, total: 'double', pay: 'box', foot: 'box' },
  { id: 'pasar', name: 'Pasar', desc: 'Nama kiri + telp kanan, titik penuntun, total besar', ...mono('Anonymous Pro'), head: 'split', sep: 'dash', meta: 'table', items: 'dots', nameBold: true, total: 'big', pay: 'rows', foot: 'sep' },
  { id: 'kontras', name: 'Kontras', desc: 'Serba blok hitam, info kotak, barang blok', font: ARIMO, headFont: cssFamily('Roboto Condensed'), headWeb: { family: 'Roboto Condensed', weights: [700] }, head: 'invert', sep: 'thick', meta: 'box', items: 'block', box: true, total: 'invert', pay: 'cols', foot: 'invert' },
];
console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20 && TEMPLATES[0].id === DEFAULT.template, 'ThermalNota templates');
// tiap template harus beda tata letak (bukan hanya font)
console.assert(new Set(TEMPLATES.map((t) => [t.head, t.sep, t.meta, !!t.metaBottom, t.items, !!t.box, t.total, t.pay, t.foot].join())).size === 20, 'ThermalNota layouts unique');
const tplOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

const SEP_BORDER: Partial<Record<Sep, string>> = { dash: '1px dashed #000', dot: '2px dotted #000', solid: '1px solid #000', double: '3px double #000', thick: '2px solid #000' };
const Line = ({ k }: { k: Sep }) =>
  k === 'space' ? <div style={{ height: 8 }} />
    : SEP_BORDER[k] ? <div style={{ borderTop: SEP_BORDER[k], margin: '4px 0' }} />
      : <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1, margin: '3px 0' }}>{(k === 'eq' ? '=' : '*').repeat(90)}</div>;
const Row = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontWeight: bold ? 700 : 400 }}>
    <span style={{ minWidth: 0 }}>{l}</span>
    <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{r}</span>
  </div>
);
const BAR: Record<string, CSSProperties> = {
  invert: { background: '#000', color: '#fff', padding: '2px 4px' },
  box: { border: '2px solid #000', padding: '2px 4px' },
  double: { borderTop: '3px double #000', borderBottom: '3px double #000', padding: '2px 0' },
};
// Barcode hiasan dari nomor nota (bukan kode standar): batang hitam/putih selang-seling, lebar 1–3 dari bit karakter
const Barcode = ({ v, h }: { v: string; h: number }) => {
  const w = [2, 1, 2, ...Array.from(v).flatMap((ch) => [0, 1, 2, 3].map((b) => (((ch.charCodeAt(0) >> b) & 1) ? 3 : 1))), 2, 1, 2];
  return (
    <div style={{ display: 'flex', height: h, width: '80%', margin: '4px auto 1px' }}>
      {w.map((x, i) => <div key={i} style={{ flex: x, background: i % 2 ? '#fff' : '#000' }} />)}
    </div>
  );
};

function Receipt({ n, T, k }: { n: Nota; T: Layout; k: number }) {
  const c = calc(n);
  const t = tplOf(n.template);
  const base = T.font + (t.size ?? 0);
  const fs = (d: number) => (base + d) * k; // lebar nota tetap, hanya huruf yang ikut skala
  const logoW = Math.min(T.logoW * k, T.px - 2 * T.pad[1]); // logo tidak boleh lebih lebar dari area isi
  const line = <Line k={t.sep} />;
  const logo = (st: CSSProperties) => n.logo ? <img src={n.logo} alt="Logo" style={{ objectFit: 'contain', maxHeight: logoW * 0.4, maxWidth: logoW, ...st }} /> : null;
  const big = t.head === 'huge';
  const name = (
    <div style={{
      fontWeight: 700, fontFamily: t.headFont, fontSize: fs(big ? 9 : t.head === 'split' ? 3 : 2), lineHeight: big ? 1.05 : 1.2,
      ...(t.head === 'spaced' || big ? { letterSpacing: big ? 1 : 2, textTransform: 'uppercase' } : {}),
      ...(t.head === 'double' ? { display: 'inline-block', borderBottom: '3px double #000', paddingBottom: 1, marginBottom: 3 } : {}),
    }}>{n.toko}</div>
  );
  const info = (
    <>
      {n.alamat && <div style={{ whiteSpace: 'pre-line' }}>{n.alamat}</div>}
      {n.telp && <div>Telp. {n.telp}</div>}
    </>
  );
  const header =
    t.head === 'logoLeft' ? (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {logo({ flexShrink: 0, maxWidth: logoW * 0.35 })}
        <div style={{ minWidth: 0 }}>{name}{info}</div>
      </div>
    ) : t.head === 'split' ? (
      <div>
        {logo({ display: 'block', maxWidth: logoW * 0.5, marginBottom: 2 })}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ minWidth: 0 }}>{name}</div>
          {n.telp && <div style={{ fontSize: fs(-1), whiteSpace: 'nowrap', fontWeight: 700 }}>{n.telp}</div>}
        </div>
        {n.alamat && <div style={{ whiteSpace: 'pre-line', fontSize: fs(-1), borderTop: '1px solid #000', marginTop: 2, paddingTop: 1 }}>{n.alamat}</div>}
      </div>
    ) : t.head === 'left' ? (
      <div>{logo({ display: 'block', marginBottom: 4 })}{name}{info}</div>
    ) : (
      <div style={{ textAlign: 'center' }}>
        {logo({ display: 'block', margin: '0 auto 4px' })}
        <div style={t.head === 'invert' ? { ...BAR.invert, padding: '5px 4px' } : t.head === 'box' ? { ...BAR.box, padding: '4px' } : undefined}>{name}{info}</div>
      </div>
    );

  const metaRows: [string, string][] = [['No', n.nomor], ['Tgl', fmtWaktu(n.waktu)]];
  if (n.kasir) metaRows.push(['Kasir', n.kasir]);
  if (n.pelanggan) metaRows.push(['Plg', n.pelanggan]);
  const meta =
    t.meta === 'pair' ? (
      <>
        <Row l={n.nomor} r={fmtWaktu(n.waktu)} />
        {(n.kasir || n.pelanggan) && <Row l={n.kasir} r={n.pelanggan} />}
      </>
    ) : t.meta === 'center' ? (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700 }}>No. {n.nomor}</div>
        <div>{fmtWaktu(n.waktu)}{n.kasir && ` • ${n.kasir}`}</div>
        {n.pelanggan && <div>Pelanggan: {n.pelanggan}</div>}
      </div>
    ) : t.meta === 'colon' ? (
      metaRows.map(([l, r]) => <div key={l} style={{ display: 'flex' }}><span style={{ width: '5.5ch', flexShrink: 0 }}>{l}</span><span>: {r}</span></div>)
    ) : (
      <div style={t.meta === 'box' ? { border: '1px solid #000', padding: '2px 4px', margin: '2px 0' } : undefined}>
        {metaRows.map(([l, r]) => <Row key={l} l={l} r={r} />)}
      </div>
    );

  const nb: CSSProperties = { fontWeight: t.nameBold ? 700 : 400 };
  const small: CSSProperties = { fontSize: fs(-1), color: '#333' };
  const items = (
    <div style={t.box ? { border: '1px solid #000', padding: '3px 4px' } : undefined}>
      {t.items === 'cols' && (
        <div style={{ display: 'flex', gap: 4, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 1, marginBottom: 2 }}>
          <span style={{ width: '3.5ch', flexShrink: 0 }}>Qty</span><span style={{ flex: 1 }}>Item</span><span>Total</span>
        </div>
      )}
      {n.items.map((it, i) => {
        const harga = rupiah(num(it.harga));
        const jml = rupiah(c.lines[i]);
        return (
          <div key={i} style={{ marginBottom: t.items === 'block' ? 4 : 2 }}>
            {t.items === 'one' ? <Row l={`${it.qty}x ${it.nama}`} r={jml} />
              : t.items === 'cols' ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ width: '3.5ch', flexShrink: 0 }}>{it.qty}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={nb}>{it.nama}</span><div style={small}>@ {harga}</div></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{jml}</span>
                </div>
              ) : t.items === 'num' ? (
                <>
                  <div style={nb}>{i + 1}. {it.nama}</div>
                  <div style={{ textAlign: 'right' }}>{it.qty} x {harga} = {jml}</div>
                </>
              ) : t.items === 'dots' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                    <span style={{ ...nb, minWidth: 0 }}>{it.nama}</span>
                    <span style={{ flex: 1, minWidth: 8, borderBottom: '2px dotted #000', marginBottom: '0.3em' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>{jml}</span>
                  </div>
                  <div style={small}>{it.qty} x {harga}</div>
                </>
              ) : t.items === 'block' ? (
                <>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{it.nama}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: 2 }}>
                    {([['Qty', it.qty], ['Harga', harga], ['Jumlah', jml]] as const).map(([l, v], j) => (
                      <div key={l} style={{ textAlign: j ? 'right' : 'left' }}><div style={small}>{l}</div><div style={{ fontWeight: j === 2 ? 700 : 400 }}>{v}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={nb}>{it.nama}</div>
                  <Row l={`  ${it.qty} x ${harga}`} r={jml} />
                </>
              )}
          </div>
        );
      })}
    </div>
  );

  const sums = (
    <div style={t.sumRight ? { marginLeft: '30%' } : undefined}>
      <Row l="TOTAL" r={rupiah(c.total)} bold />
      {c.pajak > 0 && <Row l={`Pajak ${n.pajak}%`} r={rupiah(c.pajak)} />}
      {c.biaya > 0 && <Row l={n.biayaLabel || 'Biaya lain'} r={rupiah(c.biaya)} />}
      {c.diskon > 0 && <Row l={n.diskonMode === '%' ? `Diskon ${n.diskon}%` : 'Diskon'} r={`-${rupiah(c.diskon)}`} />}
    </div>
  );

  const grand = rupiah(c.bayarTotal);
  const total =
    t.total === 'big' ? (
      <div style={{ fontWeight: 700 }}>
        <div>TOTAL PEMBAYARAN</div>
        <div style={{ fontSize: fs(7), lineHeight: 1.15, textAlign: 'right' }}>Rp {grand}</div>
      </div>
    ) : t.total === 'center' ? (
      <div style={{ textAlign: 'center', fontWeight: 700 }}>
        <div style={{ letterSpacing: 2 }}>TOTAL PEMBAYARAN</div>
        <div style={{ fontSize: fs(8), lineHeight: 1.15 }}>Rp {grand}</div>
      </div>
    ) : (
      <div style={{ fontSize: fs(2), ...BAR[t.total] }}><Row l="TOTAL PEMBAYARAN" r={grand} bold /></div>
    );

  const payRows: [string, string][] = n.metode === 'Tunai'
    ? [['Metode Bayar', 'Tunai'], ['Tunai', rupiah(c.bayar)], ['Kembali', rupiah(Math.max(0, c.kembali))]]
    : [['Metode Bayar', n.metode], [n.nonTunai || 'Non-Tunai', grand]];
  const pay = t.pay === 'cols' ? (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${payRows.length}, 1fr)`, textAlign: 'center' }}>
      {payRows.map(([l, r], i) => (
        <div key={l} style={{ borderLeft: i ? '1px solid #000' : undefined, padding: '0 2px', minWidth: 0 }}>
          <div style={small}>{i ? l : 'Metode'}</div><div style={{ fontWeight: 700 }}>{r}</div>
        </div>
      ))}
    </div>
  ) : (
    <div style={t.pay === 'box' ? { border: '1px solid #000', padding: '2px 4px' } : undefined}>
      {payRows.map(([l, r]) => <Row key={l} l={l} r={r} />)}
    </div>
  );

  const foot = n.footer && (
    t.foot === 'code' ? (
      <div style={{ textAlign: 'center' }}>
        <Barcode v={n.nomor} h={fs(16)} />
        <div style={{ letterSpacing: 2, marginBottom: 4 }}>{n.nomor}</div>
        <div style={{ whiteSpace: 'pre-line' }}>{n.footer}</div>
      </div>
    ) : (
      <div style={{
        whiteSpace: 'pre-line', textAlign: t.foot === 'left' ? 'left' : 'center',
        ...(t.foot === 'left' ? { fontSize: fs(-1) } : t.foot === 'box' ? { border: '1px solid #000', padding: 3 } : BAR[t.foot]),
      }}>{n.footer}</div>
    )
  );

  return (
    <div style={{ width: T.px, height: T.h, overflow: T.h ? 'hidden' : undefined, boxSizing: 'border-box', padding: `${T.pad[0]}px ${T.pad[1]}px ${T.pad[2]}px`, background: '#fff', color: '#000', fontFamily: t.font, fontSize: fs(0), lineHeight: t.lh ?? 1.35, wordBreak: 'break-word', textTransform: t.upper ? 'uppercase' : undefined }}>
      {header}
      {line}
      {!t.metaBottom && <>{meta}{line}</>}
      {items}
      {line}
      {sums}
      {line}
      {total}
      {line}
      {pay}
      {line}
      {t.metaBottom && <>{meta}{line}</>}
      {foot}
      {n.footer && t.foot === 'sep' && line}
    </div>
  );
}

// ---------------- Editor ----------------
export default function ThermalNota({ mm }: { mm: ThermalWidth }) {
  const STORAGE_KEY = `nota-${mm}mm:v1`;
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [n, setN] = useState<Nota>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const def = { ...DEFAULT, paper: `T${mm}`, nomor: randomDocNo(NO_FMT) };
      if (!saved) return def;
      if (!saved.diskonMode) saved.diskonMode = 'Rp'; // simpanan lama: diskon selalu nominal
      if (saved.metode && saved.metode !== 'Tunai' && saved.metode !== 'Non-Tunai') { // simpanan lama: QRIS/Debit/Transfer
        saved.nonTunai = saved.metode === 'Transfer' ? 'Transfer Bank' : saved.metode;
        saved.metode = 'Non-Tunai';
      }
      return { ...def, ...saved, nomor: orRandomNo(saved.nomor, NO_FMT) };
    } catch {
      return { ...DEFAULT, paper: `T${mm}`, nomor: randomDocNo(NO_FMT) };
    }
  });
  const [logoBg, setLogoBg] = useState(false);
  const logo = useBgRemoved(n.logo, logoBg, (m) => notify('error', m));
  const ref = useRef<HTMLDivElement>(null);
  const tpl = tplOf(n.template);
  useGoogleFonts([tpl.web, tpl.headWeb]);
  const T = notaLayout(n.paper, n.landscape, mm);
  // Kertas gulung: tinggi bebas, skala hanya diturunkan bila isi lebih lebar dari kertas; kertas lembar: juga bila isi lebih tinggi
  const k = useFitScale(n.skala / 100, () => ref.current?.firstElementChild as HTMLElement, !T.roll, [n, mm, logo.src]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    } catch {
      notify('error', 'Logo terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [n, notify, STORAGE_KEY]);

  const set = <K extends keyof Nota>(k: K, v: Nota[K]) => setN((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', n.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const c = calc(n);

  const fileName = `nota-${(n.nomor || 'transaksi').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  // Kertas gulung: tinggi mengikuti panjang nota; kertas lembar: ukuran halaman tetap
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify,
    (page) => (T.roll ? { w: T.paper.w, h: Math.ceil((T.paper.w * page.offsetHeight) / T.px) } : T.paper), T.roll ? 2 : 3);
  const transaksiBaru = () => {
    const m = n.nomor.match(/^(.*?)(\d+)$/);
    const nomor = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : randomDocNo(NO_FMT);
    setN((p) => ({ ...p, nomor, waktu: nowLocal(), pelanggan: '', items: [{ nama: '', qty: '1', harga: '' }], diskon: '', biaya: '', bayar: '' }));
    notify('info', `Transaksi baru ${nomor}.`);
  };
  const txt = (k: keyof Nota, label: string, rows = 1) => (
    <Field label={label}>
      <AutoTextarea rows={rows} className={inputCls} value={n[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  const [canvas, setCanvas] = useCanvasMode();
  const userKeys = ['toko', 'alamat', 'telp', 'logo', 'kasir', 'pajak', 'footer', 'metode', 'nonTunai'] as const;
  const tampilan = (
    <>
      <PaperPicker paper={n.paper} landscape={n.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
      <TextSizeSlider value={n.skala} onChange={(v) => set('skala', v)} effective={k} />
      <Field label="Template nota">
        <select className={inputCls} value={tpl.id} onChange={(e) => set('template', e.target.value)}>
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
        </select>
      </Field>
    </>
  );
  const unduh = (
    <>
      <p className="w-full text-sm text-gray-600">Cetak ke printer thermal Bluetooth: unduh PNG lalu buka dengan aplikasi RawBT.</p>
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={logo.busy} onRun={run} />
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={logo.busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={logo.busy} onRun={run} />
      <button onClick={transaksiBaru} className="px-5 py-2 rounded-lg bg-white border font-semibold">Transaksi Baru</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Nota Pembelian {mm}mm</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={userKeys} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey={`data-user:nota-${mm}`} keys={userKeys} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} />
            <section className="space-y-3">
              <h2 className="font-bold">Toko</h2>
              <ImageUpload label="Upload logo (tampil di atas nota)" value={n.logo} onChange={(v) => set('logo', v)} notify={notify}
                bg={logoBg} onBg={setLogoBg} shown={logo.src} bgBusy={logo.busy} />
              {txt('toko', 'Nama toko')}
              {txt('alamat', 'Alamat', 2)}
              {txt('telp', 'Telepon')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Transaksi</h2>
              <div className="grid grid-cols-2 gap-2">
                <Field label="No. nota"><NumberFormatInput sep="-" parts={['Kode', 'Urut']} value={n.nomor} onChange={(v) => set('nomor', v)} /></Field>
                <Field label="Tanggal & jam"><input type="datetime-local" className={inputCls} value={n.waktu} onChange={(e) => set('waktu', e.target.value)} /></Field>
                {txt('kasir', 'Kasir')}
                {txt('pelanggan', 'Pelanggan (opsional)')}
              </div>
              {n.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[4rem_1fr_auto] sm:grid-cols-[1fr_4rem_6.5rem_auto] gap-2 items-end">
                  <div className="col-span-3 sm:col-span-1"><Field label={i === 0 ? 'Barang' : ''}><AutoTextarea aria-label={`Barang ${i + 1}`} className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} /></Field></div>
                  <Field label={i === 0 ? 'Qty' : ''}><input aria-label={`Qty ${i + 1}`} type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Harga' : ''}><input aria-label={`Harga ${i + 1}`} type="number" min={0} className={inputCls} value={it.harga} onChange={(e) => setItem(i, { harga: e.target.value })} /></Field>
                  <button type="button" onClick={() => set('items', n.items.filter((_, j) => j !== i))} disabled={n.items.length === 1}
                    aria-label={`Hapus barang ${i + 1}`} className="h-[38px] px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('items', [...n.items, { nama: '', qty: '1', harga: '' }])} className="text-sm font-medium text-blue-700">+ Tambah barang</button>
              <div className="text-right text-sm">TOTAL produk <b>Rp {rupiah(c.total)}</b></div>
              <h3 className="font-semibold text-sm text-gray-700">Rincian tambahan</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Pajak % (= Rp ${rupiah(c.pajak)})`}><input type="number" min={0} className={inputCls} value={n.pajak} onChange={(e) => set('pajak', e.target.value)} placeholder="mis. 10" /></Field>
                <Field label="Diskon">
                  <div className="flex gap-1">
                    <input type="number" min={0} className={inputCls} value={n.diskon} onChange={(e) => set('diskon', e.target.value)} placeholder={n.diskonMode === '%' ? 'persen' : 'nominal'} />
                    <select aria-label="Jenis diskon" className="w-16 shrink-0 rounded-lg border border-gray-300 px-1 text-sm" value={n.diskonMode} onChange={(e) => set('diskonMode', e.target.value as Nota['diskonMode'])}>
                      <option value="%">%</option>
                      <option value="Rp">Rp</option>
                    </select>
                  </div>
                </Field>
                <Field label="Biaya lain-lain (nama)"><AutoTextarea className={inputCls} value={n.biayaLabel} onChange={(e) => set('biayaLabel', e.target.value)} placeholder="mis. Kemasan" /></Field>
                <Field label="Biaya lain-lain (Rp)"><input type="number" min={0} className={inputCls} value={n.biaya} onChange={(e) => set('biaya', e.target.value)} /></Field>
                <Field label="Metode bayar">
                  <select className={inputCls} value={n.metode} onChange={(e) => set('metode', e.target.value as Nota['metode'])}>
                    <option>Tunai</option>
                    <option>Non-Tunai</option>
                  </select>
                </Field>
                {n.metode === 'Tunai' ? (
                  <Field label="Uang diterima (Rp)"><input type="number" min={0} className={inputCls} value={n.bayar} onChange={(e) => set('bayar', e.target.value)} /></Field>
                ) : (
                  <Field label="Bayar lewat">
                    <select className={inputCls} value={n.nonTunai} onChange={(e) => set('nonTunai', e.target.value)}>
                      {['QRIS', 'Transfer Bank', 'Kartu Debit', 'Kartu Kredit', 'E-Wallet'].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                )}
              </div>
              <div className="text-right text-sm">
                Total Pembayaran <b>Rp {rupiah(c.bayarTotal)}</b>
                {n.metode === 'Tunai' && <> • Kembali <b className={c.kembali < 0 ? 'text-red-600' : ''}>Rp {rupiah(c.kembali)}</b></>}
              </div>
              {txt('footer', 'Pesan bawah nota', 2)}
            </section>
            </>)}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 min-w-0">
            <p className="mb-2 text-xs text-gray-500 text-center">{paperOf(n.paper, `T${mm}`).label}{T.roll ? ` • PNG ${T.px * 2}px untuk printer thermal` : ''}</p>
            <FitPreview>
              <div ref={ref} className="w-max shadow-md mx-auto">
                <Receipt n={{ ...n, logo: logo.src }} T={T} k={k} />
              </div>
            </FitPreview>
          </div>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
