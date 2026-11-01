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
import { InfoRows, LayoutLetter, LayoutPicker, P, type LayoutDoc, type LayoutSigner } from '../../shared/components/LetterLayouts';
import DocOptions, { TITIK, TITIK_PENDEK, isian, nomorTampil } from '../../shared/components/DocOptions';
import { orRandomNo, randomDocNo } from '../../shared/lib/docNumber';
import { useBgRemoved } from '../../shared/lib/removeBg';

// Undangan Musyawarah Desa (Musdes): undangan resmi Pemerintah Desa atau BPD berkop pemerintahan desa.
// Nomor: 005 = kode klasifikasi arsip "Undangan" (pedoman tata naskah dinas / klasifikasi arsip pemerintahan daerah & desa),
// lalu nomor urut / kode unit (DS = Pemerintah Desa, BPD) / bulan romawi / tahun.
// Menu berdiri sendiri; tata letak dari LetterLayouts (20 template), kertas/ekspor dari LetterKit.

// ============================================================
// SECTION: Data
// ============================================================
type Penyelenggara = 'desa' | 'bpd';
type Form = {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; penyelenggara: Penyelenggara; kabupaten: string; kecamatan: string; desa: string; alamat: string; kodePos: string; kontak: string;
  nomor: string; lampiran: string; perihal: string; kota: string; tanggal: string;
  kepadaSapaan: string; penerima: string[];
  salamPembuka: string; pembuka: string;
  acaraTanggal: string; pukul: string; tempat: string;
  agenda: string[]; penutup: string; salamPenutup: string;
  ttdJabatan: string; ttdNama: string; ttd: string; stempel: string;
  mengetahui: boolean; mengetahuiJabatan: string; mengetahuiNama: string; ttdMengetahui: string; stempelMengetahui: string;
  tembusan: string[];
  pakaiNomor: boolean; kosong: boolean; // opsi dokumen (DocOptions)
};

const STORAGE_KEY = 'undangan-musyawarah-desa:v1';
const UNIT: Record<Penyelenggara, string> = { desa: 'DS', bpd: 'BPD' };
const pola = (p: Penyelenggara) => `005/{n3}/${UNIT[p]}/{rom}/{yyyy}`;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const hariTanggal = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; // "Minggu, 8 November 2026"
const jabatanOf = (p: Penyelenggara, desa: string) => (p === 'desa' ? `Kepala Desa ${desa}` : `Ketua BPD Desa ${desa}`);

const makeDefault = (): Form => ({
  gaya: 'klasik', paper: 'A4', landscape: false, skala: 100, posisi: {},
  logo: '', penyelenggara: 'desa', kabupaten: 'Klaten', kecamatan: 'Wedi', desa: 'Sukamaju',
  alamat: 'Jl. Raya Sukamaju No. 1, Desa Sukamaju, Kec. Wedi, Kab. Klaten', kodePos: '57461',
  kontak: 'Telp. 0812-0000-1234 • pemdes@sukamaju.desa.id • sukamaju.desa.id',
  nomor: randomDocNo(pola('desa')), lampiran: '-', perihal: 'Undangan Musyawarah Desa', kota: 'Sukamaju', tanggal: today(),
  kepadaSapaan: 'Bapak/Ibu/Saudara/i:',
  penerima: ['Ketua dan Anggota BPD', 'Ketua LPM', 'Ketua Tim Penggerak PKK', 'Ketua Karang Taruna', 'Ketua RT/RW se-Desa Sukamaju', 'Tokoh Masyarakat, Tokoh Agama, dan Tokoh Pemuda'],
  salamPembuka: "Assalamu'alaikum Wr. Wb.",
  pembuka: 'Dalam rangka penyelenggaraan Musyawarah Desa, dengan ini kami mengharap kehadiran Bapak/Ibu/Saudara/i pada:',
  acaraTanggal: plusDays(7), pukul: '09.00 WIB s.d. selesai', tempat: 'Balai Desa Sukamaju',
  agenda: ['Penyusunan Rencana Kerja Pemerintah Desa (RKPDes) tahun anggaran berikutnya.', 'Penetapan prioritas penggunaan Dana Desa (DD).', 'Lain-lain.'],
  penutup: 'Mengingat pentingnya acara tersebut, kami mohon Bapak/Ibu/Saudara/i dapat hadir tepat pada waktunya. Atas perhatian dan kehadirannya kami ucapkan terima kasih.',
  salamPenutup: "Wassalamu'alaikum Wr. Wb.",
  ttdJabatan: jabatanOf('desa', 'Sukamaju'), ttdNama: 'Sutrisno', ttd: '', stempel: '',
  mengetahui: false, mengetahuiJabatan: 'Ketua BPD Desa Sukamaju', mengetahuiNama: 'Haryanto', ttdMengetahui: '', stempelMengetahui: '',
  tembusan: ['Camat Wedi', 'Arsip'],
  pakaiNomor: true, kosong: false,
});

// Data User: identitas kop, penanda tangan & gambar (bukan isi undangan)
const USER_KEYS = ['logo', 'posisi', 'penyelenggara', 'kabupaten', 'kecamatan', 'desa', 'alamat', 'kodePos', 'kontak', 'kota',
  'ttdJabatan', 'ttdNama', 'ttd', 'stempel', 'mengetahuiJabatan', 'mengetahuiNama', 'ttdMengetahui', 'stempelMengetahui'] as const;

// ============================================================
// SECTION: Editor daftar
// ============================================================
function ListEditor({ items, onChange, label }: { items: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
          <span className="pt-2 text-sm font-bold text-gray-600">{i + 1}.</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} className={inputCls} value={t} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`}
            className="px-3 min-h-[40px] rounded-lg text-red-600 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="min-h-[40px] text-sm font-medium text-blue-700">+ Tambah {label.toLowerCase()}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function UndanganMusyawarahDesa() {
  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...makeDefault(), ...saved, nomor: orRandomNo(saved.nomor, pola(saved.penyelenggara === 'bpd' ? 'bpd' : 'desa')) } : makeDefault();
    } catch {
      return makeDefault();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Gambar terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify]);

  const [bg, setBg] = useState({ logo: true, ttd: true, stempel: true, ttdMengetahui: true, stempelMengetahui: true });
  const bgError = (m: string) => notify('error', m);
  const logo = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const stempel = useBgRemoved(f.stempel, bg.stempel, bgError);
  const ttdMengetahui = useBgRemoved(f.ttdMengetahui, bg.ttdMengetahui, bgError);
  const stempelMengetahui = useBgRemoved(f.stempelMengetahui, bg.stempelMengetahui, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = logo.busy || ttd.busy || stempel.busy || ttdMengetahui.busy || stempelMengetahui.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  // Ganti penyelenggara: kode unit di nomor & jabatan penanda tangan ikut berganti
  const pickPenyelenggara = (v: Penyelenggara) => setF((p) => ({
    ...p, penyelenggara: v,
    nomor: p.nomor.replace(/\/(DS|BPD)\//, `/${UNIT[v]}/`),
    ttdJabatan: p.ttdJabatan === jabatanOf(p.penyelenggara, p.desa) ? jabatanOf(v, p.desa) : p.ttdJabatan,
  }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const letterRef = useRef<HTMLDivElement>(null);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => letterRef.current?.firstElementChild as HTMLElement, true, [f, logo.src, ttd.src, stempel.src, ttdMengetahui.src, stempelMengetahui.src]);
  const kk = k * pg.f * 0.86;
  const fileName = `undangan-musyawarah-desa-${(f.nomor || 'surat').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => letterRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const up = (s: string) => s.toUpperCase();
  const ko = f.kosong; // template kosongan: penerima, tanggal, waktu, tempat & agenda jadi titik-titik; kop & penanda tangan tetap
  const img = (x: string) => (ko ? '' : x); // tanda tangan & stempel basah
  const blankLine = <span style={{ display: 'inline-block', width: '100%', height: '1.3em', borderBottom: '1.5px dotted #000' }} />;
  const signers: LayoutSigner[] = [
    ...(f.mengetahui ? [{ heading: 'Mengetahui,', role: f.mengetahuiJabatan, name: f.mengetahuiNama, ttd: img(ttdMengetahui.src), stempel: img(stempelMengetahui.src), ttdOffset: getOffset(f.posisi, 'ttdMengetahui'), stempelOffset: getOffset(f.posisi, 'stempelMengetahui') }] : []),
    { heading: f.ttdJabatan + ',', name: f.ttdNama, ttd: img(ttd.src), stempel: img(stempel.src), ttdOffset: getOffset(f.posisi, 'ttd'), stempelOffset: getOffset(f.posisi, 'stempel'), main: true },
  ];
  const penerima = f.penerima.filter(Boolean);
  const tembusan = f.tembusan.filter(Boolean);
  const doc: LayoutDoc = {
    logo: logo.src, logoOffset: getOffset(f.posisi, 'logo'),
    // shortcut: LayoutDoc hanya punya satu baris besar (kopName) di atas, jadi nama penyelenggara dibesarkan dan kabupaten/kecamatan di baris kecil
    kopName: f.penyelenggara === 'desa' ? `PEMERINTAH DESA ${up(f.desa)}` : `BADAN PERMUSYAWARATAN DESA ${up(f.desa)}`,
    kopLines: [
      [f.kabupaten && `PEMERINTAH KABUPATEN ${up(f.kabupaten)}`, f.kecamatan && `KECAMATAN ${up(f.kecamatan)}`].filter(Boolean).join(' – '),
      [f.alamat, f.kodePos && `Kode Pos ${f.kodePos}`].filter(Boolean).join(' '),
      f.kontak,
    ],
    nomor: nomorTampil(f.nomor, f.pakaiNomor, ko),
    meta: [{ label: 'Lampiran', value: f.lampiran || '-' }, { label: 'Perihal', value: f.perihal }],
    placeDate: ko ? `${f.kota || TITIK_PENDEK}, …………… 20……` : [f.kota, fmtTanggal(f.tanggal)].filter(Boolean).join(', '),
    recipient: ['Kepada Yth.', f.kepadaSapaan, ...(ko ? [TITIK + TITIK] : penerima.length > 1 ? penerima.map((p, i) => `${i + 1}. ${p}`) : penerima), 'di Tempat'],
    body: (
      <>
        {f.salamPembuka && <P style={{ fontStyle: 'italic' }}>{f.salamPembuka}</P>}
        <P>{f.pembuka}</P>
        <InfoRows rows={[{ label: 'Hari / tanggal', value: isian(hariTanggal(f.acaraTanggal), ko) }, { label: 'Pukul', value: isian(f.pukul, ko) }, { label: 'Tempat', value: isian(f.tempat, ko) }]} />
        {(ko || f.agenda.some(Boolean)) && (<>
          <P>dengan agenda sebagai berikut:</P>
          <ol style={{ margin: `0 0 ${8 * kk}px`, paddingLeft: 24 * kk, listStyle: 'decimal' }}>
            {ko ? [0, 1, 2, 3].map((i) => <li key={i} style={{ marginBottom: 4 * kk }}>{blankLine}</li>)
              : f.agenda.filter(Boolean).map((t, i) => <li key={i} style={{ textAlign: 'justify', whiteSpace: 'pre-line' }}>{t}</li>)}
          </ol>
        </>)}
        <P>{f.penutup}</P>
        {f.salamPenutup && <P style={{ fontStyle: 'italic' }}>{f.salamPenutup}</P>}
      </>
    ),
    signers,
    footer: tembusan.length ? (
      <>
        <div style={{ fontWeight: 700 }}>Tembusan disampaikan kepada Yth.:</div>
        {tembusan.map((t, i) => <div key={i}>{i + 1}. {t}</div>)}
      </>
    ) : undefined,
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }} kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Logo' }, { id: 'ttd', label: 'Tanda tangan' }, { id: 'stempel', label: 'Stempel' },
        ...(f.mengetahui ? [{ id: 'ttdMengetahui', label: 'Ttd mengetahui' }, { id: 'stempelMengetahui', label: 'Stempel mengetahui' }] : [])]}
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
      <button onClick={reset} className="px-5 py-2 min-h-[44px] rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Undangan Musyawarah Desa</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:undangan-musyawarah-desa" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Kop Surat</h2>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Penyelenggara">
                {([['desa', 'Pemerintah Desa'], ['bpd', 'BPD']] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => pickPenyelenggara(id)} aria-pressed={f.penyelenggara === id}
                    className={`min-h-[44px] px-3 rounded-lg border text-sm font-medium ${f.penyelenggara === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>{label}</button>
                ))}
              </div>
              <ImageUpload label="Logo kabupaten" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', logo)} />
              <div className="grid sm:grid-cols-3 gap-2">
                <Field label="Kabupaten"><AutoTextarea className={inputCls} value={f.kabupaten} onChange={(e) => set('kabupaten', e.target.value)} /></Field>
                <Field label="Kecamatan"><AutoTextarea className={inputCls} value={f.kecamatan} onChange={(e) => set('kecamatan', e.target.value)} /></Field>
                <Field label="Desa"><AutoTextarea className={inputCls} value={f.desa} onChange={(e) => set('desa', e.target.value)} /></Field>
              </div>
              <Field label="Alamat kantor desa"><AutoTextarea className={inputCls} value={f.alamat} onChange={(e) => set('alamat', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-[1fr_2fr] gap-2">
                <Field label="Kode pos"><AutoTextarea className={inputCls} value={f.kodePos} onChange={(e) => set('kodePos', e.target.value)} /></Field>
                <Field label="Telepon, email, website"><AutoTextarea className={inputCls} value={f.kontak} onChange={(e) => set('kontak', e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Data Surat</h2>
              <Field label="Nomor surat"><NumberFormatInput parts={['Klasifikasi', 'Nomor', 'Unit', 'Bulan', 'Tahun']} example={`${randomDocNo(pola(f.penyelenggara))} (005 = kode klasifikasi undangan/nomor urut/${UNIT[f.penyelenggara]}/bulan romawi/tahun)`} value={f.nomor} onChange={(v) => set('nomor', v)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Lampiran"><AutoTextarea className={inputCls} value={f.lampiran} onChange={(e) => set('lampiran', e.target.value)} /></Field>
                <Field label="Perihal"><AutoTextarea className={inputCls} value={f.perihal} onChange={(e) => set('perihal', e.target.value)} /></Field>
                <Field label="Tempat surat"><AutoTextarea className={inputCls} value={f.kota} onChange={(e) => set('kota', e.target.value)} /></Field>
                <Field label="Tanggal surat"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              </div>
              <Field label="Sapaan penerima"><AutoTextarea className={inputCls} value={f.kepadaSapaan} onChange={(e) => set('kepadaSapaan', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Kepada Yth. (daftar penerima)</p>
              <ListEditor label="Penerima" items={f.penerima} onChange={(v) => set('penerima', v)} />
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Isi Undangan</h2>
              <Field label="Salam pembuka (kosongkan bila tidak dipakai)"><AutoTextarea className={inputCls} value={f.salamPembuka} onChange={(e) => set('salamPembuka', e.target.value)} /></Field>
              <Field label="Kalimat pembuka"><AutoTextarea rows={2} className={inputCls} value={f.pembuka} onChange={(e) => set('pembuka', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Hari / tanggal acara"><input type="date" className={inputCls} value={f.acaraTanggal} onChange={(e) => set('acaraTanggal', e.target.value)} /></Field>
                <Field label="Pukul"><AutoTextarea className={inputCls} value={f.pukul} onChange={(e) => set('pukul', e.target.value)} /></Field>
              </div>
              <Field label="Tempat"><AutoTextarea className={inputCls} value={f.tempat} onChange={(e) => set('tempat', e.target.value)} /></Field>
              <p className="text-sm font-bold text-gray-700">Agenda</p>
              <ListEditor label="Agenda" items={f.agenda} onChange={(v) => set('agenda', v)} />
              <Field label="Kalimat penutup"><AutoTextarea rows={2} className={inputCls} value={f.penutup} onChange={(e) => set('penutup', e.target.value)} /></Field>
              <Field label="Salam penutup (kosongkan bila tidak dipakai)"><AutoTextarea className={inputCls} value={f.salamPenutup} onChange={(e) => set('salamPenutup', e.target.value)} /></Field>
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Penanda Tangan</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Jabatan"><AutoTextarea className={inputCls} value={f.ttdJabatan} onChange={(e) => set('ttdJabatan', e.target.value)} /></Field>
                <Field label="Nama"><AutoTextarea className={inputCls} value={f.ttdNama} onChange={(e) => set('ttdNama', e.target.value)} /></Field>
              </div>
              <ImageUpload label="Tanda tangan" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <ImageUpload label="Stempel" value={f.stempel} onChange={(v) => set('stempel', v)} notify={notify} {...bgFor('stempel', stempel)} />
              <label className="flex items-center gap-2 min-h-[40px] text-sm font-medium">
                <input type="checkbox" className="w-5 h-5" checked={f.mengetahui} onChange={(e) => set('mengetahui', e.target.checked)} /> Tambah "Mengetahui," pihak lain
              </label>
              {f.mengetahui && (<>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Jabatan yang mengetahui"><AutoTextarea className={inputCls} value={f.mengetahuiJabatan} onChange={(e) => set('mengetahuiJabatan', e.target.value)} /></Field>
                  <Field label="Nama"><AutoTextarea className={inputCls} value={f.mengetahuiNama} onChange={(e) => set('mengetahuiNama', e.target.value)} /></Field>
                </div>
                <ImageUpload label="Tanda tangan (mengetahui)" value={f.ttdMengetahui} onChange={(v) => set('ttdMengetahui', v)} notify={notify} {...bgFor('ttdMengetahui', ttdMengetahui)} />
                <ImageUpload label="Stempel (mengetahui)" value={f.stempelMengetahui} onChange={(v) => set('stempelMengetahui', v)} notify={notify} {...bgFor('stempelMengetahui', stempelMengetahui)} />
              </>)}
              <p className="text-sm font-bold text-gray-700">Tembusan (opsional)</p>
              <ListEditor label="Tembusan" items={f.tembusan} onChange={(v) => set('tembusan', v)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
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
