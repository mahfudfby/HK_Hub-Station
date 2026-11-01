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
import FormSection from '../../shared/components/FormSection';

// Surat Izin Cuti / Formulir Cuti Karyawan: permohonan cuti dari karyawan, disetujui atasan langsung
// dan diketahui HRD. Jumlah hari & sisa cuti dihitung otomatis; status persetujuan berupa kotak centang.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
const STATUS = ['Disetujui', 'Ditolak', 'Ditangguhkan'] as const;
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  pembuka: string;
  nama: string; nik: string; jabatan: string; divisi: string;
  jenis: string; mulai: string; selesai: string; hariKerja: boolean;
  sisaSebelum: string; sisaSesudah: string; // sesudah kosong = otomatis (sebelum − jumlah hari)
  alasan: string; alamatCuti: string; telepon: string;
  penggantiNama: string; penggantiJabatan: string; lampiran: string;
  persetujuan: '' | (typeof STATUS)[number]; catatan: string; penutup: string;
  pakaiPemohon: boolean; pakaiAtasan: boolean; pakaiHrd: boolean;
  ttdPemohon: string;
  atasanJabatan: string; atasanNama: string; ttdAtasan: string;
  ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
};

const STORAGE_KEY = 'surat-izin-cuti:v1';
const POLA = '{n3}/CUTI/HRD/{rom}/{yyyy}';
const JENIS = ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Cuti Menikah', 'Cuti Alasan Penting', 'Cuti Besar', 'Cuti di Luar Tanggungan'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'FORMULIR PERMOHONAN CUTI', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  pembuka: 'Yang bertanda tangan di bawah ini mengajukan permohonan cuti dengan keterangan sebagai berikut:',
  nama: 'Siti Nurhaliza', nik: 'KRY-2021-0418', jabatan: 'Staf Pemasaran Digital', divisi: 'Pemasaran',
  jenis: JENIS[0], mulai: plusDays(7), selesai: plusDays(11), hariKerja: true,
  sisaSebelum: '12', sisaSesudah: '',
  alasan: 'Menghadiri acara pernikahan keluarga di luar kota', alamatCuti: 'Jl. Merdeka No. 21, Kel. Sukajadi, Kota Bandung, Jawa Barat',
  telepon: '0812-3456-7890',
  penggantiNama: 'Rina Wulandari', penggantiJabatan: 'Staf Pemasaran Digital', lampiran: '',
  persetujuan: '', catatan: '',
  penutup: 'Demikian permohonan ini saya ajukan. Selama menjalani cuti, pekerjaan saya telah diserahkan kepada pengganti tugas di atas. Atas perhatian dan persetujuannya, saya ucapkan terima kasih.',
  pakaiPemohon: true, pakaiAtasan: true, pakaiHrd: true,
  ttdPemohon: '',
  atasanJabatan: 'Manajer Pemasaran', atasanNama: 'Dimas Saputra', ttdAtasan: '',
  ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'atasanJabatan', 'atasanNama', 'ttdAtasan', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// Jumlah hari cuti (inklusif); kerja = hanya Senin–Jumat. 0 bila tanggal tidak valid / terbalik.
function hitungHari(mulai: string, selesai: string, kerja: boolean) {
  const a = new Date(`${mulai}T00:00`), b = new Date(`${selesai}T00:00`);
  if (isNaN(+a) || isNaN(+b) || b < a) return 0;
  let n = 0;
  for (const d = new Date(a); d <= b && n < 400; d.setDate(d.getDate() + 1)) if (!kerja || (d.getDay() % 6 !== 0)) n++;
  return n;
}
console.assert(hitungHari('2026-11-02', '2026-11-08', true) === 5 && hitungHari('2026-11-02', '2026-11-08', false) === 7 && hitungHari('2026-11-05', '2026-11-01', true) === 0, 'hitungHari');

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Kotak centang status persetujuan (kosong semua = diisi tangan)
function Checks({ value, k }: { value: string; k: number }) {
  const box = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12 * k, height: 12 * k, border: '1px solid #000', fontSize: 10 * k, lineHeight: 1, fontWeight: 700 } as const;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${4 * k}px ${22 * k}px`, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {STATUS.map((s) => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 * k }}><span style={box}>{value === s ? '✓' : ''}</span>{s}</span>)}
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratIzinCuti() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdPemohon: true, ttdAtasan: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdPemohon = useBgRemoved(f.ttdPemohon, bg.ttdPemohon, bgError);
  const ttdAtasan = useBgRemoved(f.ttdAtasan, bg.ttdAtasan, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdPemohon.busy || ttdAtasan.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdPemohon.src, ttdAtasan.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-izin-cuti-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const hari = hitungHari(f.mulai, f.selesai, f.hariKerja);
  const sisaAuto = f.sisaSebelum.trim() ? String(Math.max(0, Number(f.sisaSebelum) - hari)) : '';
  const sisaSesudah = f.sisaSesudah.trim() || sisaAuto;

  // Template kosongan: data karyawan, tanggal & angka → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const hariLabel = f.hariKerja ? 'hari kerja' : 'hari';
  const signers = ([
    f.pakaiPemohon && { heading: 'Pemohon,', role: v(f.jabatan) || ' ', name: ks ? '' : f.nama, ttd: img(ttdPemohon.src), ttdOffset: getOffset(f.posisi, 'ttdPemohon') },
    f.pakaiAtasan && { heading: 'Menyetujui,', role: f.atasanJabatan, name: f.atasanNama, ttd: img(ttdAtasan.src), ttdOffset: getOffset(f.posisi, 'ttdAtasan') },
    f.pakaiHrd && { heading: 'Mengetahui,', role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[
          { label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) },
          { label: 'Jabatan', value: v(f.jabatan) }, { label: 'Divisi', value: v(f.divisi) },
          { label: 'Jenis cuti', value: v(f.jenis) },
          { label: 'Tanggal cuti', value: ks ? '' : `${fmtTanggal(f.mulai)} s.d. ${fmtTanggal(f.selesai)}` },
          { label: 'Jumlah', value: ks ? '' : `${hari} ${hariLabel}` },
          ...(f.sisaSebelum.trim() || ks ? [{ label: 'Sisa cuti sebelum / sesudah', value: ks ? '' : `${f.sisaSebelum} hari / ${sisaSesudah} hari` }] : []),
          { label: 'Alasan cuti', value: v(f.alasan) },
          { label: 'Alamat selama cuti', value: v(f.alamatCuti) }, { label: 'No. telepon', value: v(f.telepon) },
          { label: 'Pengganti tugas', value: ks ? '' : [f.penggantiNama, f.penggantiJabatan].filter((s) => s.trim()).join(' – ') },
          ...(f.lampiran.trim() ? [{ label: 'Lampiran', value: v(f.lampiran) }] : []),
        ]} />
        <P>{f.penutup}</P>
        <P style={{ marginBottom: 4 * kk }}><b>Status persetujuan:</b></P>
        <Checks value={ks ? '' : f.persetujuan} k={kk} />
        {(f.catatan.trim() || ks || !f.persetujuan) && <P>Catatan: {ks || !f.catatan.trim() ? TITIK + TITIK + TITIK : f.catatan}</P>}
      </>
    ),
    signers,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiPemohon ? [{ id: 'ttdPemohon', label: `TTD ${f.nama || 'Pemohon'}` }] : []),
        ...(f.pakaiAtasan ? [{ id: 'ttdAtasan', label: `TTD ${f.atasanNama || 'Atasan'}` }] : []),
        ...(f.pakaiHrd ? [{ id: 'ttd', label: `TTD ${f.ttdNama || 'HRD'}` }, { id: 'stempel', label: 'Stempel' }] : []),
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
  const date = (key: keyof Form, label: string) => (
    <Field label={label}><input type="date" className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Izin Cuti Karyawan</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-izin-cuti" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul formulir')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/CUTI/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                {date('tanggal', 'Tanggal pengajuan')}
              </div>
              {text('pembuka', 'Kalimat pembuka', 2)}
            </FormSection>

            <FormSection title="Data Karyawan">
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi')}
              </div>
            </FormSection>

            <FormSection title="Rincian Cuti">
              <Field label="Jenis cuti (pilih atau ketik sendiri)">
                <input list="jenis-cuti" className={`${inputCls} min-h-[40px]`} value={f.jenis} onChange={(e) => set('jenis', e.target.value)} />
                <datalist id="jenis-cuti">{JENIS.map((s) => <option key={s} value={s} />)}</datalist>
              </Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {date('mulai', 'Tanggal mulai')}
                {date('selesai', 'Tanggal selesai')}
              </div>
              <Switch checked={f.hariKerja} onChange={(x) => set('hariKerja', x)} label="Hitung hari kerja saja (Senin–Jumat)" hint="Matikan untuk menghitung semua hari kalender." />
              <p className="text-sm text-gray-700">Jumlah (otomatis): <b>{hari} {hariLabel}</b></p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Sisa cuti sebelum (hari)"><input type="number" min="0" inputMode="numeric" className={`${inputCls} min-h-[40px]`} value={f.sisaSebelum} onChange={(e) => set('sisaSebelum', e.target.value)} /></Field>
                <Field label="Sisa cuti sesudah (hari)"><input type="number" min="0" inputMode="numeric" placeholder={sisaAuto ? `${sisaAuto} (otomatis)` : 'otomatis'} className={`${inputCls} min-h-[40px]`} value={f.sisaSesudah} onChange={(e) => set('sisaSesudah', e.target.value)} /></Field>
              </div>
              {text('alasan', 'Alasan cuti', 2)}
              {text('alamatCuti', 'Alamat selama cuti', 2)}
              {text('telepon', 'No. telepon selama cuti')}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('penggantiNama', 'Pengganti tugas (nama)')}
                {text('penggantiJabatan', 'Jabatan pengganti')}
              </div>
              {text('lampiran', 'Lampiran (opsional, mis. surat keterangan dokter)')}
              {text('penutup', 'Kalimat penutup', 3)}
            </FormSection>

            <FormSection title="Status Persetujuan">
              <Field label="Kotak yang dicentang">
                <select className={`${inputCls} min-h-[40px]`} value={f.persetujuan} onChange={(e) => set('persetujuan', e.target.value as Form['persetujuan'])}>
                  <option value="">Kosong (diisi tangan)</option>
                  {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              {text('catatan', 'Catatan atasan/HRD (opsional; kosong = garis titik-titik)', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh ketiganya, dua, atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiPemohon', 'Pemohon'], ['pakaiAtasan', 'Atasan langsung'], ['pakaiHrd', 'HRD']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiPemohon && <ImageUpload label={`Tanda tangan — ${f.nama || 'Pemohon'} (nama mengikuti data karyawan)`} value={f.ttdPemohon} onChange={(x) => set('ttdPemohon', x)} notify={notify} {...bgFor('ttdPemohon', ttdPemohon)} />}
              {f.pakaiAtasan && <>
                <p className="text-sm font-bold text-gray-700">Atasan langsung (Menyetujui)</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('atasanJabatan', 'Jabatan')}{text('atasanNama', 'Nama')}</div>
                <ImageUpload label={`Tanda tangan — ${f.atasanNama || 'Atasan'}`} value={f.ttdAtasan} onChange={(x) => set('ttdAtasan', x)} notify={notify} {...bgFor('ttdAtasan', ttdAtasan)} />
              </>}
              {f.pakaiHrd && <>
                <p className="text-sm font-bold text-gray-700">HRD (Mengetahui)</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdJabatan', 'Jabatan')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label={`Tanda tangan — ${f.ttdNama || 'HRD'}`} value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
                <ImageUpload label="Stempel" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
              </>}
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
