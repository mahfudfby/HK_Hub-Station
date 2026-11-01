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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah } from '../../shared/lib/money';

// Surat Tugas Luar Kota (perjalanan dinas): satu atau beberapa pegawai ditugaskan ke kota lain.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Pegawai = { nama: string; nik: string; jabatan: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  dasar: string; pembuka: string; pegawai: Pegawai[];
  tujuan: string; keperluan: string; berangkat: string; kembali: string;
  transportasi: string; akomodasi: string; biaya: 'perusahaan' | 'uangSaku'; uangSaku: string;
  kewajiban: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  pengesahan: boolean; tembusan: string;
};

const STORAGE_KEY = 'surat-tugas-luar-kota:v1';
const POLA = '{n3}/ST-LK/{A3}/{rom}/{yyyy}';
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => iso(new Date(Date.now() + n * 864e5));

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • hrd@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: 'SURAT TUGAS', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: iso(new Date()),
  dasar: '',
  pembuka: 'Yang bertanda tangan di bawah ini, Direktur PT Sinar Maju Sejahtera, dengan ini menugaskan kepada:',
  pegawai: [
    { nama: 'Andi Pratama', nik: 'KRY-2019-0145', jabatan: 'Supervisor Logistik' },
    { nama: 'Rina Kusumawati', nik: 'KRY-2021-0233', jabatan: 'Staf Pengadaan' },
  ],
  tujuan: 'Kantor Cabang Surabaya, Jawa Timur',
  keperluan: 'Melakukan audit persediaan barang dan pendampingan penerapan sistem gudang baru.',
  berangkat: plusDays(3), kembali: plusDays(5),
  transportasi: 'Kereta api kelas eksekutif (pulang–pergi)', akomodasi: 'Hotel yang ditunjuk perusahaan',
  biaya: 'uangSaku', uangSaku: '350000',
  kewajiban: 'Setelah selesai melaksanakan tugas, yang bersangkutan wajib menyampaikan laporan tertulis beserta bukti pengeluaran kepada atasan paling lambat 3 (tiga) hari kerja setelah kembali.',
  penutup: 'Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.',
  ttdHeading: 'Hormat kami,', ttdJabatan: 'Direktur', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  pengesahan: true, tembusan: 'Manajer Keuangan\nArsip',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// Lama perjalanan (hari, termasuk hari berangkat & kembali); 0 bila tanggal tidak valid
const lamaHari = (a: string, b: string) => {
  const d = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;
  return Number.isFinite(d) && d > 0 ? d : 0;
};
console.assert(lamaHari('2026-11-03', '2026-11-05') === 3 && lamaHari('2026-11-05', '2026-11-03') === 0 && lamaHari('', '2026-11-03') === 0, 'lamaHari');

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

// Tabel pegawai yang ditugaskan; kosongan = 3 baris kosong untuk ditulis tangan
function PegawaiTable({ rows, kosong, k }: { rows: Pegawai[]; kosong: boolean; k: number }) {
  const cell: CSSProperties = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top', height: '1.6em' };
  const list = kosong ? [0, 1, 2].map(() => ({ nama: '', nik: '', jabatan: '' })) : rows;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px` }}>
      <thead><tr>{['No', 'Nama', 'NIK Karyawan', 'Jabatan'].map((h) => <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'center' }}>{h}</th>)}</tr></thead>
      <tbody>
        {list.map((p, i) => (
          <tr key={i}><td style={{ ...cell, textAlign: 'center', width: '8%' }}>{kosong ? '' : i + 1}</td><td style={cell}>{p.nama}</td><td style={cell}>{p.nik}</td><td style={cell}>{p.jabatan}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

// Kolom pengesahan di tempat tujuan (Tiba di / Berangkat dari), diisi & dicap pihak tujuan
function Pengesahan({ k }: { k: number }) {
  const box: CSSProperties = { flex: 1, border: '1px solid #000', padding: 6 * k };
  const col = (judul: string) => (
    <div style={box}>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 4 * k, rowGap: 2 * k }}>
        <span>{judul}</span><span>: {TITIK}</span>
        <span>Pada tanggal</span><span>: {TITIK}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 4 * k }}>Pejabat di tempat tujuan,</div>
      <div style={{ height: 52 * k }} />
      <div style={{ textAlign: 'center' }}>( {TITIK} )</div>
      <div style={{ textAlign: 'center', fontSize: '0.85em' }}>Nama, tanda tangan & cap</div>
    </div>
  );
  return (
    <div style={{ marginBottom: 8 * k }}>
      <div style={{ fontWeight: 700, marginBottom: 2 * k }}>Pengesahan di tempat tujuan:</div>
      <div style={{ display: 'flex', gap: 8 * k }}>{col('Tiba di')}{col('Berangkat dari')}</div>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratTugasLuarKota() {
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
  const setPegawai = (i: number, p: Partial<Pegawai>) => set('pegawai', f.pegawai.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-tugas-luar-kota-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const ks = f.kosong;
  const hari = lamaHari(f.berangkat, f.kembali);
  const saku = num(f.uangSaku);
  const biaya = f.biaya === 'perusahaan'
    ? 'Seluruh biaya perjalanan dinas ditanggung oleh perusahaan'
    : ks ? `Uang saku Rp ${TITIK} per orang per hari`
      : `Uang saku Rp ${rupiah(saku)} per orang per hari${hari ? ` (Rp ${rupiah(saku * hari)} per orang untuk ${hari} hari)` : ''}; transportasi & penginapan ditanggung perusahaan`;
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        {f.dasar.trim() && <P style={{ marginBottom: 2 * kk }}>Dasar:</P>}
        <NumList text={f.dasar} k={kk} />
        <P>{f.pembuka}</P>
        <PegawaiTable rows={f.pegawai} kosong={ks} k={kk} />
        <P>Untuk melaksanakan tugas perjalanan dinas dengan rincian sebagai berikut:</P>
        <InfoRows rows={[
          { label: 'Tempat tujuan', value: isian(f.tujuan, ks) },
          { label: 'Maksud / keperluan', value: isian(f.keperluan, ks) },
          { label: 'Tanggal berangkat', value: isian(fmtTanggal(f.berangkat), ks) },
          { label: 'Tanggal kembali', value: isian(fmtTanggal(f.kembali), ks) },
          { label: 'Lama perjalanan', value: isian(hari ? `${hari} hari` : '', ks) },
          { label: 'Alat transportasi', value: isian(f.transportasi, ks) },
          { label: 'Akomodasi', value: isian(f.akomodasi, ks) },
          { label: 'Biaya', value: biaya },
        ]} />
        <P>{f.kewajiban}</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers: [{ heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true }],
    footer: (f.pengesahan || f.tembusan) ? (
      <>
        {f.pengesahan && <Pengesahan k={kk} />}
        {f.tembusan && <><div style={{ fontWeight: 700 }}>Tembusan:</div><div style={{ whiteSpace: 'pre-line' }}>{f.tembusan}</div></>}
      </>
    ) : undefined,
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Tugas Luar Kota</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-tugas-luar-kota" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

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
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/ST-LK/OPS/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <Field label="Dasar (opsional, satu poin per baris)"><AutoTextarea rows={2} className={inputCls} value={f.dasar} onChange={(e) => set('dasar', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Pegawai yang Ditugaskan</h2>
              {f.pegawai.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Nama pegawai ${i + 1}`} placeholder="Nama" className={inputCls} value={p.nama} onChange={(e) => setPegawai(i, { nama: e.target.value })} />
                  <AutoTextarea aria-label={`NIK karyawan ${i + 1}`} placeholder="NIK karyawan" className={inputCls} value={p.nik} onChange={(e) => setPegawai(i, { nik: e.target.value })} />
                  <AutoTextarea aria-label={`Jabatan pegawai ${i + 1}`} placeholder="Jabatan" className={inputCls} value={p.jabatan} onChange={(e) => setPegawai(i, { jabatan: e.target.value })} />
                  <button type="button" onClick={() => set('pegawai', f.pegawai.filter((_, j) => j !== i))} aria-label={`Hapus pegawai ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('pegawai', [...f.pegawai, { nama: '', nik: '', jabatan: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah pegawai</button>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Rincian Perjalanan Dinas</h2>
              <Field label="Kota / tempat tujuan"><AutoTextarea className={inputCls} value={f.tujuan} onChange={(e) => set('tujuan', e.target.value)} /></Field>
              <Field label="Maksud / keperluan tugas"><AutoTextarea rows={2} className={inputCls} value={f.keperluan} onChange={(e) => set('keperluan', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal berangkat"><input type="date" className={inputCls} value={f.berangkat} onChange={(e) => set('berangkat', e.target.value)} /></Field>
                <Field label="Tanggal kembali"><input type="date" className={inputCls} value={f.kembali} onChange={(e) => set('kembali', e.target.value)} /></Field>
              </div>
              <p className="text-xs text-gray-500">Lama perjalanan: {hari ? `${hari} hari (otomatis)` : 'periksa tanggal berangkat & kembali'}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Alat transportasi"><AutoTextarea className={inputCls} value={f.transportasi} onChange={(e) => set('transportasi', e.target.value)} /></Field>
                <Field label="Akomodasi / penginapan"><AutoTextarea className={inputCls} value={f.akomodasi} onChange={(e) => set('akomodasi', e.target.value)} /></Field>
              </div>
              <Field label="Biaya">
                <select className={`${inputCls} min-h-[40px]`} value={f.biaya} onChange={(e) => set('biaya', e.target.value as Form['biaya'])}>
                  <option value="perusahaan">Ditanggung perusahaan</option>
                  <option value="uangSaku">Uang saku per hari</option>
                </select>
              </Field>
              {f.biaya === 'uangSaku' && (
                <Field label="Uang saku per orang per hari (Rp)"><input inputMode="numeric" className={inputCls} value={f.uangSaku} onChange={(e) => set('uangSaku', e.target.value.replace(/\D/g, ''))} /></Field>
              )}
              <Field label="Kewajiban setelah kembali"><AutoTextarea rows={2} className={inputCls} value={f.kewajiban} onChange={(e) => set('kewajiban', e.target.value)} /></Field>
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
                <input type="checkbox" className="h-5 w-5" checked={f.pengesahan} onChange={(e) => set('pengesahan', e.target.checked)} />
                Tampilkan kolom pengesahan "Tiba di / Berangkat dari" (cap & tanda tangan pihak tujuan)
              </label>
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
