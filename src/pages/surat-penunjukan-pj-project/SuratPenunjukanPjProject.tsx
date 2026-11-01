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
import { rupiah, terbilangRupiah } from '../../shared/lib/money';

// Surat Penunjukan Penanggung Jawab Project: data project (klien, lokasi, nilai kontrak, periode),
// karyawan yang ditunjuk, daftar tugas (dengan preset), wewenang, pelaporan, tim pendukung.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Anggota = { nama: string; peran: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pembuka: string;
  nama: string; nik: string; jabatan: string; sebagai: string;
  project: string; klien: string; lokasi: string; nilai: string; mulai: string; selesai: string;
  tugas: string[]; wewenang: string;
  laporan: string; laporanKepada: string;
  tim: Anggota[];
  masaBerlaku: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdDitunjuk: boolean; ttdPj: string;
  tembusan: string;
};

const STORAGE_KEY = 'surat-penunjukan-pj-project:v1';
const POLA = '{n3}/SPn-PRJ/{A3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// Preset tugas: mengisi daftar, tetap bisa diedit
const PRESET: Record<string, string[]> = {
  'Proyek Konstruksi': [
    'Menyusun rencana kerja, jadwal pelaksanaan (time schedule), dan kurva S proyek.',
    'Mengendalikan mutu pekerjaan sesuai gambar kerja, spesifikasi teknis, dan kontrak.',
    'Mengoordinasikan subkontraktor, pemasok material, dan konsultan pengawas.',
    'Memastikan penerapan Keselamatan dan Kesehatan Kerja (K3) di lokasi proyek.',
    'Mengendalikan biaya proyek agar tidak melampaui anggaran yang disetujui.',
    'Menyiapkan berita acara kemajuan pekerjaan dan dokumen serah terima kepada klien.',
  ],
  'Proyek IT/Software': [
    'Menyusun ruang lingkup, rencana sprint, dan jadwal rilis aplikasi.',
    'Mengelola kebutuhan klien serta perubahan ruang lingkup (change request).',
    'Mengoordinasikan tim pengembang, penguji (QA), dan desainer.',
    'Memastikan kualitas aplikasi melalui pengujian dan peninjauan kode.',
    'Mengelola risiko, kendala teknis, dan keamanan data project.',
    'Menyiapkan dokumentasi, pelatihan pengguna, dan serah terima sistem kepada klien.',
  ],
  Event: [
    'Menyusun konsep acara, susunan acara (rundown), dan rencana anggaran.',
    'Mengoordinasikan vendor tempat, konsumsi, dekorasi, serta tata suara dan cahaya.',
    'Mengatur pembagian tugas panitia dan relawan acara.',
    'Memastikan perizinan, keamanan, dan keselamatan peserta acara.',
    'Mengendalikan pelaksanaan acara sesuai rundown pada hari pelaksanaan.',
    'Menyusun laporan pertanggungjawaban kegiatan dan keuangan setelah acara.',
  ],
};

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT GRAHA KARYA KONSTRUKSI', subKop: 'Kontraktor Umum, Desain & Bangun',
  alamat: 'Jl. Soekarno-Hatta No. 210, Kel. Batununggal, Kec. Bandung Kidul, Kota Bandung, Jawa Barat 40266',
  kontak: 'Telp. (022) 7512-3344 • info@grahakarya.co.id • www.grahakarya.co.id',
  judul: 'SURAT PENUNJUKAN PENANGGUNG JAWAB PROJECT', nomor: randomDocNo(POLA), kota: 'Bandung', tanggal: today(),
  pembuka: 'Yang bertanda tangan di bawah ini, Direktur PT Graha Karya Konstruksi, dengan ini menunjuk:',
  nama: 'Ir. Fajar Nugroho', nik: 'KRY-2017-0089', jabatan: 'Site Manager', sebagai: 'Project Manager',
  project: 'Pembangunan Gedung Kantor 4 Lantai', klien: 'PT Mitra Sentosa Logistik', lokasi: 'Jl. Raya Cibiru No. 15, Kota Bandung',
  nilai: '8750000000', mulai: today(), selesai: plusDays(240),
  tugas: PRESET['Proyek Konstruksi'],
  wewenang: 'Mengambil keputusan teknis di lapangan sesuai kontrak dan spesifikasi.\nMenyetujui permintaan material dan tenaga kerja sesuai anggaran project.\nMenegur dan memberi arahan kepada anggota tim serta subkontraktor.',
  laporan: 'mingguan', laporanKepada: 'Direktur Operasional',
  tim: [
    { nama: 'Rudi Hartono, S.T.', peran: 'Site Engineer' },
    { nama: 'Maya Sari, S.T.', peran: 'Quantity Surveyor' },
    { nama: 'Agus Salim', peran: 'Petugas K3' },
    { nama: 'Lina Marlina', peran: 'Administrasi Project' },
  ],
  masaBerlaku: 'Penunjukan ini berlaku sejak tanggal ditetapkan sampai dengan project dinyatakan selesai dan diserahterimakan kepada klien.',
  penutup: 'Demikian surat penunjukan ini dibuat untuk dilaksanakan dengan penuh tanggung jawab. Apabila di kemudian hari terdapat kekeliruan, akan diadakan perbaikan seperlunya.',
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur', ttdNama: 'Hendra Kusuma', ttdId: '', ttd: '', stempel: '',
  ttdDitunjuk: true, ttdPj: '',
  tembusan: 'Direktur Operasional\nKlien (PT Mitra Sentosa Logistik)\nArsip',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>; html2canvas tetap akurat)
function NumList({ lines, k }: { lines: string[]; k: number }) {
  const list = lines.map((l) => l.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {list.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Tim pendukung: No | Nama | Peran (kosongan = baris kosong untuk ditulis tangan)
function TimTable({ rows, k }: { rows: Anggota[]; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 18 * k };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.95em' }}>
      <thead><tr>{['No.', 'Nama', 'Peran dalam project'].map((h, i) => <th key={h} style={{ ...cell, width: i ? '47%' : '6%', textAlign: 'center' }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td style={{ ...cell, textAlign: 'center' }}>{i + 1}.</td><td style={cell}>{r.nama}</td><td style={cell}>{r.peran}</td></tr>)}</tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPenunjukanPjProject() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdPj: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdPj = useBgRemoved(f.ttdPj, bg.ttdPj, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdPj.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setTugas = (i: number, s: string) => set('tugas', f.tugas.map((t, j) => (j === i ? s : t)));
  const setTim = (i: number, p: Partial<Anggota>) => set('tim', f.tim.map((a, j) => (j === i ? { ...a, ...p } : a)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdPj.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-penunjukan-pj-project-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data karyawan, project, nilai, tanggal & tim → titik-titik; tugas/wewenang baku tetap; gambar ttd disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const tgl = (s: string) => (ks ? TITIK : fmtTanggal(s));
  const n = Number(f.nilai) || 0;
  const nilai = ks ? '' : n ? `Rp ${rupiah(n)},- (${terbilangRupiah(n)})` : '';
  const tim = ks ? Array<Anggota>(3).fill({ nama: '', peran: '' }) : f.tim.filter((a) => a.nama.trim() || a.peran.trim());
  const signers: LayoutSigner[] = [
    ...(f.ttdDitunjuk ? [{ heading: 'Yang ditunjuk,', role: f.sebagai, name: v(f.nama), idLine: !ks && f.nik ? `NIK. ${f.nik}` : undefined, ttd: ks ? '' : ttdPj.src, ttdOffset: getOffset(f.posisi, 'ttdPj') }] : []),
    { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, tgl(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) }, { label: 'Jabatan', value: v(f.jabatan) }]} />
        <P>sebagai <b>{f.sebagai}</b> pada project berikut:</P>
        <InfoRows rows={[
          { label: 'Nama project', value: v(f.project) }, { label: 'Klien / pemberi kerja', value: v(f.klien) }, { label: 'Lokasi', value: v(f.lokasi) },
          ...(f.nilai || ks ? [{ label: 'Nilai kontrak', value: nilai }] : []),
          { label: 'Periode pelaksanaan', value: ks ? '' : [fmtTanggal(f.mulai), fmtTanggal(f.selesai)].filter(Boolean).join(' s.d. ') },
        ]} />
        {f.tugas.some((t) => t.trim()) && <P style={{ marginBottom: 2 * kk }}><b>Tugas dan Tanggung Jawab:</b></P>}
        <NumList lines={f.tugas} k={kk} />
        {f.wewenang.trim() && <P style={{ marginBottom: 2 * kk }}><b>Wewenang:</b></P>}
        <NumList lines={f.wewenang.split('\n')} k={kk} />
        <P><b>Pelaporan:</b> {f.sebagai} wajib menyampaikan laporan kemajuan project secara {f.laporan} kepada {f.laporanKepada}, serta segera melaporkan setiap kendala yang berpotensi mengganggu jadwal, mutu, atau biaya project.</P>
        {tim.length > 0 && <P style={{ marginBottom: 2 * kk }}>Dalam melaksanakan tugasnya, {f.sebagai} dibantu oleh tim pendukung berikut:</P>}
        {tim.length > 0 && <TimTable rows={tim} k={kk} />}
        <P>{f.masaBerlaku}</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    footer: f.tembusan ? <><div style={{ fontWeight: 700 }}>Tembusan:</div><div style={{ whiteSpace: 'pre-line' }}>{f.tembusan}</div></> : undefined,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'TTD Direktur' }, { id: 'stempel', label: 'Stempel' },
        ...(f.ttdDitunjuk ? [{ id: 'ttdPj', label: 'TTD yang ditunjuk' }] : []),
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
  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick} aria-pressed={active}
      className={`px-3 min-h-[40px] rounded-lg border text-sm font-medium ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Penunjukan Penanggung Jawab Project</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-penunjukan-pj-project" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Kode project', 'Bulan', 'Tahun']} example={`012/SPn-PRJ/GKO/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal ditetapkan"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Yang Ditunjuk</h2>
              {text('pembuka', 'Kalimat pembuka', 2)}
              <div className="grid sm:grid-cols-3 gap-2">
                {text('nama', 'Nama')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan saat ini')}
              </div>
              {text('sebagai', 'Ditunjuk sebagai')}
              <div className="flex flex-wrap gap-2">
                {['Penanggung Jawab Project', 'Project Manager'].map((s) => chip(s, f.sebagai === s, () => set('sebagai', s)))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Project</h2>
              {text('project', 'Nama project')}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('klien', 'Klien / pemberi kerja')}
                {text('lokasi', 'Lokasi project')}
              </div>
              <Field label="Nilai kontrak (Rupiah, opsional)">
                <input inputMode="numeric" className={inputCls} placeholder="Kosongkan bila tidak dicantumkan" value={f.nilai ? rupiah(Number(f.nilai)) : ''}
                  onChange={(e) => set('nilai', e.target.value.replace(/\D/g, '').replace(/^0+/, ''))} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal mulai"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Tanggal selesai"><input type="date" className={inputCls} value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Tugas dan Tanggung Jawab</h2>
              <p className="text-sm text-gray-700">Isi cepat dari contoh (daftar tetap bisa diedit):</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET).map((p) => chip(p, false, () => set('tugas', PRESET[p])))}
              </div>
              {f.tugas.map((t, i) => (
                <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
                  <span className="pt-2 text-sm font-medium text-gray-600">{i + 1}.</span>
                  <AutoTextarea aria-label={`Tugas ${i + 1}`} className={inputCls} value={t} onChange={(e) => setTugas(i, e.target.value)} />
                  <button type="button" onClick={() => set('tugas', f.tugas.filter((_, j) => j !== i))} aria-label={`Hapus tugas ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('tugas', [...f.tugas, ''])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah tugas</button>
              {text('wewenang', 'Wewenang (satu poin per baris)', 3)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pelaporan & Tim</h2>
              <div className="flex flex-wrap gap-2">
                {['mingguan', 'dua mingguan', 'bulanan'].map((s) => chip(`Laporan ${s}`, f.laporan === s, () => set('laporan', s)))}
              </div>
              {text('laporanKepada', 'Laporan disampaikan kepada')}
              <p className="text-sm font-bold text-gray-700">Tim pendukung (opsional)</p>
              {f.tim.map((a, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Nama anggota ${i + 1}`} placeholder="Nama" className={inputCls} value={a.nama} onChange={(e) => setTim(i, { nama: e.target.value })} />
                  <AutoTextarea aria-label={`Peran anggota ${i + 1}`} placeholder="Peran" className={inputCls} value={a.peran} onChange={(e) => setTim(i, { peran: e.target.value })} />
                  <button type="button" onClick={() => set('tim', f.tim.filter((_, j) => j !== i))} aria-label={`Hapus anggota ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('tim', [...f.tim, { nama: '', peran: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah anggota</button>
              {text('masaBerlaku', 'Masa berlaku penunjukan', 2)}
              {text('penutup', 'Kalimat penutup', 2)}
              {text('tembusan', 'Tembusan (opsional)', 2)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ttdHeading', 'Salam penutup')}
                {text('ttdJabatan', 'Jabatan')}
                {text('ttdNama', 'Nama')}
                {text('ttdId', 'NIK karyawan (opsional)')}
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              <Switch checked={f.ttdDitunjuk} onChange={(x) => set('ttdDitunjuk', x)} label={'Tampilkan tanda tangan "Yang ditunjuk," di kiri'} />
              {f.ttdDitunjuk && <ImageUpload label="Tanda tangan yang ditunjuk" value={f.ttdPj} onChange={(x) => set('ttdPj', x)} notify={notify} {...bgFor('ttdPj', ttdPj)} />}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
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
