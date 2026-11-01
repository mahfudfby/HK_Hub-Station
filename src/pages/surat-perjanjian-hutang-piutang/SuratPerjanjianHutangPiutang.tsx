import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import BgToggle from '../../shared/components/BgToggle';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { Switch, TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider } from '../../shared/components/TextScale';
import { DOTTED, ExportButton, Field, ImageUpload, LETTER_FONT, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, SignBlock, type LayoutDoc } from '../../shared/components/LetterLayouts';
import FormSection, { NarrativeField } from '../../shared/components/FormSection';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { usePagination } from '../surat-kontrak-kerja/usePagination';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import KontakFields from '../../shared/components/KontakFields';

// Surat Perjanjian Hutang Piutang: pemberi pinjaman (PIHAK PERTAMA) & peminjam (PIHAK KEDUA), pasal-pasal
// bisa diedit, jadwal cicilan otomatis, saksi opsional, dan lampiran foto bukti di halaman terpisah.
// Paginasi multi-halaman dari Kontrak Kerja; halaman 1 memakai tata letak bersama (LetterLayouts).

// ============================================================
// SECTION: Data
// ============================================================
// tag: 'bayar' = jadwal cicilan disisipkan setelah pasal; 'jaminan' = daftar jaminan (pasal hilang bila jaminan mati)
type Pasal = { judul: string; isi: string; tag?: 'bayar' | 'jaminan' };
type Foto = { src: string; ket: string; bg: boolean };
// id stabil per saksi: kunci offset tanda tangan tidak bergeser saat saksi dihapus
type Saksi = { id: string; nama: string; ttd: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  kopMode: 'perusahaan' | 'pribadi';
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; lampiranAuto: boolean; lampiran: string;
  p1Nama: string; p1Nik: string; p1Ttl: string; p1Kerja: string; p1Alamat: string; p1Telp: string;
  p2Nama: string; p2Nik: string; p2Ttl: string; p2Kerja: string; p2Alamat: string; p2Telp: string; p2Mewakili: string;
  jumlah: string; tujuan: string; serah: 'tunai' | 'transfer'; rekening: string; tglSerah: string; tenor: string;
  bayar: 'sekaligus' | 'cicilan'; mulaiBayar: string; jadwal: boolean; metodeBayar: string;
  pakaiBunga: boolean; bunga: string; denda: string; pengadilan: string;
  pakaiJaminan: boolean; jaminan: string;
  pasal: Pasal[];
  ttd: string; stempel: string; ttd2: string;
  pakaiSaksi: boolean; saksi: Saksi[];
  pakaiFoto: boolean; fotoPerHal: number; foto: Foto[];
};

const STORAGE_KEY = 'surat-perjanjian-hutang-piutang:v1';
const POLA = '{n3}/SPHP/{rom}/{yyyy}';
const iso = (d: Date) => d.toISOString().slice(0, 10);
const newId = () => Math.random().toString(36).slice(2, 8);
// Data lama: saksi berupa nama (string) tanpa id/ttd
const toSaksi = (s: string | Partial<Saksi>): Saksi => typeof s === 'string' ? { id: newId(), nama: s, ttd: '' } : { id: s.id || newId(), nama: s.nama ?? '', ttd: s.ttd ?? '' };

// Tambah bulan pada tanggal ISO; tanggal dijepit ke akhir bulan (31 Jan + 1 = 28/29 Feb)
const addMonths = (s: string, m: number) => {
  const [y, mo, d] = s.split('-').map(Number);
  if (!y || !mo || !d) return '';
  const last = new Date(Date.UTC(y, mo + m, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo - 1 + m, Math.min(d, last))).toISOString().slice(0, 10);
};
console.assert(addMonths('2026-01-31', 1) === '2026-02-28' && addMonths('2026-11-05', 2) === '2027-01-05' && addMonths('', 1) === '', 'addMonths');

// Jadwal angsuran rata: dibulatkan ke rupiah, selisih pembulatan masuk ke angsuran terakhir
const makeJadwal = (total: number, n: number, first: string) => {
  const c = Math.round(total / n);
  return Array.from({ length: n }, (_, i) => {
    const nominal = i === n - 1 ? total - c * (n - 1) : c;
    return { ke: i + 1, tgl: addMonths(first, i), nominal, sisa: Math.max(0, total - c * i - nominal) };
  });
};
{
  const j = makeJadwal(1000, 3, '2026-01-10');
  console.assert(j.length === 3 && j[0].nominal === 333 && j[2].nominal === 334 && j[2].sisa === 0 && j[0].sisa === 667 && j[2].tgl === '2026-03-10', 'makeJadwal');
}

// "dua belas" (angka biasa, tanpa "rupiah")
const kata = (n: number) => terbilangRupiah(n).replace(/ rupiah$/, '').toLowerCase();

const PASAL_DEFAULT: Pasal[] = [
  { judul: 'Jumlah Pinjaman', isi: 'PIHAK PERTAMA memberikan pinjaman uang kepada PIHAK KEDUA sebesar {jumlah}.\nPIHAK KEDUA mengakui telah menerima uang pinjaman tersebut dan berutang kepada PIHAK PERTAMA sejumlah tersebut di atas.' },
  { judul: 'Tujuan Pinjaman', isi: 'PIHAK KEDUA menggunakan uang pinjaman tersebut untuk {tujuan}.' },
  { judul: 'Penyerahan Uang', isi: 'Uang pinjaman diserahkan oleh PIHAK PERTAMA kepada PIHAK KEDUA secara {penyerahan} pada tanggal {tglSerah}.\nPenandatanganan perjanjian ini sekaligus berlaku sebagai tanda terima yang sah atas uang pinjaman tersebut.' },
  { judul: 'Jangka Waktu', isi: 'Jangka waktu pinjaman adalah {tenor}, terhitung sejak tanggal {tglSerah}.\nPIHAK KEDUA wajib melunasi seluruh pinjaman paling lambat pada tanggal {jatuhTempo}.' },
  { judul: 'Cara Pembayaran', tag: 'bayar', isi: '{caraBayar}\nSetiap pembayaran dilakukan secara {metodeBayar} dan dibuktikan dengan kuitansi atau bukti transfer yang sah.\nPIHAK KEDUA dapat melunasi sisa pinjaman lebih cepat dari jadwal tanpa dikenakan biaya tambahan.' },
  { judul: 'Bunga dan Biaya', isi: '{bunga}\nBiaya meterai dan biaya lain yang timbul dari pembuatan perjanjian ini ditanggung bersama oleh kedua belah pihak.' },
  { judul: 'Jaminan', tag: 'jaminan', isi: 'Sebagai jaminan atas pinjaman ini, PIHAK KEDUA menyerahkan kepada PIHAK PERTAMA barang jaminan berupa:\nBarang jaminan dikembalikan kepada PIHAK KEDUA dalam keadaan seperti semula setelah seluruh pinjaman dilunasi.' },
  { judul: 'Keterlambatan dan Wanprestasi', isi: 'Apabila PIHAK KEDUA terlambat melakukan pembayaran dari waktu yang disepakati, PIHAK KEDUA dikenakan denda sebesar {denda}.\nApabila sampai dengan tanggal jatuh tempo PIHAK KEDUA belum melunasi pinjaman, PIHAK PERTAMA berhak menagih seluruh sisa pinjaman beserta dendanya secara sekaligus dan, apabila ada barang jaminan, mengambil pelunasan dari barang jaminan tersebut sesuai ketentuan hukum yang berlaku.' },
  { judul: 'Penyelesaian Sengketa', isi: 'Perselisihan yang timbul dari perjanjian ini diselesaikan secara musyawarah untuk mufakat.\nApabila musyawarah tidak mencapai mufakat, kedua belah pihak sepakat menyelesaikannya melalui Pengadilan Negeri {pengadilan}.' },
  { judul: 'Penutup', isi: 'Hal-hal yang belum diatur dalam perjanjian ini akan diatur kemudian atas kesepakatan kedua belah pihak.\nPerjanjian ini dibuat rangkap 2 (dua), masing-masing bermeterai cukup dan mempunyai kekuatan hukum yang sama, serta ditandatangani kedua belah pihak dalam keadaan sadar, sehat jasmani dan rohani, tanpa paksaan dari pihak mana pun.' },
];

const makeDefault = (): Form => {
  const today = iso(new Date());
  return {
    gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
    pakaiNomor: true, kosong: false,
    kopMode: 'pribadi',
    logo: '', instansi: 'CV BERKAH USAHA MANDIRI', subKop: 'Perdagangan Umum & Simpan Pinjam',
    alamat: 'Jl. Pemuda No. 27, Kel. Rawamangun, Kec. Pulo Gadung, Jakarta Timur, DKI Jakarta 13220',
    kontak: 'Telp. (021) 4789-1234 • admin@berkahusaha.co.id • www.berkahusaha.co.id',
    judul: 'SURAT PERJANJIAN HUTANG PIUTANG', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today, lampiranAuto: true, lampiran: '-',
    p1Nama: 'Bambang Supriyadi', p1Nik: '3175021204780003', p1Ttl: 'Jakarta, 12 April 1978', p1Kerja: 'Wiraswasta',
    p1Alamat: 'Jl. Cempaka Baru No. 8, RT 005/RW 003, Kel. Rawamangun, Kec. Pulo Gadung, Jakarta Timur', p1Telp: '0812-8765-4321',
    p2Nama: 'Agus Setiawan', p2Nik: '3175030907900005', p2Ttl: 'Bekasi, 9 Juli 1990', p2Kerja: 'Karyawan Swasta',
    p2Alamat: 'Jl. Melati No. 21, RT 002/RW 006, Kel. Jatinegara, Kec. Cakung, Jakarta Timur', p2Telp: '0857-1234-5678', p2Mewakili: '',
    jumlah: '10000000', tujuan: 'tambahan modal usaha warung makan', serah: 'transfer', rekening: 'Bank BRI No. 0123-01-004567-50-8 atas nama Agus Setiawan',
    tglSerah: today, tenor: '10', bayar: 'cicilan', mulaiBayar: addMonths(today, 1), jadwal: true,
    metodeBayar: 'tunai atau transfer ke rekening PIHAK PERTAMA',
    pakaiBunga: false, bunga: '1', denda: 'Rp 25.000 (dua puluh lima ribu rupiah) per hari keterlambatan', pengadilan: 'Jakarta Timur',
    pakaiJaminan: true, jaminan: '1 (satu) unit sepeda motor Honda Vario 125 tahun 2021, warna hitam, Nopol B 1234 XYZ\nBPKB asli sepeda motor tersebut atas nama PIHAK KEDUA',
    pasal: PASAL_DEFAULT,
    ttd: '', stempel: '', ttd2: '',
    pakaiSaksi: true, saksi: ['Rudi Hartono', 'Siti Aminah'].map(toSaksi),
    pakaiFoto: false, fotoPerHal: 2, foto: [],
  };
};

// Data User: kop & identitas pemberi pinjaman + gambar (bukan isi perjanjian)
const USER_KEYS = ['logo', 'posisi', 'kopMode', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'p1Nama', 'p1Nik', 'p1Ttl', 'p1Kerja', 'p1Alamat', 'p1Telp', 'ttd', 'stempel'] as const;

// Narasi: {kunci} diganti isi (boleh elemen); kunci tak dikenal dibiarkan apa adanya
const fill = (text: string, d: Record<string, ReactNode>) =>
  text.split(/(\{\w+\})/g).map((s, i) => {
    const m = /^\{(\w+)\}$/.exec(s);
    return m && m[1] in d ? <Fragment key={i}>{d[m[1]]}</Fragment> : s;
  });
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// Foto dikecilkan (sisi terpanjang 1600px, JPEG) agar muat di penyimpanan perangkat
function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      const ctx = c.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('browser tidak mendukung'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('gambar tidak bisa dibaca'));
    };
    img.src = url;
  });
}

// ============================================================
// SECTION: Potongan isi
// ============================================================
function NumList({ lines, k, mark }: { lines: ReactNode[]; k: number; mark: (i: number) => string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${2 * k}px ${12 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{mark(i)}</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Foto lampiran (Hapus BG opsional). Latar CSS `contain`: html2canvas tidak mendukung object-fit.
function FotoBox({ foto, style, notify }: { foto: Foto; style?: CSSProperties; notify?: Notify }) {
  const r = useBgRemoved(foto.src, foto.bg, notify && ((m) => notify('error', m)));
  return <div role="img" aria-label={foto.ket || 'Foto lampiran'} style={{ background: `url("${r.src}") center / contain no-repeat`, ...style }} />;
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPerjanjianHutangPiutang() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved, nomor: orRandomNo(saved.nomor, POLA), saksi: (saved.saksi ?? d.saksi).map(toSaksi) } : d;
    } catch {
      return d;
    }
  });
  const storeFull = useRef(false); // pesan penuh cukup sekali sampai penyimpanan berhasil lagi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
      storeFull.current = false;
    } catch {
      if (!storeFull.current) notify('error', 'Penyimpanan perangkat penuh: foto/gambar terlalu besar untuk disimpan otomatis. Dokumen tetap bisa diekspor; kurangi foto agar tersimpan.');
      storeFull.current = true;
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttd2: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttd2 = useBgRemoved(f.ttd2, bg.ttd2, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  // Tanda tangan saksi (maks. 2): Hapus BG per id saksi, bawaan aktif
  const [bgSaksi, setBgSaksi] = useState<Record<string, boolean>>({});
  const bgS = (i: number) => bgSaksi[f.saksi[i]?.id ?? ''] ?? true;
  const ttdS0 = useBgRemoved(f.saksi[0]?.ttd ?? '', bgS(0), bgError);
  const ttdS1 = useBgRemoved(f.saksi[1]?.ttd ?? '', bgS(1), bgError);
  const ttdSaksi = [ttdS0, ttdS1];
  const busy = logo.busy || ttd.busy || stempel.busy || ttd2.busy || ttdS0.busy || ttdS1.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setPasal = (i: number, p: Partial<Pasal>) => set('pasal', f.pasal.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const movePasal = (i: number, d: number) => {
    const next = [...f.pasal];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set('pasal', next);
  };
  const setFoto = (i: number, p: Partial<Foto>) => setF((x) => ({ ...x, foto: x.foto.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const moveFoto = (i: number, d: number) => setF((x) => {
    const next = [...x.foto];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return { ...x, foto: next };
  });
  const [fotoBusy, setFotoBusy] = useState(false);
  const addFotos = async (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    setFotoBusy(true);
    notify('loading', 'Memuat foto…');
    let ok = 0;
    for (const file of list) {
      if (!file.type.startsWith('image/')) {
        notify('error', `File "${file.name}" bukan gambar.`);
        continue;
      }
      try {
        const src = await compressPhoto(file);
        setF((x) => ({ ...x, foto: [...x.foto, { src, ket: file.name.replace(/\.[^.]+$/, ''), bg: false }] }));
        ok++;
      } catch (e: any) {
        notify('error', `Foto "${file.name}" gagal dibaca: ${e?.message || 'format tidak didukung'}.`);
      }
    }
    setFotoBusy(false);
    if (ok) notify('success', `${ok} foto ditambahkan.`);
  };
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan? Foto lampiran juga dihapus.')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = f.skala / 100; // ukuran teks tidak dikecilkan otomatis; isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `perjanjian-hutang-piutang-${(f.nomor || 'sphp').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // ---- Hitungan pinjaman
  const ks = f.kosong;
  const pokok = Math.max(0, Math.round(num(f.jumlah)));
  const n = Math.max(1, Math.round(num(f.tenor)) || 1);
  const persen = f.pakaiBunga ? Math.max(0, num(f.bunga)) : 0;
  const bungaTotal = Math.round((pokok * persen * n) / 100);
  const total = pokok + bungaTotal;
  const cicilan = f.bayar === 'cicilan';
  const jatuhTempo = cicilan ? addMonths(f.mulaiBayar, n - 1) : addMonths(f.tglSerah, n);
  const jadwal = cicilan ? makeJadwal(total, n, f.mulaiBayar) : [];
  const perBulan = jadwal[0]?.nominal ?? 0;
  const tglBayar = f.mulaiBayar ? String(Number(f.mulaiBayar.slice(8, 10))) : '';

  // ---- Nilai di narasi
  const dataStyle = { fontWeight: 700, fontStyle: 'italic', borderBottom: DOTTED, paddingBottom: '0.22em' } as const;
  const rp = (v: number) => <span style={dataStyle}>{ks ? `Rp ${TITIK}` : `Rp ${rupiah(v)} (${terbilangRupiah(v)})`}</span>;
  const t = (v: string) => (ks || !v ? TITIK : v);
  const tgl = (v: string) => t(fmtTanggal(v));
  const data: Record<string, ReactNode> = {
    jumlah: rp(pokok), tujuan: t(f.tujuan), tglSerah: tgl(f.tglSerah), jatuhTempo: tgl(jatuhTempo),
    penyerahan: f.serah === 'tunai' ? 'tunai' : <>transfer ke rekening {t(f.rekening)}</>,
    tenor: ks ? `${TITIK} bulan` : `${n} (${kata(n)}) bulan`,
    metodeBayar: t(f.metodeBayar), denda: t(f.denda), pengadilan: t(f.pengadilan), total: rp(total), cicilan: rp(perBulan),
    caraBayar: cicilan
      ? <>PIHAK KEDUA wajib mengembalikan pinjaman secara angsuran sebanyak {ks ? TITIK : `${n} (${kata(n)})`} kali, masing-masing sebesar {rp(perBulan)} per bulan, yang dibayarkan setiap tanggal {t(tglBayar)} mulai tanggal {tgl(f.mulaiBayar)}{f.jadwal ? ', dengan rincian sebagaimana jadwal angsuran berikut' : ''}.</>
      : <>PIHAK KEDUA wajib mengembalikan pinjaman secara sekaligus (lunas) sebesar {rp(total)} paling lambat pada tanggal {tgl(jatuhTempo)}.</>,
    bunga: persen > 0
      ? <>Atas pinjaman ini PIHAK KEDUA dikenakan bunga sebesar {ks ? TITIK : String(persen).replace('.', ',')}% per bulan dari pokok pinjaman, sehingga seluruh kewajiban PIHAK KEDUA berjumlah {rp(total)}.</>
      : <>Pinjaman ini diberikan tanpa bunga, sehingga PIHAK KEDUA cukup mengembalikan pokok pinjaman sebesar {rp(pokok)}.</>,
  };
  // Isian kecil saat narasi terkunci (nilai form mentah)
  const VAR_FIELD = { jumlah: 'jumlah', tujuan: 'tujuan', metodeBayar: 'metodeBayar', denda: 'denda', pengadilan: 'pengadilan' } as const;
  const vars = Object.fromEntries(Object.entries(VAR_FIELD).map(([key, field]) => [key, f[field]]));
  const onVar = (key: string, v: string) => {
    const field = VAR_FIELD[key as keyof typeof VAR_FIELD];
    if (field) set(field, field === 'jumlah' ? v.replace(/\D/g, '') : v);
  };

  const hari = f.tanggal ? new Date(`${f.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' }) : '';
  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  const placeDate = [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', ');
  const perusahaan = f.kopMode === 'perusahaan';
  const saksi = f.pakaiSaksi ? f.saksi.slice(0, 2) : [];

  // ---- Unit isi (halaman dipotong di batas unit). g = kelompok: unit sepasal sebisanya di satu halaman.
  const SIGN = -5; // ayat terakhir + penutup & tanda tangan: tidak pernah terpisah
  const pihak = (p: 'p1' | 'p2', blank: boolean) => {
    const v = (key: 'Nama' | 'Nik' | 'Ttl' | 'Kerja' | 'Alamat' | 'Telp') => isian(f[`${p}${key}`], blank);
    return [
      { label: 'Nama', value: v('Nama') }, { label: 'NIK', value: v('Nik') }, { label: 'Tempat/tgl. lahir', value: v('Ttl') },
      { label: p === 'p1' && perusahaan ? 'Jabatan' : 'Pekerjaan', value: v('Kerja') }, { label: 'Alamat', value: v('Alamat') }, { label: 'No. telepon', value: v('Telp') },
    ];
  };
  const units: { el: ReactNode; g: number }[] = [
    { g: -1, el: <P>Pada hari ini {ks ? TITIK : hari}, tanggal {ks ? TITIK : fmtTanggal(f.tanggal)}, bertempat di {f.kota || TITIK}, kami yang bertanda tangan di bawah ini:</P> },
    { g: -2, el: <><InfoRows rows={pihak('p1', false)} />
      <P>Dalam hal ini bertindak untuk dan atas nama {perusahaan ? f.instansi : 'diri sendiri'}, selanjutnya disebut <b>PIHAK PERTAMA</b> (Pemberi Pinjaman).</P></> },
    { g: -3, el: <><InfoRows rows={pihak('p2', ks)} />
      <P>Dalam hal ini bertindak untuk dan atas nama {f.p2Mewakili.trim() ? t(f.p2Mewakili) : 'diri sendiri'}, selanjutnya disebut <b>PIHAK KEDUA</b> (Peminjam).</P></> },
    { g: -4, el: <P>Kedua belah pihak sepakat mengadakan perjanjian hutang piutang dengan ketentuan sebagai berikut:</P> },
  ];
  const para = { margin: `0 0 ${2 * kk}px`, textAlign: 'justify' } as const;
  const shownPasal = f.pasal.filter((p) => p.tag !== 'jaminan' || f.pakaiJaminan);
  const jaminan = ks ? [TITIK, TITIK] : lines(f.jaminan);
  const cell = { border: '1px solid #000', padding: `${2 * kk}px ${5 * kk}px` } as const;
  const row = (c: ReactNode[], head = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: '14% 32% 27% 27%', fontWeight: head ? 700 : undefined, textAlign: 'center', marginTop: -1 }}>
      {c.map((x, i) => <div key={i} style={{ ...cell, marginLeft: i ? -1 : 0, textAlign: i > 1 ? 'right' : 'center' }}>{x}</div>)}
    </div>
  );
  shownPasal.forEach((p, i) => {
    const ayat = lines(p.isi).map((l) => fill(l, data));
    const numbered = ayat.length > 1;
    const items: ReactNode[] = ayat.map((a, j) => (numbered ? <NumList lines={[a]} k={kk} mark={() => `(${j + 1})`} /> : <p style={para}>{a}</p>));
    // Daftar jaminan disisipkan setelah ayat pertama
    if (p.tag === 'jaminan') items.splice(Math.min(1, items.length), 0, ...jaminan.map((x, j) => <div style={{ marginLeft: numbered ? 22 * kk : 0 }}><NumList lines={[x]} k={kk} mark={() => `${String.fromCharCode(97 + j)}.`} /></div>));
    // Jadwal angsuran: header menempel ke baris pertama
    if (p.tag === 'bayar' && cicilan && f.jadwal) {
      const rows = ks ? Array.from({ length: 6 }, (_, j) => [`${j + 1}`, '', '', '']) : jadwal.map((r) => [`${r.ke}`, fmtTanggal(r.tgl), `Rp ${rupiah(r.nominal)}`, `Rp ${rupiah(r.sisa)}`]);
      rows.forEach((r, j) => items.splice(1 + j, 0, <div style={{ margin: `${j ? 0 : 4 * kk}px 0 ${j === rows.length - 1 ? 6 * kk : 0}px` }}>
        {j === 0 && row(['Cicilan ke-', 'Tanggal bayar', 'Nominal', 'Sisa pinjaman'], true)}
        {row(r)}
      </div>));
    }
    if (!items.length) items.push(null);
    const head = (
      <>
        <div style={{ textAlign: 'center', fontWeight: 700 }}>Pasal {i + 1}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 2 * kk }}>{p.judul}</div>
      </>
    );
    const last = i === shownPasal.length - 1;
    items.forEach((el, j) => units.push({ g: last && j === items.length - 1 ? SIGN : i, el: <div style={{ marginBottom: j === items.length - 1 ? 4 * kk : 0 }}>{j === 0 && head}{el}</div> }));
  });
  // Penutup + tanda tangan (+ saksi) satu unit, sekelompok dengan ayat terakhir pasal terakhir
  units.push({
    g: SIGN,
    el: (
      <div style={{ paddingTop: 4 * kk }}>
        <p style={{ ...para, marginBottom: 10 * kk }}>Demikian surat perjanjian hutang piutang ini dibuat dan ditandatangani oleh kedua belah pihak pada hari dan tanggal tersebut di atas.</p>
        <div style={{ textAlign: 'right', marginBottom: 2 * kk }}>{placeDate}</div>
        {/* Peminjam kiri (ruang meterai), pemberi pinjaman kanan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 * kk }}>
          <SignBlock k={kk} align="left" s={{ heading: 'PIHAK KEDUA,', role: 'Peminjam', name: isian(f.p2Nama, ks), ttd: ks ? '' : ttd2.src, ttdOffset: getOffset(f.posisi, 'ttd2') }} />
          <SignBlock k={kk} align="right" s={{ heading: 'PIHAK PERTAMA,', role: 'Pemberi Pinjaman', name: f.p1Nama, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel') }} />
        </div>
        {saksi.length > 0 && (
          <div style={{ marginTop: 10 * kk }}>
            <div style={{ textAlign: 'center', marginBottom: 2 * kk }}>Saksi-saksi:</div>
            <div style={{ display: 'flex', justifyContent: saksi.length > 1 ? 'space-between' : 'center', gap: 16 * kk }}>
              {saksi.map((s, i) => <SignBlock key={s.id} k={kk} align={saksi.length > 1 ? (i ? 'right' : 'left') : 'center'} s={{ heading: `Saksi ${i + 1},`, name: isian(s.nama, ks), ttd: ks ? '' : ttdSaksi[i].src, ttdOffset: getOffset(f.posisi, `ttdSaksi-${s.id}`) }} />)}
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
  const pageKey = useMemo(() => ({}), [f, logo.src, ttd.src, ttd2.src, stempel.src, ttdS0.src, ttdS1.src, look, fontTick]);
  const ranges = usePagination(units.length, units.map((u) => u.g), pageKey, () => letterRef.current);

  // Halaman lampiran foto (selalu sesudah surat; tidak ikut paginasi karena tanpa [data-flow])
  const per = [1, 2, 4].includes(f.fotoPerHal) ? f.fotoPerHal : 2;
  const fotoPages: Foto[][] = [];
  if (f.pakaiFoto) for (let i = 0; i < f.foto.length; i += per) fotoPages.push(f.foto.slice(i, i + per));
  const totalPages = ranges.length + fotoPages.length;
  const lampiranAuto = totalPages > 1 ? `${totalPages - 1} (${kata(totalPages - 1)}) lembar` : '-';
  const lampiran = f.lampiranAuto ? lampiranAuto : ks ? TITIK : f.lampiran || '-';

  const flow = ([a, b]: readonly [number, number]) => <div data-flow>{units.slice(a, b).map((u, i) => <div key={a + i} style={{ display: 'flow-root' }}>{u.el}</div>)}</div>;
  const pageNo = (i: number) => (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: (f.gaya === 'bingkai' ? 5 : 14) * pg.f, textAlign: 'center', fontFamily: look.ff, fontSize: 10 * kk, color: '#444' }}>
      Halaman {i + 1} dari {totalPages}
    </div>
  );
  const pageBox = { position: 'relative', width: pg.W, height: pg.H, overflow: 'hidden', background: '#fff' } as const;
  const plain = { height: '100%', boxSizing: 'border-box', padding: `${40 * pg.f}px ${56 * pg.f}px`, color: '#000', fontFamily: look.ff, fontSize: look.fs || 13 * kk, lineHeight: look.lh, display: 'flex', flexDirection: 'column' } as const;

  // Halaman 1: template terpilih; tempat/tanggal & tanda tangan pindah ke unit penutup (halaman terakhir)
  const doc: LayoutDoc = {
    logo: perusahaan ? logo.src : '', logoOffset: getOffset(f.posisi, 'logo'),
    kopName: perusahaan ? f.instansi : f.p1Nama.toUpperCase(),
    kopLines: perusahaan ? [f.subKop, f.alamat, f.kontak] : [f.p1Kerja, f.p1Alamat, f.p1Telp && `Telp./WA ${f.p1Telp}`],
    title: f.judul, nomor, meta: [{ label: 'Lampiran', value: lampiran }], placeDate: '',
    body: flow(ranges[0]),
    signers: [],
  };
  const pages = ranges.map((r, i) => (
    <div key={i} data-page className="shadow-lg" style={pageBox}>
      {i === 0 ? <LayoutLetter layout={f.gaya} doc={doc} k={kk} W={pg.W} H={pg.H} pf={pg.f} /> : (
        <div style={plain}>
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
  const cols = per === 4 ? 2 : 1;
  const fotoPageEls = fotoPages.map((list, pi) => (
    <div key={`foto${pi}`} data-page className="shadow-lg" style={pageBox}>
      <div style={{ ...plain, paddingBottom: 40 * pg.f + 18 * kk }}>
        <div style={{ textAlign: 'center', marginBottom: 10 * kk }}>
          <div style={{ fontWeight: 700, fontSize: '1.15em', letterSpacing: 1 }}>LAMPIRAN{fotoPages.length > 1 ? ` ${pi + 1}` : ''}</div>
          <div>{f.judul}</div>
          {nomor && <div>Nomor: {nomor}</div>}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(per / cols)}, minmax(0, 1fr))`, gap: 10 * kk }}>
          {list.map((ft, j) => (
            <div key={j} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid #bbb', padding: 6 * kk }}>
              {ks ? <div style={{ flex: 1, minHeight: 0, border: '1px dashed #999' }} /> : <FotoBox foto={ft} style={{ flex: 1, minHeight: 0 }} />}
              <div style={{ textAlign: 'center', marginTop: 4 * kk, fontSize: '0.9em' }}>Foto {pi * per + j + 1}. {ks ? TITIK : ft.ket}</div>
            </div>
          ))}
        </div>
      </div>
      {pageNo(ranges.length + pi)}
    </div>
  ));

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <p className="text-xs text-gray-500">Dokumen {totalPages} halaman{fotoPages.length ? ` (termasuk ${fotoPages.length} halaman lampiran foto)` : ''}; pasal yang tidak muat otomatis berlanjut ke halaman berikutnya.</p>
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: `TTD ${f.p1Nama || 'Pihak Pertama'}` }, { id: 'stempel', label: 'Stempel' }, { id: 'ttd2', label: `TTD ${f.p2Nama || 'Pihak Kedua'}` },
        ...saksi.map((s, i) => ({ id: `ttdSaksi-${s.id}`, label: `TTD ${s.nama || `Saksi ${i + 1}`}` }))]}
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
  const seg = (on: boolean) => `flex-1 min-h-[44px] rounded-lg border text-sm font-medium ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`;
  const txt = (label: string, key: keyof Form) => (
    <Field label={label}><AutoTextarea className={inputCls} value={String(f[key])} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Perjanjian Hutang Piutang</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-perjanjian-hutang-piutang" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <div className="flex gap-2" role="group" aria-label="Jenis kop">
                <button type="button" aria-pressed={!perusahaan} className={seg(!perusahaan)} onClick={() => set('kopMode', 'pribadi')}>Kop pribadi</button>
                <button type="button" aria-pressed={perusahaan} className={seg(perusahaan)} onClick={() => set('kopMode', 'perusahaan')}>Kop perusahaan</button>
              </div>
              {perusahaan ? (<>
                <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
                {txt('Nama perusahaan', 'instansi')}
                {txt('Bidang usaha (baris kedua kop)', 'subKop')}
                {txt('Alamat lengkap', 'alamat')}
                <KontakFields value={f.kontak} onChange={(v) => set('kontak', v)} />
              </>) : (
                <p className="text-xs text-gray-500">Kop pribadi memakai nama, pekerjaan, alamat & telepon Pihak Pertama (pemberi pinjaman).</p>
              )}
            </FormSection>

            <FormSection title="Data Perjanjian">
              {txt('Judul', 'judul')}
              <Field label="Nomor perjanjian"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`012/SPHP/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Kota / tempat', 'kota')}
                <Field label="Tanggal perjanjian"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <p className="text-xs text-gray-500">Hari: {hari || '-'} (otomatis dari tanggal)</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Lampiran</p>
                <div className="flex gap-2" role="group" aria-label="Mode lampiran">
                  <button type="button" aria-pressed={f.lampiranAuto} className={seg(f.lampiranAuto)} onClick={() => set('lampiranAuto', true)}>Otomatis</button>
                  <button type="button" aria-pressed={!f.lampiranAuto} className={seg(!f.lampiranAuto)} onClick={() => set('lampiranAuto', false)}>Manual</button>
                </div>
                {f.lampiranAuto
                  ? <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 text-sm" aria-live="polite">{lampiranAuto} <span className="text-xs text-gray-500">(jumlah lembar sesudah halaman pertama)</span></p>
                  : <AutoTextarea aria-label="Lampiran (manual)" className={inputCls} value={f.lampiran} onChange={(e) => set('lampiran', e.target.value)} />}
              </div>
            </FormSection>

            <FormSection title="Pihak Pertama (Pemberi Pinjaman)">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Nama', 'p1Nama')}
                {txt('NIK', 'p1Nik')}
                {txt('Tempat, tanggal lahir', 'p1Ttl')}
                {txt(perusahaan ? 'Jabatan' : 'Pekerjaan', 'p1Kerja')}
                {txt('No. telepon', 'p1Telp')}
              </div>
              {txt('Alamat', 'p1Alamat')}
              <ImageUpload label={`Tanda tangan — ${f.p1Nama || 'Pihak Pertama'}`} value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel (opsional)" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
            </FormSection>

            <FormSection title="Pihak Kedua (Peminjam)">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Nama', 'p2Nama')}
                {txt('NIK', 'p2Nik')}
                {txt('Tempat, tanggal lahir', 'p2Ttl')}
                {txt('Pekerjaan', 'p2Kerja')}
                {txt('No. telepon', 'p2Telp')}
              </div>
              {txt('Alamat', 'p2Alamat')}
              <Field label="Bertindak atas nama (kosongkan = diri sendiri)"><AutoTextarea className={inputCls} placeholder="mis. CV Maju Bersama" value={f.p2Mewakili} onChange={(e) => set('p2Mewakili', e.target.value)} /></Field>
              <ImageUpload label={`Tanda tangan — ${f.p2Nama || 'Pihak Kedua'} (opsional)`} value={f.ttd2} onChange={(v) => set('ttd2', v)} notify={notify} {...bgFor('ttd2', ttd2)} />
            </FormSection>

            <FormSection title="Pinjaman & Pembayaran">
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Jumlah pinjaman (Rp)"><input inputMode="numeric" className={inputCls} value={f.jumlah} onChange={(e) => set('jumlah', e.target.value.replace(/\D/g, ''))} /></Field>
                <Field label="Jangka waktu (bulan)"><input inputMode="numeric" className={inputCls} value={f.tenor} onChange={(e) => set('tenor', e.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>
              </div>
              <p className="text-xs text-gray-500">Rp {rupiah(pokok)} ({terbilangRupiah(pokok)})</p>
              {txt('Tujuan pinjaman', 'tujuan')}
              <p className="text-sm font-medium text-gray-700">Cara penyerahan uang</p>
              <div className="flex gap-2" role="group" aria-label="Cara penyerahan uang">
                <button type="button" aria-pressed={f.serah === 'tunai'} className={seg(f.serah === 'tunai')} onClick={() => set('serah', 'tunai')}>Tunai</button>
                <button type="button" aria-pressed={f.serah === 'transfer'} className={seg(f.serah === 'transfer')} onClick={() => set('serah', 'transfer')}>Transfer</button>
              </div>
              {f.serah === 'transfer' && txt('Rekening tujuan (bank, nomor, atas nama)', 'rekening')}
              <Field label="Tanggal penyerahan uang"><input type="date" className={inputCls} value={f.tglSerah} onChange={(e) => set('tglSerah', e.target.value)} /></Field>

              <p className="text-sm font-medium text-gray-700">Cara pembayaran</p>
              <div className="flex gap-2" role="group" aria-label="Cara pembayaran">
                <button type="button" aria-pressed={!cicilan} className={seg(!cicilan)} onClick={() => set('bayar', 'sekaligus')}>Sekaligus</button>
                <button type="button" aria-pressed={cicilan} className={seg(cicilan)} onClick={() => set('bayar', 'cicilan')}>Cicilan</button>
              </div>
              {cicilan && (<>
                <Field label="Tanggal cicilan pertama"><input type="date" className={inputCls} value={f.mulaiBayar} onChange={(e) => set('mulaiBayar', e.target.value)} /></Field>
                <p className="text-xs text-gray-500">{n} kali cicilan (= jangka waktu) × Rp {rupiah(perBulan)} per bulan, dibayar setiap tanggal {tglBayar || '-'} (otomatis).</p>
                <Switch checked={f.jadwal} onChange={(v) => set('jadwal', v)} label="Tampilkan tabel jadwal cicilan" hint="Cicilan ke-, tanggal, nominal, dan sisa pinjaman dihitung otomatis." />
              </>)}
              <p className="text-xs text-gray-500">Jatuh tempo: {fmtTanggal(jatuhTempo) || '-'} (otomatis). Total kewajiban: Rp {rupiah(total)}.</p>
              <Switch checked={f.pakaiBunga} onChange={(v) => set('pakaiBunga', v)} label="Pakai bunga" hint="Mati = pinjaman tanpa bunga." />
              {f.pakaiBunga && <Field label="Bunga per bulan (%) dari pokok"><input inputMode="decimal" className={inputCls} value={f.bunga} onChange={(e) => set('bunga', e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} /></Field>}
            </FormSection>

            <FormSection title="Jaminan">
              <Switch checked={f.pakaiJaminan} onChange={(v) => set('pakaiJaminan', v)} label="Pakai jaminan" hint="Mati = pasal Jaminan tidak ditampilkan." />
              {f.pakaiJaminan && <Field label="Daftar barang jaminan (satu per baris)"><AutoTextarea rows={3} className={inputCls} value={f.jaminan} onChange={(e) => set('jaminan', e.target.value)} /></Field>}
            </FormSection>

            <FormSection title="Pasal-pasal" lockable>
              <p className="text-xs text-gray-500">Satu ayat per baris. Kode otomatis: {'{jumlah} {tujuan} {penyerahan} {tglSerah} {tenor} {jatuhTempo} {caraBayar} {metodeBayar} {cicilan} {total} {bunga} {denda} {pengadilan}'}. Saat terkunci, isi kotak kecil untuk mengubah data.</p>
              {f.pasal.map((p, i) => {
                const hidden = p.tag === 'jaminan' && !f.pakaiJaminan;
                return (
                  <div key={i} className={`space-y-2 rounded-lg border p-3 ${hidden ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold shrink-0">Pasal {hidden ? '–' : shownPasal.indexOf(p) + 1}</span>
                      <AutoTextarea aria-label={`Judul pasal ${i + 1}`} className={inputCls} value={p.judul} onChange={(e) => setPasal(i, { judul: e.target.value })} />
                    </div>
                    <NarrativeField label={`Isi pasal ${i + 1}`} rows={2} value={p.isi} onChange={(v) => setPasal(i, { isi: v })} vars={vars} onVar={onVar} />
                    {p.tag === 'jaminan' && <p className="text-xs text-gray-500">{hidden ? 'Disembunyikan (jaminan mati).' : 'Daftar jaminan ditampilkan setelah ayat pertama.'}</p>}
                    {p.tag === 'bayar' && <p className="text-xs text-gray-500">Tabel jadwal cicilan (bila aktif) ditampilkan setelah ayat pertama.</p>}
                    <div className="flex gap-2">
                      <button type="button" className={btn} disabled={i === 0} onClick={() => movePasal(i, -1)} aria-label={`Naikkan pasal ${i + 1}`}>↑</button>
                      <button type="button" className={btn} disabled={i === f.pasal.length - 1} onClick={() => movePasal(i, 1)} aria-label={`Turunkan pasal ${i + 1}`}>↓</button>
                      <button type="button" className={`${btn} text-red-600 border-red-200`} onClick={() => set('pasal', f.pasal.filter((_, j) => j !== i))} aria-label={`Hapus pasal ${i + 1}`}>Hapus</button>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => set('pasal', [...f.pasal, { judul: 'Pasal Tambahan', isi: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah pasal</button>
                <button type="button" onClick={() => { if (confirm('Kembalikan pasal-pasal ke bawaan?')) set('pasal', PASAL_DEFAULT); }} className="min-h-[40px] text-sm font-medium text-gray-600">Kembalikan pasal bawaan</button>
              </div>
            </FormSection>

            <FormSection title="Saksi (opsional)">
              <Switch checked={f.pakaiSaksi} onChange={(v) => set('pakaiSaksi', v)} label="Pakai saksi" hint="Tampil di bawah tanda tangan kedua pihak (maksimal 2 saksi)." />
              {f.pakaiSaksi && (<>
                {f.saksi.slice(0, 2).map((s, i) => (
                  <div key={s.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex gap-2">
                      <AutoTextarea aria-label={`Nama saksi ${i + 1}`} placeholder="Nama saksi" className={inputCls} value={s.nama} onChange={(e) => set('saksi', f.saksi.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} />
                      <button type="button" onClick={() => set('saksi', f.saksi.filter((_, j) => j !== i))} aria-label={`Hapus saksi ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                    </div>
                    <ImageUpload label={`Tanda tangan — ${s.nama || `Saksi ${i + 1}`}`} value={s.ttd} onChange={(v) => set('saksi', f.saksi.map((x, j) => (j === i ? { ...x, ttd: v } : x)))} notify={notify}
                      bg={bgS(i)} onBg={(v) => setBgSaksi((p) => ({ ...p, [s.id]: v }))} shown={ttdSaksi[i].src} bgBusy={ttdSaksi[i].busy} />
                  </div>
                ))}
                {f.saksi.length < 2 && <button type="button" onClick={() => set('saksi', [...f.saksi, toSaksi('')])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah saksi</button>}
              </>)}
            </FormSection>

            <FormSection title="Lampiran Foto Bukti (opsional)">
              <Switch checked={f.pakaiFoto} onChange={(v) => set('pakaiFoto', v)} label="Pakai lampiran foto" hint="Bukti transfer, foto penyerahan uang, KTP, dll. Tampil di halaman LAMPIRAN sesudah surat." />
              {f.pakaiFoto && (<>
                <Field label="Foto per halaman">
                  <select className={inputCls} value={per} onChange={(e) => set('fotoPerHal', Number(e.target.value))}>
                    <option value={1}>1 foto (besar)</option>
                    <option value={2}>2 foto (sedang)</option>
                    <option value={4}>4 foto (kecil)</option>
                  </select>
                </Field>
                <Field label="Tambah foto (bisa pilih beberapa)">
                  <div className="upload-box"><input type="file" accept="image/*" multiple disabled={fotoBusy} onChange={(e) => { addFotos(e.target.files); e.target.value = ''; }} className="text-sm w-full" /></div>
                </Field>
                {f.foto.map((ft, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <FotoBox foto={ft} notify={notify} style={{ width: 56, height: 56, flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: 4 }} />
                      <AutoTextarea aria-label={`Keterangan foto ${i + 1}`} placeholder="Keterangan, mis. Bukti transfer" className={inputCls} value={ft.ket} onChange={(e) => setFoto(i, { ket: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <BgToggle checked={ft.bg} onChange={(v) => setFoto(i, { bg: v })} />
                      <button type="button" className={btn} disabled={i === 0} onClick={() => moveFoto(i, -1)} aria-label={`Naikkan foto ${i + 1}`}>↑</button>
                      <button type="button" className={btn} disabled={i === f.foto.length - 1} onClick={() => moveFoto(i, 1)} aria-label={`Turunkan foto ${i + 1}`}>↓</button>
                      <button type="button" className={`${btn} text-red-600 border-red-200`} onClick={() => setF((x) => ({ ...x, foto: x.foto.filter((_, j) => j !== i) }))} aria-label={`Hapus foto ${i + 1}`}>Hapus</button>
                    </div>
                  </div>
                ))}
                {!f.foto.length && <p className="text-xs text-gray-500">Belum ada foto; halaman lampiran muncul setelah foto ditambahkan.</p>}
              </>)}
              <p className="text-xs text-gray-500">Teks & foto disimpan otomatis di perangkat ini (foto dikecilkan ±1600 px); gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max flex flex-col gap-6">
              {pages}
              {fotoPageEls}
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
