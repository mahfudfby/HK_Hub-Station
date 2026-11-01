import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { Dots, ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import DocOptions, { TITIK } from '../../shared/components/DocOptions';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import FormSection from '../../shared/components/FormSection';

// Surat Pengunduran Diri (resign profesional): surat pribadi berkop karyawan, tanpa nomor dokumen.
// Menu berdiri sendiri (form & penyimpanan terpisah). Bahan bersama: tata letak (LetterLayouts), kertas/ekspor (LetterKit).

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; nama: string; profesi: string; alamat: string; telepon: string; email: string; web: string;
  kota: string; tanggal: string;
  kepada: string; perusahaan: string; alamatTujuan: string;
  nik: string; jabatan: string; divisi: string; efektif: string; alasan: string;
  salam: string; serahTerima: string; terimaKasih: string; penutup: string;
  ttdHeading: string; ttd: string;
  atasanOn: boolean; atasanJabatan: string; atasanNama: string; ttdAtasan: string;
  kosong: boolean;
};

const STORAGE_KEY = 'surat-pengunduran-diri:v1';
const isoOf = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => isoOf(new Date());
const plus30 = () => isoOf(new Date(Date.now() + 30 * 86400000)); // one-month notice

// Pilihan cepat alasan (mengisi kalimat alasan; tetap bisa diedit)
const ALASAN: Record<string, string> = {
  'Melanjutkan karier': 'Keputusan ini saya ambil setelah melalui pertimbangan yang matang untuk melanjutkan pengembangan karier saya di bidang lain.',
  'Melanjutkan pendidikan': 'Keputusan ini saya ambil karena saya akan melanjutkan pendidikan ke jenjang yang lebih tinggi sehingga tidak dapat lagi menjalankan tugas secara penuh.',
  'Alasan keluarga': 'Keputusan ini saya ambil karena adanya keperluan keluarga yang membutuhkan perhatian dan waktu saya secara penuh.',
  Lainnya: 'Keputusan ini saya ambil karena alasan pribadi setelah melalui pertimbangan yang matang.',
};

const DEFAULT: Form = {
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', nama: 'Dewi Lestari, S.E.', profesi: 'Staf Keuangan',
  alamat: 'Jl. Kenanga No. 7, RT 002/RW 005, Kel. Cempaka Putih, Kec. Cempaka Putih, Jakarta Pusat 10510',
  telepon: '0813-2468-1357', email: 'dewi.lestari@email.com', web: '',
  kota: 'Jakarta', tanggal: today(),
  kepada: 'Bapak/Ibu Manajer HRD', perusahaan: 'PT Sentosa Abadi Nusantara', alamatTujuan: 'Jl. Jenderal Sudirman Kav. 21, Jakarta Selatan',
  nik: 'KRY-2021-0457', jabatan: 'Staf Keuangan', divisi: 'Keuangan & Akuntansi', efektif: plus30(), alasan: ALASAN['Melanjutkan karier'],
  salam: 'Dengan hormat,',
  serahTerima: 'Selama masa pemberitahuan ini, saya berkomitmen untuk tetap bekerja secara profesional serta menyelesaikan dan menyerahterimakan seluruh pekerjaan dan tanggung jawab saya kepada rekan atau pengganti yang ditunjuk dengan sebaik-baiknya.',
  terimaKasih: 'Saya mengucapkan terima kasih yang sebesar-besarnya atas kesempatan, kepercayaan, dan bimbingan yang telah diberikan selama saya bekerja di perusahaan ini. Saya juga memohon maaf apabila selama bekerja terdapat kesalahan maupun kekurangan, baik yang disengaja maupun tidak.',
  penutup: 'Demikian surat pengunduran diri ini saya sampaikan. Atas perhatian dan pengertian Bapak/Ibu, saya ucapkan terima kasih.',
  ttdHeading: 'Hormat saya,', ttd: '',
  atasanOn: false, atasanJabatan: 'Atasan Langsung', atasanNama: 'Hendra Wijaya', ttdAtasan: '',
  kosong: false,
};

// Data User: identitas kop karyawan & tanda tangan (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'nama', 'profesi', 'alamat', 'telepon', 'email', 'web', 'kota', 'nik', 'jabatan', 'divisi', 'ttdHeading', 'ttd'] as const;

// ============================================================
// SECTION: Isi surat -> LayoutDoc
// ============================================================
// Template kosongan: kop & data karyawan tetap; tujuan, perusahaan, tanggal efektif, alasan & tanggal surat jadi titik-titik
function buildDoc(f: Form): LayoutDoc {
  const ko = f.kosong;
  const signers: LayoutSigner[] = [{ heading: f.ttdHeading, name: f.nama, ttd: ko ? '' : f.ttd, ttdOffset: getOffset(f.posisi, 'ttd'), main: true }];
  if (f.atasanOn) signers.unshift({ heading: f.atasanJabatan, name: ko ? '' : f.atasanNama, ttd: ko ? '' : f.ttdAtasan, ttdOffset: getOffset(f.posisi, 'ttdAtasan') });
  return {
    logo: f.logo, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.nama,
    kopLines: [f.profesi, f.alamat, [f.telepon && `Telp. ${f.telepon}`, f.email, f.web].filter(Boolean).join(' • ')].filter(Boolean),
    meta: [{ label: 'Perihal', value: 'Pengunduran Diri' }],
    placeDate: ko ? `${f.kota || '……'}, …………… 20……` : [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: ko ? ['Kepada Yth.', TITIK, TITIK, TITIK, 'di Tempat'] : ['Kepada Yth.', f.kepada, f.perusahaan, f.alamatTujuan, 'di Tempat'].filter(Boolean),
    body: (
      <>
        <P>{f.salam}</P>
        <P>Yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={[{ label: 'Nama', value: f.nama }, { label: 'NIK karyawan', value: f.nik }, { label: 'Jabatan', value: f.jabatan }, { label: 'Divisi', value: f.divisi }]} />
        {ko ? <>
          <P>{`Dengan ini mengajukan pengunduran diri dari jabatan saya sebagai ${f.jabatan} di ${TITIK}, terhitung efektif sejak tanggal ${TITIK} 20……. Adapun alasan pengunduran diri saya:`}</P>
          {[0, 1, 2].map((i) => <div key={i} style={{ marginBottom: '0.5em' }}><Dots w="100%" /></div>)}
        </> : <P>{`Dengan ini mengajukan pengunduran diri dari jabatan saya sebagai ${f.jabatan} di ${f.perusahaan}, terhitung efektif sejak tanggal ${fmtTanggal(f.efektif)}. ${f.alasan}`}</P>}
        <P>{f.serahTerima}</P>
        <P>{f.terimaKasih}</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    signersTitle: f.atasanOn ? 'Mengetahui,' : undefined,
  };
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPengunduranDiri() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, ttdAtasan: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const ttdAtasan = useBgRemoved(f.ttdAtasan, bg.ttdAtasan, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || ttdAtasan.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF({ ...DEFAULT, tanggal: today(), efektif: plus30() });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, ttdAtasan.src]);
  const fileName = `surat-pengunduran-diri-${(f.nama || 'karyawan').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Foto / logo' }, { id: 'ttd', label: 'Tanda tangan' }, ...(f.atasanOn ? [{ id: 'ttdAtasan', label: 'Ttd atasan' }] : [])]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <LayoutPicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pengunduran Diri</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pengunduran-diri" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Pribadi">
              <ImageUpload label="Pas foto / inisial (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama lengkap & gelar"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
              <Field label="Profesi / tagline"><AutoTextarea className={inputCls} value={f.profesi} onChange={(e) => set('profesi', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Telepon"><AutoTextarea className={inputCls} value={f.telepon} onChange={(e) => set('telepon', e.target.value)} /></Field>
                <Field label="Email"><AutoTextarea className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
              </div>
              <Field label="LinkedIn / portofolio (opsional)"><AutoTextarea className={inputCls} value={f.web} onChange={(e) => set('web', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Tujuan & Data Karyawan">
              <Field label="Kepada Yth."><AutoTextarea className={inputCls} value={f.kepada} onChange={(e) => set('kepada', e.target.value)} /></Field>
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.perusahaan} onChange={(e) => set('perusahaan', e.target.value)} /></Field>
              <Field label="Alamat perusahaan"><AutoTextarea className={inputCls} value={f.alamatTujuan} onChange={(e) => set('alamatTujuan', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="NIK karyawan"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
                <Field label="Divisi"><AutoTextarea className={inputCls} value={f.divisi} onChange={(e) => set('divisi', e.target.value)} /></Field>
                <Field label="Tanggal efektif (± 30 hari)"><input type="date" className={inputCls} value={f.efektif} onChange={(e) => set('efektif', e.target.value)} /></Field>
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Isi Surat">
              <Field label="Salam pembuka"><AutoTextarea className={inputCls} value={f.salam} onChange={(e) => set('salam', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Alasan (pilihan cepat)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ALASAN).map(([label, text]) => (
                  <button key={label} type="button" onClick={() => set('alasan', text)} aria-pressed={f.alasan === text}
                    className={`px-3 min-h-[40px] rounded-lg border text-sm ${f.alasan === text ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{label}</button>
                ))}
              </div>
              <Field label="Kalimat alasan"><AutoTextarea rows={2} className={inputCls} value={f.alasan} onChange={(e) => set('alasan', e.target.value)} /></Field>
              <Field label="Komitmen serah terima"><AutoTextarea rows={3} className={inputCls} value={f.serahTerima} onChange={(e) => set('serahTerima', e.target.value)} /></Field>
              <Field label="Terima kasih & permohonan maaf"><AutoTextarea rows={3} className={inputCls} value={f.terimaKasih} onChange={(e) => set('terimaKasih', e.target.value)} /></Field>
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Tanda Tangan">
              <Field label="Salam penutup"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium">
                <input type="checkbox" className="w-5 h-5" checked={f.atasanOn} onChange={(e) => set('atasanOn', e.target.checked)} />
                Tambah "Mengetahui," atasan langsung
              </label>
              {f.atasanOn && <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Jabatan atasan"><AutoTextarea className={inputCls} value={f.atasanJabatan} onChange={(e) => set('atasanJabatan', e.target.value)} /></Field>
                  <Field label="Nama atasan"><AutoTextarea className={inputCls} value={f.atasanNama} onChange={(e) => set('atasanNama', e.target.value)} /></Field>
                </div>
                <ImageUpload label="Tanda tangan atasan" value={f.ttdAtasan} onChange={(v) => set('ttdAtasan', v)} notify={notify} {...bgFor('ttdAtasan', ttdAtasan)} />
              </>}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} doc={buildDoc({ ...f, logo: logo.src, ttd: ttd.src, ttdAtasan: ttdAtasan.src })} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
