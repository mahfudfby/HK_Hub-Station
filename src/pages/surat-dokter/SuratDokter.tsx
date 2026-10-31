import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import RequireLogin from '../../shared/components/RequireLogin';
import { canvasToBlob, saveFile } from '../../shared/lib/saveFile';
import { printImage } from '../../shared/lib/printImage';
import FitPreview, { unfitPreview } from '../../shared/components/FitPreview';
import BgToggle from '../../shared/components/BgToggle';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { Spinner, Toast, type ToastState, type ToastType } from '../../shared/components/Feedback';

type Notify = (type: ToastType, message: string) => void;

// Surat keterangan dokter: hanya untuk akun admin (login lewat tombol mengambang / halaman /login).

const STORAGE_KEY = 'surat-dokter:v1';

type Row = { label: string; value: string };
type Form = {
  nama: string;
  sip: string;
  str: string;
  alamat1: string;
  alamat2: string;
  telp: string;
  judul: string;
  pembuka: string;
  rows: Row[];
  isi: string;
  status: 'SAKIT' | 'SEHAT';
  hari: string;
  mulai: string;
  sampai: string;
  penutup: string;
  catatan: string;
  kota: string;
  tanggal: string;
  jabatan: string;
  namaTtd: string;
  ttd: string; // data URL, hanya di perangkat ini
  stempel: string;
};

const DEFAULT: Form = {
  nama: 'dr. TENA, DJ',
  sip: '446.1/0434.1/Pu Kes-3/VI/2011',
  str: '312/1001060/4226',
  alamat1: 'Bumi Nasio Indah B 10/7 RT.009/0015',
  alamat2: 'Kel. Jati Mekar – Bekasi',
  telp: '021 – 8475534',
  judul: 'SURAT KETERANGAN',
  pembuka: 'Bersama dengan surat ini saya terangkan bahwa :',
  rows: ['Nama', 'Jenis Kelamin', 'Umur', 'Pekerjaan', 'Alamat'].map((label) => ({ label, value: '' })),
  isi: 'Setelah dilakukan pemeriksaan dinyatakan {status}*) dan memerlukan istirahat selama {hari} hari ({terbilang}) sejak tanggal {mulai} s/d {sampai}',
  status: 'SAKIT',
  hari: '',
  mulai: '',
  sampai: '',
  penutup: 'Demikianlah surat keterangan ini saya perbuat, untuk dipergunakan dengan seperlunya.',
  catatan: '*) Coret yang tidak perlu',
  kota: 'Bekasi',
  tanggal: '',
  jabatan: 'Dokter yang memeriksa',
  namaTtd: 'dr. Tena. DJ.',
  ttd: '',
  stempel: '',
};

const SATUAN = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
export function terbilang(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${terbilang(n % 10)}` : ''}`;
  return String(n);
}
console.assert(terbilang(3) === 'tiga' && terbilang(12) === 'dua belas' && terbilang(21) === 'dua puluh satu', 'terbilang');

const fmtTanggal = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const Dots = ({ w = '7em' }: { w?: string }) => (
  <span style={{ display: 'inline-block', width: w, borderBottom: '2px dotted #000', verticalAlign: 'baseline' }} />
);
const orDots = (v: string, w?: string) => (v ? <strong>{v}</strong> : <Dots w={w} />);

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...DEFAULT, ...saved } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

// ---------------- Form helpers ----------------
const inputCls = 'w-full p-2 border border-gray-300 rounded-lg text-sm';
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ImageUpload({ label, value, onChange, notify, bg, onBg, shown, bgBusy }: {
  label: string; value: string; onChange: (v: string) => void; notify: Notify;
  bg: boolean; onBg: (v: boolean) => void; shown: string; bgBusy: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const read = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('error', `${label}: file "${file.name}" bukan gambar.`);
    setBusy(true);
    notify('loading', `Memuat ${label.toLowerCase()}…`);
    const r = new FileReader();
    r.onload = () => {
      onChange(String(r.result));
      notify('success', `${label} berhasil dipasang.`);
      setBusy(false);
    };
    r.onerror = () => {
      notify('error', `${label} gagal dibaca.`);
      setBusy(false);
    };
    r.readAsDataURL(file);
  };
  const remove = () => {
    onChange('');
    notify('info', `${label} dihapus.`);
  };
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {busy ? (
          <span className="h-14 w-14 flex items-center justify-center border rounded text-blue-600"><Spinner className="h-6 w-6" /></span>
        ) : (
          value && <img src={shown} alt={label} className="h-14 w-14 object-contain border rounded bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
        )}
        <input type="file" accept="image/*" disabled={busy} onChange={(e) => read(e.target.files?.[0])} className="text-sm flex-1 min-w-0" />
        <BgToggle checked={bg} onChange={onBg} busy={bgBusy} />
        {value && (
          <button type="button" onClick={remove} className="text-sm text-red-600">Hapus</button>
        )}
      </div>
    </Field>
  );
}

// ---------------- Letter preview ----------------
// Halaman terkunci A4 asli @96 DPI (210×297 mm = 794×1123 px): teks 16px = 12pt di kertas
const PAGE_W = 794;
const PAGE_H = 1123;

function Letter({ f }: { f: Form }) {
  const hari = parseInt(f.hari, 10);
  const status = (
    <span>
      {(['SAKIT', 'SEHAT'] as const).map((s, i) => (
        <span key={s}>
          {i > 0 && '/'}
          <span style={s === f.status ? { fontWeight: 700 } : { textDecoration: 'line-through' }}>{s}</span>
        </span>
      ))}
    </span>
  );
  const tokens: Record<string, ReactNode> = {
    status,
    hari: orDots(f.hari, '4em'),
    terbilang: orDots(hari > 0 ? terbilang(hari) : '', '6em'),
    mulai: orDots(fmtTanggal(f.mulai), '9em'),
    sampai: orDots(fmtTanggal(f.sampai), '9em'),
  };
  const isi = f.isi.split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in tokens ? <span key={i}>{tokens[key]}</span> : part;
  });

  return (
    <div style={{ width: PAGE_W, height: PAGE_H, overflow: 'hidden', boxSizing: 'border-box', padding: '56px 72px', background: '#fff', color: '#000', fontFamily: 'Carlito, Calibri, Arial, sans-serif', fontSize: 16, lineHeight: 1.5 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Tinos, "Times New Roman", Times, serif', fontWeight: 700, fontSize: 46, lineHeight: 1.1 }}>{f.nama}</div>
        <div style={{ fontSize: 15 }}>
          {[f.sip && `SIP : ${f.sip}`, f.str && `STR : ${f.str}`, f.alamat1, f.alamat2, f.telp && `Telp. ${f.telp}`]
            .filter(Boolean)
            .map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
      <hr style={{ border: 0, borderTop: '1.5px solid #000', margin: '8px 0 24px' }} />
      <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', marginBottom: 16 }}>{f.judul}</div>
      <p style={{ marginBottom: 16 }}>{f.pembuka}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 12, rowGap: 14, marginBottom: 20 }}>
        {f.rows.map((r, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span style={{ minWidth: 120 }}>{r.label}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <span>:</span>
              {r.value ? <strong style={{ whiteSpace: 'pre-line' }}>{r.value}</strong> : <span style={{ flex: 1, borderBottom: '2px dotted #000' }} />}
            </span>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'justify', marginBottom: 16 }}>{isi}</p>
      <p style={{ textAlign: 'justify', marginBottom: 40 }}>{f.penutup}</p>
      <p style={{ marginBottom: 16 }}>{f.catatan}</p>
      <div style={{ marginLeft: '45%', textAlign: 'center' }}>
        <div>{f.kota}, {f.tanggal ? fmtTanggal(f.tanggal) : <Dots w="10em" />}</div>
        <div>{f.jabatan}</div>
        <div style={{ position: 'relative', height: 110 }}>
          {f.stempel && (
            <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', left: 0, top: 0, height: 110, opacity: 0.9, mixBlendMode: 'multiply' }} />
          )}
          {f.ttd && (
            <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', height: 90, mixBlendMode: 'multiply' }} />
          )}
        </div>
        <div>{f.namaTtd}</div>
      </div>
    </div>
  );
}

// ---------------- Main ----------------
function Editor({ user, notify }: { user: User; notify: Notify }) {
  const [f, setF] = useState<Form>(loadForm);
  const [exporting, setExporting] = useState<'' | 'PDF' | 'PNG' | 'Print'>('');
  const [bg, setBg] = useState({ ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const letterRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setRow = (i: number, patch: Partial<Row>) => set('rows', f.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const capture = async () => {
    const page = letterRef.current!.firstElementChild as HTMLElement;
    await document.fonts.ready; // font dokumen wajib termuat agar tata letak sama di semua perangkat
    if (page.scrollHeight > PAGE_H + 1) throw new Error('isi surat melebihi 1 halaman A4. Persingkat teksnya.');
    const { default: html2canvas } = await import('html2canvas');
    // Ukuran & skala tetap: hasil selalu 1588×2246 px, tidak bergantung layar/zoom perangkat
    return html2canvas(page, { scale: 2, width: PAGE_W, height: PAGE_H, windowWidth: 1280, backgroundColor: '#fff', onclone: unfitPreview });
  };
  const fileName = `surat-keterangan-${(f.rows[0]?.value || 'pasien').replace(/\s+/g, '-').toLowerCase()}`;

  const runExport = async (kind: 'PDF' | 'PNG' | 'Print') => {
    setExporting(kind);
    notify('loading', kind === 'Print' ? 'Menyiapkan cetakan…' : `Membuat file ${kind}…`);
    try {
      const canvas = await capture();
      if (kind === 'Print') {
        await printImage(canvas.toDataURL('image/png'), fileName, { w: '210mm', h: '297mm' });
        notify('success', 'Jendela cetak dibuka.');
        return;
      }
      if (kind === 'PNG') {
        saveFile(await canvasToBlob(canvas), `${fileName}.png`);
      } else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297); // JPEG: PNG bikin PDF ~8 MB
        saveFile(pdf.output('blob'), `${fileName}.pdf`);
      }
      notify('success', `${fileName}.${kind.toLowerCase()} berhasil diunduh.`);
    } catch (err: any) {
      notify('error', `Gagal ${kind === 'Print' ? 'mencetak' : `membuat ${kind}`}: ${err?.message || 'proses render gagal.'}`);
    } finally {
      setExporting('');
    }
  };
  const resetPasien = () => {
    setF((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r, value: '' })), hari: '', mulai: '', sampai: '', tanggal: '' }));
    notify('info', 'Data pasien dikosongkan.');
  };
  const resetAll = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(DEFAULT);
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };
  const exportBtn = (kind: 'PDF' | 'PNG' | 'Print', color: string) => (
    <button onClick={() => runExport(kind)} disabled={!!exporting || ttd.busy || stempel.busy}
      className={`px-5 py-2 rounded-lg text-white font-semibold flex items-center gap-2 disabled:opacity-60 ${color}`}>
      {exporting === kind && <Spinner />} {kind === 'Print' ? 'Print' : `Unduh ${kind}`}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Link to="/" className="text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
          <div className="text-sm text-gray-600">
            Login sebagai {user.email}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Dokter</h1>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {exportBtn('PDF', 'bg-red-600')}
          {exportBtn('PNG', 'bg-blue-600')}
          {exportBtn('Print', 'bg-slate-700')}
          <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
          <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6">
            <section className="space-y-3">
              <h2 className="font-bold">Data Pasien</h2>
              {f.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[8rem_1fr] gap-2">
                  <input aria-label={`Label baris ${i + 1}`} className={inputCls} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                  <textarea aria-label={r.label} rows={r.label.toLowerCase().includes('alamat') ? 2 : 1} className={inputCls} value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })} />
                </div>
              ))}
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => set('rows', [...f.rows, { label: 'Baris baru', value: '' }])} className="text-blue-700">+ Tambah baris</button>
                {f.rows.length > 1 && (
                  <button type="button" onClick={() => set('rows', f.rows.slice(0, -1))} className="text-red-600">− Hapus baris terakhir</button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Hasil Pemeriksaan</h2>
              <Field label="Dinyatakan">
                <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  <option value="SAKIT">SAKIT</option>
                  <option value="SEHAT">SEHAT</option>
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Istirahat (hari)"><input type="number" min={0} className={inputCls} value={f.hari} onChange={(e) => set('hari', e.target.value)} /></Field>
                <Field label="Sejak tanggal"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Sampai"><input type="date" className={inputCls} value={f.sampai} onChange={(e) => set('sampai', e.target.value)} /></Field>
              </div>
              <Field label="Kalimat hasil (penanda: {status} {hari} {terbilang} {mulai} {sampai})">
                <textarea rows={3} className={inputCls} value={f.isi} onChange={(e) => set('isi', e.target.value)} />
              </Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Tanda Tangan</h2>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kota"><input className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Keterangan"><input className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
                <Field label="Nama penanda tangan"><input className={inputCls} value={f.namaTtd} onChange={(e) => set('namaTtd', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify}
                bg={bg.ttd} onBg={(v) => setBg((p) => ({ ...p, ttd: v }))} shown={ttd.src} bgBusy={ttd.busy} />
              <p className="-mt-2 text-xs text-gray-500">PNG transparan disarankan.</p>
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify}
                bg={bg.stempel} onBg={(v) => setBg((p) => ({ ...p, stempel: v }))} shown={stempel.src} bgBusy={stempel.busy} />
              <p className="text-xs text-gray-500">Tanda tangan &amp; stempel hanya disimpan di perangkat ini, tidak diunggah ke server.</p>
            </section>

            <details className="space-y-3">
              <summary className="font-bold cursor-pointer">Kop &amp; Teks Surat</summary>
              <div className="space-y-3 pt-3">
                <Field label="Nama dokter (kop)"><input className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="No. SIP"><input className={inputCls} value={f.sip} onChange={(e) => set('sip', e.target.value)} /></Field>
                  <Field label="No. STR"><input className={inputCls} value={f.str} onChange={(e) => set('str', e.target.value)} /></Field>
                </div>
                <Field label="Alamat (baris 1)"><input className={inputCls} value={f.alamat1} onChange={(e) => set('alamat1', e.target.value)} /></Field>
                <Field label="Alamat (baris 2: kelurahan, kota)"><input className={inputCls} value={f.alamat2} onChange={(e) => set('alamat2', e.target.value)} /></Field>
                <Field label="No. Telepon"><input className={inputCls} value={f.telp} onChange={(e) => set('telp', e.target.value)} /></Field>
                <p className="text-xs text-gray-500">Kosongkan isian untuk menyembunyikan barisnya di surat.</p>
                <Field label="Judul"><input className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
                <Field label="Kalimat pembuka"><textarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
                <Field label="Kalimat penutup"><textarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
                <Field label="Catatan kaki"><input className={inputCls} value={f.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
              </div>
            </details>
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <Letter f={{ ...f, ttd: ttd.src, stempel: stempel.src }} />
            </div>
          </FitPreview>
        </div>
      </div>
    </div>
  );
}

export default function SuratDokter() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  return (
    <>
      <RequireLogin>{(user) => <Editor user={user} notify={notify} />}</RequireLogin>
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
