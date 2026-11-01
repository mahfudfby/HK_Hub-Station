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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { useBgRemoved } from '../../shared/lib/removeBg';
import DocOptions, { TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';

// Surat Pendelegasian Tugas: pimpinan perusahaan mendelegasikan tugas & wewenang kepada pegawai untuk periode tertentu.
// Menu berdiri sendiri; tata letak dari LetterLayouts (20 template), kertas/ekspor dari LetterKit.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pemberiNama: string; pemberiJabatan: string; pemberiId: string;
  penerimaNama: string; penerimaJabatan: string; penerimaId: string;
  pembuka: string; tugas: string[]; mulai: string; selesai: string; batasan: string; penutup: string;
  ttd: string; stempel: string; ttdPenerima: string;
  mengetahui: boolean; mengetahuiJabatan: string; mengetahuiNama: string; mengetahuiId: string; ttdMengetahui: string;
  pakaiNomor: boolean; kosong: boolean;
};

const STORAGE_KEY = 'surat-pendelegasian-tugas:v1';
const POLA = '{n3}/SDT/{A3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);
const nik = (v: string) => (v.trim() ? `NIK. ${v.trim()}` : '');
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Distribusi & Perdagangan Umum',
  alamat: 'Jl. Merdeka No. 45, Kel. Sukajadi, Kec. Sukasari, Kota Bandung, Jawa Barat 40162',
  kontak: 'Telp. (022) 2034-5678 • info@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: 'SURAT PENDELEGASIAN TUGAS', nomor: randomDocNo(POLA), kota: 'Bandung', tanggal: today(),
  pemberiNama: 'Budi Santoso', pemberiJabatan: 'Direktur Operasional', pemberiId: '3273011204780003',
  penerimaNama: 'Rina Kusumawati', penerimaJabatan: 'Manajer Operasional', penerimaId: '3273014508850002',
  pembuka: 'Sehubungan dengan pelaksanaan dinas luar kota pihak pemberi delegasi, demi kelancaran kegiatan operasional perusahaan, dengan ini mendelegasikan tugas dan wewenang kepada penerima delegasi sebagai berikut:',
  tugas: [
    'Mengoordinasikan kegiatan operasional harian seluruh unit kerja.',
    'Menandatangani dokumen operasional rutin (surat jalan, berita acara serah terima, dan permintaan pembelian sampai dengan Rp10.000.000).',
    'Menghadiri rapat koordinasi internal mewakili Direktur Operasional.',
    'Melaporkan pelaksanaan tugas secara tertulis kepada pemberi delegasi.',
  ],
  mulai: today(), selesai: plusDays(14),
  batasan: 'Penerima delegasi tidak berwenang mengambil keputusan strategis, menandatangani kontrak kerja sama, maupun melakukan perubahan anggaran tanpa persetujuan tertulis dari pemberi delegasi.',
  penutup: 'Demikian surat pendelegasian tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.',
  ttd: '', stempel: '', ttdPenerima: '',
  mengetahui: false, mengetahuiJabatan: 'Direktur Utama', mengetahuiNama: 'Hendra Wijaya', mengetahuiId: '', ttdMengetahui: '',
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'pemberiNama', 'pemberiJabatan', 'pemberiId', 'ttd', 'stempel',
  'mengetahuiJabatan', 'mengetahuiNama', 'mengetahuiId', 'ttdMengetahui'] as const;

// ============================================================
// SECTION: Editor daftar bernomor
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

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPendelegasianTugas() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdPenerima: true, ttdMengetahui: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdPenerima = useBgRemoved(f.ttdPenerima, bg.ttdPenerima, bgError);
  const ttdMengetahui = useBgRemoved(f.ttdMengetahui, bg.ttdMengetahui, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdPenerima.busy || ttdMengetahui.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdPenerima.src, ttdMengetahui.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-pendelegasian-tugas-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const K = f.kosong; // template kosongan: data penerima/tugas/periode jadi titik-titik, ttd/stempel basah
  const periode = K ? `${TITIK} s.d. ${TITIK}` : [fmtTanggal(f.mulai), fmtTanggal(f.selesai)].filter(Boolean).join(' s.d. ');
  const signers: LayoutSigner[] = [
    { heading: 'Penerima delegasi,', role: isian(f.penerimaJabatan, K), name: isian(f.penerimaNama, K), idLine: K ? '' : nik(f.penerimaId), ttd: K ? '' : ttdPenerima.src, ttdOffset: getOffset(f.posisi, 'ttdPenerima') },
    ...(f.mengetahui ? [{ heading: 'Mengetahui,', role: f.mengetahuiJabatan, name: f.mengetahuiNama, idLine: nik(f.mengetahuiId), ttd: K ? '' : ttdMengetahui.src, ttdOffset: getOffset(f.posisi, 'ttdMengetahui') }] : []),
    { heading: 'Pemberi delegasi,', role: f.pemberiJabatan, name: f.pemberiNama, idLine: nik(f.pemberiId), ttd: K ? '' : ttd.src, stempel: K ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, K),
    placeDate: [f.kota || (K ? '……' : ''), K ? '…………… 20……' : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>Yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={[{ label: 'Nama', value: f.pemberiNama }, { label: 'Jabatan', value: f.pemberiJabatan }, { label: 'NIK', value: f.pemberiId }]} />
        <P>selanjutnya disebut <b>Pemberi Delegasi</b>, dengan ini mendelegasikan tugas dan wewenang kepada:</P>
        <InfoRows rows={[{ label: 'Nama', value: isian(f.penerimaNama, K) }, { label: 'Jabatan', value: isian(f.penerimaJabatan, K) }, { label: 'NIK', value: isian(f.penerimaId, K) }]} />
        <P>selanjutnya disebut <b>Penerima Delegasi</b>.</P>
        <P>{K ? `Sehubungan dengan ${TITIK}${TITIK}${TITIK}, dengan ini mendelegasikan tugas dan wewenang kepada penerima delegasi sebagai berikut:` : f.pembuka}</P>
        {(K || f.tugas.some(Boolean)) && (
          <ol style={{ margin: `0 0 ${8 * kk}px`, paddingLeft: 24 * kk, listStyle: 'decimal' }}>
            {(K ? Array<string>(4).fill('') : f.tugas.filter(Boolean)).map((t, i) => <li key={i} style={{ textAlign: 'justify', whiteSpace: 'pre-line' }}>{t || <span style={{ display: 'inline-block', width: '100%', height: '1.6em', borderBottom: DOTTED, verticalAlign: 'bottom' }} />}</li>)}
          </ol>
        )}
        {periode && <P>Pendelegasian ini berlaku selama periode <b>{periode}</b> dan berakhir dengan sendirinya setelah periode tersebut.</P>}
        {f.batasan && <P><b>Batasan wewenang:</b> {f.batasan}</P>}
        <P>{f.penutup}</P>
      </>
    ),
    signers,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Ttd pemberi' }, { id: 'stempel', label: 'Stempel' }, { id: 'ttdPenerima', label: 'Ttd penerima' },
        ...(f.mengetahui ? [{ id: 'ttdMengetahui', label: 'Ttd mengetahui' }] : [])]}
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pendelegasian Tugas</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pendelegasian-tugas" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Bidang usaha / unit (baris kedua kop)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              <Field label="Judul surat"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`${randomDocNo(POLA)} (nomor urut/SDT/kode unit/bulan romawi/tahun)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pemberi Delegasi</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.pemberiNama} onChange={(e) => set('pemberiNama', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.pemberiJabatan} onChange={(e) => set('pemberiJabatan', e.target.value)} /></Field>
              </div>
              <Field label="NIK (opsional)"><AutoTextarea className={inputCls} value={f.pemberiId} onChange={(e) => set('pemberiId', e.target.value)} /></Field>
              <ImageUpload label="Tanda tangan pemberi" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel perusahaan" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penerima Delegasi</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.penerimaNama} onChange={(e) => set('penerimaNama', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.penerimaJabatan} onChange={(e) => set('penerimaJabatan', e.target.value)} /></Field>
              </div>
              <Field label="NIK (opsional)"><AutoTextarea className={inputCls} value={f.penerimaId} onChange={(e) => set('penerimaId', e.target.value)} /></Field>
              <ImageUpload label="Tanda tangan penerima" value={f.ttdPenerima} onChange={(v) => set('ttdPenerima', v)} notify={notify} {...bgFor('ttdPenerima', ttdPenerima)} />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Isi Pendelegasian</h2>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Tugas / wewenang yang didelegasikan</p>
              <ListEditor label="Tugas" items={f.tugas} onChange={(v) => set('tugas', v)} />
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Berlaku mulai"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Sampai dengan"><input type="date" className={inputCls} value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
              </div>
              <Field label="Batasan wewenang"><AutoTextarea rows={2} className={inputCls} value={f.batasan} onChange={(e) => set('batasan', e.target.value)} /></Field>
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Mengetahui (opsional)</h2>
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium">
                <input type="checkbox" className="w-5 h-5" checked={f.mengetahui} onChange={(e) => set('mengetahui', e.target.checked)} /> Tampilkan "Mengetahui," atasan
              </label>
              {f.mengetahui && (<>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Jabatan atasan"><AutoTextarea className={inputCls} value={f.mengetahuiJabatan} onChange={(e) => set('mengetahuiJabatan', e.target.value)} /></Field>
                  <Field label="Nama atasan"><AutoTextarea className={inputCls} value={f.mengetahuiNama} onChange={(e) => set('mengetahuiNama', e.target.value)} /></Field>
                </div>
                <Field label="NIK (opsional)"><AutoTextarea className={inputCls} value={f.mengetahuiId} onChange={(e) => set('mengetahuiId', e.target.value)} /></Field>
                <ImageUpload label="Tanda tangan atasan" value={f.ttdMengetahui} onChange={(v) => set('ttdMengetahui', v)} notify={notify} {...bgFor('ttdMengetahui', ttdMengetahui)} />
              </>)}
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
