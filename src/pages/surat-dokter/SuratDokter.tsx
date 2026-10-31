import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import RequireLogin from '../../shared/components/RequireLogin';
import FitPreview from '../../shared/components/FitPreview';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import {
  DOTTED, Dots, ExportButton, Field, ImageUpload, PAGE_H, PAGE_W, dataStyle as data,
  fmtTanggal, inputCls, orDots, useLetterExport, type Notify,
} from '../../shared/components/LetterKit';
import { Kop, Rule, SignName, StylePicker, Title, getGaya, useLetterFonts } from '../../shared/components/LetterStyles';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';

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
  isi: string; // kalimat hasil bila SAKIT
  isiSehat: string; // kalimat hasil bila SEHAT
  diagnosa: string;
  status: 'SAKIT' | 'SEHAT';
  hari: string;
  mulai: string;
  sampai: string;
  penutup: string;
  catatan: string;
  kota: string;
  tanggal: string;
  jabatan: string;
  ttd: string; // data URL, hanya di perangkat ini
  stempel: string;
  gaya: string; // id gaya surat (LetterStyles)
  skala: number; // ukuran teks surat (%)
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
  diagnosa: '',
  status: 'SAKIT',
  hari: '',
  mulai: '',
  sampai: '',
  penutup: 'Demikianlah surat keterangan ini saya perbuat, untuk dipergunakan dengan seperlunya.',
  catatan: '',
  kota: 'Bekasi',
  tanggal: '',
  jabatan: 'Dokter yang memeriksa',
  ttd: '',
  stempel: '',
  gaya: 'klasik',
  skala: 100,
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
    if (saved.isi === 'Setelah dilakukan pemeriksaan dinyatakan {status}*) dan memerlukan istirahat selama {hari} hari ({terbilang}) sejak tanggal {mulai} s/d {sampai}') delete saved.isi; // kalimat bawaan lama → kalimat diagnosa baru
    if (saved.catatan === '*) Coret yang tidak perlu') delete saved.catatan;
    return { ...DEFAULT, ...saved };
  } catch {
    return DEFAULT;
  }
}

// ---------------- Letter preview ----------------
function Letter({ f, k }: { f: Form; k: number }) {
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
    sehat: <strong>SEHAT secara jasmani dan rohani</strong>,
    hari: orDots(f.hari, '3em'),
    terbilang: orDots(hari > 0 ? terbilang(hari) : '', '5em'),
    mulai: orDots(fmtTanggal(f.mulai), '7em'),
    sampai: orDots(fmtTanggal(f.sampai), '7em'),
  };
  const isi = (f.status === 'SAKIT' ? f.isi : f.isiSehat).split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in tokens ? <span key={i}>{tokens[key]}</span> : part;
  });
  const izin = [f.sip && `SIP : ${f.sip}`, f.str && `STR : ${f.str}`].filter(Boolean).join('   |   ');
  // Kop 3 baris: nama, izin praktik, alamat + telepon
  const alamat = [[f.alamat1, f.alamat2].filter(Boolean).join(', '), f.telp && `Telp. ${f.telp}`].filter(Boolean).join('  •  ');

  return (
    <div style={{ width: PAGE_W, height: PAGE_H, overflow: 'hidden', boxSizing: 'border-box', padding: '48px 56px', background: '#fff', color: '#000', fontFamily: g.font, fontSize: g.size * k, lineHeight: 1.4 }}>
      {/* KOP 3 baris; garis pemisah & judul mengikuti gaya (klasik: garis tebal + tipis, judul bergaris bawah) */}
      <Kop g={g} k={k} name={f.nama} nameStyle={{ fontWeight: 700, fontSize: 24 * k, lineHeight: 1.15, letterSpacing: 0.5 }}>
        <div style={{ fontSize: 11 * k, lineHeight: 1.35, marginTop: 2 * k }}>
          {[izin, alamat].filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
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
      <p style={{ textAlign: 'justify', marginBottom: 4 * k }}>{isi}</p>
      <p style={{ textAlign: 'justify', marginBottom: 4 * k }}>{f.penutup}</p>
      {f.catatan && <p style={{ fontSize: 11 * k, marginBottom: 14 * k }}>{f.catatan}</p>}
      {/* Tanggal, keterangan, tanda tangan, nama: rata kanan */}
      <div style={{ textAlign: 'right' }}>
        <div>{f.kota && <span style={data}>{f.kota}</span>}, {f.tanggal ? <span style={data}>{fmtTanggal(f.tanggal)}</span> : <Dots w="8em" />}</div>
        <div>{f.jabatan}</div>
        <div style={{ position: 'relative', height: 80 * k }}>
          {f.stempel && (
            <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', right: 70 * k, top: 0, height: 80 * k, opacity: 0.9, mixBlendMode: 'multiply' }} />
          )}
          {f.ttd && (
            <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', right: 0, top: 6 * k, height: 68 * k, maxWidth: 200 * k, objectFit: 'contain', mixBlendMode: 'multiply' }} />
          )}
        </div>
        <SignName g={g} k={k}>{f.nama}</SignName>
      </div>
    </div>
  );
}

// ---------------- Main ----------------
function Editor({ user, notify }: { user: User; notify: Notify }) {
  const [f, setF] = useState<Form>(loadForm);
  const [bg, setBg] = useState({ ttd: false, stempel: false });
  const bgError = (m: string) => notify('error', m);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const letterRef = useRef<HTMLDivElement>(null);
  // Ukuran teks: diperkecil otomatis bila isi tidak muat di kertas A5
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, ttd.src, stempel.src]);
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
    setF((p) => ({ ...p, rows: p.rows.map((r) => ({ ...r, value: '' })), diagnosa: '', hari: '', mulai: '', sampai: '', tanggal: '' }));
    notify('info', 'Data pasien dikosongkan.');
  };
  const resetAll = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(DEFAULT);
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify);
  const exportBtn = (kind: 'PDF' | 'PNG' | 'Print', color: string) => (
    <ExportButton kind={kind} color={color} exporting={exporting} disabled={ttd.busy || stempel.busy} onRun={run} />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6">
            <div className="hidden lg:block"><TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} /></div>
            <div className="hidden lg:block">
            <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
            </div>
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
              {f.status === 'SAKIT' && (<>
              <Field label="Diagnosa (menderita penyakit)">
                <input className={inputCls} value={f.diagnosa} onChange={(e) => set('diagnosa', e.target.value)} placeholder="mis. Demam berdarah, ISPA, Gastritis" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Istirahat (hari)"><input type="number" min={0} readOnly={!!hitungHari(f.mulai, f.sampai)} title="Otomatis dari tanggal"
                  className={`${inputCls} read-only:bg-gray-100`} value={f.hari} onChange={(e) => set('hari', e.target.value)} /></Field>
                <Field label="Sejak tanggal"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => setTanggal('mulai', e.target.value)} /></Field>
                <Field label="Sampai"><input type="date" className={inputCls} value={f.sampai} onChange={(e) => setTanggal('sampai', e.target.value)} /></Field>
              </div>
              <Field label="Kalimat hasil SAKIT (penanda: {diagnosa} {hari} {terbilang} {mulai} {sampai})">
                <textarea rows={3} className={inputCls} value={f.isi} onChange={(e) => set('isi', e.target.value)} />
              </Field>
              </>)}
              {f.status === 'SEHAT' && (
                <Field label="Kalimat hasil SEHAT (penanda: {sehat})">
                  <textarea rows={2} className={inputCls} value={f.isiSehat} onChange={(e) => set('isiSehat', e.target.value)} />
                </Field>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Tanda Tangan</h2>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kota"><input className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Keterangan"><input className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify}
                bg={bg.ttd} onBg={(v) => setBg((p) => ({ ...p, ttd: v }))} shown={ttd.src} bgBusy={ttd.busy} />
              <p className="-mt-2 text-xs text-gray-500">Nama di bawah tanda tangan otomatis memakai nama dokter (kop). PNG transparan disarankan.</p>
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
              <Letter f={{ ...f, ttd: ttd.src, stempel: stempel.src }} k={k} />
            </div>
          </FitPreview>
        </div>

        {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
          <StylePicker value={f.gaya} onChange={(v) => set('gaya', v)} />
        </div>

        {/* Tombol unduh di paling bawah */}
        <div className="flex flex-wrap justify-center gap-3 mt-6 mb-20">
          {exportBtn('PDF', 'bg-red-600')}
          {exportBtn('PNG', 'bg-blue-600')}
          {exportBtn('Print', 'bg-slate-700')}
          <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
          <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
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
