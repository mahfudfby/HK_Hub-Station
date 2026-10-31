import AutoTextarea from './AutoTextarea';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from './FitPreview';
import { TextSizeSlider, useFitScale } from './TextScale';
import PositionPad, { fxOf, getOffset, type Offset, type Offsets } from './PositionPad';
import { Toast, type ToastState } from './Feedback';
import { ExportButton, Field, ImageUpload, inputCls, fmtTanggal, mmToPx, useLetterExport, type Notify, type Paper } from './LetterKit';
import { useBgRemoved } from '../lib/removeBg';
import { num, rupiah, terbilangRupiah } from '../lib/money';
import { cssFamily, loadGoogleFont, useGoogleFonts, type WebFont } from '../lib/fonts';

// Generator Invoice & Faktur Penjualan: satu mesin, beberapa template gaya, ukuran kertas & orientasi bebas.

export type DocKind = 'invoice' | 'faktur';
type HeadKind = 'rule' | 'band' | 'center' | 'split' | 'formal' | 'mid' | 'boxed';
type TitleKind = 'lines' | 'plain' | 'box' | 'pill' | 'dark' | 'big' | 'under' | 'tab';
type TableKind = 'grid' | 'accentHead' | 'lines' | 'darkHead' | 'tintHead' | 'dashed' | 'zebra' | 'rule2';
type TotalKind = 'double' | 'accent' | 'big' | 'dark' | 'outline' | 'dashed' | 'tint' | 'under';
// Satu template = kombinasi gaya kop, judul, tabel, total, font, strip & bingkai.
// ink: hitam-putih (abaikan warna aksen untuk garis/judul); rule: garis bawah kop ({a} = warna aksen).
type Tpl = {
  id: string; name: string; desc: string; font: string;
  head: HeadKind; logo?: 'left' | 'right'; rule?: string; band?: 'accent' | 'dark' | 'tint';
  title: TitleKind; table: TableKind; total: TotalKind;
  stripe?: 'left' | 'top'; frame?: 'double'; ink?: boolean;
  web?: WebFont; // Google Font template (dimuat saat dipilih)
};
const SERIF = 'Tinos, "Times New Roman", serif';
const SANS = 'Arimo, Arial, sans-serif';
const HUMANIST = 'Carlito, Calibri, Arimo, sans-serif';
const MONO = 'Cousine, "Courier New", monospace';
const TEMPLATES: Tpl[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Gaya Slip Gaji, tabel bergaris', font: SERIF, head: 'rule', logo: 'right', rule: '2px solid #000', title: 'lines', table: 'grid', total: 'double', ink: true },
  { id: 'modern', name: 'Modern', desc: 'Pita warna di atas', font: SANS, head: 'band', band: 'accent', title: 'lines', table: 'accentHead', total: 'accent' },
  { id: 'minimal', name: 'Minimal', desc: 'Logo tengah, garis tipis', font: SANS, head: 'center', rule: '1px solid #d4d4d4', title: 'plain', table: 'lines', total: 'big' },
  { id: 'tegas', name: 'Tegas', desc: 'Strip samping, kontras', font: HUMANIST, head: 'rule', logo: 'left', rule: '4px solid {a}', title: 'dark', table: 'darkHead', total: 'accent', stripe: 'left' },
  { id: 'elegan', name: 'Elegan', desc: 'Serif, bingkai ganda', font: SERIF, head: 'center', rule: '1px solid {a}', title: 'lines', table: 'lines', total: 'outline', frame: 'double' },
  { id: 'korporat', name: 'Korporat', desc: 'Judul besar di kanan kop', font: SANS, head: 'split', logo: 'left', rule: '3px solid {a}', title: 'lines', table: 'accentHead', total: 'dark' },
  { id: 'profesional', name: 'Profesional', desc: 'Judul pil, tabel lembut', font: HUMANIST, head: 'rule', logo: 'left', rule: '2px solid {a}', title: 'pill', table: 'tintHead', total: 'accent' },
  { id: 'kreatif', name: 'Kreatif', desc: 'Strip atas, judul besar', font: SANS, head: 'rule', logo: 'right', title: 'big', table: 'lines', total: 'big', stripe: 'top' },
  { id: 'formal', name: 'Formal', desc: 'Kop surat resmi garis ganda', font: SERIF, head: 'formal', title: 'lines', table: 'grid', total: 'double', ink: true },
  { id: 'monokrom', name: 'Monokrom', desc: 'Huruf ketik, cocok dot-matrix', font: MONO, head: 'rule', logo: 'left', rule: '1px dashed #000', title: 'plain', table: 'dashed', total: 'dashed', ink: true },
  { id: 'retail', name: 'Retail', desc: 'Kop gelap, judul kotak', font: SANS, head: 'band', band: 'dark', title: 'box', table: 'darkHead', total: 'dark' },
  { id: 'startup', name: 'Startup', desc: 'Strip atas, tabel lembut', font: SANS, head: 'split', logo: 'left', title: 'lines', table: 'tintHead', total: 'accent', stripe: 'top' },
  { id: 'bingkai', name: 'Bingkai Ganda', desc: 'Judul berbingkai, klasik', font: SERIF, head: 'rule', logo: 'left', rule: '1px solid #000', title: 'box', table: 'grid', total: 'double', frame: 'double', ink: true },
  { id: 'pastel', name: 'Pastel', desc: 'Kop warna lembut', font: SANS, head: 'band', band: 'tint', title: 'lines', table: 'tintHead', total: 'outline' },
  { id: 'geometris', name: 'Geometris', desc: 'Montserrat, kop tengah mendatar', font: cssFamily('Montserrat'), web: { family: 'Montserrat', weights: [400, 700] }, head: 'mid', rule: '2px solid {a}', title: 'under', table: 'zebra', total: 'tint' },
  { id: 'kartu', name: 'Kartu', desc: 'Lato, kop dalam kotak membulat', font: cssFamily('Lato'), web: { family: 'Lato', weights: [400, 700] }, head: 'boxed', title: 'tab', table: 'rule2', total: 'under' },
  { id: 'editorial', name: 'Editorial', desc: 'Playfair, gaya majalah hitam-putih', font: cssFamily('Playfair Display', 'serif'), web: { family: 'Playfair Display', weights: [400, 700] }, head: 'mid', rule: '3px double #000', title: 'big', table: 'rule2', total: 'double', ink: true },
  { id: 'teknik', name: 'Teknik', desc: 'IBM Plex, strip samping, kotak kop', font: cssFamily('IBM Plex Sans'), web: { family: 'IBM Plex Sans', weights: [400, 700] }, head: 'boxed', title: 'under', table: 'zebra', total: 'dark', stripe: 'left' },
  { id: 'slab', name: 'Slab', desc: 'Roboto Slab, judul tab, garis tebal', font: cssFamily('Roboto Slab', 'serif'), web: { family: 'Roboto Slab', weights: [400, 700] }, head: 'rule', logo: 'left', rule: '6px solid {a}', title: 'tab', table: 'darkHead', total: 'tint' },
  { id: 'butik', name: 'Butik', desc: 'Josefin Sans, lembut & lapang', font: cssFamily('Josefin Sans'), web: { family: 'Josefin Sans', weights: [400, 700] }, head: 'center', rule: '1px solid {a}', title: 'plain', table: 'rule2', total: 'under', stripe: 'top' },
];
type TemplateId = string;
const tplOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

// Warna aksen dicampur putih (t: 0 = asli, 1 = putih); hex biasa agar aman untuk html2canvas
export function tint(hex: string, t: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0');
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}
console.assert(tint('#000000', 0.5) === '#808080' && tint('#1d4ed8', 0) === '#1d4ed8' && tint('#123456', 1) === '#ffffff', 'tint');

type PaperId = 'A4' | 'A5' | 'Letter' | 'F4' | 'CF95x11' | 'CF95x55' | 'CF15x11' | 'T80x100';

// group: label kelompok di dropdown; fixed: orientasi tetap (continuous form & thermal)
const PAPERS: Record<PaperId, Paper & { label: string; group: string; fixed?: boolean }> = {
  A4: { w: 210, h: 297, label: 'A4 (210×297 mm)', group: 'Kertas biasa' },
  A5: { w: 148, h: 210, label: 'A5 (148×210 mm)', group: 'Kertas biasa' },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216×279 mm)', group: 'Kertas biasa' },
  F4: { w: 215, h: 330, label: 'F4 / Folio (215×330 mm)', group: 'Kertas biasa' },
  CF95x11: { w: 241.3, h: 279.4, label: 'Continuous 9½×11 in (penuh)', group: 'Dot-Matrix continuous form', fixed: true },
  CF95x55: { w: 241.3, h: 139.7, label: 'Continuous 9½×5½ in (½)', group: 'Dot-Matrix continuous form', fixed: true },
  CF15x11: { w: 377.8, h: 279.4, label: 'Continuous 14⅞×11 in (lebar)', group: 'Dot-Matrix continuous form', fixed: true },
  T80x100: { w: 80, h: 100, label: 'Thermal 80×100 mm', group: 'Thermal', fixed: true },
};
const PAPER_GROUPS = [...new Set(Object.values(PAPERS).map((p) => p.group))];

// Font tebal untuk nama usaha (Google Fonts, dimuat saat dipilih agar sama di semua perangkat)
type NameFont = { id: string; label: string; family: string; weight: number; fallback: string };
const NAME_FONTS: NameFont[] = [
  { id: 'montserrat', label: 'Montserrat ExtraBold', family: 'Montserrat', weight: 800, fallback: 'sans-serif' },
  { id: 'poppins', label: 'Poppins Bold', family: 'Poppins', weight: 700, fallback: 'sans-serif' },
  { id: 'raleway', label: 'Raleway ExtraBold', family: 'Raleway', weight: 800, fallback: 'sans-serif' },
  { id: 'archivo', label: 'Archivo Black', family: 'Archivo Black', weight: 400, fallback: 'sans-serif' },
  { id: 'oswald', label: 'Oswald Bold', family: 'Oswald', weight: 700, fallback: 'sans-serif' },
  { id: 'anton', label: 'Anton', family: 'Anton', weight: 400, fallback: 'sans-serif' },
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue', weight: 400, fallback: 'sans-serif' },
  { id: 'playfair', label: 'Playfair Display Bold', family: 'Playfair Display', weight: 700, fallback: 'serif' },
  { id: 'merriweather', label: 'Merriweather Black', family: 'Merriweather', weight: 900, fallback: 'serif' },
  { id: 'robotoslab', label: 'Roboto Slab Bold', family: 'Roboto Slab', weight: 700, fallback: 'serif' },
  { id: 'cinzel', label: 'Cinzel Bold', family: 'Cinzel', weight: 700, fallback: 'serif' },
  { id: 'lobster', label: 'Lobster', family: 'Lobster', weight: 400, fallback: 'cursive' },
];
const findFont = (id: string) => NAME_FONTS.find((f) => f.id === id);
const loadNameFont = (f?: NameFont) => f && void loadGoogleFont({ family: f.family, weights: [f.weight] });

const LABELS = {
  invoice: { title: 'INVOICE', nomor: 'No. Invoice', kepada: 'Ditagihkan kepada', file: 'invoice' },
  faktur: { title: 'FAKTUR PENJUALAN', nomor: 'No. Faktur', kepada: 'Kepada Yth.', file: 'faktur' },
};

type Item = { nama: string; qty: string; satuan: string; harga: string; diskon: string };
type Doc = {
  template: TemplateId;
  paper: PaperId;
  landscape: boolean;
  accent: string;
  bingkai: boolean; // border kotak di tepi kertas
  skala: number; // ukuran teks dokumen (%)
  posisi: Offsets; // geseran logo, tanda tangan & stempel (px dokumen)
  namaFont: string; // id NAME_FONTS, '' = ikut template
  logo: string;
  penjual: string;
  penjualAlamat: string;
  penjualKontak: string;
  penjualNpwp: string;
  pembeli: string;
  pembeliAlamat: string;
  pembeliKontak: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string;
  items: Item[];
  potongan: string;
  ppn: string;
  ongkir: string;
  catatan: string;
  pembayaran: string;
  metode: '' | 'Tunai' | 'Non-Tunai'; // '' = tidak ditampilkan
  nonTunai: string; // QRIS, Transfer Bank, dll.
  diterima: string; // uang tunai diterima (Rp)
  terbilang: boolean;
  kota: string;
  ttdNama: string;
  ttdJabatan: string;
  ttd: string;
  stempel: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const blankItem = (): Item => ({ nama: '', qty: '1', satuan: 'pcs', harga: '', diskon: '' });

const makeDefault = (kind: DocKind): Doc => ({
  template: kind === 'invoice' ? 'modern' : 'klasik',
  paper: 'A4',
  landscape: false,
  accent: kind === 'invoice' ? '#1d4ed8' : '#0f766e',
  bingkai: true,
  skala: 100,
  posisi: {},
  namaFont: '',
  logo: '',
  penjual: 'NAMA USAHA ANDA',
  penjualAlamat: 'Alamat usaha, Kota',
  penjualKontak: 'Telp. 0812-0000-0000 • email@usaha.com',
  penjualNpwp: '',
  pembeli: '',
  pembeliAlamat: '',
  pembeliKontak: '',
  nomor: `${kind === 'invoice' ? 'INV' : 'FJ'}/${new Date().getFullYear()}/001`,
  tanggal: today(),
  jatuhTempo: '',
  items: [
    { nama: 'Contoh barang / jasa', qty: '2', satuan: 'pcs', harga: '150000', diskon: '' },
    { nama: 'Contoh barang kedua', qty: '1', satuan: 'unit', harga: '450000', diskon: '10' },
  ],
  potongan: '',
  ppn: '11',
  ongkir: '',
  catatan: kind === 'invoice' ? 'Terima kasih atas kepercayaan Anda.' : 'Barang yang sudah dibeli tidak dapat dikembalikan.',
  pembayaran: 'Transfer ke Bank ABC 123-456-7890 a.n. Nama Usaha Anda',
  metode: '',
  nonTunai: 'Transfer Bank',
  diterima: '',
  terbilang: kind === 'faktur',
  kota: '',
  ttdNama: 'Nama Penanggung Jawab',
  ttdJabatan: kind === 'invoice' ? 'Finance' : 'Bagian Penjualan',
  ttd: '',
  stempel: '',
});

function calc(d: Doc) {
  const lines = d.items.map((it) => {
    const bruto = num(it.qty) * num(it.harga);
    return bruto - (bruto * num(it.diskon)) / 100;
  });
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const potongan = num(d.potongan);
  const dpp = Math.max(0, subtotal - potongan);
  const ppn = Math.round((dpp * num(d.ppn)) / 100);
  const ongkir = num(d.ongkir);
  return { lines, subtotal, potongan, dpp, ppn, ongkir, total: dpp + ppn + ongkir };
}
{
  const c = calc({ ...makeDefault('invoice'), potongan: '10000', ppn: '11', ongkir: '5000' });
  // 2×150000 + 450000×90% = 705000; DPP 695000; PPN 76450; total 776450
  console.assert(c.subtotal === 705000 && c.dpp === 695000 && c.ppn === 76450 && c.total === 776450, 'SalesDoc calc');
}

// ---------------- Tampilan dokumen ----------------
type Ctx = { d: Doc; kind: DocKind; c: ReturnType<typeof calc>; fs: number; pad: number; short: boolean };
// Warna garis/judul template: hitam untuk template ink, selain itu warna aksen
// Kertas pendek (A5 landscape, ½ continuous, thermal): jarak vertikal dirapatkan agar muat
const gapK = (short: boolean) => (short ? 0.55 : 1);
const inkOf = (d: Doc) => (tplOf(d.template).ink ? '#000' : d.accent);
// Jarak bingkai dari tepi kertas
const frameInset = (pad: number) => Math.round(pad * 0.35);

// Nama usaha besar (2,7× teks isi); alamat & kontak seukuran teks isi
function Seller({ d, fs, color, sub = '#4b5563', align = 'left' }: { d: Doc; fs: number; color?: string; sub?: string; align?: 'left' | 'right' | 'center' }) {
  const nf = findFont(d.namaFont);
  const det: CSSProperties = { fontSize: fs, color: sub, lineHeight: 1.35, whiteSpace: 'pre-line' };
  return (
    <div style={{ textAlign: align, color, minWidth: 0 }}>
      <div style={{ fontWeight: nf?.weight ?? 700, fontFamily: nf ? `"${nf.family}", ${nf.fallback}` : undefined, fontSize: fs * 2.7, lineHeight: 1.15 }}>{d.penjual}</div>
      {d.penjualAlamat && <div style={det}>{d.penjualAlamat}</div>}
      {d.penjualKontak && <div style={det}>{d.penjualKontak}</div>}
      {d.penjualNpwp && <div style={det}>NPWP: {d.penjualNpwp}</div>}
    </div>
  );
}

// Logo selalu punya tempat di setiap template; tanpa upload tampil tulisan "LOGO" seperti Slip Gaji
function Logo({ src, h: h0, color, box, o }: { src: string; h: number; color: string; box?: boolean; o: Offset }) {
  const { z, a } = fxOf(o, 'logo');
  const h = h0 * z;
  const wrap: CSSProperties = box ? { background: '#fff', borderRadius: 8, padding: 6, display: 'inline-flex' } : { display: 'inline-flex' };
  return (
    // relative: geser logo tanpa menggeser isi kop lainnya
    <span style={{ ...wrap, flexShrink: 0, position: 'relative', left: o.x, top: o.y, opacity: a }}>
      {src
        ? <img src={src} alt="Logo" style={{ height: h, maxWidth: h * 2.4, objectFit: 'contain' }} />
        : <span style={{ height: h, display: 'flex', alignItems: 'center', fontFamily: 'Tinos, serif', fontWeight: 800, fontSize: h * 0.42, color }}>LOGO</span>}
    </span>
  );
}

// Judul dokumen; 'lines' = di antara dua garis (gaya Slip Gaji)
function Title({ kind, text, fs, col, short = false }: { kind: TitleKind; text: string; fs: number; col: string; short?: boolean }) {
  const base: CSSProperties = { fontWeight: 700, fontSize: fs * 1.5, letterSpacing: 3, textTransform: 'uppercase', marginBottom: fs * 1.2 * gapK(short) };
  switch (kind) {
    case 'plain':
      return <div style={{ ...base, textAlign: 'center', color: col, letterSpacing: 6 }}>{text}</div>;
    case 'box':
      return <div style={{ textAlign: 'center', marginBottom: base.marginBottom }}><span style={{ ...base, display: 'inline-block', margin: 0, border: `2px solid ${col}`, color: col, padding: `${fs * 0.2}px ${fs * 1.2}px` }}>{text}</span></div>;
    case 'pill':
      return <div style={{ textAlign: 'right', marginBottom: base.marginBottom }}><span style={{ ...base, display: 'inline-block', margin: 0, background: col, color: '#fff', borderRadius: 999, padding: `${fs * 0.25}px ${fs * 1.4}px`, fontSize: fs * 1.3 }}>{text}</span></div>;
    case 'dark':
      return <div style={{ ...base, textAlign: 'center', background: '#1f2937', color: '#fff', padding: `${fs * 0.3}px 0` }}>{text}</div>;
    case 'big':
      return <div style={{ ...base, color: col, fontSize: fs * 2.6, fontWeight: 800, letterSpacing: 1, lineHeight: 1.1 }}>{text}</div>;
    case 'under': // kiri, garis bawah tebal sepanjang judul
      return <div style={{ display: 'flex', marginBottom: base.marginBottom }}><span style={{ ...base, margin: 0, color: col, borderBottom: `3px solid ${col}`, paddingBottom: fs * 0.15 }}>{text}</span></div>;
    case 'tab': // tab berwarna menempel di garis selebar halaman
      return <div style={{ display: 'flex', borderBottom: `2px solid ${col}`, marginBottom: base.marginBottom }}><span style={{ ...base, margin: 0, background: col, color: '#fff', padding: `${fs * 0.25}px ${fs}px`, borderRadius: `${fs * 0.4}px ${fs * 0.4}px 0 0` }}>{text}</span></div>;
    default:
      return <div style={{ ...base, textAlign: 'center', color: col, borderTop: `1px solid ${col}`, borderBottom: `1px solid ${col}`, padding: `${fs * 0.3}px 0` }}>{text}</div>;
  }
}

function Header({ d, kind, fs, pad, short }: Ctx) {
  const T = tplOf(d.template);
  const a = d.accent;
  const col = inkOf(d);
  const title = LABELS[kind].title;
  const logoH = fs * 5.5;
  const lo = getOffset(d.posisi, 'logo');
  const rule = T.rule?.replace('{a}', a);
  const ruled: CSSProperties = rule ? { borderBottom: rule, paddingBottom: fs * 0.5, marginBottom: fs * 0.8 } : { marginBottom: fs * 0.8 };
  const logoColor = T.ink ? '#b91c1c' : a;
  const head = short && T.head === 'center' ? 'rule' : T.head; // kertas pendek: kop mendatar agar muat
  let top: JSX.Element;
  switch (head) {
    case 'band': {
      const inset = d.bingkai ? frameInset(pad) + 2 : 0; // pita berhenti di dalam bingkai
      const light = T.band !== 'tint';
      const bg = T.band === 'dark' ? '#111827' : T.band === 'tint' ? tint(a, 0.85) : a;
      top = (
        <div style={{ margin: `-${pad - inset}px -${pad - inset}px ${fs}px`, padding: `${pad * 0.6 - inset}px ${pad - inset}px`, background: bg, display: 'flex', alignItems: 'center', gap: fs * 1.4 }}>
          <Logo o={lo} src={d.logo} h={logoH} color={a} box={light} />
          <Seller d={d} fs={fs} color={light ? '#fff' : '#111'} sub={light ? '#e5e7eb' : '#374151'} />
        </div>
      );
      break;
    }
    case 'center':
      top = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fs * 0.5, ...ruled }}>
          <Logo o={lo} src={d.logo} h={logoH * 0.85} color={logoColor} />
          <Seller d={d} fs={fs} align="center" />
        </div>
      );
      break;
    case 'mid': // logo & identitas berdampingan di tengah
      top = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fs * 1.4, ...ruled }}>
          <Logo o={lo} src={d.logo} h={logoH} color={logoColor} />
          <Seller d={d} fs={fs} />
        </div>
      );
      break;
    case 'boxed': // kop dalam kotak membulat berwarna lembut
      top = (
        <div style={{ display: 'flex', alignItems: 'center', gap: fs * 1.4, background: tint(a, 0.92), border: `1px solid ${tint(a, 0.6)}`, borderRadius: fs * 0.8, padding: `${fs * 0.6}px ${fs}px`, marginBottom: fs * 0.8 }}>
          <Logo o={lo} src={d.logo} h={logoH * 0.85} color={logoColor} />
          <div style={{ flex: 1, minWidth: 0 }}><Seller d={d} fs={fs} /></div>
        </div>
      );
      break;
    case 'split': // identitas kiri, judul besar kanan (judul tidak diulang di bawah)
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: fs * 1.4, ...ruled, marginBottom: fs * 1.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: fs * 1.2, minWidth: 0 }}>
            <Logo o={lo} src={d.logo} h={logoH} color={logoColor} />
            <Seller d={d} fs={fs} />
          </div>
          <div style={{ fontSize: fs * 2.4, fontWeight: 800, color: col, letterSpacing: 1, textAlign: 'right', lineHeight: 1.1 }}>{title}</div>
        </div>
      );
    case 'formal': // kop surat resmi: logo kiri, identitas tengah, garis ganda tebal-tipis
      top = (
        <>
          <div style={{ position: 'relative', minHeight: logoH, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${logoH * 1.3}px` }}>
            <span style={{ position: 'absolute', left: 0, top: 0 }}><Logo o={lo} src={d.logo} h={logoH} color={logoColor} /></span>
            <Seller d={d} fs={fs} align="center" />
          </div>
          <div style={{ borderTop: '3px solid #000', borderBottom: '1px solid #000', height: 2, margin: `${fs * 0.5}px 0 ${fs * 0.8}px` }} />
        </>
      );
      break;
    default: // rule: identitas + logo di kiri/kanan, garis bawah kop
      top = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: T.logo === 'left' ? 'row-reverse' : 'row', gap: fs * 1.4, ...ruled }}>
          <div style={{ flex: 1, minWidth: 0 }}><Seller d={d} fs={fs} /></div>
          <Logo o={lo} src={d.logo} h={logoH} color={logoColor} />
        </div>
      );
  }
  return (
    <>
      {top}
      <Title kind={T.title} text={title} fs={fs} col={col} short={short} />
    </>
  );
}

function Parties({ d, kind, fs, short }: Ctx) {
  const L = LABELS[kind];
  const label: CSSProperties = { color: tplOf(d.template).ink ? '#000' : '#555', fontSize: fs * 0.85, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 };
  const meta: [string, string][] = [
    [L.nomor, d.nomor],
    ['Tanggal', fmtTanggal(d.tanggal)],
    ...(d.jatuhTempo ? [['Jatuh Tempo', fmtTanggal(d.jatuhTempo)] as [string, string]] : []),
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: fs * 1.2 * gapK(short) }}>
      <div style={{ minWidth: 0 }}>
        <div style={label}>{L.kepada}</div>
        <div style={{ fontWeight: 700 }}>{d.pembeli || '—'}</div>
        {d.pembeliAlamat && <div style={{ whiteSpace: 'pre-line' }}>{d.pembeliAlamat}</div>}
        {d.pembeliKontak && <div>{d.pembeliKontak}</div>}
      </div>
      <table style={{ borderCollapse: 'collapse', alignSelf: 'flex-start' }}>
        <tbody>
          {meta.map(([k, v]) => (
            <tr key={k}>
              <td style={{ paddingRight: 10, color: label.color }}>{k}</td>
              <td style={{ fontWeight: 700, textAlign: 'right' }}>{v || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tableStyle(d: Doc, fs: number) {
  const T = tplOf(d.template);
  const col = inkOf(d);
  const cell: CSSProperties = { padding: `${fs * 0.35}px ${fs * 0.5}px`, verticalAlign: 'top' };
  const up: CSSProperties = { fontSize: fs * 0.85, textTransform: 'uppercase', letterSpacing: 0.5 };
  switch (T.table) {
    case 'accentHead':
      return { th: { ...cell, background: col, color: '#fff', fontWeight: 700, border: `1px solid ${col}` }, td: { ...cell, borderBottom: '1px solid #e5e7eb' }, zebra: '#f8fafc' };
    case 'lines':
      return { th: { ...cell, ...up, borderBottom: `1.5px solid ${T.font === SERIF ? col : '#111'}`, color: '#555' }, td: { ...cell, borderBottom: '1px solid #eee' }, zebra: '' };
    case 'darkHead':
      return { th: { ...cell, background: '#1f2937', color: '#fff', fontWeight: 700, border: '1px solid #1f2937' }, td: { ...cell, borderBottom: '1px solid #d1d5db' }, zebra: '#f3f4f6' };
    case 'tintHead':
      return { th: { ...cell, background: tint(col, 0.85), color: col, fontWeight: 700, borderBottom: `2px solid ${col}` }, td: { ...cell, borderBottom: '1px solid #e5e7eb' }, zebra: tint(col, 0.95) };
    case 'dashed':
      return { th: { ...cell, ...up, fontWeight: 700, borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }, td: { ...cell, borderBottom: '1px dashed #999' }, zebra: '' };
    case 'zebra':
      return { th: { ...cell, ...up, fontWeight: 700, color: col, borderBottom: `2px solid ${col}` }, td: cell, zebra: '#f3f4f6' };
    case 'rule2':
      return { th: { ...cell, ...up, fontWeight: 700, borderTop: `2px solid ${col}`, borderBottom: `2px solid ${col}` }, td: { ...cell, borderBottom: `1px solid ${tint(col, 0.75)}` }, zebra: '' };
    default: // grid
      return { th: { ...cell, border: '1px solid #000', background: '#e5e5e5', fontWeight: 700 }, td: { ...cell, border: '1px solid #000' }, zebra: '' };
  }
}

function Items({ d, c, fs, short }: Ctx) {
  const s = tableStyle(d, fs);
  const hasDisc = d.items.some((it) => num(it.diskon) > 0);
  const R: CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: fs * 1.2 * gapK(short) }}>
      <thead>
        <tr>
          <th style={{ ...s.th, width: '1%', textAlign: 'center' }}>No</th>
          <th style={{ ...s.th, textAlign: 'left' }}>Deskripsi</th>
          <th style={{ ...s.th, ...R }}>Qty</th>
          <th style={{ ...s.th, ...R }}>Harga</th>
          {hasDisc && <th style={{ ...s.th, ...R }}>Disc</th>}
          <th style={{ ...s.th, ...R }}>Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {d.items.map((it, i) => {
          const td = { ...s.td, background: s.zebra && i % 2 ? s.zebra : undefined };
          return (
            <tr key={i}>
              <td style={{ ...td, textAlign: 'center' }}>{i + 1}</td>
              <td style={td}>{it.nama}</td>
              <td style={{ ...td, ...R }}>{it.qty} {it.satuan}</td>
              <td style={{ ...td, ...R }}>{rupiah(num(it.harga))}</td>
              {hasDisc && <td style={{ ...td, ...R }}>{num(it.diskon) ? `${it.diskon}%` : '-'}</td>}
              <td style={{ ...td, ...R }}>{rupiah(c.lines[i])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Totals({ d, c, fs, short }: Ctx) {
  const rows: [string, number][] = [
    ['Subtotal', c.subtotal],
    ...(c.potongan ? [['Potongan', -c.potongan] as [string, number]] : []),
    ...(c.potongan && num(d.ppn) ? [['DPP', c.dpp] as [string, number]] : []),
    ...(num(d.ppn) ? [[`PPN ${d.ppn}%`, c.ppn] as [string, number]] : []),
    ...(c.ongkir ? [['Ongkos Kirim', c.ongkir] as [string, number]] : []),
  ];
  const col = inkOf(d);
  const totalStyle: CSSProperties = {
    accent: { background: col, color: '#fff', fontWeight: 700, fontSize: fs * 1.15 },
    big: { color: col, fontWeight: 700, fontSize: fs * 1.3, borderTop: '1.5px solid #111' },
    dark: { background: '#111827', color: '#fff', fontWeight: 700, fontSize: fs * 1.15 },
    outline: { color: col, fontWeight: 700, fontSize: fs * 1.15, border: `2px solid ${col}` },
    dashed: { fontWeight: 700, fontSize: fs * 1.1, borderTop: '1px dashed #000', borderBottom: '1px dashed #000' },
    double: { fontWeight: 700, fontSize: fs * 1.1, borderTop: '3px double #000' },
    tint: { background: tint(col, 0.85), color: col, fontWeight: 700, fontSize: fs * 1.15 },
    under: { color: col, fontWeight: 700, fontSize: fs * 1.15, borderTop: `1px solid ${col}`, borderBottom: `3px solid ${col}` },
  }[tplOf(d.template).total];
  const cell: CSSProperties = { padding: `${fs * 0.25}px ${fs * 0.5}px` };
  return (
    <table style={{ borderCollapse: 'collapse', minWidth: '45%', marginLeft: 'auto' }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={cell}>{k}</td>
            <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>{v < 0 ? `-Rp ${rupiah(-v)}` : `Rp ${rupiah(v)}`}</td>
          </tr>
        ))}
        <tr style={totalStyle}>
          <td style={{ ...cell, padding: `${fs * 0.45}px ${fs * 0.5}px` }}>TOTAL</td>
          <td style={{ ...cell, padding: `${fs * 0.45}px ${fs * 0.5}px`, textAlign: 'right', whiteSpace: 'nowrap' }}>Rp {rupiah(c.total)}</td>
        </tr>
        {d.metode && (
          <tr>
            <td style={cell}>Metode Bayar</td>
            <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{d.metode === 'Tunai' ? 'Tunai' : `Non-Tunai (${d.nonTunai})`}</td>
          </tr>
        )}
        {d.metode === 'Tunai' && num(d.diterima) > 0 && short && (
          <tr><td style={cell} colSpan={2}>Diterima Rp {rupiah(num(d.diterima))} • Kembali Rp {rupiah(Math.max(0, num(d.diterima) - c.total))}</td></tr>
        )}
        {d.metode === 'Tunai' && num(d.diterima) > 0 && !short && (
          <>
            <tr><td style={cell}>Diterima</td><td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>Rp {rupiah(num(d.diterima))}</td></tr>
            <tr><td style={cell}>Kembali</td><td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>Rp {rupiah(Math.max(0, num(d.diterima) - c.total))}</td></tr>
          </>
        )}
      </tbody>
    </table>
  );
}

function SignBox({ heading, name, title, ttd, stempel, fs, short = false, oTtd, oStempel }: { heading: string; name: string; title: string; ttd?: string; stempel?: string; fs: number; short?: boolean; oTtd?: Offset; oStempel?: Offset }) {
  const h = fs * (short ? 4 : 5.5);
  const fxStempel = fxOf(oStempel, 'stempel');
  const fxTtd = fxOf(oTtd, 'ttd');
  return (
    <div style={{ textAlign: 'center', minWidth: fs * 13 }}>
      <div>{heading}</div>
      <div style={{ position: 'relative', height: h }}>
        {stempel && <img src={stempel} alt="Stempel" style={{ position: 'absolute', left: oStempel?.x ?? 0, top: oStempel?.y ?? 0, height: h * fxStempel.z, opacity: fxStempel.a, mixBlendMode: 'multiply' }} />}
        {ttd && <img src={ttd} alt="Tanda tangan" style={{ position: 'absolute', left: '50%', top: fs * 0.4 + (oTtd?.y ?? 0), marginLeft: oTtd?.x ?? 0, transform: 'translateX(-50%)', height: h * 0.85 * fxTtd.z, maxWidth: fs * 14 * fxTtd.z, opacity: fxTtd.a, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
      </div>
      <div style={{ fontWeight: 700, borderBottom: '1px solid #000', display: 'inline-block', minWidth: fs * 11 }}>{name || ' '}</div>
      {title && <div style={{ fontSize: fs * 0.9 }}>{title}</div>}
    </div>
  );
}

function DocView(ctx: Ctx & { w: number; h: number }) {
  const { d, kind, c, fs, pad, w, h } = ctx;
  const T = tplOf(d.template);
  const box: CSSProperties = {
    width: w, height: h, overflow: 'hidden', boxSizing: 'border-box', padding: pad, background: '#fff', color: '#111',
    fontFamily: T.font, fontSize: fs, lineHeight: 1.4, position: 'relative',
    ...(T.stripe === 'left' ? { borderLeft: `${Math.round(fs * 0.9)}px solid ${d.accent}` } : {}),
    ...(T.stripe === 'top' ? { borderTop: `${Math.round(fs * 0.9)}px solid ${d.accent}` } : {}),
  };
  return (
    <div style={box}>
      <Header {...ctx} />
      <Parties {...ctx} />
      <Items {...ctx} />
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: fs * 1.4 * gapK(ctx.short) }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: fs * 0.92 }}>
          {d.terbilang && (
            <div style={{ marginBottom: fs * 0.6 }}>
              <div style={{ fontWeight: 700 }}>Terbilang:</div>
              <div style={{ fontStyle: 'italic' }}>{terbilangRupiah(c.total)}</div>
            </div>
          )}
          {d.pembayaran && (
            <div style={{ marginBottom: fs * 0.6 }}>
              <div style={{ fontWeight: 700 }}>Pembayaran:</div>
              <div style={{ whiteSpace: 'pre-line' }}>{d.pembayaran}</div>
            </div>
          )}
          {d.catatan && (
            <div>
              <div style={{ fontWeight: 700 }}>Catatan:</div>
              <div style={{ whiteSpace: 'pre-line' }}>{d.catatan}</div>
            </div>
          )}
        </div>
        <Totals {...ctx} />
      </div>
      {(d.kota || d.tanggal) && <div style={{ textAlign: 'right', marginBottom: 2 }}>{[d.kota, fmtTanggal(d.tanggal)].filter(Boolean).join(', ')}</div>}
      <div style={{ display: 'flex', justifyContent: kind === 'faktur' ? 'space-between' : 'flex-end' }}>
        {kind === 'faktur' && <SignBox heading="Penerima," name="" title="" fs={fs} short={ctx.short} />}
        <SignBox heading="Hormat kami," name={d.ttdNama} title={d.ttdJabatan} ttd={d.ttd} stempel={d.stempel} fs={fs} short={ctx.short}
          oTtd={getOffset(d.posisi, 'ttd')} oStempel={getOffset(d.posisi, 'stempel')} />
      </div>
      {d.bingkai && (
        <div style={{ position: 'absolute', inset: frameInset(pad), border: T.frame === 'double' ? `4px double ${inkOf(d)}` : `1.5px solid ${inkOf(d)}`, pointerEvents: 'none' }} />
      )}
    </div>
  );
}

// ---------------- Editor ----------------
export default function SalesDoc({ kind }: { kind: DocKind }) {
  const L = LABELS[kind];
  const storageKey = `sales-doc:${kind}:v1`;
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [d, setD] = useState<Doc>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return saved ? { ...makeDefault(kind), ...saved } : makeDefault(kind);
    } catch {
      return makeDefault(kind);
    }
  });
  const [bg, setBg] = useState({ logo: false, ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(d.logo, bg.logo, bgError);
  const ttd = useBgRemoved(d.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(d.stempel, bg.stempel, bgError);
  const bgFor = (k: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[k], onBg: (v: boolean) => setBg((p) => ({ ...p, [k]: v })), shown: shown.src, bgBusy: shown.busy });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(d));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [d, storageKey, notify]);

  useEffect(() => { loadNameFont(findFont(d.namaFont)); }, [d.namaFont]);
  useGoogleFonts([tplOf(d.template).web]);

  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const base = PAPERS[d.paper];
  const paper: Paper = d.landscape && !base.fixed ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
  const W = mmToPx(paper.w);
  const H = mmToPx(paper.h);
  // Huruf & margin mengikuti sisi terpendek kertas: thermal 80mm sangat kecil, A5/½ continuous kecil
  const minSide = Math.min(paper.w, paper.h);
  // Ukuran teks: slider pengguna × dasar per kertas; otomatis diperkecil bila isi tidak muat
  const k = useFitScale(d.skala / 100, () => ref.current?.firstElementChild as HTMLElement, true, [d, W, H]);
  const fs = (minSide < 100 ? 7 : minSide < 160 ? 10 : 12) * k;
  // Margin tepi kertas: A4/Letter/F4/continuous ±16mm, A5/½ continuous ±10,5mm; thermal tetap rapat
  const pad = minSide < 100 ? 16 : H < 600 ? 30 : minSide < 160 ? 40 : 60; // thermal 80mm: ±4mm
  const c = calc(d);

  const fileName = `${L.file}-${(d.nomor || 'dokumen').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify, paper);
  const busy = logo.busy || ttd.busy || stempel.busy;
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setD(makeDefault(kind));
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };
  const txt = (k: keyof Doc, label: string, rows = 1) => (
    <Field label={label}>
      <AutoTextarea rows={rows} className={inputCls} value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );
  const seg = (on: boolean) => `px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;
  // Analog geser tanda tangan/stempel: desktop di atas form, ponsel di kotak bawah
  const [geser, setGeser] = useState('ttd');
  const posPad = (
    <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
      active={geser} onActive={setGeser} value={d.posisi} onChange={(v) => set('posisi', v)} />
  );
  // Pilihan kertas & orientasi: di form (desktop) dan di paling bawah (ponsel)
  const paperField = (
    <Field label="Ukuran kertas">
      <select className={inputCls} value={d.paper} onChange={(e) => set('paper', e.target.value as PaperId)}>
        {PAPER_GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {(Object.keys(PAPERS) as PaperId[]).filter((p) => PAPERS[p].group === g).map((p) => <option key={p} value={p}>{PAPERS[p].label}</option>)}
          </optgroup>
        ))}
      </select>
    </Field>
  );
  const fontField = (
    <Field label="Font nama usaha (tebal)">
      <select className={inputCls} value={d.namaFont} onChange={(e) => set('namaFont', e.target.value)}>
        <option value="">Bawaan template</option>
        {NAME_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
    </Field>
  );
  const accentField = (
    <Field label="Warna aksen">
      <input type="color" aria-label="Warna aksen" className="h-[42px] w-full rounded-lg border border-gray-300 p-1" value={d.accent} onChange={(e) => set('accent', e.target.value)} />
    </Field>
  );
  const orientButtons = (
    <div className="flex gap-2" role="radiogroup" aria-label="Orientasi">
      <button type="button" role="radio" aria-checked={!d.landscape} disabled={base.fixed} onClick={() => set('landscape', false)} className={`${seg(!d.landscape || !!base.fixed)} flex-1 disabled:opacity-50`}>Vertikal</button>
      <button type="button" role="radio" aria-checked={d.landscape && !base.fixed} disabled={base.fixed} onClick={() => set('landscape', true)} className={`${seg(d.landscape && !base.fixed)} flex-1 disabled:opacity-50`}>Landscape</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Generator {kind === 'invoice' ? 'Invoice' : 'Faktur Penjualan'}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            <section className="space-y-3">
              <h2 className="font-bold">Gaya &amp; Kertas</h2>
              <div className="hidden lg:block"><TextSizeSlider value={d.skala} onChange={(v) => set('skala', v)} effective={k} /></div>
              <div className="hidden lg:block">{posPad}</div>
              <div className="hidden lg:block">
              <Field label="Template">
                <select className={inputCls} value={tplOf(d.template).id} onChange={(e) => set('template', e.target.value)}>
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
                </select>
              </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="hidden lg:block">{paperField}</div>
                <div className="hidden lg:block">{orientButtons}</div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 min-h-[44px] sm:col-span-3">
                  <input type="checkbox" className="h-5 w-5" checked={d.bingkai} onChange={(e) => set('bingkai', e.target.checked)} /> Bingkai kotak di tepi kertas
                </label>
                <div className="hidden lg:block">{accentField}</div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penjual</h2>
              {txt('penjual', 'Nama usaha')}
              <div className="hidden lg:block">{fontField}</div>
              {txt('penjualAlamat', 'Alamat', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('penjualKontak', 'Telepon / email')}
                {txt('penjualNpwp', 'NPWP (opsional)')}
              </div>
              <ImageUpload label="Logo" value={d.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">{L.kepada}</h2>
              {txt('pembeli', 'Nama pembeli / perusahaan')}
              {txt('pembeliAlamat', 'Alamat', 2)}
              {txt('pembeliKontak', 'Telepon / email')}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {txt('nomor', L.nomor)}
                <Field label="Tanggal"><input type="date" className={inputCls} value={d.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Jatuh tempo"><input type="date" className={inputCls} value={d.jatuhTempo} onChange={(e) => set('jatuhTempo', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Barang / Jasa</h2>
              {d.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-2">
                    <AutoTextarea aria-label={`Deskripsi baris ${i + 1}`} placeholder="Deskripsi" className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} />
                    <button type="button" onClick={() => set('items', d.items.filter((_, j) => j !== i))} disabled={d.items.length === 1}
                      aria-label={`Hapus baris ${i + 1}`} className="px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Field label="Qty"><input type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                    <Field label="Satuan"><AutoTextarea className={inputCls} value={it.satuan} onChange={(e) => setItem(i, { satuan: e.target.value })} /></Field>
                    <Field label="Harga"><input type="number" min={0} className={inputCls} value={it.harga} onChange={(e) => setItem(i, { harga: e.target.value })} /></Field>
                    <Field label="Disc %"><input type="number" min={0} max={100} className={inputCls} value={it.diskon} onChange={(e) => setItem(i, { diskon: e.target.value })} /></Field>
                  </div>
                  <div className="text-right text-sm text-gray-600">Jumlah: <b>Rp {rupiah(c.lines[i])}</b></div>
                </div>
              ))}
              <button type="button" onClick={() => set('items', [...d.items, blankItem()])} className="text-sm font-medium text-blue-700">+ Tambah baris</button>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Potongan (Rp)"><input type="number" min={0} className={inputCls} value={d.potongan} onChange={(e) => set('potongan', e.target.value)} /></Field>
                <Field label="PPN %"><input type="number" min={0} className={inputCls} value={d.ppn} onChange={(e) => set('ppn', e.target.value)} /></Field>
                <Field label="Ongkir (Rp)"><input type="number" min={0} className={inputCls} value={d.ongkir} onChange={(e) => set('ongkir', e.target.value)} /></Field>
              </div>
              <div className="text-right font-bold">Total: Rp {rupiah(c.total)}</div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pembayaran, Catatan &amp; Tanda Tangan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Metode bayar">
                  <select className={inputCls} value={d.metode} onChange={(e) => set('metode', e.target.value as Doc['metode'])}>
                    <option value="">Tidak ditampilkan</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Non-Tunai">Non-Tunai</option>
                  </select>
                </Field>
                {d.metode === 'Tunai' && (
                  <Field label={`Uang diterima (Rp)${num(d.diterima) > 0 ? ` • kembali Rp ${rupiah(Math.max(0, num(d.diterima) - c.total))}` : ''}`}>
                    <input type="number" min={0} className={inputCls} value={d.diterima} onChange={(e) => set('diterima', e.target.value)} />
                  </Field>
                )}
                {d.metode === 'Non-Tunai' && (
                  <Field label="Bayar lewat">
                    <select className={inputCls} value={d.nonTunai} onChange={(e) => set('nonTunai', e.target.value)}>
                      {['Transfer Bank', 'QRIS', 'Kartu Debit', 'Kartu Kredit', 'E-Wallet', 'Giro / Cek'].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                )}
              </div>
              {txt('pembayaran', 'Info pembayaran', 2)}
              {txt('catatan', 'Catatan', 2)}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 min-h-[44px]">
                <input type="checkbox" className="h-5 w-5" checked={d.terbilang} onChange={(e) => set('terbilang', e.target.checked)} /> Tampilkan terbilang
              </label>
              <div className="grid sm:grid-cols-3 gap-2">
                {txt('kota', 'Kota')}
                {txt('ttdNama', 'Nama penanda tangan')}
                {txt('ttdJabatan', 'Jabatan')}
              </div>
              <ImageUpload label="Tanda tangan" value={d.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={d.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <p className="text-xs text-gray-500">Semua isian &amp; gambar hanya disimpan di perangkat ini.</p>
            </section>
          </div>

          <FitPreview>
            <div ref={ref} className="w-max shadow-lg">
              <DocView d={{ ...d, logo: logo.src, ttd: ttd.src, stempel: stempel.src }} kind={kind} c={c} fs={fs} pad={pad} w={W} h={H} short={H < 600} />
            </div>
          </FitPreview>
        </div>

        {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          <TextSizeSlider value={d.skala} onChange={(v) => set('skala', v)} effective={k} />
          {posPad}
          {paperField}
          {orientButtons}
          {accentField}
          {fontField}
          <Field label="Template">
            <select className={inputCls} value={tplOf(d.template).id} onChange={(e) => set('template', e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
            </select>
          </Field>
        </div>

        {/* Tombol unduh di paling bawah */}
        <div className="flex flex-wrap justify-center gap-3 mt-6 mb-20">
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
          <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}

