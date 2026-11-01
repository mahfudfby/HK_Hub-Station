import { useCallback, useEffect, useRef, useState } from 'react';
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
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ROMAN, orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import FormSection from '../../shared/components/FormSection';

// Undangan Interview / Panggilan Kerja: surat HRD/Recruitment kepada kandidat pelamar berisi
// tahap seleksi, jadwal, lokasi (tatap muka) atau tautan (online), perlengkapan & konfirmasi kehadiran.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string; perihal: string;
  kandidat: string; kontakKandidat: string; posisiLamar: string;
  pembuka: string; tahap: string;
  jadwal: string; jam: string; mode: 'tatap' | 'online';
  lokasi: string; ruang: string; platform: string; link: string; meetingId: string;
  cp: string; dressCode: string; berkas: string;
  batasKonfirmasi: string; kontakKonfirmasi: string; penutup: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
};

const STORAGE_KEY = 'undangan-interview:v1';
const POLA = '{n3}/HRD/INT/{rom}/{yyyy}';
const TAHAP = ['Interview HRD', 'Interview User', 'Psikotes', 'Tes Tertulis', 'Medical Check Up'];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => iso(new Date(Date.now() + n * 864e5));
// "Senin, 9 November 2026"
const hariTanggal = (s: string) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • rekrutmen@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: '', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: iso(new Date()), perihal: 'Undangan Interview',
  kandidat: 'Sdri. Putri Ayu Lestari', kontakKandidat: 'putri.ayu@email.com • 0812-3456-7890', posisiLamar: 'Staf Administrasi Keuangan',
  pembuka: 'Terima kasih atas lamaran kerja yang telah Saudara/i kirimkan. Berdasarkan hasil seleksi berkas, dengan ini kami mengundang Saudara/i untuk mengikuti tahap seleksi berikutnya pada:',
  tahap: 'Interview HRD',
  jadwal: plusDays(7), jam: '09.00 – 11.00 WIB', mode: 'tatap',
  lokasi: 'Kantor Pusat PT Cahaya Nusantara Abadi, Jl. Jenderal Sudirman No. 88, Jakarta Pusat', ruang: 'Ruang Rapat HRD, Lantai 2',
  platform: 'Zoom Meeting', link: 'https://zoom.us/j/81234567890', meetingId: 'ID 812 3456 7890 • Kode sandi 2026',
  cp: 'Rina Marlina (Staf Rekrutmen) — 0813-9876-5432', dressCode: 'Kemeja berkerah, celana/rok bahan, sepatu tertutup',
  berkas: 'Surat lamaran dan daftar riwayat hidup (CV) terbaru\nFotokopi KTP dan ijazah terakhir\nPas foto berwarna ukuran 4×6 (2 lembar)\nAlat tulis (pulpen hitam)',
  batasKonfirmasi: plusDays(5), kontakKonfirmasi: 'WhatsApp 0813-9876-5432 atau email rekrutmen@cahayanusantara.co.id',
  penutup: 'Mohon hadir 15 (lima belas) menit sebelum jadwal dimulai. Demikian undangan ini kami sampaikan. Atas perhatian Saudara/i, kami ucapkan terima kasih.',
  ttdHeading: 'Hormat kami,', ttdJabatan: 'Manajer HRD & Rekrutmen', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>); kosong = baris titik-titik
function NumList({ text, k, blank }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill(TITIK + TITIK) : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function UndanganInterview() {
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
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `undangan-interview-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data kandidat, jadwal, tempat & berkas → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const online = f.mode === 'online';
  const tempat = online
    ? [{ label: 'Media', value: v(`Online — ${f.platform}`) }, { label: 'Tautan', value: v(f.link) }, ...(f.meetingId.trim() || ks ? [{ label: 'Meeting ID', value: v(f.meetingId) }] : [])]
    : [{ label: 'Tempat', value: v(f.lokasi) }, ...(f.ruang.trim() || ks ? [{ label: 'Ruang', value: v(f.ruang) }] : [])];
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul || undefined, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    meta: [{ label: 'Perihal', value: f.perihal || 'Undangan Interview' }],
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: ['Kepada Yth.', ks ? TITIK + TITIK : f.kandidat, ...(ks ? [TITIK] : f.kontakKandidat.trim() ? [f.kontakKandidat] : []), 'di Tempat'],
    body: (
      <>
        <P>Dengan hormat,</P>
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Posisi dilamar', value: v(f.posisiLamar) },
          { label: 'Tahap seleksi', value: v(f.tahap) },
          { label: 'Hari, tanggal', value: ks ? '' : hariTanggal(f.jadwal) },
          { label: 'Waktu', value: v(f.jam) },
          ...tempat,
          ...(f.cp.trim() || ks ? [{ label: 'Contact person', value: v(f.cp) }] : []),
          ...(f.dressCode.trim() || ks ? [{ label: 'Pakaian', value: v(f.dressCode) }] : []),
        ]} />
        {(f.berkas.trim() || ks) && <P>Berkas dan perlengkapan yang perlu {online ? 'disiapkan' : 'dibawa'}:</P>}
        <NumList text={f.berkas} k={kk} blank={ks ? 3 : undefined} />
        <P>Mohon konfirmasi kehadiran paling lambat <b>{ks ? TITIK : hariTanggal(f.batasKonfirmasi)}</b> melalui {v(f.kontakKonfirmasi) || TITIK}.</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers: [{ heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true }],
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(x) => set('posisi', x)} />
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
  const modeBtn = (m: Form['mode'], label: string) => (
    <button type="button" aria-pressed={f.mode === m} onClick={() => set('mode', m)}
      className={`flex-1 min-h-[44px] rounded-lg border text-sm font-semibold ${f.mode === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Undangan Interview / Panggilan Kerja</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:undangan-interview" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Unit', 'Kode', 'Bulan', 'Tahun']} example={`012/HRD/INT/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {text('perihal', 'Perihal')}
                {text('judul', 'Judul di tengah (opsional)')}
              </div>
            </FormSection>

            <FormSection title="Kandidat">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kandidat', 'Nama kandidat (Sdr./Sdri.)')}
                {text('kontakKandidat', 'Email / telepon kandidat')}
              </div>
              {text('posisiLamar', 'Posisi yang dilamar')}
              {text('pembuka', 'Kalimat pembuka', 3)}
            </FormSection>

            <FormSection title="Tahap & Jadwal">
              <Field label="Tahap seleksi (pilih atau ketik sendiri)">
                <input list="tahap-seleksi" className={inputCls} value={f.tahap} onChange={(e) => set('tahap', e.target.value)} />
                <datalist id="tahap-seleksi">{TAHAP.map((t) => <option key={t} value={t} />)}</datalist>
              </Field>
              <div className="flex flex-wrap gap-2">
                {TAHAP.map((t) => (
                  <button key={t} type="button" aria-pressed={f.tahap === t} onClick={() => set('tahap', t)}
                    className={`px-3 min-h-[40px] rounded-lg border text-sm ${f.tahap === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>{t}</button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label={`Hari/tanggal — ${hariTanggal(f.jadwal) || '-'}`}><input type="date" className={inputCls} value={f.jadwal} onChange={(e) => set('jadwal', e.target.value)} /></Field>
                {text('jam', 'Jam')}
              </div>
              <div className="flex gap-2" role="group" aria-label="Mode pelaksanaan">{modeBtn('tatap', 'Tatap muka')}{modeBtn('online', 'Online')}</div>
              {online ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('platform', 'Platform (Zoom, Google Meet, Teams)')}
                  {text('meetingId', 'Meeting ID / kode sandi (opsional)')}
                  <div className="sm:col-span-2">{text('link', 'Tautan meeting')}</div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('lokasi', 'Alamat tempat', 2)}
                  {text('ruang', 'Ruang (opsional)')}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('cp', 'Contact person (opsional)')}
                {text('dressCode', 'Dress code (opsional)')}
              </div>
            </FormSection>

            <FormSection title="Berkas & Konfirmasi">
              {text('berkas', 'Berkas/perlengkapan yang dibawa (satu per baris)', 4)}
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Batas konfirmasi kehadiran"><input type="date" className={inputCls} value={f.batasKonfirmasi} onChange={(e) => set('batasKonfirmasi', e.target.value)} /></Field>
                {text('kontakKonfirmasi', 'Konfirmasi melalui')}
              </div>
              {text('penutup', 'Kalimat penutup', 3)}
            </FormSection>

            <FormSection title="Penanda Tangan (HRD/Recruitment)">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ttdHeading', 'Salam penutup')}
                {text('ttdJabatan', 'Jabatan')}
                {text('ttdNama', 'Nama')}
                {text('ttdId', 'NIK karyawan (opsional)')}
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
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
