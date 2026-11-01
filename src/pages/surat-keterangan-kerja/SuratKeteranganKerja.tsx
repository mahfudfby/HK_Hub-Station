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

// Surat Keterangan Kerja (Paklaring): keterangan resmi dari HRD/Direktur bahwa seseorang
// pernah/masih bekerja, lengkap dengan jabatan, divisi & masa kerja (dihitung otomatis).
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  nama: string; nik: string; ttl: string; alamatKaryawan: string;
  jabatan: string; divisi: string; mulai: string; berakhir: string;
  status: 'berhenti' | 'aktif';
  kinerja: string; alasan: string; keperluan: string; harapan: string; penutup: string;
};

const STORAGE_KEY = 'surat-keterangan-kerja:v1';
const POLA = '{n3}/SKK/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT KETERANGAN KERJA', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
  nama: 'Andi Pratama', nik: 'KRY-2020-0215', ttl: 'Bandung, 14 Maret 1995',
  alamatKaryawan: 'Jl. Melati No. 12, RT 004/RW 006, Kel. Cempaka Putih, Jakarta Pusat',
  jabatan: 'Staf Administrasi Keuangan', divisi: 'Keuangan & Akuntansi', mulai: '2020-02-03', berakhir: today(),
  status: 'berhenti',
  kinerja: 'Selama bekerja, yang bersangkutan telah menunjukkan dedikasi, tanggung jawab, dan loyalitas yang baik terhadap perusahaan serta tidak pernah melakukan pelanggaran yang merugikan perusahaan.',
  alasan: 'mengundurkan diri secara baik-baik atas permintaan sendiri',
  keperluan: 'melengkapi persyaratan melamar pekerjaan',
  harapan: 'Kami mengucapkan terima kasih atas kontribusi yang telah diberikan dan berharap yang bersangkutan meraih kesuksesan di masa mendatang.',
  penutup: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// "x tahun y bulan" antara dua tanggal ISO (kosong bila tidak valid / terbalik)
function masaKerja(dari: string, sampai: string) {
  const a = new Date(dari), b = new Date(sampai);
  if (isNaN(+a) || isNaN(+b) || b < a) return '';
  let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  if (b.getDate() < a.getDate()) m--;
  const th = Math.floor(m / 12), bl = m % 12;
  return [th && `${th} tahun`, bl && `${bl} bulan`].filter(Boolean).join(' ') || 'kurang dari 1 bulan';
}
console.assert(masaKerja('2020-02-03', '2024-05-10') === '4 tahun 3 bulan' && masaKerja('2024-01-15', '2024-02-10') === 'kurang dari 1 bulan' && masaKerja('2023-01-01', '2024-01-01') === '1 tahun', 'masaKerja');

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKeteranganKerja() {
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
  const fileName = `surat-keterangan-kerja-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data karyawan & tanggal → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const tgl = (s: string) => (ks ? TITIK : fmtTanggal(s));
  const aktif = f.status === 'aktif';
  const sampai = aktif ? f.tanggal : f.berakhir;
  const masa = masaKerja(f.mulai, sampai);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, tgl(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>Yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={[{ label: 'Nama', value: f.ttdNama }, { label: 'Jabatan', value: f.ttdJabatan }, { label: 'Perusahaan', value: f.instansi }]} />
        <P>Dengan ini menerangkan bahwa:</P>
        <InfoRows rows={[
          { label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) },
          ...(f.ttl.trim() ? [{ label: 'Tempat, tanggal lahir', value: v(f.ttl) }] : []),
          ...(f.alamatKaryawan.trim() ? [{ label: 'Alamat', value: v(f.alamatKaryawan) }] : []),
          { label: aktif ? 'Jabatan' : 'Jabatan terakhir', value: v(f.jabatan) }, { label: 'Divisi', value: v(f.divisi) },
        ]} />
        <P>
          {aktif
            ? <>Adalah benar karyawan {f.instansi} yang <b>masih aktif bekerja</b> sejak tanggal <b>{tgl(f.mulai)}</b> sampai dengan surat ini diterbitkan{masa && !ks ? <> (masa kerja {masa})</> : ks ? <> (masa kerja {TITIK})</> : ''}.</>
            : <>Adalah benar pernah bekerja di {f.instansi} terhitung sejak tanggal <b>{tgl(f.mulai)}</b> sampai dengan <b>{tgl(f.berakhir)}</b>{masa && !ks ? <> dengan masa kerja <b>{masa}</b></> : ks ? <> dengan masa kerja {TITIK}</> : ''}.</>}
        </P>
        {f.kinerja.trim() && <P>{f.kinerja}</P>}
        {!aktif && f.alasan.trim() && <P>Yang bersangkutan berhenti bekerja karena {v(f.alasan) || TITIK}.</P>}
        {f.keperluan.trim() && <P>Surat keterangan ini diberikan untuk {v(f.keperluan) || TITIK}.</P>}
        {!aktif && f.harapan.trim() && <P>{f.harapan}</P>}
        <P>{f.penutup}</P>
      </>
    ),
    signers: [{ heading: 'Hormat kami,', role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true }],
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Kerja (Paklaring)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-keterangan-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/SKK/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Data Karyawan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('ttl', 'Tempat, tanggal lahir (opsional)')}
                {text('jabatan', 'Jabatan terakhir')}
                {text('divisi', 'Divisi')}
              </div>
              {text('alamatKaryawan', 'Alamat (opsional)', 2)}
              <Field label="Status karyawan">
                <select className={`${inputCls} min-h-[40px]`} value={f.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  <option value="berhenti">Telah berhenti bekerja</option>
                  <option value="aktif">Masih aktif bekerja</option>
                </select>
              </Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal mulai bekerja"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                {!aktif && <Field label="Tanggal berakhir"><input type="date" className={inputCls} value={f.berakhir} onChange={(e) => set('berakhir', e.target.value)} /></Field>}
              </div>
              <p className="text-sm text-gray-700">Masa kerja (otomatis): <b>{masa || '-'}</b></p>
            </FormSection>

            <FormSection title="Isi Keterangan">
              {text('kinerja', 'Penilaian kinerja (opsional)', 3)}
              {!aktif && text('alasan', 'Alasan berhenti (opsional), lanjutan "berhenti bekerja karena …"', 2)}
              {text('keperluan', 'Keperluan surat (opsional), lanjutan "diberikan untuk …"', 2)}
              {!aktif && text('harapan', 'Ucapan terima kasih & harapan sukses (opsional)', 2)}
              {text('penutup', 'Kalimat penutup', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ttdJabatan', 'Jabatan (HRD/Direktur)')}
                {text('ttdNama', 'Nama')}
                {text('ttdId', 'NIK karyawan (opsional)')}
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
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
