import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { Dots, ExportButton, Field, ImageUpload, PaperPicker, fmtTanggal, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import DocOptions, { TITIK } from '../../shared/components/DocOptions';
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc } from '../../shared/components/LetterLayouts';
import { useBgRemoved } from '../../shared/lib/removeBg';
import FormSection, { NarrativeField } from '../../shared/components/FormSection';

// Surat Lamaran Kerja: surat pribadi berkop pelamar (nama, profesi, alamat, kontak), tanpa nomor dokumen.
// Menu berdiri sendiri (form & penyimpanan terpisah). Bahan bersama: tata letak (LetterLayouts), kertas/ekspor (LetterKit).

// ============================================================
// SECTION: Data
// ============================================================
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; nama: string; profesi: string; alamat: string; telepon: string; email: string; web: string;
  kota: string; tanggal: string;
  kepada: string; perusahaan: string; alamatTujuan: string;
  jabatan: string; sumber: string;
  salam: string; pembuka: string; ttl: string; pendidikan: string;
  kualifikasi: string; lampiran: string[]; penutup: string;
  ttdHeading: string; ttd: string;
  kosong: boolean;
};

const STORAGE_KEY = 'surat-lamaran-kerja:v1';
const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT: Form = {
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', nama: 'Rizky Pratama, S.Kom.', profesi: 'Staf Administrasi & Pengolah Data',
  alamat: 'Jl. Melati No. 12, RT 004/RW 006, Kel. Sukamaju, Kec. Cibeunying, Kota Bandung 40121',
  telepon: '0812-3456-7890', email: 'rizky.pratama@email.com', web: 'linkedin.com/in/rizkypratama',
  kota: 'Bandung', tanggal: today(),
  kepada: 'Bapak/Ibu HRD / Manajer Personalia', perusahaan: 'PT Maju Bersama Sejahtera', alamatTujuan: 'Jl. Asia Afrika No. 88, Kota Bandung',
  jabatan: 'Staf Administrasi', sumber: 'situs lowongan kerja JobStreet pada 28 Oktober 2026',
  salam: 'Dengan hormat,',
  pembuka: 'Berdasarkan informasi lowongan pekerjaan yang saya peroleh dari {sumber}, {perusahaan} sedang membuka kesempatan untuk posisi {jabatan}. Dengan ini saya bermaksud mengajukan lamaran untuk mengisi posisi tersebut. Adapun data diri saya sebagai berikut:',
  ttl: 'Bandung, 14 Maret 1999', pendidikan: 'S1 Sistem Informasi, Universitas Pasundan (IPK 3,52)',
  kualifikasi: 'Saya memiliki pengalaman dua tahun sebagai staf administrasi, terbiasa mengelola arsip, membuat laporan, serta menguasai Microsoft Office (Excel, Word) dan Google Workspace. Saya pribadi yang teliti, disiplin, mampu bekerja dalam tim maupun mandiri, serta siap belajar hal baru. Saya yakin dapat memberikan kontribusi yang baik bagi perusahaan yang Bapak/Ibu pimpin.',
  lampiran: ['Daftar Riwayat Hidup (CV)', 'Fotokopi ijazah terakhir', 'Fotokopi transkrip nilai', 'Fotokopi KTP', 'Pas foto berwarna ukuran 4x6', 'Fotokopi sertifikat pendukung'],
  penutup: 'Besar harapan saya untuk dapat diberikan kesempatan wawancara agar dapat menjelaskan lebih lanjut mengenai potensi diri saya. Atas perhatian dan kesempatan yang Bapak/Ibu berikan, saya ucapkan terima kasih.',
  ttdHeading: 'Hormat saya,', ttd: '',
  kosong: false,
};

// Data User: identitas kop pelamar & tanda tangan (bukan isi lamaran)
const USER_KEYS = ['logo', 'posisi', 'nama', 'profesi', 'alamat', 'telepon', 'email', 'web', 'kota', 'ttl', 'pendidikan', 'ttdHeading', 'ttd'] as const;

// ============================================================
// SECTION: Isi surat -> LayoutDoc
// ============================================================
// Template kosongan: kop & data diri pelamar tetap; tujuan, posisi, sumber, tanggal & lampiran jadi titik-titik
function buildDoc(f: Form): LayoutDoc {
  const ko = f.kosong;
  const jabatan = ko ? TITIK : f.jabatan;
  const perusahaan = ko ? TITIK : f.perusahaan;
  const lampiran = ko ? ['', '', '', '', ''] : f.lampiran;
  return {
    logo: f.logo, logoOffset: getOffset(f.posisi, 'logo'),
    kopName: f.nama,
    kopLines: [f.profesi, f.alamat, [f.telepon && `Telp. ${f.telepon}`, f.email, f.web].filter(Boolean).join(' • ')].filter(Boolean),
    meta: [{ label: 'Lampiran', value: ko ? `${TITIK} berkas` : f.lampiran.length ? `${f.lampiran.length} berkas` : '-' }, { label: 'Perihal', value: `Lamaran Pekerjaan sebagai ${jabatan}` }],
    placeDate: ko ? `${f.kota || '……'}, …………… 20……` : [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: ko ? ['Kepada Yth.', TITIK, TITIK, TITIK, 'di Tempat'] : ['Kepada Yth.', f.kepada, f.perusahaan, f.alamatTujuan, 'di Tempat'].filter(Boolean),
    body: (
      <>
        <P>{f.salam}</P>
        <P>{f.pembuka.replace(/\{(\w+)\}/g, (m, key: string) => ({ sumber: ko ? TITIK : f.sumber, perusahaan, jabatan } as Record<string, string>)[key] ?? m)}</P>
        <InfoRows rows={[
          { label: 'Nama', value: f.nama }, { label: 'Tempat, tgl. lahir', value: f.ttl }, { label: 'Pendidikan terakhir', value: f.pendidikan },
          { label: 'Alamat', value: f.alamat }, { label: 'Telepon', value: f.telepon }, { label: 'Email', value: f.email },
        ]} />
        <P>{f.kualifikasi}</P>
        {lampiran.length > 0 && <>
          <P>Sebagai bahan pertimbangan, bersama surat ini saya lampirkan:</P>
          <ol style={{ margin: '0 0 0.6em', paddingLeft: '2.4em', listStyle: 'decimal' }}>{lampiran.map((l, i) => <li key={i}>{ko ? <Dots w="100%" /> : l}</li>)}</ol>
        </>}
        <P>{f.penutup}</P>
      </>
    ),
    signers: [{ heading: f.ttdHeading, name: f.nama, ttd: ko ? '' : f.ttd, ttdOffset: getOffset(f.posisi, 'ttd'), main: true }],
  };
}

function ListEditor({ items, onChange, label }: { items: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
          <span className="pt-2 text-sm text-gray-500 w-5 text-right">{i + 1}.</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} className={inputCls} value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="text-sm font-medium text-blue-700 min-h-[40px]">+ Tambah {label.toLowerCase()}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function SuratLamaranKerja() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...DEFAULT, ...saved } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF({ ...DEFAULT, tanggal: today() });
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src]);
  const fileName = `surat-lamaran-${(f.nama || 'kerja').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Foto / logo' }, { id: 'ttd', label: 'Tanda tangan' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <LayoutPicker value={f.gaya} onChange={(v) => set('gaya', v)} />
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Surat Lamaran Kerja</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:surat-lamaran-kerja" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Kop Pribadi (data pelamar)">
              <ImageUpload label="Pas foto / inisial (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <Field label="Nama lengkap & gelar"><AutoTextarea className={inputCls} value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
              <Field label="Profesi / tagline"><AutoTextarea className={inputCls} value={f.profesi} onChange={(e) => set('profesi', e.target.value)} /></Field>
              <Field label="Alamat lengkap"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Telepon"><AutoTextarea className={inputCls} value={f.telepon} onChange={(e) => set('telepon', e.target.value)} /></Field>
                <Field label="Email"><AutoTextarea className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
              </div>
              <Field label="LinkedIn / portofolio (opsional)"><AutoTextarea className={inputCls} value={f.web} onChange={(e) => set('web', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tempat, tanggal lahir"><AutoTextarea className={inputCls} value={f.ttl} onChange={(e) => set('ttl', e.target.value)} /></Field>
                <Field label="Pendidikan terakhir"><AutoTextarea className={inputCls} value={f.pendidikan} onChange={(e) => set('pendidikan', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Tujuan Lamaran">
              <Field label="Kepada Yth."><AutoTextarea className={inputCls} value={f.kepada} onChange={(e) => set('kepada', e.target.value)} /></Field>
              <Field label="Nama perusahaan"><AutoTextarea className={inputCls} value={f.perusahaan} onChange={(e) => set('perusahaan', e.target.value)} /></Field>
              <Field label="Alamat perusahaan"><AutoTextarea className={inputCls} value={f.alamatTujuan} onChange={(e) => set('alamatTujuan', e.target.value)} /></Field>
              <Field label="Posisi yang dilamar"><AutoTextarea className={inputCls} value={f.jabatan} onChange={(e) => set('jabatan', e.target.value)} /></Field>
              <Field label="Sumber info lowongan"><AutoTextarea className={inputCls} value={f.sumber} onChange={(e) => set('sumber', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Kota"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
            </FormSection>

            <FormSection title="Isi Lamaran" lockable>
              <Field label="Salam pembuka"><AutoTextarea className={inputCls} value={f.salam} onChange={(e) => set('salam', e.target.value)} /></Field>
              <NarrativeField label="Paragraf pembuka" rows={3} value={f.pembuka} onChange={(v) => set('pembuka', v)}
                vars={{ sumber: f.sumber, perusahaan: f.perusahaan, jabatan: f.jabatan }} onVar={(key, v) => set(key as 'sumber' | 'perusahaan' | 'jabatan', v)} />
              <p className="text-xs text-gray-500">Kode {'{sumber} {perusahaan} {jabatan}'} terisi dari kartu Tujuan Lamaran.</p>
              <Field label="Kualifikasi, pengalaman & keahlian"><AutoTextarea rows={4} className={inputCls} value={f.kualifikasi} onChange={(e) => set('kualifikasi', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Lampiran</p>
              <ListEditor label="Lampiran" items={f.lampiran} onChange={(v) => set('lampiran', v)} />
              <Field label="Kalimat penutup"><AutoTextarea rows={3} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
            </FormSection>

            <FormSection title="Tanda Tangan">
              <Field label="Salam penutup"><AutoTextarea className={inputCls} value={f.ttdHeading} onChange={(e) => set('ttdHeading', e.target.value)} /></Field>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={letterRef} className="w-max shadow-lg">
              <LayoutLetter layout={f.gaya} doc={buildDoc({ ...f, logo: logo.src, ttd: ttd.src })} k={k * pg.f * 0.86} W={pg.W} H={pg.H} pf={pg.f} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
