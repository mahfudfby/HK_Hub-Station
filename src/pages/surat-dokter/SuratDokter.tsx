import UserData from '../../shared/components/UserData';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import AutoTextarea from '../../shared/components/AutoTextarea';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import RequireLogin from '../../shared/components/RequireLogin';
import FitPreview from '../../shared/components/FitPreview';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import {
  DOTTED, Dots, ExportButton, Field, ImageUpload, PaperPicker, letterPage, dataStyle as data,
  fmtTanggal, inputCls, orDots, signSpace, useLetterExport, type Notify,
} from '../../shared/components/LetterKit';
import { FitLine, Kop, Rule, SignName, StylePicker, Title, getGaya, useLetterFonts } from '../../shared/components/LetterStyles';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import PositionPad, { fxOf, getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import DocOptions from '../../shared/components/DocOptions';
import FormSection from '../../shared/components/FormSection';

// Surat keterangan dokter: hanya untuk akun admin (login lewat tombol mengambang / halaman /login).

const STORAGE_KEY = 'surat-dokter:v1';
const USER_KEYS = ['posisi', 'nama', 'sip', 'str', 'alamat1', 'alamat2', 'telp', 'judul', 'pembuka', 'penutup', 'catatan', 'kota', 'jabatan', 'ttd', 'stempel', 'logo'] as const;

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
  isi: string; // kalimat hasil bila SAKIT (terkunci, tidak bisa diedit)
  isiSehat: string; // kalimat hasil bila SEHAT (terkunci, tidak bisa diedit)
  hasilSehat: string; // isi hasil, mis. "SEHAT secara jasmani dan rohani"
  diagnosa: string;
  status: 'SAKIT' | 'SEHAT';
  hari: string;
  mulai: string;
  sampai: string;
  penutup: string; // penutup bila SAKIT
  penutupSehat: string; // penutup bila SEHAT (terkunci; {tujuan} diisi dari kolom Tujuan)
  tujuan: string;
  catatan: string;
  kota: string;
  tanggal: string;
  jabatan: string;
  ttd: string; // data URL, hanya di perangkat ini
  stempel: string;
  posisi: Offsets; // geseran logo, tanda tangan & stempel (px dokumen)
  logo: string; // opsional, kiri atas kop; data URL, hanya di perangkat ini
  gaya: string; // id gaya surat (LetterStyles)
  paper: string; // id LETTER_PAPERS
  landscape: boolean;
  skala: number; // ukuran teks surat (%)
  kosong: boolean; // template kosongan (isi manual)
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
  isi: 'Setelah dilakukan pemeriksaan, yang bersangkutan didiagnosa menderita penyakit {diagnosa} dan perlu istirahat selama {hari} hari ({terbilang}) sejak tanggal {mulai} s/d {sampai}.',
  isiSehat: 'Setelah dilakukan pemeriksaan, yang bersangkutan dinyatakan {sehat}.',
  hasilSehat: 'SEHAT secara jasmani dan rohani',
  diagnosa: '',
  status: 'SAKIT',
  hari: '',
  mulai: '',
  sampai: '',
  penutup: 'Demikianlah surat keterangan ini saya perbuat, untuk dipergunakan dengan seperlunya.',
  penutupSehat: 'Untuk dipergunakan sebagai kelengkapan administrasi : {tujuan}',
  tujuan: '',
  catatan: '',
  kota: 'Bekasi',
  tanggal: '',
  jabatan: 'Dokter yang memeriksa',
  ttd: '',
  stempel: '',
  posisi: {},
  logo: '',
  gaya: 'klasik',
  skala: 100,
  paper: 'A5',
  landscape: false,
  kosong: false,
};

const SATUAN = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
export function terbilang(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${terbilang(n % 10)}` : ''}`;
  return String(n);
}
console.assert(terbilang(3) === 'tiga' && terbilang(12) === 'dua belas' && terbilang(21) === 'dua puluh satu', 'terbilang');

// Jumlah hari istirahat dari tanggal mulai s/d sampai (keduanya dihitung). '' jika belum lengkap/terbalik.
export function hitungHari(mulai: string, sampai: string): string {
  if (!mulai || !sampai) return '';
  const n = Math.round((Date.parse(`${sampai}T00:00:00Z`) - Date.parse(`${mulai}T00:00:00Z`)) / 86_400_000) + 1;
  return n > 0 ? String(n) : '';
}
console.assert(hitungHari('2026-10-30', '2026-11-01') === '3' && hitungHari('2026-11-01', '2026-11-01') === '1' && hitungHari('2026-11-02', '2026-11-01') === '', 'hitungHari');

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return DEFAULT;
    delete saved.namaTtd; // dulu ada isian nama penanda tangan; sekarang selalu nama dokter
    if (saved.catatan === '*) Coret yang tidak perlu') delete saved.catatan;
    // Narasi SAKIT & SEHAT dikunci (dulu bisa diedit & membingungkan): selalu pakai kalimat baku
    delete saved.isi;
    delete saved.isiSehat;
    delete saved.penutupSehat;
    return { ...DEFAULT, ...saved };
  } catch {
    return DEFAULT;
  }
}

// Template kosongan: data pasien, hasil, tanggal → titik-titik; ttd & stempel disembunyikan (tanda tangan basah).
// Kop, nama dokter, SIP/STR & kalimat baku tetap. Isian form tidak berubah.
const tampilKosong = (f: Form): Form => (!f.kosong ? f : {
  ...f, rows: f.rows.map((r) => ({ ...r, value: '' })), diagnosa: '', hasilSehat: '', tujuan: '', hari: '', mulai: '', sampai: '', tanggal: '', ttd: '', stempel: '',
});

// ---------------- Letter preview ----------------
function Letter({ f, k, W, H, pf }: { f: Form; k: number; W: number; H: number; pf: number }) {
  const g = getGaya(f.gaya);
  useLetterFonts(g);
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
    diagnosa: orDots(f.diagnosa, '12em'),
    sehat: f.hasilSehat ? <strong>{f.hasilSehat}</strong> : <Dots w="12em" />,
    tujuan: (
      <span style={{ display: 'block', textAlign: 'center', marginTop: 4 * k, fontWeight: 700, fontStyle: 'italic', fontSize: '1.45em', lineHeight: 1.3 }}>
        {f.tujuan || <Dots w="14em" />}
      </span>
    ),
    hari: orDots(f.hari, '3em'),
    terbilang: orDots(hari > 0 ? terbilang(hari) : '', '5em'),
    mulai: orDots(fmtTanggal(f.mulai), '7em'),
    sampai: orDots(fmtTanggal(f.sampai), '7em'),
  };
  // Ganti penanda {…} dengan data (miring + titik-titik)
  const fill = (text: string) => text.split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in tokens ? <span key={i}>{tokens[key]}</span> : part;
  });
  const isi = fill(f.status === 'SAKIT' ? f.isi : f.isiSehat);
  const penutup = fill(f.status === 'SAKIT' ? f.penutup : f.penutupSehat);
  // Kop piramida 3 baris: nama (atas, pendek) → alamat → kelurahan/kota + telepon (paling lebar). SIP/STR di bawah tanda tangan.
  const kopLines = [f.alamat1, [f.alamat2, f.telp && `Telp. ${f.telp}`].filter(Boolean).join('  •  ')].filter(Boolean);

  return (
    <div style={{ width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', padding: `${48 * pf}px ${56 * pf}px`, background: '#fff', color: '#000', fontFamily: g.font, fontSize: g.size * k, lineHeight: 1.4, display: 'flex', flexDirection: 'column' }}>
      {/* KOP 3 baris; garis pemisah & judul mengikuti gaya (klasik: garis tebal + tipis, judul bergaris bawah) */}
      <Kop g={g} k={k} logo={f.logo} logoOffset={getOffset(f.posisi, 'logo')} logoH={58 * k} name={f.nama} nameStyle={{ fontWeight: 700, fontSize: 24 * k, lineHeight: 1.15, letterSpacing: 0.5 }}>
        <div style={{ lineHeight: 1.35, marginTop: 2 * k }}>
          {kopLines.map((line, i) => <FitLine key={i} style={{ fontSize: (i === kopLines.length - 1 ? 11 : 11.5) * k }}>{line}</FitLine>)}
        </div>
      </Kop>
      <Rule g={g} mb={14 * k} />
      <div style={{ textAlign: 'center', marginBottom: 10 * k }}><Title g={g} k={k}>{f.judul}</Title></div>
      <p style={{ marginBottom: 4 * k }}>{f.pembuka}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 8 * k, rowGap: g.rowGap * k, marginBottom: 8 * k }}>
        {f.rows.map((r, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <span style={{ minWidth: (96 + g.labelExtra) * k }}>{r.label}</span>
            <span style={{ display: 'flex', gap: 6 * k }}>
              <span>:</span>
              {r.value ? <span style={{ ...data, flex: 1, whiteSpace: 'pre-line' }}>{r.value}</span> : <span style={{ flex: 1, borderBottom: DOTTED }} />}
            </span>
          </div>
        ))}
      </div>
      {/* Rata kiri agar tidak ada spasi panjang antar kata */}
      <p style={{ marginBottom: 4 * k }}>{isi}</p>
      <p style={{ marginBottom: 4 * k }}>{penutup}</p>
      {f.catatan && <p style={{ fontSize: 11 * k, marginBottom: 14 * k }}>{f.catatan}</p>}
      {/* Jarak elastis ke tanda tangan: lega bila isi pendek, menyusut (tidak keluar kertas) bila isi panjang */}
      <div aria-hidden="true" style={{ flex: `0 1 ${64 * k}px`, minHeight: 20 * k }} />
      {/* Tanggal, keterangan, tanda tangan, nama: blok mentok margin kanan */}
      <div style={{ textAlign: 'right', marginLeft: 'auto', width: 'fit-content', maxWidth: '100%' }}>
        <div>{f.kota && <span style={data}>{f.kota}</span>}, {f.tanggal ? <span style={data}>{fmtTanggal(f.tanggal)}</span> : <Dots w="8em" />}</div>
        <div>{f.jabatan}</div>
        <div style={{ position: 'relative', height: signSpace(80 * k) }}>
          {f.stempel && (
            <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', right: 70 * k - getOffset(f.posisi, 'stempel').x, top: getOffset(f.posisi, 'stempel').y, height: 80 * k * fxOf(getOffset(f.posisi, 'stempel'), 'stempel').z, opacity: fxOf(getOffset(f.posisi, 'stempel'), 'stempel').a, mixBlendMode: 'multiply' }} />
          )}
          {f.ttd && (
            <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', right: -getOffset(f.posisi, 'ttd').x, top: (signSpace(80 * k) - 68 * k * fxOf(getOffset(f.posisi, 'ttd'), 'ttd').z) / 2 + getOffset(f.posisi, 'ttd').y, height: 68 * k * fxOf(getOffset(f.posisi, 'ttd'), 'ttd').z, maxWidth: 200 * k * fxOf(getOffset(f.posisi, 'ttd'), 'ttd').z, opacity: fxOf(getOffset(f.posisi, 'ttd'), 'ttd').a, objectFit: 'contain', mixBlendMode: 'multiply' }} />
          )}
        </div>
        <SignName g={g} k={k}>{f.nama}</SignName>
        {f.sip && <div style={{ fontSize: 11 * k }}>SIP : {f.sip}</div>}
        {f.str && <div style={{ fontSize: 11 * k }}>STR : {f.str}</div>}
      </div>
    </div>
  );
}

// ---------------- Main ----------------
function Editor({ user, notify }: { user: User; notify: Notify }) {
  const [f, setF] = useState<Form>(loadForm);
  const [bg, setBg] = useState({ logo: false, ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const letterRef = useRef<HTMLDivElement>(null);
  // Kertas & orientasi pilihan; ukuran teks diperkecil otomatis bila isi tidak muat
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  // Ubah tanggal istirahat: jumlah hari ikut dihitung otomatis
  const setTanggal = (k: 'mulai' | 'sampai', v: string) =>
    setF((p) => {
      const n = { ...p, [k]: v };
      return { ...n, hari: hitungHari(n.mulai, n.sampai) || p.hari };
    });
  const setRow = (i: number, patch: Partial<Row>) => set('rows', f.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const fileName = `surat-keterangan-${(f.rows[0]?.value || 'pasien').replace(/\s+/g, '-').toLowerCase()}`;

  const resetPasien = () => {
    setF((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r, value: '' })), diagnosa: '', tujuan: '', hari: '', mulai: '', sampai: '', tanggal: '' }));
    notify('info', 'Data pasien dikosongkan.');
  };
  const resetAll = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(DEFAULT);
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);
  const exportBtn = (kind: 'PDF' | 'PNG' | 'Print', color: string) => (
    <ExportButton kind={kind} color={color} exporting={exporting} disabled={logo.busy || ttd.busy || stempel.busy} onRun={run} />
  );

  const [geser, setGeser] = useState('ttd');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      {exportBtn('PDF', 'bg-red-600')}
      {exportBtn('PNG', 'bg-blue-600')}
      {exportBtn('Print', 'bg-slate-700')}
      <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
      <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
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
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-dokter" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />
            <FormSection title="Data Pasien">
              {f.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[8rem_1fr] gap-2">
                  <AutoTextarea aria-label={`Label baris ${i + 1}`} className={inputCls} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                  <AutoTextarea aria-label={r.label} rows={r.label.toLowerCase().includes('alamat') ? 2 : 1} className={inputCls} value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })} />
                </div>
              ))}
              <div className="flex gap-3 text-sm">
                <button type="button" onClick={() => set('rows', [...f.rows, { label: 'Baris baru', value: '' }])} className="text-blue-700">+ Tambah baris</button>
                {f.rows.length > 1 && (
                  <button type="button" onClick={() => set('rows', f.rows.slice(0, -1))} className="text-red-600">− Hapus baris terakhir</button>
                )}
              </div>
            </FormSection>

            <FormSection title="Hasil Pemeriksaan">
              <Field label="Dinyatakan">
                <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  <option value="SAKIT">SAKIT</option>
                  <option value="SEHAT">SEHAT</option>
                </select>
              </Field>
              {f.status === 'SAKIT' && (<>
              <Field label="Diagnosa (menderita penyakit)">
                <AutoTextarea className={inputCls} value={f.diagnosa} onChange={(e) => set('diagnosa', e.target.value)} placeholder="mis. Demam berdarah, ISPA, Gastritis" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Istirahat (hari)"><input type="number" min={0} readOnly={!!hitungHari(f.mulai, f.sampai)} title="Otomatis dari tanggal"
                  className={`${inputCls} read-only:bg-gray-100`} value={f.hari} onChange={(e) => set('hari', e.target.value)} /></Field>
                <Field label="Sejak tanggal"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => setTanggal('mulai', e.target.value)} /></Field>
                <Field label="Sampai"><input type="date" className={inputCls} value={f.sampai} onChange={(e) => setTanggal('sampai', e.target.value)} /></Field>
              </div>
              <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                Kalimat di surat sudah baku: “Setelah dilakukan pemeriksaan, yang bersangkutan didiagnosa menderita penyakit <b>{f.diagnosa || '…'}</b> dan
                perlu istirahat selama <b>{f.hari || '…'}</b> hari ({hitungHari(f.mulai, f.sampai) || f.hari ? 'terbilang otomatis' : '…'}) sejak tanggal <b>{fmtTanggal(f.mulai) || '…'}</b> s/d <b>{fmtTanggal(f.sampai) || '…'}</b>.”
              </p>
              </>)}
              {f.status === 'SEHAT' && (<>
                <Field label="Hasil pemeriksaan">
                  <AutoTextarea className={inputCls} value={f.hasilSehat} onChange={(e) => set('hasilSehat', e.target.value)} placeholder="mis. SEHAT secara jasmani dan rohani" />
                </Field>
                <Field label="Tujuan penggunaan surat">
                  <AutoTextarea className={inputCls} value={f.tujuan} onChange={(e) => set('tujuan', e.target.value)} placeholder="mis. Melamar pekerjaan, Pendaftaran sekolah" />
                </Field>
                <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                  Kalimat di surat sudah baku: “Setelah dilakukan pemeriksaan, yang bersangkutan dinyatakan <b>{f.hasilSehat || '…'}</b>.
                  Untuk dipergunakan sebagai kelengkapan administrasi : <b>{f.tujuan || '…'}</b>”
                </p>
              </>)}
            </FormSection>

            <FormSection title="Tanda Tangan">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Keterangan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Logo kop (opsional, kiri atas)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify}
                bg={bg.logo} onBg={(v) => setBg((p) => ({ ...p, logo: v }))} shown={logo.src} bgBusy={logo.busy} />
              <p className="-mt-2 text-xs text-gray-500">Kosongkan bila surat tanpa logo.</p>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify}
                bg={bg.ttd} onBg={(v) => setBg((p) => ({ ...p, ttd: v }))} shown={ttd.src} bgBusy={ttd.busy} />
              <p className="-mt-2 text-xs text-gray-500">Nama di bawah tanda tangan otomatis memakai nama dokter (kop). PNG transparan disarankan.</p>
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify}
                bg={bg.stempel} onBg={(v) => setBg((p) => ({ ...p, stempel: v }))} shown={stempel.src} bgBusy={stempel.busy} />
              <p className="text-xs text-gray-500">Logo, tanda tangan &amp; stempel hanya disimpan di perangkat ini, tidak diunggah ke server.</p>
            </FormSection>

            <details className="space-y-3">
              <summary className="font-bold cursor-pointer">Kop &amp; Teks Surat</summary>
              <div className="space-y-3 pt-3">
                <Field label="Nama dokter (kop)"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="No. SIP"><NumberFormatInput parts={['Kode', 'Nomor', 'Instansi', 'Bulan', 'Tahun']} example="446.1/0434.1/Pu Kes-3/VI/2011 (bulan angka romawi)" value={f.sip} onChange={(v) => set('sip', v)} /></Field>
                  <Field label="No. STR"><NumberFormatInput parts={['Kode', 'Nomor', 'Nomor']} example="312/1001060/4226" value={f.str} onChange={(v) => set('str', v)} /></Field>
                </div>
                <Field label="Alamat (baris 1)"><AutoTextarea className={inputCls} value={f.alamat1} onChange={(e) => set('alamat1', e.target.value)} /></Field>
                <Field label="Alamat (baris 2: kelurahan, kota)"><AutoTextarea className={inputCls} value={f.alamat2} onChange={(e) => set('alamat2', e.target.value)} /></Field>
                <Field label="No. Telepon"><AutoTextarea className={inputCls} value={f.telp} onChange={(e) => set('telp', e.target.value)} /></Field>
                <p className="text-xs text-gray-500">Kosongkan isian untuk menyembunyikan barisnya di surat.</p>
                <Field label="Judul"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
                <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
                <Field label="Kalimat penutup (SAKIT)"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
                <Field label="Catatan kaki"><AutoTextarea className={inputCls} value={f.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
              </div>
            </details>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <Letter f={tampilKosong({ ...f, logo: logo.src, ttd: ttd.src, stempel: stempel.src })} k={k * pg.f} W={pg.W} H={pg.H} pf={pg.f} />
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
