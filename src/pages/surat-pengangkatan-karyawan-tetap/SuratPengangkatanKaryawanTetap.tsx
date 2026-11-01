import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { ClosingSigns, LampiranField, SIGN, lampiranOtomatis, usePagedLetter, type Unit } from '../surat-penawaran-kerja/paged';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Keputusan Pengangkatan Karyawan Tetap: SK direksi yang mengangkat karyawan kontrak (PKWT) /
// masa percobaan menjadi karyawan tetap (PKWTT), dengan menimbang/mengingat, diktum, gaji & hak-kewajiban.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts; isi panjang berlanjut ke halaman berikut.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  lampiranManual: boolean; lampiran: string; // Otomatis = jumlah lembar sesudah halaman 1
  menimbang: string; mengingat: string; pembuka: string;
  nama: string; nik: string; jabatan: string; divisi: string;
  statusSemula: string; periodeSemula: string; tmt: string;
  gaji: string; hak: string; kewajiban: string; penutup: string;
  pakaiUtama: boolean; pakaiKaryawan: boolean; // tanda tangan yang tampil (bebas 1 atau 2)
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdKaryawan: string; tembusan: string;
};

const STORAGE_KEY = 'surat-pengangkatan-karyawan-tetap:v1';
const POLA = '{n3}/SK-KT/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT KEPUTUSAN\nPENGANGKATAN KARYAWAN TETAP', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiranManual: false, lampiran: '',
  menimbang: 'Bahwa karyawan yang bersangkutan telah menyelesaikan masa kontrak kerja dengan hasil penilaian kinerja yang baik.\nBahwa perusahaan membutuhkan tenaga kerja tetap untuk menjamin kesinambungan kegiatan operasional.\nBahwa untuk itu perlu ditetapkan keputusan pengangkatan karyawan tetap.',
  mengingat: 'Undang-Undang Nomor 13 Tahun 2003 tentang Ketenagakerjaan beserta perubahannya.\nPeraturan Pemerintah Nomor 35 Tahun 2021 tentang PKWT, Alih Daya, Waktu Kerja dan Waktu Istirahat, dan PHK.\nPeraturan Perusahaan PT Cahaya Nusantara Abadi yang berlaku.',
  pembuka: 'Mengangkat karyawan dengan data di bawah ini sebagai Karyawan Tetap berdasarkan Perjanjian Kerja Waktu Tidak Tertentu (PKWTT):',
  nama: 'Siti Nurhaliza', nik: 'KRY-2024-0418', jabatan: 'Staf Administrasi Keuangan', divisi: 'Keuangan & Akuntansi',
  statusSemula: 'Karyawan Kontrak (PKWT)', periodeSemula: '1 November 2024 s.d. 31 Oktober 2026', tmt: today(),
  gaji: '6250000',
  hak: 'Menerima gaji pokok dan tunjangan sesuai struktur dan skala upah perusahaan.\nMendapatkan jaminan sosial BPJS Kesehatan dan BPJS Ketenagakerjaan.\nMemperoleh hak cuti tahunan, THR, dan fasilitas lain sesuai Peraturan Perusahaan.',
  kewajiban: 'Melaksanakan tugas dan tanggung jawab jabatan dengan penuh dedikasi.\nMematuhi Peraturan Perusahaan, tata tertib, dan kode etik yang berlaku.\nMenjaga kerahasiaan data dan nama baik perusahaan.',
  penutup: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan dalam keputusan ini akan diadakan perbaikan sebagaimana mestinya.',
  pakaiUtama: true, pakaiKaryawan: false,
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur Utama', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  ttdKaryawan: '', tembusan: 'Manajer Divisi Keuangan & Akuntansi\nKaryawan yang bersangkutan\nArsip HRD',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
const linesOf = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// Daftar bernomor/berhuruf manual (preflight Tailwind menghapus penanda <ol>)
function NumList({ lines, k, alpha }: { lines: string[]; k: number; alpha?: boolean }) {
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{alpha ? `${String.fromCharCode(97 + i)}.` : `${i + 1}.`}</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Baris diktum SK: "Menimbang : isi" / "PERTAMA : isi"; kolom label lebar tetap agar unit terpisah (antarhalaman) tetap sejajar
function Diktum({ items, k }: { items: [string, ReactNode][]; k: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '6.6em max-content 1fr', columnGap: 6 * k, rowGap: 6 * k, margin: `0 0 ${6 * k}px` }}>
      {items.map(([label, isi]) => <div key={label} style={{ display: 'contents' }}><span style={{ fontWeight: 700 }}>{label}</span><span>:</span><div style={{ textAlign: 'justify' }}>{isi}</div></div>)}
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPengangkatanKaryawanTetap() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdKaryawan: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdKaryawan = useBgRemoved(f.ttdKaryawan, bg.ttdKaryawan, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdKaryawan.busy;

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
  const fileName = `sk-karyawan-tetap-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // Template kosongan: data karyawan, status, tanggal & gaji → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const gaji = num(f.gaji);
  const signers = ([
    f.pakaiKaryawan && { heading: 'Yang bersangkutan,', role: 'Karyawan', name: ks ? '' : f.nama, ttd: img(ttdKaryawan.src), ttdOffset: getOffset(f.posisi, 'ttdKaryawan') },
    f.pakaiUtama && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);

  const menimbang = linesOf(f.menimbang);
  const mengingat = linesOf(f.mengingat);
  const hak = linesOf(f.hak);
  const kewajiban = linesOf(f.kewajiban);
  // Bagian diktum yang tampil; diberi nomor berurutan PERTAMA, KEDUA, … sesuai yang tampil
  const diktum: ReactNode[] = [
    <>
      <P>{f.pembuka}</P>
      <InfoRows rows={[
        { label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) },
        { label: 'Jabatan', value: v(f.jabatan) }, { label: 'Divisi', value: v(f.divisi) },
        { label: 'Status semula', value: v([f.statusSemula, f.periodeSemula && `periode ${f.periodeSemula}`].filter(Boolean).join(', ')) },
        { label: 'Status baru', value: 'Karyawan Tetap (PKWTT)' },
        { label: 'Terhitung mulai', value: v(fmtTanggal(f.tmt)) },
      ]} />
    </>,
    (gaji > 0 || ks) && <P style={{ margin: 0 }}>Kepada karyawan tersebut diberikan gaji pokok sebesar <b>Rp {ks ? TITIK : `${rupiah(gaji)},-`}</b> ({ks ? TITIK : terbilangRupiah(gaji)}) per bulan, ditambah tunjangan sesuai ketentuan perusahaan.</P>,
    (hak.length > 0 || kewajiban.length > 0) && <>
      {hak.length > 0 && <><P style={{ margin: 0 }}>Hak karyawan:</P><NumList lines={hak} k={kk} alpha /></>}
      {kewajiban.length > 0 && <><P style={{ margin: `${4 * kk}px 0 0` }}>Kewajiban karyawan:</P><NumList lines={kewajiban} k={kk} alpha /></>}
    </>,
    <P style={{ margin: 0 }}>{f.penutup}</P>,
  ].filter(Boolean);
  const URUT = ['PERTAMA', 'KEDUA', 'KETIGA', 'KEEMPAT'];
  const diktumUrut = diktum.map((isi, i) => [URUT[i], isi] as [string, ReactNode]);

  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  // Unit isi (halaman dipotong di batas unit); diktum terakhir + tanda tangan selalu bersama di halaman terakhir
  const units: Unit[] = [
    ...(menimbang.length ? [{ g: 0, el: <Diktum k={kk} items={[['Menimbang', <NumList lines={menimbang} k={kk} />]]} /> }] : []),
    ...(mengingat.length ? [{ g: 1, el: <Diktum k={kk} items={[['Mengingat', <NumList lines={mengingat} k={kk} />]]} /> }] : []),
    { g: 2, el: <>
      <P style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em', textIndent: 0, marginTop: 4 * kk }}>MEMUTUSKAN</P>
      <P style={{ textIndent: 0 }}><b>Menetapkan</b> : Keputusan Direksi tentang Pengangkatan Karyawan Tetap.</P>
    </> },
    ...diktumUrut.map((d, i) => ({ g: i === diktumUrut.length - 1 ? SIGN : 3 + i, el: <Diktum k={kk} items={[d]} /> })),
    { g: SIGN, el: <ClosingSigns k={kk} placeDate={[f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', ')} signers={signers}
      footer={f.tembusan ? <><div style={{ fontWeight: 700 }}>Tembusan:</div><div style={{ whiteSpace: 'pre-line' }}>{f.tembusan}</div></> : undefined} /> },
  ];
  const { count, render } = usePagedLetter(units, [f, logo.src, ttd.src, stempel.src, ttdKaryawan.src], letterRef, { gaya: f.gaya, pg, kk, title: f.judul, nomor });
  const lampiranAuto = lampiranOtomatis(count);
  const lampiran = f.lampiranManual ? f.lampiran.trim() : lampiranAuto;
  const pages = render({
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor,
    meta: lampiran ? [{ label: 'Lampiran', value: lampiran }] : undefined,
    placeDate: '',
    signers: [],
  });

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <p className="text-xs text-gray-500">Dokumen {count} halaman; isi yang tidak muat otomatis berlanjut ke halaman berikutnya.</p>
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiKaryawan ? [{ id: 'ttdKaryawan', label: 'TTD Karyawan' }] : []),
        ...(f.pakaiUtama ? [{ id: 'ttd', label: 'TTD Direktur' }, { id: 'stempel', label: 'Stempel' }] : []),
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pengangkatan Karyawan Tetap</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pengangkatan-karyawan-tetap" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat Keputusan">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/SK-KT/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Ditetapkan di (kota)')}
                <Field label="Tanggal ditetapkan"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <LampiranField manual={f.lampiranManual} value={f.lampiran} auto={lampiranAuto} onManual={(x) => set('lampiranManual', x)} onValue={(x) => set('lampiran', x)} />
              {text('menimbang', 'Menimbang (opsional, satu poin per baris)', 3)}
              {text('mengingat', 'Mengingat (opsional, satu poin per baris)', 3)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat diktum pertama', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi')}
                {text('statusSemula', 'Status semula (PKWT / masa percobaan)')}
                {text('periodeSemula', 'Periode status semula (opsional)')}
              </div>
              <Field label="Karyawan tetap terhitung mulai"><input type="date" className={inputCls} value={f.tmt} onChange={(e) => set('tmt', e.target.value)} /></Field>
              <Field label="Gaji pokok per bulan (Rp, opsional)">
                <input inputMode="numeric" placeholder="Kosongkan bila tidak dicantumkan" className={inputCls} value={f.gaji} onChange={(e) => set('gaji', e.target.value.replace(/\D/g, ''))} />
              </Field>
              {gaji > 0 && <p className="text-sm text-gray-600">Rp {rupiah(gaji)} — {terbilangRupiah(gaji)}</p>}
            </FormSection>

            <FormSection title="Hak, Kewajiban & Penutup">
              {text('hak', 'Hak karyawan (satu poin per baris)', 3)}
              {text('kewajiban', 'Kewajiban karyawan (satu poin per baris)', 3)}
              {text('penutup', 'Kalimat penutup keputusan', 3)}
              {text('tembusan', 'Tembusan (opsional)', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh keduanya atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiUtama', 'Direktur'], ['pakaiKaryawan', 'Yang bersangkutan (karyawan)']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiUtama && <>
                <p className="text-sm font-bold text-gray-700">Penanda tangan utama</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK / NIP (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan direktur" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiKaryawan && (
                <ImageUpload label="Tanda tangan karyawan (nama mengikuti data karyawan)" value={f.ttdKaryawan} onChange={(x) => set('ttdKaryawan', x)} notify={notify} {...bgFor('ttdKaryawan', ttdKaryawan)} />
              )}
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
