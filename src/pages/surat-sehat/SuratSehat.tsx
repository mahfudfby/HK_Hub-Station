import UserData from '../../shared/components/UserData';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import AutoTextarea from '../../shared/components/AutoTextarea';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import RequireLogin from '../../shared/components/RequireLogin';
import FitPreview from '../../shared/components/FitPreview';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import {
  DOTTED, Dots, ExportButton, Field, ImageUpload, PaperPicker, letterPage, dataStyle,
  fmtTanggal, inputCls, useLetterExport, type Notify,
} from '../../shared/components/LetterKit';
import { Kop, Rule, SignName, StylePicker, Title, getGaya, useLetterFonts, type Gaya } from '../../shared/components/LetterStyles';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import PositionPad, { fxOf, getOffset, type Offsets } from '../../shared/components/PositionPad';

// Surat keterangan sehat (A5): hanya untuk akun admin. Kop diisi sendiri oleh dokter/klinik pemakai.

const STORAGE_KEY = 'surat-sehat:v1';

type Row = { label: string; value: string };
type Ukur = Row & { unit: string };
type Form = {
  instansi: string;
  subKop: string;
  alamatKop: string;
  logo: string;
  judul: string;
  nomor: string;
  pembuka: string;
  rows: Row[];
  pengantarHasil: string;
  hasil: string;
  pengantarKeperluan: string;
  keperluan: string;
  ukur: Ukur[];
  kota: string;
  tanggal: string;
  jabatan: string;
  dokter: string;
  idLabel: string;
  idNo: string;
  ttd: string; // data URL, hanya di perangkat ini
  stempel: string;
  posisi: Offsets; // geseran logo, tanda tangan & stempel (px dokumen)
  gaya: string; // id gaya surat (LetterStyles)
  paper: string; // id LETTER_PAPERS
  landscape: boolean;
  skala: number; // ukuran teks surat (%)
};

const DEFAULT: Form = {
  instansi: 'NAMA KLINIK / PRAKTIK DOKTER',
  subKop: 'Pelayanan Kesehatan Umum',
  alamatKop: 'Alamat lengkap • Telp. 0000 – 000000',
  logo: '',
  judul: 'SURAT KETERANGAN SEHAT',
  nomor: '',
  pembuka: 'Yang bertanda tangan di bawah ini, dokter pemeriksa menerangkan dengan sesungguhnya bahwa :',
  rows: ['Nama', 'Tempat / Tgl. Lahir', 'Jenis Kelamin', 'Pekerjaan', 'Alamat'].map((label) => ({ label, value: '' })),
  pengantarHasil: 'Telah kami periksa dan ternyata :',
  hasil: 'SEHAT JASMANI DAN ROHANI, TIDAK BERTATO, TIDAK BERTINDIK, DAN TIDAK ADA RIWAYAT PENYAKIT KERAS.',
  pengantarKeperluan: 'Demikian surat keterangan ini dibuat untuk keperluan :',
  keperluan: 'Melengkapi berkas untuk melamar pekerjaan',
  ukur: [
    { label: 'Berat Badan', value: '', unit: 'Kg' },
    { label: 'Tinggi Badan', value: '', unit: 'Cm' },
    { label: 'Tekanan Darah', value: '', unit: 'mmHg' },
    { label: 'Golongan Darah', value: '', unit: '' },
  ],
  kota: '',
  tanggal: '',
  jabatan: 'Dokter yang memeriksa',
  dokter: 'dr. Nama Dokter',
  idLabel: 'SIP',
  idNo: '',
  ttd: '',
  stempel: '',
  posisi: {},
  gaya: 'klasik',
  skala: 100,
  paper: 'A5',
  landscape: false,
};

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...DEFAULT, ...saved } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

// ---------------- Letter preview ----------------
function DataRow({ g, k, label, value, unit }: { g: Gaya; k: number; label: string; value: string; unit?: string }) {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ minWidth: (110 + g.labelExtra) * k }}>{label}</span>
      <span style={{ display: 'flex', gap: 6 * k }}>
        <span>:</span>
        {value ? <span style={{ ...dataStyle, flex: 1, whiteSpace: 'pre-line' }}>{value}{unit && ` ${unit}`}</span> : <span style={{ flex: 1, borderBottom: DOTTED }} />}
      </span>
    </div>
  );
}

function Letter({ f, k, W, H, pf }: { f: Form; k: number; W: number; H: number; pf: number }) {
  const g = getGaya(f.gaya);
  useLetterFonts(g);
  const grid = { display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 8 * k, rowGap: g.rowGap * k } as const;
  return (
    <div style={{ width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', padding: `${48 * pf}px ${56 * pf}px`, background: '#fff', color: '#000', fontFamily: g.font, fontSize: g.size * k, lineHeight: 1.4, display: 'flex', flexDirection: 'column' }}>
      {/* KOP 3 baris + logo opsional di kiri; garis pemisah & judul mengikuti gaya */}
      <Kop g={g} k={k} logo={f.logo} logoOffset={getOffset(f.posisi, 'logo')} logoH={58 * k} name={f.instansi} nameStyle={{ fontWeight: 700, fontSize: 20 * k, lineHeight: 1.2, letterSpacing: 0.3 }}>
        {f.subKop && <div style={{ fontWeight: 700, fontSize: 13 * k }}>{f.subKop}</div>}
        {f.alamatKop && <div style={{ fontSize: 11 * k }}>{f.alamatKop}</div>}
      </Kop>
      <Rule g={g} mb={12 * k} />
      <div style={{ textAlign: 'center', marginBottom: 10 * k }}>
        <Title g={g} k={k}>{f.judul}</Title>
        <div style={{ fontSize: 12 * k }}>Nomor : {f.nomor ? <span style={dataStyle}>{f.nomor}</span> : <Dots w="12em" />}</div>
      </div>
      <p style={{ textAlign: 'justify', marginBottom: 4 * k }}>{f.pembuka}</p>
      <div style={{ ...grid, marginBottom: 8 * k }}>
        {f.rows.map((r, i) => <DataRow key={i} g={g} k={k} label={r.label} value={r.value} />)}
      </div>
      <p style={{ marginBottom: 2 * k }}>{f.pengantarHasil}</p>
      <p style={{ textAlign: 'justify', fontWeight: 700, marginBottom: 8 * k }}>“{f.hasil}”</p>
      <p style={{ marginBottom: 2 * k }}>{f.pengantarKeperluan}</p>
      <p style={{ marginBottom: 8 * k }}>{f.keperluan ? <span style={dataStyle}>{f.keperluan}</span> : <Dots w="100%" />}</p>
      <div style={{ ...grid, marginBottom: 12 * k }}>
        {f.ukur.map((r, i) => <DataRow key={i} g={g} k={k} label={r.label} value={r.value} unit={r.unit} />)}
      </div>
      {/* Jarak elastis ke tanda tangan: lega bila isi pendek, menyusut (tidak keluar kertas) bila isi panjang */}
      <div aria-hidden="true" style={{ flex: `0 1 ${48 * k}px`, minHeight: 12 * k }} />
      {/* Tanggal, keterangan, tanda tangan, nama: blok mentok margin kanan */}
      <div style={{ textAlign: 'right', marginLeft: 'auto', width: 'fit-content', maxWidth: '100%' }}>
        <div>{f.kota ? <span style={dataStyle}>{f.kota}</span> : <Dots w="6em" />}, {f.tanggal ? <span style={dataStyle}>{fmtTanggal(f.tanggal)}</span> : <Dots w="8em" />}</div>
        <div>{f.jabatan}</div>
        <div style={{ position: 'relative', height: 76 * k }}>
          {f.stempel && <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', right: 70 * k - getOffset(f.posisi, 'stempel').x, top: getOffset(f.posisi, 'stempel').y, height: 76 * k * fxOf(getOffset(f.posisi, 'stempel'), 'stempel').z, opacity: fxOf(getOffset(f.posisi, 'stempel'), 'stempel').a, mixBlendMode: 'multiply' }} />}
          {f.ttd && <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', right: -getOffset(f.posisi, 'ttd').x, top: 6 * k + getOffset(f.posisi, 'ttd').y, height: 64 * k * fxOf(getOffset(f.posisi, 'ttd'), 'ttd').z, maxWidth: 200 * k * fxOf(getOffset(f.posisi, 'ttd'), 'ttd').z, opacity: fxOf(getOffset(f.posisi, 'ttd'), 'ttd').a, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
        </div>
        <SignName g={g} k={k}>{f.dokter}</SignName>
        {f.idLabel && <div style={{ fontSize: 12 * k }}>{f.idLabel}. {f.idNo || <Dots w="10em" />}</div>}
      </div>
    </div>
  );
}

// ---------------- Main ----------------
function Editor({ user, notify }: { user: User; notify: Notify }) {
  const [f, setF] = useState<Form>(loadForm);
  const [bg, setBg] = useState({ logo: false, ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const letterRef = useRef<HTMLDivElement>(null);
  // Kertas & orientasi pilihan; ukuran teks diperkecil otomatis bila isi tidak muat
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const setRow = (i: number, value: string) => set('rows', f.rows.map((r, j) => (j === i ? { ...r, value } : r)));
  const setUkur = (i: number, value: string) => set('ukur', f.ukur.map((r, j) => (j === i ? { ...r, value } : r)));
  const bgFor = (k: keyof typeof bg) => ({ bg: bg[k], onBg: (v: boolean) => setBg((p) => ({ ...p, [k]: v })) });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const fileName = `surat-sehat-${(f.rows[0]?.value || 'pasien').replace(/\s+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);
  const busy = logo.busy || ttd.busy || stempel.busy;

  const resetPasien = () => {
    setF((p) => ({ ...p, nomor: '', rows: p.rows.map((r) => ({ ...r, value: '' })), ukur: p.ukur.map((r) => ({ ...r, value: '' })), tanggal: '' }));
    notify('info', 'Data pasien dikosongkan.');
  };
  const resetAll = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(DEFAULT);
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  // Analog geser tanda tangan/stempel: desktop di atas form, ponsel di kotak bawah
  const [geser, setGeser] = useState('ttd');
  const posPad = (
    <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
      active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
  );
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Link to="/" className="text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
          <div className="text-sm text-gray-600">Login sebagai {user.email}</div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Sehat</h1>
        {/* Desktop: tombol unduh di atas; ponsel: di paling bawah */}
        <div className="hidden lg:flex flex-wrap justify-center gap-3 mb-6">
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
          <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
          <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6">
            <UserData storageKey="data-user:surat-sehat" keys={['posisi', 'instansi', 'subKop', 'alamatKop', 'logo', 'judul', 'pembuka', 'pengantarHasil', 'pengantarKeperluan', 'kota', 'jabatan', 'dokter', 'idLabel', 'idNo', 'ttd', 'stempel']} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />
            <div className="hidden lg:block"><TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} /></div>
            <div className="hidden lg:block">{posPad}</div>
            <div className="hidden lg:block">
            <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
            <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
            </div>
            <section className="space-y-3">
              <h2 className="font-bold">Data Pasien</h2>
              <Field label="Nomor surat"><NumberFormatInput parts={['Klasif.', 'Urut', 'Kode', 'Tahun']} example="445/012/SKS/2026" value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              {f.rows.map((r, i) => (
                <Field key={i} label={r.label}>
                  <AutoTextarea rows={r.label.toLowerCase().includes('alamat') ? 2 : 1} className={inputCls} value={r.value} onChange={(e) => setRow(i, e.target.value)} />
                </Field>
              ))}
              <Field label="Keperluan"><AutoTextarea className={inputCls} value={f.keperluan} onChange={(e) => set('keperluan', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Hasil Pemeriksaan</h2>
              <div className="grid grid-cols-2 gap-2">
                {f.ukur.map((r, i) => (
                  <Field key={i} label={r.unit ? `${r.label} (${r.unit})` : r.label}>
                    {r.unit // angka (BB/TB/tensi) tetap satu baris
                      ? <input className={inputCls} inputMode="decimal" value={r.value} onChange={(e) => setUkur(i, e.target.value)} />
                      : <AutoTextarea className={inputCls} value={r.value} onChange={(e) => setUkur(i, e.target.value)} />}
                  </Field>
                ))}
              </div>
              <Field label="Kesimpulan"><AutoTextarea rows={3} className={inputCls} value={f.hasil} onChange={(e) => set('hasil', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Dokter &amp; Tanda Tangan</h2>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Nama dokter"><AutoTextarea className={inputCls} value={f.dokter} onChange={(e) => set('dokter', e.target.value)} /></Field>
                <Field label="Keterangan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
                <Field label="Jenis nomor (SIP/NIP)"><AutoTextarea className={inputCls} value={f.idLabel} onChange={(e) => set('idLabel', e.target.value)} /></Field>
                <Field label={`Nomor ${f.idLabel || 'SIP/NIP'}`}>{/SIP/i.test(f.idLabel) // SIP: susunan terkunci; NIP: satu kotak angka
                  ? <NumberFormatInput parts={['Kode', 'Nomor', 'Instansi', 'Bulan', 'Tahun']} example="446.1/0434.1/Pu Kes-3/VI/2011 (bulan angka romawi)" value={f.idNo} onChange={(v) => set('idNo', v)} />
                  : <NumberFormatInput parts={['Nomor']} value={f.idNo} onChange={(v) => set('idNo', v)} />}</Field>
              </div>
              <ImageUpload label="Logo kop (opsional, kiri atas)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} shown={logo.src} bgBusy={logo.busy} {...bgFor('logo')} />
              <p className="-mt-2 text-xs text-gray-500">Kosongkan bila surat tanpa logo.</p>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} shown={ttd.src} bgBusy={ttd.busy} {...bgFor('ttd')} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} shown={stempel.src} bgBusy={stempel.busy} {...bgFor('stempel')} />
              <p className="text-xs text-gray-500">Logo, tanda tangan &amp; stempel hanya disimpan di perangkat ini, tidak diunggah ke server.</p>
            </section>

            <details className="space-y-3">
              <summary className="font-bold cursor-pointer">Kop &amp; Teks Surat</summary>
              <div className="space-y-3 pt-3">
                <Field label="Kop baris 1 (nama klinik / praktik)"><AutoTextarea className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
                <Field label="Kop baris 2 (unit / layanan)"><AutoTextarea className={inputCls} value={f.subKop} onChange={(e) => set('subKop', e.target.value)} /></Field>
                <Field label="Kop baris 3 (alamat & telepon)"><AutoTextarea className={inputCls} value={f.alamatKop} onChange={(e) => set('alamatKop', e.target.value)} /></Field>
                <Field label="Judul"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
                <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
                <Field label="Pengantar hasil"><AutoTextarea className={inputCls} value={f.pengantarHasil} onChange={(e) => set('pengantarHasil', e.target.value)} /></Field>
                <Field label="Pengantar keperluan"><AutoTextarea className={inputCls} value={f.pengantarKeperluan} onChange={(e) => set('pengantarKeperluan', e.target.value)} /></Field>
              </div>
            </details>
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <Letter f={{ ...f, logo: logo.src, ttd: ttd.src, stempel: stempel.src }} k={k * pg.f} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

        {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
          {posPad}
          <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
            <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
        </div>

        {/* Tombol unduh di paling bawah */}
        <div className="lg:hidden flex flex-wrap justify-center gap-3 mt-6 mb-20">
          <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
          <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
          <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
          <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
        </div>
      </div>
    </div>
  );
}

export default function SuratSehat() {
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
