import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { DOTTED, ExportButton, Field, ImageUpload, LETTER_FONT, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, SignBlock, type LayoutDoc } from '../../shared/components/LetterLayouts';
import FormSection, { NarrativeField } from '../../shared/components/FormSection';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import KontakFields from '../../shared/components/KontakFields';

// Surat Pernyataan Hutang (ringkas, 1 halaman): PIHAK PERTAMA berhutang kepada PIHAK KEDUA, janji lunas
// sekaligus / dicicil sampai tanggal tertentu, sanksi bila lewat batas. Tanpa pasal; saksi & lampiran foto opsional.
// Halaman surat memakai tata letak bersama (muat 1 halaman, useFitScale); foto lampiran di halaman terpisah.

// ============================================================
// SECTION: Data
// ============================================================
type Foto = { src: string; ket: string; bg: boolean };
// id stabil per saksi: kunci offset tanda tangan tidak bergeser saat saksi dihapus
type Saksi = { id: string; nama: string; ttd: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  kopMode: 'perusahaan' | 'pribadi';
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; lampiranAuto: boolean; lampiran: string;
  p1Nama: string; p1Nik: string; p1Alamat: string; p1Telp: string;
  p2Nama: string; p2Nik: string; p2Alamat: string; p2Telp: string;
  jumlah: string; bayar: 'lunas' | 'cicil'; tglLunas: string; kaliCicil: string; tampilNominal: boolean; sanksi: string;
  narHutang: string; narLunas: string; narCicil: string; narSanksi: string; narPenutup: string;
  ttd1: string; ttd2: string;
  pakaiSaksi: boolean; saksi: Saksi[];
  pakaiFoto: boolean; fotoPerHal: number; foto: Foto[];
};

const STORAGE_KEY = 'surat-hutang-ringkas:v1';
const POLA = '{n3}/SPH/{rom}/{yyyy}';
const iso = (d: Date) => d.toISOString().slice(0, 10);
const newId = () => Math.random().toString(36).slice(2, 8);
const toSaksi = (s: string | Partial<Saksi>): Saksi => typeof s === 'string' ? { id: newId(), nama: s, ttd: '' } : { id: s.id || newId(), nama: s.nama ?? '', ttd: s.ttd ?? '' };
// "empat" (angka biasa, tanpa "rupiah")
const kata = (n: number) => terbilangRupiah(n).replace(/ rupiah$/, '').toLowerCase();

const NAR = {
  narHutang: 'PIHAK PERTAMA mengakui telah menerima pinjaman uang dari PIHAK KEDUA sebesar {jumlah}.',
  narLunas: 'PIHAK PERTAMA berjanji akan membayar lunas seluruh hutang tersebut secara sekaligus kepada PIHAK KEDUA paling lambat pada tanggal {tanggalLunas}.',
  narCicil: 'PIHAK PERTAMA berjanji membayar hutang tersebut dengan dicicil {kaliCicil} kali{nominalCicil} dan lunas paling lambat tanggal {tanggalLunas}.',
  narSanksi: 'Apabila melewati batas waktu tersebut hutang belum lunas, PIHAK PERTAMA bersedia menerima sanksi berupa {sanksi}.',
  narPenutup: 'Demikian surat pernyataan ini dibuat dengan sadar dan tanpa paksaan dari pihak mana pun.',
};
const SANKSI = [
  { label: 'Denda per hari', text: 'denda Rp 50.000 (lima puluh ribu rupiah) per hari keterlambatan' },
  { label: 'Kekeluargaan lalu hukum', text: 'penyelesaian secara kekeluargaan terlebih dahulu, dan apabila tidak tercapai kesepakatan, PIHAK KEDUA berhak menempuh jalur hukum sesuai ketentuan yang berlaku' },
  { label: 'Jaminan diserahkan', text: 'penyerahan barang jaminan berupa 1 (satu) unit sepeda motor beserta BPKB-nya kepada PIHAK KEDUA sebagai pelunasan hutang' },
];

const makeDefault = (): Form => {
  const now = new Date();
  const lunas = new Date(now.getFullYear(), now.getMonth() + 4, now.getDate());
  return {
    gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
    pakaiNomor: true, kosong: false,
    kopMode: 'pribadi',
    logo: '', instansi: 'CV BERKAH USAHA MANDIRI', subKop: 'Perdagangan Umum & Simpan Pinjam',
    alamat: 'Jl. Pemuda No. 27, Kel. Rawamangun, Kec. Pulo Gadung, Jakarta Timur, DKI Jakarta 13220',
    kontak: 'Telp. (021) 4789-1234 • admin@berkahusaha.co.id • www.berkahusaha.co.id',
    judul: 'SURAT PERNYATAAN HUTANG', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: iso(now), lampiranAuto: true, lampiran: '-',
    p1Nama: 'Agus Setiawan', p1Nik: '3175030907900005', p1Alamat: 'Jl. Melati No. 21, RT 002/RW 006, Jatinegara, Cakung, Jakarta Timur', p1Telp: '0857-1234-5678',
    p2Nama: 'Bambang Supriyadi', p2Nik: '3175021204780003', p2Alamat: 'Jl. Cempaka Baru No. 8, RT 005/RW 003, Rawamangun, Jakarta Timur', p2Telp: '0812-8765-4321',
    jumlah: '5000000', bayar: 'cicil', tglLunas: iso(lunas), kaliCicil: '4', tampilNominal: true, sanksi: SANKSI[0].text,
    ...NAR,
    ttd1: '', ttd2: '',
    pakaiSaksi: true, saksi: ['Rudi Hartono', 'Siti Aminah'].map(toSaksi),
    pakaiFoto: false, fotoPerHal: 2, foto: [],
  };
};

// Data User: kop surat & kota + posisi gambar (bukan isi pernyataan)
const USER_KEYS = ['logo', 'posisi', 'kopMode', 'instansi', 'subKop', 'alamat', 'kontak', 'kota'] as const;

// Narasi: {kunci} diganti isi (boleh elemen); kunci tak dikenal dibiarkan apa adanya
const fill = (text: string, d: Record<string, ReactNode>) =>
  text.split(/(\{\w+\})/g).map((s, i) => {
    const m = /^\{(\w+)\}$/.exec(s);
    return m && m[1] in d ? <Fragment key={i}>{d[m[1]]}</Fragment> : s;
  });

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

// Foto lampiran (Hapus BG opsional). Latar CSS `contain`: html2canvas tidak mendukung object-fit.
function FotoBox({ foto, style, notify }: { foto: Foto; style?: CSSProperties; notify?: Notify }) {
  const r = useBgRemoved(foto.src, foto.bg, notify && ((m) => notify('error', m)));
  return <div role="img" aria-label={foto.ket || 'Foto lampiran'} style={{ background: `url("${r.src}") center / contain no-repeat`, ...style }} />;
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratHutangRingkas() {
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

  const [bg, setBg] = useState({ logo: true, ttd1: true, ttd2: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd1 = useBgRemoved(f.ttd1, bg.ttd1, bgError);
  const ttd2 = useBgRemoved(f.ttd2, bg.ttd2, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  // Tanda tangan saksi (maks. 2): Hapus BG per id saksi, bawaan aktif
  const [bgSaksi, setBgSaksi] = useState<Record<string, boolean>>({});
  const bgS = (i: number) => bgSaksi[f.saksi[i]?.id ?? ''] ?? true;
  const ttdS0 = useBgRemoved(f.saksi[0]?.ttd ?? '', bgS(0), bgError);
  const ttdS1 = useBgRemoved(f.saksi[1]?.ttd ?? '', bgS(1), bgError);
  const ttdSaksi = [ttdS0, ttdS1];
  const busy = logo.busy || ttd1.busy || ttd2.busy || ttdS0.busy || ttdS1.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
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
  const k = useFitScale(f.skala / 100, () => letterRef.current?.querySelector('[data-page]')?.firstElementChild as HTMLElement, true, [f, logo.src, ttd1.src, ttd2.src, ttdS0.src, ttdS1.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-pernyataan-hutang-${(f.nomor || 'sph').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // ---- Hitungan & nilai di narasi
  const ks = f.kosong;
  const jumlah = Math.max(0, Math.round(num(f.jumlah)));
  const kali = Math.max(1, Math.round(num(f.kaliCicil)) || 1);
  const cicil = f.bayar === 'cicil';
  const perCicil = Math.round(jumlah / kali);
  const dataStyle = { fontWeight: 700, fontStyle: 'italic', borderBottom: DOTTED, paddingBottom: '0.22em' } as const;
  const rp = (v: number) => <span style={dataStyle}>{ks ? `Rp ${TITIK}` : `Rp ${rupiah(v)} (${terbilangRupiah(v)})`}</span>;
  const t = (v: string) => (ks || !v ? TITIK : v);
  const data: Record<string, ReactNode> = {
    jumlah: rp(jumlah),
    tanggalLunas: <b>{t(fmtTanggal(f.tglLunas))}</b>,
    kaliCicil: <b>{ks ? TITIK : `${kali} (${kata(kali)})`}</b>,
    nominalCicil: f.tampilNominal ? <>, masing-masing sebesar {rp(perCicil)},</> : '',
    sanksi: t(f.sanksi),
  };
  // Isian kecil saat narasi terkunci (nilai form mentah); tanggal diisi lewat pemilih tanggal di kartu yang sama
  const vars = { jumlah: f.jumlah, kaliCicil: f.kaliCicil, sanksi: f.sanksi };
  const onVar = (key: string, v: string) => {
    if (key === 'jumlah') set('jumlah', v.replace(/\D/g, ''));
    if (key === 'kaliCicil') set('kaliCicil', v.replace(/\D/g, '').slice(0, 3));
    if (key === 'sanksi') set('sanksi', v);
  };

  const nomor = nomorTampil(f.nomor, f.pakaiNomor, ks);
  const placeDate = [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', ');
  const perusahaan = f.kopMode === 'perusahaan';
  const saksi = f.pakaiSaksi ? f.saksi.slice(0, 2) : [];
  const img = (src: string) => (ks ? '' : src);
  // NIK & telepon satu baris agar surat tetap muat 1 halaman
  const pihak = (p: 'p1' | 'p2') => [
    { label: 'Nama', value: isian(f[`${p}Nama`], ks) },
    { label: 'NIK / No. telepon', value: isian([f[`${p}Nik`], f[`${p}Telp`]].filter(Boolean).join(' / '), ks) },
    { label: 'Alamat', value: isian(f[`${p}Alamat`], ks) },
  ];

  // Halaman lampiran foto (selalu sesudah surat 1 halaman)
  const per = [1, 2, 4].includes(f.fotoPerHal) ? f.fotoPerHal : 2;
  const fotoPages: Foto[][] = [];
  if (f.pakaiFoto) for (let i = 0; i < f.foto.length; i += per) fotoPages.push(f.foto.slice(i, i + per));
  const lampiranAuto = fotoPages.length ? `${fotoPages.length} (${kata(fotoPages.length)}) lembar` : '-';
  const lampiran = f.lampiranAuto ? lampiranAuto : ks ? TITIK : f.lampiran || '-';

  // Tempat/tanggal & tanda tangan di body: dua pihak rata kiri–kanan, saksi di baris bawah
  const doc: LayoutDoc = {
    logo: perusahaan ? logo.src : '', logoOffset: getOffset(f.posisi, 'logo'),
    kopName: perusahaan ? f.instansi : f.p1Nama.toUpperCase(),
    kopLines: perusahaan ? [f.subKop, f.alamat, f.kontak] : [f.p1Alamat, f.p1Telp && `Telp./WA ${f.p1Telp}`],
    title: f.judul, nomor, meta: [{ label: 'Lampiran', value: lampiran }], placeDate: '',
    body: (
      <>
        <P>Yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={pihak('p1')} />
        <P>selanjutnya disebut <b>PIHAK PERTAMA</b> (yang berhutang), menyatakan mempunyai hutang kepada:</P>
        <InfoRows rows={pihak('p2')} />
        <P>selanjutnya disebut <b>PIHAK KEDUA</b> (pemberi pinjaman). {fill(f.narHutang, data)}</P>
        <P>{fill(cicil ? f.narCicil : f.narLunas, data)}</P>
        <P>{fill(f.narSanksi, data)}</P>
        <P>{fill(f.narPenutup, data)}</P>
        <div style={{ textAlign: 'right', margin: `${4 * kk}px 0 ${2 * kk}px` }}>{placeDate}</div>
        {/* Yang berhutang kiri (ruang meterai), pemberi pinjaman kanan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 * kk }}>
          <SignBlock k={kk} align="left" s={{ heading: 'PIHAK PERTAMA,', name: isian(f.p1Nama, ks), ttd: img(ttd1.src), ttdOffset: getOffset(f.posisi, 'ttd1') }} />
          <SignBlock k={kk} align="right" s={{ heading: 'PIHAK KEDUA,', name: isian(f.p2Nama, ks), ttd: img(ttd2.src), ttdOffset: getOffset(f.posisi, 'ttd2') }} />
        </div>
        {saksi.length > 0 && (
          <div style={{ marginTop: 6 * kk }}>
            <div style={{ display: 'flex', justifyContent: saksi.length > 1 ? 'space-between' : 'center', gap: 16 * kk }}>
              {saksi.map((s, i) => <SignBlock key={s.id} k={kk} align={saksi.length > 1 ? (i ? 'right' : 'left') : 'center'} s={{ heading: `Saksi ${i + 1}`, name: isian(s.nama, ks), ttd: img(ttdSaksi[i].src), ttdOffset: getOffset(f.posisi, `ttdSaksi-${s.id}`) }} />)}
            </div>
          </div>
        )}
      </>
    ),
    signers: [],
  };

  const pageBox = { position: 'relative', width: pg.W, height: pg.H, overflow: 'hidden', background: '#fff' } as const;
  const plain = { height: '100%', boxSizing: 'border-box', padding: `${40 * pg.f}px ${56 * pg.f}px`, color: '#000', fontFamily: LETTER_FONT, fontSize: 13 * kk, lineHeight: 1.45, display: 'flex', flexDirection: 'column' } as const;
  const cols = per === 4 ? 2 : 1;
  const fotoPageEls = fotoPages.map((list, pi) => (
    <div key={`foto${pi}`} data-page className="shadow-lg" style={pageBox}>
      <div style={plain}>
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
    </div>
  ));

  const [geser, setGeser] = useState('ttd1');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[...(perusahaan ? [{ id: 'logo', label: 'Logo' }] : []),
        { id: 'ttd1', label: `TTD ${f.p1Nama || 'Pihak Pertama'}` }, { id: 'ttd2', label: `TTD ${f.p2Nama || 'Pihak Kedua'}` },
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
  const nar = (label: string, key: keyof typeof NAR) => (
    <NarrativeField label={label} rows={2} value={f[key]} onChange={(v) => set(key, v)} vars={vars} onVar={onVar} />
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pernyataan Hutang (Ringkas)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-hutang-ringkas" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

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
                <p className="text-xs text-gray-500">Kop pribadi memakai nama, alamat & telepon Pihak Pertama (yang berhutang).</p>
              )}
            </FormSection>

            <FormSection title="Data Surat">
              {txt('Judul', 'judul')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`012/SPH/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Kota / tempat', 'kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Lampiran</p>
                <div className="flex gap-2" role="group" aria-label="Mode lampiran">
                  <button type="button" aria-pressed={f.lampiranAuto} className={seg(f.lampiranAuto)} onClick={() => set('lampiranAuto', true)}>Otomatis</button>
                  <button type="button" aria-pressed={!f.lampiranAuto} className={seg(!f.lampiranAuto)} onClick={() => set('lampiranAuto', false)}>Manual</button>
                </div>
                {f.lampiranAuto
                  ? <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 text-sm" aria-live="polite">{lampiranAuto} <span className="text-xs text-gray-500">(jumlah halaman lampiran foto)</span></p>
                  : <AutoTextarea aria-label="Lampiran (manual)" className={inputCls} value={f.lampiran} onChange={(e) => set('lampiran', e.target.value)} />}
              </div>
            </FormSection>

            <FormSection title="Pihak Pertama (Yang Berhutang)">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Nama', 'p1Nama')}
                {txt('NIK', 'p1Nik')}
                {txt('No. telepon', 'p1Telp')}
              </div>
              {txt('Alamat', 'p1Alamat')}
              <ImageUpload label={`Tanda tangan — ${f.p1Nama || 'Pihak Pertama'}`} value={f.ttd1} onChange={(v) => set('ttd1', v)} notify={notify} {...bgFor('ttd1', ttd1)} />
            </FormSection>

            <FormSection title="Pihak Kedua (Pemberi Pinjaman)">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Nama', 'p2Nama')}
                {txt('NIK', 'p2Nik')}
                {txt('No. telepon', 'p2Telp')}
              </div>
              {txt('Alamat', 'p2Alamat')}
              <ImageUpload label={`Tanda tangan — ${f.p2Nama || 'Pihak Kedua'}`} value={f.ttd2} onChange={(v) => set('ttd2', v)} notify={notify} {...bgFor('ttd2', ttd2)} />
            </FormSection>

            <FormSection title="Hutang, Pelunasan & Sanksi" lockable>
              <Field label="Jumlah hutang (Rp)"><input inputMode="numeric" className={inputCls} value={f.jumlah} onChange={(e) => set('jumlah', e.target.value.replace(/\D/g, ''))} /></Field>
              <p className="text-xs text-gray-500">Rp {rupiah(jumlah)} ({terbilangRupiah(jumlah)})</p>
              <p className="text-sm font-medium text-gray-700">Cara pelunasan</p>
              <div className="flex gap-2" role="group" aria-label="Cara pelunasan">
                <button type="button" aria-pressed={!cicil} className={seg(!cicil)} onClick={() => set('bayar', 'lunas')}>Lunas sekaligus</button>
                <button type="button" aria-pressed={cicil} className={seg(cicil)} onClick={() => set('bayar', 'cicil')}>Dicicil</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label={cicil ? 'Lunas paling lambat' : 'Tanggal pelunasan'}><input type="date" className={inputCls} value={f.tglLunas} onChange={(e) => set('tglLunas', e.target.value)} /></Field>
                {cicil && <Field label="Berapa kali cicilan"><input inputMode="numeric" className={inputCls} value={f.kaliCicil} onChange={(e) => set('kaliCicil', e.target.value.replace(/\D/g, '').slice(0, 3))} /></Field>}
              </div>
              {cicil && <Switch checked={f.tampilNominal} onChange={(v) => set('tampilNominal', v)} label={`Tampilkan nominal per cicilan (Rp ${rupiah(perCicil)})`} hint="Otomatis = jumlah hutang ÷ jumlah cicilan, dibulatkan." />}
              <Field label="Sanksi bila melewati batas">
                <div className="flex flex-wrap gap-2 mb-2">
                  {SANKSI.map((s) => <button key={s.label} type="button" className={`${btn} ${f.sanksi === s.text ? 'border-blue-600 text-blue-700' : ''}`} aria-pressed={f.sanksi === s.text} onClick={() => set('sanksi', s.text)}>{s.label}</button>)}
                </div>
                <AutoTextarea aria-label="Sanksi" className={inputCls} value={f.sanksi} onChange={(e) => set('sanksi', e.target.value)} />
              </Field>
              <p className="text-xs text-gray-500">Kode di narasi: {'{jumlah} {kaliCicil} {sanksi}'} (kotak kecil saat terkunci), {'{tanggalLunas} {nominalCicil}'} (otomatis dari isian di atas).</p>
              {nar('Pengakuan hutang', 'narHutang')}
              {cicil ? nar('Janji pelunasan (dicicil)', 'narCicil') : nar('Janji pelunasan (lunas sekaligus)', 'narLunas')}
              {nar('Sanksi', 'narSanksi')}
              {nar('Penutup', 'narPenutup')}
              <button type="button" onClick={() => { if (confirm('Kembalikan narasi ke bawaan?')) setF((p) => ({ ...p, ...NAR })); }} className="min-h-[40px] text-sm font-medium text-gray-600">Kembalikan narasi bawaan</button>
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

            <FormSection title="Lampiran Foto (opsional)">
              <Switch checked={f.pakaiFoto} onChange={(v) => set('pakaiFoto', v)} label="Pakai lampiran foto" hint="Bukti transfer, KTP, dll. Tampil di halaman LAMPIRAN sesudah surat." />
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
              <p className="text-xs text-gray-500">Teks & foto disimpan otomatis di perangkat ini (foto dikecilkan ±1600 px).</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max flex flex-col gap-6">
              <div data-page className="shadow-lg" style={pageBox}>
                <LayoutLetter layout={f.gaya} doc={doc} k={kk} W={pg.W} H={pg.H} pf={pg.f} />
              </div>
              {fotoPageEls}
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
