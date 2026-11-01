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

// Berita Acara Serah Terima Jabatan: pejabat lama (Pihak Pertama) menyerahkan jabatan kepada pejabat baru
// (Pihak Kedua) beserta lampiran pekerjaan berjalan, dokumen/arsip, dan aset; diketahui atasan/direktur.
// shortcut: satu halaman (dikecilkan useFitScale bila tabel panjang); pakai paginasi Kontrak Kerja bila pengguna butuh lampiran sangat panjang.

// ============================================================
// SECTION: Data
// ============================================================
type Row = string[]; // isi kolom tabel (tanpa No)
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; tempat: string;
  p1Nama: string; p1Nik: string; p1Jabatan: string;
  p2Nama: string; p2Nik: string; p2Jabatan: string;
  jabatan: string; dasar: string;
  tugas: Row[]; dokumen: Row[]; aset: Row[];
  penutup: string;
  pakai1: boolean; pakai2: boolean; pakaiAtasan: boolean; ttd1: string; ttd2: string;
  atasanHeading: string; atasanJabatan: string; atasanNama: string; atasanId: string; ttd: string; stempel: string;
  pakaiSaksi: boolean; saksi: string;
};

const STORAGE_KEY = 'berita-acara-serah-terima-jabatan:v1';
const POLA = '{n3}/BAST-JAB/{A3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);
const hari = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' }) : '');

const TABLES = [
  { key: 'tugas', title: 'A. Pekerjaan / Tugas Berjalan', cols: ['Uraian Pekerjaan', 'Status', 'Keterangan'], w: ['50%', '18%', '26%'] },
  { key: 'dokumen', title: 'B. Dokumen / Arsip', cols: ['Nama Dokumen / Arsip', 'Jumlah', 'Keterangan'], w: ['54%', '14%', '26%'] },
  { key: 'aset', title: 'C. Aset / Inventaris', cols: ['Uraian', 'Jumlah', 'Kondisi', 'Keterangan'], w: ['40%', '12%', '16%', '26%'] },
] as const;

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'BERITA ACARA SERAH TERIMA JABATAN', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  tempat: 'Kantor Pusat PT Cahaya Nusantara Abadi, Jakarta',
  p1Nama: 'Budi Santoso', p1Nik: 'KRY-2016-0045', p1Jabatan: 'Kepala Gudang Regional Jakarta',
  p2Nama: 'Andi Pratama', p2Nik: 'KRY-2019-0127', p2Jabatan: 'Supervisor Gudang (Kepala Gudang terpilih)',
  jabatan: 'Kepala Gudang Regional Jakarta', dasar: 'Surat Keputusan Direksi Nomor 045/SK/DIR/X/2026 tentang Rotasi Jabatan',
  tugas: [
    ['Stock opname gudang akhir bulan', 'Berjalan 70%', 'Target selesai minggu ini'],
    ['Penerimaan barang dari pemasok PT Sinar Jaya', 'Menunggu', 'Jadwal kedatangan tanggal 10'],
    ['Laporan mutasi stok bulanan', 'Selesai', 'Sudah dikirim ke Finance'],
  ],
  dokumen: [
    ['Kartu stok & laporan mutasi barang', '1 bundel', 'Periode Januari–Oktober'],
    ['SOP penerimaan dan pengeluaran barang', '1 map', 'Versi terbaru'],
    ['Daftar kontak pemasok & ekspedisi', '1 berkas', 'Juga dalam berkas digital'],
  ],
  aset: [
    ['Laptop kantor (INV-IT-0233)', '1 unit', 'Baik', 'Beserta pengisi daya'],
    ['Kunci gudang & lemari arsip', '1 set', 'Baik', '6 buah kunci'],
    ['Handy talky (HT)', '2 unit', 'Baik', '-'],
  ],
  penutup: 'Sejak berita acara ini ditandatangani, segala tugas, tanggung jawab, dan wewenang jabatan tersebut beralih dari PIHAK PERTAMA kepada PIHAK KEDUA. Demikian berita acara ini dibuat dengan sebenarnya dalam rangkap 2 (dua) untuk dipergunakan sebagaimana mestinya.',
  pakai1: true, pakai2: true, pakaiAtasan: true, ttd1: '', ttd2: '',
  atasanHeading: 'Mengetahui,', atasanJabatan: 'Manajer Operasional', atasanNama: 'Hendra Wijaya', atasanId: '', ttd: '', stempel: '',
  pakaiSaksi: false, saksi: 'Rina Marlina — Staf HRD\nDedi Kurniawan — Staf Gudang',
});

// Data User: identitas kop, atasan penanda tangan & gambar (bukan isi berita acara)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'atasanHeading', 'atasanJabatan', 'atasanNama', 'atasanId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi
// ============================================================
// Tabel lampiran: No | kolom…; kosong = 3 baris kosong untuk ditulis tangan
function Lampiran({ title, cols, w, rows, k, blank }: { title: string; cols: readonly string[]; w: readonly string[]; rows: Row[]; k: number; blank: boolean }) {
  const cell = { border: '1px solid #000', padding: `${2 * k}px ${5 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 16 * k };
  const list = blank ? Array<Row>(3).fill(cols.map(() => '')) : rows.filter((r) => r.some((c) => c.trim()));
  return (
    <div style={{ margin: `0 0 ${8 * k}px` }}>
      <div style={{ fontWeight: 700, marginBottom: 2 * k }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92em' }}>
        <thead><tr><th style={{ ...cell, width: '6%' }}>No</th>{cols.map((c, i) => <th key={c} style={{ ...cell, width: w[i] }}>{c}</th>)}</tr></thead>
        <tbody>
          {list.length ? list.map((r, i) => (
            <tr key={i}><td style={{ ...cell, textAlign: 'center' }}>{blank ? '' : i + 1}</td>{cols.map((_, j) => <td key={j} style={cell}>{r[j] ?? ''}</td>)}</tr>
          )) : <tr><td colSpan={cols.length + 1} style={{ ...cell, textAlign: 'center' }}>Nihil</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TableEditor({ cols, rows, onChange, label }: { cols: readonly string[]; rows: Row[]; onChange: (r: Row[]) => void; label: string }) {
  const setCell = (i: number, j: number, val: string) => onChange(rows.map((r, a) => (a === i ? cols.map((_, b) => (b === j ? val : r[b] ?? '')) : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">{label} {i + 1}</span>
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Hapus ${label} ${i + 1}`}
              className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {cols.map((c, j) => (
              <AutoTextarea key={c} aria-label={`${c} (${label} ${i + 1})`} placeholder={c} className={inputCls} value={r[j] ?? ''} onChange={(e) => setCell(i, j, e.target.value)} />
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, cols.map(() => '')])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {label}</button>
    </div>
  );
}

// Saksi-saksi: nama + garis tanda tangan (di bawah tanda tangan utama)
function Saksi({ text, k, blank }: { text: string; k: number; blank: boolean }) {
  const list = blank ? ['', ''] : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 * k }}>Saksi-saksi:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr 12em', columnGap: 8 * k, rowGap: 14 * k, alignItems: 'end' }}>
        {list.map((l, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span>{i + 1}.</span><span>{l || TITIK + TITIK}</span>
            <span style={{ borderBottom: '1px solid #000', height: 22 * k }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function BeritaAcaraSerahTerimaJabatan() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttd1: true, ttd2: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttd1 = useBgRemoved(f.ttd1, bg.ttd1, bgError);
  const ttd2 = useBgRemoved(f.ttd2, bg.ttd2, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttd1.busy || ttd2.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttd1.src, ttd2.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `bast-jabatan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data pihak, jabatan, tanggal & tabel → titik-titik/baris kosong; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const signers = ([
    f.pakai1 && { heading: 'PIHAK PERTAMA,\nYang menyerahkan', name: ks ? '' : f.p1Nama, ttd: img(ttd1.src), ttdOffset: getOffset(f.posisi, 'ttd1') },
    f.pakai2 && { heading: 'PIHAK KEDUA,\nYang menerima', name: ks ? '' : f.p2Nama, ttd: img(ttd2.src), ttdOffset: getOffset(f.posisi, 'ttd2') },
    f.pakaiAtasan && { heading: f.atasanHeading, role: f.atasanJabatan, name: f.atasanNama, idLine: f.atasanId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>Pada hari ini <b>{ks ? TITIK : hari(f.tanggal)}</b>, tanggal <b>{ks ? TITIK : fmtTanggal(f.tanggal)}</b>, bertempat di {v(f.tempat) || TITIK}, kami yang bertanda tangan di bawah ini:</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.p1Nama) }, { label: 'NIK karyawan', value: v(f.p1Nik) }, { label: 'Jabatan lama', value: v(f.p1Jabatan) }]} />
        <P>selanjutnya disebut <b>PIHAK PERTAMA</b> (yang menyerahkan);</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.p2Nama) }, { label: 'NIK karyawan', value: v(f.p2Nik) }, { label: 'Jabatan', value: v(f.p2Jabatan) }]} />
        <P>selanjutnya disebut <b>PIHAK KEDUA</b> (yang menerima).</P>
        <P>
          {(f.dasar.trim() || ks) && <>Berdasarkan {v(f.dasar) || TITIK}, </>}
          PIHAK PERTAMA menyerahkan jabatan <b>{v(f.jabatan) || TITIK}</b> kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan menerima serah terima jabatan tersebut beserta pekerjaan, dokumen, dan aset dengan rincian sebagai berikut:
        </P>
        {TABLES.map((t) => <Lampiran key={t.key} title={t.title} cols={t.cols} w={t.w} rows={f[t.key]} k={kk} blank={ks} />)}
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    footer: f.pakaiSaksi ? <Saksi text={f.saksi} k={kk} blank={ks} /> : undefined,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakai1 ? [{ id: 'ttd1', label: 'TTD Pihak Pertama' }] : []),
        ...(f.pakai2 ? [{ id: 'ttd2', label: 'TTD Pihak Kedua' }] : []),
        ...(f.pakaiAtasan ? [{ id: 'ttd', label: 'TTD Atasan/Direktur' }, { id: 'stempel', label: 'Stempel' }] : []),
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
        <h1 className="text-2xl font-bold text-center mb-4">Berita Acara Serah Terima Jabatan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:berita-acara-serah-terima-jabatan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Berita Acara</h2>
              {text('judul', 'Judul')}
              <Field label="Nomor berita acara"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`017/BAST-JAB/GDG/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (unit = singkatan divisi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label={`Tanggal serah terima — hari ${hari(f.tanggal) || '-'}`}><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {text('kota', 'Kota (tempat penandatanganan)')}
              </div>
              {text('tempat', 'Bertempat di')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Para Pihak</h2>
              <p className="text-sm font-bold text-gray-700">Pihak Pertama (yang menyerahkan)</p>
              <div className="grid sm:grid-cols-3 gap-2">{text('p1Nama', 'Nama')}{text('p1Nik', 'NIK karyawan')}{text('p1Jabatan', 'Jabatan lama')}</div>
              <p className="text-sm font-bold text-gray-700">Pihak Kedua (yang menerima)</p>
              <div className="grid sm:grid-cols-3 gap-2">{text('p2Nama', 'Nama')}{text('p2Nik', 'NIK karyawan')}{text('p2Jabatan', 'Jabatan')}</div>
              {text('jabatan', 'Jabatan yang diserahterimakan')}
              {text('dasar', 'Dasar (SK/memo, opsional)', 2)}
            </section>

            {TABLES.map((t) => (
              <section key={t.key} className="space-y-3">
                <h2 className="font-bold">Lampiran {t.title}</h2>
                <TableEditor cols={t.cols} rows={f[t.key]} onChange={(x) => set(t.key, x)} label="baris" />
              </section>
            ))}

            <section className="space-y-3">
              <h2 className="font-bold">Penutup</h2>
              {text('penutup', 'Kalimat penutup', 3)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh ketiganya, dua, atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakai1', 'Pihak Pertama'], ['pakai2', 'Pihak Kedua'], ['pakaiAtasan', 'Atasan/Direktur'], ['pakaiSaksi', 'Saksi-saksi']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakai1 && <ImageUpload label="Tanda tangan Pihak Pertama" value={f.ttd1} onChange={(x) => set('ttd1', x)} notify={notify} {...bgFor('ttd1', ttd1)} />}
              {f.pakai2 && <ImageUpload label="Tanda tangan Pihak Kedua" value={f.ttd2} onChange={(x) => set('ttd2', x)} notify={notify} {...bgFor('ttd2', ttd2)} />}
              {f.pakaiAtasan && <>
                <p className="text-sm font-bold text-gray-700">Atasan/Direktur</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('atasanHeading', 'Salam (mis. Mengetahui,)')}
                  {text('atasanJabatan', 'Jabatan')}
                  {text('atasanNama', 'Nama')}
                  {text('atasanId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan atasan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
              {f.pakaiSaksi && text('saksi', 'Saksi (satu per baris: Nama — Jabatan)', 2)}
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
