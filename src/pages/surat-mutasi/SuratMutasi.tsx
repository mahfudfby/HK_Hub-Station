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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';

// Surat Pemindahan / Mutasi Karyawan: posisi lama vs baru, tanggal efektif, alasan, hak & kewajiban.
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
  nama: string; nik: string;
  jabatanLama: string; divisiLama: string; lokasiLama: string;
  jabatanBaru: string; divisiBaru: string; lokasiBaru: string;
  efektif: string; hak: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdKaryawan: boolean;
  penandaLain: Signer[];
  tembusan: string;
};

const STORAGE_KEY = 'surat-mutasi:v1';
const POLA = '{n3}/SK-MTS/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • hrd@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: 'SURAT KEPUTUSAN MUTASI', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiran: '', perihal: '', kepada: '',
  dasar: 'Kebutuhan penguatan sumber daya manusia di kantor cabang Surabaya.\nHasil evaluasi kinerja karyawan periode tahun berjalan.\nPeraturan Perusahaan tentang penempatan dan mutasi karyawan.',
  pembuka: 'Direksi PT Sinar Maju Sejahtera dengan ini memutuskan untuk memindahkan karyawan berikut:',
  nama: 'Rina Kartika', nik: 'KRY-2020-0231',
  jabatanLama: 'Staf Administrasi Penjualan', divisiLama: 'Penjualan', lokasiLama: 'Kantor Pusat Jakarta',
  jabatanBaru: 'Koordinator Administrasi Penjualan', divisiBaru: 'Penjualan', lokasiBaru: 'Kantor Cabang Surabaya',
  efektif: today(),
  hak: 'Gaji pokok dan tunjangan menyesuaikan ketentuan jabatan baru.\nPerusahaan menanggung biaya perpindahan sesuai peraturan yang berlaku.\nKaryawan wajib menyelesaikan serah terima pekerjaan sebelum tanggal efektif.\nKaryawan wajib melapor kepada pimpinan di lokasi kerja baru.',
  penutup: 'Demikian surat keputusan ini dibuat untuk dilaksanakan sebagaimana mestinya. Apabila di kemudian hari terdapat kekeliruan, akan diadakan perbaikan seperlunya.',
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  ttdKaryawan: true,
  penandaLain: [],
  tembusan: 'Kepala Cabang Surabaya\nManajer HRD\nArsip',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>; html2canvas tetap akurat)
function NumList({ text, k }: { text: string; k: number }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Posisi lama vs baru: Uraian | Semula | Menjadi
function MoveTable({ rows, k }: { rows: [string, string, string][]; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.95em' }}>
      <thead>
        <tr>{['Uraian', 'Semula', 'Menjadi'].map((h, i) => <th key={h} style={{ ...cell, width: i ? '38%' : '24%', textAlign: 'left' }}>{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={{ ...cell, fontWeight: i === 0 ? 700 : undefined }}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratMutasi() {
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
  const fileName = `surat-mutasi-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Lampiran/Perihal/Kepada opsional: kosong = gaya SK (nomor di bawah judul)
  const meta = [{ label: 'Lampiran', value: f.lampiran }, { label: 'Perihal', value: f.perihal }].filter((r) => r.value.trim());
  const signers: LayoutSigner[] = [
    ...(f.ttdKaryawan ? [{ heading: 'Yang bersangkutan,', role: f.jabatanBaru, name: f.nama, idLine: f.nik && `NIK. ${f.nik}` }] : []),
    ...f.penandaLain.map((s) => ({ heading: s.heading, role: s.jabatan, name: s.nama })),
    { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ttd.src, stempel: stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: f.nomor,
    meta: meta.length ? meta : undefined,
    placeDate: [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...f.kepada.split('\n')] : undefined,
    body: (
      <>
        {f.dasar.trim() && <P style={{ marginBottom: 2 * kk }}>Dasar / menimbang:</P>}
        <NumList text={f.dasar} k={kk} />
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Nama', value: f.nama }, { label: 'NIK karyawan', value: f.nik }]} />
        <P>Dari posisi semula ke posisi baru sebagai berikut:</P>
        <MoveTable k={kk} rows={[['Jabatan', f.jabatanLama, f.jabatanBaru], ['Divisi', f.divisiLama, f.divisiBaru], ['Lokasi kerja', f.lokasiLama, f.lokasiBaru]]} />
        {f.efektif && <P>Mutasi ini berlaku efektif mulai tanggal <b>{fmtTanggal(f.efektif)}</b>.</P>}
        {f.hak.trim() && <P style={{ marginBottom: 2 * kk }}>Hak dan kewajiban:</P>}
        <NumList text={f.hak} k={kk} />
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Mutasi Karyawan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-mutasi" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

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
              <div className="flex flex-wrap gap-2">
                {['SURAT KEPUTUSAN MUTASI', 'SURAT PEMINDAHAN'].map((j) => (
                  <button key={j} type="button" onClick={() => set('judul', j)} aria-pressed={f.judul === j}
                    className={`px-3 min-h-[40px] rounded-lg border text-sm font-medium ${f.judul === j ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{j}</button>
                ))}
              </div>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`015/SK-MTS/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
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
              <h2 className="font-bold">Isi Mutasi</h2>
              <Field label="Alasan / dasar mutasi (opsional, satu poin per baris)"><AutoTextarea rows={2} className={inputCls} value={f.dasar} onChange={(e) => set('dasar', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama karyawan"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <Field label="NIK karyawan"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <p className="text-sm font-bold text-gray-700 sm:col-span-1">Posisi semula</p>
                <p className="hidden sm:block text-sm font-bold text-gray-700">Posisi baru</p>
                <Field label="Jabatan semula"><AutoTextarea className={inputCls} value={f.jabatanLama} onChange={(e) => set('jabatanLama', e.target.value)} /></Field>
                <Field label="Jabatan baru"><AutoTextarea className={inputCls} value={f.jabatanBaru} onChange={(e) => set('jabatanBaru', e.target.value)} /></Field>
                <Field label="Divisi semula"><AutoTextarea className={inputCls} value={f.divisiLama} onChange={(e) => set('divisiLama', e.target.value)} /></Field>
                <Field label="Divisi baru"><AutoTextarea className={inputCls} value={f.divisiBaru} onChange={(e) => set('divisiBaru', e.target.value)} /></Field>
                <Field label="Lokasi kerja semula"><AutoTextarea className={inputCls} value={f.lokasiLama} onChange={(e) => set('lokasiLama', e.target.value)} /></Field>
                <Field label="Lokasi kerja baru"><AutoTextarea className={inputCls} value={f.lokasiBaru} onChange={(e) => set('lokasiBaru', e.target.value)} /></Field>
              </div>
              <Field label="Tanggal efektif"><input type="date" className={inputCls} value={f.efektif} onChange={(e) => set('efektif', e.target.value)} /></Field>
              <Field label="Hak & kewajiban (satu poin per baris)"><AutoTextarea rows={3} className={inputCls} value={f.hak} onChange={(e) => set('hak', e.target.value)} /></Field>
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
                <input type="checkbox" className="h-5 w-5" checked={f.ttdKaryawan} onChange={(e) => set('ttdKaryawan', e.target.checked)} />
                Tampilkan tanda tangan karyawan "Yang bersangkutan," di kiri
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
