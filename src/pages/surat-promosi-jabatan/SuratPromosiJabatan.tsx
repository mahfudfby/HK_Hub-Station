import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Pengangkatan / Promosi Jabatan: jabatan lama → jabatan baru, tanggal efektif, tugas jabatan baru.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Posisi = { jabatan: string; level: string; divisi: string; gaji: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  menimbang: string; pembuka: string;
  nama: string; nik: string; masuk: string;
  lama: Posisi; baru: Posisi;
  efektif: string; percobaan: string; tugas: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdYbs: boolean; ttdKaryawan: string; tembusan: string;
};

const STORAGE_KEY = 'surat-promosi-jabatan:v1';
const POLA = '{n3}/SK-PRM/HRD/{rom}/{yyyy}';
const JUDUL = ['SURAT KEPUTUSAN PENGANGKATAN', 'SURAT PROMOSI JABATAN'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • hrd@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: JUDUL[0], nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: iso(new Date()),
  menimbang: 'Hasil penilaian kinerja karyawan periode tahun berjalan dengan predikat sangat baik.\nKebutuhan organisasi untuk mengisi jabatan Kepala Gudang Cabang Bekasi.\nRekomendasi atasan langsung dan hasil rapat Direksi.',
  pembuka: 'Direksi PT Sinar Maju Sejahtera, dengan ini memutuskan untuk mengangkat karyawan:',
  nama: 'Andi Pratama', nik: 'KRY-2019-0145', masuk: '2019-03-04',
  lama: { jabatan: 'Supervisor Logistik', level: 'Golongan III / Staf Senior', divisi: 'Operasional', gaji: '6500000' },
  baru: { jabatan: 'Kepala Gudang Cabang Bekasi', level: 'Golongan IV / Manajerial', divisi: 'Operasional', gaji: '8750000' },
  efektif: iso(new Date()), percobaan: '3 (tiga) bulan',
  tugas: 'Memimpin dan mengawasi seluruh kegiatan operasional gudang cabang.\nMenjamin ketepatan penerimaan, penyimpanan, dan pengiriman barang.\nMenyusun laporan persediaan dan kinerja gudang setiap bulan kepada Manajer Operasional.\nMembina, mengatur jadwal, dan menilai kinerja staf gudang.\nMenerapkan prosedur keselamatan dan keamanan kerja di area gudang.',
  penutup: 'Kami mengucapkan selamat atas kepercayaan yang diberikan dan berharap Saudara dapat menjalankan amanah jabatan baru ini dengan sebaik-baiknya. Demikian surat ini dibuat untuk dilaksanakan sebagaimana mestinya.',
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  ttdYbs: false, ttdKaryawan: '', tembusan: 'Manajer HRD\nManajer Operasional\nArsip',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
function NumList({ text, k }: { text: string; k: number }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Tabel Semula | Menjadi; baris yang kedua sisinya kosong disembunyikan (kecuali template kosongan)
const ROWS: [keyof Posisi, string][] = [['jabatan', 'Jabatan'], ['level', 'Golongan / Level'], ['divisi', 'Divisi'], ['gaji', 'Gaji pokok']];
function PromosiTable({ lama, baru, kosong, k }: { lama: Posisi; baru: Posisi; kosong: boolean; k: number }) {
  const cell: CSSProperties = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top', height: '1.6em' };
  const show = (p: Posisi, key: keyof Posisi) => (kosong ? '' : key === 'gaji' ? (p.gaji ? `Rp ${rupiah(num(p.gaji))}` : '') : p[key]);
  const rows = ROWS.filter(([key]) => kosong || lama[key].trim() || baru[key].trim());
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px` }}>
      <thead><tr>{['Uraian', 'Semula', 'Menjadi'].map((h) => <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'center' }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(([key, label]) => <tr key={key}><td style={{ ...cell, width: '24%', fontWeight: 700 }}>{label}</td><td style={cell}>{show(lama, key)}</td><td style={cell}>{show(baru, key)}</td></tr>)}</tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPromosiJabatan() {
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
  const setPos = (side: 'lama' | 'baru', key: keyof Posisi, v: string) => setF((p) => ({ ...p, [side]: { ...p[side], [key]: v } }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdKaryawan.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-promosi-jabatan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const ks = f.kosong;
  const t = (v: string) => (ks || !v ? TITIK : v);
  // Tanpa label bersama: "Yang bersangkutan" & Direktur tersebar rata kiri–kanan
  const signers: LayoutSigner[] = [
    ...(f.ttdYbs ? [{ heading: 'Yang bersangkutan,', role: isian(f.baru.jabatan, ks), name: isian(f.nama, ks), idLine: !ks && f.nik ? `NIK. ${f.nik}` : '', ttd: ks ? '' : ttdKaryawan.src, ttdOffset: getOffset(f.posisi, 'ttdKaryawan') }] : []),
    { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const tugas = ks ? Array(4).fill(TITIK).join('\n') : f.tugas;
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        {f.menimbang.trim() && <P style={{ marginBottom: 2 * kk }}>Menimbang:</P>}
        <NumList text={ks && f.menimbang.trim() ? Array(2).fill(TITIK).join('\n') : f.menimbang} k={kk} />
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Nama', value: isian(f.nama, ks) },
          { label: 'NIK karyawan', value: isian(f.nik, ks) },
          ...(f.masuk || ks ? [{ label: 'Tanggal mulai bekerja', value: isian(fmtTanggal(f.masuk), ks) }] : []),
        ]} />
        <P>Dari jabatan semula ke jabatan baru dengan rincian sebagai berikut:</P>
        <PromosiTable lama={f.lama} baru={f.baru} kosong={ks} k={kk} />
        <P>Pengangkatan ini berlaku efektif sejak tanggal {t(fmtTanggal(f.efektif))}{f.percobaan.trim() ? `, dengan masa percobaan selama ${t(f.percobaan)}. Apabila selama masa percobaan yang bersangkutan dinilai belum memenuhi persyaratan jabatan, perusahaan berhak meninjau kembali keputusan ini` : ''}.</P>
        {(f.tugas.trim() || ks) && <P style={{ marginBottom: 2 * kk }}>Tugas dan tanggung jawab jabatan baru:</P>}
        <NumList text={tugas} k={kk} />
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
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: `TTD ${f.ttdNama || f.ttdJabatan || 'utama'}` }, { id: 'stempel', label: 'Stempel' },
        ...(f.ttdYbs ? [{ id: 'ttdKaryawan', label: `TTD ${f.nama || 'yang bersangkutan'}` }] : [])]}
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
  const posInput = (side: 'lama' | 'baru', key: keyof Posisi, label: string) => key === 'gaji'
    ? <input aria-label={label} inputMode="numeric" placeholder="Opsional" className={inputCls} value={f[side].gaji} onChange={(e) => setPos(side, 'gaji', e.target.value.replace(/\D/g, ''))} />
    : <AutoTextarea aria-label={label} className={inputCls} value={f[side][key]} onChange={(e) => setPos(side, key, e.target.value)} />;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pengangkatan / Promosi Jabatan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-promosi-jabatan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Bidang usaha (baris kedua kop)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Data Surat">
              <div className="flex flex-wrap gap-2">
                {JUDUL.map((j) => (
                  <button key={j} type="button" onClick={() => set('judul', j)}
                    className={`px-3 min-h-[40px] rounded-lg border text-xs font-semibold ${f.judul === j ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{j}</button>
                ))}
              </div>
              <Field label="Judul surat"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`008/SK-PRM/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal ditetapkan"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <Field label="Menimbang / dasar (opsional, satu poin per baris)"><AutoTextarea rows={2} className={inputCls} value={f.menimbang} onChange={(e) => set('menimbang', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Data Karyawan">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <Field label="NIK karyawan"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
                <Field label="Tanggal mulai bekerja (opsional)"><input type="date" className={inputCls} value={f.masuk} onChange={(e) => set('masuk', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Jabatan Semula → Menjadi">
              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center text-sm">
                <span /><span className="font-semibold">Semula</span><span className="font-semibold">Menjadi</span>
                {ROWS.map(([key, label]) => (
                  <div key={key} className="contents">
                    <span className="font-medium text-gray-700">{label}{key === 'gaji' && ' (Rp, opsional)'}</span>
                    {posInput('lama', key, `${label} semula`)}
                    {posInput('baru', key, `${label} menjadi`)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Baris yang kedua kolomnya kosong tidak ditampilkan.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal efektif"><input type="date" className={inputCls} value={f.efektif} onChange={(e) => set('efektif', e.target.value)} /></Field>
                <Field label="Masa percobaan (opsional)"><AutoTextarea className={inputCls} value={f.percobaan} onChange={(e) => set('percobaan', e.target.value)} /></Field>
              </div>
              <Field label="Tugas & tanggung jawab jabatan baru (satu poin per baris)"><AutoTextarea rows={3} className={inputCls} value={f.tugas} onChange={(e) => set('tugas', e.target.value)} /></Field>
              <Field label="Penutup / ucapan selamat"><AutoTextarea rows={3} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Penanda Tangan">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Salam penutup"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.ttdJabatan} onChange={(e) => set('ttdJabatan', e.target.value)} /></Field>
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.ttdNama} onChange={(e) => set('ttdNama', e.target.value)} /></Field>
                <Field label="NIK karyawan (opsional)"><AutoTextarea className={inputCls} value={f.ttdId} onChange={(e) => set('ttdId', e.target.value)} /></Field>
              </div>
              <ImageUpload label={`Tanda tangan — ${f.ttdNama || f.ttdJabatan || 'penanda tangan utama'}`} value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium text-gray-700">
                <input type="checkbox" className="h-5 w-5" checked={f.ttdYbs} onChange={(e) => set('ttdYbs', e.target.checked)} />
                Tampilkan tanda tangan "Yang bersangkutan," di kiri
              </label>
              {f.ttdYbs && <ImageUpload label={`Tanda tangan — ${f.nama || 'yang bersangkutan'}`} value={f.ttdKaryawan} onChange={(v) => set('ttdKaryawan', v)} notify={notify} {...bgFor('ttdKaryawan', ttdKaryawan)} />}
              <Field label="Tembusan (opsional)"><AutoTextarea rows={2} className={inputCls} value={f.tembusan} onChange={(e) => set('tembusan', e.target.value)} /></Field>
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
