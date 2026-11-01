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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutRow, type LayoutSigner } from '../../shared/components/LetterLayouts';
import DocOptions, { TITIK, TITIK_PENDEK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { useBgRemoved } from '../../shared/lib/removeBg';
import FormSection from '../../shared/components/FormSection';

// Surat Keterangan Tidak Mampu (SKTM) dari Kelurahan: kop pemerintah, data warga, dasar pengantar RT/RW,
// keperluan & masa berlaku; ditandatangani Lurah (opsional diketahui Camat).
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; pemda: string; kecamatan: string; kelurahan: string; alamatKop: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pembuka: string; warga: LayoutRow[];
  pengantarDari: string; pengantarNo: string; pengantarTgl: string; keterangan: string;
  keperluan: string; berlaku: string; penutup: string;
  ttdHeading: string; ttdNama: string; ttdNip: string; ttd: string; stempel: string;
  camatOn: boolean; camatHeading: string; camatNama: string; camatNip: string; ttdCamat: string; stempelCamat: string;
  pakaiNomor: boolean; kosong: boolean; // opsi dokumen (DocOptions)
};

const STORAGE_KEY = 'surat-keterangan-tidak-mampu:v1';
// Kode klasifikasi arsip 400.12 (administrasi kependudukan, Permendagri 83/2022) / nomor urut / bulan romawi / tahun
const POLA = '400.12/{n3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', pemda: 'PEMERINTAH KOTA BANDUNG', kecamatan: 'KECAMATAN CIBEUNYING KIDUL', kelurahan: 'KELURAHAN SUKAMAJU',
  alamatKop: 'Jl. Sukamaju Raya No. 12, Kecamatan Cibeunying Kidul, Kota Bandung, Kode Pos 40121',
  kontak: 'Telp. (022) 720-1234 • Email: kel.sukamaju@bandung.go.id • www.bandung.go.id',
  judul: 'SURAT KETERANGAN TIDAK MAMPU', nomor: randomDocNo(POLA), kota: 'Bandung', tanggal: today(),
  pembuka: 'Yang bertanda tangan di bawah ini Lurah Sukamaju, Kecamatan Cibeunying Kidul, Kota Bandung, dengan ini menerangkan bahwa:',
  warga: [
    { label: 'Nama', value: 'Siti Aminah' }, { label: 'NIK', value: '3273015203850002' },
    { label: 'Tempat/tanggal lahir', value: 'Bandung, 12 Maret 1985' }, { label: 'Jenis kelamin', value: 'Perempuan' },
    { label: 'Agama', value: 'Islam' }, { label: 'Pekerjaan', value: 'Mengurus rumah tangga' },
    { label: 'Status perkawinan', value: 'Kawin' }, { label: 'Kewarganegaraan', value: 'Indonesia' },
    { label: 'Alamat', value: 'Jl. Melati Raya No. 15, RT 003/RW 005, Kelurahan Sukamaju, Kecamatan Cibeunying Kidul, Kota Bandung' },
  ],
  pengantarDari: 'Ketua RT 003 / RW 005', pengantarNo: '015/RT.003/RW.005/XI/2026', pengantarTgl: today(),
  keterangan: 'nama tersebut di atas benar penduduk Kelurahan Sukamaju dan sepanjang pengetahuan kami tergolong keluarga tidak mampu (prasejahtera).',
  keperluan: 'Pengajuan keringanan biaya pendidikan anak di sekolah', berlaku: '3 (tiga) bulan sejak tanggal dikeluarkan',
  penutup: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  ttdHeading: 'Lurah Sukamaju,', ttdNama: 'Drs. H. Rahmat Hidayat, M.Si.', ttdNip: 'NIP. 19700512 199503 1 004', ttd: '', stempel: '',
  camatOn: false, camatHeading: 'Mengetahui,\nCamat Cibeunying Kidul,', camatNama: 'Dr. Hj. Nurhayati, S.Sos., M.Si.', camatNip: 'NIP. 19720817 199803 2 006', ttdCamat: '', stempelCamat: '',
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop kelurahan, pejabat & gambar (bukan data warga / isi surat)
const USER_KEYS = ['logo', 'posisi', 'pemda', 'kecamatan', 'kelurahan', 'alamatKop', 'kontak', 'kota', 'pembuka',
  'ttdHeading', 'ttdNama', 'ttdNip', 'ttd', 'stempel', 'camatOn', 'camatHeading', 'camatNama', 'camatNip', 'ttdCamat', 'stempelCamat'] as const;

const KEPERLUAN = ['Pengajuan keringanan biaya pendidikan anak di sekolah', 'Pengajuan keringanan biaya berobat/perawatan di rumah sakit', 'Pengajuan beasiswa pendidikan', 'Pengajuan bantuan sosial'];

// ============================================================
// SECTION: Isi surat -> LayoutDoc
// ============================================================
function buildDoc(f: Form): LayoutDoc {
  const ko = f.kosong; // template kosongan: data warga, pengantar, tanggal & keperluan jadi titik-titik; pejabat tetap
  const img = (x: string) => (ko ? '' : x); // tanda tangan & stempel basah
  const signers: LayoutSigner[] = [];
  if (f.camatOn) signers.push({ heading: f.camatHeading, name: f.camatNama, idLine: f.camatNip, ttd: img(f.ttdCamat), stempel: img(f.stempelCamat), ttdOffset: getOffset(f.posisi, 'ttdCamat'), stempelOffset: getOffset(f.posisi, 'stempelCamat') });
  signers.push({ heading: f.ttdHeading, name: f.ttdNama, idLine: f.ttdNip, ttd: img(f.ttd), stempel: img(f.stempel), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true });
  return {
    logo: f.logo, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.pemda, kopLines: [f.kecamatan, f.kelurahan, f.alamatKop, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ko),
    placeDate: ko ? `${f.kota || TITIK_PENDEK}, …………… 20……` : [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={ko ? f.warga.map((r) => ({ ...r, value: '' })) : f.warga} />
        <P>Berdasarkan Surat Pengantar {ko ? TITIK : f.pengantarDari} Nomor {ko ? TITIK : f.pengantarNo || '...'} tanggal {ko ? TITIK : fmtTanggal(f.pengantarTgl) || '...'}, {f.keterangan}</P>
        <P>Surat keterangan ini diberikan untuk keperluan: <b>{ko ? `${TITIK}${TITIK}${TITIK}` : f.keperluan}</b>, dan berlaku selama {f.berlaku}.</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
  };
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKeteranganTidakMampu() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const def = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...def, ...saved, nomor: orRandomNo(saved.nomor, POLA) } : def;
    } catch {
      return def;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdCamat: true, stempelCamat: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdCamat = useBgRemoved(f.ttdCamat, bg.ttdCamat, bgError);
  const stempelCamat = useBgRemoved(f.stempelCamat, bg.stempelCamat, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdCamat.busy || stempelCamat.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setWarga = (i: number, value: string) => set('warga', f.warga.map((r, j) => (j === i ? { ...r, value } : r)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdCamat.src, stempelCamat.src]);
  const fileName = `sktm-${(f.warga[0]?.value || 'warga').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const targets = [{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: `TTD ${f.ttdNama || 'Lurah'}` }, { id: 'stempel', label: 'Stempel kelurahan' },
    ...(f.camatOn ? [{ id: 'ttdCamat', label: `TTD ${f.camatNama || 'Camat'}` }, { id: 'stempelCamat', label: 'Stempel kecamatan' }] : [])];
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={targets} active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <LayoutPicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );
  const text = (key: keyof Form, label: string, rows?: number) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Tidak Mampu</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-keterangan-tidak-mampu" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Kelurahan">
              <ImageUpload label="Logo pemerintah daerah" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              {text('pemda', 'Pemerintah kota / kabupaten')}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kecamatan', 'Kecamatan')}
                {text('kelurahan', 'Kelurahan')}
              </div>
              {text('alamatKop', 'Alamat kantor & kode pos')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Kode', 'Urut', 'Bulan', 'Tahun']} example={`${randomDocNo(POLA.replace('{n3}', '001'))} (kode klasifikasi/urut/bulan romawi/tahun)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Data Warga">
              {text('pembuka', 'Kalimat pembuka', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {f.warga.map((r, i) => (
                  <Field key={i} label={r.label}><AutoTextarea className={inputCls} value={r.value} onChange={(e) => setWarga(i, e.target.value)} /></Field>
                ))}
              </div>
            </FormSection>

            <FormSection title="Pengantar RT/RW & Keperluan">
              {text('pengantarDari', 'Surat pengantar dari')}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('pengantarNo', 'Nomor surat pengantar')}
                <Field label="Tanggal surat pengantar"><input type="date" className={inputCls} value={f.pengantarTgl} onChange={(e) => set('pengantarTgl', e.target.value)} /></Field>
              </div>
              {text('keterangan', 'Keterangan', 2)}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat keperluan">
                {KEPERLUAN.map((q) => (
                  <button key={q} type="button" aria-pressed={f.keperluan === q} onClick={() => set('keperluan', q)}
                    className={`px-3 min-h-[44px] rounded-lg border text-sm font-semibold ${f.keperluan === q ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{q.replace(/^Pengajuan /, '')}</button>
                ))}
              </div>
              {text('keperluan', 'Keperluan', 2)}
              {text('berlaku', 'Masa berlaku')}
              {text('penutup', 'Kalimat penutup', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ttdHeading', 'Jabatan (mis. Lurah Sukamaju,)')}
                {text('ttdNama', 'Nama Lurah')}
              </div>
              {text('ttdNip', 'NIP')}
              <ImageUpload label={`Tanda tangan — ${f.ttdNama || 'Lurah'}`} value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel kelurahan" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <label className="flex items-center gap-2 min-h-[44px] font-medium">
                <input type="checkbox" className="w-5 h-5" checked={f.camatOn} onChange={(e) => set('camatOn', e.target.checked)} />
                Tambahkan "Mengetahui, Camat"
              </label>
              {f.camatOn && (<>
                {text('camatHeading', 'Salam & jabatan Camat', 2)}
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('camatNama', 'Nama Camat')}
                  {text('camatNip', 'NIP Camat')}
                </div>
                <ImageUpload label={`Tanda tangan — ${f.camatNama || 'Camat'}`} value={f.ttdCamat} onChange={(v) => set('ttdCamat', v)} notify={notify} {...bgFor('ttdCamat', ttdCamat)} />
                <ImageUpload label="Stempel kecamatan" value={f.stempelCamat} onChange={(v) => set('stempelCamat', v)} notify={notify} {...bgFor('stempelCamat', stempelCamat)} />
              </>)}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f}
                doc={buildDoc({ ...f, logo: logo.src, ttd: ttd.src, stempel: stempel.src, ttdCamat: ttdCamat.src, stempelCamat: stempelCamat.src })} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
