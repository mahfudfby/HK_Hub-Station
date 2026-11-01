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
import { useBgRemoved } from '../../shared/lib/removeBg';
import DocOptions, { TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';

// Surat Penunjukan: menunjuk karyawan sebagai PIC / koordinator / pejabat sementara.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Signer = { heading: string; nama: string; jabatan: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  lampiran: string; perihal: string; kepada: string;
  dasar: string; pembuka: string;
  nama: string; nik: string; jabatan: string; divisi: string;
  sebagai: string; tugas: string; masaBerlaku: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdDitunjuk: boolean;
  penandaLain: Signer[];
  tembusan: string;
  pakaiNomor: boolean; kosong: boolean;
};

const STORAGE_KEY = 'surat-penunjukan:v1';
const POLA = '{n3}/SPn/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • hrd@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: 'SURAT PENUNJUKAN', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiran: '', perihal: '', kepada: '',
  dasar: 'Kebutuhan koordinasi pelaksanaan proyek perluasan gudang perusahaan.\nHasil rapat direksi mengenai susunan penanggung jawab proyek.',
  pembuka: 'Yang bertanda tangan di bawah ini, Direktur PT Sinar Maju Sejahtera, dengan ini menunjuk karyawan:',
  nama: 'Andi Pratama', nik: 'KRY-2019-0145', jabatan: 'Supervisor Logistik', divisi: 'Operasional',
  sebagai: 'Koordinator Proyek Perluasan Gudang Cikarang',
  tugas: 'Menyusun rencana kerja dan jadwal pelaksanaan proyek.\nMengoordinasikan tim internal dan pihak rekanan.\nMemantau anggaran dan kemajuan pekerjaan secara berkala.\nMelaporkan hasil pelaksanaan kepada Direktur setiap akhir bulan.',
  masaBerlaku: 'Penunjukan ini berlaku sejak tanggal ditetapkan sampai dengan proyek dinyatakan selesai, dengan ketentuan akan ditinjau kembali apabila terdapat kekeliruan.',
  penutup: 'Demikian surat penunjukan ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.',
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  ttdDitunjuk: true,
  penandaLain: [],
  tembusan: 'Kepala Divisi Operasional\nArsip',
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>; html2canvas tetap akurat)
// blank: jumlah baris bernomor kosong untuk ditulis tangan (template kosongan)
function NumList({ text, k, blank = 0 }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill('') : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, alignItems: blank ? 'end' : undefined, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l || <span style={{ display: 'block', height: '1.6em', borderBottom: DOTTED }} />}</span></div>)}
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPenunjukan() {
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
  const setSigner = (i: number, p: Partial<Signer>) => set('penandaLain', f.penandaLain.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-penunjukan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Lampiran/Perihal/Kepada opsional: kosong = gaya SK (nomor di bawah judul)
  const K = f.kosong; // template kosongan: data jadi titik-titik, ttd/stempel basah
  const meta = [{ label: 'Lampiran', value: f.lampiran }, { label: 'Perihal', value: f.perihal }].filter((r) => r.value.trim())
    .map((r) => (K && r.label === 'Lampiran' ? { ...r, value: TITIK } : r));
  const signers: LayoutSigner[] = [
    ...(f.ttdDitunjuk ? [{ heading: 'Yang ditunjuk,', role: isian(f.jabatan, K), name: isian(f.nama, K), idLine: K ? '' : f.nik && `NIK. ${f.nik}` }] : []),
    ...f.penandaLain.map((s) => ({ heading: s.heading, role: s.jabatan, name: s.nama })),
    { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: K ? '' : ttd.src, stempel: K ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, K),
    meta: meta.length ? meta : undefined,
    placeDate: [f.kota || (K ? '……' : ''), K ? '…………… 20……' : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? (K ? ['Kepada Yth.', TITIK + TITIK, 'di Tempat'] : ['Kepada Yth.', ...f.kepada.split('\n')]) : undefined,
    body: (
      <>
        {f.dasar.trim() && <P style={{ marginBottom: 2 * kk }}>Dasar / menimbang:</P>}
        <NumList text={f.dasar} k={kk} blank={K && f.dasar.trim() ? 3 : 0} />
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Nama', value: f.nama }, { label: 'NIK karyawan', value: f.nik }, { label: 'Jabatan', value: f.jabatan }, { label: 'Divisi', value: f.divisi }].map((r) => ({ ...r, value: isian(r.value, K) }))} />
        <P>Sebagai <b>{K ? TITIK + TITIK + TITIK : f.sebagai}</b>{f.tugas.trim() ? ', dengan tugas dan tanggung jawab:' : '.'}</P>
        <NumList text={f.tugas} k={kk} blank={K && f.tugas.trim() ? 4 : 0} />
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
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
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
      <button onClick={reset} className="px-5 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Penunjukan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-penunjukan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Bidang usaha (baris kedua kop)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              <Field label="Judul surat"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`015/SPn/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal ditetapkan"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <p className="text-xs text-gray-500">Lampiran, Perihal & Kepada boleh dikosongkan (format SK: nomor di bawah judul).</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Lampiran (opsional)"><AutoTextarea className={inputCls} value={f.lampiran} onChange={(e) => set('lampiran', e.target.value)} /></Field>
                <Field label="Perihal (opsional)"><AutoTextarea className={inputCls} value={f.perihal} onChange={(e) => set('perihal', e.target.value)} /></Field>
              </div>
              <Field label="Kepada Yth. (opsional)"><AutoTextarea rows={2} className={inputCls} value={f.kepada} onChange={(e) => set('kepada', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Isi Penunjukan</h2>
              <Field label="Dasar / menimbang (opsional, satu poin per baris)"><AutoTextarea rows={2} className={inputCls} value={f.dasar} onChange={(e) => set('dasar', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama yang ditunjuk"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <Field label="NIK karyawan"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
                <Field label="Divisi"><AutoTextarea className={inputCls} value={f.divisi} onChange={(e) => set('divisi', e.target.value)} /></Field>
              </div>
              <Field label="Ditunjuk sebagai"><AutoTextarea className={inputCls} value={f.sebagai} onChange={(e) => set('sebagai', e.target.value)} /></Field>
              <Field label="Tugas & tanggung jawab (satu poin per baris)"><AutoTextarea rows={3} className={inputCls} value={f.tugas} onChange={(e) => set('tugas', e.target.value)} /></Field>
              <Field label="Masa berlaku"><AutoTextarea rows={2} className={inputCls} value={f.masaBerlaku} onChange={(e) => set('masaBerlaku', e.target.value)} /></Field>
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Salam penutup"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.ttdJabatan} onChange={(e) => set('ttdJabatan', e.target.value)} /></Field>
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.ttdNama} onChange={(e) => set('ttdNama', e.target.value)} /></Field>
                <Field label="NIK karyawan (opsional)"><AutoTextarea className={inputCls} value={f.ttdId} onChange={(e) => set('ttdId', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium text-gray-700">
                <input type="checkbox" className="h-5 w-5" checked={f.ttdDitunjuk} onChange={(e) => set('ttdDitunjuk', e.target.checked)} />
                Tampilkan tanda tangan "Yang ditunjuk," di kiri
              </label>
              <p className="text-sm font-bold text-gray-700">Penanda tangan lain (opsional)</p>
              {f.penandaLain.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Salam penanda tangan ${i + 1}`} placeholder="Mis. Mengetahui," className={inputCls} value={p.heading} onChange={(e) => setSigner(i, { heading: e.target.value })} />
                  <AutoTextarea aria-label={`Jabatan penanda tangan ${i + 1}`} placeholder="Jabatan" className={inputCls} value={p.jabatan} onChange={(e) => setSigner(i, { jabatan: e.target.value })} />
                  <AutoTextarea aria-label={`Nama penanda tangan ${i + 1}`} placeholder="Nama" className={inputCls} value={p.nama} onChange={(e) => setSigner(i, { nama: e.target.value })} />
                  <button type="button" onClick={() => set('penandaLain', f.penandaLain.filter((_, j) => j !== i))} aria-label={`Hapus penanda tangan ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('penandaLain', [...f.penandaLain, { heading: 'Mengetahui,', nama: '', jabatan: 'Manajer HRD' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah penanda tangan</button>
              <Field label="Tembusan (opsional)"><AutoTextarea rows={2} className={inputCls} value={f.tembusan} onChange={(e) => set('tembusan', e.target.value)} /></Field>
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
