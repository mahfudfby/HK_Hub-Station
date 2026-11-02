import UserData from './UserData';
import AutoTextarea from './AutoTextarea';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FitPreview from './FitPreview';
import { CanvasPanel, ModeTabs, useCanvasMode } from './CanvasMode';
import SharedGallery from './SharedGallery';
import { Toast, type ToastState } from './Feedback';
import { ExportButton, Field, ImageUpload, inputCls, paperOf, PaperPicker, useLetterExport, type Notify } from './LetterKit';
import { notaLayout } from './ThermalNota';
import { useBgRemoved } from '../lib/removeBg';
import { num, rupiah } from '../lib/money';
import { cssFamily, useGoogleFonts } from '../lib/fonts';
import { TextSizeSlider, useFitScale } from './TextScale';
import DocOptions, { TITIK_PENDEK } from './DocOptions';
import FormSection from './FormSection';

// Struk / karcis thermal 58mm gaya struk transaksi bergerbang: kop berlogo, lokasi, tanggal & kode, nomor seri,
// rincian perjalanan/kendaraan, golongan + tarif (besar), pembayaran & sisa saldo.
// Dua menu memakai komponen ini: Struk Parkir dan Tiket Travel. Kop, logo & isi SELALU diisi usaha pemakai sendiri.
// Lebar nota × skala 2 = lebar titik printer: 58mm → 192px → PNG 384px (siap RawBT).
export type StrukKind = 'parkir' | 'travel';

type Struk = {
  usaha: string;
  alamat: string;
  telp: string;
  logo: string;
  lokasi: string; // nama lokasi parkir / loket (tengah, besar)
  waktu: string; // datetime-local (detik): waktu keluar / terbit tiket
  kode: string; // kode shift / loket (kanan atas)
  seri1: string;
  seri2: string;
  waktuMasuk: string; // parkir
  nopol: string; // parkir
  asal: string; // travel
  tujuan: string; // travel
  berangkat: string; // travel, datetime-local
  penumpang: string; // travel
  kursi: string; // travel
  golongan: string;
  tarif: string;
  metode: 'Tunai' | 'Kartu / e-Money' | 'QRIS';
  kartuNo: string;
  saldo: string;
  footer: string;
  huruf: string;
  skala: number; // ukuran teks (%)
  paper: string; // id PAPERS; bawaan T58
  landscape: boolean;
  pakaiNomor: boolean; // tampilkan baris No Seri
  kosong: boolean; // template kosongan untuk diisi tangan
};

const nowLocal = (menit = 0) => {
  const d = new Date(Date.now() + menit * 60_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19); // dengan detik, seperti struk asli
};
const randomSeri = () => String(Math.floor(100000 + Math.random() * 900000));

const BASE: Struk = {
  usaha: 'NAMA USAHA ANDA',
  alamat: 'Jl. Contoh No. 1, Kota',
  telp: '0812-0000-0000',
  logo: '',
  lokasi: '',
  waktu: '',
  kode: '',
  seri1: '',
  seri2: '01/001',
  waktuMasuk: '',
  nopol: '',
  asal: '',
  tujuan: '',
  berangkat: '',
  penumpang: '',
  kursi: '',
  golongan: 'GOL-1',
  tarif: '',
  metode: 'Tunai',
  kartuNo: '',
  saldo: '',
  footer: '',
  huruf: 'Cousine',
  skala: 100,
  paper: 'T58',
  landscape: false,
  pakaiNomor: true,
  kosong: false,
};

const KIND: Record<StrukKind, { judul: string; defaults: () => Struk }> = {
  parkir: {
    judul: 'Struk Parkir 58mm',
    defaults: () => ({
      ...BASE, usaha: 'PENGELOLA PARKIR ANDA', lokasi: 'PARKIR UTAMA', kode: 'SHIFT 1', seri1: randomSeri(),
      waktu: nowLocal(), waktuMasuk: nowLocal(-135), nopol: 'B 1234 XYZ', golongan: 'GOL-1 MOBIL', tarif: '6000',
      footer: 'Terima kasih\nKarcis hilang dikenakan denda sesuai ketentuan',
    }),
  },
  travel: {
    judul: 'Tiket Travel 58mm',
    defaults: () => ({
      ...BASE, usaha: 'NAMA TRAVEL ANDA', lokasi: 'LOKET UTAMA', kode: 'LOKET 1', seri1: randomSeri(),
      waktu: nowLocal(), asal: 'KOTA ASAL', tujuan: 'KOTA TUJUAN', berangkat: nowLocal(1440), penumpang: 'Nama Penumpang',
      kursi: 'Kursi 1 • Armada 01', golongan: 'GOL-1 REGULER', tarif: '75000',
      footer: 'Hadir 30 menit sebelum berangkat\nTiket tidak dapat diuangkan kembali',
    }),
  },
};

const HURUF: { id: string; label: string; fallback: string }[] = [
  { id: 'Cousine', label: 'Cousine — mono (mirip struk asli)', fallback: 'monospace' },
  { id: 'Courier Prime', label: 'Courier Prime — mesin ketik', fallback: 'monospace' },
  { id: 'Arimo', label: 'Arimo — sans-serif', fallback: 'sans-serif' },
];
const hurufOf = (id: string) => HURUF.find((h) => h.id === id) ?? HURUF[0];

const pad2 = (x: number) => String(x).padStart(2, '0');
const fmtWaktu = (v: string) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
// Lama parkir: selisih waktu masuk dan keluar ("2 jam 15 menit"); kosong bila tidak masuk akal
const durasi = (masuk: string, keluar: string) => {
  const m = Math.round((new Date(keluar).getTime() - new Date(masuk).getTime()) / 60_000);
  if (!Number.isFinite(m) || m <= 0) return '';
  return `${Math.floor(m / 60)} jam ${m % 60} menit`;
};
console.assert(durasi('2026-01-01T10:00:00', '2026-01-01T12:15:00') === '2 jam 15 menit' && durasi('2026-01-01T12:00:00', '2026-01-01T10:00:00') === '' && durasi('', '') === '', 'durasi');

// ---------------- Tampilan struk ----------------
function Receipt({ n, kind, T, k }: { n: Struk; kind: StrukKind; T: ReturnType<typeof notaLayout>; k: number }) {
  const K = n.kosong;
  const v = (s: string) => (K ? TITIK_PENDEK : s);
  const fs = (d: number) => (T.font + d) * k; // lebar struk tetap, hanya huruf yang ikut skala
  const kartu = n.metode !== 'Tunai';
  const logoW = Math.min(52 * k, T.px - 2 * T.pad[1]);
  const waktu = K ? '……/……/20…… ……:……:……' : fmtWaktu(n.waktu);

  // Baris rincian "LABEL : isi" (label lebar tetap agar titik dua sejajar). Isian kosong dilewati kecuali mode kosongan.
  const lama = kind === 'parkir' ? durasi(n.waktuMasuk, n.waktu) : '';
  const seri = `${n.seri1} ${n.seri2}`.trim();
  const rows: [string, string][] = [
    ...(n.pakaiNomor ? [['No Seri', v(seri)] as [string, string]] : []),
    ...(kind === 'parkir'
      ? [['MASUK', K ? waktu : fmtWaktu(n.waktuMasuk)], ['DURASI', K ? TITIK_PENDEK : lama], ['NOPOL', v(n.nopol)]] as [string, string][]
      : [['ASAL', v(n.asal)], ['TUJUAN', v(n.tujuan)], ['JADWAL', K ? waktu : fmtWaktu(n.berangkat)], ['NAMA', v(n.penumpang)], ['KURSI', v(n.kursi)]] as [string, string][]),
  ].filter(([, val]) => K || val);

  return (
    <div style={{
      width: T.px, height: T.h, overflow: T.h ? 'hidden' : undefined, boxSizing: 'border-box', padding: `${T.pad[0]}px ${T.pad[1]}px ${T.pad[2]}px`,
      background: '#fff', color: '#000', fontFamily: cssFamily(hurufOf(n.huruf).id, hurufOf(n.huruf).fallback), fontSize: fs(0), lineHeight: 1.35, wordBreak: 'break-word',
    }}>
      {/* Kop: logo kiri + nama, alamat & info kanan (tanpa logo: tengah) */}
      <div style={{ display: 'flex', gap: 6 * k, alignItems: 'center', justifyContent: n.logo ? 'flex-start' : 'center', textAlign: n.logo ? 'left' : 'center' }}>
        {n.logo && <img src={n.logo} alt="Logo" style={{ width: logoW, maxHeight: logoW, objectFit: 'contain', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{n.usaha}</div>
          {n.alamat && <div style={{ whiteSpace: 'pre-line', fontSize: fs(-1) }}>{n.alamat}</div>}
          {n.telp && <div style={{ fontSize: fs(-1) }}>Info : {n.telp}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'center', textTransform: 'uppercase', margin: `${8 * k}px 0 ${6 * k}px`, fontSize: fs(1) }}>{v(n.lokasi)}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 * k }}>
        <span>{waktu}</span>
        <span style={{ whiteSpace: 'nowrap' }}>{v(n.kode)}</span>
      </div>
      {rows.map(([l, val]) => (
        <div key={l} style={{ display: 'flex' }}>
          <span style={{ width: '7ch', flexShrink: 0 }}>{l}</span>
          <span style={{ minWidth: 0 }}>: {val}</span>
        </div>
      ))}

      {/* Golongan + tarif: baris besar seperti struk asli */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 * k, fontWeight: 700, fontSize: fs(4), margin: `${4 * k}px 0`, lineHeight: 1.2 }}>
        <span style={{ minWidth: 0 }}>{v(n.golongan)}</span>
        <span style={{ whiteSpace: 'nowrap' }}>{K ? 'Rp ………' : `Rp ${rupiah(num(n.tarif))}`}</span>
      </div>

      {K ? (
        <>
          <div>Bayar : {TITIK_PENDEK}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sisa Saldo</span><span>Rp. ………</span></div>
        </>
      ) : (
        <>
          <div>{kind === 'travel' ? 'Bayar' : 'Metode'} : {n.metode}</div>
          {kartu && n.kartuNo && <div>{kind === 'parkir' ? 'CN' : 'Ref'} : {n.kartuNo}</div>}
          {kind === 'parkir' && kartu && n.saldo && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sisa Saldo</span><span>Rp. {rupiah(num(n.saldo))}</span></div>
          )}
        </>
      )}

      {n.footer && <div style={{ whiteSpace: 'pre-line', textAlign: 'center', marginTop: 8 * k, fontSize: fs(-1) }}>{n.footer}</div>}
    </div>
  );
}

// ---------------- Editor ----------------
export default function ThermalStruk({ kind }: { kind: StrukKind }) {
  const cfg = KIND[kind];
  const STORAGE_KEY = `struk-${kind}-58mm:v1`;
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [n, setN] = useState<Struk>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...cfg.defaults(), ...saved } : cfg.defaults();
    } catch {
      return cfg.defaults();
    }
  });
  const [logoBg, setLogoBg] = useState(false);
  const logo = useBgRemoved(n.logo, logoBg, (m) => notify('error', m));
  const ref = useRef<HTMLDivElement>(null);
  useGoogleFonts([{ family: hurufOf(n.huruf).id, weights: [400, 700] }]);
  const T = notaLayout(n.paper, n.landscape, 58);
  // Kertas gulung: tinggi bebas, skala hanya diturunkan bila isi lebih lebar dari kertas; kertas lembar: juga bila lebih tinggi
  const k = useFitScale(n.skala / 100, () => ref.current?.firstElementChild as HTMLElement, !T.roll, [n, logo.src]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    } catch {
      notify('error', 'Logo terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [n, notify, STORAGE_KEY]);

  const set = <K extends keyof Struk>(key: K, v: Struk[K]) => setN((p) => ({ ...p, [key]: v }));
  const fileName = `${kind === 'parkir' ? 'struk-parkir' : 'tiket-travel'}-${(n.seri1 || 'transaksi').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  // Kertas gulung: tinggi mengikuti panjang struk; kertas lembar: ukuran halaman tetap
  const { exporting, run } = useLetterExport(() => ref.current!.firstElementChild as HTMLElement, fileName, notify,
    (page) => (T.roll ? { w: T.paper.w, h: Math.ceil((T.paper.w * page.offsetHeight) / T.px) } : T.paper), T.roll ? 2 : 3);
  const transaksiBaru = () => {
    const d = cfg.defaults();
    const urut = String(Number(n.seri1.replace(/\D/g, '') || 0) + 1).padStart(Math.max(6, n.seri1.length), '0');
    setN((p) => ({ ...p, seri1: urut, waktu: d.waktu, waktuMasuk: d.waktuMasuk, berangkat: d.berangkat, nopol: '', penumpang: '', kursi: '', kartuNo: '', saldo: '' }));
    notify('info', `Transaksi baru No Seri ${urut}.`);
  };
  const txt = (key: keyof Struk, label: string, rows = 1, placeholder?: string) => (
    <Field label={label}>
      <AutoTextarea rows={rows} className={inputCls} value={n[key] as string} placeholder={placeholder} onChange={(e) => set(key, e.target.value as never)} />
    </Field>
  );
  const tgl = (key: 'waktu' | 'waktuMasuk' | 'berangkat', label: string) => (
    <Field label={label}><input type="datetime-local" step={1} className={inputCls} value={n[key]} onChange={(e) => set(key, e.target.value)} /></Field>
  );

  const [canvas, setCanvas] = useCanvasMode();
  const userKeys = ['usaha', 'alamat', 'telp', 'logo', 'lokasi', 'kode', 'golongan', 'footer', 'huruf'] as const;
  const tampilan = (
    <>
      <PaperPicker paper={n.paper} landscape={n.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
      <TextSizeSlider value={n.skala} onChange={(v) => set('skala', v)} effective={k} />
      <Field label="Jenis huruf">
        <select className={inputCls} value={hurufOf(n.huruf).id} onChange={(e) => set('huruf', e.target.value)}>
          {HURUF.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
        </select>
      </Field>
      <DocOptions nomor={{ value: n.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: n.kosong, onChange: (v) => set('kosong', v) }} />
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
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">{cfg.judul}</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={userKeys} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey={`data-user:struk-${kind}`} keys={userKeys} data={n} onApply={(u) => setN((p) => ({ ...p, ...u }))} />
            <FormSection title="Usaha (kop)">
              <ImageUpload label="Upload logo (kiri atas)" value={n.logo} onChange={(v) => set('logo', v)} notify={notify}
                bg={logoBg} onBg={setLogoBg} shown={logo.src} bgBusy={logo.busy} />
              {txt('usaha', kind === 'parkir' ? 'Nama pengelola parkir' : 'Nama travel / armada')}
              {txt('alamat', 'Alamat', 2)}
              {txt('telp', 'Telepon info')}
            </FormSection>

            <FormSection title={kind === 'parkir' ? 'Transaksi Parkir' : 'Data Tiket'}>
              {txt('lokasi', kind === 'parkir' ? 'Lokasi / pintu parkir' : 'Loket / agen penerbit')}
              <div className="grid grid-cols-2 gap-2">
                {tgl('waktu', kind === 'parkir' ? 'Waktu keluar' : 'Waktu terbit')}
                {txt('kode', 'Kode shift / loket')}
                <Field label="No Seri (nomor tiket)"><input className={inputCls} inputMode="numeric" value={n.seri1} onChange={(e) => set('seri1', e.target.value)} /></Field>
                {txt('seri2', 'No Seri (loket/urut)')}
              </div>
              {kind === 'parkir' ? (
                <div className="grid grid-cols-2 gap-2">
                  {tgl('waktuMasuk', 'Waktu masuk')}
                  {txt('nopol', 'Nomor polisi')}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {txt('asal', 'Asal')}
                    {txt('tujuan', 'Tujuan')}
                    {tgl('berangkat', 'Jadwal berangkat')}
                    {txt('penumpang', 'Nama penumpang')}
                  </div>
                  {txt('kursi', 'Kursi / armada')}
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                {txt('golongan', 'Golongan / kelas', 1, 'mis. GOL-1 MOBIL')}
                <Field label="Tarif (Rp)"><input type="number" min={0} className={inputCls} value={n.tarif} onChange={(e) => set('tarif', e.target.value)} /></Field>
                <Field label="Metode bayar">
                  <select className={inputCls} value={n.metode} onChange={(e) => set('metode', e.target.value as Struk['metode'])}>
                    <option>Tunai</option>
                    <option>Kartu / e-Money</option>
                    <option>QRIS</option>
                  </select>
                </Field>
                {n.metode !== 'Tunai' && txt('kartuNo', kind === 'parkir' ? 'Nomor kartu (CN)' : 'No. referensi')}
                {n.metode !== 'Tunai' && kind === 'parkir' && (
                  <Field label="Sisa saldo (Rp)"><input type="number" min={0} className={inputCls} value={n.saldo} onChange={(e) => set('saldo', e.target.value)} /></Field>
                )}
              </div>
              {txt('footer', 'Pesan bawah', 2)}
            </FormSection>
            </>)}
          </div>

          <div className="bg-white rounded-2xl shadow p-4 min-w-0">
            <p className="mb-2 text-xs text-gray-500 text-center">{paperOf(n.paper, 'T58').label}{T.roll ? ` • PNG ${T.px * 2}px untuk printer thermal` : ''}</p>
            <FitPreview>
              <div ref={ref} className="w-max shadow-md mx-auto">
                <Receipt n={{ ...n, logo: logo.src }} kind={kind} T={T} k={k} />
              </div>
            </FitPreview>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
