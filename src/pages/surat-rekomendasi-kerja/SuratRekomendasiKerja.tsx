import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import FormSection from '../../shared/components/FormSection';

// Surat Rekomendasi Kerja: surat referensi dari atasan/perusahaan untuk (mantan) karyawan,
// berisi penilaian kompetensi, sikap & pencapaian. Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; perihal: string; kepada: string;
  pNama: string; pJabatan: string; hubungan: string; lamaKenal: string;
  nama: string; jabatan: string; periode: string;
  kompetensi: string; sikap: string; pencapaian: string;
  tingkat: string; tujuan: string; telepon: string; email: string; penutup: string;
  ttdHeading: string; ttdId: string; ttd: string; stempel: string;
};

const STORAGE_KEY = 'surat-rekomendasi-kerja:v1';
const POLA = '{n3}/REK/HRD/{rom}/{yyyy}';
const TINGKAT = ['sangat merekomendasikan', 'merekomendasikan'];
const UMUM = 'Pihak yang Berkepentingan\ndi Tempat';

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT SAMUDRA DIGITAL INDONESIA', subKop: 'Pengembangan Perangkat Lunak & Solusi Teknologi Informasi',
  alamat: 'Gedung Graha Niaga Lt. 9, Jl. Jenderal Sudirman Kav. 58, Senayan, Kebayoran Baru, Jakarta Selatan 12190',
  kontak: 'Telp. (021) 2930-5566 • hrd@samudradigital.co.id • www.samudradigital.co.id',
  judul: 'SURAT REKOMENDASI KERJA', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: new Date().toISOString().slice(0, 10),
  perihal: '', kepada: UMUM,
  pNama: 'Agus Setiawan', pJabatan: 'Manajer Pengembangan Produk', hubungan: 'atasan langsung', lamaKenal: '3 (tiga) tahun',
  nama: 'Nadia Putri Rahmawati', jabatan: 'Analis Sistem Senior', periode: 'Agustus 2023 s.d. Oktober 2026',
  kompetensi: 'Analisis kebutuhan sistem dan penyusunan dokumen spesifikasi yang rinci\nPerancangan basis data dan alur proses bisnis\nKoordinasi lintas tim antara pengembang, penguji, dan pengguna\nKomunikasi yang baik dalam presentasi kepada klien',
  sikap: 'Yang bersangkutan dikenal jujur, disiplin, bertanggung jawab, dan mampu bekerja sama dengan baik dalam tim. Ia selalu menjaga kerahasiaan data perusahaan serta menunjukkan integritas yang tinggi dalam setiap pekerjaan.',
  pencapaian: 'Memimpin analisis sistem informasi gudang yang menurunkan waktu proses stok opname hingga 40%\nMenyelesaikan 12 proyek klien tepat waktu sesuai anggaran\nMeraih penghargaan Karyawan Terbaik Divisi Produk tahun 2025',
  tingkat: TINGKAT[0], tujuan: 'untuk menempati posisi yang sesuai di perusahaan/instansi yang Bapak/Ibu pimpin. Saya yakin yang bersangkutan akan memberikan kontribusi yang baik.',
  telepon: '0812-9876-5432', email: 'agus.setiawan@samudradigital.co.id',
  penutup: 'Demikian surat rekomendasi ini saya buat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.',
  ttdHeading: 'Hormat saya,', ttdId: '', ttd: '', stempel: '',
});

// Data User: identitas kop, pemberi rekomendasi & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'pNama', 'pJabatan', 'telepon', 'email', 'ttdHeading', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>); kosong = baris titik-titik untuk ditulis tangan
function NumList({ text, k, blank }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill(TITIK + TITIK) : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${8 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratRekomendasiKerja() {
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
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-rekomendasi-kerja-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data yang direkomendasikan, lama mengenal & daftar → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const t = (s: string) => (ks || !s.trim() ? TITIK : s.trim());
  const img = (src: string) => (ks ? '' : src);
  const kontak = [f.telepon.trim() && `telepon ${f.telepon.trim()}`, f.email.trim() && `email ${f.email.trim()}`].filter(Boolean).join(' atau ');
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    meta: f.perihal.trim() ? [{ label: 'Perihal', value: f.perihal }] : undefined,
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...f.kepada.split('\n')] : undefined,
    body: (
      <>
        <P>{'Dengan hormat,\nYang bertanda tangan di bawah ini:'}</P>
        <InfoRows rows={[{ label: 'Nama', value: f.pNama }, { label: 'Jabatan', value: f.pJabatan }, { label: 'Perusahaan', value: f.instansi }]} />
        <P>dengan ini memberikan rekomendasi kepada:</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.nama) }, { label: 'Jabatan terakhir', value: v(f.jabatan) }, { label: 'Periode kerja', value: v(f.periode) }]} />
        <P>Saya mengenal yang bersangkutan selama {t(f.lamaKenal)} sebagai {t(f.hubungan)}. Selama bekerja di {f.instansi || TITIK}, yang bersangkutan menunjukkan kompetensi dan keahlian sebagai berikut:</P>
        <NumList text={f.kompetensi} k={kk} blank={ks ? 3 : undefined} />
        <P>{ks ? `${TITIK}${TITIK}${TITIK}` : f.sikap}</P>
        {(f.pencapaian.trim() || ks) && <>
          <P>Beberapa pencapaian yang bersangkutan selama bekerja antara lain:</P>
          <NumList text={f.pencapaian} k={kk} blank={ks ? 3 : undefined} />
        </>}
        <P>Berdasarkan hal tersebut, saya <b>{f.tingkat}</b> Saudara/i {ks ? TITIK : <b>{f.nama}</b>} {f.tujuan}</P>
        {kontak && <P>Apabila diperlukan informasi lebih lanjut, saya bersedia dihubungi melalui {kontak}.</P>}
        <P>{f.penutup}</P>
      </>
    ),
    signers: [{ heading: f.ttdHeading, role: f.pJabatan, name: f.pNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true }],
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
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
  const btn = (on: boolean) => `px-3 min-h-[40px] rounded-lg border text-sm font-medium ${on ? 'bg-blue-600 text-white border-blue-600' : ''}`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Rekomendasi Kerja</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-rekomendasi-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`018/REK/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              {text('perihal', 'Perihal (opsional)')}
              {text('kepada', 'Kepada Yth. (perusahaan tujuan)', 2)}
              <button type="button" className={btn(f.kepada === UMUM)} onClick={() => set('kepada', UMUM)}>Pihak yang Berkepentingan</button>
            </FormSection>

            <FormSection title="Pemberi Rekomendasi">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('pNama', 'Nama')}
                {text('pJabatan', 'Jabatan')}
                {text('hubungan', 'Hubungan kerja (mis. atasan langsung)')}
                {text('lamaKenal', 'Lama mengenal')}
              </div>
            </FormSection>

            <FormSection title="Yang Direkomendasikan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama')}
                {text('jabatan', 'Jabatan terakhir')}
              </div>
              {text('periode', 'Periode kerja (mis. Agustus 2023 s.d. Oktober 2026)')}
            </FormSection>

            <FormSection title="Penilaian">
              {text('kompetensi', 'Kompetensi & keahlian (satu per baris)', 4)}
              {text('sikap', 'Sikap & integritas', 3)}
              {text('pencapaian', 'Pencapaian (satu per baris, opsional)', 3)}
              <p className="text-sm font-medium text-gray-700">Tingkat rekomendasi</p>
              <div className="flex flex-wrap gap-2">
                {TINGKAT.map((x) => <button key={x} type="button" aria-pressed={f.tingkat === x} className={btn(f.tingkat === x)} onClick={() => set('tingkat', x)}>{x[0].toUpperCase() + x.slice(1)}</button>)}
              </div>
              {text('tujuan', 'Lanjutan kalimat rekomendasi', 2)}
            </FormSection>

            <FormSection title="Kontak & Penutup">
              <p className="text-xs text-gray-500">Kesediaan dihubungi (kosongkan keduanya bila tidak perlu).</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('telepon', 'Telepon')}
                {text('email', 'Email')}
              </div>
              {text('penutup', 'Kalimat penutup', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ttdHeading', 'Salam penutup')}
                {text('ttdId', 'NIK karyawan (opsional)')}
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel (opsional)" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
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
