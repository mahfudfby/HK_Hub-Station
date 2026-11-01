import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview, { unfitPreview } from '../../shared/components/FitPreview';
import PositionPad, { getOffset, type Offsets } from '../../shared/components/PositionPad';
import { CanvasPanel, ModeTabs, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { ExportButton, Field, ImageUpload, PaperPicker, exportPage, inputCls, letterPage, type ExportKind, type Notify, type Paper } from '../../shared/components/LetterKit';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { fontsReady } from '../../shared/lib/fonts';
import { saveFile } from '../../shared/lib/saveFile';
import { isStaleChunkError, reloadForNewVersion } from '../../shared/lib/staleChunk';
import { Sisi, useTplFonts, type Isi } from './Lipat3';
import { TEMPLATES, getTpl } from './templates';

// Undangan Yasinan & Tahlilan lipat 3 (A4 landscape → 3 panel ±99 mm). Dua sisi: luar & dalam.
// Menu berdiri sendiri; 20 template sendiri (templates.ts), bukan LetterLayouts karena bentuknya brosur lipat.

// ============================================================
// SECTION: Data
// ============================================================
type Side = 'luar' | 'dalam';
type Form = Omit<Isi, 'foto' | 'fotoOff' | 'ttd' | 'ttdOff'> & {
  gaya: string; paper: string; landscape: boolean; skala: number; posisi: Offsets;
  logo: string; ttd: string; // logo = foto almarhum/ah (slot gambar bersama Galeri/Data User)
};

const STORAGE_KEY = 'undangan-yasinan:v1';
const DOA = {
  L: 'اَللّٰهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ',
  P: 'اَللّٰهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَعَافِهَا وَاعْفُ عَنْهَا',
};
const HARI = ['3 Hari', '7 Hari', '40 Hari', '100 Hari', '1000 Hari', 'Haul ke-1'];
const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

const makeDefault = (): Form => ({
  gaya: TEMPLATES[0].id, paper: 'A4', landscape: true, skala: 100, posisi: {},
  logo: '', ttd: '',
  jk: 'L', nama: 'Bapak H. Ahmad Sudirman', nasab: 'Kartorejo', wafat: isoDay(-39), hari: '40 Hari',
  judul: 'UNDANGAN', subjudul: 'Tahlil & Yasin',
  kepada: '', diTempat: 'di Tempat', catatan: 'Mohon maaf apabila ada kesalahan dalam penulisan nama dan gelar.',
  doaArab: DOA.L, doaArti: 'Ya Allah, ampunilah dia, rahmatilah dia, sejahterakanlah dia, dan maafkanlah dia.',
  turut: 'Ketua RT 03 / RW 05\nTakmir Masjid Al-Ikhlas\nKeluarga Besar Bani Kartorejo',
  alamat: 'Jl. Melati No. 12, RT 03/RW 05, Kel. Sukamaju, Kec. Cibeunying Kidul, Bandung',
  salam: "Assalamu'alaikum Wr. Wb.",
  pembuka: 'Dengan memohon rahmat dan ridha Allah SWT, kami mengharap kehadiran Bapak/Ibu/Saudara untuk bersama-sama membaca Surat Yasin dan Tahlil serta mendoakan keluarga kami yang telah berpulang ke rahmatullah, dalam rangka:',
  pengantar: 'Insya Allah akan dilaksanakan pada:',
  tanggal: isoDay(), waktu: "Ba'da Isya (pukul 19.30 WIB) s/d selesai",
  tempat: 'Kediaman keluarga\nJl. Melati No. 12, RT 03/RW 05, Bandung', acara: 'Pembacaan Surat Yasin, Tahlil & Doa bersama',
  penutup: 'Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara berkenan hadir dan turut mendoakan. Atas kehadiran dan doanya kami ucapkan terima kasih. Jazakumullah khairan katsiran.',
  wassalam: "Wassalamu'alaikum Wr. Wb.",
  ttdHeading: 'Kami yang berduka,', keluarga: 'Keluarga Besar Alm. H. Ahmad Sudirman',
  anggota: 'Ibu Hj. Siti Aminah (istri)\nBudi Santoso & keluarga\nDewi Lestari & keluarga\nAndi Prasetyo & keluarga',
});
const DEFAULT = makeDefault();

// Data User: identitas almarhum/ah & keluarga + gambar (bisa dipakai ulang untuk 3/7/40/100 hari), bukan template/kertas
const USER_KEYS = ['logo', 'ttd', 'posisi', 'jk', 'nama', 'nasab', 'wafat', 'keluarga', 'anggota', 'ttdHeading', 'alamat', 'tempat', 'turut'] as const;

// PDF berisi 2 halaman (sisi luar lalu sisi dalam) untuk cetak bolak-balik. Sisi tersembunyi dimunculkan di klon html2canvas.
async function exportPdfBoth(pages: HTMLElement[], fileName: string, paper: Paper, scale = 3) {
  await fontsReady();
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const orientation = paper.w > paper.h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'mm', format: [paper.w, paper.h], orientation });
  for (const [i, page] of pages.entries()) {
    const width = page.offsetWidth;
    const height = page.offsetHeight;
    if (page.scrollHeight > height + 1) throw new Error('isi melebihi 1 halaman. Kurangi isinya atau pilih kertas lebih besar.');
    const canvas = await html2canvas(page, {
      scale, width, height, windowWidth: 1280, backgroundColor: '#fff', useCORS: true,
      onclone: (doc) => {
        unfitPreview(doc);
        doc.querySelectorAll<HTMLElement>('[data-sisi]').forEach((el) => (el.style.visibility = 'visible'));
      },
    });
    if (i) pdf.addPage([paper.w, paper.h], orientation);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, paper.w, paper.h);
  }
  saveFile(pdf.output('blob'), `${fileName}.pdf`);
}


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

  const [side, setSide] = useState<Side>('luar');
  const luarRef = useRef<HTMLDivElement>(null);
  const dalamRef = useRef<HTMLDivElement>(null);
  const t = getTpl(f.gaya);
  useTplFonts(t);
  const pg = letterPage(f.paper, f.landscape);
  const deps = [f, foto.src, ttd.src, side];
  const kL = useFitScale(f.skala / 100, () => luarRef.current?.firstElementChild as HTMLElement, true, deps);
  const kD = useFitScale(f.skala / 100, () => dalamRef.current?.firstElementChild as HTMLElement, true, deps);
  const pad = 16 * pg.f * 0.86; // margin fisik tetap, tidak ikut slider teks
  const isi: Isi = { ...f, foto: foto.src, fotoOff: getOffset(f.posisi, 'logo'), ttd: ttd.src, ttdOff: getOffset(f.posisi, 'ttd') };
  const fileName = `undangan-yasinan-${(f.nama || 'undangan').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()}`;

  const [exporting, setExporting] = useState<'' | ExportKind>('');
  const run = async (kind: ExportKind) => {
    setExporting(kind);
    notify('loading', kind === 'Print' ? 'Menyiapkan cetakan…' : `Membuat file ${kind}…`);
    const name = kind === 'PDF' ? fileName : `${fileName}-${side}`;
    try {
      if (kind === 'PDF') await exportPdfBoth([luarRef.current!, dalamRef.current!], name, pg.paper);
      else await exportPage((side === 'luar' ? luarRef : dalamRef).current!, kind, name, pg.paper);
      notify('success', kind === 'Print' ? 'Jendela cetak dibuka.' : `${name}.${kind.toLowerCase()} berhasil diunduh.`);
    } catch (err: any) {
      if (isStaleChunkError(err) && reloadForNewVersion()) {
        notify('info', 'Aplikasi baru saja diperbarui. Memuat ulang… lalu tekan Unduh sekali lagi.');
        return;
      }
      notify('error', `Gagal ${kind === 'Print' ? 'mencetak' : `membuat ${kind}`}: ${err?.message || 'proses render gagal.'}`);
    } finally {
      setExporting('');
    }
  };

  const [geser, setGeser] = useState('logo');
  const [canvas, setCanvas] = useCanvasMode();
  const sideToggle = (
    <div className="flex gap-2" role="radiogroup" aria-label="Sisi kertas">
      {(['luar', 'dalam'] as const).map((s) => (
        <button key={s} type="button" role="radio" aria-checked={side === s} onClick={() => setSide(s)}
          className={`flex-1 px-3 rounded-lg border text-sm font-medium min-h-[44px] ${side === s ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
          {s === 'luar' ? 'Sisi Luar (sampul)' : 'Sisi Dalam (isi)'}
        </button>
      ))}
    </div>
  );
  const tampilan = (
    <>
      <TextSizeSlider value={f.skala} effective={Math.min(kL, kD)} onChange={(v) => set('skala', v)} />
      <PositionPad targets={[{ id: 'logo', label: 'Foto almarhum/ah' }, { id: 'ttd', label: 'Tanda tangan' }]}
        active={geser} onActive={setGeser} value={f.posisi} onChange={(v) => set('posisi', v)} />
      <Field label="Template undangan">
        <select className={inputCls} value={t.id} onChange={(e) => set('gaya', e.target.value)}>
          {TEMPLATES.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
        </select>
      </Field>
      <PaperPicker paper={f.paper} landscape={f.landscape} onPaper={(v) => set('paper', v)} onLandscape={(v) => set('landscape', v)} />
      <p className="text-xs text-gray-600">Kertas dibagi 3 panel sama lebar. Cetak bolak-balik (balik di sisi pendek), lalu lipat mengikuti garis titik-titik.</p>
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-600" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
      <p className="w-full text-xs text-gray-600">PDF berisi 2 halaman (luar + dalam). PNG & Print memakai sisi yang sedang tampil.</p>
    </>
  );
  const ta = (key: keyof Form, label: string, rows = 1) => (
    <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={String(f[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} /></Field>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-2xl font-bold text-center mb-4">Undangan Yasinan & Tahlilan (Lipat 3)</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
            <UserData storageKey="data-user:undangan-yasinan" keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

            <section className="space-y-3">
              <h2 className="font-bold">Almarhum / Almarhumah</h2>
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
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Sisi Luar</h2>
              <div className="grid sm:grid-cols-2 gap-2">{ta('judul', 'Judul sampul')}{ta('subjudul', 'Subjudul sampul')}</div>
              {ta('kepada', 'Kepada Yth. (kosongkan untuk titik-titik ditulis tangan)', 2)}
              {ta('diTempat', 'Baris "di Tempat"')}
              {ta('catatan', 'Catatan di panel penerima', 2)}
              {ta('doaArab', 'Doa (teks Arab)', 2)}
              {ta('doaArti', 'Arti doa', 2)}
              {ta('turut', 'Turut mengundang (satu per baris)', 3)}
              {ta('alamat', 'Alamat shohibul hajat', 2)}
            </section>

            <section className="space-y-3">
              <h2 className="font-bold">Sisi Dalam</h2>
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
              <ImageUpload label="Tanda tangan (opsional)" value={f.ttd} onChange={(v) => set('ttd', v)} notify={notify} {...bgFor('ttd', ttd)} />
              <p className="text-xs text-gray-500">Teks disimpan otomatis di perangkat ini; gambar Data User disimpan di Cloudinary.</p>
            </section>
            </>)}
          </div>

          <div className="space-y-3 min-w-0">
            {sideToggle}
            <FitPreview>
              <div className="relative w-max shadow-lg">
                {(['luar', 'dalam'] as const).map((s) => (
                  // Sisi lain tetap ditata (tersembunyi) agar ukurannya terukur & bisa ikut PDF 2 halaman
                  <div key={s} ref={s === 'luar' ? luarRef : dalamRef} data-sisi={s} aria-hidden={side !== s}
                    style={side === s ? undefined : { position: 'absolute', top: 0, left: 0, visibility: 'hidden' }}>
                    <Sisi t={t} d={isi} sisi={s} k={(s === 'luar' ? kL : kD) * pg.f * 0.86} pad={pad} W={pg.W} H={pg.H} />
                  </div>
                ))}
              </div>
            </FitPreview>
          </div>
        </div>

      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
