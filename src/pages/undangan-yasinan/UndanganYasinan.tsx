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
import { ExportButton, Field, ImageUpload, PaperPicker, inputCls, letterPage, useLetterExport, type Notify } from '../../shared/components/LetterKit';
import DocOptions, { TITIK } from '../../shared/components/DocOptions';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { Lembar, useTplFonts, type Isi } from './Lipat3';
import { TEMPLATES, getTpl } from './templates';
import FormSection from '../../shared/components/FormSection';

// Undangan Yasinan & Tahlilan lipat 3 dalam 1 halaman. Kertas landscape = 3 kolom tegak; kertas vertikal = 3 baris mendatar.
// Menu berdiri sendiri; 20 template sendiri (templates.ts), bukan LetterLayouts karena bentuknya brosur lipat.

// ============================================================
// SECTION: Data
// ============================================================
type Form = Omit<Isi, 'foto' | 'fotoOff' | 'ttd' | 'ttdOff'> & {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; ttd: string; // logo = foto almarhum/ah (slot gambar bersama Galeri/Data User)
  kosong: boolean;
};

const STORAGE_KEY = 'undangan-yasinan:v1';
const DOA = {
  L: 'اَللّٰهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ',
  P: 'اَللّٰهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَعَافِهَا وَاعْفُ عَنْهَا',
};
const HARI = ['3 Hari', '7 Hari', '40 Hari', '100 Hari', '1000 Hari', 'Haul ke-1'];
const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

// Tujuan undangan siap pakai: mengisi subjudul sampul, acara, kalimat pembuka & penutup (semua tetap bisa diedit)
const UNDANG = 'Dengan memohon rahmat dan ridha Allah SWT, kami mengharap kehadiran Bapak/Ibu/Saudara untuk';
const TUTUP = 'Atas kehadiran dan doanya kami ucapkan terima kasih. Jazakumullah khairan katsiran.';
const TUJUAN = [
  { id: 'kirim-doa', label: 'Kirim Doa', subjudul: 'Kirim Doa', acara: 'Kirim doa, tahlil & doa bersama untuk almarhum/ah',
    pembuka: `${UNDANG} bersama-sama mengirimkan doa bagi keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir dan turut mengirimkan doa, semoga almarhum/ah diampuni segala dosanya, diterima amal ibadahnya, dan ditempatkan di tempat terbaik di sisi Allah SWT. ${TUTUP}` },
  { id: 'yasin-tahlil', label: 'Yasinan & Tahlilan', subjudul: 'Tahlil & Yasin', acara: 'Pembacaan Surat Yasin, Tahlil & Doa bersama',
    pembuka: `${UNDANG} bersama-sama membaca Surat Yasin dan Tahlil serta mendoakan keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir dan turut mendoakan. ${TUTUP}` },
  { id: 'tahlil', label: 'Tahlilan', subjudul: 'Tahlilan', acara: 'Tahlil & Doa bersama',
    pembuka: `${UNDANG} bersama-sama membaca tahlil dan mendoakan keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Besar harapan kami Bapak/Ibu/Saudara berkenan hadir untuk bersama-sama bertahlil dan mendoakan. ${TUTUP}` },
  { id: 'yasinan', label: 'Yasinan', subjudul: 'Yasinan', acara: 'Pembacaan Surat Yasin & Doa bersama',
    pembuka: `${UNDANG} bersama-sama membaca Surat Yasin dan mendoakan keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Besar harapan kami Bapak/Ibu/Saudara berkenan hadir untuk bersama-sama membaca Surat Yasin dan mendoakan. ${TUTUP}` },
  { id: 'khataman', label: "Khataman Al-Qur'an", subjudul: "Khataman Al-Qur'an", acara: "Khataman Al-Qur'an, Tahlil & Doa bersama",
    pembuka: `${UNDANG} bersama-sama mengkhatamkan Al-Qur'an dan menghadiahkan pahalanya bagi keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Semoga bacaan Al-Qur'an dan doa kita menjadi penerang dan rahmat bagi almarhum/ah. ${TUTUP}` },
  { id: 'pengajian', label: 'Pengajian & Doa Bersama', subjudul: 'Pengajian & Doa Bersama', acara: 'Pengajian, Tausiyah & Doa bersama',
    pembuka: `${UNDANG} menghadiri pengajian dan doa bersama untuk keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:`,
    penutup: `Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir dan turut mendoakan. ${TUTUP}` },
  { id: 'haul', label: 'Haul', subjudul: 'Haul', acara: 'Peringatan Haul, Tahlil & Doa bersama',
    pembuka: `${UNDANG} menghadiri peringatan haul dan bersama-sama mendoakan keluarga kami yang telah mendahului kita, dalam rangka:`,
    penutup: `Semoga Allah SWT melimpahkan ampunan dan rahmat-Nya kepada almarhum/ah. ${TUTUP}` },
] as const;
const DEF_TUJUAN = TUJUAN[0];

// Template kosongan: data almarhum/ah, acara & keluarga jadi titik-titik (ditulis tangan); narasi, teks Arab, judul & kotak penerima tetap
const baris = (n: number) => Array(n).fill(TITIK).join('\n');
const KOSONG: Partial<Isi> = {
  nama: TITIK, nasab: TITIK, hari: '…… Hari', waktu: TITIK, tempat: baris(2), kepada: '',
  keluarga: `Keluarga Besar ${TITIK}`, anggota: baris(4), turut: baris(3), foto: '', ttd: '', kosong: true,
};

const makeDefault = (): Form => ({
  gaya: TEMPLATES[0].id, paper: 'A4', landscape: true, skala: 100, posisi: {},
  logo: '', ttd: '',
  jk: 'L', nama: 'Bapak H. Ahmad Sudirman', nasab: 'Kartorejo', wafat: isoDay(-39), hari: '40 Hari',
  judul: 'UNDANGAN', subjudul: DEF_TUJUAN.subjudul,
  kepada: '', diTempat: 'di Tempat', catatan: 'Mohon maaf apabila ada kesalahan dalam penulisan nama dan gelar.',
  doaArab: DOA.L, doaArti: 'Ya Allah, ampunilah dia, rahmatilah dia, sejahterakanlah dia, dan maafkanlah dia.',
  turut: 'Ketua RT 03 / RW 05\nTakmir Masjid Al-Ikhlas\nKeluarga Besar Bani Kartorejo',
  alamat: 'Jl. Melati No. 12, RT 03/RW 05, Kel. Sukamaju, Kec. Cibeunying Kidul, Bandung',
  salam: "Assalamu'alaikum Wr. Wb.",
  pembuka: DEF_TUJUAN.pembuka,
  pengantar: 'Insya Allah akan dilaksanakan pada:',
  tanggal: isoDay(), waktu: "Ba'da Isya (pukul 19.30 WIB) s/d selesai",
  tempat: 'Kediaman keluarga\nJl. Melati No. 12, RT 03/RW 05, Bandung', acara: DEF_TUJUAN.acara,
  penutup: DEF_TUJUAN.penutup,
  wassalam: "Wassalamu'alaikum Wr. Wb.",
  ttdHeading: 'Kami yang berduka,', keluarga: 'Keluarga Besar Alm. H. Ahmad Sudirman',
  anggota: 'Ibu Hj. Siti Aminah (istri)\nBudi Santoso & keluarga\nDewi Lestari & keluarga\nAndi Prasetyo & keluarga',
  kosong: false,
});
const DEFAULT = makeDefault();

// Data User: identitas almarhum/ah & keluarga + gambar (bisa dipakai ulang untuk 3/7/40/100 hari), bukan template/kertas
const USER_KEYS = ['logo', 'ttd', 'posisi', 'jk', 'nama', 'nasab', 'wafat', 'keluarga', 'anggota', 'ttdHeading', 'alamat', 'tempat', 'turut'] as const;



// ============================================================
// SECTION: Halaman
// ============================================================
export default function UndanganYasinan() {
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
  const foto = useBgRemoved(f.logo, bg.logo, bgError);
  const ttd = useBgRemoved(f.ttd, bg.ttd, bgError);
  const bgFor = (key: keyof typeof bg, shown: { src: string; busy: boolean }) => ({ bg: bg[key], onBg: (v: boolean) => setBg((p) => ({ ...p, [key]: v })), shown: shown.src, bgBusy: shown.busy });
  const busy = foto.busy || ttd.busy;

  const set = <K extends keyof Form>(key: K, v: Form[K]) => setF((p) => ({ ...p, [key]: v }));
  // Ganti almarhum/almarhumah: doa bawaan ikut lahu ↔ laha (doa yang sudah diubah pengguna dibiarkan)
  const setJk = (jk: 'L' | 'P') => setF((p) => ({ ...p, jk, doaArab: p.doaArab === DOA[p.jk] ? DOA[jk] : p.doaArab }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke bawaan?')) return;
    setF(makeDefault());
    notify('info', 'Semua isian dikembalikan ke bawaan.');
  };

  const pageRef = useRef<HTMLDivElement>(null);
  const t = getTpl(f.gaya);
  useTplFonts(t);
  const pg = letterPage(f.paper, f.landscape);
  const k = useFitScale(f.skala / 100, () => pageRef.current?.firstElementChild as HTMLElement, true, [f, foto.src, ttd.src]);
  const pad = 16 * pg.f * 0.86; // margin fisik tetap, tidak ikut slider teks
  const isi: Isi = { ...f, foto: foto.src, fotoOff: getOffset(f.posisi, 'logo'), ttd: ttd.src, ttdOff: getOffset(f.posisi, 'ttd'), ...(f.kosong ? KOSONG : {}) };
  const fileName = `undangan-yasinan-${(f.nama || 'undangan').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()}`;
  const { exporting, run } = useLetterExport(() => pageRef.current!.firstElementChild as HTMLElement, fileName, notify, pg.paper);

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <DocOptions kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }} />
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Foto almarhum/ah' }, { id: 'ttd', label: `TTD ${f.keluarga || 'Keluarga'}` }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <Field label="Template undangan">
        <select className={inputCls} value={t.id} onChange={(e) => set('gaya', e.target.value)}>
          {TEMPLATES.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
        </select>
      </Field>
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
      <p className="text-xs text-gray-600">Satu halaman dibagi 3 panel. Landscape: 3 kolom tegak. Vertikal: 3 baris mendatar (isi ditata melebar). Lipat mengikuti garis titik-titik.</p>
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
  const ta = (key: keyof Form, label: string, rows = 1) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={String(f[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Undangan Kirim Doa, Yasinan & Tahlilan (Lipat 3)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:undangan-yasinan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <FormSection title="Almarhum / Almarhumah">
              <div className="flex gap-2" role="radiogroup" aria-label="Sebutan">
                {(['L', 'P'] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={f.jk === v} onClick={() => setJk(v)}
                    className={`flex-1 px-3 rounded-lg border text-sm font-medium min-h-[44px] ${f.jk === v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>
                    {v === 'L' ? 'Almarhum (bin)' : 'Almarhumah (binti)'}
                  </button>
                ))}
              </div>
              {ta('nama', 'Nama almarhum/ah')}
              {ta('nasab', f.jk === 'P' ? 'Binti (nama ayah)' : 'Bin (nama ayah)')}
              <div className="grid sm:grid-cols-2 gap-2">
                <Field label="Tanggal wafat"><input type="date" className={inputCls} value={f.wafat} onChange={(e) => set('wafat', e.target.value)} /></Field>
                <Field label="Peringatan">
                  <input list="undangan-yasinan-hari" className={inputCls} value={f.hari} onChange={(e) => set('hari', e.target.value)} />
                  <datalist id="undangan-yasinan-hari">{HARI.map((h) => <option key={h} value={h} />)}</datalist>
                </Field>
              </div>
              <ImageUpload label="Foto almarhum/ah (opsional)" value={f.logo} onChange={(v) => set('logo', v)} notify={notify} {...bgFor('logo', foto)} />
            </FormSection>

            <FormSection title="Sampul, Penerima & Doa">
              <Field label="Tujuan undangan (mengisi teks di bawah, tetap bisa diubah)">
                <select className={inputCls} value="" onChange={(e) => {
                  const p = TUJUAN.find((x) => x.id === e.target.value);
                  if (p) setF((v) => ({ ...v, subjudul: p.subjudul, acara: p.acara, pembuka: p.pembuka, penutup: p.penutup }));
                }}>
                  <option value="">Pilih tujuan: {TUJUAN.map((x) => x.label).join(', ')}…</option>
                  {TUJUAN.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </Field>
              <div className="grid sm:grid-cols-2 gap-2">{ta('judul', 'Judul sampul')}{ta('subjudul', 'Tujuan / subjudul sampul (bebas)')}</div>
              {ta('kepada', 'Kepada Yth. (kosongkan = kotak putih di sampul ditulis bolpoin)', 2)}
              {ta('catatan', 'Catatan kecil (mis. mohon maaf salah nama/gelar)', 2)}
              {ta('doaArab', 'Doa (teks Arab)', 2)}
              {ta('doaArti', 'Arti doa', 2)}
              {ta('turut', 'Turut mengundang (satu per baris)', 3)}
              {ta('alamat', 'Alamat shohibul hajat', 2)}
            </FormSection>

            <FormSection title="Isi Undangan">
              {ta('salam', 'Salam pembuka')}
              {ta('pembuka', 'Kalimat pembuka', 3)}
              {ta('pengantar', 'Pengantar waktu & tempat')}
              <Field label="Tanggal acara"><input type="date" className={inputCls} value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
              {ta('waktu', "Waktu (mis. Ba'da Isya / pukul)")}
              {ta('tempat', 'Tempat', 2)}
              {ta('acara', 'Acara', 2)}
              {ta('penutup', 'Kalimat penutup', 3)}
              {ta('wassalam', 'Salam penutup')}
              <div className="grid sm:grid-cols-2 gap-2">{ta('ttdHeading', 'Pembuka tanda tangan')}{ta('keluarga', 'Keluarga / shohibul hajat')}</div>
              {ta('anggota', 'Daftar nama keluarga (satu per baris)', 3)}
              <ImageUpload label={`Tanda tangan — ${f.keluarga || 'Keluarga'} (opsional)`} value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </FormSection>
            </>)}
          </div>

          <FitPreview>
            <div ref={pageRef} className="w-max shadow-lg">
              <Lembar t={t} d={isi} k={k * pg.f * 0.86} pad={pad} W={pg.W} H={pg.H} />
            </div>
          </FitPreview>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
