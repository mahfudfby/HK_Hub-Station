import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { fxOf, getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, signSpace, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { FitLine, Kop, Rule, SignName, StylePicker, Title, getGaya, useLetterFonts } from '../../shared/components/LetterStyles';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';

// Surat Peringatan (Teguran Pelanggaran): Surat peringatan / teguran atas pelanggaran karyawan (SP-1/2/3).
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Bahan bersama: kop & 20 template surat (LetterStyles),
// kertas/ekspor (LetterKit), Data User, analog posisi gambar.

// ============================================================
// SECTION: Data
// ============================================================
type Row = { label: string; value: string };
type Col = { label: string; w: string; align: 'left' | 'center' | 'right' };
type Signer = { heading: string; nama: string; jabatan: string };
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pembuka: string;
  karyawan: Row[];
  dasar: string;
  pelanggaran: Row[];
  sanksi: string;
  penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  penandaLain: Signer[];
  tembusan: string;
};

const STORAGE_KEY = 'surat-peringatan:v1';
const NO_FMT = '{n3}/SP/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);


const DEFAULT: Form = {
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', instansi: 'PT NAMA PERUSAHAAN ANDA', subKop: 'Bidang usaha / unit kerja',
  alamat: 'Jl. Alamat Perusahaan No. 1, Kota, Provinsi 12345', kontak: 'Telp. (021) 000-0000 • email@perusahaan.co.id • www.perusahaan.co.id',
  judul: "SURAT PERINGATAN PERTAMA (SP-1)", nomor: randomDocNo(NO_FMT), kota: 'Jakarta', tanggal: today(),
  pembuka: "Surat peringatan ini diberikan kepada:",
  karyawan: [{ label: "Nama", value: "Nama karyawan" }, { label: "NIK", value: "0000000001" }, { label: "Jabatan", value: "Staf" }, { label: "Divisi / bagian", value: "" }],
  dasar: "Berdasarkan hasil evaluasi dan pemeriksaan, yang bersangkutan telah melakukan pelanggaran sebagai berikut:",
  pelanggaran: [{ label: "Jenis pelanggaran", value: "Uraian singkat pelanggaran" }, { label: "Tanggal kejadian", value: "" }, { label: "Dasar aturan", value: "Pasal ... Peraturan Perusahaan" }],
  sanksi: "Atas pelanggaran tersebut, perusahaan memberikan Surat Peringatan Pertama (SP-1) yang berlaku selama 6 (enam) bulan sejak tanggal surat ini. Apabila dalam masa berlaku tersebut yang bersangkutan mengulangi pelanggaran, perusahaan akan memberikan sanksi yang lebih berat sesuai peraturan perusahaan.",
  penutup: "Demikian surat peringatan ini dibuat agar menjadi perhatian dan perbaikan bagi yang bersangkutan.",
  penandaLain: [{ heading: "Yang Menerima,", nama: "", jabatan: "Karyawan" }],
  ttdHeading: "Hormat kami,", ttdJabatan: "HRD Manager", ttdNama: 'Nama Penanda Tangan', ttdId: '', ttd: '', stempel: '',
  tembusan: '',
};

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota', 'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
function InfoGrid({ rows, k }: { rows: Row[]; k: number }) {
  if (!rows.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 8 * k, rowGap: 3 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span style={{ minWidth: 120 * k }}>{r.label}</span>
          <span style={{ display: 'flex', gap: 6 * k }}><span>:</span><span style={{ flex: 1 }}>{r.value}</span></span>
        </div>
      ))}
    </div>
  );
}

function ItemTable({ cols, rows, k }: { cols: Col[]; rows: string[][]; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${5 * k}px`, verticalAlign: 'top' as const };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 * k, fontSize: '0.95em' }}>
      <thead>
        <tr style={{ background: '#eeeeee' }}>
          <th style={{ ...cell, width: '6%', textAlign: 'center' }}>No</th>
          {cols.map((c) => <th key={c.label} style={{ ...cell, width: c.w === 'auto' ? undefined : c.w, textAlign: c.align }}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
            {cols.map((c, j) => <td key={j} style={{ ...cell, textAlign: c.align, overflowWrap: 'anywhere' }}>{r[j]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// SECTION: Tampilan surat (style inline agar html2canvas akurat)
// ============================================================
function Letter({ f, k, W, H, pf }: { f: Form; k: number; W: number; H: number; pf: number }) {
  const g = getGaya(f.gaya);
  useLetterFonts(g);
  const tempatTanggal = [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', ');
  const oT = getOffset(f.posisi, 'ttd');
  const oS = getOffset(f.posisi, 'stempel');
  const fxT = fxOf(oT, 'ttd');
  const fxS = fxOf(oS, 'stempel');
  return (
    <div style={{ width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', padding: `${40 * pf}px ${56 * pf}px`, background: '#fff', color: '#000', fontFamily: g.font, fontSize: g.size * k, lineHeight: 1.45, display: 'flex', flexDirection: 'column' }}>
      {/* KOP lengkap: logo, nama instansi, unit/tagline, alamat, kontak */}
      <Kop g={g} k={k} logo={f.logo} logoOffset={getOffset(f.posisi, 'logo')} logoH={64 * k} name={f.instansi} nameStyle={{ fontWeight: 700, fontSize: 21 * k, lineHeight: 1.15, letterSpacing: 0.5 }}>
        <div style={{ lineHeight: 1.35, marginTop: 2 * k }}>
          {[f.subKop, f.alamat, f.kontak].filter(Boolean).map((line, i) => (
            <FitLine key={i} style={{ fontSize: (i === 0 ? 12 : 11) * k, fontStyle: i === 0 ? 'italic' : undefined }}>{line}</FitLine>
          ))}
        </div>
      </Kop>
      <Rule g={g} mb={14 * k} />
      <div style={{ textAlign: 'center', marginBottom: 14 * k }}>
        <Title g={g} k={k}>{f.judul}</Title>
        <div style={{ marginTop: 3 * k }}>Nomor : {f.nomor}</div>
      </div>
      {f.pembuka && <p style={{ marginBottom: 8 * k }}>{f.pembuka}</p>}
      <InfoGrid rows={f.karyawan} k={k} />
      {f.dasar && <p style={{ marginBottom: 8 * k }}>{f.dasar}</p>}
      <InfoGrid rows={f.pelanggaran} k={k} />
      {f.sanksi && <p style={{ marginBottom: 8 * k }}>{f.sanksi}</p>}
      {f.penutup && <p style={{ marginBottom: 8 * k }}>{f.penutup}</p>}
      {/* Jarak elastis ke tanda tangan: lega bila isi pendek, menyusut (tidak keluar kertas) bila isi panjang */}
      <div aria-hidden="true" style={{ flex: `0 1 ${56 * k}px`, minHeight: 14 * k }} />
      <div style={{ display: 'flex', justifyContent: f.penandaLain.length ? 'space-between' : 'flex-end', alignItems: 'flex-end', gap: 16 * k }}>
        {f.penandaLain.map((p, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 120 * k }}>
            <div>{p.heading}</div>
            <div style={{ height: signSpace(72 * k) }} />
            <div style={{ fontWeight: 700, borderBottom: '1px solid #000', display: 'inline-block', minWidth: 120 * k, paddingBottom: 1 }}>{p.nama || ' '}</div>
            {p.jabatan && <div style={{ fontSize: 11 * k }}>{p.jabatan}</div>}
          </div>
        ))}
        <div style={{ textAlign: 'right', minWidth: 170 * k, marginLeft: 'auto' }}>
          {tempatTanggal && <div>{tempatTanggal}</div>}
          <div>{f.ttdHeading}</div>
          {f.ttdJabatan && <div>{f.ttdJabatan}</div>}
          <div style={{ position: 'relative', height: signSpace(80 * k) }}>
            {f.stempel && <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', left: oS.x, top: oS.y, height: 80 * k * fxS.z, opacity: fxS.a, mixBlendMode: 'multiply' }} />}
            {f.ttd && <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', right: -oT.x, top: (signSpace(80 * k) - 66 * k * fxT.z) / 2 + oT.y, height: 66 * k * fxT.z, maxWidth: 200 * k * fxT.z, opacity: fxT.a, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
          </div>
          <SignName g={g} k={k}>{f.ttdNama}</SignName>
          {f.ttdId && <div style={{ fontSize: 11 * k }}>{f.ttdId}</div>}
        </div>
      </div>
      {f.tembusan && (
        <div style={{ marginTop: 10 * k, fontSize: 11 * k }}>
          <div style={{ fontWeight: 700 }}>Tembusan:</div>
          <div>{f.tembusan}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION: Editor baris & tabel
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
      <button type="button" onClick={() => onChange([...rows, { label: '', value: '' }])} className="text-sm font-medium text-blue-700">+ Tambah baris</button>
    </div>
  );
}

function TableEditor({ cols, rows, onChange }: { cols: Col[]; rows: string[][]; onChange: (r: string[][]) => void }) {
  const setCell = (i: number, j: number, v: string) => onChange(rows.map((r, a) => (a === i ? r.map((c, b) => (b === j ? v : c)) : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Baris {i + 1}</span>
            <button type="button" onClick={() => onChange(rows.filter((_, a) => a !== i))} disabled={rows.length === 1}
              aria-label={`Hapus baris ${i + 1}`} className="px-3 min-h-[36px] rounded-lg text-red-600 border border-red-200 disabled:opacity-40">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cols.map((c, j) => (
              <Field key={c.label} label={c.label}>
                <AutoTextarea className={inputCls} value={r[j] ?? ''} onChange={(e) => setCell(i, j, e.target.value)} />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, cols.map(() => '')])} className="text-sm font-medium text-blue-700">+ Tambah baris</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPeringatan() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved, nomor: orRandomNo(saved.nomor, NO_FMT) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: false, ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setSigner = (i: number, p: Partial<Signer>) => set('penandaLain', f.penandaLain.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF({ ...DEFAULT, nomor: randomDocNo(NO_FMT) });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const fileName = `surat-peringatan-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Peringatan (Teguran Pelanggaran)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-peringatan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <ImageUpload label="Logo" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama perusahaan / instansi"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
              <Field label="Bidang usaha / unit (baris kedua kop)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
              <Field label="Alamat"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              <Field label="Judul surat"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`001/SP/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Karyawan & Pelanggaran</h2>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Data karyawan</p>
              <RowsEditor rows={f.karyawan} onChange={(v) => set('karyawan', v)} />
              <Field label="Dasar peringatan"><AutoTextarea rows={2} className={inputCls} value={f.dasar} onChange={(e) => set('dasar', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Pelanggaran</p>
              <RowsEditor rows={f.pelanggaran} onChange={(v) => set('pelanggaran', v)} />
              <Field label="Sanksi & masa berlaku"><AutoTextarea rows={2} className={inputCls} value={f.sanksi} onChange={(e) => set('sanksi', e.target.value)} /></Field>
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Salam penutup"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.ttdJabatan} onChange={(e) => set('ttdJabatan', e.target.value)} /></Field>
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.ttdNama} onChange={(e) => set('ttdNama', e.target.value)} /></Field>
                <Field label="NIP / NIK (opsional)"><AutoTextarea className={inputCls} value={f.ttdId} onChange={(e) => set('ttdId', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <p className="text-sm font-bold text-gray-700">Penanda tangan lain (opsional)</p>
              {f.penandaLain.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-start">
                  <AutoTextarea aria-label={`Salam penanda tangan ${i + 1}`} placeholder="Mis. Penerima," className={inputCls} value={p.heading} onChange={(e) => setSigner(i, { heading: e.target.value })} />
                  <AutoTextarea aria-label={`Nama penanda tangan ${i + 1}`} placeholder="Nama (boleh kosong)" className={inputCls} value={p.nama} onChange={(e) => setSigner(i, { nama: e.target.value })} />
                  <button type="button" onClick={() => set('penandaLain', f.penandaLain.filter((_, j) => j !== i))} aria-label={`Hapus penanda tangan ${i + 1}`}
                    className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => set('penandaLain', [...f.penandaLain, { heading: '', nama: '', jabatan: '' }])} className="text-sm font-medium text-blue-700">+ Tambah penanda tangan</button>
              <Field label="Tembusan (opsional)"><AutoTextarea rows={2} className={inputCls} value={f.tembusan} onChange={(e) => set('tembusan', e.target.value)} /></Field>
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <Letter f={{ ...f, logo: logo.src, ttd: ttd.src, stempel: stempel.src }} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
