import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { Switch, TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import FormSection from '../../shared/components/FormSection';
import KontakFields from '../../shared/components/KontakFields';

// Surat Perintah Lembur (SPL): perintah atasan kepada satu/lebih karyawan untuk bekerja lembur
// pada tanggal tertentu, dengan tabel jam mulai–selesai (total jam otomatis, mendukung lewat tengah malam).
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Lembur = { nama: string; nik: string; jabatan: string; mulai: string; selesai: string; tugas: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pembuka: string; tglLembur: string; lokasi: string; alasan: string;
  rows: Lembur[]; ketentuan: string; penutup: string;
  pakaiAtasan: boolean; pakaiHrd: boolean; // tanda tangan yang tampil (bebas 1 atau 2)
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  hrdJabatan: string; hrdNama: string; ttdHrd: string;
};

const STORAGE_KEY = 'surat-perintah-lembur:v1';
const POLA = '{n3}/SPL/{A3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT PERINTAH LEMBUR', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  pembuka: 'Yang bertanda tangan di bawah ini memberikan perintah kerja lembur kepada karyawan yang namanya tercantum di bawah ini, dengan ketentuan sebagai berikut:',
  tglLembur: today(), lokasi: 'Gudang Distribusi Cakung, Jakarta Timur',
  alasan: 'Penyelesaian bongkar muat dan pengiriman pesanan akhir bulan yang harus diterima pelanggan sebelum batas waktu kontrak.',
  rows: [
    { nama: 'Andi Pratama', nik: 'KRY-2020-0112', jabatan: 'Kepala Regu Gudang', mulai: '17:00', selesai: '21:00', tugas: 'Mengoordinasikan bongkar muat dan pengecekan barang' },
    { nama: 'Rizky Maulana', nik: 'KRY-2022-0345', jabatan: 'Staf Gudang', mulai: '17:00', selesai: '21:00', tugas: 'Bongkar muat dan penataan barang di rak' },
    { nama: 'Dewi Anggraini', nik: 'KRY-2021-0290', jabatan: 'Admin Logistik', mulai: '17:00', selesai: '20:30', tugas: 'Input surat jalan dan dokumen pengiriman' },
    { nama: 'Agus Setiawan', nik: 'KRY-2019-0087', jabatan: 'Sopir Pengiriman', mulai: '22:00', selesai: '02:00', tugas: 'Pengiriman barang ke pelanggan area Bekasi' },
  ],
  ketentuan: 'Upah lembur dibayarkan sesuai peraturan perundang-undangan ketenagakerjaan dan Peraturan Perusahaan.\nKaryawan wajib mencatat kehadiran lembur (absen masuk dan pulang) pada sistem presensi.\nPerintah lembur hanya berlaku untuk tanggal dan jam yang tercantum di atas.\nSurat ini diserahkan ke Bagian HRD paling lambat 1 (satu) hari kerja setelah pelaksanaan lembur.',
  penutup: 'Demikian surat perintah lembur ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.',
  pakaiAtasan: true, pakaiHrd: true,
  ttdHeading: 'Yang memerintahkan,', ttdJabatan: 'Manajer Operasional Gudang', ttdNama: 'Budi Santoso', ttdId: '', ttd: '', stempel: '',
  hrdJabatan: 'Manajer HRD', hrdNama: 'Ratna Dewi Lestari', ttdHrd: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel', 'hrdJabatan', 'hrdNama', 'ttdHrd'] as const;

// ============================================================
// SECTION: Hitung jam lembur
// ============================================================
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
// Durasi menit; selesai <= mulai dianggap lewat tengah malam (22:00–02:00 = 240)
const jamMenit = (mulai: string, selesai: string) => (mulai && selesai ? (toMin(selesai) - toMin(mulai) + 1440) % 1440 : 0);
// "4 jam", "3,5 jam"
const fmtJam = (menit: number) => `${String(+(menit / 60).toFixed(2)).replace('.', ',')} jam`;
console.assert(
  jamMenit('22:00', '02:00') === 240 && jamMenit('17:00', '20:30') === 210 && jamMenit('', '02:00') === 0 &&
    fmtJam(240) === '4 jam' && fmtJam(210) === '3,5 jam',
  'jamMenit/fmtJam',
);

const hari = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' }) : '');

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>)
function NumList({ text, k }: { text: string; k: number }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

const HEAD = ['No', 'Nama', 'NIK', 'Jabatan', 'Mulai', 'Selesai', 'Total jam', 'Uraian tugas', 'Paraf'];
const WIDTH = ['5%', '15%', '12%', '13%', '8%', '8%', '8%', '21%', '10%'];

// Tabel karyawan lembur; kosong = 8 baris kosong untuk ditulis tangan
function LemburTable({ rows, kosong, k }: { rows: Lembur[]; kosong: boolean; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${4 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 20 * k };
  const list = kosong ? Array<null>(8).fill(null) : rows;
  const total = rows.reduce((s, r) => s + jamMenit(r.mulai, r.selesai), 0);
  const mid = { ...cell, textAlign: 'center' as const };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.85em', tableLayout: 'fixed' }}>
      <thead><tr>{HEAD.map((h, i) => <th key={h} style={{ ...mid, width: WIDTH[i], verticalAlign: 'middle' }}>{h}</th>)}</tr></thead>
      <tbody>
        {list.map((r, i) => (
          <tr key={i}>
            <td style={mid}>{i + 1}</td>
            <td style={cell}>{r?.nama}</td>
            <td style={cell}>{r?.nik}</td>
            <td style={cell}>{r?.jabatan}</td>
            <td style={mid}>{r?.mulai}</td>
            <td style={mid}>{r?.selesai}</td>
            <td style={mid}>{r && jamMenit(r.mulai, r.selesai) ? fmtJam(jamMenit(r.mulai, r.selesai)) : ''}</td>
            <td style={cell}>{r?.tugas}</td>
            <td style={cell} />
          </tr>
        ))}
        <tr>
          <td colSpan={6} style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>Total jam lembur seluruhnya</td>
          <td style={{ ...mid, fontWeight: 700 }}>{kosong ? '' : fmtJam(total)}</td>
          <td colSpan={2} style={cell} />
        </tr>
      </tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPerintahLembur() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdHrd: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdHrd = useBgRemoved(f.ttdHrd, bg.ttdHrd, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdHrd.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setRow = (i: number, p: Partial<Lembur>) => set('rows', f.rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdHrd.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-perintah-lembur-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: tanggal, lokasi, alasan & tabel → titik-titik/baris kosong; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const signers = ([
    f.pakaiHrd && { heading: 'Mengetahui,', role: f.hrdJabatan, name: f.hrdNama, ttd: img(ttdHrd.src), ttdOffset: getOffset(f.posisi, 'ttdHrd') },
    f.pakaiAtasan && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Hari/tanggal lembur', value: v(f.tglLembur ? `${hari(f.tglLembur)}, ${fmtTanggal(f.tglLembur)}` : '') },
          ...(f.lokasi.trim() || ks ? [{ label: 'Lokasi kerja', value: v(f.lokasi) }] : []),
          { label: 'Alasan/keperluan', value: v(f.alasan) },
        ]} />
        <LemburTable rows={f.rows} kosong={ks} k={kk} />
        {f.ketentuan.trim() && <P>Ketentuan:</P>}
        <NumList text={f.ketentuan} k={kk} />
        <P>{f.penutup}</P>
      </>
    ),
    signers,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiHrd ? [{ id: 'ttdHrd', label: `TTD ${f.hrdNama || 'HRD'}` }] : []),
        ...(f.pakaiAtasan ? [{ id: 'ttd', label: `TTD ${f.ttdNama || 'Atasan'}` }, { id: 'stempel', label: 'Stempel' }] : []),
      ]} active={geser} onActive={setGeser} value={f.posisi} onChange={(x) => set('posisi', x)} />
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
  const total = f.rows.reduce((s, r) => s + jamMenit(r.mulai, r.selesai), 0);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Perintah Lembur</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-perintah-lembur" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              <KontakFields value={f.kontak} onChange={(v) => set('kontak', v)} />
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/SPL/OPS/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (unit = kode bagian, bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Rincian Lembur">
              {text('pembuka', 'Kalimat pembuka', 3)}
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal lembur"><input type="date" className={inputCls} value={f.tglLembur} onChange={(e) => set('tglLembur', e.target.value)} /></Field>
                {text('lokasi', 'Lokasi kerja (opsional)')}
              </div>
              {text('alasan', 'Alasan / keperluan lembur', 2)}
            </FormSection>

            <FormSection title="Karyawan yang Lembur">
              {f.rows.map((r, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Karyawan {i + 1} — {fmtJam(jamMenit(r.mulai, r.selesai))}</span>
                    <button type="button" onClick={() => set('rows', f.rows.filter((_, j) => j !== i))} disabled={f.rows.length === 1}
                      aria-label={`Hapus karyawan ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <Field label="Nama"><AutoTextarea className={inputCls} value={r.nama} onChange={(e) => setRow(i, { nama: e.target.value })} /></Field>
                    <Field label="NIK"><AutoTextarea className={inputCls} value={r.nik} onChange={(e) => setRow(i, { nik: e.target.value })} /></Field>
                    <Field label="Jabatan"><AutoTextarea className={inputCls} value={r.jabatan} onChange={(e) => setRow(i, { jabatan: e.target.value })} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Jam mulai"><input type="time" className={inputCls} value={r.mulai} onChange={(e) => setRow(i, { mulai: e.target.value })} /></Field>
                    <Field label="Jam selesai"><input type="time" className={inputCls} value={r.selesai} onChange={(e) => setRow(i, { selesai: e.target.value })} /></Field>
                  </div>
                  <Field label="Uraian tugas"><AutoTextarea className={inputCls} value={r.tugas} onChange={(e) => setRow(i, { tugas: e.target.value })} /></Field>
                </div>
              ))}
              <button type="button" onClick={() => set('rows', [...f.rows, { nama: '', nik: '', jabatan: '', mulai: '17:00', selesai: '20:00', tugas: '' }])}
                className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah karyawan</button>
              <p className="text-sm text-gray-600">Total jam lembur seluruhnya: <b>{fmtJam(total)}</b> (jam selesai lebih kecil dari jam mulai dihitung lewat tengah malam).</p>
            </FormSection>

            <FormSection title="Ketentuan & Penutup">
              {text('ketentuan', 'Ketentuan (satu poin per baris)', 4)}
              {text('penutup', 'Kalimat penutup', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh keduanya atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiAtasan', 'Atasan yang memerintahkan'], ['pakaiHrd', 'Mengetahui, HRD']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiAtasan && <>
                <p className="text-sm font-bold text-gray-700">Atasan yang memerintahkan</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label={`Tanda tangan — ${f.ttdNama || 'Atasan'}`} value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiHrd && <>
                <p className="text-sm font-bold text-gray-700">Mengetahui, HRD</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('hrdJabatan', 'Jabatan')}{text('hrdNama', 'Nama')}</div>
                <ImageUpload label={`Tanda tangan — ${f.hrdNama || 'HRD'}`} value={f.ttdHrd} onChange={(x) => set('ttdHrd', x)} notify={notify} {...bgFor('ttdHrd', ttdHrd)} />
              </>}
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
