import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from '../../shared/components/FitPreview';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { ExportButton, Field, ImageUpload, inputCls, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { num, rupiah } from '../../shared/lib/money';

// Nota pembelian untuk printer thermal 58mm.
// Lebar nota 192px × skala 2 = PNG 384px = lebar titik cetak printer 58mm (RawBT dll.), ±32 karakter per baris.
const NOTA_W = 192;
const PAPER_W_MM = 58;
const STORAGE_KEY = 'nota-58mm:v1';

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
  diskon: string;
  pajak: string;
  metode: string;
  bayar: string;
  footer: string;
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
  diskon: '',
  pajak: '',
  metode: 'Tunai',
  bayar: '100000',
  footer: 'Terima kasih atas kunjungan Anda\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan',
};

function calc(n: Nota) {
  const lines = n.items.map((it) => num(it.qty) * num(it.harga));
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const diskon = num(n.diskon);
  const pajak = Math.round(((subtotal - diskon) * num(n.pajak)) / 100);
  const total = subtotal - diskon + pajak;
  const bayar = num(n.bayar);
  return { lines, subtotal, diskon, pajak, total, bayar, kembali: bayar - total };
}
{
  const c = calc({ ...DEFAULT, diskon: '8000', pajak: '10' });
  // 2×18000 + 22000 = 58000; -8000 = 50000; pajak 5000; total 55000; kembali 45000
  console.assert(c.subtotal === 58000 && c.pajak === 5000 && c.total === 55000 && c.kembali === 45000, 'Nota58 calc');
}

const fmtWaktu = (v: string) => {
  if (!v) return '';
  const d = new Date(v);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ---------------- Tampilan nota ----------------
const line: CSSProperties = { borderTop: '1px dashed #000', margin: '4px 0' };
const Row = ({ l, r, bold }: { l: string; r: string; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontWeight: bold ? 700 : 400 }}>
    <span>{l}</span>
    <span style={{ whiteSpace: 'nowrap' }}>{r}</span>
  </div>
);

function Receipt({ n }: { n: Nota }) {
  const c = calc(n);
  return (
    <div style={{ width: NOTA_W, boxSizing: 'border-box', padding: '8px 6px 14px', background: '#fff', color: '#000', fontFamily: 'Cousine, "Courier New", monospace', fontSize: 10, lineHeight: 1.35, wordBreak: 'break-word' }}>
      <div style={{ textAlign: 'center' }}>
        {n.logo && <img src={n.logo} alt="Logo" style={{ display: 'block', margin: '0 auto 4px', maxHeight: 48, maxWidth: 120, objectFit: 'contain' }} />}
        <div style={{ fontWeight: 700, fontSize: 12 }}>{n.toko}</div>
        {n.alamat && <div style={{ whiteSpace: 'pre-line' }}>{n.alamat}</div>}
        {n.telp && <div>Telp. {n.telp}</div>}
      </div>
      <div style={line} />
      <Row l="No" r={n.nomor} />
      <Row l="Tgl" r={fmtWaktu(n.waktu)} />
      {n.kasir && <Row l="Kasir" r={n.kasir} />}
      {n.pelanggan && <Row l="Plg" r={n.pelanggan} />}
      <div style={line} />
      {n.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <div>{it.nama}</div>
          <Row l={`  ${it.qty} x ${rupiah(num(it.harga))}`} r={rupiah(c.lines[i])} />
        </div>
      ))}
      <div style={line} />
      <Row l="Subtotal" r={rupiah(c.subtotal)} />
      {c.diskon > 0 && <Row l="Diskon" r={`-${rupiah(c.diskon)}`} />}
      {c.pajak > 0 && <Row l={`Pajak ${n.pajak}%`} r={rupiah(c.pajak)} />}
      <div style={{ fontSize: 12 }}><Row l="TOTAL" r={rupiah(c.total)} bold /></div>
      <div style={line} />
      <Row l={n.metode || 'Bayar'} r={rupiah(c.bayar)} />
      {n.metode === 'Tunai' && <Row l="Kembali" r={rupiah(Math.max(0, c.kembali))} />}
      <div style={line} />
      {n.footer && <div style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>{n.footer}</div>}
    </div>
  );
}

// ---------------- Editor ----------------
export default function Nota58() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [n, setN] = useState<Nota>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  const [logoBg, setLogoBg] = useState(false);
  const logo = useBgRemoved(n.logo, logoBg, (m) => notify('error', m));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    } catch {
      notify('error', 'Logo terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [n, notify]);

  const set = <K extends keyof Nota>(k: K, v: Nota[K]) => setN((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<Item>) => set('items', n.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const c = calc(n);

  const fileName = `nota-${(n.nomor || 'transaksi').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  // Tinggi kertas mengikuti panjang nota
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify,
    (page) => ({ w: PAPER_W_MM, h: Math.ceil((PAPER_W_MM * page.offsetHeight) / NOTA_W) }), 2);
  const transaksiBaru = () => {
    const m = n.nomor.match(/^(.*?)(\d+)$/);
    const nomor = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : n.nomor;
    setN((p) => ({ ...p, nomor, waktu: nowLocal(), pelanggan: '', items: [{ nama: '', qty: '1', harga: '' }], diskon: '', bayar: '' }));
    notify('info', `Transaksi baru ${nomor}.`);
  };
  const txt = (k: keyof Nota, label: string, rows = 1) => (
    <Field label={label}>
      {rows > 1
        ? <textarea rows={rows} className={inputCls} value={n[k] as string} onChange={(e) => set(k, e.target.value as never)} />
        : <input className={inputCls} value={n[k] as string} onChange={(e) => set(k, e.target.value as never)} />}
    </Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Nota Pembelian 58mm</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            <section className="space-y-3">
              <h2 className="font-bold">Toko</h2>
              {txt('toko', 'Nama toko')}
              {txt('alamat', 'Alamat', 2)}
              {txt('telp', 'Telepon')}
              <ImageUpload label="Logo (opsional)" value={n.logo} onChange={(v) => set('logo', v)} notify={notify}
                bg={logoBg} onBg={setLogoBg} shown={logo.src} bgBusy={logo.busy} />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Transaksi</h2>
              <div className="grid grid-cols-2 gap-2">
                {txt('nomor', 'No. nota')}
                <Field label="Tanggal & jam"><input type="datetime-local" className={inputCls} value={n.waktu} onChange={(e) => set('waktu', e.target.value)} /></Field>
                {txt('kasir', 'Kasir')}
                {txt('pelanggan', 'Pelanggan (opsional)')}
              </div>
              {n.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_4rem_6.5rem_auto] gap-2 items-end">
                  <Field label={i === 0 ? 'Barang' : ''}><input aria-label={`Barang ${i + 1}`} className={inputCls} value={it.nama} onChange={(e) => setItem(i, { nama: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Qty' : ''}><input aria-label={`Qty ${i + 1}`} type="number" min={0} className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Harga' : ''}><input aria-label={`Harga ${i + 1}`} type="number" min={0} className={inputCls} value={it.harga} onChange={(e) => setItem(i, { harga: e.target.value })} /></Field>
                  <button type="button" onClick={() => set('items', n.items.filter((_, j) => j !== i))} disabled={n.items.length === 1}
                    aria-label={`Hapus barang ${i + 1}`} className="h-[38px] px-3 rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('items', [...n.items, { nama: '', qty: '1', harga: '' }])} className="text-sm font-medium text-blue-700">+ Tambah barang</button>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Diskon (Rp)"><input type="number" min={0} className={inputCls} value={n.diskon} onChange={(e) => set('diskon', e.target.value)} /></Field>
                <Field label="Pajak %"><input type="number" min={0} className={inputCls} value={n.pajak} onChange={(e) => set('pajak', e.target.value)} /></Field>
                <Field label="Metode bayar">
                  <select className={inputCls} value={n.metode} onChange={(e) => set('metode', e.target.value)}>
                    {['Tunai', 'QRIS', 'Debit', 'Transfer'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Dibayar (Rp)"><input type="number" min={0} className={inputCls} value={n.bayar} onChange={(e) => set('bayar', e.target.value)} /></Field>
              </div>
              <div className="text-right text-sm">
                Total <b>Rp {rupiah(c.total)}</b>
                {n.metode === 'Tunai' && <> • Kembali <b className={c.kembali < 0 ? 'text-red-600' : ''}>Rp {rupiah(c.kembali)}</b></>}
              </div>
              {txt('footer', 'Pesan bawah nota', 2)}
            </section>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 min-w-0">
            <p className="mb-2 text-xs text-gray-500 text-center">Lebar asli 58mm • PNG 384px untuk printer thermal</p>
            <FitPreview>
              <div ref={ref} className="w-max shadow-md mx-auto">
                <Receipt n={{ ...n, logo: logo.src }} />
              </div>
            </FitPreview>
          </div>
        </div>

        {/* Tombol unduh di paling bawah */}
        <p className="mt-6 text-center text-sm text-gray-600">Cetak ke printer thermal Bluetooth: unduh PNG lalu buka dengan aplikasi RawBT.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-3 mb-20">
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
