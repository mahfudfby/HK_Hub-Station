import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import DocOptions, { nomorTampil } from '../../shared/components/DocOptions';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { randomDocNo } from '../../shared/lib/docNumber';
import { useBgRemoved } from '../../shared/lib/removeBg';

// Surat Pernyataan Diri: pernyataan pribadi bermeterai (Rp10.000), berkop pribadi, nomor opsional (boleh dikosongkan).
// Menu berdiri sendiri (form & penyimpanan terpisah). Bahan bersama: tata letak (LetterLayouts), kertas/ekspor (LetterKit).

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; kopNama: string; profesi: string; kopAlamat: string; telepon: string; email: string; web: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  nama: string; nik: string; ttl: string; jk: string; pekerjaan: string; alamat: string;
  pembuka: string; butir: string[]; penutup: string;
  ttdHeading: string; ttd: string;
  saksiOn: boolean; saksi1: string; saksi2: string; ttdSaksi1: string; ttdSaksi2: string;
  pakaiNomor: boolean; kosong: boolean;
};

const STORAGE_KEY = 'surat-pernyataan-diri:v1';
const POLA = '{n3}/SP/{rom}/{yyyy}';
const CONTOH = randomDocNo(POLA);
const today = () => new Date().toISOString().slice(0, 10);

// Jenis pernyataan siap pakai: mengisi daftar butir (tetap bisa diedit)
const JENIS: Record<string, string[]> = {
  'Tidak pernah dipidana': [
    'Tidak pernah dihukum penjara berdasarkan putusan pengadilan yang telah berkekuatan hukum tetap karena melakukan tindak pidana kejahatan.',
    'Tidak sedang menjalani proses hukum atau berstatus tersangka/terdakwa dalam suatu perkara pidana.',
  ],
  'Bersedia ditempatkan': [
    'Bersedia ditempatkan di seluruh wilayah kerja / unit mana pun sesuai kebutuhan instansi atau perusahaan.',
    'Tidak akan mengajukan permohonan pindah tugas dalam jangka waktu yang ditetapkan.',
  ],
  'Kebenaran data': [
    'Seluruh data dan dokumen yang saya serahkan adalah benar, sah, dan sesuai dengan aslinya.',
    'Apabila di kemudian hari ditemukan ketidaksesuaian atau pemalsuan data, saya bersedia menerima sanksi sesuai ketentuan yang berlaku.',
  ],
  'Tidak terikat kontrak': [
    'Tidak sedang terikat kontrak kerja atau perjanjian ikatan dinas dengan instansi / perusahaan lain.',
    'Bersedia bekerja penuh waktu sesuai ketentuan perusahaan sejak tanggal mulai bekerja.',
  ],
};
const JK = ['Laki-laki', 'Perempuan'];

const DEFAULT: Form = {
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', kopNama: 'Ahmad Fauzi, S.T.', profesi: 'Teknisi Jaringan',
  kopAlamat: 'Jl. Merpati No. 25, RT 001/RW 003, Kel. Tlogosari, Kec. Pedurungan, Kota Semarang 50196',
  telepon: '0857-1122-3344', email: 'ahmad.fauzi@email.com', web: '',
  judul: 'SURAT PERNYATAAN', nomor: randomDocNo(POLA), kota: 'Semarang', tanggal: today(),
  nama: 'Ahmad Fauzi, S.T.', nik: '3374012505970003', ttl: 'Semarang, 25 Mei 1997', jk: 'Laki-laki', pekerjaan: 'Karyawan Swasta',
  alamat: 'Jl. Merpati No. 25, RT 001/RW 003, Kel. Tlogosari, Kec. Pedurungan, Kota Semarang',
  pembuka: 'Yang bertanda tangan di bawah ini:',
  butir: JENIS['Tidak pernah dipidana'],
  penutup: 'Demikian surat pernyataan ini saya buat dengan sebenar-benarnya, dalam keadaan sadar dan tanpa paksaan dari pihak mana pun, untuk dapat dipergunakan sebagaimana mestinya. Apabila di kemudian hari pernyataan ini terbukti tidak benar, saya bersedia menerima sanksi sesuai dengan ketentuan hukum yang berlaku.',
  ttdHeading: 'Yang membuat pernyataan,', ttd: '',
  saksiOn: false, saksi1: 'Budi Santoso', saksi2: 'Siti Aminah', ttdSaksi1: '', ttdSaksi2: '',
  pakaiNomor: true, kosong: false,
};

// Data User: identitas kop & pembuat pernyataan, tanda tangan (bukan isi pernyataan)
const USER_KEYS = ['logo', 'posisi', 'kopNama', 'profesi', 'kopAlamat', 'telepon', 'email', 'web', 'kota', 'nama', 'nik', 'ttl', 'jk', 'pekerjaan', 'alamat', 'ttdHeading', 'ttd'] as const;

// ============================================================
// SECTION: Isi surat -> LayoutDoc
// ============================================================
// Template kosongan: kop, judul, butir pernyataan & kalimat baku tetap; data diri pembuat, saksi, nomor & tanggal jadi titik-titik
function buildDoc(f: Form): LayoutDoc {
  const ko = f.kosong;
  const v = (x: string) => (ko ? '' : x);
  const signers: LayoutSigner[] = [{ heading: f.ttdHeading, name: v(f.nama), ttd: v(f.ttd), ttdOffset: getOffset(f.posisi, 'ttd'), main: true }];
  if (f.saksiOn) signers.unshift(
    { heading: 'Saksi 1,', name: v(f.saksi1), ttd: v(f.ttdSaksi1), ttdOffset: getOffset(f.posisi, 'ttdSaksi1') },
    { heading: 'Saksi 2,', name: v(f.saksi2), ttd: v(f.ttdSaksi2), ttdOffset: getOffset(f.posisi, 'ttdSaksi2') },
  );
  return {
    logo: f.logo, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.kopNama,
    kopLines: [f.profesi, f.kopAlamat, [f.telepon && `Telp. ${f.telepon}`, f.email, f.web].filter(Boolean).join(' • ')].filter(Boolean),
    title: f.judul,
    nomor: nomorTampil(f.nomor.trim(), f.pakaiNomor, ko) || undefined,
    placeDate: ko ? `${f.kota || '……'}, …………… 20……` : [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Nama', value: v(f.nama) }, { label: 'NIK', value: v(f.nik) }, { label: 'Tempat, tgl. lahir', value: v(f.ttl) },
          { label: 'Jenis kelamin', value: v(f.jk) }, { label: 'Pekerjaan', value: v(f.pekerjaan) }, { label: 'Alamat', value: v(f.alamat) },
        ]} />
        <P>Dengan ini menyatakan dengan sesungguhnya bahwa saya:</P>
        <ol style={{ margin: '0 0 0.6em', paddingLeft: '2.4em', listStyle: 'decimal', textAlign: 'justify' }}>{f.butir.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ol>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    signersTitle: f.saksiOn ? 'Saksi-saksi:' : undefined,
  };
}

function ListEditor({ items, onChange, label }: { items: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
          <span className="pt-2 text-sm text-gray-500 w-5 text-right">{i + 1}.</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} className={inputCls} value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="text-sm font-medium text-blue-700 min-h-[40px]">+ Tambah {label.toLowerCase()}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPernyataanDiri() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      // nomor opsional: kosong yang disimpan pengguna tetap kosong
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

  const [bg, setBg] = useState({ logo: true, ttd: true, ttdSaksi1: true, ttdSaksi2: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const ttdSaksi1 = useBgRemoved(f.ttdSaksi1, bg.ttdSaksi1, bgError);
  const ttdSaksi2 = useBgRemoved(f.ttdSaksi2, bg.ttdSaksi2, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || ttdSaksi1.busy || ttdSaksi2.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF({ ...DEFAULT, nomor: randomDocNo(POLA), tanggal: today() });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, ttdSaksi1.src, ttdSaksi2.src]);
  const fileName = `surat-pernyataan-${(f.nama || 'diri').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const saksiTargets = f.saksiOn ? [{ id: 'ttdSaksi1', label: 'Ttd saksi 1' }, { id: 'ttdSaksi2', label: 'Ttd saksi 2' }] : [];
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Foto / logo' }, { id: 'ttd', label: 'Tanda tangan' }, ...saksiTargets]}
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pernyataan Diri</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pernyataan-diri" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Pribadi</h2>
              <ImageUpload label="Pas foto / inisial (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama lengkap & gelar"><AutoTextarea className={inputCls} value={f.kopNama} onChange={(e) => set('kopNama', e.target.value)} /></Field>
              <Field label="Profesi / tagline"><AutoTextarea className={inputCls} value={f.profesi} onChange={(e) => set('profesi', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.kopAlamat} onChange={(e) => set('kopAlamat', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Telepon"><AutoTextarea className={inputCls} value={f.telepon} onChange={(e) => set('telepon', e.target.value)} /></Field>
                <Field label="Email"><AutoTextarea className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
              </div>
              <Field label="LinkedIn / portofolio (opsional)"><AutoTextarea className={inputCls} value={f.web} onChange={(e) => set('web', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              <Field label="Judul"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor (opsional, boleh dikosongkan)"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`${CONTOH} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pembuat Pernyataan</h2>
              <Field label="Kalimat pembuka"><AutoTextarea className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <Field label="NIK"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
                <Field label="Tempat, tanggal lahir"><AutoTextarea className={inputCls} value={f.ttl} onChange={(e) => set('ttl', e.target.value)} /></Field>
                <Field label="Jenis kelamin">
                  <select className={`${inputCls} min-h-[40px]`} value={f.jk} onChange={(e) => set('jk', e.target.value)}>
                    {JK.map((j) => <option key={j}>{j}</option>)}
                  </select>
                </Field>
                <Field label="Pekerjaan"><AutoTextarea className={inputCls} value={f.pekerjaan} onChange={(e) => set('pekerjaan', e.target.value)} /></Field>
              </div>
              <Field label="Alamat"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Isi Pernyataan</h2>
              <p className="text-sm font-bold text-gray-700">Jenis pernyataan (pilihan cepat)</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(JENIS).map(([label, list]) => (
                  <button key={label} type="button" onClick={() => set('butir', list)} aria-pressed={f.butir.join('\n') === list.join('\n')}
                    className={`px-3 min-h-[40px] rounded-lg border text-sm ${f.butir.join('\n') === list.join('\n') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{label}</button>
                ))}
              </div>
              <ListEditor label="Butir" items={f.butir} onChange={(v) => set('butir', v)} />
              <Field label="Kalimat penutup"><AutoTextarea rows={4} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Tanda Tangan</h2>
              <Field label="Salam di atas tanda tangan"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <p className="text-xs text-gray-500">Ruang tanda tangan sudah cukup untuk meterai Rp10.000.</p>
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium">
                <input type="checkbox" className="w-5 h-5" checked={f.saksiOn} onChange={(e) => set('saksiOn', e.target.checked)} />
                Tambah saksi 1 & 2
              </label>
              {f.saksiOn && <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Nama saksi 1"><AutoTextarea className={inputCls} value={f.saksi1} onChange={(e) => set('saksi1', e.target.value)} /></Field>
                  <Field label="Nama saksi 2"><AutoTextarea className={inputCls} value={f.saksi2} onChange={(e) => set('saksi2', e.target.value)} /></Field>
                </div>
                <ImageUpload label="Tanda tangan saksi 1" value={f.ttdSaksi1} onChange={(v) => set('ttdSaksi1', v)} notify={notify} {...bgFor('ttdSaksi1', ttdSaksi1)} />
                <ImageUpload label="Tanda tangan saksi 2" value={f.ttdSaksi2} onChange={(v) => set('ttdSaksi2', v)} notify={notify} {...bgFor('ttdSaksi2', ttdSaksi2)} />
              </>}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} doc={buildDoc({ ...f, logo: logo.src, ttd: ttd.src, ttdSaksi1: ttdSaksi1.src, ttdSaksi2: ttdSaksi2.src })} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
