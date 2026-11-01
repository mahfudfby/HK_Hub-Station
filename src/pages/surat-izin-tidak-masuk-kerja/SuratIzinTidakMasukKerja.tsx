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
import { terbilangRupiah } from '../../shared/lib/money';
import FormSection from '../../shared/components/FormSection';

// Surat Izin Tidak Masuk Kerja: permohonan izin dari karyawan kepada atasan/HRD.
// Kop bisa kop perusahaan (formulir perusahaan) atau kop pribadi karyawan. Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean; kopPribadi: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  alamatK: string; kontakK: string; // kop pribadi
  judul: string; nomor: string; kota: string; tanggal: string;
  lampiran: string; perihal: string; kepada: string; pembuka: string;
  nama: string; nik: string; jabatan: string; divisi: string;
  alasan: string; keterangan: string; mulai: string; selesai: string; jumlahHari: string;
  pengganti: string; penutup: string;
  pakaiAtasan: boolean; pakaiHrd: boolean;
  atasanNama: string; atasanJabatan: string; ttdAtasan: string;
  hrdNama: string; hrdJabatan: string; ttdHrd: string; stempel: string;
  ttdHeading: string; ttd: string;
};

const STORAGE_KEY = 'surat-izin-tidak-masuk-kerja:v1';
const POLA = '{n3}/IZN/{rom}/{yyyy}';
const iso = (d: Date) => d.toISOString().slice(0, 10);
const besok = () => iso(new Date(Date.now() + 864e5));

// Pilihan cepat alasan: [label tombol, kalimat alasan, lampiran]
const ALASAN: [string, string, string][] = [
  ['Sakit', 'sakit dan memerlukan istirahat sesuai anjuran dokter', '1 (satu) lembar surat keterangan dokter'],
  ['Keperluan keluarga', 'adanya keperluan keluarga yang tidak dapat ditinggalkan', ''],
  ['Urusan pribadi mendesak', 'adanya urusan pribadi yang mendesak dan tidak dapat diwakilkan', ''],
  ['Lainnya', '', ''],
];

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: false, kosong: false, kopPribadi: false,
  logo: '', instansi: 'PT MITRA KARYA SENTOSA', subKop: 'Manufaktur Komponen & Suku Cadang Otomotif',
  alamat: 'Jl. Raya Industri No. 17, Kawasan Industri Jababeka, Cikarang Utara, Bekasi, Jawa Barat 17530',
  kontak: 'Telp. (021) 8983-4567 • hrd@mitrakarya.co.id • www.mitrakarya.co.id',
  alamatK: 'Perum Griya Asri Blok C2 No. 9, RT 003/RW 011, Kel. Wanasari, Cibitung, Bekasi 17520',
  kontakK: 'HP 0812-3456-7890 • rudi.hartono@email.com',
  judul: 'SURAT IZIN TIDAK MASUK KERJA', nomor: randomDocNo(POLA), kota: 'Bekasi', tanggal: iso(new Date()),
  lampiran: ALASAN[0][2], perihal: 'Permohonan Izin Tidak Masuk Kerja',
  kepada: 'Bapak Andi Pratama\nKepala Bagian Produksi\nPT Mitra Karya Sentosa\ndi Tempat',
  pembuka: 'Dengan hormat,\nYang bertanda tangan di bawah ini:',
  nama: 'Rudi Hartono', nik: 'MKS-2019-0275', jabatan: 'Operator Mesin', divisi: 'Produksi / Line 2',
  alasan: ALASAN[0][1], keterangan: 'Surat keterangan dokter dari Klinik Pratama Sehat Medika terlampir bersama surat ini.',
  mulai: iso(new Date()), selesai: besok(), jumlahHari: '',
  pengganti: 'Selama saya tidak masuk, tugas operasional di Line 2 sementara dapat dikoordinasikan dengan Saudara Fajar Nugroho (Operator Mesin).',
  penutup: 'Demikian surat izin ini saya sampaikan. Atas perhatian dan izin yang Bapak/Ibu berikan, saya ucapkan terima kasih.',
  pakaiAtasan: true, pakaiHrd: false,
  atasanNama: 'Andi Pratama', atasanJabatan: 'Kepala Bagian Produksi', ttdAtasan: '',
  hrdNama: 'Ratna Kusuma', hrdJabatan: 'Manajer HRD', ttdHrd: '', stempel: '',
  ttdHeading: 'Hormat saya,', ttd: '',
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'alamatK', 'kontakK', 'kota',
  'nama', 'nik', 'jabatan', 'divisi', 'ttd', 'atasanNama', 'atasanJabatan', 'ttdAtasan', 'hrdNama', 'hrdJabatan', 'ttdHrd', 'stempel'] as const;

// Jumlah hari kalender (tanggal mulai & selesai ikut dihitung); 0 = tanggal tidak valid
const hitungHari = (a: string, b: string) => {
  const n = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;
  return Number.isFinite(n) && n > 0 ? n : 0;
};
console.assert(hitungHari('2026-11-02', '2026-11-03') === 2 && hitungHari('2026-11-02', '2026-11-02') === 1 && hitungHari('2026-11-05', '2026-11-02') === 0, 'hitungHari');
const kataAngka = (n: number) => terbilangRupiah(n).replace(/ rupiah$/, '').toLowerCase();

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratIzinTidakMasukKerja() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, ttdAtasan: true, ttdHrd: true, stempel: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const ttdAtasan = useBgRemoved(f.ttdAtasan, bg.ttdAtasan, bgError);
  const ttdHrd = useBgRemoved(f.ttdHrd, bg.ttdHrd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || ttdAtasan.busy || ttdHrd.busy || stempel.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, ttdAtasan.src, ttdHrd.src, stempel.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-izin-tidak-masuk-kerja-${(f.nama || 'karyawan').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data karyawan, tanggal & alasan → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const n = f.jumlahHari.trim() ? Number(f.jumlahHari) || 0 : hitungHari(f.mulai, f.selesai);
  const lamaTeks = ks ? `${TITIK} hari` : n ? `${n} (${kataAngka(n)}) hari` : `${TITIK} hari`;
  const tglTeks = ks ? `${TITIK} s.d. ${TITIK}` : f.mulai === f.selesai ? fmtTanggal(f.mulai) : `${fmtTanggal(f.mulai)} s.d. ${fmtTanggal(f.selesai)}`;
  const meta = [{ label: 'Lampiran', value: f.lampiran }, { label: 'Perihal', value: f.perihal }].filter((r) => r.value.trim());
  // Mengetahui (atasan, HRD) di kiri/tengah, karyawan (utama) di kanan
  const signers = ([
    f.pakaiAtasan && { heading: 'Mengetahui,', role: f.atasanJabatan, name: f.atasanNama, ttd: img(ttdAtasan.src), ttdOffset: getOffset(f.posisi, 'ttdAtasan') },
    f.pakaiHrd && { heading: 'Menyetujui,', role: f.hrdJabatan, name: f.hrdNama, ttd: img(ttdHrd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttdHrd'), stempelOffset: getOffset(f.posisi, 'stempel') },
    { heading: f.ttdHeading, role: v(f.jabatan) || undefined, name: v(f.nama), ttd: img(ttd.src), ttdOffset: getOffset(f.posisi, 'ttd'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: f.kopPribadi ? undefined : logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.kopPribadi ? f.nama : f.instansi,
    kopLines: f.kopPribadi ? [f.alamatK, f.kontakK] : [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    meta: meta.length ? meta : undefined,
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...f.kepada.split('\n')] : undefined,
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) }, { label: 'Jabatan', value: v(f.jabatan) }, { label: 'Divisi/Bagian', value: v(f.divisi) }]} />
        <P>Dengan ini mengajukan permohonan izin tidak masuk kerja selama <b>{lamaTeks}</b>, yaitu pada tanggal <b>{tglTeks}</b>, dikarenakan {ks || !f.alasan.trim() ? TITIK : f.alasan.trim()}.{!ks && f.keterangan.trim() ? ` ${f.keterangan.trim()}` : ''}</P>
        {f.pengganti.trim() && <P>{ks ? `Selama saya tidak masuk, tugas saya sementara dikoordinasikan dengan ${TITIK}.` : f.pengganti}</P>}
        <P>{f.penutup}</P>
      </>
    ),
    signers,
  };

  const [geser, setGeser] = useState('ttd');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        ...(f.kopPribadi ? [] : [{ id: 'logo', label: 'Logo' }]),
        { id: 'ttd', label: 'TTD Karyawan' },
        ...(f.pakaiAtasan ? [{ id: 'ttdAtasan', label: 'TTD Atasan' }] : []),
        ...(f.pakaiHrd ? [{ id: 'ttdHrd', label: 'TTD HRD' }, { id: 'stempel', label: 'Stempel' }] : []),
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
  const btn = 'px-3 min-h-[40px] rounded-lg border text-sm font-medium';

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Izin Tidak Masuk Kerja</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-izin-tidak-masuk-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <Switch checked={f.kopPribadi} onChange={(x) => set('kopPribadi', x)} label="Pakai kop pribadi karyawan" hint="Mati = kop perusahaan (formulir perusahaan)." />
              {f.kopPribadi ? <>
                <p className="text-xs text-gray-500">Nama di kop memakai nama karyawan (bagian Data Karyawan).</p>
                {text('alamatK', 'Alamat karyawan')}
                {text('kontakK', 'Telepon & email karyawan')}
              </> : <>
                <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
                {text('instansi', 'Nama perusahaan')}
                {text('subKop', 'Bidang usaha (baris kedua kop)')}
                {text('alamat', 'Alamat lengkap')}
                {text('kontak', 'Telepon, email, website')}
              </>}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat (opsional, tampil bila Pakai nomor dokumen aktif)"><NumberFormatInput parts={['Nomor', 'Kode', 'Bulan', 'Tahun']} example={`014/IZN/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {text('lampiran', 'Lampiran (opsional)')}
                {text('perihal', 'Perihal (opsional)')}
              </div>
              {text('kepada', 'Kepada Yth. (atasan/HRD)', 3)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat pembuka', 2)}
              <div className="grid sm:grid-cols-2 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('jabatan', 'Jabatan')}
                {text('divisi', 'Divisi/Bagian')}
              </div>
            </FormSection>

            <FormSection title="Izin">
              <p className="text-xs text-gray-500">Pilihan cepat alasan (tetap bisa diedit):</p>
              <div className="flex flex-wrap gap-2">
                {ALASAN.map(([label, alasan, lampiran]) => (
                  <button key={label} type="button" className={btn} onClick={() => setF((p) => ({ ...p, alasan, lampiran, keterangan: label === 'Sakit' ? p.keterangan : '' }))}>{label}</button>
                ))}
              </div>
              {text('alasan', 'Alasan (lanjutan kalimat "dikarenakan …")', 2)}
              {text('keterangan', 'Keterangan tambahan (opsional)', 2)}
              <div className="grid sm:grid-cols-3 gap-2">
                <Field label="Mulai tanggal"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Sampai tanggal"><input type="date" className={inputCls} value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
                <Field label="Jumlah hari (kosong = otomatis)"><input inputMode="numeric" className={inputCls} placeholder={String(hitungHari(f.mulai, f.selesai) || '')} value={f.jumlahHari} onChange={(e) => set('jumlahHari', e.target.value.replace(/\D/g, ''))} /></Field>
              </div>
              {text('pengganti', 'Pengganti tugas selama izin (opsional)', 2)}
              {text('penutup', 'Kalimat penutup', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Karyawan selalu tampil. Tampilkan juga:</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiAtasan', 'Mengetahui, Atasan Langsung'], ['pakaiHrd', 'Menyetujui, HRD']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              <p className="text-sm font-bold text-gray-700">Karyawan (pemohon)</p>
              {text('ttdHeading', 'Salam penutup')}
              <ImageUpload label="Tanda tangan karyawan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
              {f.pakaiAtasan && <>
                <p className="text-sm font-bold text-gray-700">Atasan langsung</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('atasanJabatan', 'Jabatan')}{text('atasanNama', 'Nama')}</div>
                <ImageUpload label="Tanda tangan atasan" value={f.ttdAtasan} onChange={(x) => set('ttdAtasan', x)} notify={notify} {...bgFor('ttdAtasan', ttdAtasan)} />
              </>}
              {f.pakaiHrd && <>
                <p className="text-sm font-bold text-gray-700">HRD</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('hrdJabatan', 'Jabatan')}{text('hrdNama', 'Nama')}</div>
                <ImageUpload label="Tanda tangan HRD" value={f.ttdHrd} onChange={(x) => set('ttdHrd', x)} notify={notify} {...bgFor('ttdHrd', ttdHrd)} />
                <ImageUpload label="Stempel perusahaan" value={f.stempel} onChange={(x) => set('stempel', x)} notify={notify} {...bgFor('stempel', stempel)} />
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
