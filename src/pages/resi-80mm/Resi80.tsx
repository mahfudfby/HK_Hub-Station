import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from '../../shared/components/FitPreview';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { ExportButton, Field, ImageUpload, inputCls, fmtTanggal, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { num, rupiah } from '../../shared/lib/money';
import { code128 } from '../../shared/lib/code128';

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
};

const DEFAULT: Resi = {
  ukuran: 'label',
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

// ---------------- Tampilan resi ----------------
// Label 80×100mm memakai tata letak ringkas agar muat; continuous memakai tata letak lega
function Label({ r }: { r: Resi }) {
  const c = r.ukuran === 'label';
  const hp = (v: string) => (r.samarkanHp ? samarkan(v) : v);
  const pad = c ? 6 : 8;
  const gap = c ? 4 : 6;
  const inner = W - pad * 2;
  const box: CSSProperties = { border: '1.5px solid #000', padding: c ? '3px 5px' : 6, marginBottom: gap };
  const head: CSSProperties = { fontSize: c ? 8 : 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 };
  const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
    <div style={box}><div style={head}>{title}</div>{children}</div>
  );
  const isi = r.items.filter((it) => it.nama);
  return (
    <div style={{ width: W, ...(c ? { height: LABEL_H, overflow: 'hidden' } : {}), boxSizing: 'border-box', padding: pad, background: '#fff', color: '#000', fontFamily: 'Arimo, Arial, sans-serif', fontSize: c ? 9.5 : 11, lineHeight: c ? 1.25 : 1.3, wordBreak: 'break-word' }}>
      {/* Kepala: toko & ekspedisi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: '2px solid #000', paddingBottom: gap, marginBottom: gap }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {r.logo && <img src={r.logo} alt="Logo" style={{ height: c ? 24 : 34, maxWidth: 80, objectFit: 'contain' }} />}
          <div style={{ fontWeight: 700, fontSize: c ? 11 : 12 }}>{r.toko}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: c ? 'flex' : 'block', alignItems: 'center', gap: 4 }}>
          <div style={{ fontWeight: 800, fontSize: c ? 13 : 15, lineHeight: 1.1 }}>{r.ekspedisi}</div>
          {r.layanan && <div style={{ display: 'inline-block', marginTop: c ? 0 : 2, padding: '0 5px', border: '1.5px solid #000', fontWeight: 700 }}>{r.layanan}</div>}
        </div>
      </div>

      {/* Barcode nomor resi */}
      <Barcode text={r.noResi} height={c ? 42 : 58} maxWidth={inner} />
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: c ? 12 : 14, letterSpacing: 1.5, margin: `2px 0 ${gap}px` }}>{r.noResi}</div>

      {/* COD / berat / koli */}
      <div style={{ display: 'flex', gap, marginBottom: gap }}>
        <div style={{ flex: 1, ...(r.cod ? { background: '#000', color: '#fff' } : { border: '1.5px solid #000' }), padding: c ? 3 : 6, textAlign: 'center', fontWeight: 800, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {r.cod
            ? <><div style={{ fontSize: c ? 8 : 10 }}>COD</div><div style={{ fontSize: c ? 13 : 15 }}>Rp {rupiah(num(r.nilaiCod))}</div></>
            : <div style={{ fontSize: c ? 12 : 14 }}>NON-COD</div>}
        </div>
        <div style={{ ...box, marginBottom: 0, minWidth: c ? 74 : 82 }}>
          <div>Berat: <b>{r.berat}</b></div>
          <div>Koli: <b>{r.koli}</b></div>
        </div>
      </div>

      <Sec title="Penerima">
        <div style={{ fontWeight: 700, fontSize: c ? 11 : 13 }}>{r.penerima}{c && r.penerimaTelp && <span style={{ fontWeight: 400, fontSize: 9.5 }}> • {hp(r.penerimaTelp)}</span>}</div>
        {!c && r.penerimaTelp && <div>{hp(r.penerimaTelp)}</div>}
        {r.penerimaAlamat && <div>{r.penerimaAlamat}</div>}
        {r.penerimaKota && <div style={{ fontWeight: 700 }}>{r.penerimaKota}</div>}
      </Sec>
      {c ? (
        <div style={box}><span style={head}>Pengirim: </span><b>{r.pengirim}</b>{r.pengirimTelp && ` • ${hp(r.pengirimTelp)}`}{r.pengirimAlamat && ` • ${r.pengirimAlamat}`}</div>
      ) : (
        <Sec title="Pengirim">
          <div style={{ fontWeight: 700 }}>{r.pengirim}</div>
          {r.pengirimTelp && <div>{hp(r.pengirimTelp)}</div>}
          {r.pengirimAlamat && <div>{r.pengirimAlamat}</div>}
        </Sec>
      )}

      {/* Nomor pesanan + barcode kecil */}
      {r.noPesanan && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
            <span>No. Pesanan: <b>{r.noPesanan}</b></span>
            {r.tanggal && <span style={{ whiteSpace: 'nowrap' }}>{fmtTanggal(r.tanggal)}</span>}
          </div>
          <Barcode text={r.noPesanan} height={c ? 18 : 28} maxWidth={inner - 12} />
        </div>
      )}

      {c ? (
        isi.length > 0 && <div style={box}><span style={head}>Isi: </span>{isi.map((it) => `${it.nama} x${it.qty}`).join(', ')}</div>
      ) : (
        <Sec title="Isi paket">
          {isi.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              <span>{it.nama}</span>
              <b style={{ whiteSpace: 'nowrap' }}>x{it.qty}</b>
            </div>
          ))}
        </Sec>
      )}
      {r.catatan && (c
        ? <div style={box}><span style={head}>Catatan: </span>{r.catatan}</div>
        : <Sec title="Catatan"><div style={{ whiteSpace: 'pre-line' }}>{r.catatan}</div></Sec>)}
      {!c && <div style={{ textAlign: 'center', fontSize: 9 }}>Simpan resi ini sebagai bukti pengiriman</div>}
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
              <h2 className="font-bold">Ukuran kertas</h2>
              <div className="flex gap-2" role="radiogroup" aria-label="Ukuran kertas">
                {([['label', 'Label 80×100mm'], ['continuous', 'Continuous 80mm']] as [Ukuran, string][]).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={r.ukuran === v} onClick={() => set('ukuran', v)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${r.ukuran === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>{l}</button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Label: tinggi tetap 100mm (stiker thermal). Continuous: tinggi mengikuti isi (kertas gulung).</p>
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
                <Label r={{ ...r, logo: logo.src }} />
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
          <button onClick={kirimBaru} className="px-5 py-2 rounded-lg bg-white border font-semibold">Pengiriman Baru</button>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
