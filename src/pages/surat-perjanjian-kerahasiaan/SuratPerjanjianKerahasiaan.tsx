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
import { ExportButton, Field, ImageUpload, LETTER_FONT, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, SignBlock, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { usePagination } from '../surat-kontrak-kerja/usePagination';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import FormSection, { NarrativeField } from '../../shared/components/FormSection';
import { LampiranField, lampiranTeks } from '../surat-kontrak-kerja/Lampiran';
import KontakFields from '../../shared/components/KontakFields';

// Surat Perjanjian Kerahasiaan (NDA) Karyawan: pasal-pasal bisa diedit/ditambah/dihapus/diurutkan,
// dokumen panjang berlanjut otomatis ke halaman berikut (paginasi milik Kontrak Kerja). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Pasal = { judul: string; isi: string }; // isi: satu ayat per baris
type Saksi = { id: string; nama: string; ttd: string }; // id tetap: kunci geseran tanda tangan
const newId = () => Math.random().toString(36).slice(2, 8);
// Data lama: saksi berupa string → objek ber-id
const toSaksi = (s: string | Partial<Saksi>): Saksi => (typeof s === 'string' ? { id: newId(), nama: s, ttd: '' } : { nama: '', ttd: '', ...s, id: s.id || newId() });
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; lampiranAuto: boolean; lampiran: string;
  p1Nama: string; p1Jabatan: string;
  nama: string; nik: string; jabatan: string; alamatK: string;
  tahun: string; pengadilan: string; pasal: Pasal[];
  ttd: string; stempel: string; ttdK: string; saksi: Saksi[];
};

const STORAGE_KEY = 'surat-perjanjian-kerahasiaan:v1';
const POLA = '{n3}/NDA/HRD/{rom}/{yyyy}';

const PASAL_DEFAULT: Pasal[] = [
  { judul: 'Definisi Informasi Rahasia', isi: 'Informasi Rahasia adalah setiap data, dokumen, dan informasi milik {perusahaan}, baik tertulis, lisan, elektronik, maupun dalam bentuk lain, yang diketahui atau diperoleh {karyawan} selama bekerja sebagai {jabatan}.\nInformasi Rahasia meliputi namun tidak terbatas pada data pelanggan dan pemasok, harga dan strategi penjualan, data keuangan, data karyawan, rahasia dagang, desain, kode sumber, proses produksi, serta rencana bisnis perusahaan.' },
  { judul: 'Kewajiban Menjaga Kerahasiaan', isi: 'PIHAK KEDUA wajib menjaga Informasi Rahasia dengan sebaik-baiknya dan hanya menggunakannya untuk kepentingan pelaksanaan tugas di {perusahaan}.\nPIHAK KEDUA dilarang mengungkapkan, menyalin, menggandakan, memindahkan, atau menyebarkan Informasi Rahasia kepada pihak mana pun tanpa persetujuan tertulis dari PIHAK PERTAMA.\nPIHAK KEDUA dilarang menyimpan Informasi Rahasia pada perangkat atau akun pribadi, termasuk surel pribadi, layanan penyimpanan awan, dan media sosial.\nPIHAK KEDUA wajib segera melaporkan kepada PIHAK PERTAMA apabila mengetahui adanya kebocoran atau penyalahgunaan Informasi Rahasia.' },
  { judul: 'Pengecualian', isi: 'Kewajiban kerahasiaan tidak berlaku terhadap informasi yang telah menjadi milik umum bukan karena kesalahan PIHAK KEDUA.\nKewajiban kerahasiaan juga tidak berlaku terhadap informasi yang telah diketahui secara sah oleh PIHAK KEDUA sebelum bekerja di {perusahaan}, dibuktikan dengan dokumen tertulis.\nPengungkapan yang diwajibkan oleh peraturan perundang-undangan atau perintah pengadilan dapat dilakukan, dengan ketentuan PIHAK KEDUA terlebih dahulu memberitahukannya secara tertulis kepada PIHAK PERTAMA.' },
  { judul: 'Pengembalian Dokumen dan Data', isi: 'Pada saat hubungan kerja berakhir atau sewaktu-waktu diminta oleh PIHAK PERTAMA, PIHAK KEDUA wajib mengembalikan seluruh dokumen, data, perangkat, dan salinan yang memuat Informasi Rahasia.\nPIHAK KEDUA wajib menghapus secara permanen Informasi Rahasia yang tersimpan pada perangkat atau media yang tidak dapat dikembalikan, serta menyatakan secara tertulis bahwa penghapusan telah dilakukan.' },
  { judul: 'Jangka Waktu', isi: 'Perjanjian ini berlaku sejak tanggal ditandatangani, selama PIHAK KEDUA bekerja di {perusahaan}, dan tetap berlaku selama {tahun} tahun setelah hubungan kerja berakhir dengan alasan apa pun.' },
  { judul: 'Sanksi', isi: 'Pelanggaran atas perjanjian ini merupakan pelanggaran berat dan dapat dikenai sanksi sesuai peraturan perusahaan, termasuk pemutusan hubungan kerja.\nPIHAK KEDUA wajib mengganti seluruh kerugian yang diderita PIHAK PERTAMA akibat pelanggaran tersebut, tanpa mengurangi hak PIHAK PERTAMA untuk menempuh upaya hukum perdata maupun pidana sesuai peraturan perundang-undangan.' },
  { judul: 'Penyelesaian Sengketa', isi: 'Perselisihan yang timbul dari perjanjian ini diselesaikan secara musyawarah untuk mufakat.\nApabila musyawarah tidak tercapai dalam waktu 30 (tiga puluh) hari, kedua belah pihak sepakat menyelesaikannya melalui {pengadilan}.' },
  { judul: 'Penutup', isi: 'Hal-hal yang belum diatur dalam perjanjian ini akan diatur kemudian berdasarkan kesepakatan kedua belah pihak.\nPerjanjian ini dibuat rangkap 2 (dua), masing-masing bermeterai cukup dan mempunyai kekuatan hukum yang sama, serta ditandatangani kedua belah pihak dalam keadaan sadar tanpa paksaan dari pihak mana pun.' },
];

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT ARTHA TEKNOLOGI NUSANTARA', subKop: 'Konsultan & Pengembang Sistem Informasi Bisnis',
  alamat: 'Jl. Gatot Subroto Kav. 32, Kel. Kuningan Timur, Kec. Setiabudi, Jakarta Selatan, DKI Jakarta 12950',
  kontak: 'Telp. (021) 5277-8899 • legal@arthatek.co.id • www.arthatek.co.id',
  judul: 'PERJANJIAN KERAHASIAAN', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: new Date().toISOString().slice(0, 10), lampiranAuto: true, lampiran: '',
  p1Nama: 'Bambang Suryadi', p1Jabatan: 'Direktur Utama',
  nama: 'Fitri Handayani', nik: '3174056203950004', jabatan: 'Staf Keuangan',
  alamatK: 'Jl. Melati No. 21, RT 002/RW 005, Kel. Pejaten Barat, Pasar Minggu, Jakarta Selatan',
  tahun: '2 (dua)', pengadilan: 'Pengadilan Negeri Jakarta Selatan', pasal: PASAL_DEFAULT,
  ttd: '', stempel: '', ttdK: '', saksi: [],
});

// Data User: identitas kop, penanda tangan perusahaan & gambar (bukan isi perjanjian)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'p1Nama', 'p1Jabatan', 'pengadilan', 'ttd', 'stempel'] as const;

// Ganti {kunci} di teks pasal dengan data; kunci tak dikenal dibiarkan apa adanya
const isiToken = (text: string, data: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, key: string) => (key in data ? data[key] : m));
console.assert(isiToken('a {x} {y}', { x: '1' }) === 'a 1 {y}', 'isiToken');
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
function Ayat({ mark, text, k }: { mark: string; text: string; k: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, margin: `0 0 ${2 * k}px ${12 * k}px` }}>
      <span>{mark}</span><span style={{ textAlign: 'justify' }}>{text}</span>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPerjanjianKerahasiaan() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved, nomor: orRandomNo(saved.nomor, POLA), saksi: (saved.saksi ?? []).map(toSaksi) } : d;
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdK: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdK = useBgRemoved(f.ttdK, bg.ttdK, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  // Tanda tangan saksi (maks. 3): 3 slot tetap agar jumlah hook tidak berubah; Hapus BG per id saksi
  const [bgS, setBgS] = useState<Record<string, boolean>>({});
  const onS = (i: number) => !!f.saksi[i] && (bgS[f.saksi[i].id] ?? true);
  const ttdS = [useBgRemoved(f.saksi[0]?.ttd ?? '', onS(0), bgError), useBgRemoved(f.saksi[1]?.ttd ?? '', onS(1), bgError), useBgRemoved(f.saksi[2]?.ttd ?? '', onS(2), bgError)];
  const busy = logo.busy || ttd.busy || stempel.busy || ttdK.busy || ttdS.some((x) => x.busy);

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
  const k = f.skala / 100; // huruf normal (tidak dikecilkan otomatis); isi panjang berlanjut ke halaman berikut
  const kk = k * pg.f * 0.86;
  const fileName = `nda-${(f.nomor || 'perjanjian').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...letterRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  const ks = f.kosong;
  const t = (v: string) => (ks || !v.trim() ? TITIK : v);
  const data: Record<string, string> = {
    perusahaan: f.instansi || TITIK, karyawan: t(f.nama), jabatan: t(f.jabatan), tahun: t(f.tahun), pengadilan: f.pengadilan || TITIK, kota: f.kota || TITIK,
  };
  const hari = f.tanggal ? new Date(`${f.tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' }) : '';
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
      { label: 'Jabatan', value: isian(f.jabatan, ks) }, { label: 'Alamat', value: isian(f.alamatK, ks) },
    ]} />
      <P>Dalam hal ini bertindak untuk dan atas nama diri sendiri sebagai karyawan PIHAK PERTAMA, selanjutnya disebut <b>PIHAK KEDUA</b>.</P></> },
    { g: -4, el: <P>Kedua belah pihak sepakat untuk mengadakan Perjanjian Kerahasiaan (Non-Disclosure Agreement) dengan ketentuan sebagai berikut:</P> },
  ];
  const para = { margin: `0 0 ${2 * kk}px`, textAlign: 'justify' } as const;
  f.pasal.forEach((p, i) => {
    const ayat = lines(isiToken(p.isi, data));
    const items: ReactNode[] = ayat.map((a, j) => (ayat.length > 1 ? <Ayat mark={`(${j + 1})`} text={a} k={kk} /> : <p style={para}>{a}</p>));
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
        {/* Pihak Kedua (karyawan) kiri dengan ruang meterai, Pihak Pertama (perusahaan, + stempel) kanan */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 * kk }}>
          <SignBlock s={{ heading: 'PIHAK KEDUA,', role: 'Karyawan', name: isian(f.nama, ks), ttd: ks ? '' : ttdK.src, ttdOffset: getOffset(f.posisi, 'ttdKaryawan') }} k={kk} />
          <SignBlock k={kk} align="right" s={{ heading: 'PIHAK PERTAMA,', role: f.p1Jabatan, name: f.p1Nama, ttd: ks ? '' : ttd.src, stempel: ks ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true }} />
        </div>
        {f.saksi.length > 0 && (
          <div style={{ marginTop: 10 * kk }}>
            <div style={{ textAlign: 'center', marginBottom: 2 * kk }}>Saksi-saksi:</div>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: 12 * kk }}>
              {f.saksi.map((s, i) => <SignBlock key={s.id} s={{ heading: `Saksi ${i + 1},`, name: isian(s.nama, ks), ttd: ks ? '' : ttdS[i]?.src, ttdOffset: getOffset(f.posisi, `ttdSaksi_${s.id}`) }} k={kk} width={130} />)}
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
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        { id: 'ttd', label: `TTD ${f.p1Nama || 'Pihak Pertama'}` }, { id: 'stempel', label: 'Stempel' },
        { id: 'ttdKaryawan', label: `TTD ${f.nama || 'Pihak Kedua'}` },
        ...f.saksi.map((s, i) => ({ id: `ttdSaksi_${s.id}`, label: `TTD ${s.nama || `Saksi ${i + 1}`}` })),
      ]}
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
  const text = (key: keyof Form, label: string, rows?: number) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );
  const btn = 'px-3 min-h-[40px] rounded-lg border text-sm font-medium disabled:opacity-40';
  // Kunci narasi: {kunci} di pasal → field form yang mengisinya
  const NAR: Record<string, keyof Form> = { perusahaan: 'instansi', karyawan: 'nama', jabatan: 'jabatan', tahun: 'tahun', pengadilan: 'pengadilan', kota: 'kota' };
  const narVars = Object.fromEntries(Object.entries(NAR).map(([key, fk]) => [key, f[fk] as string]));
  const onVar = (key: string, v: string) => set(NAR[key], v as never);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Perjanjian Kerahasiaan (NDA) Karyawan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-perjanjian-kerahasiaan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              <KontakFields value={f.kontak} onChange={(v) => set('kontak', v)} />
            </FormSection>

            <FormSection title="Data Perjanjian">
              {text('judul', 'Judul')}
              <Field label="Nomor perjanjian"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`009/NDA/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal perjanjian"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {text('tahun', 'Berlaku setelah keluar (tahun), mis. 2 (dua)')}
                {text('pengadilan', 'Tempat penyelesaian sengketa')}
              </div>
              <LampiranField auto={f.lampiranAuto} manual={f.lampiran} pages={ranges.length} onAuto={(v) => set('lampiranAuto', v)} onManual={(v) => set('lampiran', v)} />
            </FormSection>

            <FormSection title="Pihak Pertama (Perusahaan)">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('p1Nama', 'Nama wakil perusahaan')}
                {text('p1Jabatan', 'Jabatan')}
              </div>
              <ImageUpload label={`Tanda tangan — ${f.p1Nama || 'Pihak Pertama'}`} value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
            </FormSection>

            <FormSection title="Pihak Kedua (Karyawan)">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama')}
                {text('nik', 'NIK')}
                {text('jabatan', 'Jabatan')}
              </div>
              {text('alamatK', 'Alamat')}
              <ImageUpload label={`Tanda tangan — ${f.nama || 'Pihak Kedua'}`} value={f.ttdK} onChange={(v) => set('ttdK', v)} notify={notify} {...bgFor('ttdK', ttdK)} />
            </FormSection>

            <FormSection title="Pasal-pasal" lockable>
              <p className="text-xs text-gray-500">Satu ayat per baris. Kode yang terisi otomatis: {'{perusahaan} {karyawan} {jabatan} {tahun} {pengadilan} {kota}'}. Saat narasi terkunci, kotak isian langsung mengubah data form terkait.</p>
              {f.pasal.map((p, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold shrink-0">Pasal {i + 1}</span>
                    <AutoTextarea aria-label={`Judul pasal ${i + 1}`} className={inputCls} value={p.judul} onChange={(e) => setPasal(i, { judul: e.target.value })} />
                  </div>
                  <NarrativeField label={`Isi pasal ${i + 1}`} rows={2} value={p.isi} onChange={(v) => setPasal(i, { isi: v })} vars={narVars} onVar={onVar} />
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
                <div key={s.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <AutoTextarea aria-label={`Nama saksi ${i + 1}`} placeholder="Nama saksi" className={inputCls} value={s.nama} onChange={(e) => set('saksi', f.saksi.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} />
                    <button type="button" onClick={() => set('saksi', f.saksi.filter((_, j) => j !== i))} aria-label={`Hapus saksi ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                  </div>
                  <ImageUpload label={`Tanda tangan — ${s.nama || `Saksi ${i + 1}`}`} value={s.ttd} notify={notify}
                    onChange={(v) => setF((p) => ({ ...p, saksi: p.saksi.map((x) => (x.id === s.id ? { ...x, ttd: v } : x)) }))}
                    bg={bgS[s.id] ?? true} onBg={(v) => setBgS((p) => ({ ...p, [s.id]: v }))} shown={ttdS[i].src} bgBusy={ttdS[i].busy} />
                </div>
              ))}
              {f.saksi.length < 3 && <button type="button" onClick={() => set('saksi', [...f.saksi, { id: newId(), nama: '', ttd: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah saksi</button>}
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
