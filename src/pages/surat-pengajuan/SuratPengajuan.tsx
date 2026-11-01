import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { Dots, ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import DocOptions, { TITIK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';

// Surat Pengajuan Perusahaan: kerja sama, pengadaan, anggaran, penawaran harga, izin kegiatan.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Row = { label: string; value: string };
type Item = { uraian: string; jumlah: string; harga: string };
type Signer = { heading: string; nama: string; jabatan: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  jenis: string; nomor: string; kota: string; tanggal: string;
  lampiran: string; perihal: string; kepada: string;
  salam: string; pembuka: string; rincian: Row[];
  pakaiTabel: boolean; items: Item[];
  penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  penandaLain: Signer[];
  tembusan: string;
  pakaiNomor: boolean; kosong: boolean;
};

const STORAGE_KEY = 'surat-pengajuan:v1';
const POLA = '{n3}/PGJ/{A3}/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

// Jenis pengajuan siap pakai: memilih jenis mengisi perihal & kalimat (tetap bisa diedit)
type Preset = { perihal: string; pembuka: string; rincian: Row[]; pakaiTabel: boolean; penutup: string };
const JENIS: Record<string, Preset> = {
  'Pengajuan Kerja Sama': {
    perihal: 'Pengajuan Kerja Sama',
    pembuka: 'Dalam rangka memperluas jaringan usaha dan memberikan manfaat bersama, dengan ini kami bermaksud mengajukan kerja sama dengan perusahaan yang Bapak/Ibu pimpin, dengan rincian sebagai berikut:',
    rincian: [{ label: 'Bentuk kerja sama', value: 'Kemitraan distribusi produk' }, { label: 'Ruang lingkup', value: 'Wilayah Jabodetabek' }, { label: 'Jangka waktu', value: '12 (dua belas) bulan' }],
    pakaiTabel: false,
    penutup: 'Besar harapan kami agar pengajuan ini dapat dipertimbangkan. Kami bersedia memaparkan proposal kerja sama secara lengkap pada waktu yang Bapak/Ibu tentukan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.',
  },
  'Pengajuan Pengadaan Barang': {
    perihal: 'Pengajuan Pengadaan Barang',
    pembuka: 'Sehubungan dengan kebutuhan operasional kantor, dengan ini kami mengajukan pengadaan barang dengan rincian sebagai berikut:',
    rincian: [{ label: 'Keperluan', value: 'Penunjang operasional divisi administrasi' }, { label: 'Waktu dibutuhkan', value: 'Paling lambat akhir bulan ini' }],
    pakaiTabel: true,
    penutup: 'Demikian pengajuan ini kami sampaikan. Atas perhatian dan persetujuan Bapak/Ibu kami ucapkan terima kasih.',
  },
  'Pengajuan Anggaran / Dana': {
    perihal: 'Pengajuan Anggaran Kegiatan',
    pembuka: 'Dalam rangka pelaksanaan kegiatan perusahaan, dengan ini kami mengajukan permohonan anggaran dengan rincian sebagai berikut:',
    rincian: [{ label: 'Nama kegiatan', value: 'Pelatihan Peningkatan Kompetensi Karyawan' }, { label: 'Waktu pelaksanaan', value: 'Bulan depan' }, { label: 'Penanggung jawab', value: 'Divisi Sumber Daya Manusia' }],
    pakaiTabel: true,
    penutup: 'Demikian pengajuan anggaran ini kami sampaikan untuk dapat dipertimbangkan. Atas perhatian dan persetujuannya kami ucapkan terima kasih.',
  },
  'Pengajuan Penawaran Harga': {
    perihal: 'Penawaran Harga',
    pembuka: 'Bersama surat ini kami mengajukan penawaran harga atas barang/jasa yang kami sediakan dengan rincian sebagai berikut:',
    rincian: [{ label: 'Masa berlaku penawaran', value: '30 (tiga puluh) hari sejak tanggal surat' }, { label: 'Syarat pembayaran', value: '50% di muka, 50% setelah barang diterima' }, { label: 'Waktu pengiriman', value: '7 (tujuh) hari kerja setelah pemesanan' }],
    pakaiTabel: true,
    penutup: 'Demikian penawaran ini kami sampaikan. Besar harapan kami dapat menjalin kerja sama dengan Bapak/Ibu. Atas perhatiannya kami ucapkan terima kasih.',
  },
  'Pengajuan Izin Kegiatan': {
    perihal: 'Permohonan Izin Kegiatan',
    pembuka: 'Dengan ini kami mengajukan permohonan izin untuk melaksanakan kegiatan dengan rincian sebagai berikut:',
    rincian: [{ label: 'Nama kegiatan', value: 'Bakti Sosial dan Donor Darah' }, { label: 'Hari / tanggal', value: 'Sabtu, akhir bulan ini' }, { label: 'Waktu', value: '08.00 WIB s/d selesai' }, { label: 'Tempat', value: 'Halaman kantor perusahaan' }, { label: 'Perkiraan peserta', value: '150 orang' }],
    pakaiTabel: false,
    penutup: 'Kami akan menjaga ketertiban dan kebersihan selama kegiatan berlangsung. Demikian permohonan ini kami sampaikan, atas perhatian dan izin yang diberikan kami ucapkan terima kasih.',
  },
};

const DEFAULT_ITEMS: Item[] = [
  { uraian: 'Laptop kerja 14 inci', jumlah: '3', harga: '8500000' },
  { uraian: 'Printer multifungsi', jumlah: '1', harga: '3250000' },
];

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'PT SINAR MAJU SEJAHTERA', subKop: 'Perdagangan Umum & Jasa Pengadaan Barang',
  alamat: 'Jl. Merdeka Raya No. 45, Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta 10110',
  kontak: 'Telp. (021) 3456-7890 • info@sinarmaju.co.id • www.sinarmaju.co.id',
  jenis: 'Pengajuan Pengadaan Barang', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiran: '1 (satu) berkas', kepada: 'Direktur Utama PT Sinar Maju Sejahtera\ndi Tempat',
  salam: 'Dengan hormat,',
  ...JENIS['Pengajuan Pengadaan Barang'],
  items: DEFAULT_ITEMS,
  ttdHeading: 'Hormat kami,', ttdJabatan: 'Manajer Umum', ttdNama: 'Budi Santoso', ttdId: '', ttd: '', stempel: '',
  penandaLain: [],
  tembusan: '',
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

const itemTotal = (it: Item) => num(it.jumlah) * num(it.harga);
{
  const t = [{ uraian: '', jumlah: '2', harga: '1500' }, { uraian: '', jumlah: 'x', harga: '9' }].reduce((s, it) => s + itemTotal(it), 0);
  console.assert(t === 3000, 'pengajuan itemTotal', t);
}

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// kosong: 8 baris bergaris tanpa isi, jumlah & terbilang dikosongkan (diisi tangan)
function ItemTable({ items, k, kosong }: { items: Item[]; k: number; kosong?: boolean }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${5 * k}px`, verticalAlign: 'top' as const };
  const total = items.reduce((s, it) => s + itemTotal(it), 0);
  const rowH = { height: 26 * k };
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 * k, fontSize: '0.95em' }}>
        <thead>
          <tr>
            <th style={{ ...cell, width: '6%', textAlign: 'center' }}>No</th>
            <th style={{ ...cell, textAlign: 'left' }}>Uraian</th>
            <th style={{ ...cell, width: '10%', textAlign: 'center' }}>Jumlah</th>
            <th style={{ ...cell, width: '20%', textAlign: 'right' }}>Harga Satuan (Rp)</th>
            <th style={{ ...cell, width: '20%', textAlign: 'right' }}>Total (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {kosong ? Array.from({ length: 8 }, (_, i) => (
            <tr key={i} style={rowH}>{[0, 1, 2, 3, 4].map((c) => <td key={c} style={cell} />)}</tr>
          )) : items.map((it, i) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ ...cell, overflowWrap: 'anywhere' }}>{it.uraian}</td>
              <td style={{ ...cell, textAlign: 'center' }}>{it.jumlah}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{rupiah(num(it.harga))}</td>
              <td style={{ ...cell, textAlign: 'right' }}>{rupiah(itemTotal(it))}</td>
            </tr>
          ))}
          <tr style={kosong ? rowH : undefined}>
            <td colSpan={4} style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>JUMLAH</td>
            <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{kosong ? '' : rupiah(total)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginBottom: 10 * k, fontStyle: 'italic', fontSize: '0.95em' }}>Terbilang: {kosong ? <Dots w="82%" /> : terbilangRupiah(total)}</div>
    </>
  );
}

// ============================================================
// SECTION: Editor baris & item
// ============================================================
function RowsEditor({ rows, onChange }: { rows: Row[]; onChange: (r: Row[]) => void }) {
  const setRow = (i: number, p: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 items-start">
          <AutoTextarea aria-label={`Label baris ${i + 1}`} placeholder="Label" className={inputCls} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
          <AutoTextarea aria-label={r.label || `Isi baris ${i + 1}`} placeholder="Isi" className={inputCls} value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} />
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Hapus baris ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { label: '', value: '' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah baris</button>
    </div>
  );
}

function ItemsEditor({ items, onChange }: { items: Item[]; onChange: (r: Item[]) => void }) {
  const setItem = (i: number, p: Partial<Item>) => onChange(items.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Item {i + 1} — Rp {rupiah(itemTotal(it))}</span>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} disabled={items.length === 1}
              aria-label={`Hapus item ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
          </div>
          <Field label="Uraian"><AutoTextarea className={inputCls} value={it.uraian} onChange={(e) => setItem(i, { uraian: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Jumlah"><input type="number" min="0" inputMode="decimal" className={inputCls} value={it.jumlah} onChange={(e) => setItem(i, { jumlah: e.target.value })} /></Field>
            <Field label="Harga satuan (Rp)"><input type="number" min="0" inputMode="numeric" className={inputCls} value={it.harga} onChange={(e) => setItem(i, { harga: e.target.value })} /></Field>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { uraian: '', jumlah: '1', harga: '0' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah item</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPengajuan() {
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
  const setSigner = (i: number, p: Partial<Signer>) => set('penandaLain', f.penandaLain.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const pilihJenis = (jenis: string) => setF((p) => ({ ...p, jenis, ...(JENIS[jenis] ?? {}) }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-pengajuan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data surat jadi titik-titik; kop, kalimat & penanda tangan tetap (ttd/stempel basah)
  const K = f.kosong;
  const signers: LayoutSigner[] = [
    ...f.penandaLain.map((s) => ({ heading: s.heading, role: s.jabatan, name: s.nama })),
    { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: K ? '' : ttd.src, stempel: K ? '' : stempel.src, ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    nomor: nomorTampil(f.nomor, f.pakaiNomor, K),
    meta: [{ label: 'Lampiran', value: K ? TITIK : f.lampiran || '-' }, { label: 'Perihal', value: f.perihal }],
    placeDate: [f.kota || (K ? '……' : ''), K ? '…………… 20……' : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: K ? ['Kepada Yth.', TITIK + TITIK, 'di Tempat'] : ['Kepada Yth.', ...f.kepada.split('\n')],
    body: (
      <>
        <P>{f.salam}</P>
        <P>{f.pembuka}</P>
        <InfoRows rows={f.rincian.map((r) => ({ ...r, value: isian(r.value, K) }))} />
        {f.pakaiTabel && (K || f.items.length > 0) && <ItemTable items={f.items} k={kk} kosong={K} />}
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
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pengajuan Perusahaan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pengajuan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

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
              <Field label="Jenis pengajuan (mengisi perihal & kalimat)">
                <select className={inputCls} value={f.jenis} onChange={(e) => pilihJenis(e.target.value)}>
                  {Object.keys(JENIS).map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`${randomDocNo('012/PGJ/UMM/{rom}/{yyyy}')} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Lampiran"><AutoTextarea className={inputCls} value={f.lampiran} onChange={(e) => set('lampiran', e.target.value)} /></Field>
                <Field label="Perihal"><AutoTextarea className={inputCls} value={f.perihal} onChange={(e) => set('perihal', e.target.value)} /></Field>
              </div>
              <Field label="Kepada Yth."><AutoTextarea rows={2} className={inputCls} value={f.kepada} onChange={(e) => set('kepada', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Isi Pengajuan</h2>
              <Field label="Salam pembuka"><AutoTextarea className={inputCls} value={f.salam} onChange={(e) => set('salam', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Rincian pengajuan</p>
              <RowsEditor rows={f.rincian} onChange={(v) => set('rincian', v)} />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium text-gray-700">
                <input type="checkbox" className="h-5 w-5" checked={f.pakaiTabel} onChange={(e) => set('pakaiTabel', e.target.checked)} />
                Tampilkan tabel item & harga
              </label>
              {f.pakaiTabel && <ItemsEditor items={f.items} onChange={(v) => set('items', v)} />}
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
              <p className="text-sm font-bold text-gray-700">Penanda tangan lain (opsional)</p>
              {f.penandaLain.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Salam penanda tangan ${i + 1}`} placeholder="Mis. Mengetahui," className={inputCls} value={p.heading} onChange={(e) => setSigner(i, { heading: e.target.value })} />
                  <AutoTextarea aria-label={`Jabatan penanda tangan ${i + 1}`} placeholder="Jabatan" className={inputCls} value={p.jabatan} onChange={(e) => setSigner(i, { jabatan: e.target.value })} />
                  <AutoTextarea aria-label={`Nama penanda tangan ${i + 1}`} placeholder="Nama" className={inputCls} value={p.nama} onChange={(e) => setSigner(i, { nama: e.target.value })} />
                  <button type="button" onClick={() => set('penandaLain', f.penandaLain.filter((_, j) => j !== i))} aria-label={`Hapus penanda tangan ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('penandaLain', [...f.penandaLain, { heading: 'Mengetahui,', nama: '', jabatan: 'Direktur' }])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah penanda tangan</button>
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
