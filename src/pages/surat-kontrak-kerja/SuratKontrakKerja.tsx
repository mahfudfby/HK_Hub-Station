import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { TextSizeSlider } from '../../shared/components/TextScale';
import { Dots, ExportButton, Field, ImageUpload, LETTER_FONT, PaperPicker, dataStyle, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, SignBlock, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { usePagesExport } from './exportPages';
import { usePagination } from './usePagination';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import FormSection, { NarrativeField } from '../../shared/components/FormSection';
import { LampiranField, lampiranTeks } from './Lampiran';

// Surat Kontrak Kerja (PKWT): perjanjian kerja waktu tertentu dengan pasal-pasal yang bisa diedit,
// termasuk daftar tugas & tanggung jawab (preset per posisi). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
// Pasal: judul + isi (satu ayat per baris). `tugas` = daftar tugas disisipkan setelah isi.
// `gaji` = rincian upah (Kesepakatan Gaji & Tunjangan) disisipkan setelah ayat pertama.
type Pasal = { judul: string; isi: string; tugas?: boolean; gaji?: boolean };
// Komponen upah: tunjangan tetap = label + nilai; tidak tetap = label + nilai dan/atau keterangan.
type Item = { label: string; nilai: string; ket: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; lampiranAuto: boolean; lampiran: string;
  p1Nama: string; p1Jabatan: string;
  nama: string; nik: string; ttl: string; alamatK: string;
  jabatan: string; penempatan: string; mulai: string; selesai: string;
  hariKerja: string; jamKerja: string; gaji: string; tunjTetap: Item[]; tunjTidak: Item[]; tglGaji: string;
  tugas: string; pasal: Pasal[];
  ttd: string; stempel: string; saksi: string[];
};

const STORAGE_KEY = 'surat-kontrak-kerja:v1';
const POLA = '{n3}/PKWT/HRD/{rom}/{yyyy}';
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Preset posisi: mengisi jabatan & daftar tugas (tetap bisa diedit)
const PRESET: Record<string, string> = {
  Admin: 'Mengelola surat-menyurat, arsip, dan dokumen administrasi perusahaan.\nMenginput dan memperbarui data transaksi ke sistem secara akurat dan tepat waktu.\nMenyusun laporan administrasi harian, mingguan, dan bulanan.\nMengelola persediaan alat tulis kantor dan kebutuhan operasional kantor.\nMembantu koordinasi jadwal rapat dan keperluan administrasi antardivisi.',
  'Staf Gudang': 'Menerima, memeriksa, dan mencatat barang masuk sesuai dokumen pengiriman.\nMenyimpan dan menata barang di gudang sesuai prosedur dan tata letak yang ditetapkan.\nMenyiapkan dan memeriksa barang keluar sesuai surat jalan.\nMelakukan stok opname secara berkala dan melaporkan selisih persediaan.\nMenjaga kebersihan, keamanan, dan keselamatan kerja di area gudang.',
  Sales: 'Mencapai target penjualan yang ditetapkan perusahaan setiap bulan.\nMencari dan mengembangkan pelanggan baru serta menjaga hubungan baik dengan pelanggan lama.\nMelakukan kunjungan, presentasi, dan negosiasi penawaran kepada calon pelanggan.\nMembuat laporan kunjungan dan penjualan secara berkala kepada atasan.\nMemantau penagihan piutang pelanggan yang menjadi tanggung jawabnya.',
  Kasir: 'Melayani transaksi pembayaran pelanggan dengan cepat, ramah, dan teliti.\nMengelola uang kas, menghitung, dan mencocokkan saldo pada awal dan akhir sif.\nMembuat laporan penjualan harian dan menyetorkan uang hasil penjualan sesuai prosedur.\nMenjaga kerapian area kasir dan kelengkapan perlengkapan transaksi.\nMelaporkan selisih kas atau kendala transaksi kepada atasan.',
};

const PASAL_DEFAULT: Pasal[] = [
  { judul: 'Jabatan dan Penempatan', isi: 'PIHAK PERTAMA mempekerjakan PIHAK KEDUA sebagai {jabatan} dengan penempatan di {penempatan}.\nPIHAK PERTAMA berhak memindahkan penempatan PIHAK KEDUA sesuai kebutuhan perusahaan dengan pemberitahuan terlebih dahulu.' },
  { judul: 'Jangka Waktu Perjanjian', isi: 'Perjanjian kerja ini berlaku selama {lama}, terhitung sejak tanggal {mulai} sampai dengan tanggal {selesai}.\nPerjanjian ini dapat diperpanjang atau diperbarui atas kesepakatan kedua belah pihak sesuai ketentuan peraturan perundang-undangan.' },
  { judul: 'Waktu Kerja', isi: 'Hari kerja PIHAK KEDUA adalah {hariKerja} dengan jam kerja {jamKerja}.\nPekerjaan di luar jam kerja atas perintah PIHAK PERTAMA diperhitungkan sebagai lembur sesuai ketentuan yang berlaku.' },
  { judul: 'Tugas dan Tanggung Jawab', isi: 'PIHAK KEDUA wajib melaksanakan tugas dan tanggung jawab sebagai berikut:', tugas: true },
  { judul: 'Upah dan Tunjangan', gaji: true, isi: 'PIHAK PERTAMA memberikan upah kepada PIHAK KEDUA dengan rincian sebagai berikut:\nUpah dibayarkan setiap tanggal {tglGaji} melalui transfer ke rekening PIHAK KEDUA, setelah dipotong pajak dan iuran BPJS sesuai ketentuan.\nTunjangan tidak tetap diberikan sesuai kehadiran, kinerja, atau ketentuan yang berlaku dan tidak termasuk komponen upah tetap.' },
  { judul: 'Hak Cuti', isi: 'PIHAK KEDUA berhak atas cuti tahunan dan cuti lainnya sesuai peraturan perundang-undangan dan peraturan perusahaan.\nPengajuan cuti disampaikan secara tertulis paling lambat 7 (tujuh) hari sebelumnya dan wajib mendapat persetujuan atasan.' },
  { judul: 'Kerahasiaan', isi: 'PIHAK KEDUA wajib menjaga kerahasiaan seluruh data, dokumen, dan informasi perusahaan, baik selama maupun setelah berakhirnya perjanjian ini.\nPelanggaran atas ketentuan ini dapat dikenai sanksi sesuai peraturan perusahaan dan hukum yang berlaku.' },
  { judul: 'Pemutusan Perjanjian', isi: 'Perjanjian ini berakhir dengan sendirinya apabila jangka waktunya telah selesai.\nApabila salah satu pihak mengakhiri perjanjian sebelum jangka waktu berakhir, pihak tersebut wajib memberitahukan secara tertulis paling lambat 30 (tiga puluh) hari sebelumnya dan memenuhi kewajiban sesuai peraturan perundang-undangan.\nPIHAK PERTAMA dapat memutus perjanjian ini apabila PIHAK KEDUA melakukan pelanggaran berat terhadap peraturan perusahaan.' },
  { judul: 'Penyelesaian Perselisihan', isi: 'Perselisihan yang timbul dari perjanjian ini diselesaikan secara musyawarah untuk mufakat.\nApabila musyawarah tidak tercapai, kedua belah pihak sepakat menyelesaikannya melalui mekanisme penyelesaian perselisihan hubungan industrial sesuai peraturan perundang-undangan.' },
  { judul: 'Penutup', isi: 'Hal-hal yang belum diatur dalam perjanjian ini mengacu pada peraturan perusahaan dan peraturan perundang-undangan yang berlaku.\nPerjanjian ini dibuat rangkap 2 (dua), masing-masing bermeterai cukup dan mempunyai kekuatan hukum yang sama, serta ditandatangani kedua belah pihak dalam keadaan sadar tanpa paksaan dari pihak mana pun.' },
];

// Pasal upah versi lama ({gaji}/{tunjangan} satu angka): bila belum diubah, data tersimpan diganti ke pasal bawaan baru (tabel rincian)
const OLD_UPAH = 'PIHAK PERTAMA memberikan gaji pokok kepada PIHAK KEDUA sebesar {gaji} per bulan.\nSelain gaji pokok, PIHAK KEDUA menerima tunjangan sebesar {tunjangan} per bulan.\nUpah dibayarkan setiap tanggal {tglGaji} melalui transfer ke rekening PIHAK KEDUA, setelah dipotong pajak dan iuran BPJS sesuai ketentuan.';
const migrasiPasal = (ps: Pasal[]) => ps.map((p) => (p.isi === OLD_UPAH ? PASAL_DEFAULT.find((d) => d.gaji)! : p));

const plusMonths =(n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  d.setDate(d.getDate() - 1);
  return iso(d);
};

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • hrd@sinarmaju.co.id • www.sinarmaju.co.id',
  judul: 'PERJANJIAN KERJA WAKTU TERTENTU', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: iso(new Date()), lampiranAuto: true, lampiran: '',
  p1Nama: 'Hendra Wijaya', p1Jabatan: 'Direktur',
  nama: 'Dewi Lestari', nik: '3171045708980002', ttl: 'Bogor, 17 Agustus 1998',
  alamatK: 'Jl. Kenanga No. 12, RT 004/RW 007, Kel. Cempaka Putih, Jakarta Pusat',
  jabatan: 'Staf Administrasi', penempatan: 'Kantor Pusat Jakarta', mulai: iso(new Date()), selesai: plusMonths(12),
  hariKerja: 'Senin sampai dengan Jumat', jamKerja: 'pukul 08.00–17.00 WIB (istirahat 1 jam)',
  gaji: '5200000', tglGaji: '25',
  tunjTetap: [{ label: 'Tunjangan jabatan', nilai: '300000', ket: '' }, { label: 'Tunjangan transportasi tetap', nilai: '200000', ket: '' }],
  tunjTidak: [
    { label: 'Uang makan', nilai: '25000', ket: 'per hari hadir' },
    { label: 'Insentif kinerja', nilai: '', ket: 'sesuai pencapaian target' },
    { label: 'Uang lembur', nilai: '', ket: 'sesuai peraturan perundang-undangan' },
  ],
  tugas: PRESET.Admin, pasal: PASAL_DEFAULT,
  ttd: '', stempel: '', saksi: [],
});

// Data User: identitas kop, penanda tangan perusahaan & gambar (bukan isi perjanjian)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'p1Nama', 'p1Jabatan', 'ttd', 'stempel'] as const;

// Lama kontrak: "12 bulan", "6 bulan 15 hari" (tanggal selesai ikut dihitung)
const lamaKontrak = (a: string, b: string) => {
  const s = new Date(`${a}T00:00:00Z`);
  const e = new Date(`${b}T00:00:00Z`);
  if (Number.isNaN(+s) || Number.isNaN(+e) || e < s) return '';
  e.setUTCDate(e.getUTCDate() + 1);
  let m = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + e.getUTCMonth() - s.getUTCMonth();
  const at = (n: number) => Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + n, s.getUTCDate());
  if (at(m) > +e) m--;
  const d = Math.round((+e - at(m)) / 864e5);
  return [m && `${m} bulan`, d && `${d} hari`].filter(Boolean).join(' ');
};
console.assert(lamaKontrak('2026-01-01', '2026-12-31') === '12 bulan' && lamaKontrak('2026-01-15', '2026-07-14') === '6 bulan' && lamaKontrak('2026-01-01', '2026-01-10') === '10 hari' && lamaKontrak('2026-02-01', '2026-01-01') === '', 'lamaKontrak');

// Ganti {kunci} di teks pasal dengan data; kunci tak dikenal dibiarkan apa adanya
const isiToken = (text: string, data: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, key: string) => (key in data ? data[key] : m));
console.assert(isiToken('a {x} {y}', { x: '1' }) === 'a 1 {y}', 'isiToken');

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
function NumList({ lines, k, mark = (i) => `${i + 1}.` }: { lines: string[]; k: number; mark?: (i: number) => string }) {
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${6 * k}px ${12 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{mark(i)}</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// Isian Rupiah di form: tebal + miring + garis titik-titik, ribuan diberi titik saat mengetik (Rp 5.000.000)
const rpInput = 'w-full min-w-0 bg-transparent px-1 py-2 text-sm font-bold italic outline-none';
function RupiahInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center border-b-2 border-dotted border-gray-500 focus-within:border-blue-600">
      <span className="pl-1 text-sm font-bold italic text-gray-600">Rp</span>
      <input inputMode="numeric" aria-label={label} placeholder="0" className={rpInput} style={{ border: 0, background: 'transparent' }} value={value ? rupiah(num(value)) : ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  );
}

// Daftar tunjangan (tambah/hapus). `ket` = kolom keterangan (tunjangan tidak tetap).
function ItemList({ items, onChange, name, ket }: { items: Item[]; onChange: (v: Item[]) => void; name: string; ket?: boolean }) {
  const up = (i: number, p: Partial<Item>) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-gray-700">{name}</p>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
          <input aria-label={`Nama ${name.toLowerCase()} ${i + 1}`} placeholder="Nama tunjangan" className={inputCls} value={it.label} onChange={(e) => up(i, { label: e.target.value })} />
          <div className="order-last col-span-2 sm:order-none sm:col-span-1"><RupiahInput label={`Nilai ${name.toLowerCase()} ${i + 1}`} value={it.nilai} onChange={(v) => up(i, { nilai: v })} /></div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${name.toLowerCase()} ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
          {ket && <input aria-label={`Keterangan ${name.toLowerCase()} ${i + 1}`} placeholder="Keterangan, mis. per hari hadir" className={`${inputCls} order-last col-span-2 sm:col-span-3`} value={it.ket} onChange={(e) => up(i, { ket: e.target.value })} />}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: '', nilai: '', ket: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {name.toLowerCase()}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKontrakKerja() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved, nomor: orRandomNo(saved.nomor, POLA), pasal: migrasiPasal(saved.pasal ?? d.pasal) } : d;
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
  const setPasal = (i: number, p: Partial<Pasal>) => set('pasal', f.pasal.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const movePasal = (i: number, d: number) => {
    const next = [...f.pasal];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set('pasal', next);
  };
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = f.skala / 100; // ukuran teks tidak lagi dikecilkan otomatis; isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `pkwt-${(f.nomor || 'kontrak').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  const ks = f.kosong;
  const rp = (v: string) => (ks ? `Rp ${TITIK}` : `Rp ${rupiah(num(v))} (${terbilangRupiah(num(v))})`);
  const t = (v: string) => (ks || !v ? TITIK : v);
  const totTetap = f.tunjTetap.reduce((a, x) => a + num(x.nilai), 0);
  const totalGaji = num(f.gaji) + totTetap; // upah tetap per bulan = gaji pokok + tunjangan tetap
  const data: Record<string, string> = {
    jabatan: t(f.jabatan), penempatan: t(f.penempatan), mulai: t(fmtTanggal(f.mulai)), selesai: t(fmtTanggal(f.selesai)),
    lama: t(lamaKontrak(f.mulai, f.selesai)), hariKerja: t(f.hariKerja), jamKerja: t(f.jamKerja),
    gaji: rp(f.gaji), tunjangan: rp(String(totTetap)), totalGaji: rp(String(totalGaji)), tglGaji: t(f.tglGaji), perusahaan: f.instansi,
  };
  const hari = f.tanggal ? new Date(`${f.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' }) : '';
  const tugas = ks ? Array(5).fill(TITIK) : lines(f.tugas);
  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  const placeDate = [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', ');

  // ---- Unit isi (halaman dipotong di batas unit). g = kelompok: unit sepasal sebisanya di satu halaman.
  const SIGN = -5; // ayat terakhir + penutup & tanda tangan: tidak pernah terpisah
  // shortcut: InfoRows/P memakai gaya template hanya di halaman 1; bila pembukaan terdorong ke halaman 2 (kop sangat tinggi) jarak/indentasinya memakai bawaan.
  const units: { el: ReactNode; g: number }[] = [
    { g: -1, el: <P>Pada hari ini {ks ? TITIK : hari}, tanggal {ks ? TITIK : fmtTanggal(f.tanggal)}, bertempat di {f.kota || TITIK}, yang bertanda tangan di bawah ini:</P> },
    { g: -2, el: <><InfoRows rows={[{ label: 'Nama', value: f.p1Nama }, { label: 'Jabatan', value: f.p1Jabatan }, { label: 'Alamat', value: f.alamat }]} />
      <P>Dalam hal ini bertindak untuk dan atas nama {f.instansi}, selanjutnya disebut <b>PIHAK PERTAMA</b>.</P></> },
    { g: -3, el: <><InfoRows rows={[
      { label: 'Nama', value: isian(f.nama, ks) }, { label: 'NIK', value: isian(f.nik, ks) },
      { label: 'Tempat/tgl. lahir', value: isian(f.ttl, ks) }, { label: 'Alamat', value: isian(f.alamatK, ks) },
    ]} />
      <P>Dalam hal ini bertindak untuk dan atas nama diri sendiri, selanjutnya disebut <b>PIHAK KEDUA</b>.</P></> },
    { g: -4, el: <P>Kedua belah pihak sepakat mengikatkan diri dalam Perjanjian Kerja Waktu Tertentu dengan ketentuan sebagai berikut:</P> },
  ];
  const para = { margin: `0 0 ${2 * kk}px`, textAlign: 'justify' } as const;
  // Rincian upah: label kiri, nilai kanan tebal + miring bergaris titik-titik; kosongan = titik-titik. Satu baris per unit.
  const nilaiRp = (v: string) => (v && num(v) ? `Rp ${rupiah(num(v))}` : '');
  const val = (v: string) => (ks || !v ? <Dots w="100%" /> : <span style={{ ...dataStyle, fontWeight: 700, padding: '0 4px 0.22em' }}>{v}</span>);
  const gRow = (label: ReactNode, v: string | null, indent = 0, bold = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) max-content minmax(0,45%)', columnGap: 6 * kk, margin: `0 0 ${3 * kk}px ${(26 + indent) * kk}px`, fontWeight: bold ? 700 : undefined }}>
      <span>{label}</span>{v !== null && <><span>:</span><span style={{ textAlign: 'right', fontWeight: 400 }}>{val(v)}</span></>}
    </div>
  );
  const sub = (x: Item, j: number) => gRow(`${j + 1}) ${x.label || TITIK}`, [nilaiRp(x.nilai), x.ket].filter(Boolean).join(' '), 14);
  const gajiRows: ReactNode[] = [
    gRow('a. Gaji pokok', nilaiRp(f.gaji)),
    ...(f.tunjTetap.length ? [gRow('b. Tunjangan tetap', null), ...f.tunjTetap.map(sub)] : []),
    gRow('Jumlah upah tetap per bulan', nilaiRp(String(totalGaji)), 0, true),
    <div style={{ margin: `0 0 ${3 * kk}px ${26 * kk}px` }}>Terbilang: {ks ? <Dots w="70%" /> : <span style={{ ...dataStyle, fontWeight: 700 }}>({terbilangRupiah(totalGaji)})</span>}</div>,
    ...(f.tunjTidak.length ? [gRow(`${f.tunjTetap.length ? 'c' : 'b'}. Tunjangan tidak tetap`, null), ...f.tunjTidak.map(sub)] : []),
  ];
  f.pasal.forEach((p, i) => {
    const ayat = lines(isiToken(p.isi, data));
    const numbered = ayat.length > 1 && !p.tugas;
    // Satu ayat per unit (judul pasal menempel ke ayat pertama); daftar tugas satu poin per unit
    const items: ReactNode[] = ayat.map((a, j) => (numbered ? <NumList lines={[a]} k={kk} mark={() => `(${j + 1})`} /> : <p style={para}>{a}</p>));
    if (p.tugas) items.push(...tugas.map((x, j) => <NumList lines={[x]} k={kk} mark={() => `${j + 1}.`} />));
    if (p.gaji) items.splice(1, 0, ...gajiRows);
    if (!items.length) items.push(null);
    const head = (
      <>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>Pasal {i + 1}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 2 * kk }}>{p.judul}</div>
      </>
    );
    const lastPasal = i === f.pasal.length - 1;
    items.forEach((el, j) => units.push({ g: lastPasal && j === items.length - 1 ? SIGN : i, el: <div style={{ marginBottom: j === items.length - 1 ? 4 * kk : 0 }}>{j === 0 && head}{el}</div> }));
  });
  // Penutup + tanda tangan (+ saksi) satu unit, sekelompok dengan ayat terakhir pasal terakhir
  units.push({
    g: SIGN,
    el: (
      <div style={{ paddingTop: 4 * kk }}>
        <p style={{ ...para, marginBottom: 10 * kk }}>Demikian perjanjian ini dibuat dan ditandatangani oleh kedua belah pihak pada hari dan tanggal tersebut di atas.</p>
        <div style={{ textAlign: 'right', marginBottom: 2 * kk }}>{placeDate}</div>
        {/* Pihak Kedua (karyawan) kiri, Pihak Pertama (perusahaan, + stempel) kanan; ruang tanda tangan muat meterai */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 * kk }}>
          <SignBlock s={{ heading: 'PIHAK KEDUA,', role: 'Karyawan', name: isian(f.nama, ks) }} k={kk} />
          <SignBlock k={kk} align="right" s={{ heading: 'PIHAK PERTAMA,', role: f.p1Jabatan, name: f.p1Nama, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel') }} />
        </div>
        {f.saksi.length > 0 && (
          <div style={{ marginTop: 10 * kk }}>
            <div style={{ textAlign: 'center', marginBottom: 2 * kk }}>Saksi-saksi:</div>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: 12 * kk }}>
              {f.saksi.map((s, i) => <SignBlock key={i} s={{ heading: `Saksi ${i + 1},`, name: isian(s, ks) }} k={kk} width={130} />)}
            </div>
          </div>
        )}
      </div>
    ),
  });

  // Font halaman lanjutan = font template halaman 1 (dibaca dari hasil render)
  const [look, setLook] = useState({ ff: LETTER_FONT, fs: '', lh: '1.45' });
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    const bump = () => setFontTick((x) => x + 1); // font web selesai dimuat: tata letak berubah, hitung ulang
    document.fonts.addEventListener?.('loadingdone', bump);
    return () => document.fonts.removeEventListener?.('loadingdone', bump);
  }, []);
  useLayoutEffect(() => {
    const root = letterRef.current?.querySelector('[data-page]')?.firstElementChild;
    if (!root) return;
    const cs = getComputedStyle(root);
    if (cs.fontFamily !== look.ff || cs.fontSize !== look.fs || cs.lineHeight !== look.lh) setLook({ ff: cs.fontFamily, fs: cs.fontSize, lh: cs.lineHeight });
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageKey = useMemo(() => ({}), [f, logo.src, ttd.src, stempel.src, look, fontTick]);
  const ranges = usePagination(units.length, units.map((u) => u.g), pageKey, () => letterRef.current);
  const flow = ([a, b]: readonly [number, number]) => <div data-flow>{units.slice(a, b).map((u, i) => <div key={a + i} style={{ display: 'flow-root' }}>{u.el}</div>)}</div>;
  const pageNo = (i: number) => (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: (f.gaya === 'bingkai' ? 5 : 14) * pg.f, textAlign: 'center', fontFamily: look.ff, fontSize: 10 * kk, color: '#444' }}>
      Halaman {i + 1} dari {ranges.length}
    </div>
  );
  const pageBox = { position: 'relative', width: pg.W, height: pg.H, overflow: 'hidden', background: '#fff' } as const;

  // Halaman 1: template terpilih; tempat/tanggal & tanda tangan pindah ke unit penutup (halaman terakhir)
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor, placeDate: '',
    meta: [{ label: 'Lampiran', value: lampiranTeks(f.lampiranAuto, f.lampiran, ranges.length) }],
    body: flow(ranges[0]),
    signers: [],
  };
  const pages = ranges.map((r, i) => (
    <div key={i} data-page className="shadow-lg" style={pageBox}>
      {i === 0 ? <LayoutLetter layout={f.gaya} doc={doc} k={kk} W={pg.W} H={pg.H} pf={pg.f} /> : (
        <div style={{ height: '100%', boxSizing: 'border-box', padding: `${40 * pg.f}px ${56 * pg.f}px`, color: '#000', fontFamily: look.ff, fontSize: look.fs || 13 * kk, lineHeight: look.lh, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 * kk, fontSize: '0.8em', color: '#444', borderBottom: '1px solid #999', paddingBottom: 3 * kk, marginBottom: 12 * kk }}>
            <span>{f.judul}</span>
            {nomor && <span style={{ textAlign: 'right' }}>Nomor: {nomor}</span>}
          </div>
          {flow(r)}
        </div>
      )}
      {pageNo(i)}
    </div>
  ));

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <p className="text-xs text-gray-500">Dokumen {ranges.length} halaman; pasal yang tidak muat otomatis berlanjut ke halaman berikutnya.</p>
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
  const btn = 'px-3 min-h-[40px] rounded-lg border text-sm font-medium disabled:opacity-40';
  // Kunci narasi: {kunci} → field form. Tanggal, {lama} & nilai upah tidak ada di sini (tampil apa adanya, diubah di kartunya).
  const NAR: Record<string, keyof Form> = { jabatan: 'jabatan', penempatan: 'penempatan', hariKerja: 'hariKerja', jamKerja: 'jamKerja', tglGaji: 'tglGaji', perusahaan: 'instansi' };
  const narVars = Object.fromEntries(Object.entries(NAR).map(([key, fk]) => [key, f[fk] as string]));
  const onVar = (key: string, v: string) => set(NAR[key], v as never);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Kontrak Kerja (PKWT)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-kontrak-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Bidang usaha (baris kedua kop)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Data Perjanjian">
              <Field label="Judul"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor perjanjian"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`012/PKWT/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal perjanjian"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <LampiranField auto={f.lampiranAuto} manual={f.lampiran} pages={ranges.length} onAuto={(v) => set('lampiranAuto', v)} onManual={(v) => set('lampiran', v)} />
            </FormSection>

            <FormSection title="Pihak Pertama (Perusahaan)">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama wakil perusahaan"><AutoTextarea className={inputCls} value={f.p1Nama} onChange={(e) => set('p1Nama', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.p1Jabatan} onChange={(e) => set('p1Jabatan', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
            </FormSection>

            <FormSection title="Pihak Kedua (Karyawan)">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <Field label="NIK"><AutoTextarea className={inputCls} value={f.nik} onChange={(e) => set('nik', e.target.value)} /></Field>
                <Field label="Tempat, tanggal lahir"><AutoTextarea className={inputCls} value={f.ttl} onChange={(e) => set('ttl', e.target.value)} /></Field>
              </div>
              <Field label="Alamat"><AutoTextarea className={inputCls} value={f.alamatK} onChange={(e) => set('alamatK', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Pekerjaan & Waktu Kerja">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
                <Field label="Penempatan"><AutoTextarea className={inputCls} value={f.penempatan} onChange={(e) => set('penempatan', e.target.value)} /></Field>
                <Field label="Mulai kontrak"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Selesai kontrak"><input type="date" className={inputCls} value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
              </div>
              <p className="text-xs text-gray-500">Lama kontrak: {lamaKontrak(f.mulai, f.selesai) || 'periksa tanggal mulai & selesai'} (otomatis)</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Hari kerja"><AutoTextarea className={inputCls} value={f.hariKerja} onChange={(e) => set('hariKerja', e.target.value)} /></Field>
                <Field label="Jam kerja"><AutoTextarea className={inputCls} value={f.jamKerja} onChange={(e) => set('jamKerja', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Kesepakatan Gaji & Tunjangan">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Gaji pokok per bulan"><RupiahInput label="Gaji pokok per bulan" value={f.gaji} onChange={(v) => set('gaji', v)} /></Field>
                <Field label="Tanggal pembayaran (setiap bulan)"><input inputMode="numeric" className={inputCls} value={f.tglGaji} onChange={(e) => set('tglGaji', e.target.value)} /></Field>
              </div>
              <ItemList name="Tunjangan Tetap" items={f.tunjTetap} onChange={(v) => set('tunjTetap', v)} />
              <div className="rounded-lg bg-indigo-50 p-3 text-sm">
                <p>Total upah tetap per bulan (gaji pokok + tunjangan tetap): <b><i>Rp {rupiah(totalGaji)}</i></b></p>
                <p className="text-gray-600 italic">{terbilangRupiah(totalGaji)}</p>
              </div>
              <ItemList name="Tunjangan Tidak Tetap" ket items={f.tunjTidak} onChange={(v) => set('tunjTidak', v)} />
              <p className="text-xs text-gray-500">Rincian ini tampil sebagai tabel di pasal yang bertanda rincian upah (bawaan: Upah dan Tunjangan). Kode {'{gaji}'}, {'{tunjangan}'} (total tunjangan tetap) dan {'{totalGaji}'} tetap bisa dipakai di pasal mana pun.</p>
            </FormSection>

            <FormSection title="Tugas dan Tanggung Jawab">
              <p className="text-xs text-gray-500">Preset posisi (mengisi jabatan & daftar tugas, tetap bisa diedit):</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESET).map((p) => (
                  <button key={p} type="button" className={btn} onClick={() => setF((x) => ({ ...x, jabatan: p === 'Admin' ? 'Staf Administrasi' : p === 'Sales' ? 'Sales Executive' : p, tugas: PRESET[p] }))}>{p}</button>
                ))}
              </div>
              <Field label="Daftar tugas (satu poin per baris, bernomor otomatis)"><AutoTextarea rows={4} className={inputCls} value={f.tugas} onChange={(e) => set('tugas', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Pasal-pasal" lockable>
              <p className="text-xs text-gray-500">Satu ayat per baris. Kode yang terisi otomatis: {'{jabatan} {penempatan} {mulai} {selesai} {lama} {hariKerja} {jamKerja} {gaji} {tunjangan} {totalGaji} {tglGaji} {perusahaan}'}. Saat narasi terkunci, kotak isian mengubah data form terkait; tanggal, lama kontrak & nilai upah diubah di kartu masing-masing.</p>
              {f.pasal.map((p, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold shrink-0">Pasal {i + 1}</span>
                    <AutoTextarea aria-label={`Judul pasal ${i + 1}`} className={inputCls} value={p.judul} onChange={(e) => setPasal(i, { judul: e.target.value })} />
                  </div>
                  <NarrativeField label={`Isi pasal ${i + 1}`} rows={2} value={p.isi} onChange={(v) => setPasal(i, { isi: v })} vars={narVars} onVar={onVar} />
                  {p.tugas && <p className="text-xs text-gray-500">Daftar tugas di atas ditampilkan di bawah pasal ini.</p>}
                  {p.gaji && <p className="text-xs text-gray-500">Tabel Kesepakatan Gaji & Tunjangan ditampilkan setelah ayat pertama pasal ini.</p>}
                  <div className="flex gap-2">
                    <button type="button" className={btn} disabled={i === 0} onClick={() => movePasal(i, -1)} aria-label={`Naikkan pasal ${i + 1}`}>↑</button>
                    <button type="button" className={btn} disabled={i === f.pasal.length - 1} onClick={() => movePasal(i, 1)} aria-label={`Turunkan pasal ${i + 1}`}>↓</button>
                    <button type="button" className={`${btn} text-red-600 border-red-200`} onClick={() => set('pasal', f.pasal.filter((_, j) => j !== i))} aria-label={`Hapus pasal ${i + 1}`}>Hapus</button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => set('pasal', [...f.pasal, { judul: 'Pasal Tambahan', isi: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah pasal</button>
                <button type="button" onClick={() => { if (confirm('Kembalikan pasal-pasal ke bawaan?')) set('pasal', PASAL_DEFAULT); }} className="min-h-[40px] text-sm font-medium text-gray-600">Kembalikan pasal bawaan</button>
              </div>
            </FormSection>

            <FormSection title="Saksi (opsional)">
              {f.saksi.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <AutoTextarea aria-label={`Nama saksi ${i + 1}`} placeholder="Nama saksi" className={inputCls} value={s} onChange={(e) => set('saksi', f.saksi.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" onClick={() => set('saksi', f.saksi.filter((_, j) => j !== i))} aria-label={`Hapus saksi ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              {f.saksi.length < 3 && <button type="button" onClick={() => set('saksi', [...f.saksi, ''])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah saksi</button>}
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
