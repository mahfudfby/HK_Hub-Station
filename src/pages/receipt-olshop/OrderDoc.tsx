import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import UserData from '../../shared/components/UserData';
import SharedGallery from '../../shared/components/SharedGallery';
import DocOptions, { nomorTampil } from '../../shared/components/DocOptions';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import PositionPad, { fxOf, getOffset, type Offsets } from '../../shared/components/PositionPad';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, mmToPx, orient, paperOf, signSpace, useLetterExport, type Notify, type Paper } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { num, rupiah } from '../../shared/lib/money';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import FormSection from '../../shared/components/FormSection';
import KontakFields from '../../shared/components/KontakFields';

// Bahan bersama dua menu berdiri sendiri: Invoice Toko Online (/invoice-olshop) & Receipt Pesanan Toko Online (/receipt-olshop).
// Dokumen milik penjual sendiri: identitas toko (logo + nama) diisi pengguna; tanpa merek/logo marketplace mana pun.
// Tiap menu punya form, penyimpanan, Data User & 20 template sendiri; hanya mesin tampilan & editor yang dipakai bersama.

// ============================================================
// SECTION: Template (tata letak, bukan sekadar warna/font)
// ============================================================
type Head = 'left' | 'right' | 'center' | 'band' | 'side' | 'split'; // kop: logo kiri/kanan/tengah, pita warna, bilah samping, dua kotak
type Table = 'grid' | 'zebra' | 'lines' | 'compact' | 'cards'; // tabel produk
type Sum = 'right' | 'box' | 'bar'; // ringkasan: kolom kanan, kotak penuh, bilah total terbalik
type Pay = 'list' | 'box' | 'cols'; // blok pembayaran: daftar, kotak, kartu berjajar
type Box = 'none' | 'line' | 'tint'; // kotak data pembeli
export type Tpl = { id: string; name: string; font: string; head: Head; table: Table; sum: Sum; pay: Pay; box: Box; ink?: boolean };

export const SANS = 'Arimo, Arial, sans-serif';
export const HUMANIST = 'Carlito, Calibri, Arimo, sans-serif';
export const SERIF = 'Tinos, "Times New Roman", serif';
export const MONO = 'Cousine, "Courier New", monospace';
export const tpl = (id: string, name: string, font: string, head: Head, table: Table, sum: Sum, pay: Pay, box: Box, ink = false): Tpl =>
  ({ id, name, font, head, table, sum, pay, box, ink });
export const checkTemplates = (list: Tpl[], tag: string) =>
  console.assert(list.length === 20 && new Set(list.map((t) => t.id)).size === 20
    && new Set(list.map((t) => [t.head, t.table, t.sum, t.pay, t.box, t.ink, t.font].join())).size === 20, `20 template unik ${tag}`);

// ============================================================
// SECTION: Data & hitungan
// ============================================================
export type Item = { produk: string; varian: string; sku: string; berat: string; qty: string; harga: string };
type Pot = { label: string; nilai: string };
type Rek = { bank: string; norek: string; atasNama: string };
type Bayar = { metode: string; nilai: string };
export type Doc = {
  gaya: string; paper: string; landscape: boolean; accent: string; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; toko: string; alamatToko: string; kontakToko: string;
  judul: string; nomor: string; tanggal: string; jatuhTempo: string; status: string;
  pembeli: string; penerima: string; telp: string; alamat: string; kurir: string; resi: string;
  items: Item[]; potongan: Pot[]; ongkir: string; asuransi: string; biayaLayanan: string;
  rekening: Rek[]; ewallet: string; bayar: Bayar[];
  catatan: string; catatanKecil: string; penutup: string;
  ttdNama: string; ttd: string; stempel: string;
};
export type Kind = 'invoice' | 'receipt';
export type Cfg = { kind: Kind; slug: string; title: string; noFmt: string; noLabel: string; templates: Tpl[]; defaults: Doc };

const blankItem = (): Item => ({ produk: '', varian: '', sku: '', berat: '', qty: '1', harga: '' });
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Isian contoh bersama (toko & pembeli rekaan, netral)
export const BASE: Doc = {
  gaya: '', paper: 'A4', landscape: false, accent: '#1F6FB2', skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', toko: 'Toko Sinar Jaya Online', alamatToko: 'Jl. Melati No. 12, Kel. Sukamaju, Kota Bandung 40123', kontakToko: 'WA 0812-3456-7890 • sinarjaya.online@email.com',
  judul: '', nomor: '', tanggal: today(), jatuhTempo: plusDays(3), status: 'BELUM DIBAYAR',
  pembeli: 'Budi Santoso', penerima: 'Budi Santoso', telp: '0813-1111-2222', alamat: 'Jl. Kenanga No. 5 RT 02/RW 04, Kec. Cempaka, Kota Semarang, Jawa Tengah 50111', kurir: 'Reguler', resi: '',
  items: [
    { produk: 'Kaos Polos Katun Combed 30s', varian: 'Hitam, L', sku: 'KP-30S-HTM-L', berat: '200 g', qty: '2', harga: '45000' },
    { produk: 'Tas Selempang Kanvas', varian: 'Krem', sku: 'TS-KNV-KRM', berat: '350 g', qty: '1', harga: '89000' },
  ],
  potongan: [{ label: 'Voucher Toko', nilai: '10000' }],
  ongkir: '18000', asuransi: '1500', biayaLayanan: '1000',
  rekening: [{ bank: 'Bank BCA', norek: '123 456 7890', atasNama: 'Sinar Jaya' }, { bank: 'Bank Mandiri', norek: '987 000 1234 567', atasNama: 'Sinar Jaya' }],
  ewallet: 'E-wallet / QRIS: 0812-3456-7890 a.n. Sinar Jaya',
  bayar: [{ metode: 'Transfer Bank', nilai: '' }],
  catatan: '', catatanKecil: '', penutup: '',
  ttdNama: '', ttd: '', stempel: '',
};

export function calc(d: Doc) {
  const lines = d.items.map((it) => num(it.qty) * num(it.harga));
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const qty = d.items.reduce((a, it) => a + num(it.qty), 0);
  const potongan = d.potongan.reduce((a, p) => a + num(p.nilai), 0);
  const belanja = Math.max(0, subtotal - potongan + num(d.ongkir) + num(d.asuransi));
  return { lines, subtotal, qty, potongan, belanja, tagihan: belanja + num(d.biayaLayanan) };
}
{
  const c = calc(BASE); // 2×45000 + 89000 = 179000; −10000 +18000 +1500 = 188500; +1000 = 189500
  console.assert(c.subtotal === 179000 && c.qty === 3 && c.belanja === 188500 && c.tagihan === 189500, 'calc olshop');
  console.assert(calc({ ...BASE, potongan: [{ label: '', nilai: '999999' }] }).belanja === 0, 'calc olshop tidak minus');
}

// ============================================================
// SECTION: Tampilan dokumen (style inline, html2canvas-safe: warna solid, border, flex)
// ============================================================
const LINE = '#d9d9d9';
const MUTED = '#666';

function OrderView({ d, cfg, c, fs, w, h, pad }: { d: Doc; cfg: Cfg; c: ReturnType<typeof calc>; fs: number; w: number; h: number; pad: number }) {
  const t = cfg.templates.find((x) => x.id === d.gaya) ?? cfg.templates[0];
  const inv = cfg.kind === 'invoice';
  const K = d.kosong;
  const A = t.ink ? '#111' : d.accent;
  const RED = t.ink ? '#111' : '#D32F2F';
  const small = fs * 0.8;
  const gap = fs * 1.1;
  const rp = (v: number) => (K ? '' : `${v < 0 ? '-' : ''}Rp${rupiah(Math.abs(v))}`);
  const nomor = nomorTampil(d.nomor, d.pakaiNomor, K);
  const sideW = t.head === 'side' ? fs * 2.2 : 0;
  const ruled = (n = 1) => Array.from({ length: n }, (_, i) => <div key={i} style={{ borderBottom: '1px dotted #000', height: fs * 1.45 }} />);
  const val = (s: string, n = 1) => (K ? ruled(n) : s);
  const cap = (s: string) => <div style={{ fontSize: small, fontWeight: 700, color: t.ink ? '#111' : A, letterSpacing: 0.6, marginBottom: fs * 0.2 }}>{s}</div>;
  const boxCss: CSSProperties = t.box === 'line' ? { border: `1px solid ${t.ink ? '#111' : LINE}`, borderRadius: fs * 0.3, padding: `${fs * 0.7}px ${fs * 0.9}px` }
    : t.box === 'tint' ? { background: t.ink ? '#f1f1f1' : `${A}14`, borderRadius: fs * 0.3, padding: `${fs * 0.7}px ${fs * 0.9}px` } : {};

  // ---------- Kop ----------
  const oL = getOffset(d.posisi, 'logo');
  const fxL = fxOf(oL, 'logo');
  const logo = d.logo
    ? <img src={d.logo} alt="Logo" style={{ position: 'relative', left: oL.x, top: oL.y, height: fs * 4.2 * fxL.z, maxWidth: fs * 12 * fxL.z, objectFit: 'contain', opacity: fxL.a, flexShrink: 0 }} />
    : null;
  const toko = (align: 'left' | 'right' | 'center', color?: string) => (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: fs * 1.25, lineHeight: 1.2, color }}>{d.toko}</div>
      {d.alamatToko && <div style={{ fontSize: small }}>{d.alamatToko}</div>}
      {d.kontakToko && <div style={{ fontSize: small }}>{d.kontakToko}</div>}
    </div>
  );
  const stamp = inv && !K && d.status ? (() => {
    const col = t.ink ? '#111' : d.status === 'LUNAS' ? '#2E7D32' : '#C62828';
    return <div style={{ display: 'inline-block', marginTop: fs * 0.4, padding: `${fs * 0.15}px ${fs * 0.7}px`, border: `2px solid ${col}`, borderRadius: fs * 0.3, color: col, background: '#fff', fontWeight: 800, fontSize: fs * 0.95, letterSpacing: 1 }}>{d.status}</div>;
  })() : null;
  const title = (align: 'left' | 'right' | 'center', color?: string) => (
    <div style={{ textAlign: align, flexShrink: 0, maxWidth: '50%' }}>
      <div style={{ fontWeight: 800, fontSize: fs * 1.65, letterSpacing: 1, lineHeight: 1.15, color }}>{d.judul}</div>
      {nomor !== undefined && <div style={{ fontSize: fs * 0.9, marginTop: fs * 0.2 }}>{cfg.noLabel}: <b>{nomor}</b></div>}
      {stamp}
    </div>
  );
  const row = (a: ReactNode, b: ReactNode, extra?: CSSProperties) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: fs, ...extra }}>{a}{b}</div>
  );
  const brand = (align: 'left' | 'right', color?: string) => (
    <div style={{ display: 'flex', flexDirection: align === 'right' ? 'row-reverse' : 'row', alignItems: 'center', gap: fs * 0.8, minWidth: 0 }}>{logo}{toko(align, color)}</div>
  );
  const head = {
    left: row(brand('left'), title('right', A), { borderBottom: `2px solid ${A}`, paddingBottom: fs * 0.8 }),
    right: row(title('left', A), brand('right'), { borderBottom: `1px solid ${LINE}`, paddingBottom: fs * 0.8 }),
    center: (
      <div style={{ textAlign: 'center', borderBottom: `3px double ${A}`, paddingBottom: fs * 0.7 }}>
        {logo && <div style={{ marginBottom: fs * 0.4 }}>{logo}</div>}
        {toko('center')}
        <div style={{ marginTop: fs * 0.6 }}>{title('center', A)}</div>
      </div>
    ),
    band: (
      <div style={{ margin: `${-pad}px ${-pad}px 0`, padding: `${pad * 0.7}px ${pad}px`, background: A, color: '#fff' }}>
        {row(brand('left', '#fff'), title('right', '#fff'))}
      </div>
    ),
    side: (
      <div>
        <div style={{ fontWeight: 800, fontSize: fs * 2, color: A, letterSpacing: 2, borderBottom: `2px solid ${A}`, marginBottom: fs * 0.6 }}>{d.judul}</div>
        {row(brand('left'), <div style={{ textAlign: 'right', flexShrink: 0 }}>{nomor !== undefined && <div style={{ fontSize: fs * 0.9 }}>{cfg.noLabel}<br /><b>{nomor}</b></div>}{stamp}</div>)}
      </div>
    ),
    split: (
      <div style={{ display: 'flex', gap: fs * 0.6, alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0, border: `1px solid ${t.ink ? '#111' : LINE}`, borderRadius: fs * 0.3, padding: fs * 0.7, display: 'flex', alignItems: 'center' }}>{brand('left')}</div>
        <div style={{ width: '40%', background: A, color: '#fff', borderRadius: fs * 0.3, padding: fs * 0.7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: fs * 1.5, letterSpacing: 1 }}>{d.judul}</div>
            {nomor !== undefined && <div style={{ fontSize: fs * 0.85 }}>{cfg.noLabel}: <b>{nomor}</b></div>}
            {stamp}
          </div>
        </div>
      </div>
    ),
  }[t.head];

  // ---------- Pihak & info ----------
  const kv = (l: string, v: string) => (
    <div key={l} style={{ display: 'flex', gap: fs * 0.5, marginBottom: fs * 0.15 }}>
      <span style={{ minWidth: fs * 8.5, color: MUTED }}>{l}</span><span style={{ flex: 1, fontWeight: 600, overflowWrap: 'anywhere' }}>{K ? ruled() : v}</span>
    </div>
  );
  const pihak = inv ? (
    <div style={{ display: 'flex', gap: fs * 1.4 }}>
      <div style={{ flex: 1, minWidth: 0, ...boxCss }}>
        {cap('DITAGIHKAN KEPADA')}
        <div style={{ fontWeight: 700 }}>{val(d.pembeli)}</div>
        <div>{val(d.telp)}</div>
        <div style={{ overflowWrap: 'anywhere' }}>{val(d.alamat, 2)}</div>
      </div>
      <div style={{ width: '44%', ...boxCss }}>
        {cap('DETAIL INVOICE')}
        {kv('Tanggal Invoice', fmtTanggal(d.tanggal))}
        {kv('Jatuh Tempo', fmtTanggal(d.jatuhTempo))}
        {kv('Pengiriman', d.kurir)}
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: fs * 1.4 }}>
      <div style={{ flex: 1, minWidth: 0, ...boxCss }}>
        {cap('DITERBITKAN ATAS NAMA')}
        <div style={{ marginBottom: fs * 0.4 }}>Penjual: <b>{d.toko}</b></div>
        {cap('UNTUK')}
        {kv('Pembeli', d.pembeli)}
        {kv('Tanggal Pembelian', fmtTanggal(d.tanggal))}
        {(K || d.kurir) && kv('Kurir', d.kurir)}
        {(K || d.resi) && kv('No. Resi', d.resi)}
      </div>
      <div style={{ width: '46%', ...boxCss }}>
        {cap('ALAMAT PENGIRIMAN')}
        <div style={{ fontWeight: 700 }}>{val(d.penerima)}</div>
        <div>{val(d.telp)}</div>
        <div style={{ overflowWrap: 'anywhere' }}>{val(d.alamat, 2)}</div>
      </div>
    </div>
  );

  // ---------- Tabel produk ----------
  const items = K ? Array.from({ length: Math.max(5, d.items.length) }, blankItem) : d.items;
  const lineOf = (i: number) => (K ? '' : rp(c.lines[i]));
  const prod = (it: Item) => (
    <>
      <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{inv ? it.produk : [it.produk, it.varian].filter(Boolean).join(' - ')}</div>
      {inv && it.varian && <div style={{ fontSize: small, color: MUTED }}>Varian: {it.varian}</div>}
      {!inv && (it.sku || it.berat) && <div style={{ fontSize: small, color: MUTED }}>{[it.sku && `SKU: ${it.sku}`, it.berat && `Berat: ${it.berat}`].filter(Boolean).join(' • ')}</div>}
    </>
  );
  type ColDef = { h: string; w: string; al: 'left' | 'center' | 'right'; v: (it: Item, i: number) => ReactNode };
  const cols: ColDef[] = inv ? [
    { h: 'No', w: '5%', al: 'center', v: (_, i) => (K ? '' : i + 1) },
    { h: 'Produk', w: '33%', al: 'left', v: prod },
    { h: 'SKU', w: '13%', al: 'left', v: (it) => it.sku },
    { h: 'Berat', w: '9%', al: 'center', v: (it) => it.berat },
    { h: 'Jml', w: '7%', al: 'center', v: (it) => (K ? '' : num(it.qty)) },
    { h: 'Harga Satuan', w: '16%', al: 'right', v: (it) => (K ? '' : rp(num(it.harga))) },
    { h: 'Total', w: '17%', al: 'right', v: (_, i) => lineOf(i) },
  ] : [
    { h: 'INFO PRODUK', w: '46%', al: 'left', v: prod },
    { h: 'JUMLAH', w: '12%', al: 'center', v: (it) => (K ? '' : num(it.qty)) },
    { h: 'HARGA SATUAN', w: '20%', al: 'right', v: (it) => (K ? '' : rp(num(it.harga))) },
    { h: 'TOTAL HARGA', w: '22%', al: 'right', v: (_, i) => lineOf(i) },
  ];
  const tight = t.table === 'compact';
  const cellPad = tight ? `${fs * 0.25}px ${fs * 0.35}px` : `${fs * 0.5}px ${fs * 0.45}px`;
  const gridB = t.table === 'grid' ? `1px solid ${t.ink ? '#111' : '#9e9e9e'}` : undefined;
  const thCss = (al: string): CSSProperties => ({
    padding: cellPad, textAlign: al as CSSProperties['textAlign'], fontSize: tight ? small : fs * 0.82, fontWeight: 700, border: gridB,
    ...(t.table === 'grid' && { background: t.ink ? '#e6e6e6' : A, color: t.ink ? '#111' : '#fff' }),
    ...(t.table === 'zebra' && { background: t.ink ? '#e6e6e6' : `${A}26` }),
    ...(t.table === 'lines' && { borderTop: '1.5px solid #111', borderBottom: '1.5px solid #111' }),
    ...(tight && { borderBottom: '1px dashed #111' }),
  });
  const table = t.table === 'cards' ? (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: fs, alignItems: 'center', border: `1px solid ${t.ink ? '#111' : LINE}`, borderLeft: `${fs * 0.3}px solid ${A}`, borderRadius: fs * 0.35, padding: `${fs * 0.5}px ${fs * 0.7}px`, marginBottom: fs * 0.4, minHeight: fs * 2.4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {prod(it)}
            {inv && (it.sku || it.berat) && <div style={{ fontSize: small, color: MUTED }}>{[it.sku && `SKU: ${it.sku}`, it.berat && `Berat: ${it.berat}`].filter(Boolean).join(' • ')}</div>}
          </div>
          <div style={{ width: '24%', textAlign: 'right', fontSize: small, color: MUTED }}>{K ? '' : `${num(it.qty)} × ${rp(num(it.harga))}`}</div>
          <div style={{ width: '20%', textAlign: 'right', fontWeight: 700 }}>{lineOf(i)}</div>
        </div>
      ))}
    </div>
  ) : (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: tight ? fs * 0.88 : fs * 0.92 }}>
      <colgroup>{cols.map((cl) => <col key={cl.h} style={{ width: cl.w }} />)}</colgroup>
      <thead><tr>{cols.map((cl) => <th key={cl.h} style={thCss(cl.al)}>{cl.h}</th>)}</tr></thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{
            ...(t.table === 'zebra' && i % 2 === 1 && { background: '#f4f4f4' }),
            ...(t.table === 'lines' && { borderBottom: `1px solid ${LINE}` }),
          }}>
            {cols.map((cl) => (
              <td key={cl.h} style={{ padding: cellPad, textAlign: cl.al, verticalAlign: 'top', border: gridB, height: K ? fs * 2.1 : undefined, overflowWrap: 'anywhere', ...(K && !gridB && { borderBottom: '1px dotted #000' }) }}>{cl.v(it, i)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ---------- Ringkasan ----------
  type SRow = { l: string; v: number; strong?: boolean; red?: boolean };
  const rows: SRow[] = inv ? [
    { l: `Subtotal (${K ? '…' : c.qty} barang)`, v: c.subtotal },
    ...d.potongan.map((p) => ({ l: p.label || 'Diskon', v: -num(p.nilai), red: true })),
    { l: 'Ongkos Kirim', v: num(d.ongkir) },
    { l: 'Asuransi Pengiriman', v: num(d.asuransi) },
    { l: 'Biaya Layanan / Admin', v: num(d.biayaLayanan) },
  ] : [
    { l: `Subtotal Harga Barang (${K ? '…' : c.qty} barang)`, v: c.subtotal },
    { l: 'Subtotal Produk', v: c.subtotal },
    ...d.potongan.map((p) => ({ l: p.label || 'Voucher', v: -num(p.nilai), red: true })),
    { l: 'Total Ongkos Kirim', v: num(d.ongkir) },
    { l: 'Asuransi Pengiriman', v: num(d.asuransi) },
    { l: 'TOTAL BELANJA', v: c.belanja, strong: true },
    { l: 'Biaya Layanan', v: num(d.biayaLayanan) },
  ];
  const sRow = (r: SRow, i: number) => (
    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: fs, padding: `${fs * 0.18}px 0`, fontWeight: r.strong ? 700 : 400, color: r.red ? RED : undefined, ...(r.strong && { borderTop: `1px solid ${LINE}`, marginTop: fs * 0.2, paddingTop: fs * 0.35 }) }}>
      <span>{r.l}</span><span style={{ whiteSpace: 'nowrap', minWidth: fs * 6, textAlign: 'right', ...(K && { borderBottom: '1px dotted #000' }) }}>{rp(r.v)}</span>
    </div>
  );
  const totalLabel = 'TOTAL TAGIHAN';
  const totalPlain = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: fs, borderTop: `2px solid ${A}`, marginTop: fs * 0.35, paddingTop: fs * 0.45, fontWeight: 800 }}>
      <span style={{ fontSize: fs * 1.05 }}>{totalLabel}</span><span style={{ fontSize: fs * 1.35, color: A, whiteSpace: 'nowrap', minWidth: fs * 7, textAlign: 'right', ...(K && { borderBottom: '1px dotted #000', height: fs * 1.5 }) }}>{rp(c.tagihan)}</span>
    </div>
  );
  const totalBar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: fs, background: A, color: '#fff', borderRadius: fs * 0.3, padding: `${fs * 0.6}px ${fs * 0.9}px`, marginTop: fs * 0.6, fontWeight: 800 }}>
      <span style={{ fontSize: fs * 1.1, letterSpacing: 1 }}>{totalLabel}</span><span style={{ fontSize: fs * 1.5, whiteSpace: 'nowrap', minWidth: fs * 8, textAlign: 'right', ...(K && { borderBottom: '1px dotted #fff', height: fs * 1.6 }) }}>{rp(c.tagihan)}</span>
    </div>
  );

  // ---------- Pembayaran ----------
  const payItems: ReactNode[] = inv
    ? [...d.rekening.filter((r) => r.bank || r.norek).map((r, i) => (
        <div key={i}><b>{r.bank}</b><div style={{ fontSize: fs * 1.05, letterSpacing: 0.5 }}>{r.norek}</div>{r.atasNama && <div style={{ fontSize: small }}>a.n. {r.atasNama}</div>}</div>
      )), ...(d.ewallet ? [<div key="ew" style={{ whiteSpace: 'pre-line' }}>{d.ewallet}</div>] : [])]
    : (K ? [<div key="k">{ruled(2)}</div>] : d.bayar.filter((b) => b.metode).map((b, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: fs }}><span>{b.metode}</span><b style={{ whiteSpace: 'nowrap' }}>{rp(b.nilai ? num(b.nilai) : c.tagihan)}</b></div>
      )));
  const payTitle = inv ? 'INSTRUKSI PEMBAYARAN' : 'METODE PEMBAYARAN';
  const pay = payItems.length ? (
    t.pay === 'cols' ? (
      <div>
        {cap(payTitle)}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: fs * 0.5 }}>
          {payItems.map((p, i) => <div key={i} style={{ flex: '1 1 40%', minWidth: 0, border: `1px solid ${t.ink ? '#111' : LINE}`, borderTop: `${fs * 0.25}px solid ${A}`, borderRadius: fs * 0.3, padding: fs * 0.5 }}>{p}</div>)}
        </div>
      </div>
    ) : (
      <div style={t.pay === 'box' ? { border: `1.5px solid ${A}`, borderRadius: fs * 0.4, padding: fs * 0.7 } : undefined}>
        {cap(payTitle)}
        {payItems.map((p, i) => <div key={i} style={{ marginBottom: fs * 0.35 }}>{p}</div>)}
      </div>
    )
  ) : null;
  const note = (
    <>
      {d.catatan && <div style={{ marginTop: fs * 0.5, fontSize: fs * 0.9, whiteSpace: 'pre-line' }}><b>Catatan:</b> {d.catatan}</div>}
      {d.catatanKecil && <div style={{ marginTop: fs * 0.4, fontSize: small, fontStyle: 'italic', color: MUTED }}>{d.catatanKecil}</div>}
    </>
  );
  const sumRows = <div>{rows.map(sRow)}</div>;
  const summary = {
    right: (
      <div style={{ display: 'flex', gap: fs * 1.6, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>{pay}{note}</div>
        <div style={{ width: '46%' }}>{sumRows}{totalPlain}</div>
      </div>
    ),
    box: (
      <>
        <div style={{ border: `1.5px solid ${t.ink ? '#111' : A}`, background: t.ink ? '#fff' : `${A}0d`, borderRadius: fs * 0.4, padding: `${fs * 0.6}px ${fs * 1}px` }}>{sumRows}{totalPlain}</div>
        <div style={{ marginTop: gap }}>{pay}{note}</div>
      </>
    ),
    bar: (
      <>
        <div style={{ display: 'flex', gap: fs * 1.6, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>{pay}</div>
          <div style={{ width: '46%' }}>{sumRows}</div>
        </div>
        {totalBar}
        {note}
      </>
    ),
  }[t.sum];

  // ---------- Tanda tangan (opsional) ----------
  const oT = getOffset(d.posisi, 'ttd');
  const oS = getOffset(d.posisi, 'stempel');
  const fxT = fxOf(oT, 'ttd');
  const fxS = fxOf(oS, 'stempel');
  const signH = signSpace(fs * 5);
  const ttd = K ? '' : d.ttd;
  const stempel = K ? '' : d.stempel;
  const sign = (inv || ttd || stempel || d.ttdNama) && (
    <div style={{ textAlign: 'center', minWidth: fs * 12, marginLeft: 'auto' }}>
      <div>Hormat kami,</div>
      <div style={{ position: 'relative', height: signH }}>
        {stempel && <img src={stempel} alt="Stempel" style={{ position: 'absolute', left: oS.x, top: oS.y, height: signH * fxS.z, opacity: fxS.a, mixBlendMode: 'multiply' }} />}
        {ttd && <img src={ttd} alt="Tanda tangan" style={{ position: 'absolute', left: '50%', marginLeft: -fs * 6 + oT.x, top: (signH - signH * 0.8 * fxT.z) / 2 + oT.y, height: signH * 0.8 * fxT.z, width: fs * 12, objectFit: 'contain', opacity: fxT.a, mixBlendMode: 'multiply' }} />}
      </div>
      <div style={{ fontWeight: 700, borderTop: '1px solid #111', paddingTop: fs * 0.2 }}>{d.ttdNama || d.toko}</div>
    </div>
  );

  return (
    <div style={{ width: w, height: h, overflow: 'hidden', boxSizing: 'border-box', padding: `${pad}px ${pad}px ${pad}px ${pad + sideW}px`, background: '#fff', color: '#111', fontFamily: t.font, fontSize: fs, lineHeight: 1.35, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {sideW > 0 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: sideW * 0.55, background: A }} />}
      {head}
      <div style={{ height: gap }} />
      {pihak}
      <div style={{ height: gap }} />
      {table}
      <div style={{ height: gap }} />
      {summary}
      {/* Jarak elastis ke kaki dokumen: menyusut bila isi panjang */}
      <div aria-hidden="true" style={{ flex: `0 1 ${fs * 3}px`, minHeight: fs * 0.8 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: fs }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: small, color: MUTED }}>{d.penutup}</div>
        {sign}
      </div>
    </div>
  );
}

// ============================================================
// SECTION: Editor (dipakai kedua menu, form & penyimpanan terpisah per slug)
// ============================================================
const USER_KEYS = ['logo', 'posisi', 'toko', 'alamatToko', 'kontakToko', 'rekening', 'ewallet', 'ttdNama', 'ttd', 'stempel'] as const;

export default function OrderPage({ cfg }: { cfg: Cfg }) {
  const inv = cfg.kind === 'invoice';
  const STORAGE_KEY = `${cfg.slug}:v1`;
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const fresh = () => ({ ...cfg.defaults, nomor: randomDocNo(cfg.noFmt) });
  const [d, setD] = useState<Doc>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...cfg.defaults, ...saved, nomor: orRandomNo(saved.nomor, cfg.noFmt) } : fresh();
    } catch {
      return fresh();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [d, notify, STORAGE_KEY]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(d.logo, bg.logo, bgError);
  const ttd = useBgRemoved(d.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(d.stempel, bg.stempel, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy;

  const set = <K extends keyof Doc>(key: K, v: Doc[K]) => setD((p) => ({ ...p, [key]: v }));
  const setAt = <K extends 'items' | 'potongan' | 'rekening' | 'bayar'>(key: K, i: number, patch: Partial<Doc[K][number]>) =>
    set(key, (d[key] as object[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) as Doc[K]);
  const removeAt = (key: 'items' | 'potongan' | 'rekening' | 'bayar', i: number) => set(key, (d[key] as object[]).filter((_, j) => j !== i) as never);
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setD(fresh());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const paper: Paper = orient(paperOf(d.paper), d.landscape);
  const W = mmToPx(paper.w);
  const H = mmToPx(paper.h);
  const ref = useRef<HTMLDivElement>(null);
  const k = useFitScale(d.skala / 100, () => ref.current?.firstElementChild as HTMLElement, true, [d, W, H, logo.src, ttd.src, stempel.src]);
  const minSide = Math.min(paper.w, paper.h);
  const fs = (minSide < 100 ? 7 : minSide < 160 ? 9.5 : 12) * k;
  const pad = minSide < 100 ? 10 : minSide < 160 ? 26 : 40;
  const c = calc(d);
  const fileName = `${cfg.slug}-${(d.nomor || 'dokumen').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify, paper);

  const txt = (key: keyof Doc, label: string, rows = 1) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );
  const money = (key: keyof Doc, label: string) => (
    <Field label={label}><input type="number" min={0} inputMode="numeric" className={inputCls} value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );
  const del = (onClick: () => void, label: string, disabled = false) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
  );
  const add = (onClick: () => void, label: string) => <button type="button" onClick={onClick} className="text-sm font-medium text-blue-700">{label}</button>;

  const [canvas, setCanvas] = useCanvasMode();
  const [geser, setGeser] = useState('logo');
  const tampilan = (
    <>
      <DocOptions nomor={{ value: d.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: d.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={d.skala} onChange={(v) => set('skala', v)} effective={k} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={d.posisi} onChange={(v) => set('posisi', v)} />
      <Field label="Template">
        <select className={inputCls} value={d.gaya || cfg.templates[0].id} onChange={(e) => set('gaya', e.target.value)}>
          {cfg.templates.map((g, i) => <option key={g.id} value={g.id}>{i + 1}. {g.name}</option>)}
        </select>
      </Field>
      <PaperPicker paper={d.paper} landscape={d.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
      <Field label="Warna aksen (template berwarna)">
        <input type="color" aria-label="Warna aksen" className="h-[42px] w-full rounded-lg border border-gray-300 p-1" value={d.accent} onChange={(e) => set('accent', e.target.value)} />
      </Field>
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
        <h1 className="text-2xl font-bold text-center mb-4">{cfg.title}</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={d} onApply={(u) => setD((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey={`data-user:${cfg.slug}`} keys={USER_KEYS} data={d} onApply={(u) => setD((p) => ({ ...p, ...u }))} />

            <FormSection title="Toko (Penjual)">
              <ImageUpload label="Logo toko" value={d.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              {txt('toko', 'Nama toko')}
              {txt('alamatToko', 'Alamat toko', 2)}
              <KontakFields label="Kontak toko (opsional)" value={d.kontakToko} onChange={(v) => set('kontakToko', v)} />
            </FormSection>

            <FormSection title={<>{inv ? 'Data Invoice' : 'Data Pesanan'}</>}>
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('judul', 'Judul dokumen')}
                {txt('nomor', inv ? 'No. invoice' : 'No. pesanan / struk')}
                <Field label={inv ? 'Tanggal invoice' : 'Tanggal pembelian'}><input type="date" className={inputCls} value={d.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {inv && <Field label="Jatuh tempo"><input type="date" className={inputCls} value={d.jatuhTempo} onChange={(e) => set('jatuhTempo', e.target.value)} /></Field>}
                {inv && (
                  <Field label="Status pembayaran">
                    <select className={inputCls} value={d.status} onChange={(e) => set('status', e.target.value)}>
                      <option value="BELUM DIBAYAR">BELUM DIBAYAR</option>
                      <option value="LUNAS">LUNAS</option>
                      <option value="">(tanpa cap status)</option>
                    </select>
                  </Field>
                )}
                {txt('kurir', 'Kurir / jasa kirim')}
                {!inv && txt('resi', 'No. resi (opsional)')}
              </div>
            </FormSection>

            <FormSection title={<>{inv ? 'Ditagihkan Kepada' : 'Pembeli & Alamat Pengiriman'}</>}>
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('pembeli', 'Nama pembeli')}
                {!inv && txt('penerima', 'Nama penerima')}
                <Field label="No. telepon"><input type="tel" className={inputCls} value={d.telp} onChange={(e) => set('telp', e.target.value)} /></Field>
              </div>
              {txt('alamat', inv ? 'Alamat pembeli' : 'Alamat pengiriman lengkap', 2)}
            </FormSection>

            <FormSection title="Produk">
              {d.items.map((it, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex gap-2">
                    <AutoTextarea aria-label={`Nama produk ${i + 1}`} placeholder="Nama produk" className={inputCls} value={it.produk} onChange={(e) => setAt('items', i, { produk: e.target.value })} />
                    {del(() => removeAt('items', i), `Hapus produk ${i + 1}`, d.items.length === 1)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Field label="Varian"><input className={inputCls} value={it.varian} onChange={(e) => setAt('items', i, { varian: e.target.value })} /></Field>
                    <Field label="SKU"><input className={inputCls} value={it.sku} onChange={(e) => setAt('items', i, { sku: e.target.value })} /></Field>
                    <Field label="Berat"><input className={inputCls} value={it.berat} onChange={(e) => setAt('items', i, { berat: e.target.value })} /></Field>
                    <Field label="Jumlah"><input type="number" min={0} inputMode="numeric" className={inputCls} value={it.qty} onChange={(e) => setAt('items', i, { qty: e.target.value })} /></Field>
                    <Field label="Harga satuan (Rp)"><input type="number" min={0} inputMode="numeric" className={inputCls} value={it.harga} onChange={(e) => setAt('items', i, { harga: e.target.value })} /></Field>
                  </div>
                  <div className="text-right text-sm text-gray-600">Total: <b>Rp{rupiah(c.lines[i])}</b></div>
                </div>
              ))}
              {add(() => set('items', [...d.items, blankItem()]), '+ Tambah produk')}
            </FormSection>

            <FormSection title="Voucher, Biaya &amp; Total">
              {d.potongan.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] gap-2 items-start">
                  <input aria-label={`Nama voucher ${i + 1}`} placeholder="Nama voucher / diskon" className={inputCls} value={p.label} onChange={(e) => setAt('potongan', i, { label: e.target.value })} />
                  <input aria-label={`Nilai voucher ${i + 1}`} placeholder="Rp (dikurangkan)" type="number" min={0} inputMode="numeric" className={inputCls} value={p.nilai} onChange={(e) => setAt('potongan', i, { nilai: e.target.value })} />
                  {del(() => removeAt('potongan', i), `Hapus voucher ${i + 1}`)}
                </div>
              ))}
              {add(() => set('potongan', [...d.potongan, { label: '', nilai: '' }]), '+ Tambah voucher / diskon')}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {money('ongkir', 'Ongkos kirim (Rp)')}
                {money('asuransi', 'Asuransi pengiriman (Rp)')}
                {money('biayaLayanan', inv ? 'Biaya layanan/admin (Rp)' : 'Biaya layanan (Rp)')}
              </div>
              <div className="text-right text-sm text-gray-700">Subtotal Rp{rupiah(c.subtotal)} · Total belanja Rp{rupiah(c.belanja)}</div>
              <div className="text-right font-bold">Total tagihan: Rp{rupiah(c.tagihan)}</div>
            </FormSection>

            <FormSection title={<>{inv ? 'Instruksi Pembayaran' : 'Metode Pembayaran'}</>}>
              {inv ? (<>
                {d.rekening.map((r, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                    <input aria-label={`Bank ${i + 1}`} placeholder="Bank" className={inputCls} value={r.bank} onChange={(e) => setAt('rekening', i, { bank: e.target.value })} />
                    <input aria-label={`No. rekening ${i + 1}`} placeholder="No. rekening" className={inputCls} value={r.norek} onChange={(e) => setAt('rekening', i, { norek: e.target.value })} />
                    <input aria-label={`Atas nama ${i + 1}`} placeholder="Atas nama" className={inputCls} value={r.atasNama} onChange={(e) => setAt('rekening', i, { atasNama: e.target.value })} />
                    {del(() => removeAt('rekening', i), `Hapus rekening ${i + 1}`)}
                  </div>
                ))}
                {add(() => set('rekening', [...d.rekening, { bank: '', norek: '', atasNama: '' }]), '+ Tambah rekening')}
                {txt('ewallet', 'E-wallet / QRIS (teks)', 2)}
              </>) : (<>
                {d.bayar.map((b, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] gap-2 items-start">
                    <input aria-label={`Metode pembayaran ${i + 1}`} placeholder="Mis. Transfer Bank, E-wallet, COD" className={inputCls} value={b.metode} onChange={(e) => setAt('bayar', i, { metode: e.target.value })} />
                    <input aria-label={`Nominal ${i + 1}`} placeholder="Rp (kosong = total)" type="number" min={0} inputMode="numeric" className={inputCls} value={b.nilai} onChange={(e) => setAt('bayar', i, { nilai: e.target.value })} />
                    {del(() => removeAt('bayar', i), `Hapus metode ${i + 1}`)}
                  </div>
                ))}
                {add(() => set('bayar', [...d.bayar, { metode: '', nilai: '' }]), '+ Tambah metode pembayaran')}
              </>)}
            </FormSection>

            <FormSection title="Catatan">
              {txt('catatan', 'Catatan (opsional)', 2)}
              {txt('catatanKecil', 'Keterangan kecil miring (mis. harga sudah termasuk pajak)', 2)}
              {txt('penutup', 'Kalimat kaki dokumen', 2)}
            </FormSection>

            <FormSection title="Tanda Tangan &amp; Stempel Toko (opsional)">
              {txt('ttdNama', 'Nama di bawah tanda tangan (kosong = nama toko)')}
              <ImageUpload label="Tanda tangan" value={d.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel / cap toko" value={d.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={ref} className="w-max shadow-lg">
              <OrderView d={{ ...d, logo: logo.src, ttd: ttd.src, stempel: stempel.src }} cfg={cfg} c={c} fs={fs} w={W} h={H} pad={pad} />
            </div>
          </FitPreview>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
