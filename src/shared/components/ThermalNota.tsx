import NumberFormatInput from './NumberFormatInput';
import AutoTextarea from './AutoTextarea';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from './FitPreview';
import { Toast, type ToastState } from './Feedback';
import { ExportButton, Field, ImageUpload, inputCls, useLetterExport, type Notify } from './LetterKit';
import { useBgRemoved } from '../lib/removeBg';
import { num, rupiah } from '../lib/money';
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
};

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const DEFAULT: Nota = {
  toko: 'TOKO ANDA',
  alamat: 'Jl. Contoh No. 1, Kota',
  telp: '0812-0000-0000',
  logo: '',
  nomor: 'TRX-0001',
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
// Template: hanya tampilan yang berubah; isi & urutan nota sama. Thermal hanya mencetak hitam: pakai #000/#fff saja.
type Sep = 'dash' | 'eq' | 'dot' | 'solid' | 'double' | 'star' | 'thick';
type Tpl = {
  id: string;
  name: string;
  desc: string;
  font: string; // CSS font-family isi nota
  web?: WebFont; // Google Font untuk isi
  headFont?: string; // font khusus nama toko
  headWeb?: WebFont;
  size?: number; // koreksi ukuran font (±1) untuk font yang terlalu lebar/sempit
  head: 'center' | 'left' | 'invert' | 'box' | 'double' | 'spaced';
  sep: Sep;
  items: 'two' | 'one' | 'cols';
  nameBold?: boolean;
  total: 'plain' | 'invert' | 'box' | 'big' | 'double';
  meta: 'table' | 'colon' | 'center';
  foot: 'plain' | 'box' | 'sep' | 'invert';
};
const COUSINE = 'Cousine, "Courier New", monospace';
const ARIMO = 'Arimo, Arial, sans-serif';
const CARLITO = 'Carlito, Calibri, sans-serif';
const TINOS = 'Tinos, "Times New Roman", serif';
const mono = (family: string, weights?: number[]) => ({ font: cssFamily(family, 'monospace'), web: { family, weights } });
const ONLY400 = [400];

export const TEMPLATES: Tpl[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Cousine, garis putus', font: COUSINE, head: 'center', sep: 'dash', items: 'two', total: 'plain', meta: 'table', foot: 'plain' },
  { id: 'minimarket', name: 'Minimarket', desc: 'Sans, judul & total blok hitam', font: ARIMO, head: 'invert', sep: 'dash', items: 'two', total: 'invert', meta: 'table', foot: 'plain' },
  { id: 'kafe', name: 'Kafe', desc: 'Space Mono, garis =', ...mono('Space Mono'), head: 'spaced', sep: 'eq', items: 'one', total: 'double', meta: 'colon', foot: 'box' },
  { id: 'restoran', name: 'Restoran', desc: 'Serif, kolom harga, garis ganda', font: TINOS, head: 'box', sep: 'double', items: 'cols', nameBold: true, total: 'box', meta: 'table', foot: 'sep' },
  { id: 'modern', name: 'Modern', desc: 'IBM Plex Mono, logo kiri', ...mono('IBM Plex Mono'), head: 'left', sep: 'solid', items: 'two', total: 'big', meta: 'colon', foot: 'plain' },
  { id: 'retro', name: 'Retro', desc: 'Courier Prime, bintang', ...mono('Courier Prime'), head: 'double', sep: 'star', items: 'two', total: 'box', meta: 'colon', foot: 'box' },
  { id: 'teknik', name: 'Teknik', desc: 'JetBrains Mono, kolom, titik', ...mono('JetBrains Mono'), head: 'center', sep: 'dot', items: 'cols', total: 'invert', meta: 'table', foot: 'plain' },
  { id: 'ringkas', name: 'Ringkas', desc: 'Roboto Mono, item satu baris', ...mono('Roboto Mono'), head: 'center', sep: 'solid', items: 'one', total: 'plain', meta: 'center', foot: 'plain' },
  { id: 'butik', name: 'Butik', desc: 'Carlito, huruf renggang', font: CARLITO, head: 'spaced', sep: 'dot', items: 'two', nameBold: true, total: 'double', meta: 'center', foot: 'sep' },
  { id: 'grosir', name: 'Grosir', desc: 'Judul Oswald, total besar', font: ARIMO, headFont: cssFamily('Oswald'), headWeb: { family: 'Oswald', weights: [700] }, head: 'invert', sep: 'thick', items: 'cols', total: 'big', meta: 'table', foot: 'plain' },
  { id: 'apotek', name: 'Apotek', desc: 'Source Code Pro, kotak', ...mono('Source Code Pro'), head: 'box', sep: 'dash', items: 'cols', total: 'box', meta: 'colon', foot: 'box' },
  { id: 'bengkel', name: 'Bengkel', desc: 'Share Tech Mono, logo kiri', ...mono('Share Tech Mono', ONLY400), size: 1, head: 'left', sep: 'eq', items: 'one', total: 'invert', meta: 'table', foot: 'sep' },
  { id: 'warung', name: 'Warung', desc: 'Ubuntu Mono, bintang', ...mono('Ubuntu Mono'), size: 1, head: 'center', sep: 'star', items: 'two', nameBold: true, total: 'big', meta: 'table', foot: 'sep' },
  { id: 'bakery', name: 'Bakery', desc: 'Roboto Condensed, garis titik', font: cssFamily('Roboto Condensed'), web: { family: 'Roboto Condensed' }, size: 1, head: 'double', sep: 'dot', items: 'one', total: 'double', meta: 'center', foot: 'box' },
  { id: 'pustaka', name: 'Pustaka', desc: 'PT Mono, judul kotak', ...mono('PT Mono', ONLY400), head: 'box', sep: 'eq', items: 'two', total: 'plain', meta: 'colon', foot: 'sep' },
  { id: 'elektronik', name: 'Elektronik', desc: 'Overpass Mono, garis ganda', ...mono('Overpass Mono'), head: 'left', sep: 'double', items: 'cols', total: 'invert', meta: 'table', foot: 'plain' },
  { id: 'fashion', name: 'Fashion', desc: 'Fira Mono, renggang, garis tebal', ...mono('Fira Mono'), head: 'spaced', sep: 'thick', items: 'one', total: 'box', meta: 'center', foot: 'plain' },
  { id: 'laundry', name: 'Laundry', desc: 'Inconsolata, judul blok hitam', ...mono('Inconsolata'), size: 1, head: 'invert', sep: 'dot', items: 'two', total: 'double', meta: 'colon', foot: 'box' },
  { id: 'pasar', name: 'Pasar', desc: 'Anonymous Pro, total besar', ...mono('Anonymous Pro'), head: 'double', sep: 'dash', items: 'cols', nameBold: true, total: 'big', meta: 'table', foot: 'sep' },
  { id: 'kontras', name: 'Kontras', desc: 'Judul condensed, serba hitam', font: ARIMO, headFont: cssFamily('Roboto Condensed'), headWeb: { family: 'Roboto Condensed', weights: [700] }, head: 'invert', sep: 'thick', items: 'two', nameBold: true, total: 'invert', meta: 'colon', foot: 'invert' },
];
console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20 && TEMPLATES[0].id === DEFAULT.template, 'ThermalNota templates');
const tplOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

const SEP_BORDER: Partial<Record<Sep, string>> = { dash: '1px dashed #000', dot: '2px dotted #000', solid: '1px solid #000', double: '3px double #000', thick: '2px solid #000' };
const Line = ({ k }: { k: Sep }) =>
  SEP_BORDER[k]
    ? <div style={{ borderTop: SEP_BORDER[k], margin: '4px 0' }} />
    : <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1, margin: '3px 0' }}>{(k === 'eq' ? '=' : '*').repeat(90)}</div>;
const Row = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontWeight: bold ? 700 : 400 }}>
    <span style={{ minWidth: 0 }}>{l}</span>
    <span style={{ whiteSpace: 'nowrap' }}>{r}</span>
  </div>
);
const Cols = ({ a, b, c, bold }: { a: string; b: string; c: string; bold?: boolean }) => (
  <div style={{ display: 'flex', gap: 4, fontWeight: bold ? 700 : 400 }}>
    <span style={{ width: '4ch', flexShrink: 0 }}>{a}</span>
    <span style={{ flex: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>{b}</span>
    <span style={{ flex: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>{c}</span>
  </div>
);
const BAR: Record<string, CSSProperties> = {
  invert: { background: '#000', color: '#fff', padding: '2px 4px' },
  box: { border: '2px solid #000', padding: '2px 4px' },
  double: { borderTop: '3px double #000', borderBottom: '3px double #000', padding: '2px 0' },
};

function Receipt({ n, mm, k }: { n: Nota; mm: ThermalWidth; k: number }) {
  const T = THERMAL[mm];
  const c = calc(n);
  const t = tplOf(n.template);
  const base = T.font + (t.size ?? 0);
  const f = base * k; // lebar nota tetap, hanya huruf yang ikut skala
  const logoW = Math.min(T.logoW * k, T.px - 2 * T.pad[1]); // logo tidak boleh lebih lebar dari area isi
  const line = <Line k={t.sep} />;
  const nameStyle: CSSProperties = {
    fontWeight: 700, fontSize: (base + 2) * k, fontFamily: t.headFont,
    ...(t.head === 'invert' || t.head === 'box' ? { ...BAR[t.head], marginBottom: 3 } : {}),
    ...(t.head === 'double' ? { display: 'inline-block', borderBottom: '3px double #000', paddingBottom: 1, marginBottom: 3 } : {}),
    ...(t.head === 'spaced' ? { letterSpacing: 2 } : {}),
  };
  const name = <div style={nameStyle}>{t.head === 'spaced' ? n.toko.toUpperCase() : n.toko}</div>;
  const info = (
    <>
      {n.alamat && <div style={{ whiteSpace: 'pre-line' }}>{n.alamat}</div>}
      {n.telp && <div>Telp. {n.telp}</div>}
    </>
  );
  const meta: [string, string][] = [['No', n.nomor], ['Tgl', fmtWaktu(n.waktu)]];
  if (n.kasir) meta.push(['Kasir', n.kasir]);
  if (n.pelanggan) meta.push(['Plg', n.pelanggan]);
  const nameCls: CSSProperties = { fontWeight: t.nameBold ? 700 : 400 };
  return (
    <div style={{ width: T.px, boxSizing: 'border-box', padding: `${T.pad[0]}px ${T.pad[1]}px ${T.pad[2]}px`, background: '#fff', color: '#000', fontFamily: t.font, fontSize: f, lineHeight: 1.35, wordBreak: 'break-word' }}>
      {t.head === 'left' ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {n.logo && <img src={n.logo} alt="Logo" style={{ flexShrink: 0, maxHeight: logoW * 0.4, maxWidth: logoW * 0.35, objectFit: 'contain' }} />}
          <div style={{ minWidth: 0 }}>{name}{info}</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          {n.logo && <img src={n.logo} alt="Logo" style={{ display: 'block', margin: '0 auto 4px', maxHeight: logoW * 0.4, maxWidth: logoW, objectFit: 'contain' }} />}
          {name}
          {info}
        </div>
      )}
      {line}
      {meta.map(([l, r]) =>
        t.meta === 'table' ? <Row key={l} l={l} r={r} />
          : t.meta === 'center' ? <div key={l} style={{ textAlign: 'center' }}>{l}: {r}</div>
            : <div key={l} style={{ display: 'flex' }}><span style={{ width: '5.5ch', flexShrink: 0 }}>{l}</span><span>: {r}</span></div>)}
      {line}
      {t.items === 'cols' && <Cols a="Qty" b="Harga" c="Jumlah" bold />}
      {n.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          {t.items === 'one' ? (
            <Row l={`${it.qty}x ${it.nama} @${rupiah(num(it.harga))}`} r={rupiah(c.lines[i])} />
          ) : (
            <>
              <div style={nameCls}>{it.nama}</div>
              {t.items === 'cols'
                ? <Cols a={it.qty} b={rupiah(num(it.harga))} c={rupiah(c.lines[i])} />
                : <Row l={`  ${it.qty} x ${rupiah(num(it.harga))}`} r={rupiah(c.lines[i])} />}
            </>
          )}
        </div>
      ))}
      {line}
      <Row l="TOTAL" r={rupiah(c.total)} bold />
      {(c.pajak > 0 || c.biaya > 0 || c.diskon > 0) && (
        <>
          {c.pajak > 0 && <Row l={`Pajak ${n.pajak}%`} r={rupiah(c.pajak)} />}
          {c.biaya > 0 && <Row l={n.biayaLabel || 'Biaya lain'} r={rupiah(c.biaya)} />}
          {c.diskon > 0 && <Row l={n.diskonMode === '%' ? `Diskon ${n.diskon}%` : 'Diskon'} r={`-${rupiah(c.diskon)}`} />}
        </>
      )}
      {line}
      {t.total === 'big' ? (
        <div style={{ fontWeight: 700 }}>
          <div>TOTAL PEMBAYARAN</div>
          <div style={{ fontSize: (base + 6) * k, lineHeight: 1.2, textAlign: 'right' }}>{rupiah(c.bayarTotal)}</div>
        </div>
      ) : (
        <div style={{ fontSize: (base + 2) * k, ...BAR[t.total] }}><Row l="TOTAL PEMBAYARAN" r={rupiah(c.bayarTotal)} bold /></div>
      )}
      {line}
      <Row l="Metode Bayar" r={n.metode} />
      {n.metode === 'Tunai' ? (
        <>
          <Row l="Tunai" r={rupiah(c.bayar)} />
          <Row l="Kembali" r={rupiah(Math.max(0, c.kembali))} />
        </>
      ) : (
        <Row l={n.nonTunai || 'Non-Tunai'} r={rupiah(c.bayarTotal)} />
      )}
      {line}
      {n.footer && <div style={{ textAlign: 'center', whiteSpace: 'pre-line', ...(t.foot === 'box' ? { border: '1px solid #000', padding: 3 } : BAR[t.foot]) }}>{n.footer}</div>}
      {n.footer && t.foot === 'sep' && line}
    </div>
  );
}

// ---------------- Editor ----------------
export default function ThermalNota({ mm }: { mm: ThermalWidth }) {
  const STORAGE_KEY = `nota-${mm}mm:v1`;
  const T = THERMAL[mm];
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [n, setN] = useState<Nota>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return DEFAULT;
      if (!saved.diskonMode) saved.diskonMode = 'Rp'; // simpanan lama: diskon selalu nominal
      if (saved.metode && saved.metode !== 'Tunai' && saved.metode !== 'Non-Tunai') { // simpanan lama: QRIS/Debit/Transfer
        saved.nonTunai = saved.metode === 'Transfer' ? 'Transfer Bank' : saved.metode;
        saved.metode = 'Non-Tunai';
      }
      return { ...DEFAULT, ...saved };
    } catch {
      return DEFAULT;
    }
  });
  const [logoBg, setLogoBg] = useState(false);
  const logo = useBgRemoved(n.logo, logoBg, (m) => notify('error', m));
  const ref = useRef<HTMLDivElement>(null);
  const tpl = tplOf(n.template);
  useGoogleFonts([tpl.web, tpl.headWeb]);
  // Kertas gulung: tinggi bebas, skala hanya diturunkan bila isi lebih lebar dari kertas
  const k = useFitScale(n.skala / 100, () => ref.current?.firstElementChild as HTMLElement, false, [n, mm, logo.src]);

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
  // Tinggi kertas mengikuti panjang nota
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify,
    (page) => ({ w: mm, h: Math.ceil((mm * page.offsetHeight) / T.px) }), 2);
  const transaksiBaru = () => {
    const m = n.nomor.match(/^(.*?)(\d+)$/);
    const nomor = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : n.nomor;
    setN((p) => ({ ...p, nomor, waktu: nowLocal(), pelanggan: '', items: [{ nama: '', qty: '1', harga: '' }], diskon: '', biaya: '', bayar: '' }));
    notify('info', `Transaksi baru ${nomor}.`);
  };
  const txt = (k: keyof Nota, label: string, rows = 1) => (
    <Field label={label}>
      <AutoTextarea rows={rows} className={inputCls} value={n[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Nota Pembelian {mm}mm</h1>
        {/* Desktop: tombol unduh di atas; ponsel: di paling bawah */}
        <p className="hidden lg:block mb-2 text-center text-sm text-gray-600">Cetak ke printer thermal Bluetooth: unduh PNG lalu buka dengan aplikasi RawBT.</p>
        <div className="hidden lg:flex flex-wrap justify-center gap-3 mb-6">
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={logo.busy} onRun={run} />
          <button onClick={transaksiBaru} className="px-5 py-2 rounded-lg bg-white border font-semibold">Transaksi Baru</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            <div className="hidden lg:block"><TextSizeSlider value={n.skala} onChange={(v) => set('skala', v)} effective={k} /></div>
            <div className="hidden lg:block">
            <Field label="Template nota">
              <select className={inputCls} value={tpl.id} onChange={(e) => set('template', e.target.value)}>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
              </select>
            </Field>
            </div>
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
                <Field label="No. nota"><NumberFormatInput sep="-" parts={['Kode', 'No. urut']} value={n.nomor} onChange={(v) => set('nomor', v)} /></Field>
                <Field label="Tanggal & jam"><input type="datetime-local" className={inputCls} value={n.waktu} onChange={(e) => set('waktu', e.target.value)} /></Field>
                {txt('kasir', 'Kasir')}
                {txt('pelanggan', 'Pelanggan (opsional)')}
              </div>
              {n.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_4rem_6.5rem_auto] gap-2 items-end">
                  <Field label={i === 0 ? 'Barang' : ''}><AutoTextarea aria-label={`Barang ${i + 1}`} className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} /></Field>
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
                    <select aria-label="Jenis diskon" className="rounded-lg border border-gray-300 px-1 text-sm" value={n.diskonMode} onChange={(e) => set('diskonMode', e.target.value as Nota['diskonMode'])}>
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
          </div>

          <div className="bg-white rounded-2xl shadow p-4 min-w-0">
            <p className="mb-2 text-xs text-gray-500 text-center">Lebar asli {mm}mm • PNG {T.px * 2}px untuk printer thermal</p>
            <FitPreview>
              <div ref={ref} className="w-max shadow-md mx-auto">
                <Receipt n={{ ...n, logo: logo.src }} mm={mm} k={k} />
              </div>
            </FitPreview>
          </div>
        </div>

        {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          <TextSizeSlider value={n.skala} onChange={(v) => set('skala', v)} effective={k} />
          <Field label="Template nota">
            <select className={inputCls} value={tpl.id} onChange={(e) => set('template', e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
            </select>
          </Field>
        </div>

        {/* Tombol unduh di paling bawah */}
        <p className="lg:hidden mt-6 text-center text-sm text-gray-600">Cetak ke printer thermal Bluetooth: unduh PNG lalu buka dengan aplikasi RawBT.</p>
        <div className="lg:hidden flex flex-wrap justify-center gap-3 mt-3 mb-20">
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={logo.busy} onRun={run} />
          <button onClick={transaksiBaru} className="px-5 py-2 rounded-lg bg-white border font-semibold">Transaksi Baru</button>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
