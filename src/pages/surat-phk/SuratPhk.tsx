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
import { TextSizeSlider } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutPicker, P, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { ClosingSigns, LampiranField, SIGN, lampiranOtomatis, usePagedLetter, type Unit } from '../surat-penawaran-kerja/paged';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Pemutusan Hubungan Kerja (PHK): pemberitahuan resmi berakhirnya hubungan kerja, dengan alasan
// siap pakai (tetap bisa diedit), tanggal efektif, rincian hak (total otomatis + terbilang), serah terima aset.
// Nada formal, netral & manusiawi. Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts; isi panjang berlanjut ke halaman berikut.

// ============================================================
// SECTION: Data
// ============================================================
type Hak = { uraian: string; jumlah: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; perihal: string; kepada: string;
  lampiranManual: boolean; lampiran: string; // Otomatis = jumlah lembar sesudah halaman 1
  pembuka: string; nama: string; nik: string; jabatan: string; divisi: string; mulaiKerja: string;
  alasan: string; efektif: string; hak: Hak[]; serahTerima: string; terimaKasih: string; penutup: string;
  pakaiUtama: boolean; pakaiKaryawan: boolean; // tanda tangan yang tampil (bebas 1 atau 2)
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdKaryawan: string; tembusan: string;
};

// Alasan PHK siap pakai: mengisi kalimat dasar PHK, tetap bisa diedit
const ALASAN: [string, string][] = [
  ['Efisiensi perusahaan', 'Sehubungan dengan kondisi usaha yang mengharuskan perusahaan melakukan efisiensi dan penataan ulang organisasi, serta setelah melalui perundingan bipartit, dengan berat hati perusahaan memutuskan untuk mengakhiri hubungan kerja dengan Saudara/i.'],
  ['Pelanggaran berat setelah SP-3', 'Setelah sebelumnya diberikan Surat Peringatan Pertama, Kedua, dan Ketiga yang masih berlaku, Saudara/i kembali melakukan pelanggaran terhadap Peraturan Perusahaan. Berdasarkan ketentuan yang berlaku, perusahaan memutuskan untuk mengakhiri hubungan kerja dengan Saudara/i.'],
  ['Habis masa kontrak', 'Sehubungan dengan berakhirnya jangka waktu Perjanjian Kerja Waktu Tertentu (PKWT) Saudara/i dan tidak dilakukannya perpanjangan, maka hubungan kerja antara perusahaan dan Saudara/i berakhir sesuai perjanjian kerja.'],
  ['Kesepakatan bersama', 'Berdasarkan hasil perundingan dan kesepakatan bersama antara perusahaan dan Saudara/i sebagaimana dituangkan dalam Perjanjian Bersama, kedua belah pihak sepakat untuk mengakhiri hubungan kerja secara baik-baik.'],
  ['Pensiun', 'Sehubungan dengan telah tercapainya batas usia pensiun sebagaimana diatur dalam Peraturan Perusahaan, maka hubungan kerja Saudara/i dengan perusahaan berakhir karena memasuki masa pensiun.'],
];

const STORAGE_KEY = 'surat-phk:v1';
const POLA = '{n3}/PHK/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT PEMUTUSAN HUBUNGAN KERJA', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  perihal: 'Pemutusan Hubungan Kerja', kepada: 'Sdr. Andi Pratama\ndi Tempat',
  lampiranManual: false, lampiran: '',
  pembuka: 'Dengan hormat,\nMelalui surat ini, manajemen menyampaikan keputusan mengenai hubungan kerja karyawan berikut:',
  nama: 'Andi Pratama', nik: 'KRY-2018-0112', jabatan: 'Staf Gudang', divisi: 'Operasional', mulaiKerja: '2 Juli 2018',
  alasan: ALASAN[0][1], efektif: today(),
  hak: [
    { uraian: 'Uang pesangon', jumlah: '36000000' },
    { uraian: 'Uang penghargaan masa kerja', jumlah: '12000000' },
    { uraian: 'Uang penggantian hak (sisa cuti tahunan)', jumlah: '1800000' },
    { uraian: 'Sisa gaji bulan berjalan', jumlah: '4500000' },
  ],
  serahTerima: 'Menyerahkan seluruh pekerjaan dan dokumen yang sedang ditangani kepada atasan langsung.\nMengembalikan aset perusahaan (kartu identitas, seragam, kunci, dan perangkat kerja) kepada Bagian HRD.\nMenyelesaikan kewajiban administrasi atau pinjaman kepada perusahaan, bila ada.',
  terimaKasih: 'Perusahaan menyampaikan terima kasih dan penghargaan yang setinggi-tingginya atas dedikasi dan kontribusi Saudara/i selama bekerja. Semoga Saudara/i senantiasa diberikan kesehatan dan kesuksesan di masa mendatang.',
  penutup: 'Demikian surat ini kami sampaikan untuk dapat dimaklumi. Hak-hak di atas dibayarkan selambat-lambatnya pada tanggal efektif setelah serah terima diselesaikan.',
  pakaiUtama: true, pakaiKaryawan: true,
  ttdHeading: 'Hormat kami,', ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
  ttdKaryawan: '', tembusan: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>); blank = baris titik-titik
function NumList({ text, k, blank }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill(TITIK + TITIK) : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${8 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Uraian | Jumlah (Rp) + total; kosong = 5 baris kosong
function HakTable({ rows, kosong, k }: { rows: Hak[]; kosong: boolean; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 18 * k };
  const list = kosong ? Array<Hak>(5).fill({ uraian: '', jumlah: '' }) : rows.filter((r) => r.uraian.trim() || num(r.jumlah));
  const total = rows.reduce((s, r) => s + num(r.jumlah), 0);
  const right = { ...cell, textAlign: 'right' as const, width: '32%' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${4 * k}px`, fontSize: '0.95em' }}>
      <thead><tr><th style={{ ...cell, width: '8%' }}>No</th><th style={{ ...cell, textAlign: 'left' }}>Uraian</th><th style={{ ...right, textAlign: 'center' }}>Jumlah (Rp)</th></tr></thead>
      <tbody>
        {list.map((r, i) => (
          <tr key={i}><td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td><td style={cell}>{r.uraian}</td><td style={right}>{r.jumlah ? rupiah(num(r.jumlah)) : ''}</td></tr>
        ))}
        <tr><td colSpan={2} style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>Total</td><td style={{ ...right, fontWeight: 700 }}>{kosong ? '' : rupiah(total)}</td></tr>
      </tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPhk() {
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
  const setHak = (i: number, p: Partial<Hak>) => set('hak', f.hak.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = f.skala / 100; // huruf normal (tidak dikecilkan otomatis); isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `surat-phk-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // Template kosongan: data karyawan, tanggal, rincian hak → titik-titik/baris kosong; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const total = f.hak.reduce((s, r) => s + num(r.jumlah), 0);
  const signers = ([
    f.pakaiKaryawan && { heading: 'Yang menerima,', role: 'Karyawan', name: ks ? '' : f.nama, ttd: img(ttdKaryawan.src), ttdOffset: getOffset(f.posisi, 'ttdKaryawan') },
    f.pakaiUtama && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  // Unit isi (halaman dipotong di batas unit); penutup + tanda tangan selalu bersama di halaman terakhir
  const units: Unit[] = [
    { g: 0, el: <P>{f.pembuka}</P> },
    { g: 1, el: <InfoRows rows={[
      { label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) },
      { label: 'Jabatan / divisi', value: v([f.jabatan, f.divisi].filter(Boolean).join(' / ')) },
      ...(f.mulaiKerja.trim() || ks ? [{ label: 'Mulai bekerja', value: v(f.mulaiKerja) }] : []),
    ]} /> },
    { g: 2, el: <P>{f.alasan}</P> },
    { g: 3, el: <P>Pemutusan hubungan kerja ini berlaku efektif sejak tanggal <b>{ks ? TITIK : fmtTanggal(f.efektif)}</b>. Sesuai ketentuan yang berlaku, Saudara/i menerima hak-hak sebagai berikut:</P> },
    { g: 3, el: <><HakTable rows={f.hak} kosong={ks} k={kk} /><P><i>Terbilang: {ks ? TITIK + TITIK : terbilangRupiah(total)}</i></P></> },
    ...(f.serahTerima.trim() || ks ? [{ g: 4, el: <>
      <P style={{ marginBottom: 2 * kk }}>Sebelum tanggal efektif, Saudara/i diminta untuk:</P>
      <NumList text={f.serahTerima} k={kk} blank={ks && !f.serahTerima.trim() ? 3 : undefined} />
    </> }] : []),
    { g: 5, el: <P>{f.terimaKasih}</P> },
    { g: SIGN, el: <P>{f.penutup}</P> },
    { g: SIGN, el: <ClosingSigns k={kk} placeDate={[f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', ')} signers={signers}
      footer={f.tembusan ? <><div style={{ fontWeight: 700 }}>Tembusan:</div><div style={{ whiteSpace: 'pre-line' }}>{f.tembusan}</div></> : undefined} /> },
  ];
  const { count, render } = usePagedLetter(units, [f, logo.src, ttd.src, stempel.src, ttdKaryawan.src], letterRef, { gaya: f.gaya, pg, kk, title: f.judul, nomor });
  const lampiranAuto = lampiranOtomatis(count);
  const lampiran = f.lampiranManual ? f.lampiran.trim() : lampiranAuto;
  const pages = render({
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor,
    meta: [{ label: 'Lampiran', value: lampiran }, { label: 'Perihal', value: f.perihal.trim() }].filter((r) => r.value),
    placeDate: '',
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...(ks ? [`Sdr. ${TITIK}`, 'di Tempat'] : f.kepada.split('\n'))] : undefined,
    signers: [],
  });

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <p className="text-xs text-gray-500">Dokumen {count} halaman; isi yang tidak muat otomatis berlanjut ke halaman berikutnya.</p>
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiKaryawan ? [{ id: 'ttdKaryawan', label: 'TTD Karyawan' }] : []),
        ...(f.pakaiUtama ? [{ id: 'ttd', label: 'TTD HRD/Direktur' }, { id: 'stempel', label: 'Stempel' }] : []),
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pemutusan Hubungan Kerja (PHK)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-phk" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/PHK/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <LampiranField manual={f.lampiranManual} value={f.lampiran} auto={lampiranAuto} onManual={(x) => set('lampiranManual', x)} onValue={(x) => set('lampiran', x)} />
              {text('perihal', 'Perihal (opsional)')}
              {text('kepada', 'Kepada Yth. (opsional)', 2)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat pembuka', 3)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi')}
                {text('mulaiKerja', 'Mulai bekerja (opsional)')}
              </div>
            </FormSection>

            <FormSection title="Dasar & Tanggal Efektif PHK">
              <p className="text-sm text-gray-700">Pilih alasan siap pakai (kalimat tetap bisa diedit):</p>
              <div className="flex flex-wrap gap-2">
                {ALASAN.map(([label, kalimat]) => (
                  <button key={label} type="button" onClick={() => set('alasan', kalimat)} aria-pressed={f.alasan === kalimat}
                    className={`px-3 min-h-[40px] rounded-lg border text-sm font-medium ${f.alasan === kalimat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{label}</button>
                ))}
              </div>
              {text('alasan', 'Dasar / alasan PHK', 4)}
              <Field label="Tanggal efektif"><input type="date" className={inputCls} value={f.efektif} onChange={(e) => set('efektif', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Rincian Hak yang Diterima">
              {f.hak.map((r, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Uraian hak ${i + 1}`} placeholder="Uraian" className={inputCls} value={r.uraian} onChange={(e) => setHak(i, { uraian: e.target.value })} />
                  <input aria-label={`Jumlah rupiah ${r.uraian || `baris ${i + 1}`}`} inputMode="numeric" placeholder="Rp" className={inputCls} value={r.jumlah} onChange={(e) => setHak(i, { jumlah: e.target.value.replace(/\D/g, '') })} />
                  <button type="button" onClick={() => set('hak', f.hak.filter((_, j) => j !== i))} aria-label={`Hapus baris ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('hak', [...f.hak, { uraian: '', jumlah: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah baris</button>
              <p className="text-sm text-gray-600">Total: <b>Rp {rupiah(total)}</b> — {terbilangRupiah(total)}</p>
            </FormSection>

            <FormSection title="Serah Terima & Penutup">
              {text('serahTerima', 'Kewajiban serah terima & pengembalian aset (satu per baris)', 3)}
              {text('terimaKasih', 'Ucapan terima kasih', 3)}
              {text('penutup', 'Kalimat penutup', 2)}
              {text('tembusan', 'Tembusan (opsional)', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh keduanya atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiUtama', 'HRD/Direktur'], ['pakaiKaryawan', 'Yang menerima (karyawan)']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiUtama && <>
                <p className="text-sm font-bold text-gray-700">Penanda tangan utama</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan (HRD/Direktur)')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK / NIP (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiKaryawan && (
                <ImageUpload label="Tanda tangan karyawan (nama mengikuti data karyawan)" value={f.ttdKaryawan} onChange={(x) => set('ttdKaryawan', x)} notify={notify} {...bgFor('ttdKaryawan', ttdKaryawan)} />
              )}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max flex flex-col gap-6">
              {pages}
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
