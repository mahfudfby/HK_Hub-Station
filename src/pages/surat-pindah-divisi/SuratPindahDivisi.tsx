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

// Surat Pemindahan Divisi: surat dinas dari manajer divisi lama kepada manajer divisi baru
// tentang perpindahan karyawan antar divisi, serah terima pekerjaan & aset, dan kewajiban melapor.
// Menu berdiri sendiri (file, form & penyimpanan terpisah). Tata letak dari LetterLayouts.

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  pakaiNomor: boolean; kosong: boolean;
  logo: string; instansi: string; subKop: string; alamat: string; kontak: string;
  judul: string; nomor: string; kota: string; tanggal: string;
  lampiran: string; perihal: string; kepada: string;
  pembuka: string;
  nama: string; nik: string; masaKerja: string;
  divisiLama: string; jabatanLama: string; atasanLama: string; lokasiLama: string;
  divisiBaru: string; jabatanBaru: string; atasanBaru: string; lokasiBaru: string;
  efektif: string; serahTerima: string; melapor: string; penutup: string;
  pakaiLama: boolean; pakaiBaru: boolean; pakaiUtama: boolean; // tanda tangan yang tampil (bebas 1, 2 atau 3)
  lamaNama: string; lamaJabatan: string; ttdLama: string;
  baruNama: string; baruJabatan: string; ttdBaru: string;
  ttdHeading: string; ttdJabatan: string; ttdNama: string; ttdId: string; ttd: string; stempel: string;
  tembusan: string;
};

const STORAGE_KEY = 'surat-pindah-divisi:v1';
const POLA = '{n3}/SPD/HRD/{rom}/{yyyy}';
const today = () => new Date().toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  pakaiNomor: true, kosong: false,
  logo: '', instansi: 'PT CAHAYA NUSANTARA ABADI', subKop: 'Distribusi Barang Konsumsi & Logistik',
  alamat: 'Jl. Jenderal Sudirman No. 88, Kel. Karet Tengsin, Kec. Tanah Abang, Jakarta Pusat, DKI Jakarta 10220',
  kontak: 'Telp. (021) 5790-1234 • hrd@cahayanusantara.co.id • www.cahayanusantara.co.id',
  judul: 'SURAT PEMINDAHAN DIVISI', nomor: randomDocNo(POLA), kota: 'Jakarta', tanggal: today(),
  lampiran: '1 (satu) berkas daftar serah terima', perihal: 'Pemindahan Karyawan Antar Divisi',
  kepada: 'Bapak Dimas Saputra\nManajer Divisi Pemasaran\ndi Tempat',
  pembuka: 'Dengan hormat,\nSehubungan dengan kebutuhan penguatan tim pemasaran dan atas persetujuan manajemen, bersama ini kami sampaikan pemindahan karyawan dari Divisi Penjualan ke Divisi Pemasaran dengan data sebagai berikut:',
  nama: 'Siti Nurhaliza', nik: 'KRY-2021-0418', masaKerja: '4 tahun 3 bulan',
  divisiLama: 'Penjualan', jabatanLama: 'Staf Penjualan Area', atasanLama: 'Budi Santoso (Manajer Penjualan)', lokasiLama: 'Kantor Pusat Jakarta, Lt. 3',
  divisiBaru: 'Pemasaran', jabatanBaru: 'Staf Pemasaran Digital', atasanBaru: 'Dimas Saputra (Manajer Pemasaran)', lokasiBaru: 'Kantor Pusat Jakarta, Lt. 5',
  efektif: today(),
  serahTerima: 'Data pelanggan dan riwayat penjualan Area Jakarta Selatan\nLaporan target dan realisasi penjualan bulan berjalan\nLaptop kantor (inventaris No. INV-IT-0233) beserta pengisi daya\nKartu nama dan katalog produk Divisi Penjualan',
  melapor: 'Karyawan yang bersangkutan wajib menyelesaikan serah terima di atas sebelum tanggal efektif dan melapor kepada atasan langsung di divisi baru pada hari pertama untuk menerima pengarahan tugas. Status kepegawaian, gaji pokok, dan masa kerja tetap berlanjut tanpa perubahan.',
  penutup: 'Demikian surat ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.',
  pakaiLama: true, pakaiBaru: true, pakaiUtama: true,
  lamaNama: 'Budi Santoso', lamaJabatan: 'Manajer Divisi Penjualan', ttdLama: '',
  baruNama: 'Dimas Saputra', baruJabatan: 'Manajer Divisi Pemasaran', ttdBaru: '',
  ttdHeading: 'Menyetujui,', ttdJabatan: 'Manajer HRD', ttdNama: 'Ratna Dewi Lestari', ttdId: '', ttd: '', stempel: '',
  tembusan: 'Manajer Divisi Penjualan\nKaryawan yang bersangkutan\nArsip HRD',
});

// Data User: identitas kop, penanda tangan & gambar (bukan template/kertas, bukan isi surat)
const USER_KEYS = ['logo', 'posisi', 'instansi', 'subKop', 'alamat', 'kontak', 'kota',
  'lamaNama', 'lamaJabatan', 'ttdLama', 'baruNama', 'baruJabatan', 'ttdBaru',
  'ttdHeading', 'ttdJabatan', 'ttdNama', 'ttdId', 'ttd', 'stempel'] as const;

// ============================================================
// SECTION: Potongan isi surat
// ============================================================
// Daftar bernomor manual (preflight Tailwind menghapus penanda <ol>); kosong = baris titik-titik untuk ditulis tangan
function NumList({ text, k, blank }: { text: string; k: number; blank?: number }) {
  const lines = blank ? Array<string>(blank).fill(TITIK + TITIK) : text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 6 * k, rowGap: 2 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {lines.map((l, i) => <div key={i} style={{ display: 'contents' }}><span>{i + 1}.</span><span style={{ textAlign: 'justify' }}>{l}</span></div>)}
    </div>
  );
}

// Uraian | Divisi Lama | Divisi Baru
function DivisiTable({ rows, k }: { rows: [string, string, string][]; k: number }) {
  const cell = { border: '1px solid #000', padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' as const, overflowWrap: 'anywhere' as const, height: 18 * k };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px`, fontSize: '0.95em' }}>
      <thead>
        <tr>{['Uraian', 'Divisi Lama', 'Divisi Baru'].map((h, i) => <th key={h} style={{ ...cell, width: i ? '38%' : '24%', textAlign: i ? 'center' : 'left' }}>{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} style={{ ...cell, fontWeight: i === 0 ? 700 : undefined }}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratPindahDivisi() {
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

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdLama: true, ttdBaru: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdLama = useBgRemoved(f.ttdLama, bg.ttdLama, bgError);
  const ttdBaru = useBgRemoved(f.ttdBaru, bg.ttdBaru, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdLama.busy || ttdBaru.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdLama.src, ttdBaru.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `surat-pindah-divisi-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  // Template kosongan: data karyawan, divisi, tanggal & daftar → titik-titik; gambar ttd/stempel disembunyikan
  const ks = f.kosong;
  const v = (s: string) => isian(s, ks);
  const img = (src: string) => (ks ? '' : src);
  const meta = [{ label: 'Lampiran', value: f.lampiran }, { label: 'Perihal', value: f.perihal }].filter((r) => r.value.trim());
  // "Yang menyerahkan/menerima/Menyetujui," di heading → tiga tanda tangan rata kiri–tengah–kanan
  const signers = ([
    f.pakaiLama && { heading: 'Yang menyerahkan,', role: f.lamaJabatan, name: f.lamaNama, ttd: img(ttdLama.src), ttdOffset: getOffset(f.posisi, 'ttdLama') },
    f.pakaiBaru && { heading: 'Yang menerima,', role: f.baruJabatan, name: f.baruNama, ttd: img(ttdBaru.src), ttdOffset: getOffset(f.posisi, 'ttdBaru') },
    f.pakaiUtama && { heading: f.ttdHeading, role: f.ttdJabatan, name: f.ttdNama, idLine: f.ttdId, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ] as (LayoutSigner | false)[]).filter((x): x is LayoutSigner => !!x);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.instansi, kopLines: [f.subKop, f.alamat, f.kontak],
    title: f.judul, nomor: nomorTampil(f.nomor, f.pakaiNomor, ks),
    meta: meta.length ? meta : undefined,
    placeDate: [f.kota, ks ? TITIK : fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: f.kepada.trim() ? ['Kepada Yth.', ...f.kepada.split('\n')] : undefined,
    body: (
      <>
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Nama', value: v(f.nama) }, { label: 'NIK karyawan', value: v(f.nik) }, ...(f.masaKerja.trim() ? [{ label: 'Masa kerja', value: v(f.masaKerja) }] : [])]} />
        <DivisiTable k={kk} rows={[
          ['Divisi', v(f.divisiLama), v(f.divisiBaru)], ['Jabatan', v(f.jabatanLama), v(f.jabatanBaru)],
          ['Atasan langsung', v(f.atasanLama), v(f.atasanBaru)], ['Lokasi kerja', v(f.lokasiLama), v(f.lokasiBaru)],
        ]} />
        <P>Pemindahan ini berlaku efektif mulai tanggal <b>{ks ? TITIK : fmtTanggal(f.efektif)}</b>.{f.serahTerima.trim() || ks ? ' Sebelum tanggal tersebut, karyawan menyerahkan pekerjaan dan aset Divisi Lama sebagai berikut:' : ''}</P>
        <NumList text={f.serahTerima} k={kk} blank={ks ? 4 : undefined} />
        <P>{f.melapor}</P>
        <P>{f.penutup}</P>
      </>
    ),
    signers,
    footer: f.tembusan ? <><div style={{ fontWeight: 700 }}>Tembusan:</div><div style={{ whiteSpace: 'pre-line' }}>{f.tembusan}</div></> : undefined,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (x) => set('pakaiNomor', x) }} kosong={{ value: f.kosong, onChange: (x) => set('kosong', x) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(x) => set('skala', x)} />
      <PositionPad targets={[
        { id: 'logo', label: 'Logo' },
        ...(f.pakaiLama ? [{ id: 'ttdLama', label: 'TTD Manajer lama' }] : []),
        ...(f.pakaiBaru ? [{ id: 'ttdBaru', label: 'TTD Manajer baru' }] : []),
        ...(f.pakaiUtama ? [{ id: 'ttd', label: 'TTD HRD/Direktur' }, { id: 'stempel', label: 'Stempel' }] : []),
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Pemindahan Divisi</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-pindah-divisi" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Surat">
              <ImageUpload label="Logo" value={f.logo} onChange={(x) => set('logo', x)} notify={notify} {...bgFor('logo', logo)} />
              {text('instansi', 'Nama perusahaan')}
              {text('subKop', 'Bidang usaha (baris kedua kop)')}
              {text('alamat', 'Alamat lengkap')}
              {text('kontak', 'Telepon, email, website')}
            </FormSection>

            <FormSection title="Data Surat">
              {text('judul', 'Judul surat')}
              <Field label="Nomor surat"><NumberFormatInput parts={['Nomor', 'Kode', 'Unit', 'Bulan', 'Tahun']} example={`021/SPD/HRD/${ROMAN[new Date().getMonth()]}/${new Date().getFullYear()} (bulan angka romawi)`} value={f.nomor} onChange={(x) => set('nomor', x)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                {text('kota', 'Kota')}
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
                {text('lampiran', 'Lampiran (opsional)')}
                {text('perihal', 'Perihal (opsional)')}
              </div>
              {text('kepada', 'Kepada Yth. (Manajer divisi baru)', 2)}
            </FormSection>

            <FormSection title="Data Karyawan">
              {text('pembuka', 'Kalimat pembuka', 3)}
              <div className="grid sm:grid-cols-3 gap-2">
                {text('nama', 'Nama karyawan')}
                {text('nik', 'NIK karyawan')}
                {text('masaKerja', 'Masa kerja (opsional)')}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <p className="text-sm font-bold text-gray-700">Divisi lama</p>
                <p className="hidden sm:block text-sm font-bold text-gray-700">Divisi baru</p>
                {text('divisiLama', 'Divisi lama')}
                {text('divisiBaru', 'Divisi baru')}
                {text('jabatanLama', 'Jabatan lama')}
                {text('jabatanBaru', 'Jabatan baru')}
                {text('atasanLama', 'Atasan langsung lama')}
                {text('atasanBaru', 'Atasan langsung baru')}
                {text('lokasiLama', 'Lokasi kerja lama')}
                {text('lokasiBaru', 'Lokasi kerja baru')}
              </div>
              <Field label="Tanggal efektif"><input type="date" className={inputCls} value={f.efektif} onChange={(e) => set('efektif', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Serah Terima & Penutup">
              {text('serahTerima', 'Pekerjaan & aset yang diserahkan (satu per baris)', 4)}
              {text('melapor', 'Kewajiban melapor ke atasan baru', 3)}
              {text('penutup', 'Kalimat penutup', 2)}
              {text('tembusan', 'Tembusan (opsional)', 2)}
            </FormSection>

            <FormSection title="Penanda Tangan">
              <p className="text-sm text-gray-700">Tampilkan tanda tangan (boleh ketiganya, dua, atau salah satu):</p>
              <div className="flex flex-wrap gap-x-4">
                {([['pakaiLama', 'Manajer divisi lama'], ['pakaiBaru', 'Manajer divisi baru'], ['pakaiUtama', 'HRD/Direktur']] as const).map(([key, label]) => (
                  <div key={key}><Switch checked={f[key]} onChange={(x) => set(key, x)} label={label} /></div>
                ))}
              </div>
              {f.pakaiLama && <>
                <p className="text-sm font-bold text-gray-700">Yang menyerahkan</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('lamaJabatan', 'Jabatan')}{text('lamaNama', 'Nama')}</div>
                <ImageUpload label="Tanda tangan manajer divisi lama" value={f.ttdLama} onChange={(x) => set('ttdLama', x)} notify={notify} {...bgFor('ttdLama', ttdLama)} />
              </>}
              {f.pakaiBaru && <>
                <p className="text-sm font-bold text-gray-700">Yang menerima</p>
                <div className="grid sm:grid-cols-2 gap-2">{text('baruJabatan', 'Jabatan')}{text('baruNama', 'Nama')}</div>
                <ImageUpload label="Tanda tangan manajer divisi baru" value={f.ttdBaru} onChange={(x) => set('ttdBaru', x)} notify={notify} {...bgFor('ttdBaru', ttdBaru)} />
              </>}
              {f.pakaiUtama && <>
                <p className="text-sm font-bold text-gray-700">Penanda tangan utama</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {text('ttdHeading', 'Salam penutup')}
                  {text('ttdJabatan', 'Jabatan (HRD/Direktur)')}
                  {text('ttdNama', 'Nama')}
                  {text('ttdId', 'NIK karyawan (opsional)')}
                </div>
                <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(x) => set('ttd', x)} notify={notify} {...bgFor('ttd', ttd)} />
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
