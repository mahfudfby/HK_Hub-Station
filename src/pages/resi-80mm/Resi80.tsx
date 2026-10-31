import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from '../../shared/components/FitPreview';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { ExportButton, Field, ImageUpload, inputCls, fmtTanggal, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { num, rupiah } from '../../shared/lib/money';
import { code128 } from '../../shared/lib/code128';
import { cssFamily, useGoogleFonts, type WebFont } from '../../shared/lib/fonts';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';

// Resi / label pengiriman untuk printer thermal 80mm (gaya label marketplace, tanpa merek).
// Lebar 288px × skala 2 = PNG 576px = lebar titik cetak printer 80mm. Barcode Code 128 dibuat otomatis dari nomor.
const W = 288;
const MM = 80;
// Ukuran: label 80×100mm (bawaan, tinggi tetap) atau Continuous (tinggi mengikuti isi)
type Ukuran = 'label' | 'continuous';
const LABEL_MM_H = 100;
const LABEL_H = Math.round((W * LABEL_MM_H) / MM); // 360px
const STORAGE_KEY = 'resi-80mm:v1';

type Item = { nama: string; qty: string };
type Resi = {
  ukuran: Ukuran;
  template: string;
  logo: string;
  toko: string;
  ekspedisi: string;
  layanan: string;
  noResi: string;
  noPesanan: string;
  tanggal: string;
  penerima: string;
  penerimaTelp: string;
  penerimaAlamat: string;
  penerimaKota: string;
  pengirim: string;
  pengirimTelp: string;
  pengirimAlamat: string;
  berat: string;
  koli: string;
  cod: boolean;
  nilaiCod: string;
  samarkanHp: boolean;
  items: Item[];
  catatan: string;
  skala: number; // ukuran teks (%)
};

const DEFAULT: Resi = {
  ukuran: 'label',
  template: 'klasik',
  logo: '',
  toko: 'TOKO ANDA',
  ekspedisi: 'EKSPEDISI',
  layanan: 'REG',
  noResi: 'RS0012345678',
  noPesanan: 'ORD-2026-0001',
  tanggal: new Date().toISOString().slice(0, 10),
  penerima: 'Nama Penerima',
  penerimaTelp: '081234567890',
  penerimaAlamat: 'Jl. Contoh No. 10, RT 01/RW 02, Kel. Contoh, Kec. Contoh',
  penerimaKota: 'KOTA CONTOH, PROVINSI 12345',
  pengirim: 'Toko Anda',
  pengirimTelp: '081200000000',
  pengirimAlamat: 'Kota Asal',
  berat: '1 kg',
  koli: '1',
  cod: false,
  nilaiCod: '',
  samarkanHp: true,
  items: [{ nama: 'Contoh produk', qty: '1' }],
  catatan: '',
  skala: 100,
};

// 081234567890 → ********7890
export const samarkan = (hp: string) => (hp.length > 4 ? `${'*'.repeat(hp.length - 4)}${hp.slice(-4)}` : hp);
console.assert(samarkan('081234567890') === '********7890' && samarkan('123') === '123', 'samarkan');

// ---------------- Barcode ----------------
function Barcode({ text, height, maxWidth }: { text: string; height: number; maxWidth: number }) {
  if (!text) return null;
  let bars: number[];
  try {
    bars = code128(text);
  } catch (e: any) {
    return <div style={{ fontSize: 10, textAlign: 'center' }}>{e.message}</div>;
  }
  const modules = bars.reduce((a, b) => a + b, 0);
  const m = Math.floor(maxWidth / (modules + 20)); // lebar modul bulat (px) agar batang tajam saat dicetak
  if (m < 1) return <div style={{ fontSize: 10, textAlign: 'center' }}>Nomor terlalu panjang untuk barcode.</div>;
  return (
    <div role="img" aria-label={`Barcode ${text}`} style={{ display: 'flex', justifyContent: 'center', height }}>
      {bars.map((w, i) => <div key={i} style={{ width: w * m, flexShrink: 0, background: i % 2 ? '#fff' : '#000' }} />)}
    </div>
  );
}

// ---------------- Template ----------------
// Satu template = kombinasi kop, barcode, nomor, COD, kotak & font. Hanya hitam/putih (printer thermal).
// Mode label (tinggi tetap 360px) disisakan ±20px untuk data contoh; garis/padding tiap opsi dihitung agar tetap muat.
type Tpl = {
  id: string; name: string; desc: string;
  font: string; web?: WebFont; k?: number; // k = skala ukuran huruf
  head: 'kanan' | 'kiri' | 'bar' | 'tengah'; // kurir besar di kanan / kiri / pita hitam / tengah
  code?: 'kotak'; // barcode resi dalam bingkai (zona putih tetap ada di dalam)
  num: 'tebal' | 'besar' | 'balik' | 'renggang' | 'garis'; // gaya teks nomor resi
  cod: 'balik' | 'garis' | 'cap'; // COD hitam terbalik / bingkai tebal / cap berbingkai ganda
  box: 'kotak' | 'tab' | 'putus' | 'garis'; // kotak bergaris / judul pita hitam / putus-putus / garis pemisah saja
  bw?: number; // tebal garis kotak
  cols?: boolean; // continuous: penerima & pengirim berdampingan
  isi?: 'nomor'; // continuous: daftar isi bernomor
  foot?: 'bar' | 'garis';
};
const ARIMO = 'Arimo, Arial, sans-serif';
const CARLITO = 'Carlito, Calibri, Arimo, sans-serif';
const TINOS = 'Tinos, "Times New Roman", serif';
const COUSINE = 'Cousine, "Courier New", monospace';
const MONO_FB = 'Cousine, "Courier New", monospace';
const gf = (family: string, fallback = ARIMO) => ({ font: cssFamily(family, fallback), web: { family } as WebFont });
const TEMPLATES: Tpl[] = [
  { id: 'klasik', name: 'Klasik', desc: 'Kurir di kanan, kotak bergaris', font: ARIMO, head: 'kanan', num: 'tebal', cod: 'balik', box: 'kotak' },
  { id: 'kurir-kiri', name: 'Kurir Kiri', desc: 'Kurir besar di kiri, nomor besar', ...gf('Roboto Condensed'), k: 1.05, head: 'kiri', num: 'besar', cod: 'garis', box: 'kotak', cols: true },
  { id: 'pita-hitam', name: 'Pita Hitam', desc: 'Kop hitam, judul tab', ...gf('Barlow Condensed'), k: 1.08, head: 'bar', num: 'balik', cod: 'balik', box: 'tab', cols: true, foot: 'bar' },
  { id: 'terpusat', name: 'Terpusat', desc: 'Kurir di tengah, barcode berbingkai', ...gf('Inter'), k: 0.95, head: 'tengah', code: 'kotak', num: 'tebal', cod: 'cap', box: 'kotak', bw: 1 },
  { id: 'garis-putus', name: 'Garis Putus', desc: 'Huruf ketik, kotak putus-putus', font: COUSINE, head: 'kanan', num: 'renggang', cod: 'garis', box: 'putus', isi: 'nomor', foot: 'garis' },
  { id: 'bingkai-tebal', name: 'Bingkai Tebal', desc: 'Garis tebal, nomor besar', ...gf('Archivo Narrow'), k: 1.05, head: 'kiri', code: 'kotak', num: 'besar', cod: 'balik', box: 'kotak', bw: 2.5 },
  { id: 'minimalis', name: 'Minimalis', desc: 'Tanpa kotak, garis pemisah', ...gf('IBM Plex Sans'), k: 0.95, head: 'kanan', num: 'garis', cod: 'garis', box: 'garis', bw: 1, foot: 'garis' },
  { id: 'tab-label', name: 'Tab Label', desc: 'Judul pita hitam, cap COD', ...gf('Roboto'), head: 'bar', num: 'tebal', cod: 'cap', box: 'tab', cols: true },
  { id: 'ekspres', name: 'Ekspres', desc: 'Huruf tinggi, barcode berbingkai', ...gf('Oswald'), k: 1.05, head: 'bar', code: 'kotak', num: 'besar', cod: 'balik', box: 'kotak', bw: 2 },
  { id: 'mesin-ketik', name: 'Mesin Ketik', desc: 'Space Mono, kotak putus', ...gf('Space Mono', MONO_FB), k: 0.9, head: 'kiri', num: 'renggang', cod: 'cap', box: 'putus', isi: 'nomor' },
  { id: 'modern', name: 'Modern', desc: 'Kurir tengah, nomor terbalik', ...gf('Rubik'), k: 0.95, head: 'tengah', num: 'balik', cod: 'garis', box: 'tab', cols: true },
  { id: 'ringkas', name: 'Ringkas', desc: 'Huruf sempit, garis pemisah', ...gf('PT Sans Narrow'), k: 1.08, head: 'kanan', num: 'garis', cod: 'balik', box: 'garis', isi: 'nomor' },
  { id: 'serif', name: 'Serif', desc: 'Huruf berkait, cap COD', font: TINOS, head: 'tengah', num: 'tebal', cod: 'cap', box: 'kotak', bw: 1, foot: 'garis' },
  { id: 'kantor', name: 'Kantor', desc: 'Carlito, alamat berdampingan', font: CARLITO, k: 1.05, head: 'kiri', num: 'tebal', cod: 'balik', box: 'kotak', cols: true, isi: 'nomor' },
  { id: 'gudang', name: 'Gudang', desc: 'Mono, kop hitam, kotak putus', ...gf('Roboto Mono', MONO_FB), k: 0.92, head: 'bar', code: 'kotak', num: 'renggang', cod: 'garis', box: 'putus' },
  { id: 'tegas', name: 'Tegas', desc: 'Montserrat, garis tebal', ...gf('Montserrat'), k: 0.9, head: 'kiri', num: 'balik', cod: 'balik', box: 'kotak', bw: 2.5 },
  { id: 'bersih', name: 'Bersih', desc: 'Lato, barcode berbingkai', ...gf('Lato'), head: 'kanan', code: 'kotak', num: 'garis', cod: 'cap', box: 'garis', bw: 1 },
  { id: 'marketplace', name: 'Marketplace', desc: 'Kop hitam, nomor besar', ...gf('Source Sans 3'), k: 1.02, head: 'bar', num: 'besar', cod: 'balik', box: 'tab', foot: 'bar' },
  { id: 'kontras', name: 'Kontras', desc: 'Work Sans, bingkai 2px', ...gf('Work Sans'), k: 0.93, head: 'tengah', code: 'kotak', num: 'balik', cod: 'balik', box: 'kotak', bw: 2, cols: true },
  { id: 'cap-pos', name: 'Cap Pos', desc: 'Kurir tengah, cap COD, tab', ...gf('Roboto Condensed'), k: 1.05, head: 'tengah', num: 'renggang', cod: 'cap', box: 'tab', isi: 'nomor', foot: 'bar' },
];
console.assert(TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20, 'TEMPLATES');
const tplOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

// ---------------- Tampilan resi ----------------
// Label 80×100mm memakai tata letak ringkas agar muat; continuous memakai tata letak lega
// k = skala ukuran teks (slider); lebar 288px & tinggi label 360px tetap, lebar modul barcode tidak diskalakan
function Label({ r, k }: { r: Resi; k: number }) {
  const t = tplOf(r.template);
  const c = r.ukuran === 'label';
  const f = (n: number) => n * (t.k ?? 1) * k;
  const s = (n: number) => Math.round(n * k * 2) / 2; // jarak terkait teks
  const bw = t.bw ?? 1.5;
  const line = `${bw}px ${t.box === 'putus' ? 'dashed' : 'solid'} #000`;
  const tab = t.box === 'tab';
  const hp = (v: string) => (r.samarkanHp ? samarkan(v) : v);
  const pad = c ? 12 : 16;
  const gap = s(c ? 3 : 6);
  const inner = W - pad * 2;
  const bpad = c ? `${s(3)}px ${s(5)}px` : s(6);
  const frame: CSSProperties = { border: line, padding: bpad };
  const box: CSSProperties = t.box === 'garis' ? { borderBottom: line, padding: `${s(c ? 3 : 6)}px 0`, marginBottom: gap } : { ...frame, marginBottom: gap };
  const head: CSSProperties = { fontSize: f(c ? 8 : 9), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 };
  const inv: CSSProperties = { background: '#000', color: '#fff' };
  const Sec = ({ title, children, st }: { title: string; children: ReactNode; st?: CSSProperties }) => (tab
    ? <div style={{ ...box, padding: 0, ...st }}><div style={{ ...head, ...inv, padding: '1px 5px' }}>{title}</div><div style={{ padding: bpad }}>{children}</div></div>
    : <div style={{ ...box, ...st }}><div style={head}>{title}</div>{children}</div>);
  const Tag = ({ children }: { children: string }) => (tab
    ? <span style={{ ...head, ...inv, padding: '0 3px', marginRight: 3 }}>{children}</span>
    : <span style={head}>{children}: </span>);
  const isi = r.items.filter((it) => it.nama);

  // Kepala
  const logo = (h: number) => r.logo && <img src={r.logo} alt="Logo" style={{ height: h, maxWidth: 80, objectFit: 'contain' }} />;
  const toko = <div style={{ fontWeight: 700, fontSize: f(c ? 11 : 12) }}>{r.toko}</div>;
  const kurir = (align: 'left' | 'right' | 'center', white = false) => (
    <div style={{ textAlign: align, flexShrink: 0, display: c ? 'flex' : 'block', alignItems: 'center', justifyContent: align === 'center' ? 'center' : undefined, gap: 4 }}>
      <div style={{ fontWeight: 800, fontSize: f(c ? 13 : 15) * (align === 'center' ? 1.15 : 1), lineHeight: 1.1 }}>{r.ekspedisi}</div>
      {r.layanan && <div style={{ display: 'inline-block', marginTop: c ? 0 : 2, padding: '0 5px', border: `1.5px solid ${white ? '#fff' : '#000'}`, fontWeight: 700 }}>{r.layanan}</div>}
    </div>
  );
  const rowHead: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '2px solid #000', paddingBottom: gap, marginBottom: gap };
  const kepala = {
    kanan: <div style={rowHead}><div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>{logo(c ? 24 : 34)}{toko}</div>{kurir('right')}</div>,
    kiri: <div style={rowHead}>{kurir('left')}<div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, textAlign: 'right' }}>{toko}{logo(c ? 24 : 34)}</div></div>,
    // logo di luar pita hitam agar logo gelap tetap terlihat
    bar: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: gap }}>
        {logo(c ? 24 : 34)}
        <div style={{ ...inv, flex: 1, minWidth: 0, padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {kurir('left', true)}
          <div style={{ fontWeight: 700, fontSize: f(c ? 10 : 11), textAlign: 'right', minWidth: 0 }}>{r.toko}</div>
        </div>
      </div>
    ),
    tengah: (
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: gap, marginBottom: gap }}>
        {kurir('center')}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {logo(c ? 16 : 26)}
          <div style={{ fontWeight: 700, fontSize: f(c ? 9.5 : 11) }}>{r.toko}</div>
        </div>
      </div>
    ),
  }[t.head];

  // Barcode + nomor resi (bingkai tidak menyentuh batang: Barcode menyisakan ≥10 modul putih di tiap sisi)
  const kotak = t.code === 'kotak';
  const numBase: CSSProperties = { textAlign: 'center', fontWeight: 700, fontSize: f(c ? 12 : 14), letterSpacing: 1.5, margin: `2px 0 ${kotak ? 0 : gap}px` };
  const numStyle: CSSProperties = {
    tebal: numBase,
    besar: { ...numBase, fontWeight: 800, fontSize: f(c ? 15 : 18), letterSpacing: 1, lineHeight: 1.15 },
    balik: { ...numBase, ...inv, letterSpacing: 2, padding: '1px 0', marginTop: 4 },
    renggang: { ...numBase, fontFamily: COUSINE, letterSpacing: 3 },
    garis: { ...numBase, fontSize: f(c ? 11.5 : 13), letterSpacing: 2, borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '1px 0', marginTop: 4 },
  }[t.num];
  const kode = <>
    <Barcode text={r.noResi} height={c ? Math.max(36, Math.round((kotak ? 36 : 38) * k)) : Math.round((kotak ? 54 : 58) * Math.min(k, 1.2))} maxWidth={kotak ? inner - Math.ceil(bw) * 2 - 12 : inner} />
    <div style={numStyle}>{r.noResi}</div>
  </>;

  // COD
  const codIsi = r.cod
    ? <><div style={{ fontSize: f(c ? 8 : 10) }}>COD</div><div style={{ fontSize: f(c ? 13 : 15) }}>Rp {rupiah(num(r.nilaiCod))}</div></>
    : <div style={{ fontSize: f(c ? 12 : 14) }}>NON-COD</div>;
  const tengahKol: CSSProperties = { textAlign: 'center', fontWeight: 800, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
  const codEl = t.cod === 'cap'
    ? <div style={{ flex: 1, display: 'flex', border: '2px solid #000', padding: 2 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: c ? 1 : 4, letterSpacing: 1, ...tengahKol, ...(r.cod ? inv : {}) }}>{codIsi}</div>
      </div>
    : <div style={{ flex: 1, ...(r.cod && t.cod === 'balik' ? inv : { border: `${t.cod === 'garis' ? 3 : 1.5}px solid #000` }), padding: c ? 3 : 6, ...tengahKol }}>{codIsi}</div>;

  const penerima = (st?: CSSProperties) => (
    <Sec title="Penerima" st={st}>
      <div style={{ fontWeight: 700, fontSize: f(c ? 11 : 13) }}>{r.penerima}{c && r.penerimaTelp && <span style={{ fontWeight: 400, fontSize: f(9.5) }}> • {hp(r.penerimaTelp)}</span>}</div>
      {!c && r.penerimaTelp && <div>{hp(r.penerimaTelp)}</div>}
      {r.penerimaAlamat && <div>{r.penerimaAlamat}</div>}
      {r.penerimaKota && <div style={{ fontWeight: 700 }}>{r.penerimaKota}</div>}
    </Sec>
  );
  const pengirim = (st?: CSSProperties) => (
    <Sec title="Pengirim" st={st}>
      <div style={{ fontWeight: 700 }}>{r.pengirim}</div>
      {r.pengirimTelp && <div>{hp(r.pengirimTelp)}</div>}
      {r.pengirimAlamat && <div>{r.pengirimAlamat}</div>}
    </Sec>
  );

  return (
    <div style={{ width: W, ...(c ? { height: LABEL_H, overflow: 'hidden' } : {}), boxSizing: 'border-box', padding: pad, background: '#fff', color: '#000', fontFamily: t.font, fontSize: f(c ? 9.5 : 11), lineHeight: c ? 1.25 : 1.3, wordBreak: 'break-word' }}>
      {kepala}

      {/* Barcode nomor resi */}
      {kotak ? <div style={{ border: `${bw}px solid #000`, padding: '4px 6px', marginBottom: gap }}>{kode}</div> : kode}

      {/* COD / berat / koli */}
      <div style={{ display: 'flex', gap, marginBottom: gap }}>
        {codEl}
        <div style={{ ...frame, minWidth: s(c ? 74 : 82) }}>
          <div>Berat: <b>{r.berat}</b></div>
          <div>Koli: <b>{r.koli}</b></div>
        </div>
      </div>

      {c ? <>
        {penerima()}
        <div style={box}><Tag>Pengirim</Tag><b>{r.pengirim}</b>{r.pengirimTelp && ` • ${hp(r.pengirimTelp)}`}{r.pengirimAlamat && ` • ${r.pengirimAlamat}`}</div>
      </> : t.cols ? (
        <div style={{ display: 'flex', gap }}>
          {penerima({ flex: 3, minWidth: 0 })}
          {pengirim({ flex: 2, minWidth: 0 })}
        </div>
      ) : <>{penerima()}{pengirim()}</>}

      {/* Nomor pesanan + barcode kecil */}
      {r.noPesanan && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
            <span>No. Pesanan: <b>{r.noPesanan}</b></span>
            {r.tanggal && <span style={{ whiteSpace: 'nowrap' }}>{fmtTanggal(r.tanggal)}</span>}
          </div>
          <Barcode text={r.noPesanan} height={Math.round((c ? 18 : 28) * Math.min(k, 1.2))} maxWidth={inner - 12} />
        </div>
      )}

      {c ? (
        isi.length > 0 && <div style={box}><Tag>Isi</Tag>{isi.map((it) => `${it.nama} x${it.qty}`).join(', ')}</div>
      ) : (
        <Sec title="Isi paket">
          {isi.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, ...(t.isi === 'nomor' && i < isi.length - 1 ? { borderBottom: '1px dashed #000' } : {}) }}>
              <span>{t.isi === 'nomor' && `${i + 1}. `}{it.nama}</span>
              <b style={{ whiteSpace: 'nowrap' }}>x{it.qty}</b>
            </div>
          ))}
        </Sec>
      )}
      {r.catatan && (c
        ? <div style={box}><Tag>Catatan</Tag>{r.catatan}</div>
        : <Sec title="Catatan"><div style={{ whiteSpace: 'pre-line' }}>{r.catatan}</div></Sec>)}
      {!c && (
        <div style={{ textAlign: 'center', fontSize: f(9), ...(t.foot === 'bar' ? { ...inv, fontWeight: 700, padding: '2px 0' } : t.foot === 'garis' ? { borderTop: '1px dashed #000', paddingTop: 4 } : {}) }}>
          Simpan resi ini sebagai bukti pengiriman
        </div>
      )}
    </div>
  );
}

// ---------------- Editor ----------------
export default function Resi80() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [r, setR] = useState<Resi>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  const [logoBg, setLogoBg] = useState(false);
  const logo = useBgRemoved(r.logo, logoBg, (m) => notify('error', m));
  const ref = useRef<HTMLDivElement>(null);
  useGoogleFonts([tplOf(r.template).web]);
  // Label: tinggi tetap → k diturunkan sampai muat; continuous: hanya lebar dijaga
  const k = useFitScale(r.skala / 100, () => ref.current?.firstElementChild as HTMLElement, r.ukuran === 'label', [r, logo.src]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
    } catch {
      notify('error', 'Logo terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [r, notify]);

  const set = <K extends keyof Resi>(k: K, v: Resi[K]) => setR((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', r.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const fileName = `resi-${(r.noResi || 'pengiriman').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify,
    (page) => (r.ukuran === 'label' ? { w: MM, h: LABEL_MM_H } : { w: MM, h: Math.ceil((MM * page.offsetHeight) / W) }), 2);
  // Pilihan ukuran kertas: di form (desktop) dan di paling bawah (ponsel)
  const ukuranPicker = (
    <>
      <h2 className="font-bold">Ukuran kertas</h2>
      <div className="flex gap-2" role="radiogroup" aria-label="Ukuran kertas">
        {([['label', 'Label 80×100mm'], ['continuous', 'Continuous 80mm']] as [Ukuran, string][]).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={r.ukuran === v} onClick={() => set('ukuran', v)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${r.ukuran === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>{l}</button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Label: tinggi tetap 100mm (stiker thermal). Continuous: tinggi mengikuti isi (kertas gulung).</p>
    </>
  );
  const txt = (k: keyof Resi, label: string, rows = 1) => (
    <Field label={label}>
      {rows > 1
        ? <textarea rows={rows} className={inputCls} value={r[k] as string} onChange={(e) => set(k, e.target.value as never)} />
        : <input className={inputCls} value={r[k] as string} onChange={(e) => set(k, e.target.value as never)} />}
    </Field>
  );
  const check = (k: 'cod' | 'samarkanHp', label: string) => (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 min-h-[44px]">
      <input type="checkbox" className="h-5 w-5" checked={r[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
    </label>
  );
  const kirimBaru = () => {
    setR((p) => ({ ...p, noResi: '', noPesanan: '', tanggal: new Date().toISOString().slice(0, 10), penerima: '', penerimaTelp: '', penerimaAlamat: '', penerimaKota: '', cod: false, nilaiCod: '', items: [{ nama: '', qty: '1' }], catatan: '' }));
    notify('info', 'Form dikosongkan untuk pengiriman baru.');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Resi Pengiriman 80mm</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            <section className="space-y-3">
              <TextSizeSlider value={r.skala} onChange={(v) => set('skala', v)} effective={k} />
              <div className="hidden lg:block">
              <Field label="Template resi">
                <select className={inputCls} value={tplOf(r.template).id} onChange={(e) => set('template', e.target.value)}>
                  {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
                </select>
              </Field>
              </div>
              <div className="hidden lg:block space-y-3">{ukuranPicker}</div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Toko &amp; Ekspedisi</h2>
              <ImageUpload label="Upload logo toko" value={r.logo} onChange={(v) => set('logo', v)} notify={notify}
                bg={logoBg} onBg={setLogoBg} shown={logo.src} bgBusy={logo.busy} />
              {txt('toko', 'Nama toko')}
              <div className="grid grid-cols-2 gap-2">
                {txt('ekspedisi', 'Ekspedisi / kurir')}
                {txt('layanan', 'Layanan (REG/YES/dll.)')}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Nomor (barcode otomatis)</h2>
              <div className="grid grid-cols-2 gap-2">
                {txt('noResi', 'No. resi')}
                {txt('noPesanan', 'No. pesanan')}
              </div>
              <Field label="Tanggal kirim"><input type="date" className={inputCls} value={r.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              <p className="text-xs text-gray-500">Barcode Code 128 dibuat otomatis dari nomor dan bisa dipindai. Maks. ±19 karakter.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penerima</h2>
              <div className="grid grid-cols-2 gap-2">
                {txt('penerima', 'Nama')}
                {txt('penerimaTelp', 'No. HP')}
              </div>
              {txt('penerimaAlamat', 'Alamat lengkap', 2)}
              {txt('penerimaKota', 'Kota, provinsi, kode pos')}
              {check('samarkanHp', 'Samarkan nomor HP (tampil 4 digit terakhir)')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pengirim</h2>
              <div className="grid grid-cols-2 gap-2">
                {txt('pengirim', 'Nama')}
                {txt('pengirimTelp', 'No. HP')}
              </div>
              {txt('pengirimAlamat', 'Alamat / kota asal')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Paket</h2>
              <div className="grid grid-cols-2 gap-2">
                {txt('berat', 'Berat')}
                {txt('koli', 'Jumlah koli')}
              </div>
              {check('cod', 'COD (bayar di tempat)')}
              {r.cod && <Field label="Nilai COD (Rp)"><input type="number" min={0} className={inputCls} value={r.nilaiCod} onChange={(e) => set('nilaiCod', e.target.value)} /></Field>}
              {r.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_4.5rem_auto] gap-2 items-end">
                  <Field label={i === 0 ? 'Isi paket' : ''}><input aria-label={`Isi paket ${i + 1}`} className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Qty' : ''}><input aria-label={`Qty ${i + 1}`} type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                  <button type="button" onClick={() => set('items', r.items.filter((_, j) => j !== i))} disabled={r.items.length === 1}
                    aria-label={`Hapus isi paket ${i + 1}`} className="h-[38px] px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('items', [...r.items, { nama: '', qty: '1' }])} className="text-sm font-medium text-blue-700">+ Tambah isi paket</button>
              {txt('catatan', 'Catatan (opsional)', 2)}
            </section>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 min-w-0">
            <p className="mb-2 text-xs text-gray-500 text-center">{r.ukuran === 'label' ? 'Label 80×100mm • PNG 576×720px' : 'Continuous 80mm • PNG lebar 576px'}</p>
            <FitPreview>
              <div ref={ref} className="w-max shadow-md mx-auto">
                <Label r={{ ...r, logo: logo.src }} k={k} />
              </div>
            </FitPreview>
          </div>
        </div>

        {/* Ponsel: pilihan template di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          {ukuranPicker}
          <Field label="Template resi">
            <select className={inputCls} value={tplOf(r.template).id} onChange={(e) => set('template', e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
            </select>
          </Field>
        </div>

        {/* Tombol unduh di paling bawah */}
        <p className="mt-6 text-center text-sm text-gray-600">Cetak ke printer thermal Bluetooth: unduh PNG lalu buka dengan aplikasi RawBT.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-3 mb-20">
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={logo.busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={logo.busy} onRun={run} />
          <button onClick={kirimBaru} className="px-5 py-2 rounded-lg bg-white border font-semibold">Pengiriman Baru</button>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
