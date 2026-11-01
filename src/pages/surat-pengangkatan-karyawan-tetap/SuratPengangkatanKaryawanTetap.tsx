import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { Dots, ExportButton, Field, ImageUpload, PaperPicker, dataStyle, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutPicker, P, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { ClosingSigns, LampiranField, SIGN, lampiranOtomatis, usePagedLetter, type Unit } from '../surat-penawaran-kerja/paged';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';
import KontakFields from '../../shared/components/KontakFields';

// Surat Keputusan Pengangkatan Karyawan Tetap: SK direksi yang mengangkat karyawan kontrak (PKWT) /
// masa percobaan menjadi karyawan tetap (PKWTT), dengan menimbang/mengingat, diktum, gaji & hak-kewajiban.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts; isi panjang berlanjut ke halaman berikut.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  lampiranManual: boolean; lampiran: string; // Otomatis = jumlah lembar sesudah halaman 1
  menimbang: string; mengingat: string; pembuka: string;
  nama: string; nik: string; jabatan: string; divisi: string;
  statusSemula: string; periodeSemula: string; tmt: string;
  gaji: string; rincian: Rincian; hak: string; kewajiban: string; penutup: string;
  pakaiUtama: boolean; pakaiKaryawan: boolean; // tanda tangan yang tampil (bebas 1 atau 2)
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  ttdKaryawan: string; tembusan: string;
};

const STORAGE_KEY = 'surat-pengangkatan-karyawan-tetap:v1';
const POLA = '{n3}/SK-KT/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT KEPUTUSAN\nPENGANGKATAN KARYAWAN TETAP', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiranManual: false, lampiran: '',
  menimbang: 'Bahwa karyawan yang bersangkutan telah menyelesaikan masa kontrak kerja dengan hasil penilaian kinerja yang baik.\nBahwa perusahaan membutuhkan tenaga kerja tetap untuk menjamin kesinambungan kegiatan operasional.\nBahwa untuk itu perlu ditetapkan keputusan pengangkatan karyawan tetap.',
  mengingat: 'Undang-Undang Nomor 13 Tahun 2003 tentang Ketenagakerjaan beserta perubahannya.\nPeraturan Pemerintah Nomor 35 Tahun 2021 tentang PKWT, Alih Daya, Waktu Kerja dan Waktu Istirahat, dan PHK.\nPeraturan Perusahaan PT Cahaya Nusantara Abadi yang berlaku.',
  pembuka: 'Mengangkat karyawan dengan data di bawah ini sebagai Karyawan Tetap berdasarkan Perjanjian Kerja Waktu Tidak Tertentu (PKWTT):',
  nama: 'Siti Nurhaliza', nik: 'KRY-2024-0418', jabatan: 'Staf Administrasi Keuangan', divisi: 'Keuangan & Akuntansi',
  statusSemula: 'Karyawan Kontrak (PKWT)', periodeSemula: '1 November 2024 s.d. 31 Oktober 2026', tmt: today(),
  gaji: '6250000',
  rincian: contohRincian([['Tunjangan Jabatan', 750000], ['Tunjangan Transport', 500000], ['Tunjangan Makan', 600000]],
    [['BPJS Kesehatan (1%)', 62500], ['BPJS Ketenagakerjaan (JHT 2% + JP 1%)', 187500], ['PPh 21', 95000]]),
  hak: 'Menerima gaji pokok dan tunjangan sesuai struktur dan skala upah perusahaan.\nMendapatkan jaminan sosial BPJS Kesehatan dan BPJS Ketenagakerjaan.\nMemperoleh hak cuti tahunan, THR, dan fasilitas lain sesuai Peraturan Perusahaan.',
  kewajiban: 'Melaksanakan tugas dan tanggung jawab jabatan dengan penuh dedikasi.\nMematuhi Peraturan Perusahaan, tata tertib, dan kode etik yang berlaku.\nMenjaga kerahasiaan data dan nama baik perusahaan.',
  penutup: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan dalam keputusan ini akan diadakan perbaikan sebagaimana mestinya.',
  pakaiUtama: true, pakaiKaryawan: false,
  ttdHeading: 'Ditetapkan oleh,', ttdJabatan: 'Direktur Utama', ttdNama: 'Hendra Wijaya', ttdId: '', ttd: '', stempel: '',
  ttdKaryawan: '', tembusan: 'Manajer Divisi Keuangan & Akuntansi\nKaryawan yang bersangkutan\nArsip HRD',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
const linesOf = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// Daftar bernomor/berhuruf manual (preflight Tailwind menghapus penanda <ol>)
function NumList({ lines, k, alpha }: { lines: string[]; k: number; alpha?: boolean }) {
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{alpha ? `${String.fromCharCode(97 + i)}.` : `${i + 1}.`}</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Baris diktum SK: "Menimbang : isi" / "PERTAMA : isi"; kolom label lebar tetap agar unit terpisah (antarhalaman) tetap sejajar
function Diktum({ items, k }: { items: [string, ReactNode][]; k: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '6.6em max-content 1fr', columnGap: 6 * k, rowGap: 6 * k, margin: `0 0 ${6 * k}px` }}>
      {items.map(([label, isi]) => <div key={label} style={{ display: 'contents' }}><span style={{ fontWeight: 700 }}>{label}</span><span>:</span><div style={{ textAlign: 'justify' }}>{isi}</div></div>)}
    </div>
  );
}

// Baris lanjutan diktum (tanpa label): kolom tetap sejajar dengan diktum di atasnya, termasuk di halaman berikut
function DiktumLanjut({ k, children }: { k: number; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '6.6em max-content 1fr', columnGap: 6 * k }}>
      <span /><span style={{ visibility: 'hidden' }}>:</span><div>{children}</div>
    </div>
  );
}

// ============================================================
// SECTION: Rincian gaji (dipakai juga oleh menu Surat Promosi Jabatan)
// ============================================================
export type Komponen = { label: string; nilai: string };
export type Rincian = { tampil: boolean; tunjangan: Komponen[]; pakaiPotongan: boolean; potongan: Komponen[] };
// Data tersimpan versi lama (belum ada rincian): daftar kosong, rincian tampil
export const RINCIAN_LAMA: Rincian = { tampil: true, tunjangan: [], pakaiPotongan: false, potongan: [] };
const komp = (xs: [string, number][]) => xs.map(([label, n]) => ({ label, nilai: String(n) }));
export const contohRincian = (tunjangan: [string, number][], potongan: [string, number][]): Rincian =>
  ({ tampil: true, tunjangan: komp(tunjangan), pakaiPotongan: false, potongan: komp(potongan) });
export const bacaRincian = (saved: Partial<Rincian> | undefined): Rincian => ({ ...RINCIAN_LAMA, ...saved });

const jumlah = (xs: Komponen[]) => xs.reduce((a, x) => a + num(x.nilai), 0);
// Take Home Pay = gaji pokok + Σ tunjangan − Σ potongan (potongan hanya bila ditampilkan), tidak pernah negatif
export const hitungThp = (pokok: string, r: Rincian) => Math.max(0, num(pokok) + jumlah(r.tunjangan) - (r.pakaiPotongan ? jumlah(r.potongan) : 0));
console.assert(
  hitungThp('5000000', contohRincian([['A', 500000], ['B', 250000]], [['P', 100000]])) === 5750000 &&
    hitungThp('5000000', { ...contohRincian([['A', 500000]], [['P', 100000]]), pakaiPotongan: true }) === 5400000 &&
    hitungThp('100', { ...contohRincian([], [['P', 500]]), pakaiPotongan: true }) === 0 &&
    hitungThp('', RINCIAN_LAMA) === 0,
  'hitungThp',
);

// Isian Rupiah di form: tebal + miring + garis titik-titik, ribuan diberi titik saat mengetik (Rp 5.000.000)
export function RupiahInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center border-b-2 border-dotted border-gray-500 focus-within:border-blue-600">
      <span className="pl-1 text-sm font-bold italic text-gray-600">Rp</span>
      <input inputMode="numeric" aria-label={label} placeholder="0" className="w-full min-w-0 bg-transparent px-1 py-2 text-sm font-bold italic outline-none"
        style={{ border: 0, background: 'transparent' }} value={value ? rupiah(num(value)) : ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  );
}

// Daftar komponen (tambah / hapus / naik-turun)
function KomponenList({ name, items, onChange, contoh }: { name: string; items: Komponen[]; onChange: (v: Komponen[]) => void; contoh: string }) {
  const up = (i: number, p: Partial<Komponen>) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const btn = 'min-h-[40px] min-w-[40px] rounded-lg border text-sm disabled:opacity-30';
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-gray-700">{name}</p>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
          <input aria-label={`Nama ${name.toLowerCase()} ${i + 1}`} placeholder={contoh} className={inputCls} value={it.label} onChange={(e) => up(i, { label: e.target.value })} />
          <div className="order-last col-span-2 sm:order-none sm:col-span-1"><RupiahInput label={`Nilai ${name.toLowerCase()} ${i + 1}`} value={it.nilai} onChange={(v) => up(i, { nilai: v })} /></div>
          <div className="flex gap-1">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Naikkan ${name.toLowerCase()} ${i + 1}`} className={btn}>↑</button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Turunkan ${name.toLowerCase()} ${i + 1}`} className={btn}>↓</button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${name.toLowerCase()} ${i + 1}`} className={`${btn} text-red-600 border-red-200`}>✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: '', nilai: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {name.toLowerCase()}</button>
    </div>
  );
}

// Kartu form "Rincian Gaji & Tunjangan"; children = isian gaji pokok milik tiap menu
export function RincianGajiCard({ pokok, r, onChange, children }: { pokok: string; r: Rincian; onChange: (r: Rincian) => void; children: ReactNode }) {
  const thp = hitungThp(pokok, r);
  return (
    <FormSection title="Rincian Gaji & Tunjangan">
      <Switch checked={r.tampil} onChange={(tampil) => onChange({ ...r, tampil })} label="Tampilkan rincian gaji" hint="Matikan agar surat hanya menyebut gaji pokok." />
      {children}
      {r.tampil && <>
        <KomponenList name="Tunjangan" contoh="Tunjangan Jabatan / Transport / Makan / Komunikasi" items={r.tunjangan} onChange={(tunjangan) => onChange({ ...r, tunjangan })} />
        <Switch checked={r.pakaiPotongan} onChange={(pakaiPotongan) => onChange({ ...r, pakaiPotongan })} label="Tampilkan potongan" hint="BPJS Kesehatan, BPJS Ketenagakerjaan, PPh 21, dll." />
        {r.pakaiPotongan && <KomponenList name="Potongan" contoh="BPJS Kesehatan / BPJS Ketenagakerjaan / PPh 21" items={r.potongan} onChange={(potongan) => onChange({ ...r, potongan })} />}
        <div className="rounded-lg bg-indigo-50 p-3 text-sm">
          <p>Take Home Pay (gaji pokok + tunjangan{r.pakaiPotongan ? ' − potongan' : ''}), otomatis: <b><i>Rp {rupiah(thp)}</i></b></p>
          <p className="text-gray-600 italic">{terbilangRupiah(thp)}</p>
        </div>
      </>}
    </FormSection>
  );
}

// Baris rincian di surat: label kiri, nilai kanan (tebal miring bergaris titik); kosongan = titik-titik, label tetap
function BarisGaji({ label, n, ks, minus, total }: { label: string; n: number; ks: boolean; minus?: boolean; total?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5em', ...(total && { fontWeight: 700, background: '#ececec', borderTop: '1px solid #000', padding: '0.1em 0.3em' }) }}>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      <span style={{ flex: '0 0 42%', textAlign: 'right' }}>
        {ks ? <Dots w="100%" /> : <span style={{ ...dataStyle, fontWeight: 700, padding: '0 4px 0.22em' }}>{minus ? '− ' : ''}Rp {rupiah(n)}</span>}
      </span>
    </div>
  );
}

// Isi rincian untuk surat: komponen (gaji pokok, tunjangan, potongan), baris THP & terbilang terpisah agar bisa ditata per menu
export function rincianGajiDoc(pokok: string, r: Rincian, ks: boolean) {
  const lbl = (x: Komponen, d: string) => x.label.trim() || (ks ? TITIK : d);
  const thp = hitungThp(pokok, r);
  return {
    items: [
      <BarisGaji key="p" label="Gaji pokok" n={num(pokok)} ks={ks} />,
      ...r.tunjangan.map((x, i) => <BarisGaji key={`t${i}`} label={lbl(x, 'Tunjangan')} n={num(x.nilai)} ks={ks} />),
      ...(r.pakaiPotongan ? r.potongan.map((x, i) => <BarisGaji key={`p${i}`} label={`Potongan ${lbl(x, '')}`.trim()} n={num(x.nilai)} ks={ks} minus />) : []),
    ],
    total: <BarisGaji label="Take Home Pay (THP) per bulan" n={thp} ks={ks} total />,
    terbilang: <div style={{ fontStyle: 'italic' }}>Terbilang: {ks ? <Dots w="70%" /> : <span style={{ ...dataStyle, fontWeight: 700 }}>({terbilangRupiah(thp)})</span>}</div>,
  };
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPengangkatanKaryawanTetap() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved, nomor: orRandomNo(saved.nomor, POLA), rincian: bacaRincian(saved.rincian) } : d;
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
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = f.skala / 100; // huruf normal (tidak dikecilkan otomatis); isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `sk-karyawan-tetap-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // Template kosongan: data karyawan, status, tanggal & gaji → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const gaji = num(f.gaji);
  const rincian = f.rincian;
  const rg = rincianGajiDoc(f.gaji, rincian, ks);
  const rgUnits = rincian.tampil ? [...rg.items, rg.total, rg.terbilang] : [];
  const signers = ([
    f.pakaiKaryawan && { heading: 'Yang bersangkutan,', role: 'Karyawan', name: ks ? '' : f.nama, ttd: img(ttdKaryawan.src), ttdOffset: getOffset(f.posisi, 'ttdKaryawan') },
    f.pakaiUtama && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);

  const menimbang = linesOf(f.menimbang);
  const mengingat = linesOf(f.mengingat);
  const hak = linesOf(f.hak);
  const kewajiban = linesOf(f.kewajiban);
  // Bagian diktum yang tampil; diberi nomor berurutan PERTAMA, KEDUA, … sesuai yang tampil
  const gajiDiktum = rincian.tampil ? <P style={{ margin: 0 }}>Kepada karyawan tersebut diberikan penghasilan per bulan dengan rincian sebagai berikut:</P>
    : (gaji > 0 || ks) && <P style={{ margin: 0 }}>Kepada karyawan tersebut diberikan gaji pokok sebesar <b>Rp {ks ? TITIK : `${rupiah(gaji)},-`}</b> ({ks ? TITIK : terbilangRupiah(gaji)}) per bulan, ditambah tunjangan sesuai ketentuan perusahaan.</P>;
  const diktum: ReactNode[] = [
    <>
      <P>{f.pembuka}</P>
      <InfoRows rows={[
        { label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) },
        { label: 'Jabatan', value: v(f.jabatan) }, { label: 'Divisi', value: v(f.divisi) },
        { label: 'Status semula', value: v([f.statusSemula, f.periodeSemula && `periode ${f.periodeSemula}`].filter(Boolean).join(', ')) },
        { label: 'Status baru', value: 'Karyawan Tetap (PKWTT)' },
        { label: 'Terhitung mulai', value: v(fmtTanggal(f.tmt)) },
      ]} />
    </>,
    gajiDiktum,
    (hak.length > 0 || kewajiban.length > 0) && <>
      {hak.length > 0 && <><P style={{ margin: 0 }}>Hak karyawan:</P><NumList lines={hak} k={kk} alpha /></>}
      {kewajiban.length > 0 && <><P style={{ margin: `${4 * kk}px 0 0` }}>Kewajiban karyawan:</P><NumList lines={kewajiban} k={kk} alpha /></>}
    </>,
    <P style={{ margin: 0 }}>{f.penutup}</P>,
  ].filter(Boolean);
  const URUT = ['PERTAMA', 'KEDUA', 'KETIGA', 'KEEMPAT'];
  const diktumUrut = diktum.map((isi, i) => [URUT[i], isi] as [string, ReactNode]);

  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  // Unit isi (halaman dipotong di batas unit); diktum terakhir + tanda tangan selalu bersama di halaman terakhir
  const units: Unit[] = [
    ...(menimbang.length ? [{ g: 0, el: <Diktum k={kk} items={[['Menimbang', <NumList lines={menimbang} k={kk} />]]} /> }] : []),
    ...(mengingat.length ? [{ g: 1, el: <Diktum k={kk} items={[['Mengingat', <NumList lines={mengingat} k={kk} />]]} /> }] : []),
    { g: 2, el: <>
      <P style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.15em', textIndent: 0, marginTop: 4 * kk }}>MEMUTUSKAN</P>
      <P style={{ textIndent: 0 }}><b>Menetapkan</b> : Keputusan Direksi tentang Pengangkatan Karyawan Tetap.</P>
    </> },
    // Diktum gaji: kalimat lalu satu baris rincian per unit (boleh berlanjut ke halaman berikut)
    ...diktumUrut.flatMap((d, i) => {
      const g = i === diktumUrut.length - 1 ? SIGN : 3 + i;
      if (diktum[i] !== gajiDiktum || !rgUnits.length) return [{ g, el: <Diktum k={kk} items={[d]} /> }];
      return [
        { g, el: <Diktum k={kk} items={[d]} /> },
        ...rgUnits.map((el, j) => ({ g, el: <DiktumLanjut k={kk}><div style={{ margin: `${j ? 2 * kk : -4 * kk}px 0 ${j === rgUnits.length - 1 ? 6 * kk : 0}px` }}>{el}</div></DiktumLanjut> })),
      ];
    }),
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
    meta: lampiran ? [{ label: 'Lampiran', value: lampiran }] : undefined,
    placeDate: '',
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
        ...(f.pakaiKaryawan ? [{ id: 'ttdKaryawan', label: `TTD ${f.nama || 'Karyawan'}` }] : []),
        ...(f.pakaiUtama ? [{ id: 'ttd', label: `TTD ${f.ttdNama || 'Direktur'}` }, { id: 'stempel', label: 'Stempel' }] : []),
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
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pengangkatan Karyawan Tetap</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pengangkatan-karyawan-tetap" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              <KontakFields value={f.kontak} onChange={(v) => set('kontak', v)} />
            </FormSection>

            <FormSection title="Data Surat Keputusan">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/SK-KT/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Ditetapkan di (kota)')}
                <Field label="Tanggal ditetapkan"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <LampiranField manual={f.lampiranManual} value={f.lampiran} auto={lampiranAuto} onManual={(x) => set('lampiranManual', x)} onValue={(x) => set('lampiran', x)} />
              {text('menimbang', 'Menimbang (opsional, satu poin per baris)', 3)}
              {text('mengingat', 'Mengingat (opsional, satu poin per baris)', 3)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat diktum pertama', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi')}
                {text('statusSemula', 'Status semula (PKWT / masa percobaan)')}
                {text('periodeSemula', 'Periode status semula (opsional)')}
              </div>
              <Field label="Karyawan tetap terhitung mulai"><input type="date" className={inputCls} value={f.tmt} onChange={(e) => set('tmt', e.target.value)} /></Field>
            </FormSection>

            <RincianGajiCard pokok={f.gaji} r={rincian} onChange={(x) => set('rincian', x)}>
              <Field label="Gaji pokok per bulan (opsional)"><RupiahInput label="Gaji pokok per bulan" value={f.gaji} onChange={(x) => set('gaji', x)} /></Field>
              {!rincian.tampil && gaji > 0 && <p className="text-sm text-gray-600">{terbilangRupiah(gaji)}</p>}
            </RincianGajiCard>

            <FormSection title="Hak, Kewajiban & Penutup">
              {text('hak', 'Hak karyawan (satu poin per baris)', 3)}
              {text('kewajiban', 'Kewajiban karyawan (satu poin per baris)', 3)}
              {text('penutup', 'Kalimat penutup keputusan', 3)}
              {text('tembusan', 'Tembusan (opsional)', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh keduanya atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiUtama', 'Direktur'], ['pakaiKaryawan', 'Yang bersangkutan (karyawan)']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiUtama && <>
                <p className="text-sm font-bold text-gray-700">Penanda tangan utama</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK / NIP (opsional)')}
                </div>
                <ImageUpload label={`Tanda tangan — ${f.ttdNama || 'Direktur'}`} value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiKaryawan && (
                <ImageUpload label={`Tanda tangan — ${f.nama || 'Karyawan'} (nama mengikuti data karyawan)`} value={f.ttdKaryawan} onChange={(x) => set('ttdKaryawan', x)} notify={notify} {...bgFor('ttdKaryawan', ttdKaryawan)} />
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
