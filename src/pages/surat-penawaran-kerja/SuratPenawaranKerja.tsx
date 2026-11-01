import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { Switch, TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutPicker, P, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { ClosingSigns, LampiranField, SIGN, lampiranOtomatis, usePagedLetter, type Unit } from './paged';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Penawaran Kerja (Offer Letter): penawaran resmi HRD kepada kandidat terpilih berisi posisi,
// status kerja, kompensasi (gaji pokok + tunjangan, total otomatis), benefit & batas konfirmasi.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts; isi panjang berlanjut ke halaman berikut.

// ============================================================
// SECTION: Data
// ============================================================
type Tunjangan = { label: string; nominal: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; perihal: string;
  lampiranManual: boolean; lampiran: string; // Otomatis = jumlah lembar sesudah halaman 1
  kandidat: string; alamatKandidat: string; pembuka: string;
  jabatan: string; departemen: string; atasan: string; statusKerja: string; mulai: string;
  lokasi: string; jamKerja: string;
  gajiPokok: string; tunjangan: Tunjangan[];
  benefit: string; percobaan: string; dokumen: string; batas: string; penutup: string;
  pakaiHrd: boolean; pakaiKandidat: boolean;
  ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
};

const STORAGE_KEY = 'surat-penawaran-kerja:v1';
const POLA = '{n3}/OL/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const STATUS = ['PKWT (Kontrak 12 bulan)', 'PKWTT (Karyawan Tetap)', 'Probation (Masa Percobaan)', 'Magang'];

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT PENAWARAN KERJA', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(), perihal: 'Penawaran Kerja',
  lampiranManual: false, lampiran: '',
  kandidat: 'Sdr. Rizky Ramadhan', alamatKandidat: 'Jl. Kenanga No. 7, RT 002/RW 005, Kel. Pondok Labu, Jakarta Selatan',
  pembuka: 'Dengan hormat,\nMenindaklanjuti rangkaian proses seleksi yang telah Saudara ikuti, dengan senang hati kami menawarkan kepada Saudara untuk bergabung bersama perusahaan kami dengan ketentuan sebagai berikut:',
  jabatan: 'Staf Pemasaran Digital', departemen: 'Pemasaran', atasan: 'Dimas Saputra (Manajer Pemasaran)',
  statusKerja: STATUS[0], mulai: plusDays(14),
  lokasi: 'Kantor Pusat Jakarta', jamKerja: 'Senin–Jumat, 08.00–17.00 WIB',
  gajiPokok: '6000000',
  tunjangan: [{ label: 'Tunjangan transportasi', nominal: '750000' }, { label: 'Tunjangan makan', nominal: '600000' }, { label: 'Tunjangan komunikasi', nominal: '250000' }],
  benefit: 'BPJS Kesehatan dan BPJS Ketenagakerjaan\nTunjangan Hari Raya (THR) sesuai ketentuan yang berlaku\nCuti tahunan 12 (dua belas) hari kerja\nPelatihan dan pengembangan kompetensi',
  percobaan: '3 (tiga) bulan sejak tanggal mulai bekerja',
  dokumen: 'Fotokopi KTP dan Kartu Keluarga\nFotokopi ijazah dan transkrip nilai terakhir\nPas foto berwarna 3x4 (2 lembar)\nNomor NPWP dan buku rekening bank',
  batas: plusDays(5),
  penutup: 'Apabila Saudara menerima penawaran ini, mohon menandatangani salinan surat ini dan mengembalikannya kepada Divisi HRD. Kami menantikan kehadiran Saudara sebagai bagian dari tim kami.',
  pakaiHrd: true, pakaiKandidat: true,
  ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>); kosong = baris titik-titik
function NumList({ text, k, blank }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill(TITIK + TITIK) : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Komponen | Jumlah per bulan, baris total tebal; kosong = baris kosong untuk ditulis tangan
function KompensasiTable({ rows, total, k, kosong }: { rows: [string, number][]; total: number; k: number; kosong: boolean }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, height: 18 * k };
  const list: [string, string][] = kosong ? [['Gaji pokok', ''], ['', ''], ['', ''], ['', '']] : rows.map(([l, n]) => [l, `Rp ${rupiah(n)}`]);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.95em' }}>
      <thead><tr><th style={{ ...cell, textAlign: 'left' }}>Komponen</th><th style={{ ...cell, width: '36%', textAlign: 'right' }}>Jumlah / bulan</th></tr></thead>
      <tbody>
        {list.map((r, i) => <tr key={i}><td style={cell}>{r[0]}</td><td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>{r[1]}</td></tr>)}
        <tr style={{ fontWeight: 700 }}><td style={cell}>Total penghasilan bruto</td><td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>{kosong ? '' : `Rp ${rupiah(total)}`}</td></tr>
      </tbody>
    </table>
  );
}

function TunjanganEditor({ rows, onChange }: { rows: Tunjangan[]; onChange: (r: Tunjangan[]) => void }) {
  const setRow = (i: number, p: Partial<Tunjangan>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] gap-2 items-start">
          <AutoTextarea aria-label={`Nama tunjangan ${i + 1}`} placeholder="Nama tunjangan" className={inputCls} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
          <input type="number" min="0" inputMode="numeric" aria-label={`Nominal ${r.label || `tunjangan ${i + 1}`} (Rp)`} placeholder="Rp" className={`${inputCls} min-h-[40px]`} value={r.nominal} onChange={(e) => setRow(i, { nominal: e.target.value })} />
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Hapus tunjangan ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { label: '', nominal: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah tunjangan</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPenawaranKerja() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved, nomor: orRandomNo(saved.nomor, POLA) } : d;
    } catch {
      return d;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = f.skala / 100; // huruf normal (tidak dikecilkan otomatis); isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `surat-penawaran-kerja-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  const komponen: [string, number][] = [['Gaji pokok', num(f.gajiPokok)], ...f.tunjangan.filter((t) => t.label.trim() || num(t.nominal)).map((t): [string, number] => [t.label, num(t.nominal)])];
  const total = komponen.reduce((s, [, n]) => s + n, 0);

  // Template kosongan: data kandidat, posisi, tanggal & nominal → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const tgl = (s: string) => (ks ? TITIK : fmtTanggal(s));
  const signers = ([
    f.pakaiKandidat && { heading: 'Menyetujui,', role: 'Kandidat', name: ks ? '' : f.kandidat },
    f.pakaiHrd && { heading: 'Hormat kami,', role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  // Unit isi (halaman dipotong di batas unit); penutup + tanda tangan selalu bersama di halaman terakhir
  const units: Unit[] = [
    { g: 0, el: <P>{f.pembuka}</P> },
    { g: 1, el: <InfoRows rows={[
      { label: 'Posisi / jabatan', value: v(f.jabatan) }, { label: 'Departemen', value: v(f.departemen) },
      { label: 'Atasan langsung', value: v(f.atasan) }, { label: 'Status kerja', value: v(f.statusKerja) },
      { label: 'Tanggal mulai', value: ks ? '' : fmtTanggal(f.mulai) }, { label: 'Lokasi kerja', value: v(f.lokasi) },
      { label: 'Jam kerja', value: v(f.jamKerja) },
      ...(f.percobaan.trim() ? [{ label: 'Masa percobaan', value: v(f.percobaan) }] : []),
    ]} /> },
    { g: 2, el: <><P>Kompensasi yang akan Saudara terima setiap bulan adalah sebagai berikut:</P><KompensasiTable rows={komponen} total={total} k={kk} kosong={ks} /></> },
    ...(f.benefit.trim() ? [{ g: 3, el: <><P>Selain itu, Saudara berhak memperoleh fasilitas dan benefit berikut:</P><NumList text={f.benefit} k={kk} /></> }] : []),
    ...(f.dokumen.trim() ? [{ g: 4, el: <><P>Pada hari pertama bekerja, mohon membawa dokumen berikut:</P><NumList text={f.dokumen} k={kk} /></> }] : []),
    { g: 5, el: <P>Mohon konfirmasi atas penawaran ini paling lambat tanggal <b>{tgl(f.batas)}</b>. Apabila sampai batas waktu tersebut kami belum menerima konfirmasi, penawaran ini dianggap batal.</P> },
    { g: SIGN, el: <P>{f.penutup}</P> },
    { g: SIGN, el: <ClosingSigns placeDate={[f.kota, tgl(f.tanggal)].filter(Boolean).join(', ')} signers={signers} k={kk} /> },
  ];
  const { count, render } = usePagedLetter(units, [f, logo.src, ttd.src, stempel.src], letterRef, { gaya: f.gaya, pg, kk, title: f.judul, nomor });
  const lampiranAuto = lampiranOtomatis(count);
  const lampiran = f.lampiranManual ? f.lampiran.trim() : lampiranAuto;
  const pages = render({
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor,
    meta: [{ label: 'Lampiran', value: lampiran }, { label: 'Perihal', value: f.perihal.trim() }].filter((r) => r.value),
    placeDate: '',
    recipient: ['Kepada Yth.', ks ? TITIK : f.kandidat, ...(ks ? [TITIK] : f.alamatKandidat.split('\n')), 'di Tempat'].filter(Boolean),
    signers: [],
  });

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <p className="text-xs text-gray-500">Dokumen {count} halaman; isi yang tidak muat otomatis berlanjut ke halaman berikutnya.</p>
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, ...(f.pakaiHrd ? [{ id: 'ttd', label: 'TTD HRD' }, { id: 'stempel', label: 'Stempel' }] : [])]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(x) => set('posisi', x)} />
      <LayoutPicker value={f.gaya} onChange={(x) => set('gaya', x)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(x) => set('paper', x)} onLandscape={(x) => set('landscape', x)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );
  const text = (key: keyof Form, label: string, rows?: number) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );
  const date = (key: keyof Form, label: string) => (
    <Field label={label}><input type="date" className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Penawaran Kerja (Offer Letter)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-penawaran-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/OL/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                {date('tanggal', 'Tanggal surat')}
                {text('perihal', 'Perihal (opsional)')}
              </div>
              <LampiranField manual={f.lampiranManual} value={f.lampiran} auto={lampiranAuto} onManual={(x) => set('lampiranManual', x)} onValue={(x) => set('lampiran', x)} />
            </FormSection>

            <FormSection title="Kandidat & Posisi">
              {text('kandidat', 'Nama kandidat')}
              {text('alamatKandidat', 'Alamat kandidat', 2)}
              {text('pembuka', 'Kalimat pembuka', 3)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('jabatan', 'Posisi / jabatan')}
                {text('departemen', 'Departemen')}
                {text('atasan', 'Atasan langsung')}
                <Field label="Status kerja">
                  <input list="status-kerja" className={`${inputCls} min-h-[40px]`} value={f.statusKerja} onChange={(e) => set('statusKerja', e.target.value)} />
                  <datalist id="status-kerja">{STATUS.map((s) => <option key={s} value={s} />)}</datalist>
                </Field>
                {date('mulai', 'Tanggal mulai bekerja')}
                {text('lokasi', 'Lokasi kerja')}
                {text('jamKerja', 'Jam kerja')}
                {text('percobaan', 'Masa percobaan (opsional)')}
              </div>
            </FormSection>

            <FormSection title="Kompensasi">
              <Field label="Gaji pokok (Rp / bulan)"><input type="number" min="0" inputMode="numeric" className={`${inputCls} min-h-[40px]`} value={f.gajiPokok} onChange={(e) => set('gajiPokok', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Tunjangan</p>
              <TunjanganEditor rows={f.tunjangan} onChange={(x) => set('tunjangan', x)} />
              <p className="text-sm text-gray-700">Total (otomatis): <b>Rp {rupiah(total)}</b></p>
              {text('benefit', 'Benefit (satu per baris)', 4)}
            </FormSection>

            <FormSection title="Konfirmasi & Penutup">
              {text('dokumen', 'Dokumen yang harus dibawa (satu per baris)', 4)}
              {date('batas', 'Batas waktu konfirmasi')}
              {text('penutup', 'Kalimat penutup', 3)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh keduanya atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiHrd', 'HRD (pengirim)'], ['pakaiKandidat', 'Kolom persetujuan kandidat']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiHrd && <>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdJabatan', 'Jabatan (HRD)')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max flex flex-col gap-6">
              {pages}
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
