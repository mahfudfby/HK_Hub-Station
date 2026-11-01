import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { terbilangRupiah } from '../../shared/lib/money';
import { useBgRemoved } from '../../shared/lib/removeBg';

// Surat Izin Tidak Masuk Sekolah: dari orang tua/wali ke wali kelas, diketahui Ketua RT & Ketua RW (kop RT/RW).
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Alasan = 'Sakit' | 'Keperluan keluarga' | 'Lainnya';
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; rt: string; rw: string; kelurahan: string; kecamatan: string; kabKota: string; alamatKop: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  waliKelas: string; kelas: string; sekolah: string;
  salam: string;
  siswaNama: string; siswaNis: string;
  ortuNama: string; ortuHubungan: string; ortuPekerjaan: string; ortuAlamat: string; ortuHp: string;
  alasan: Alasan; keterangan: string; mulai: string; selesai: string;
  penutup: string;
  ttdHeading: string; ttd: string;
  rtNama: string; ttdRt: string; stempelRt: string;
  rwNama: string; ttdRw: string; stempelRw: string;
  pakaiRt: boolean; pakaiRw: boolean; pakaiOrtu: boolean; // tanda tangan yang ditampilkan (bebas: 1, 2 atau 3)
};

const STORAGE_KEY = 'surat-izin-sekolah:v1';
const today = () => new Date().toISOString().slice(0, 10);
// Nomor register RT: urut/RT.xxx/RW.yyy/bulan romawi/tahun (ikut isian RT/RW)
const pola = (rt: string, rw: string) => `{n3}/RT.${rt || '000'}/RW.${rw || '000'}/{rom}/{yyyy}`;

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', rt: '003', rw: '005', kelurahan: 'Sukamaju', kecamatan: 'Cibeunying Kidul', kabKota: 'Kota Bandung',
  alamatKop: 'Sekretariat: Jl. Melati Raya No. 21, Kelurahan Sukamaju, Kecamatan Cibeunying Kidul, Kota Bandung 40121',
  kontak: 'Telp./WA 0812-3456-7890 • Email: rt003rw005.sukamaju@gmail.com',
  judul: 'SURAT IZIN TIDAK MASUK SEKOLAH', nomor: randomDocNo(pola('003', '005')), kota: 'Bandung', tanggal: today(),
  waliKelas: 'Wali Kelas', kelas: 'VIII-B', sekolah: 'SMP Negeri 1 Bandung',
  salam: 'Dengan hormat,',
  siswaNama: 'Ahmad Fauzan Pratama', siswaNis: '2324.08.112 / 0098765432',
  ortuNama: 'Budi Santoso', ortuHubungan: 'Ayah kandung', ortuPekerjaan: 'Karyawan swasta',
  ortuAlamat: 'Jl. Melati Raya No. 15, RT 003/RW 005, Kel. Sukamaju, Kec. Cibeunying Kidul, Kota Bandung', ortuHp: '0812-1111-2222',
  alasan: 'Sakit', keterangan: 'demam dan perlu beristirahat di rumah sesuai anjuran dokter', mulai: today(), selesai: today(),
  penutup: 'Demikian surat izin ini kami sampaikan. Atas perhatian dan kebijaksanaan Bapak/Ibu, kami ucapkan terima kasih.',
  ttdHeading: 'Hormat kami,', ttd: '',
  rtNama: 'H. Asep Suryana', ttdRt: '', stempelRt: '',
  rwNama: 'Drs. Dedi Kurniawan', ttdRw: '', stempelRw: '',
  pakaiRt: true, pakaiRw: false, pakaiOrtu: false, // bawaan: satu tanda tangan, Ketua RT
});

// Data User: identitas kop RT/RW, orang tua & pengurus RT/RW beserta gambar (bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'rt', 'rw', 'kelurahan', 'kecamatan', 'kabKota', 'alamatKop', 'kontak', 'kota',
  'ortuNama', 'ortuHubungan', 'ortuPekerjaan', 'ortuAlamat', 'ortuHp', 'ttdHeading', 'ttd',
  'rtNama', 'ttdRt', 'stempelRt', 'rwNama', 'ttdRw', 'stempelRw'] as const;

const ALASAN: Alasan[] = ['Sakit', 'Keperluan keluarga', 'Lainnya'];

// Jumlah hari inklusif (tanggal mulai s.d. selesai), minimal 1
const jumlahHari = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1 || 1);
const angkaKata = (n: number) => terbilangRupiah(n).replace(/ rupiah$/, '').toLowerCase();
const rentang = (a: string, b: string) => (!b || a === b ? fmtTanggal(a) : `${fmtTanggal(a)} s.d. ${fmtTanggal(b)}`);
const alasanText = (f: Form) =>
  f.alasan === 'Sakit' ? `sakit${f.keterangan ? ` (${f.keterangan})` : ''}`
    : f.alasan === 'Keperluan keluarga' ? `ada keperluan keluarga${f.keterangan ? `, yaitu ${f.keterangan}` : ''}`
      : f.keterangan || '...';

console.assert(jumlahHari('2026-11-02', '2026-11-04') === 3 && jumlahHari('2026-11-02', '') === 1 && angkaKata(3) === 'tiga', 'jumlahHari');

// ============================================================
// SECTION: Isi surat -> LayoutDoc
// ============================================================
function buildDoc(f: Form): LayoutDoc {
  const n = jumlahHari(f.mulai, f.selesai || f.mulai);
  return {
    logo: f.logo, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: `RUKUN TETANGGA ${f.rt} / RUKUN WARGA ${f.rw}`,
    kopLines: [[f.kelurahan && `Kelurahan ${f.kelurahan}`, f.kecamatan && `Kecamatan ${f.kecamatan}`, f.kabKota].filter(Boolean).join(' • '), f.alamatKop, f.kontak],
    title: f.judul, nomor: f.nomor,
    placeDate: [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: ['Kepada Yth.', `Bapak/Ibu ${f.waliKelas} ${f.kelas}`.trim(), f.sekolah, 'di Tempat'].filter(Boolean),
    body: (
      <>
        <P>{f.salam}</P>
        <P>Yang bertanda tangan di bawah ini, orang tua/wali siswa:</P>
        <InfoRows rows={[
          { label: 'Nama', value: f.ortuNama }, { label: 'Hubungan dengan siswa', value: f.ortuHubungan },
          { label: 'Pekerjaan', value: f.ortuPekerjaan }, { label: 'Alamat', value: f.ortuAlamat }, { label: 'No. telepon/HP', value: f.ortuHp },
        ]} />
        <P>dengan ini memberitahukan bahwa anak kami:</P>
        <InfoRows rows={[{ label: 'Nama', value: f.siswaNama }, { label: 'Kelas', value: f.kelas }, { label: 'NIS / NISN', value: f.siswaNis }]} />
        <P>tidak dapat mengikuti kegiatan belajar mengajar selama {n} ({angkaKata(n)}) hari, pada {rentang(f.mulai, f.selesai)}, dikarenakan {alasanText(f)}. Oleh karena itu, kami mohon Bapak/Ibu berkenan memberikan izin.</P>
        <P>{f.penutup}</P>
      </>
    ),
    // "Mengetahui," ditulis di heading agar tampil di semua tata letak
    signers: [
      f.pakaiRt && { heading: `Mengetahui,\nKetua RT ${f.rt}`, name: f.rtNama, ttd: f.ttdRt, stempel: f.stempelRt, ttdOffset: getOffset(f.posisi, 'ttdRt'), stempelOffset: getOffset(f.posisi, 'stempelRt') },
      f.pakaiRw && { heading: `Mengetahui,\nKetua RW ${f.rw}`, name: f.rwNama, ttd: f.ttdRw, stempel: f.stempelRw, ttdOffset: getOffset(f.posisi, 'ttdRw'), stempelOffset: getOffset(f.posisi, 'stempelRw') },
      f.pakaiOrtu && { heading: f.ttdHeading, role: 'Orang Tua/Wali Siswa', name: f.ortuNama, ttd: f.ttd, ttdOffset: getOffset(f.posisi, 'ttd'), main: true },
    ].filter((x): x is Exclude<typeof x, false> => !!x),
  };
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratIzinSekolah() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    const def = makeDefault();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return def;
      const m = { ...def, ...saved };
      return { ...m, nomor: orRandomNo(saved.nomor, pola(m.rt, m.rw)) };
    } catch {
      return def;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, ttdRt: true, stempelRt: true, ttdRw: true, stempelRw: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const ttdRt = useBgRemoved(f.ttdRt, bg.ttdRt, bgError);
  const stempelRt = useBgRemoved(f.stempelRt, bg.stempelRt, bgError);
  const ttdRw = useBgRemoved(f.ttdRw, bg.ttdRw, bgError);
  const stempelRw = useBgRemoved(f.stempelRw, bg.stempelRw, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || ttdRt.busy || stempelRt.busy || ttdRw.busy || stempelRw.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const shownImgs = [logo.src, ttd.src, ttdRt.src, stempelRt.src, ttdRw.src, stempelRw.src];
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, ...shownImgs]);
  const fileName = `surat-izin-sekolah-${(f.siswaNama || 'siswa').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'TTD orang tua' },
        { id: 'ttdRt', label: 'TTD Ketua RT' }, { id: 'stempelRt', label: 'Stempel RT' },
        { id: 'ttdRw', label: 'TTD Ketua RW' }, { id: 'stempelRw', label: 'Stempel RW' },
      ]} active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <LayoutPicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );
  const text = (key: keyof Form, label: string, rows?: number) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={f[key] as string} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Izin Tidak Masuk Sekolah</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-izin-sekolah" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop RT/RW</h2>
              <ImageUpload label="Logo (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <div className="grid grid-cols-2 gap-2">
                {text('rt', 'Nomor RT')}
                {text('rw', 'Nomor RW')}
                {text('kelurahan', 'Kelurahan / desa')}
                {text('kecamatan', 'Kecamatan')}
              </div>
              {text('kabKota', 'Kota / kabupaten')}
              {text('alamatKop', 'Alamat sekretariat')}
              {text('kontak', 'Telepon / email')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Urut', 'RT', 'RW', 'Bulan', 'Tahun']} example={`${randomDocNo(pola(f.rt, f.rw).replace('{n3}', '001'))} (bulan angka romawi)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Tujuan</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('waliKelas', 'Kepada Yth. Bapak/Ibu')}
                {text('kelas', 'Kelas')}
              </div>
              {text('sekolah', 'Nama sekolah')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Siswa</h2>
              {text('siswaNama', 'Nama siswa')}
              {text('siswaNis', 'NIS / NISN')}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Orang Tua / Wali</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('ortuNama', 'Nama')}
                {text('ortuHubungan', 'Hubungan dengan siswa')}
                {text('ortuPekerjaan', 'Pekerjaan')}
                {text('ortuHp', 'No. telepon/HP')}
              </div>
              {text('ortuAlamat', 'Alamat', 2)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Alasan & Lama Izin</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Alasan tidak masuk">
                {ALASAN.map((a) => (
                  <button key={a} type="button" aria-pressed={f.alasan === a} onClick={() => set('alasan', a)}
                    className={`px-4 min-h-[44px] rounded-lg border font-semibold ${f.alasan === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>{a}</button>
                ))}
              </div>
              {text('keterangan', f.alasan === 'Lainnya' ? 'Alasan' : 'Keterangan (opsional)', 2)}
              <div className="grid grid-cols-2 gap-2">
                <Field label="Mulai tanggal"><input type="date" className={inputCls} value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
                <Field label="Sampai tanggal"><input type="date" className={inputCls} value={f.selesai} min={f.mulai} onChange={(e) => set('selesai', e.target.value)} /></Field>
              </div>
              <p className="text-sm text-gray-600">Lama izin: {jumlahHari(f.mulai, f.selesai || f.mulai)} hari</p>
              {text('salam', 'Salam pembuka')}
              {text('penutup', 'Kalimat penutup', 2)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh ketiganya, dua, atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiRt', `Ketua RT ${f.rt}`], ['pakaiRw', `Ketua RW ${f.rw}`], ['pakaiOrtu', 'Orang Tua/Wali']] as const).map(([key, label]) => (
                  <button key={key} type="button" role="switch" aria-checked={f[key]} onClick={() => set(key, !f[key])}
                    className="flex items-center gap-2 min-h-[44px] text-sm font-medium text-gray-700">
                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f[key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${f[key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              {f.pakaiOrtu && <>
                {text('ttdHeading', 'Salam penutup orang tua')}
                <ImageUpload label="Tanda tangan orang tua/wali" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              </>}
              {f.pakaiRt && <>
                {text('rtNama', `Nama Ketua RT ${f.rt}`)}
                <ImageUpload label="Tanda tangan Ketua RT" value={f.ttdRt} onChange={(v) => set('ttdRt', v)} notify={notify} {...bgFor('ttdRt', ttdRt)} />
                <ImageUpload label="Stempel RT" value={f.stempelRt} onChange={(v) => set('stempelRt', v)} notify={notify} {...bgFor('stempelRt', stempelRt)} />
              </>}
              {f.pakaiRw && <>
                {text('rwNama', `Nama Ketua RW ${f.rw}`)}
                <ImageUpload label="Tanda tangan Ketua RW" value={f.ttdRw} onChange={(v) => set('ttdRw', v)} notify={notify} {...bgFor('ttdRw', ttdRw)} />
                <ImageUpload label="Stempel RW" value={f.stempelRw} onChange={(v) => set('stempelRw', v)} notify={notify} {...bgFor('stempelRw', stempelRw)} />
              </>}
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f}
                doc={buildDoc({ ...f, logo: logo.src, ttd: ttd.src, ttdRt: ttdRt.src, stempelRt: stempelRt.src, ttdRw: ttdRw.src, stempelRw: stempelRw.src })} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
