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
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Keterangan Penghasilan Karyawan: dikeluarkan perusahaan (HRD/Finance) untuk karyawannya,
// sebagai syarat KPR, kredit, beasiswa anak, atau visa. Beda dengan versi kelurahan (surat-keterangan-penghasilan):
// berisi data kepegawaian & rincian komponen gaji (bruto, potongan, take home pay).

// ============================================================
// SECTION: Data
// ============================================================
type Komp = { label: string; jumlah: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; kepada: string;
  pembuka: string;
  nama: string; nik: string; ktp: string; jabatan: string; divisi: string; status: string; mulai: string;
  pengantarGaji: string; penghasilan: Komp[]; pakaiPotongan: boolean; potongan: Komp[];
  keperluan: string; pernyataan: string;
  pakaiUtama: boolean; ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  pakaiDirektur: boolean; dirJabatan: string; dirNama: string; ttdDir: string;
};

const STORAGE_KEY = 'surat-keterangan-penghasilan-karyawan:v1';
const POLA = '{n3}/SKP/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT KETERANGAN PENGHASILAN', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  kepada: 'Pimpinan Bank Mandiri\nKantor Cabang Jakarta Sudirman\ndi Tempat',
  pembuka: 'Yang bertanda tangan di bawah ini, atas nama manajemen PT Cahaya Nusantara Abadi, dengan ini menerangkan bahwa:',
  nama: 'Andi Pratama', nik: 'KRY-2019-0127', ktp: '3174051203890004', jabatan: 'Supervisor Gudang', divisi: 'Logistik & Pergudangan',
  status: 'Karyawan Tetap (PKWTT)', mulai: '2019-03-01',
  pengantarGaji: 'adalah benar karyawan aktif di perusahaan kami dan sampai dengan surat ini diterbitkan menerima penghasilan setiap bulan dengan rincian sebagai berikut:',
  penghasilan: [
    { label: 'Gaji pokok', jumlah: '7500000' },
    { label: 'Tunjangan jabatan', jumlah: '1500000' },
    { label: 'Tunjangan transportasi', jumlah: '750000' },
    { label: 'Tunjangan makan', jumlah: '660000' },
  ],
  pakaiPotongan: true,
  potongan: [
    { label: 'BPJS Kesehatan (1%)', jumlah: '75000' },
    { label: 'BPJS Ketenagakerjaan JHT & JP (3%)', jumlah: '225000' },
    { label: 'PPh Pasal 21', jumlah: '260000' },
  ],
  keperluan: 'Surat keterangan ini diberikan untuk keperluan pengajuan Kredit Pemilikan Rumah (KPR) atas nama karyawan yang bersangkutan.',
  pernyataan: 'Demikian surat keterangan ini kami buat dengan sebenarnya berdasarkan data kepegawaian dan penggajian perusahaan, untuk dipergunakan sebagaimana mestinya. Apabila diperlukan konfirmasi, Bapak/Ibu dapat menghubungi bagian HRD pada kontak di atas.',
  pakaiUtama: true, ttdHeading: 'Hormat kami,', ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
  pakaiDirektur: false, dirJabatan: 'Direktur Utama', dirNama: 'Hendra Wijaya', ttdDir: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel', 'dirJabatan', 'dirNama', 'ttdDir'] as const;

const total = (rows: Komp[]) => rows.reduce((s, r) => s + num(r.jumlah), 0);

// ============================================================
// SECTION: Tabel rincian penghasilan
// ============================================================
function GajiTable({ penghasilan, potongan, k, kosong }: { penghasilan: Komp[]; potongan: Komp[] | null; k: number; kosong: boolean }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 18 * k };
  const amt = { ...cell, textAlign: 'right' as const, whiteSpace: 'nowrap' as const, width: '34%' };
  const rp = (n: number) => (kosong ? '' : `Rp ${rupiah(n)}`);
  const rows = (list: Komp[], minus = false) => (kosong ? Array<Komp>(list === potongan ? 2 : 4).fill({ label: '', jumlah: '' }) : list.filter((r) => r.label.trim() || num(r.jumlah)))
    .map((r, i) => <tr key={i}><td style={cell}>{r.label}</td><td style={amt}>{kosong ? '' : `${minus ? '(' : ''}Rp ${rupiah(num(r.jumlah))}${minus ? ')' : ''}`}</td></tr>);
  const bold = (label: string, n: number) => <tr><td style={{ ...cell, fontWeight: 700 }}>{label}</td><td style={{ ...amt, fontWeight: 700 }}>{rp(n)}</td></tr>;
  const bruto = total(penghasilan);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.95em' }}>
      <thead><tr><th style={{ ...cell, textAlign: 'left' }}>Komponen Penghasilan</th><th style={{ ...amt, textAlign: 'center' }}>Jumlah per Bulan</th></tr></thead>
      <tbody>
        {rows(penghasilan)}
        {bold('Total Penghasilan Bruto', bruto)}
        {potongan && <>
          <tr><td colSpan={2} style={{ ...cell, fontStyle: 'italic' }}>Potongan</td></tr>
          {rows(potongan, true)}
          {bold('Total Potongan', total(potongan))}
          {bold('Penghasilan Bersih (Take Home Pay)', bruto - total(potongan))}
        </>}
      </tbody>
    </table>
  );
}

function KompEditor({ rows, onChange, label }: { rows: Komp[]; onChange: (r: Komp[]) => void; label: string }) {
  const setRow = (i: number, p: Partial<Komp>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] gap-2 items-start">
          <AutoTextarea aria-label={`${label} ${i + 1}`} placeholder="Komponen" className={inputCls} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
          <input type="number" min="0" inputMode="numeric" aria-label={`Jumlah ${r.label || `${label} ${i + 1}`} (Rp)`} placeholder="Rp" className={inputCls}
            value={r.jumlah} onChange={(e) => setRow(i, { jumlah: e.target.value })} />
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Hapus ${label} ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { label: '', jumlah: '0' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {label}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKeteranganPenghasilanKaryawan() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdDir: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdDir = useBgRemoved(f.ttdDir, bg.ttdDir, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdDir.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdDir.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-keterangan-penghasilan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data karyawan, nominal & tanggal → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const thp = total(f.penghasilan) - (f.pakaiPotongan ? total(f.potongan) : 0);
  const signers = ([
    f.pakaiDirektur && { heading: 'Mengetahui,', role: f.dirJabatan, name: f.dirNama, ttd: img(ttdDir.src), ttdOffset: getOffset(f.posisi, 'ttdDir') },
    f.pakaiUtama && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...f.kepada.split('\n')] : undefined,
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Nama', value: v(f.nama) },
          { label: 'NIK karyawan', value: v(f.nik) },
          ...(f.ktp.trim() || ks ? [{ label: 'NIK KTP', value: v(f.ktp) }] : []),
          { label: 'Jabatan', value: v(f.jabatan) },
          { label: 'Divisi / bagian', value: v(f.divisi) },
          { label: 'Status kepegawaian', value: v(f.status) },
          { label: 'Mulai bekerja', value: ks ? '' : fmtTanggal(f.mulai) },
        ]} />
        <P>{f.pengantarGaji}</P>
        <GajiTable penghasilan={f.penghasilan} potongan={f.pakaiPotongan ? f.potongan : null} k={kk} kosong={ks} />
        <P>Terbilang: <i>{ks ? TITIK + TITIK : terbilangRupiah(thp)}</i> {f.pakaiPotongan ? '(penghasilan bersih per bulan).' : '(penghasilan bruto per bulan).'}</P>
        <P>{f.keperluan}</P>
        <P>{f.pernyataan}</P>
      </>
    ),
    signers,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiUtama ? [{ id: 'ttd', label: 'TTD HRD/Finance' }, { id: 'stempel', label: 'Stempel' }] : []),
        ...(f.pakaiDirektur ? [{ id: 'ttdDir', label: 'TTD Direktur' }] : []),
      ]} active={geser} onActive={setGeser} value={f.posisi} onChange={(x) => set('posisi', x)} />
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Penghasilan Karyawan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-keterangan-penghasilan-karyawan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`034/SKP/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              {text('kepada', 'Kepada Yth. (bank/instansi tujuan, opsional)', 2)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat pembuka', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('ktp', 'NIK KTP (opsional)')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi / bagian')}
                {text('status', 'Status kepegawaian')}
                <Field label="Mulai bekerja"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Rincian Penghasilan per Bulan">
              {text('pengantarGaji', 'Kalimat pengantar rincian', 2)}
              <KompEditor label="komponen" rows={f.penghasilan} onChange={(x) => set('penghasilan', x)} />
              <p className="text-sm font-semibold text-gray-700">Total bruto: Rp {rupiah(total(f.penghasilan))}</p>
              <Switch checked={f.pakaiPotongan} onChange={(x) => set('pakaiPotongan', x)} label="Cantumkan potongan & take home pay" />
              {f.pakaiPotongan && <>
                <KompEditor label="potongan" rows={f.potongan} onChange={(x) => set('potongan', x)} />
                <p className="text-sm font-semibold text-gray-700">Take home pay: Rp {rupiah(thp)}</p>
              </>}
              <p className="text-sm text-gray-600">{terbilangRupiah(thp)}</p>
            </FormSection>

            <FormSection title="Keperluan & Penutup">
              {text('keperluan', 'Keperluan surat (KPR, kredit, beasiswa, visa, dll.)', 2)}
              {text('pernyataan', 'Pernyataan kebenaran data & penutup', 3)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiUtama', 'HRD/Finance'], ['pakaiDirektur', 'Mengetahui, Direktur']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiUtama && <>
                <p className="text-sm font-bold text-gray-700">Penanda tangan utama (HRD/Finance)</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiDirektur && <>
                <p className="text-sm font-bold text-gray-700">Mengetahui</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('dirJabatan', 'Jabatan')}{text('dirNama', 'Nama')}</div>
                <ImageUpload label="Tanda tangan direktur" value={f.ttdDir} onChange={(x) => set('ttdDir', x)} notify={notify} {...bgFor('ttdDir', ttdDir)} />
              </>}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} doc={doc} k={kk} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
