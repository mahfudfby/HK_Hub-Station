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
import { DOTTED, ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, SignBlock, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { useBgRemoved } from '../../shared/lib/removeBg';
import DocOptions, { TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import FormSection from '../../shared/components/FormSection';

// Surat Kuasa: kuasa khusus perorangan atau perusahaan (pengambilan dokumen, administrasi, gaji, kuasa perusahaan).
// Menu berdiri sendiri; tata letak dari LetterLayouts (20 template), kertas/ekspor dari LetterKit.

// ============================================================
// SECTION: Data
// ============================================================
type Person = { nama: string; nik: string; ttl: string; alamat: string; jabatan: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  jenis: string; pemberi: Person; penerima: Person;
  keperluan: string; rincian: string[]; berlaku: string; penutup: string;
  ttd: string; stempel: string; ttdPenerima: string;
  saksi: string[];
  pakaiNomor: boolean; kosong: boolean;
};

const STORAGE_KEY = 'surat-kuasa:v1';
const POLA = '{n3}/SK/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

// Pilihan cepat jenis kuasa: mengisi keperluan & rincian (bisa diubah lagi)
const JENIS = [
  { id: 'dokumen', label: 'Pengambilan dokumen/barang', keperluan: 'mengambil dokumen/barang atas nama Pemberi Kuasa', rincian: ['Mengambil ijazah asli dan transkrip nilai atas nama Pemberi Kuasa di bagian akademik.', 'Menandatangani tanda terima pengambilan dokumen tersebut.'] },
  { id: 'administrasi', label: 'Pengurusan administrasi', keperluan: 'mengurus keperluan administrasi atas nama Pemberi Kuasa', rincian: ['Mengurus perpanjangan dokumen kependudukan di kantor Dinas Kependudukan dan Pencatatan Sipil.', 'Menyerahkan dan menerima berkas yang diperlukan.', 'Menandatangani formulir yang berkaitan dengan pengurusan tersebut.'] },
  { id: 'gaji', label: 'Pengambilan gaji/uang', keperluan: 'mengambil gaji/uang atas nama Pemberi Kuasa', rincian: ['Mengambil gaji bulan berjalan atas nama Pemberi Kuasa di bagian keuangan.', 'Menandatangani bukti penerimaan uang.'] },
  { id: 'perusahaan', label: 'Kuasa perusahaan', keperluan: 'mewakili perusahaan dalam pengurusan perizinan usaha', rincian: ['Mengajukan dan mengurus permohonan perizinan usaha di instansi terkait.', 'Menandatangani dokumen permohonan dan tanda terima atas nama perusahaan.', 'Menerima dokumen perizinan yang telah diterbitkan.'] },
];

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'AHMAD FAUZI', subKop: 'Pemberi Kuasa',
  alamat: 'Jl. Melati No. 12, RT 003/RW 005, Kel. Tegalrejo, Kec. Tegalrejo, Kota Yogyakarta 55244',
  kontak: 'HP 0812-3456-7890 • ahmad.fauzi@email.com',
  judul: 'SURAT KUASA', nomor: randomDocNo(POLA), kota: 'Yogyakarta', tanggal: today(),
  jenis: 'dokumen',
  pemberi: { nama: 'Ahmad Fauzi', nik: '3471011503900001', ttl: 'Yogyakarta, 15 Maret 1990', alamat: 'Jl. Melati No. 12, RT 003/RW 005, Kel. Tegalrejo, Kota Yogyakarta', jabatan: '' },
  penerima: { nama: 'Siti Aminah', nik: '3471015207920002', ttl: 'Sleman, 12 Juli 1992', alamat: 'Jl. Kenanga No. 8, RT 002/RW 004, Kel. Kricak, Kota Yogyakarta', jabatan: '' },
  keperluan: JENIS[0].keperluan, rincian: JENIS[0].rincian,
  berlaku: 'Surat kuasa ini berlaku sejak tanggal ditandatangani sampai dengan urusan tersebut selesai, dan tidak dapat dialihkan kepada pihak lain.',
  penutup: 'Demikian surat kuasa ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  ttd: '', stempel: '', ttdPenerima: '',
  saksi: [],
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop, pemberi kuasa & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'pemberi', 'ttd', 'stempel'] as const;

const personRows = (p: Person, kosong = false) => [
  { label: 'Nama', value: p.nama }, { label: 'NIK', value: p.nik }, { label: 'Tempat, tgl. lahir', value: p.ttl },
  { label: 'Alamat', value: p.alamat }, { label: 'Jabatan', value: p.jabatan },
].filter((r) => r.value).map((r) => (kosong ? { ...r, value: '' } : r));

// ============================================================
// SECTION: Editor
// ============================================================
function ListEditor({ items, onChange, label }: { items: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
          <span className="pt-2 text-sm font-bold text-gray-600">{i + 1}.</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} className={inputCls} value={t} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {label.toLowerCase()}</button>
    </div>
  );
}

function PersonEditor({ p, onChange }: { p: Person; onChange: (p: Person) => void }) {
  const set = (k: keyof Person, v: string) => onChange({ ...p, [k]: v });
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-2">
        <Field label="Nama lengkap"><AutoTextarea className={inputCls} value={p.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
        <Field label="NIK"><AutoTextarea className={inputCls} value={p.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
        <Field label="Tempat, tanggal lahir"><AutoTextarea className={inputCls} value={p.ttl} onChange={(e) => set('ttl', e.target.value)} /></Field>
        <Field label="Jabatan (opsional)"><AutoTextarea className={inputCls} value={p.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
      </div>
      <Field label="Alamat"><AutoTextarea className={inputCls} value={p.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
    </>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKuasa() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...makeDefault(), ...saved, nomor: orRandomNo(saved.nomor, POLA) } : makeDefault();
    } catch {
      return makeDefault();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdPenerima: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdPenerima = useBgRemoved(f.ttdPenerima, bg.ttdPenerima, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdPenerima.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const pickJenis = (j: (typeof JENIS)[number]) => setF((p) => ({ ...p, jenis: j.id, keperluan: j.keperluan, rincian: j.rincian }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdPenerima.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-kuasa-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const K = f.kosong; // template kosongan: data penerima kuasa/keperluan/saksi jadi titik-titik, ttd/stempel basah
  const signers: LayoutSigner[] = [
    { heading: 'Penerima Kuasa,', role: isian(f.penerima.jabatan, K), name: isian(f.penerima.nama, K), ttd: K ? '' : ttdPenerima.src, ttdOffset: getOffset(f.posisi, 'ttdPenerima') },
    { heading: 'Pemberi Kuasa,', role: f.pemberi.jabatan, name: f.pemberi.nama, ttd: K ? '' : ttd.src, stempel: K ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const saksi = f.saksi.filter(Boolean);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, K),
    placeDate: [f.kota || (K ? '……' : ''), K ? '…………… 20……' : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>Yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={personRows(f.pemberi)} />
        <P>selanjutnya disebut sebagai <b>PEMBERI KUASA</b>.</P>
        <P>Dengan ini memberikan kuasa kepada:</P>
        <InfoRows rows={personRows(f.penerima, K)} />
        <P>selanjutnya disebut sebagai <b>PENERIMA KUASA</b>.</P>
        <div style={{ textAlign: 'center', fontWeight: 700, letterSpacing: 4 * kk, margin: `${2 * kk}px 0 ${8 * kk}px` }}>K H U S U S</div>
        <P>Untuk {K ? TITIK + TITIK + TITIK : f.keperluan}, dengan rincian sebagai berikut:</P>
        {(K || f.rincian.some(Boolean)) && (
          <ol style={{ margin: `0 0 ${8 * kk}px`, paddingLeft: 24 * kk, listStyle: 'decimal' }}>
            {(K ? Array<string>(4).fill('') : f.rincian.filter(Boolean)).map((t, i) => <li key={i} style={{ textAlign: 'justify', whiteSpace: 'pre-line' }}>{t || <span style={{ display: 'inline-block', width: '100%', height: '1.6em', borderBottom: DOTTED, verticalAlign: 'bottom' }} />}</li>)}
          </ol>
        )}
        <P>{f.berlaku}</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    // Saksi di baris terpisah agar baris tanda tangan utama tidak melebar keluar kertas
    footer: saksi.length ? (
      <div style={{ fontSize: 13 * kk }}>
        <div style={{ textAlign: 'center', marginBottom: 4 * kk }}>Saksi-saksi:</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: 12 * kk }}>
          {saksi.map((n, i) => <SignBlock key={i} s={{ heading: `Saksi ${i + 1},`, name: isian(n, K) }} k={kk} width={140} />)}
        </div>
      </div>
    ) : undefined,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Ttd pemberi' }, { id: 'stempel', label: 'Stempel' }, { id: 'ttdPenerima', label: 'Ttd penerima' }]}
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
      <button onClick={reset} className="px-5 py-2 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Kuasa</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-kuasa" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Jenis Kuasa">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pilihan cepat jenis kuasa">
                {JENIS.map((j) => (
                  <button key={j.id} type="button" onClick={() => pickJenis(j)} aria-pressed={f.jenis === j.id}
                    className={`min-h-[44px] px-3 rounded-lg border text-sm font-medium ${f.jenis === j.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{j.label}</button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Memilih jenis mengisi keperluan & rincian kuasa; isinya tetap bisa diubah.</p>
            </FormSection>

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan / nama pemberi kuasa"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Baris kedua kop (bidang usaha / keterangan)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Data Surat">
              <Field label="Judul surat"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`${randomDocNo(POLA)} (nomor urut/SK/bulan romawi/tahun)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Pemberi Kuasa">
              <PersonEditor p={f.pemberi} onChange={(v) => set('pemberi', v)} />
              <ImageUpload label="Tanda tangan pemberi kuasa" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel (opsional, untuk perusahaan)" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
            </FormSection>

            <FormSection title="Penerima Kuasa">
              <PersonEditor p={f.penerima} onChange={(v) => set('penerima', v)} />
              <ImageUpload label="Tanda tangan penerima kuasa" value={f.ttdPenerima} onChange={(v) => set('ttdPenerima', v)} notify={notify} {...bgFor('ttdPenerima', ttdPenerima)} />
            </FormSection>

            <FormSection title="Isi Kuasa">
              <Field label="Kuasa KHUSUS untuk (keperluan)"><AutoTextarea rows={2} className={inputCls} value={f.keperluan} onChange={(e) => set('keperluan', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Rincian hal yang dikuasakan</p>
              <ListEditor label="Rincian" items={f.rincian} onChange={(v) => set('rincian', v)} />
              <Field label="Masa berlaku"><AutoTextarea rows={2} className={inputCls} value={f.berlaku} onChange={(e) => set('berlaku', e.target.value)} /></Field>
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Saksi (opsional)">
              <ListEditor label="Saksi" items={f.saksi} onChange={(v) => set('saksi', v.slice(0, 3))} />
              <p className="text-xs text-gray-500">Maksimal 3 saksi. Ruang tanda tangan Pemberi Kuasa sudah cukup untuk meterai.</p>
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
