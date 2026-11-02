import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AutoTextarea from './AutoTextarea';
import FitPreview from './FitPreview';
import SharedGallery from './SharedGallery';
import UserData from './UserData';
import FormSection from './FormSection';
import { CanvasPanel, ModeTabs, useCanvasMode } from './CanvasMode';
import { Toast, type ToastState } from './Feedback';
import { TextSizeSlider } from './TextScale';
import { ExportButton, Field, ImageUpload, PAPERS, inputCls, letterPage, type Notify } from './LetterKit';
import { BAGIAN, CV_DEFAULT, LBL, PALET, collectTexts, newId, printText, type Bagian, type Cv } from './CvKit';
import { PageView, TEMPLATES_ATS, TEMPLATES_CREATIVE, buildFlows, type Env } from './CvTemplates';
import { usePagination } from '../../pages/surat-kontrak-kerja/usePagination';
import { usePagesExport } from '../../pages/surat-kontrak-kerja/exportPages';
import { useBgRemoved } from '../lib/removeBg';
import { cached, translateAll } from '../lib/translate';
import { buildCvDocx } from '../lib/cvDocx';
import { saveFile } from '../lib/saveFile';

// Menu CV bersama (Creative & ATS): isian bahasa Indonesia, hasil bisa otomatis diterjemahkan ke Inggris.
// 20 template per menu (CvTemplates). Banyak halaman: tiap kolom dipecah sendiri oleh usePagination.

const USER_KEYS = ['foto', 'nama', 'jabatan', 'email', 'telepon', 'web', 'alamat'] as const;
const KERTAS = ['A4', 'Letter', 'F4'];

// ============================================================
// SECTION: Editor kecil
// ============================================================
const Tx = ({ label, v, on, rows = 1 }: { label: string; v: string; on: (v: string) => void; rows?: number }) => (
  <Field label={label}><AutoTextarea rows={rows} className={inputCls} value={v} onChange={(e) => on(e.target.value)} /></Field>
);

function Lines({ label, items, on }: { label: string; items: string[]; on: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 items-start">
          <span className="pt-2 text-sm text-gray-600 w-5 text-right">{i + 1}.</span>
          <AutoTextarea aria-label={`${label} ${i + 1}`} className={inputCls} value={it} onChange={(e) => on(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" onClick={() => on(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`} className="px-3 min-h-[40px] rounded-lg text-red-700 border border-red-200">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => on([...items, ''])} className="text-sm font-medium text-blue-700 min-h-[40px]">+ Tambah {label}</button>
    </div>
  );
}

function Cards<T extends { id: string }>({ items, onChange, make, label, render }: {
  items: T[]; onChange: (v: T[]) => void; make: () => T; label: string; render: (it: T, set: (p: Partial<T>) => void) => ReactNode;
}) {
  const move = (i: number, d: number) => {
    const a = [...items];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    onChange(a);
  };
  const btn = 'px-2 min-w-[40px] min-h-[40px] rounded-lg border border-gray-300 disabled:opacity-40';
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-gray-700">{label} {i + 1}</span>
            <div className="flex gap-1">
              <button type="button" aria-label={`Naikkan ${label.toLowerCase()} ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)} className={btn}>↑</button>
              <button type="button" aria-label={`Turunkan ${label.toLowerCase()} ${i + 1}`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className={btn}>↓</button>
              <button type="button" aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className={`${btn} text-red-700 border-red-200`}>✕</button>
            </div>
          </div>
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, make()])} className="text-sm font-medium text-blue-700 min-h-[40px]">+ Tambah {label}</button>
    </div>
  );
}

// ============================================================
// SECTION: Halaman
// ============================================================
export default function CvMenu({ mode }: { mode: 'creative' | 'ats' }) {
  const isAts = mode === 'ats';
  const TPL = isAts ? TEMPLATES_ATS : TEMPLATES_CREATIVE;
  const STORAGE_KEY = isAts ? 'cv-ats:v1' : 'cv-creative:v1';
  const judul = isAts ? 'Custom Curriculum Vitae - ATS Friendly' : 'Custom Curriculum Vitae - Creative';
  const BASE: Cv = useMemo(() => ({ ...CV_DEFAULT, gaya: TPL[0].id }), [TPL]);

  const [toast, setToast] = useState<ToastState>(null);
  const notify = useCallback<Notify>((type, message) => setToast({ type, message }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const [f, setF] = useState<Cv>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved ? { ...BASE, ...saved } : BASE;
    } catch {
      return BASE;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      notify('error', 'Foto terlalu besar untuk disimpan otomatis; tetap bisa diekspor.');
    }
  }, [f, notify, STORAGE_KEY]);
  const set = <K extends keyof Cv>(key: K, v: Cv[K]) => setF((p) => ({ ...p, [key]: v }));
  const reset = () => {
    if (!confirm('Kembalikan semua isian ke contoh bawaan?')) return;
    setF(BASE);
    notify('info', 'Semua isian dikembalikan ke contoh bawaan.');
  };

  // ---------- Foto ----------
  const [bg, setBg] = useState(true);
  const foto = useBgRemoved(f.foto, bg, (m) => notify('error', m));

  // ---------- Terjemahan otomatis ----------
  const en = f.bahasa === 'en';
  const [ver, setVer] = useState(0);
  const [retry, setRetry] = useState(0);
  const [tst, setTst] = useState<{ s: 'ok' | 'busy' | 'error'; msg: string }>({ s: 'ok', msg: '' });
  const texts = useMemo(() => collectTexts(f), [f]);
  useEffect(() => {
    if (!en) return;
    if (!texts.some((t) => cached(t) === undefined)) return setTst({ s: 'ok', msg: '' });
    setTst({ s: 'busy', msg: '' });
    let live = true;
    const h = setTimeout(() => {
      translateAll(texts).then(() => live && (setTst({ s: 'ok', msg: '' }), setVer((v) => v + 1)))
        .catch((e) => live && setTst({ s: 'error', msg: e?.message || 'layanan tidak merespons' }));
    }, 700);
    return () => { live = false; clearTimeout(h); };
  }, [en, texts, retry]);
  const tr = (s: string) => (en ? cached(s) ?? s : s);

  // ---------- Halaman & pagination ----------
  const T = TPL.find((t) => t.id === f.gaya) ?? TPL[0];
  const pg = letterPage(KERTAS.includes(f.paper) ? f.paper : 'A4', false);
  const k = f.skala / 100;
  const env: Env = { cv: f, T, p: PALET[T.pal], k, foto: foto.src, en, tr, L: LBL[f.bahasa], W: pg.W, H: pg.H };
  const flows = buildFlows(env);
  const rootRef = useRef<HTMLDivElement>(null);
  const key = useMemo(() => ({}), [f, T.id, ver, foto.src, pg.W, pg.H]); // eslint-disable-line react-hooks/exhaustive-deps
  const mainR = usePagination(flows.main.length, flows.main.map((u) => u.g), key, () => rootRef.current, '[data-flow="main"]');
  const sideR = usePagination(flows.side.length, flows.side.map((u) => u.g), key, () => rootRef.current, '[data-flow="side"]');
  const n = Math.max(mainR.length, sideR.length, 1);

  // ---------- Ekspor ----------
  const fileName = `cv-${isAts ? 'ats-' : ''}${(f.nama || 'saya').split(',')[0].replace(/[^\w-]+/g, '-').toLowerCase()}${en ? '-en' : ''}`;
  const getPages = () => [...rootRef.current!.querySelectorAll<HTMLElement>('[data-page]')];
  const { exporting, run } = usePagesExport(getPages, fileName, notify, pg.paper);
  const [printing, setPrinting] = useState(false);
  const cetakTeks = async () => {
    setPrinting(true);
    try {
      await printText(getPages(), fileName, pg.paper);
      notify('success', 'Jendela cetak dibuka. Pilih "Simpan sebagai PDF": hasilnya berisi teks asli yang bisa dibaca sistem ATS.');
    } catch (err: any) {
      notify('error', `Gagal membuka cetak: ${err?.message || 'proses gagal.'}`);
    } finally {
      setPrinting(false);
    }
  };
  const [docxBusy, setDocxBusy] = useState(false);
  const unduhDocx = async () => {
    setDocxBusy(true);
    try {
      saveFile(await buildCvDocx(f, tr, LBL[f.bahasa], en, f.paper !== 'Letter'), `${fileName}.docx`);
      notify('success', `${fileName}.docx berhasil diunduh. Buka di Word untuk mengoreksi terjemahan.`);
    } catch (err: any) {
      notify('error', `Gagal membuat DOCX: ${err?.message || 'proses gagal.'}`);
    } finally {
      setDocxBusy(false);
    }
  };
  const busy = foto.busy || (en && tst.s === 'busy');

  const [canvas, setCanvas] = useCanvasMode();
  const tampilan = (
    <>
      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />
      <Field label="Template (20 tata letak)">
        <select className={inputCls} value={T.id} onChange={(e) => set('gaya', e.target.value)}>
          {TPL.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
        </select>
      </Field>
      <Field label="Ukuran kertas (margin tepi 1,5 cm)">
        <select className={inputCls} value={pg.paper.w === PAPERS.A4.w ? 'A4' : f.paper} onChange={(e) => set('paper', e.target.value)}>
          {KERTAS.map((id) => <option key={id} value={id}>{PAPERS[id].label}</option>)}
        </select>
      </Field>
    </>
  );
  const unduh = (
    <>
      <ExportButton kind="PDF" color="bg-red-700" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="PNG" color="bg-blue-700" exporting={exporting} disabled={busy} onRun={run} />
      <ExportButton kind="Print" color="bg-slate-700" exporting={exporting} disabled={busy} onRun={run} />
      <button type="button" onClick={cetakTeks} disabled={busy || printing || !!exporting} className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-semibold disabled:opacity-60">
        {printing ? 'Menyiapkan…' : 'PDF Teks Asli (ATS)'}
      </button>
      <button type="button" onClick={unduhDocx} disabled={busy || docxBusy || !!exporting} className="px-5 py-2 rounded-lg bg-indigo-700 text-white font-semibold disabled:opacity-60">
        {docxBusy ? 'Menyiapkan…' : 'Unduh DOCX (bisa diedit)'}
      </button>
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-white border font-semibold">Reset Semua</button>
    </>
  );

  const seg = (on: boolean) => `flex-1 px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${on ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;
  const toggle = (b: Bagian) => set('sembunyi', f.sembunyi.includes(b) ? f.sembunyi.filter((x) => x !== b) : [...f.sembunyi, b]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/" className="btn-home mb-3">&larr; HK-HUB Menu Utama</Link>
        <h1 className="text-2xl font-bold text-center mb-4">{judul}</h1>
        <ModeTabs canvas={canvas} onChange={setCanvas} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow p-5 space-y-6 min-w-0">
            {canvas ? (
              <CanvasPanel tampilan={tampilan} unduh={unduh}
                galeri={<SharedGallery showEmpty keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} onPicked={(m) => notify('success', m)} />} />
            ) : (<>
              <div className="rounded-xl border p-3 space-y-2" role="group" aria-label="Bahasa hasil CV">
                <p className="text-sm font-bold text-gray-700">Bahasa hasil CV</p>
                <div className="flex gap-2" role="radiogroup" aria-label="Bahasa hasil CV">
                  <button type="button" role="radio" aria-checked={!en} onClick={() => set('bahasa', 'id')} className={seg(!en)}>Indonesia</button>
                  <button type="button" role="radio" aria-checked={en} onClick={() => set('bahasa', 'en')} className={seg(en)}>English (Auto-Translate)</button>
                </div>
                <p className="text-xs text-gray-700">Isi form selalu dalam Bahasa Indonesia. Pilih English agar hasil CV diterjemahkan otomatis. Nama, perusahaan, institusi, email, situs & alamat tidak diterjemahkan; periksa hasilnya sebelum dikirim.</p>
                {en && tst.s === 'busy' && <p role="status" className="text-sm text-blue-800">Menerjemahkan…</p>}
                {en && tst.s === 'error' && (
                  <p role="alert" className="text-sm text-red-700">Terjemahan gagal: {tst.msg}. <button type="button" className="underline font-medium" onClick={() => setRetry((r) => r + 1)}>Coba lagi</button></p>
                )}
              </div>

              <UserData storageKey={`data-user:cv-${mode}`} keys={USER_KEYS} data={f} onApply={(u) => setF((p) => ({ ...p, ...u }))} />

              <FormSection title="Identitas & Kontak">
                {!isAts && <ImageUpload label="Foto" value={f.foto} onChange={(v) => set('foto', v)} notify={notify} bg={bg} onBg={setBg} shown={foto.src} bgBusy={foto.busy} />}
                <Tx label="Nama lengkap & gelar" v={f.nama} on={(v) => set('nama', v)} />
                <Tx label="Jabatan / bidang" v={f.jabatan} on={(v) => set('jabatan', v)} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Tx label="Email" v={f.email} on={(v) => set('email', v)} />
                  <Tx label="Telepon" v={f.telepon} on={(v) => set('telepon', v)} />
                  <Tx label="Situs / LinkedIn" v={f.web} on={(v) => set('web', v)} />
                  <Tx label="Alamat / kota" v={f.alamat} on={(v) => set('alamat', v)} />
                </div>
              </FormSection>

              <FormSection title="Ringkasan" lockable>
                <Tx label="Ringkasan profil" rows={5} v={f.ringkasan} on={(v) => set('ringkasan', v)} />
                <p className="text-sm font-bold text-gray-700">Poin bullet ringkasan (opsional)</p>
                <Lines label="Poin Ringkasan" items={f.ringkasanPoin ?? []} on={(v) => set('ringkasanPoin', v)} />
              </FormSection>

              <FormSection title="Pengalaman Kerja">
                <Cards items={f.pengalaman} onChange={(v) => set('pengalaman', v)} label="Pengalaman Kerja" make={() => ({ id: newId(), posisi: '', perusahaan: '', bidang: '', periode: '', poin: [''] })}
                  render={(j, up) => (<>
                    <Tx label="Posisi" v={j.posisi} on={(v) => up({ posisi: v })} />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Tx label="Perusahaan" v={j.perusahaan} on={(v) => up({ perusahaan: v })} />
                      <Tx label="Bidang usaha" v={j.bidang} on={(v) => up({ bidang: v })} />
                    </div>
                    <Tx label="Periode (mis. Juni 2025 - Sekarang)" v={j.periode} on={(v) => up({ periode: v })} />
                    <p className="text-sm font-bold text-gray-700">Deskripsi pekerjaan</p>
                    <Lines label="Deskripsi Pekerjaan" items={j.poin} on={(v) => up({ poin: v })} />
                  </>)} />
              </FormSection>

              <FormSection title="Pendidikan">
                <Cards items={f.pendidikan} onChange={(v) => set('pendidikan', v)} label="Pendidikan" make={() => ({ id: newId(), jurusan: '', institusi: '', ket: '', poin: [] as string[] })}
                  render={(x, up) => (<>
                    <Tx label="Jurusan & IPK" v={x.jurusan} on={(v) => up({ jurusan: v })} />
                    <Tx label="Institusi" v={x.institusi} on={(v) => up({ institusi: v })} />
                    <Tx label="Keterangan (kota, kelas)" v={x.ket} on={(v) => up({ ket: v })} />
                    <p className="text-sm font-bold text-gray-700">Poin bullet (opsional)</p>
                    <Lines label="Poin Pendidikan" items={x.poin ?? []} on={(v) => up({ poin: v })} />
                  </>)} />
              </FormSection>

              <FormSection title="Keahlian, Alat & Hobi">
                <p className="text-sm font-bold text-gray-700">Keahlian</p>
                <Lines label="Keahlian" items={f.keahlian} on={(v) => set('keahlian', v)} />
                <p className="text-sm font-bold text-gray-700">Alat & aplikasi</p>
                <Lines label="Alat" items={f.alat} on={(v) => set('alat', v)} />
                <p className="text-sm font-bold text-gray-700">Hobi</p>
                <Lines label="Hobi" items={f.hobi} on={(v) => set('hobi', v)} />
              </FormSection>

              <FormSection title="Pelatihan & Sertifikasi">
                <Cards items={f.pelatihan} onChange={(v) => set('pelatihan', v)} label="Pelatihan" make={() => ({ id: newId(), judul: '', rincian: [] })}
                  render={(x, up) => (<>
                    <Tx label="Nama pelatihan / sertifikasi" v={x.judul} on={(v) => up({ judul: v })} />
                    <p className="text-sm font-bold text-gray-700">Rincian (opsional)</p>
                    <Lines label="Rincian" items={x.rincian} on={(v) => up({ rincian: v })} />
                  </>)} />
              </FormSection>

              <FormSection title="Referensi">
                <Cards items={f.referensi} onChange={(v) => set('referensi', v)} label="Referensi" make={() => ({ id: newId(), nama: '', jabatan: '', perusahaan: '', ket: '', poin: [] as string[] })}
                  render={(x, up) => (<>
                    <Tx label="Nama" v={x.nama} on={(v) => up({ nama: v })} />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Tx label="Jabatan" v={x.jabatan} on={(v) => up({ jabatan: v })} />
                      <Tx label="Perusahaan" v={x.perusahaan} on={(v) => up({ perusahaan: v })} />
                    </div>
                    <Tx label="Keterangan (mis. nomor surat referensi)" v={x.ket} on={(v) => up({ ket: v })} />
                    <p className="text-sm font-bold text-gray-700">Poin bullet (opsional)</p>
                    <Lines label="Poin Referensi" items={x.poin ?? []} on={(v) => up({ poin: v })} />
                  </>)} />
              </FormSection>

              <FormSection title="Pengalaman Organisasi">
                <Cards items={f.organisasi} onChange={(v) => set('organisasi', v)} label="Organisasi" make={() => ({ id: newId(), peran: '', organisasi: '', ket: '', poin: [''] })}
                  render={(x, up) => (<>
                    <Tx label="Peran / jabatan" v={x.peran} on={(v) => up({ peran: v })} />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Tx label="Organisasi" v={x.organisasi} on={(v) => up({ organisasi: v })} />
                      <Tx label="Keterangan" v={x.ket} on={(v) => up({ ket: v })} />
                    </div>
                    <Lines label="Uraian" items={x.poin} on={(v) => up({ poin: v })} />
                  </>)} />
              </FormSection>

              <FormSection title="Tampilkan Bagian">
                <div className="grid sm:grid-cols-2 gap-2">
                  {BAGIAN.map((b) => (
                    <label key={b} className="flex items-center gap-2 min-h-[44px] text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={!f.sembunyi.includes(b)} onChange={() => toggle(b)} /> {LBL.id[b]}
                    </label>
                  ))}
                </div>
              </FormSection>

              <FormSection title="Tampilan">{tampilan}</FormSection>
              <div className="flex flex-wrap gap-3">{unduh}</div>
              {isAts && <p className="text-xs text-gray-700">PDF/PNG biasa berupa gambar. Untuk dikirim ke sistem ATS, pakai tombol “PDF Teks Asli (ATS)” lalu pilih “Simpan sebagai PDF”, supaya teksnya terbaca mesin.</p>}
            </>)}
          </div>

          <FitPreview>
            <div ref={rootRef} className="w-max flex flex-col gap-6">
              {Array.from({ length: n }, (_, i) => {
                const [a, b] = mainR[i] ?? [flows.main.length, flows.main.length];
                const [c, d] = sideR[i] ?? [flows.side.length, flows.side.length];
                return <div key={i} className="shadow-lg"><PageView e={env} idx={i} top={flows.top} main={flows.main.slice(a, b).map((u) => u.el)} side={flows.side.slice(c, d).map((u) => u.el)} /></div>;
              })}
            </div>
          </FitPreview>
        </div>
      </div>
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
