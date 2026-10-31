import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from './FitPreview';
import { Toast, type ToastState } from './Feedback';
import { ExportButton, Field, ImageUpload, inputCls, fmtTanggal, mmToPx, useLetterExport, type Notify, type Paper } from './LetterKit';
import { useBgRemoved } from '../lib/removeBg';
import { num, rupiah, terbilangRupiah } from '../lib/money';

// Generator Invoice & Faktur Penjualan: satu mesin, beberapa template gaya, ukuran kertas & orientasi bebas.

export type DocKind = 'invoice' | 'faktur';
type TemplateId = 'klasik' | 'modern' | 'minimal' | 'tegas';
type PaperId = 'A4' | 'A5' | 'Letter' | 'F4';

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Serif, tabel bergaris penuh' },
  { id: 'modern', name: 'Modern', desc: 'Pita warna di atas' },
  { id: 'minimal', name: 'Minimal', desc: 'Bersih, garis tipis' },
  { id: 'tegas', name: 'Tegas', desc: 'Strip samping, kontras' },
];
const PAPERS: Record<PaperId, Paper & { label: string }> = {
  A4: { w: 210, h: 297, label: 'A4 (210×297 mm)' },
  A5: { w: 148, h: 210, label: 'A5 (148×210 mm)' },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (216×279 mm)' },
  F4: { w: 215, h: 330, label: 'F4 / Folio (215×330 mm)' },
};

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
type Ctx = { d: Doc; kind: DocKind; c: ReturnType<typeof calc>; fs: number; pad: number };
// Jarak bingkai dari tepi kertas
const frameInset = (pad: number) => Math.round(pad * 0.35);

const FONTS: Record<TemplateId, string> = {
  klasik: 'Tinos, "Times New Roman", serif',
  modern: 'Arimo, Arial, sans-serif',
  minimal: 'Arimo, Arial, sans-serif',
  tegas: 'Carlito, Calibri, Arimo, sans-serif',
};

// Nama & detail usaha: 2× ukuran sebelumnya (nama 1,35→2,7; detail 0,9→1,8 × teks isi)
function Seller({ d, fs, color, sub = '#4b5563', align = 'left' }: { d: Doc; fs: number; color?: string; sub?: string; align?: 'left' | 'right' | 'center' }) {
  const det: CSSProperties = { fontSize: fs * 1.8, color: sub, lineHeight: 1.25, whiteSpace: 'pre-line' };
  return (
    <div style={{ textAlign: align, color, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: fs * 2.7, lineHeight: 1.15 }}>{d.penjual}</div>
      {d.penjualAlamat && <div style={det}>{d.penjualAlamat}</div>}
      {d.penjualKontak && <div style={det}>{d.penjualKontak}</div>}
      {d.penjualNpwp && <div style={det}>NPWP: {d.penjualNpwp}</div>}
    </div>
  );
}

// Logo selalu punya tempat di setiap template; tanpa upload tampil tulisan "LOGO" seperti Slip Gaji
function Logo({ src, h, color, box }: { src: string; h: number; color: string; box?: boolean }) {
  const wrap: CSSProperties = box ? { background: '#fff', borderRadius: 8, padding: 6, display: 'inline-flex' } : { display: 'inline-flex' };
  return (
    <span style={{ ...wrap, flexShrink: 0 }}>
      {src
        ? <img src={src} alt="Logo" style={{ height: h, maxWidth: h * 2.4, objectFit: 'contain' }} />
        : <span style={{ height: h, display: 'flex', alignItems: 'center', fontFamily: 'Tinos, serif', fontWeight: 800, fontSize: h * 0.42, color }}>LOGO</span>}
    </span>
  );
}

// Judul dokumen di antara dua garis (gaya Slip Gaji)
function TitleBar({ text, fs, color = '#000', style }: { text: string; fs: number; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: fs * 1.5, letterSpacing: 3, textTransform: 'uppercase', color,
      borderTop: `1px solid ${color}`, borderBottom: `1px solid ${color}`, padding: `${fs * 0.3}px 0`, marginBottom: fs * 1.2, ...style }}>{text}</div>
  );
}

function Header({ d, kind, fs, pad }: Ctx) {
  const band = d.bingkai ? frameInset(pad) + 2 : 0; // pita Modern berhenti di dalam bingkai
  const title = LABELS[kind].title;
  const logoH = fs * 5.5;
  switch (d.template) {
    case 'modern': // logo kiri dalam kotak putih, pita warna penuh
      return (
        <>
          <div style={{ margin: `-${pad - band}px -${pad - band}px ${fs * 1}px`, padding: `${pad * 0.6 - band}px ${pad - band}px`, background: d.accent, color: '#fff', display: 'flex', alignItems: 'center', gap: fs * 1.4 }}>
            <Logo src={d.logo} h={logoH} color={d.accent} box />
            <Seller d={d} fs={fs} color="#fff" sub="#f1f5f9" />
          </div>
          <TitleBar text={title} fs={fs} color={d.accent} />
        </>
      );
    case 'minimal': // logo di tengah atas, semua rata tengah
      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fs * 0.5, paddingBottom: fs * 0.8, borderBottom: '1px solid #d4d4d4', marginBottom: fs * 0.8 }}>
            <Logo src={d.logo} h={logoH * 0.85} color={d.accent} />
            <Seller d={d} fs={fs} align="center" />
          </div>
          <TitleBar text={title} fs={fs} color={d.accent} style={{ borderTop: 0, borderBottom: 0, letterSpacing: 6 }} />
        </>
      );
    case 'tegas': // logo kiri besar, garis aksen tebal, judul dalam pita gelap
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: fs * 1.4, paddingBottom: fs * 0.6, borderBottom: `4px solid ${d.accent}`, marginBottom: fs * 0.8 }}>
            <Logo src={d.logo} h={logoH} color={d.accent} />
            <Seller d={d} fs={fs} />
          </div>
          <TitleBar text={title} fs={fs} color="#fff" style={{ background: '#1f2937', borderTop: 0, borderBottom: 0 }} />
        </>
      );
    default: // klasik = Slip Gaji: identitas kiri, logo kanan, garis tebal
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: fs * 1.4, paddingBottom: fs * 0.4, borderBottom: '2px solid #000', marginBottom: fs * 0.8 }}>
            <Seller d={d} fs={fs} />
            <Logo src={d.logo} h={logoH} color="#b91c1c" />
          </div>
          <TitleBar text={title} fs={fs} />
        </>
      );
  }
}

function Parties({ d, kind, fs }: Ctx) {
  const L = LABELS[kind];
  const label: CSSProperties = { color: d.template === 'klasik' ? '#000' : '#555', fontSize: fs * 0.85, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 };
  const meta: [string, string][] = [
    [L.nomor, d.nomor],
    ['Tanggal', fmtTanggal(d.tanggal)],
    ...(d.jatuhTempo ? [['Jatuh Tempo', fmtTanggal(d.jatuhTempo)] as [string, string]] : []),
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: fs * 1.2 }}>
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

function tableStyle(t: TemplateId, accent: string, fs: number) {
  const cell: CSSProperties = { padding: `${fs * 0.35}px ${fs * 0.5}px`, verticalAlign: 'top' };
  switch (t) {
    case 'modern':
      return { th: { ...cell, background: accent, color: '#fff', fontWeight: 700, border: `1px solid ${accent}` }, td: { ...cell, borderBottom: '1px solid #e5e7eb' }, zebra: '#f8fafc' };
    case 'minimal':
      return { th: { ...cell, borderBottom: '1.5px solid #111', color: '#555', fontSize: fs * 0.85, textTransform: 'uppercase' as const, letterSpacing: 0.5 }, td: { ...cell, borderBottom: '1px solid #eee' }, zebra: '' };
    case 'tegas':
      return { th: { ...cell, background: '#1f2937', color: '#fff', fontWeight: 700, border: '1px solid #1f2937' }, td: { ...cell, borderBottom: '1px solid #d1d5db' }, zebra: '#f3f4f6' };
    default:
      return { th: { ...cell, border: '1px solid #000', background: '#e5e5e5', fontWeight: 700 }, td: { ...cell, border: '1px solid #000' }, zebra: '' };
  }
}

function Items({ d, c, fs }: Ctx) {
  const s = tableStyle(d.template, d.accent, fs);
  const hasDisc = d.items.some((it) => num(it.diskon) > 0);
  const R: CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: fs * 1.2 }}>
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

function Totals({ d, c, fs }: Ctx) {
  const rows: [string, number][] = [
    ['Subtotal', c.subtotal],
    ...(c.potongan ? [['Potongan', -c.potongan] as [string, number]] : []),
    ...(c.potongan && num(d.ppn) ? [['DPP', c.dpp] as [string, number]] : []),
    ...(num(d.ppn) ? [[`PPN ${d.ppn}%`, c.ppn] as [string, number]] : []),
    ...(c.ongkir ? [['Ongkos Kirim', c.ongkir] as [string, number]] : []),
  ];
  const totalStyle: CSSProperties =
    d.template === 'modern' || d.template === 'tegas'
      ? { background: d.accent, color: '#fff', fontWeight: 700, fontSize: fs * 1.15 }
      : d.template === 'minimal'
        ? { color: d.accent, fontWeight: 700, fontSize: fs * 1.3, borderTop: '1.5px solid #111' }
        : { fontWeight: 700, fontSize: fs * 1.1, borderTop: '3px double #000' };
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
      </tbody>
    </table>
  );
}

function SignBox({ heading, name, title, ttd, stempel, fs }: { heading: string; name: string; title: string; ttd?: string; stempel?: string; fs: number }) {
  const h = fs * 5.5;
  return (
    <div style={{ textAlign: 'center', minWidth: fs * 13 }}>
      <div>{heading}</div>
      <div style={{ position: 'relative', height: h }}>
        {stempel && <img src={stempel} alt="Stempel" style={{ position: 'absolute', left: 0, top: 0, height: h, opacity: 0.9, mixBlendMode: 'multiply' }} />}
        {ttd && <img src={ttd} alt="Tanda tangan" style={{ position: 'absolute', left: '50%', top: fs * 0.4, transform: 'translateX(-50%)', height: h * 0.85, maxWidth: fs * 14, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
      </div>
      <div style={{ fontWeight: 700, borderBottom: '1px solid #000', display: 'inline-block', minWidth: fs * 11 }}>{name || ' '}</div>
      {title && <div style={{ fontSize: fs * 0.9 }}>{title}</div>}
    </div>
  );
}

function DocView(ctx: Ctx & { w: number; h: number }) {
  const { d, kind, c, fs, pad, w, h } = ctx;
  const box: CSSProperties = {
    width: w, height: h, overflow: 'hidden', boxSizing: 'border-box', padding: pad, background: '#fff', color: '#111',
    fontFamily: FONTS[d.template], fontSize: fs, lineHeight: 1.4, position: 'relative',
    ...(d.template === 'tegas' ? { borderLeft: `${Math.round(fs * 0.9)}px solid ${d.accent}` } : {}),
  };
  return (
    <div style={box}>
      <Header {...ctx} />
      <Parties {...ctx} />
      <Items {...ctx} />
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: fs * 1.4 }}>
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
        {kind === 'faktur' && <SignBox heading="Penerima," name="" title="" fs={fs} />}
        <SignBox heading="Hormat kami," name={d.ttdNama} title={d.ttdJabatan} ttd={d.ttd} stempel={d.stempel} fs={fs} />
      </div>
      {d.bingkai && (
        <div style={{ position: 'absolute', inset: frameInset(pad), border: `1.5px solid ${d.template === 'klasik' ? '#000' : d.accent}`, pointerEvents: 'none' }} />
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

  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const base = PAPERS[d.paper];
  const paper: Paper = d.landscape ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
  const W = mmToPx(paper.w);
  const H = mmToPx(paper.h);
  const small = Math.min(paper.w, paper.h) < 160; // A5: huruf & margin lebih kecil
  const fs = small ? 10 : 12;
  const pad = small ? 28 : 44;
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
      {rows > 1
        ? <textarea rows={rows} className={inputCls} value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} />
        : <input className={inputCls} value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} />}
    </Field>
  );
  const seg = (on: boolean) => `px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Generator {kind === 'invoice' ? 'Invoice' : 'Faktur Penjualan'}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            <section className="space-y-3">
              <h2 className="font-bold">Gaya &amp; Kertas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Template">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={d.template === t.id} onClick={() => set('template', t.id)}
                    className={`${seg(d.template === t.id)} text-left`}>
                    <div className="font-semibold">{t.name}</div>
                    <div className={`text-xs ${d.template === t.id ? 'text-blue-100' : 'text-gray-500'}`}>{t.desc}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <Field label="Ukuran kertas">
                  <select className={inputCls} value={d.paper} onChange={(e) => set('paper', e.target.value as PaperId)}>
                    {(Object.keys(PAPERS) as PaperId[]).map((p) => <option key={p} value={p}>{PAPERS[p].label}</option>)}
                  </select>
                </Field>
                <div className="flex gap-2" role="radiogroup" aria-label="Orientasi">
                  <button type="button" role="radio" aria-checked={!d.landscape} onClick={() => set('landscape', false)} className={`${seg(!d.landscape)} flex-1`}>Vertikal</button>
                  <button type="button" role="radio" aria-checked={d.landscape} onClick={() => set('landscape', true)} className={`${seg(d.landscape)} flex-1`}>Landscape</button>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 min-h-[44px] sm:col-span-3">
                  <input type="checkbox" className="h-5 w-5" checked={d.bingkai} onChange={(e) => set('bingkai', e.target.checked)} /> Bingkai kotak di tepi kertas
                </label>
                <Field label="Warna aksen">
                  <input type="color" className="h-[42px] w-full rounded-lg border border-gray-300 p-1" value={d.accent} onChange={(e) => set('accent', e.target.value)} />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penjual</h2>
              {txt('penjual', 'Nama usaha')}
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
                    <input aria-label={`Deskripsi baris ${i + 1}`} placeholder="Deskripsi" className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} />
                    <button type="button" onClick={() => set('items', d.items.filter((_, j) => j !== i))} disabled={d.items.length === 1}
                      aria-label={`Hapus baris ${i + 1}`} className="px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Field label="Qty"><input type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                    <Field label="Satuan"><input className={inputCls} value={it.satuan} onChange={(e) => setItem(i, { satuan: e.target.value })} /></Field>
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
              <DocView d={{ ...d, logo: logo.src, ttd: ttd.src, stempel: stempel.src }} kind={kind} c={c} fs={fs} pad={pad} w={W} h={H} />
            </div>
          </FitPreview>
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

