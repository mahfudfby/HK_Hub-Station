import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { Switch, TITIK } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, type Notify } from '../../shared/components/LetterKit';
import FormSection from '../../shared/components/FormSection';
import { usePagesExport } from '../surat-kontrak-kerja/exportPages';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { useGoogleFonts } from '../../shared/lib/fonts';
import { TEMPLATES, getTpl } from './templates';
import { BoxCtx, Hal1, Hal2, rootStyle, type Cert } from './Render';

// Surat Keterangan Keterampilan: sertifikat keterampilan kerja 2 halaman (landscape).
// Halaman 1 = sertifikat (kop, nama, kualifikasi, nomor registrasi, masa berlaku, QR, foto, penetapan);
// halaman 2 = daftar kompetensi yang dikuasai + pengesah. 20 template tata letak (lihat templates.ts).
// Data contoh fiktif. Gambar QR diunggah sendiri (aplikasi tidak membuat kode verifikasi).

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets; kosong: boolean; pakaiHal2: boolean;
  logo: string; lembaga: string; sub: string;
  judul: string; pembuka: string; nama: string; kompetensi: string;
  jenisLabel: string; jenis: string; regLabel: string; reg: string;
  tglTerbit: string; tglBerlaku: string; narMasa: string;
  pakaiFoto: boolean; foto: string; pakaiQr: boolean; qr: string;
  kota: string; tglTetap: string; penetap: string; jabatan: string; pejabat: string; ttd: string;
  keterangan: string;
  judul2: string; items: string; logo2: string; nama2: string; jabatan2: string; ttd2: string;
};

const STORAGE_KEY = 'surat-keterangan-keterampilan:v1';
const iso = (d: Date) => d.toISOString().slice(0, 10);

const makeDefault = (): Form => {
  const now = new Date();
  const akhir = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate() - 1);
  return {
    gaya: TEMPLATES[0].id, paper: 'A4', landscape: true, skala: 100, posisi: {}, kosong: false, pakaiHal2: true,
    logo: '', lembaga: 'Lembaga Pengembangan Keterampilan Konstruksi Nusantara', sub: 'Nusantara Construction Skills Development Board',
    judul: 'SERTIFIKAT KETERAMPILAN KERJA',
    pembuka: 'Berdasarkan Undang - Undang No. 2 Tahun 2017 tentang Jasa Konstruksi dengan ini Lembaga Pengembangan Keterampilan Konstruksi Nusantara menetapkan bahwa :',
    nama: 'Rina Kartika Dewi',
    kompetensi: 'Dinyatakan memiliki kompetensi dan kemampuan untuk melaksanakan pekerjaan konstruksi di seluruh wilayah Negara Kesatuan Republik Indonesia, sebagai :',
    jenisLabel: 'Jenis Keterampilan Kerja dan Kualifikasi', jenis: 'PELAKSANA BANGUNAN GEDUNG/PEKERJAAN GEDUNG - KELAS I',
    regLabel: 'Nomor Registrasi', reg: '2.1.022.1.102.26.00123',
    tglTerbit: iso(now), tglBerlaku: iso(akhir), narMasa: 'Sertifikat ini diterbitkan pada tanggal {terbit} dan berlaku sampai dengan tanggal {berlaku}.',
    pakaiFoto: true, foto: '', pakaiQr: true, qr: '',
    kota: 'Surabaya', tglTetap: iso(now),
    penetap: 'Lembaga Pengembangan Keterampilan Konstruksi\nProvinsi Jawa Timur\nBadan Pelaksana',
    jabatan: 'Manajer Eksekutif', pejabat: 'Hendra Wibisono, SE', ttd: '',
    keterangan: 'Keterangan:\n1. QR Code dan data yang tertera dalam sertifikat ini dapat diverifikasi melalui aplikasi pemeriksa milik lembaga penerbit\n2. Sertifikat ini tidak memerlukan tanda tangan basah karena telah ditandatangani secara elektronik (Digital Signature)',
    judul2: 'KOMPETENSI KERJA YANG DIKUASAI',
    items: [
      'Menerapkan keselamatan dan kesehatan kerja (K-3) dengan benar selama melakukan pekerjaan',
      'Mempelajari dan memahami menerjemahkan Gambar Kerja, dan Spesifikasi teknis',
      'Membuat kantor dan bedeng kerja proyek',
      'Menghitung kuantitas pekerjaan, kebutuhan/jenis peralatan, tenaga kerja dan jumlah material yang diperlukan untuk proyek',
      'Membuat Program Kerja harian dan mingguan',
      'Mengadakan bimbingan teknis pada mitra kerja',
      'Melaksanakan persiapan pekerjaan gedung',
      'Melaksanakan dan mengawasi pekerjaan gedung berdasarkan spesifikasi teknis, metode kerja instruksi kerja dan gambar kerja',
      'Membuat laporan harian dan mingguan pelaksanaan pekerjaan',
    ].join('\n'),
    logo2: '', nama2: 'Bambang Irawan, ST, M.Si', jabatan2: 'KETUA UMUM', ttd2: '',
  };
};

// Data User: identitas lembaga & pengesah (bukan isi sertifikat pemegang)
const USER_KEYS = ['logo', 'posisi', 'lembaga', 'sub', 'kota', 'penetap', 'jabatan', 'pejabat', 'keterangan', 'logo2', 'nama2', 'jabatan2'] as const;
const NO_ITALIC = ['Roboto Slab', 'Oswald', 'Cinzel'];

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratKeteranganKeterampilan() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const d = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...d, ...saved } : d;
    } catch {
      return d;
    }
  });
  const storeFull = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
      storeFull.current = false;
    } catch {
      if (!storeFull.current) notify('error', 'Penyimpanan perangkat penuh: gambar terlalu besar untuk disimpan otomatis. Dokumen tetap bisa diekspor; kurangi gambar agar tersimpan.');
      storeFull.current = true;
    }
  }, [f, notify]);

  // Hapus BG per gambar: logo/ttd/logo pengesah bawaan aktif; foto & QR bawaan mati
  const [bg, setBg] = useState({ logo: true, logo2: true, ttd: true, ttd2: true, foto: false, qr: false });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const logo2 = useBgRemoved(f.logo2, bg.logo2, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const ttd2 = useBgRemoved(f.ttd2, bg.ttd2, bgError);
  const foto = useBgRemoved(f.foto, bg.foto, bgError);
  const qr = useBgRemoved(f.qr, bg.qr, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || logo2.busy || ttd.busy || ttd2.busy || foto.busy || qr.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const t = getTpl(f.gaya);
  useGoogleFonts([...new Set([t.body, t.head])].filter((x) => x !== 'Arimo').map((family) => ({ family, weights: [400, 700], italic: NO_ITALIC.includes(family) ? [] : [400] })));

  const pagesRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  // Halaman mana pun yang meluap menentukan skala; keduanya diperiksa
  const k = useFitScale(f.skala / 100, () => {
    const els = [...(pagesRef.current?.querySelectorAll('[data-page]') ?? [])].map((p) => p.firstElementChild as HTMLElement);
    const over = (el: HTMLElement) => el.scrollHeight > el.offsetHeight + 1 || el.scrollWidth > el.offsetWidth + 1;
    // Isi yang menembus bingkai juga dihitung meluap (bingkai lebih kecil dari kertas)
    return els.find((el) => over(el) || [...el.querySelectorAll<HTMLElement>('[data-fit]')].some((c) => c.scrollHeight > c.clientHeight + 1)) ?? els[0];
  }, true, [f, logo.src, logo2.src, ttd.src, ttd2.src, foto.src, qr.src]);
  const fs = 12.5 * k * pg.f * 0.8; // ±14 px di A4 landscape
  const fileName = `sertifikat-keterampilan-${(f.nama || 'kosong').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = usePagesExport(() => [...pagesRef.current!.querySelectorAll<HTMLElement>('[data-page]')], fileName, notify, pg.paper);

  // ---- Data untuk penyaji (mode kosongan: data diganti titik-titik, gambar pribadi dikosongkan)
  const ks = f.kosong;
  const v = (s: string, dots = TITIK) => (ks || !s ? dots : s);
  const tgl = (s: string) => (ks ? TITIK : fmtTanggal(s));
  const d: Cert = {
    logo: logo.src, logoOff: getOffset(f.posisi, 'logo'), lembaga: f.lembaga, sub: f.sub,
    judul: f.judul, pembuka: f.pembuka, namaLabel: 'Nama', nama: v(f.nama), kompetensi: f.kompetensi,
    jenisLabel: f.jenisLabel, jenis: v(f.jenis), regLabel: f.regLabel, reg: v(f.reg),
    masa: f.narMasa.replace('{terbit}', tgl(f.tglTerbit)).replace('{berlaku}', tgl(f.tglBerlaku)),
    foto: ks ? '' : foto.src, qr: ks ? '' : qr.src, pakaiFoto: f.pakaiFoto, pakaiQr: f.pakaiQr,
    kota: f.kota, tgl: tgl(f.tglTetap), penetap: f.penetap, jabatan: f.jabatan, pejabat: f.pejabat, ttd: ks ? '' : ttd.src, ttdOff: getOffset(f.posisi, 'ttd'),
    keterangan: f.keterangan,
    judul2: f.judul2, items: f.items.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => (ks ? TITIK.repeat(4) : s)),
    logo2: logo2.src, nama2: f.nama2, jabatan2: f.jabatan2, ttd2: ks ? '' : ttd2.src,
  };

  const pageBox = { position: 'relative', width: pg.W, height: pg.H, overflow: 'hidden', background: '#fff' } as const;
  const [geser, setGeser] = useState('ttd');
  const [canvas, setCanvas] = useCanvasMode();

  const uploads = (
    <div className="space-y-5">
      <p className="text-sm font-bold text-gray-800">Gambar (Logo, Foto, QR, Tanda Tangan)</p>
      <ImageUpload label="Logo lembaga" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
      {f.pakaiFoto && <ImageUpload label="Foto pemegang sertifikat" value={f.foto} onChange={(x) => set('foto', x)} notify={notify} {...bgFor('foto', foto)} />}
      {f.pakaiQr && <ImageUpload label="Gambar QR Code" value={f.qr} onChange={(x) => set('qr', x)} notify={notify} {...bgFor('qr', qr)} />}
      <ImageUpload label="Tanda tangan penandatangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
      {f.pakaiHal2 && (<>
        <ImageUpload label="Logo pengesah (halaman 2)" value={f.logo2} onChange={(x) => set('logo2', x)} notify={notify} {...bgFor('logo2', logo2)} />
        <ImageUpload label="Tanda tangan pengesah (opsional)" value={f.ttd2} onChange={(x) => set('ttd2', x)} notify={notify} {...bgFor('ttd2', ttd2)} />
      </>)}
    </div>
  );

  const tampilan = (
    <>
      <DocOptions kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: `TTD ${f.pejabat || 'Pejabat'}` }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(x) => set('posisi', x)} />
      {uploads}
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
  const txt = (label: string, key: keyof Form, rows?: number) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={String(f[key])} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Keterangan Keterampilan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-keterangan-keterampilan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Lembaga">
              <p className="text-xs text-gray-600">Logo, foto, QR & tanda tangan diunggah di <b>Edit Canvas</b>, di dekat joystik.</p>
              {txt('Nama lembaga', 'lembaga')}
              {txt('Nama lembaga (baris kedua, mis. bahasa Inggris)', 'sub')}
            </FormSection>

            <FormSection title="Isi Sertifikat (Halaman 1)">
              {txt('Judul', 'judul')}
              {txt('Kalimat pembuka', 'pembuka', 2)}
              {txt('Nama pemegang sertifikat', 'nama')}
              {txt('Kalimat kompetensi', 'kompetensi', 2)}
              {txt('Label kualifikasi', 'jenisLabel')}
              {txt('Jenis keterampilan kerja & kualifikasi', 'jenis')}
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Label nomor', 'regLabel')}
                {txt('Nomor registrasi', 'reg')}
                <Field label="Tanggal terbit"><input type="date" className={inputCls} value={f.tglTerbit} onChange={(e) => set('tglTerbit', e.target.value)} /></Field>
                <Field label="Berlaku sampai"><input type="date" className={inputCls} value={f.tglBerlaku} onChange={(e) => set('tglBerlaku', e.target.value)} /></Field>
              </div>
              {txt('Kalimat masa berlaku', 'narMasa', 2)}
              <p className="text-xs text-gray-500">Kode di kalimat: {'{terbit} {berlaku}'} otomatis diganti tanggal di atas.</p>
              {txt('Keterangan kaki (satu baris = satu catatan)', 'keterangan', 3)}
            </FormSection>

            <FormSection title="Foto & QR Code">
              <Switch checked={f.pakaiFoto} onChange={(x) => set('pakaiFoto', x)} label="Tampilkan foto pemegang" hint="Unggah gambarnya di Edit Canvas (dekat joystik)." />
              <Switch checked={f.pakaiQr} onChange={(x) => set('pakaiQr', x)} label="Tampilkan kotak QR Code" hint="Unggah gambar QR dari sistem verifikasi lembaga Anda di Edit Canvas; aplikasi ini tidak membuat kode verifikasi." />
            </FormSection>

            <FormSection title="Penetapan & Penandatangan">
              <div className="grid sm:grid-cols-2 gap-2">
                {txt('Ditetapkan di (kota)', 'kota')}
                <Field label="Pada tanggal"><input type="date" className={inputCls} value={f.tglTetap} onChange={(e) => set('tglTetap', e.target.value)} /></Field>
              </div>
              {txt('Lembaga penetap (satu baris = satu baris cetak tebal)', 'penetap', 3)}
              {txt('Jabatan penandatangan', 'jabatan')}
              {txt('Nama penandatangan', 'pejabat')}
            </FormSection>

            <FormSection title="Halaman 2: Kompetensi yang Dikuasai">
              <Switch checked={f.pakaiHal2} onChange={(x) => set('pakaiHal2', x)} label="Pakai halaman 2" hint="Matikan bila sertifikat cukup 1 halaman." />
              {f.pakaiHal2 && (<>
                {txt('Judul halaman 2', 'judul2')}
                {txt('Daftar kompetensi (satu baris = satu butir, nomor otomatis)', 'items', 8)}
                {txt('Nama pengesah', 'nama2')}
                {txt('Jabatan pengesah', 'jabatan2')}
              </>)}
              <p className="text-xs text-gray-500">Teks & gambar disimpan otomatis di perangkat ini.</p>
            </FormSection>
            </>)}
          </div>

          <div className="min-w-0 space-y-3">
          <FitPreview>
            <BoxCtx.Provider value={{ W: pg.W, H: pg.H, fs }}>
            <div ref={pagesRef} className="w-max flex flex-col gap-6">
              <div data-page className="shadow-lg" style={pageBox}><div style={rootStyle(t, fs)}><Hal1 t={t} d={d} /></div></div>
              {f.pakaiHal2 && <div data-page className="shadow-lg" style={pageBox}><div style={rootStyle(t, fs)}><Hal2 t={t} d={d} /></div></div>}
            </div>
            </BoxCtx.Provider>
          </FitPreview>
          <div className="rounded-2xl bg-white p-4 shadow">
            <Field label="Template (tata letak)">
              <select className={inputCls} value={t.id} onChange={(e) => set('gaya', e.target.value)}>
                {TEMPLATES.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.desc}</option>)}
              </select>
            </Field>
          </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
