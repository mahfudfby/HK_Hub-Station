import UserData from '../../shared/components/UserData';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import AutoTextarea from '../../shared/components/AutoTextarea';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import RequireLogin from '../../shared/components/RequireLogin';
import FitPreview from '../../shared/components/FitPreview';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { cssFamily, useGoogleFonts, type WebFont } from '../../shared/lib/fonts';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import {
  ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, signSpace, useLetterExport, type Notify,
} from '../../shared/components/LetterKit';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import PositionPad, { fxOf, getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import DocOptions, { nomorTampil } from '../../shared/components/DocOptions';
import FormSection from '../../shared/components/FormSection';

// Copy resep / salinan resep (A5): hanya untuk akun login. Kop diisi sendiri oleh apotek / instalasi farmasi pemakai.
// Semua isian data memakai font tulisan tangan Latin (Google Fonts) supaya menyerupai tulisan tangan di atas formulir cetak.

const STORAGE_KEY = 'copy-resep:v1';
const USER_KEYS = ['posisi', 'tata', 'tulisan', 'instansi', 'izin', 'apotekerLabel', 'apoteker', 'sipa', 'alamatKop', 'logo', 'kota', 'jabatan', 'ttd', 'stempel'] as const;
const NO_FMT = '{n3}/R/{yyyy}';
const DOT = '1.5px dotted #000';
const PRINT_FONT = cssFamily('Tinos', '"Times New Roman", serif');

type Tata = 'apotek' | 'rs' | 'klasik';
// Tiga tata letak menurut contoh: kop berkotak + info 2 kolom, salinan resep instalasi farmasi RS, kotak klasik info per baris.
const TATA: { id: Tata; name: string; judul: string }[] = [
  { id: 'apotek', name: 'Apotek â€” kop berkotak, info 2 kolom', judul: 'COPY RESEP' },
  { id: 'rs', name: 'Instalasi Farmasi RS â€” salinan resep', judul: 'SALINAN RESEP' },
  { id: 'klasik', name: 'Apotek Klasik â€” info per baris', judul: 'COPY RESEP' },
];
const judulBawaan = (id: string) => TATA.find((t) => t.id === id)?.judul;

// Font tulisan tangan huruf Latin; size = koreksi ukuran (em) karena tiap font punya tinggi huruf berbeda.
const TULISAN: { id: string; label: string; web: WebFont; size: number }[] = [
  { id: 'Caveat', label: 'Caveat â€” tulisan tangan rapi', web: { family: 'Caveat', weights: [400, 700] }, size: 1.3 },
  { id: 'Kalam', label: 'Kalam â€” tulisan tangan tegak', web: { family: 'Kalam', weights: [400, 700] }, size: 1.05 },
  { id: 'Dancing Script', label: 'Dancing Script â€” Latin sambung', web: { family: 'Dancing Script', weights: [400, 700] }, size: 1.2 },
  { id: 'Homemade Apple', label: 'Homemade Apple â€” coretan dokter', web: { family: 'Homemade Apple', weights: [400] }, size: 0.95 },
  { id: 'Reenie Beanie', label: 'Reenie Beanie â€” tulisan cepat', web: { family: 'Reenie Beanie', weights: [400] }, size: 1.55 },
  { id: 'Indie Flower', label: 'Indie Flower â€” tulisan santai', web: { family: 'Indie Flower', weights: [400] }, size: 1.1 },
];
const tulisanOf = (id: string) => TULISAN.find((t) => t.id === id) ?? TULISAN[0];

// Tanda di akhir copy resep (singkatan farmasi baku)
const TANDA = [
  { v: 'PCC', label: 'PCC (Pro Copia Conform â€” sesuai asli)' },
  { v: 'Det', label: 'Det (Detur â€” boleh diberikan)' },
  { v: 'Ne det', label: 'Ne det (Ne detur â€” tidak boleh diberikan)' },
  { v: 'Iter 1x', label: 'Iter 1x (boleh diulang 1 kali)' },
  { v: 'Iter 2x', label: 'Iter 2x (boleh diulang 2 kali)' },
  { v: '', label: 'Tanpa tanda' },
];

type Obat = { nama: string; jumlah: string };
type Form = {
  tata: Tata;
  tulisan: string;
  instansi: string;
  izin: string;
  apotekerLabel: string;
  apoteker: string;
  sipa: string;
  alamatKop: string;
  logo: string;
  judul: string;
  nomor: string;
  tanggalResep: string;
  dokter: string;
  pasien: string;
  tglLahir: string;
  obat: Obat[];
  signa: string;
  tanda: string;
  kota: string;
  tanggal: string;
  jabatan: string;
  ttd: string; // data URL, hanya di perangkat ini
  stempel: string;
  posisi: Offsets; // geseran logo, tanda tangan & stempel (px dokumen)
  paper: string; // id LETTER_PAPERS
  landscape: boolean;
  skala: number; // ukuran teks (%)
  pakaiNomor: boolean;
  kosong: boolean; // template kosongan (isi manual)
};

const DEFAULT: Form = {
  tata: 'apotek',
  tulisan: 'Caveat',
  instansi: 'APOTEK NAMA ANDA',
  izin: 'SIA : nomor izin apotek',
  apotekerLabel: 'APA',
  apoteker: 'Nama Apoteker, S.Farm., Apt',
  sipa: 'SIPA : nomor SIPA apoteker',
  alamatKop: 'Alamat lengkap apotek',
  logo: '',
  judul: 'COPY RESEP',
  nomor: randomDocNo(NO_FMT),
  tanggalResep: '',
  dokter: 'dr. Nama Dokter',
  pasien: 'Nama Pasien',
  tglLahir: '',
  obat: [{ nama: 'Paracetamol 500 mg tab', jumlah: 'No. X' }, { nama: 'Vitamin C 50 mg tab', jumlah: 'No. X' }],
  signa: 'S 3 dd tab 1 p.c.',
  tanda: 'PCC',
  kota: '',
  tanggal: '',
  jabatan: 'Apoteker Penanggung Jawab',
  ttd: '',
  stempel: '',
  posisi: {},
  paper: 'A5',
  landscape: false,
  skala: 100,
  pakaiNomor: true,
  kosong: false,
};

function loadForm(): Form {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...DEFAULT, ...saved, nomor: orRandomNo(saved.nomor, NO_FMT) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

// Template kosongan: data resep, pasien, dokter, tanggal â†’ titik-titik / ruang kosong; ttd & stempel disembunyikan.
// Kop, apoteker, SIPA & kalimat baku tetap. Isian form tidak berubah.
const tampilKosong = (f: Form): Form => (!f.kosong ? f : {
  ...f, tanggalResep: '', dokter: '', pasien: '', tglLahir: '', obat: [], signa: '', tanda: '', tanggal: '', ttd: '', stempel: '',
});

// ---------------- Preview dokumen ----------------
function Letter({ f, k, W, H, pf }: { f: Form; k: number; W: number; H: number; pf: number }) {
  const T = tulisanOf(f.tulisan);
  useGoogleFonts([{ family: 'Tinos', weights: [400, 700] }, T.web]);
  const nomor = nomorTampil(f.nomor, f.pakaiNomor, f.kosong); // undefined = baris nomor disembunyikan
  const tglResep = f.tanggalResep ? fmtTanggal(f.tanggalResep) : '';
  const tglCopy = f.tanggal ? fmtTanggal(f.tanggal) : '';
  const lahir = f.tglLahir ? fmtTanggal(f.tglLahir) : '';
  const off = (id: string) => getOffset(f.posisi, id);
  const hand: CSSProperties = { fontFamily: cssFamily(T.web.family, 'cursive'), fontSize: `${T.size}em`, fontStyle: 'italic', lineHeight: 1.15, whiteSpace: 'pre-line' };
  // Isian data: tulisan tangan; kosong â†’ garis titik-titik sepanjang sisa baris
  const val = (v: string) => (v ? <span style={{ ...hand, flex: 1, minWidth: 0 }}>{v}</span> : <span style={{ flex: 1, minWidth: 0, borderBottom: DOT, alignSelf: 'flex-end', height: '1em' }} />);
  const row = (label: string, v: string, w = '6.2em') => (
    <div key={label} style={{ display: 'flex', gap: 4 * k, alignItems: 'baseline', minWidth: 0 }}>
      <span style={{ width: w, flexShrink: 0 }}>{label}</span>
      <span style={{ flexShrink: 0 }}>:</span>
      {val(v)}
    </div>
  );
  const dots = (w: string) => <span style={{ display: 'inline-block', width: w, borderBottom: DOT }} />;
  const t = f.tata;

  // --- Kop ---
  const lg = off('logo');
  const lgFx = fxOf(lg, 'logo');
  const apt = `${f.apotekerLabel ? `${f.apotekerLabel} : ` : ''}${f.apoteker}`;
  const kop = (
    <div style={{ position: 'relative', padding: `${8 * k}px ${10 * k}px`, borderBottom: t === 'apotek' ? '1px solid #000' : '2px solid #000', minHeight: f.logo ? 62 * k : undefined }}>
      {f.logo && <img src={f.logo} alt="Logo" style={{ position: 'absolute', left: 10 * k + lg.x, top: 8 * k + lg.y, height: 54 * k * lgFx.z, maxWidth: 68 * k * lgFx.z, opacity: lgFx.a, objectFit: 'contain' }} />}
      <div style={{ textAlign: 'center', padding: f.logo ? `0 ${70 * k}px` : 0 }}>
        <div style={{ fontWeight: 700, fontSize: 17 * k, lineHeight: 1.2, whiteSpace: 'pre-line' }}>{f.instansi}</div>
        {f.izin && <div>{f.izin}</div>}
        {t === 'rs' ? (
          <div style={{ textAlign: 'left', display: 'inline-block' }}>
            {f.apoteker && <div>{apt}</div>}
            {f.sipa && <div>{f.sipa}</div>}
          </div>
        ) : (
          <>
            {f.apoteker && <div>{apt}</div>}
            {f.sipa && <div>{f.sipa}</div>}
          </>
        )}
        {f.alamatKop && <div style={{ fontSize: 11 * k, whiteSpace: 'pre-line' }}>{f.alamatKop}</div>}
      </div>
    </div>
  );

  // --- Info resep ---
  const nomorTeks = nomor ?? '';
  const meta2kolom = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 * k, rowGap: 2 * k, padding: `${6 * k}px ${10 * k}px`, borderBottom: '3px double #000' }}>
      {[
        ...(nomor !== undefined ? [['Nomor R/', nomorTeks]] : []),
        ['Tanggal R/', tglResep], ['Dokter', f.dokter], ['Pasien', f.pasien],
      ].map(([l, v]) => row(l, v, '5.4em'))}
    </div>
  );
  const metaDaftar = t === 'rs' ? (
    <div style={{ marginBottom: 6 * k }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 * k }}>
        {nomor !== undefined ? row('No. Resep', nomorTeks, '5.6em') : <span />}
        <div style={{ display: 'flex', gap: 4 * k, alignItems: 'baseline', width: '46%' }}><span>Tgl. Resep :</span>{val(tglResep)}</div>
      </div>
      {row('Nama Pasien', f.pasien, '5.6em')}
      {row('Tgl. Lahir', lahir, '5.6em')}
      {row('Nama Dokter', f.dokter, '5.6em')}
    </div>
  ) : t === 'klasik' ? (
    <div style={{ marginBottom: 6 * k }}>
      {nomor !== undefined && row('No', nomorTeks, '5.2em')}
      {row('Resep dari', f.dokter, '5.2em')}
      {row('Tanggal R/', tglResep, '5.2em')}
      {row('Pro', f.pasien, '5.2em')}
    </div>
  ) : null;

  const judul = (
    <div style={{ textAlign: 'center', fontWeight: t === 'klasik' ? 400 : 700, textDecoration: t === 'klasik' ? 'underline' : 'none', fontSize: 15 * k, padding: `${6 * k}px 0 ${4 * k}px` }}>{f.judul}</div>
  );
  const kotaTanggal = (
    <div>{f.kota ? f.kota : dots('5em')}, {tglCopy ? <span style={hand}>{tglCopy}</span> : dots('7em')}</div>
  );

  // --- Isi resep (R/) ---
  const barisObat = f.obat.filter((o) => o.nama || o.jumlah);
  const isi = (
    <div style={{ flex: 1, minHeight: 36 * k, marginTop: 4 * k }}>
      <div style={{ display: 'flex', gap: 6 * k, alignItems: 'baseline' }}>
        <span style={{ width: '2em', flexShrink: 0, fontWeight: 700, fontSize: 15 * k }}>R/</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {barisObat.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 * k, alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ ...hand, minWidth: 0 }}>{o.nama}</span>
              <span style={{ ...hand, whiteSpace: 'nowrap' }}>{o.jumlah}</span>
            </div>
          ))}
          {f.signa && <div style={{ ...hand, marginTop: 4 * k, paddingLeft: '1.6em' }}>{f.signa}</div>}
        </div>
      </div>
    </div>
  );

  // --- Tanda, tanggal (RS), tanda tangan apoteker: blok mentok kanan ---
  const tt = off('ttd');
  const st = off('stempel');
  const sign = (
    <div style={{ textAlign: 'center', marginLeft: 'auto', width: 'fit-content', maxWidth: '100%', marginTop: 8 * k }}>
      {t === 'rs' && <div style={{ textAlign: 'right' }}>{kotaTanggal}</div>}
      {f.tanda && <div style={{ fontWeight: 700 }}>{f.tanda}</div>}
      <div>{f.jabatan}</div>
      <div style={{ position: 'relative', height: signSpace(64 * k) }}>
        {f.stempel && <img src={f.stempel} alt="Stempel" style={{ position: 'absolute', right: 60 * k - st.x, top: st.y, height: 64 * k * fxOf(st, 'stempel').z, opacity: fxOf(st, 'stempel').a, mixBlendMode: 'multiply' }} />}
        {f.ttd && <img src={f.ttd} alt="Tanda tangan" style={{ position: 'absolute', left: '50%', marginLeft: tt.x, top: (signSpace(64 * k) - 56 * k * fxOf(tt, 'ttd').z) / 2 + tt.y, height: 56 * k * fxOf(tt, 'ttd').z, maxWidth: 160 * k * fxOf(tt, 'ttd').z, opacity: fxOf(tt, 'ttd').a, objectFit: 'contain', transform: 'translateX(-50%)', mixBlendMode: 'multiply' }} />}
      </div>
      <div style={{ fontWeight: 700 }}>{f.apoteker}</div>
      {f.sipa && <div style={{ fontSize: 11 * k }}>{f.sipa}</div>}
    </div>
  );

  return (
    <div style={{ width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', padding: `${26 * pf}px`, background: '#fff', color: '#000', fontFamily: PRINT_FONT, fontSize: 13 * k, lineHeight: 1.3 }}>
      <div style={{ border: '1.5px solid #000', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {kop}
        {t === 'apotek' && meta2kolom}
        {judul}
        <div style={{ padding: `${4 * k}px ${14 * k}px ${10 * k}px`, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {t !== 'rs' && <div style={{ paddingLeft: t === 'apotek' ? '42%' : '38%', marginBottom: 6 * k }}>{kotaTanggal}</div>}
          {metaDaftar}
          {isi}
          {sign}
        </div>
      </div>
    </div>
  );
}

// ---------------- Editor ----------------
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
  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const setObat = (i: number, patch: Partial<Obat>) => set('obat', f.obat.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const bgFor = (key: keyof typeof bg) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })) });
  // Ganti tata letak: judul ikut judul bawaan tata letak baru selama belum diubah manual
  const setTata = (id: Tata) => setF((p) => ({ ...p, tata: id, judul: p.judul === judulBawaan(p.tata) ? judulBawaan(id) ?? p.judul : p.judul }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const fileName = `copy-resep-${(f.pasien || 'pasien').replace(/\s+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);
  const busy = logo.busy || ttd.busy || stempel.busy;

  const resetPasien = () => {
    setF((p) => ({ ...p, nomor: randomDocNo(NO_FMT), tanggalResep: '', pasien: '', tglLahir: '', obat: [{ nama: '', jumlah: '' }], signa: '', tanggal: '' }));
    notify('info', 'Data pasien & isi resep dikosongkan.');
  };
  const resetAll = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF({ ...DEFAULT, nomor: randomDocNo(NO_FMT) });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const [geser, setGeser] = useState('ttd');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <Field label="Tata letak">
        <select className={inputCls} value={f.tata} onChange={(e) => setTata(e.target.value as Tata)}>
          {TATA.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Font isian (tulisan tangan Latin)">
        <select className={inputCls} value={tulisanOf(f.tulisan).id} onChange={(e) => set('tulisan', e.target.value)}>
          {TULISAN.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </Field>
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={resetPasien} className="px-5 py-2 rounded-lg bg-white border font-semibold">Kosongkan Data Pasien</button>
      <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
      <p className="w-full text-xs text-gray-500">Salinan resep diterbitkan oleh apoteker pengelola apotek / instalasi farmasi. Pastikan isinya sesuai resep asli.</p>
    </>
  );
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Link to="/" className="btn-home">&larr; HK-HUB Menu Utama</Link>
          <div className="text-sm text-gray-600">Login sebagai {user.email}</div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-4">Copy Resep Apotek &amp; Dokter</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:copy-resep" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />
            <FormSection title="Data Resep">
              <Field label="Nomor resep"><NumberFormatInput parts={['Urut', 'Kode', 'Tahun']} example="012/R/2026" value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tanggal resep"><input type="date" className={inputCls} value={f.tanggalResep} onChange={(e) => set('tanggalResep', e.target.value)} /></Field>
                <Field label="Tanggal lahir pasien"><input type="date" className={inputCls} value={f.tglLahir} onChange={(e) => set('tglLahir', e.target.value)} /></Field>
                <Field label="Dokter (resep dari)"><AutoTextarea className={inputCls} value={f.dokter} onChange={(e) => set('dokter', e.target.value)} /></Field>
                <Field label="Nama pasien"><AutoTextarea className={inputCls} value={f.pasien} onChange={(e) => set('pasien', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Isi Resep (R/)">
              {f.obat.map((o, i) => (
                <div key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2 items-end">
                  <Field label={i === 0 ? 'Nama obat / bahan' : ''}><AutoTextarea aria-label={`Obat ${i + 1}`} className={inputCls} value={o.nama} onChange={(e) => setObat(i, { nama: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Jumlah' : ''}><input aria-label={`Jumlah ${i + 1}`} className={inputCls} value={o.jumlah} placeholder="No. X" onChange={(e) => setObat(i, { jumlah: e.target.value })} /></Field>
                  <button type="button" onClick={() => set('obat', f.obat.filter((_, j) => j !== i))} aria-label={`Hapus obat ${i + 1}`} className="h-[38px] px-3 rounded-lg text-red-600 border border-red-200">âœ•</button>
                </div>
              ))}
              <button type="button" onClick={() => set('obat', [...f.obat, { nama: '', jumlah: '' }])} className="text-sm font-medium text-blue-700">+ Tambah obat</button>
              <Field label="Aturan pakai (signa)"><AutoTextarea rows={2} className={inputCls} value={f.signa} placeholder="mis. S 3 dd tab 1 p.c." onChange={(e) => set('signa', e.target.value)} /></Field>
              <Field label="Tanda di akhir copy resep">
                <select className={inputCls} value={f.tanda} onChange={(e) => set('tanda', e.target.value)}>
                  {TANDA.map((t) => <option key={t.label} value={t.v}>{t.label}</option>)}
                </select>
              </Field>
            </FormSection>

            <FormSection title="Apoteker &amp; Tanda Tangan">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal copy resep"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                <Field label="Label apoteker (APA / Apoteker)"><AutoTextarea className={inputCls} value={f.apotekerLabel} onChange={(e) => set('apotekerLabel', e.target.value)} /></Field>
                <Field label="Nama apoteker"><AutoTextarea className={inputCls} value={f.apoteker} onChange={(e) => set('apoteker', e.target.value)} /></Field>
                <Field label="SIPA"><AutoTextarea className={inputCls} value={f.sipa} onChange={(e) => set('sipa', e.target.value)} /></Field>
                <Field label="Keterangan di atas tanda tangan"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Logo kop (opsional, kiri atas)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} shown={logo.src} bgBusy={logo.busy} {...bgFor('logo')} />
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} shown={ttd.src} bgBusy={ttd.busy} {...bgFor('ttd')} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} shown={stempel.src} bgBusy={stempel.busy} {...bgFor('stempel')} />
              <p className="text-xs text-gray-500">Logo, tanda tangan &amp; stempel hanya disimpan di perangkat ini, tidak diunggah ke server.</p>
            </FormSection>

            <details className="space-y-3">
              <summary className="font-bold cursor-pointer">Kop &amp; Teks Dokumen</summary>
              <div className="space-y-3 pt-3">
                <Field label="Kop baris 1 (nama apotek / instalasi farmasi)"><AutoTextarea rows={2} className={inputCls} value={f.instansi} onChange={(e) => set('instansi', e.target.value)} /></Field>
                <Field label="Kop baris 2 (nomor izin / SIA)"><AutoTextarea className={inputCls} value={f.izin} onChange={(e) => set('izin', e.target.value)} /></Field>
                <Field label="Kop alamat"><AutoTextarea className={inputCls} value={f.alamatKop} onChange={(e) => set('alamatKop', e.target.value)} /></Field>
                <Field label="Judul"><AutoTextarea className={inputCls} value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
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

export default function CopyResep() {
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
