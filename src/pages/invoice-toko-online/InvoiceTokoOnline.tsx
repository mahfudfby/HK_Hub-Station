import UserData from '../../shared/components/UserData';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import PositionPad, { fxOf, getOffset, type Offset, type Offsets } from '../../shared/components/PositionPad';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import DocOptions from '../../shared/components/DocOptions';
import { DOTTED, ExportButton, Field, ImageUpload, inputCls, mmToPx, signSpace, PAPERS, PAPER_GROUPS, paperOf, orient, useLetterExport, type Notify, type Paper } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { num, rupiah } from '../../shared/lib/money';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { cssFamily, useGoogleFonts, type WebFont } from '../../shared/lib/fonts';
import FormSection from '../../shared/components/FormSection';

// Custom Invoices Toko Online: nota pesanan gaya marketplace untuk toko online milik pengguna.
// Sengaja generik: tanpa logo/nama/alamat/NPWP marketplace mana pun; identitas diisi sendiri oleh penjual.

// ============================================================
// SECTION: Gaya (template) & font dokumen
// ============================================================
type Gaya = {
  id: string; name: string; desc: string; font: string;
  head: 'center' | 'left' | 'band'; // posisi logo / pita warna di atas
  box: 'shade' | 'outline' | 'tint'; // kotak data pembeli & ringkasan biaya
  table: 'lines' | 'grid' | 'zebra';
  total: 'plain' | 'accent';
  ink?: boolean; // hitam-putih: abaikan warna aksen
};
const SANS = 'Arimo, Arial, sans-serif';
const HUMANIST = 'Carlito, Calibri, Arimo, sans-serif';
const SERIF = 'Tinos, "Times New Roman", serif';
const MONO = 'Cousine, "Courier New", monospace';
const GAYA: Gaya[] = [
  { id: 'marketplace', name: 'Marketplace', desc: 'Logo tengah, kotak abu-abu', font: SANS, head: 'center', box: 'shade', table: 'lines', total: 'plain' },
  { id: 'kiri', name: 'Logo Kiri', desc: 'Logo kiri, total berwarna', font: SANS, head: 'left', box: 'shade', table: 'lines', total: 'accent' },
  { id: 'pita', name: 'Pita Warna', desc: 'Pita aksen di atas, tabel belang', font: SANS, head: 'band', box: 'tint', table: 'zebra', total: 'accent' },
  { id: 'garis', name: 'Bergaris', desc: 'Kotak bergaris, tabel kisi', font: SANS, head: 'left', box: 'outline', table: 'grid', total: 'plain', ink: true },
  { id: 'lembut', name: 'Lembut', desc: 'Carlito, warna lembut', font: HUMANIST, head: 'center', box: 'tint', table: 'zebra', total: 'accent' },
  { id: 'resmi', name: 'Resmi', desc: 'Serif, hitam-putih', font: SERIF, head: 'center', box: 'outline', table: 'lines', total: 'plain', ink: true },
  { id: 'kasir', name: 'Kasir', desc: 'Huruf ketik, cocok dot-matrix', font: MONO, head: 'left', box: 'outline', table: 'grid', total: 'plain', ink: true },
  { id: 'modern', name: 'Modern', desc: 'Logo kiri, pita & total berwarna', font: HUMANIST, head: 'band', box: 'shade', table: 'lines', total: 'accent' },
];
const gayaOf = (id: string) => GAYA.find((g) => g.id === id) ?? GAYA[0];

// Font dokumen pilihan pengguna ('' = ikut gaya). Google Fonts dimuat saat dipilih.
const DOC_FONTS: { id: string; label: string; css: string; web?: WebFont }[] = [
  { id: 'arimo', label: 'Arimo (Arial/Helvetica)', css: SANS },
  { id: 'carlito', label: 'Carlito (Calibri)', css: HUMANIST },
  { id: 'tinos', label: 'Tinos (Times)', css: SERIF },
  { id: 'cousine', label: 'Cousine (mesin ketik)', css: MONO },
  { id: 'roboto', label: 'Roboto', css: cssFamily('Roboto'), web: { family: 'Roboto', weights: [400, 700] } },
  { id: 'opensans', label: 'Open Sans', css: cssFamily('Open Sans'), web: { family: 'Open Sans', weights: [400, 700] } },
  { id: 'lato', label: 'Lato', css: cssFamily('Lato'), web: { family: 'Lato', weights: [400, 700] } },
  { id: 'poppins', label: 'Poppins', css: cssFamily('Poppins'), web: { family: 'Poppins', weights: [400, 700] } },
];

type PaperId = string; // kunci dari PAPERS bersama (LetterKit)

// ============================================================
// SECTION: Data
// ============================================================
type Item = { produk: string; variasi: string; harga: string; qty: string };
type Nota = {
  gaya: string; font: string; paper: PaperId; landscape: boolean; accent: string; skala: number; posisi: Offsets;
  logo: string; logoTeks: string; judul: string;
  pembeli: string; penjual: string; alamat: string; hp: string;
  noPesanan: string; tanggal: string; metode: string; kurir: string;
  items: Item[];
  ongkir: string; biayaLayanan: string; proteksi: string; biayaLainLabel: string; biayaLain: string; diskonLabel: string; diskon: string;
  catatanBiaya: string; infoToko: string; catatan: string;
  ttdNama: string; ttd: string; stempel: string;
  pakaiNomor: boolean; kosong: boolean; // sakelar tampilan (bukan Data User)
};
const STORAGE_KEY = 'toko-online:v1';
const today = () => new Date().toISOString().slice(0, 10);
const blankItem = (): Item => ({ produk: '', variasi: '', harga: '', qty: '1' });
const NO_FMT = '{yyyy}{n4}{A3}';
const DEFAULT: Nota = {
  gaya: 'marketplace', font: '', paper: 'A4', landscape: false, accent: '#E4572E', skala: 100, posisi: {},
  logo: '', logoTeks: 'TOKO ANDA', judul: 'Nota Pesanan',
  pembeli: 'Nama Pembeli', penjual: 'nama_toko_anda', alamat: 'Alamat lengkap pembeli, Kecamatan, Kota, Provinsi, Kode Pos', hp: '0812xxxxxxxx',
  noPesanan: randomDocNo(NO_FMT), tanggal: today(), metode: 'Transfer Bank', kurir: 'Reguler',
  items: [
    { produk: 'Contoh produk pertama', variasi: 'Merah, L', harga: '45000', qty: '2' },
    { produk: 'Contoh produk kedua dengan nama yang cukup panjang', variasi: 'Isi 6', harga: '12500', qty: '3' },
  ],
  ongkir: '', biayaLayanan: '2000', proteksi: '', biayaLainLabel: '', biayaLain: '', diskonLabel: 'Diskon Voucher', diskon: '4000',
  catatanBiaya: 'Biaya-biaya yang ditagihkan sudah termasuk PPN (jika ada).',
  infoToko: 'Nama Usaha Anda\nAlamat usaha, Kota\nTelp. 0812-0000-0000',
  catatan: '',
  ttdNama: '', ttd: '', stempel: '',
  pakaiNomor: true, kosong: false,
};

function calc(n: Nota) {
  const lines = n.items.map((it) => num(it.qty) * num(it.harga));
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const qty = n.items.reduce((a, it) => a + num(it.qty), 0);
  const total = subtotal + num(n.ongkir) + num(n.biayaLayanan) + num(n.proteksi) + num(n.biayaLain) - num(n.diskon);
  return { lines, subtotal, qty, total: Math.max(0, total) };
}
{
  const c = calc(DEFAULT); // 2×45000 + 3×12500 = 127500; +2000 −4000 = 125500
  console.assert(c.subtotal === 127500 && c.qty === 5 && c.total === 125500, 'calc toko online');
}

// ============================================================
// SECTION: Tampilan dokumen (semua style inline agar html2canvas akurat)
// ============================================================
const GRAY_BOX = '#f5f5f5';
const LINE = '#e0e0e0';

function Logo({ n, fs, color, o }: { n: Nota; fs: number; color: string; o: Offset }) {
  const { z, a } = fxOf(o, 'logo');
  const h = fs * 6 * z;
  return (
    // relative: geser logo tanpa menggeser isi lain
    <span style={{ display: 'inline-flex', position: 'relative', left: o.x, top: o.y, opacity: a }}>
      {n.logo
        ? <img src={n.logo} alt="Logo" style={{ height: h, maxWidth: h * 4, objectFit: 'contain' }} />
        : <span style={{ fontWeight: 800, fontSize: fs * 2.4 * z, color, lineHeight: 1.1 }}>{n.logoTeks || 'LOGO'}</span>}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span style={{ fontWeight: 700 }}>{children}</span>;
}

function NotaView({ n, c, fs, w, h, pad }: { n: Nota; c: ReturnType<typeof calc>; fs: number; w: number; h: number; pad: number }) {
  const g = gayaOf(n.gaya);
  const font = DOC_FONTS.find((f) => f.id === n.font)?.css ?? g.font;
  const accent = g.ink ? '#000' : n.accent;
  const boxStyle: CSSProperties = g.box === 'shade' ? { background: GRAY_BOX }
    : g.box === 'tint' ? { background: `${n.accent}14`, border: `1px solid ${n.accent}40` }
    : { border: '1.5px solid #000' };
  const gap = fs * 1.4;
  const cell: CSSProperties = { padding: `${fs * 0.45}px ${fs * 0.4}px`, verticalAlign: 'middle', fontSize: fs * 0.9 };
  const border = g.table === 'grid' ? '1px solid #000' : undefined;
  const fx = { ttd: fxOf(getOffset(n.posisi, 'ttd'), 'ttd'), stempel: fxOf(getOffset(n.posisi, 'stempel'), 'stempel') };
  const oT = getOffset(n.posisi, 'ttd');
  const oS = getOffset(n.posisi, 'stempel');
  const signH = signSpace(fs * 5);
  // Template kosongan: data pesanan jadi garis titik-titik untuk ditulis tangan
  const ks = n.kosong;
  const blank = (w = '100%') => <span style={{ display: 'inline-block', width: w, height: fs * 1.6, borderBottom: DOTTED, verticalAlign: 'bottom' }} />;
  const rp = (v: number, w = `${fs * 8}px`) => (ks ? <>Rp{blank(w)}</> : `${v < 0 ? '-' : ''}Rp${rupiah(Math.abs(v))}`);
  // No. pesanan tanpa pemisah → kosongan berupa garis selebar kolom
  const noPesanan = n.pakaiNomor ? (ks ? blank(`${fs * 9}px`) : n.noPesanan) : undefined;
  const rows = ks ? Array.from({ length: fs < 11 ? 5 : 8 }, () => null) : n.items;

  return (
    <div style={{ width: w, height: h, overflow: 'hidden', boxSizing: 'border-box', padding: pad, background: '#fff', color: '#111', fontFamily: font, fontSize: fs, lineHeight: 1.35, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Kop */}
      {g.head === 'band' && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: fs * 0.8, background: accent }} />}
      <div style={{ textAlign: g.head === 'center' ? 'center' : 'left', marginTop: g.head === 'band' ? fs : 0, marginBottom: fs * 0.8 }}>
        <Logo n={n} fs={fs} color={accent} o={getOffset(n.posisi, 'logo')} />
      </div>
      <div style={{ fontSize: fs * 1.35, marginBottom: fs * 0.9, color: g.head === 'band' ? accent : undefined, fontWeight: g.head === 'band' ? 700 : 400 }}>{n.judul}</div>

      {/* Pembeli & penjual */}
      <div style={{ ...boxStyle, padding: `${fs * 1.1}px ${fs * 1.4}px`, marginBottom: gap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: fs, marginBottom: fs * 0.6 }}>
          <div style={{ flex: 1, minWidth: 0 }}><Label>Nama Pembeli:</Label> {ks ? blank('55%') : n.pembeli}</div>
          <div style={{ maxWidth: '45%', textAlign: 'right' }}><Label>Nama Penjual:</Label> {n.penjual}</div>
        </div>
        <div style={{ marginBottom: fs * 0.6 }}>
          <div><Label>Alamat Pembeli:</Label></div>
          {ks ? <>{blank()}{blank()}</> : <div>{n.alamat}</div>}
        </div>
        <div><Label>No. Handphone Pembeli:</Label> {ks ? blank('40%') : n.hp}</div>
      </div>

      {/* Info pesanan */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: fs * 1.2, marginBottom: gap, padding: `0 ${fs * 0.4}px` }}>
        {[...(noPesanan !== undefined ? [['No. Pesanan', noPesanan] as const] : []), ['Tanggal Transaksi', ks ? '……/……/20……' : n.tanggal ? new Date(`${n.tanggal}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''], ['Metode Pembayaran', n.metode], ['Jasa Kirim', n.kurir]].map(([l, v], i, all) => (
          <div key={l} style={{ minWidth: 0, textAlign: i === all.length - 1 ? 'right' : 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: fs * 0.3 }}>{l}</div>
            <div style={{ overflowWrap: 'anywhere' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Rincian pesanan */}
      <div style={{ fontWeight: 700, marginBottom: fs * 0.4, padding: `0 ${fs * 0.2}px` }}>Rincian Pesanan</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: fs * 0.8 }}>
        <colgroup><col style={{ width: '6%' }} /><col style={{ width: '38%' }} /><col style={{ width: '16%' }} /><col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '16%' }} /></colgroup>
        <thead>
          <tr style={{ borderTop: border ?? `1px solid ${LINE}`, borderBottom: border ?? `1px solid ${LINE}`, ...(g.table === 'zebra' && { background: `${accent}1f` }) }}>
            {['No.', 'Produk', 'Variasi', 'Harga Produk', 'Kuantitas', 'Subtotal'].map((t, i) => (
              <th key={t} style={{ ...cell, fontWeight: 400, textAlign: i < 3 ? 'left' : i === 4 ? 'center' : 'right', border }}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((it, i) => (
            // Template kosongan: baris kosong bergaris (garis bawah tiap baris) setinggi tulisan tangan
            <tr key={i} style={{ ...(g.table === 'zebra' && i % 2 === 1 && { background: GRAY_BOX }), ...((ks || i === rows.length - 1) && !border && { borderBottom: `1px solid ${ks ? '#999' : LINE}` }), ...(ks && { height: fs * 2.2 }) }}>
              <td style={{ ...cell, border }}>{it && i + 1}</td>
              <td style={{ ...cell, border, overflowWrap: 'anywhere' }}>{it?.produk}</td>
              <td style={{ ...cell, border, overflowWrap: 'anywhere' }}>{it?.variasi}</td>
              <td style={{ ...cell, border, textAlign: 'right', whiteSpace: 'nowrap' }}>{it && `Rp${rupiah(num(it.harga))}`}</td>
              <td style={{ ...cell, border, textAlign: 'center' }}>{it && num(it.qty)}</td>
              <td style={{ ...cell, border, textAlign: 'right', whiteSpace: 'nowrap' }}>{it && `Rp${rupiah(c.lines[i])}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: gap * 1.4, paddingRight: fs * 0.4 }}>
        <div style={{ textAlign: 'left', minWidth: '30%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: fs * 3, fontWeight: 700, fontSize: fs * 1.1 }}><span>Subtotal</span><span style={{ whiteSpace: 'nowrap' }}>{rp(c.subtotal)}</span></div>
          <div style={{ fontWeight: 700, fontSize: fs * 0.85 }}>Total Kuantitas {ks ? '……' : c.qty} produk</div>
        </div>
      </div>

      {/* Ringkasan biaya */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '48%' }}>
          <div style={{ ...boxStyle, padding: `${fs * 1.2}px ${fs * 1.6}px`, fontSize: fs * 0.9 }}>
            {/* Daftar tetap: kosong tetap tampil Rp0; hanya "biaya lain" yang muncul bila diisi */}
            {[
              ['Subtotal Pesanan', c.subtotal, true],
              ['Ongkos Kirim', num(n.ongkir), true],
              ['Biaya Layanan', num(n.biayaLayanan), true],
              ['Proteksi Produk', num(n.proteksi), true],
              [n.biayaLainLabel || 'Biaya Lain', num(n.biayaLain), !!n.biayaLain && !ks],
              [n.diskonLabel || 'Diskon Voucher', -num(n.diskon), true],
            ].filter((r) => r[2]).map(([l, v]) => (
              <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: fs * 0.65 }}>
                <span>{l}</span><span style={{ whiteSpace: 'nowrap' }}>{rp(v as number)}</span>
              </div>
            ))}
            <div style={{ borderTop: `1.5px solid ${LINE}`, marginTop: fs * 0.35, paddingTop: fs * 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 700 }}>
              <span style={{ fontSize: fs * 1.1 }}>Total Pembayaran</span>
              <span style={{ fontSize: fs * 1.45, whiteSpace: 'nowrap', color: g.total === 'accent' ? accent : undefined }}>{rp(c.total)}</span>
            </div>
          </div>
          {n.catatanBiaya && <div style={{ marginTop: fs * 0.4 }}>{n.catatanBiaya}</div>}
        </div>
      </div>

      {/* Info toko (kiri) & tanda tangan (kanan, opsional) */}
      {/* Jarak elastis ke tanda tangan: lega bila isi pendek, menyusut (tidak keluar kertas) bila isi panjang */}
      <div aria-hidden="true" style={{ flex: `0 1 ${fs * 4}px`, minHeight: fs }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: fs }}>
        <div style={{ maxWidth: '50%' }}>
          {n.infoToko && <div>{n.infoToko}</div>}
          {n.catatan && <div style={{ marginTop: fs * 0.6, fontSize: fs * 0.9 }}>{n.catatan}</div>}
        </div>
        {(n.ttd || n.stempel || n.ttdNama) && (
          <div style={{ textAlign: 'right', minWidth: fs * 12, marginLeft: 'auto' }}>
            <div style={{ position: 'relative', height: signH }}>
              {n.stempel && <img src={n.stempel} alt="Stempel" style={{ position: 'absolute', left: oS.x, top: oS.y, height: signH * fx.stempel.z, opacity: fx.stempel.a, mixBlendMode: 'multiply' }} />}
              {n.ttd && <img src={n.ttd} alt="Tanda tangan" style={{ position: 'absolute', right: -oT.x, top: (signH - signH * 0.85 * fx.ttd.z) / 2 + oT.y, height: signH * 0.85 * fx.ttd.z, maxWidth: fs * 14 * fx.ttd.z, opacity: fx.ttd.a, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
            </div>
            {n.ttdNama && <div style={{ fontWeight: 700 }}>{n.ttdNama}</div>}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: pad * 0.6, textAlign: 'center', fontSize: fs * 0.85 }}>Halaman 1 dari 1</div>
    </div>
  );
}

// ============================================================
// SECTION: Editor
// ============================================================
export default function InvoiceTokoOnline() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [n, setN] = useState<Nota>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved, noPesanan: orRandomNo(saved.noPesanan, NO_FMT) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [n, notify]);

  const [bg, setBg] = useState({ logo: false, ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(n.logo, bg.logo, bgError);
  const ttd = useBgRemoved(n.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(n.stempel, bg.stempel, bgError);
  const bgFor = (k: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[k], onBg: (v: boolean) => setBg((p) => ({ ...p, [k]: v })), shown: shown.src, bgBusy: shown.busy });
  useGoogleFonts([DOC_FONTS.find((f) => f.id === n.font)?.web]);

  const set = <K extends keyof Nota>(k: K, v: Nota[K]) => setN((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', n.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setN({ ...DEFAULT, noPesanan: randomDocNo(NO_FMT) });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const base = paperOf(n.paper);
  const paper: Paper = orient(base, n.landscape);
  const W = mmToPx(paper.w);
  const H = mmToPx(paper.h);
  const ref = useRef<HTMLDivElement>(null);
  const k = useFitScale(n.skala / 100, () => ref.current?.firstElementChild as HTMLElement, true, [n, W, H]);
  const minSide = Math.min(paper.w, paper.h);
  const short = minSide < 160;
  const tiny = minSide < 100; // thermal: huruf & margin kecil
  const fs = (tiny ? 7 : short ? 10 : 13) * k;
  const pad = tiny ? 10 : short ? 30 : 44;
  const c = calc(n);
  const fileName = `nota-pesanan-${(n.noPesanan || 'toko').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify, paper);
  const busy = logo.busy || ttd.busy || stempel.busy;

  const txt = (key: keyof Nota, label: string, rows = 1) => (
    <Field label={label}>
      <AutoTextarea rows={rows} className={inputCls} value={n[key] as string} onChange={(e) => set(key, e.target.value as never)} />
    </Field>
  );
  const money = (key: keyof Nota, label: string) => (
    <Field label={label}><input type="number" min={0} className={inputCls} value={n[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  const USER_KEYS = ['logo', 'posisi', 'logoTeks', 'judul', 'penjual', 'metode', 'kurir', 'biayaLayanan', 'proteksi', 'catatanBiaya', 'infoToko', 'catatan', 'ttdNama', 'ttd', 'stempel'] as const;
  const [canvas, setCanvas] = useCanvasMode();
  const [geser, setGeser] = useState('logo');
  const tampilan = (
    <>
      <DocOptions nomor={{ value: n.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: n.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={n.skala} onChange={(v) => set('skala', v)} effective={k} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={n.posisi} onChange={(v) => set('posisi', v)} />
      <Field label="Gaya">
        <select className={inputCls} value={gayaOf(n.gaya).id} onChange={(e) => set('gaya', e.target.value)}>
          {GAYA.map((g, i) => <option key={g.id} value={g.id}>{i + 1}. {g.name} — {g.desc}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Font dokumen">
          <select className={inputCls} value={n.font} onChange={(e) => set('font', e.target.value)}>
            <option value="">Ikut gaya</option>
            {DOC_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="Ukuran kertas">
          <select className={inputCls} value={n.paper} onChange={(e) => set('paper', e.target.value as PaperId)}>
            {PAPER_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {Object.entries(PAPERS).filter(([, p]) => p.group === g).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="flex gap-2" role="radiogroup" aria-label="Orientasi">
          {[false, true].map((ls) => (
            <button key={String(ls)} type="button" role="radio" aria-checked={n.landscape === ls} disabled={!!base.fixed} title={base.fixed ? 'Orientasi tetap untuk kertas ini' : undefined} onClick={() => set('landscape', ls)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${n.landscape === ls ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {ls ? 'Landscape' : 'Vertikal'}
            </button>
          ))}
        </div>
        <Field label="Warna aksen">
          <input type="color" aria-label="Warna aksen" className="h-[42px] w-full rounded-lg border border-gray-300 p-1" value={n.accent} onChange={(e) => set('accent', e.target.value)} />
        </Field>
      </div>
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Custom Invoices Toko Online</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:toko-online" keys={USER_KEYS} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} />

            <FormSection title="Toko">
              <ImageUpload label="Logo toko" value={n.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('logoTeks', 'Teks pengganti logo (bila tanpa gambar)')}
                {txt('judul', 'Judul dokumen')}
              </div>
              {txt('infoToko', 'Info toko di bawah (nama usaha, alamat, NPWP, dll.)', 3)}
            </FormSection>

            <FormSection title="Pembeli &amp; Penjual">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('pembeli', 'Nama pembeli')}
                {txt('penjual', 'Nama penjual / toko')}
              </div>
              {txt('alamat', 'Alamat pembeli', 2)}
              <Field label="No. handphone pembeli"><input type="tel" className={inputCls} value={n.hp} onChange={(e) => set('hp', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Pesanan">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('noPesanan', 'No. pesanan')}
                <Field label="Tanggal transaksi"><input type="date" className={inputCls} value={n.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {txt('metode', 'Metode pembayaran')}
                {txt('kurir', 'Jasa kirim')}
              </div>
            </FormSection>

            <FormSection title="Rincian Pesanan">
              {n.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-2">
                    <AutoTextarea aria-label={`Produk ${i + 1}`} placeholder="Nama produk" className={inputCls} value={it.produk} onChange={(e) => setItem(i, { produk: e.target.value })} />
                    <button type="button" onClick={() => set('items', n.items.filter((_, j) => j !== i))} disabled={n.items.length === 1}
                      aria-label={`Hapus produk ${i + 1}`} className="px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Variasi"><AutoTextarea className={inputCls} value={it.variasi} onChange={(e) => setItem(i, { variasi: e.target.value })} /></Field>
                    <Field label="Harga"><input type="number" min={0} className={inputCls} value={it.harga} onChange={(e) => setItem(i, { harga: e.target.value })} /></Field>
                    <Field label="Kuantitas"><input type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                  </div>
                  <div className="text-right text-sm text-gray-600">Subtotal: <b>Rp{rupiah(c.lines[i])}</b></div>
                </div>
              ))}
              <button type="button" onClick={() => set('items', [...n.items, blankItem()])} className="text-sm font-medium text-blue-700">+ Tambah produk</button>
            </FormSection>

            <FormSection title="Biaya &amp; Total">
              <div className="grid grid-cols-2 gap-2">
                {money('ongkir', 'Ongkos kirim (Rp)')}
                {money('biayaLayanan', 'Biaya layanan (Rp)')}
                {money('proteksi', 'Proteksi produk (Rp)')}
                <div />
                {txt('biayaLainLabel', 'Nama biaya lain')}
                {money('biayaLain', 'Biaya lain (Rp)')}
                {txt('diskonLabel', 'Nama diskon / voucher')}
                {money('diskon', 'Diskon (Rp, dikurangkan)')}
              </div>
              <div className="text-right font-bold">Total Pembayaran: Rp{rupiah(c.total)}</div>
              {txt('catatanBiaya', 'Keterangan di bawah total', 2)}
              {txt('catatan', 'Catatan lain (opsional)', 2)}
            </FormSection>

            <FormSection title="Tanda Tangan &amp; Stempel (opsional)">
              {txt('ttdNama', 'Nama di bawah tanda tangan')}
              <ImageUpload label="Tanda tangan" value={n.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={n.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <p className="text-xs text-gray-500">Semua isian &amp; gambar hanya disimpan di perangkat ini.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={ref} className="w-max shadow-lg">
              <NotaView n={{ ...n, logo: logo.src, ttd: n.kosong ? '' : ttd.src, stempel: n.kosong ? '' : stempel.src }} c={c} fs={fs} w={W} h={H} pad={pad} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
