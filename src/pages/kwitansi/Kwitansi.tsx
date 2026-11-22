import { useEffect, useRef, useState } from 'react';
import { RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import AutoTextarea from '../../shared/components/AutoTextarea';
import FitPreview from '../../shared/components/FitPreview';
import NumberFormatInput from '../../shared/components/NumberFormatInput';
import PositionPad from '../../shared/components/PositionPad';
import { CanvasPanel, useCanvasMode } from '../../shared/components/CanvasMode';
import SharedGallery from '../../shared/components/SharedGallery';
import UserData from '../../shared/components/UserData';
import DocOptions, { Switch } from '../../shared/components/DocOptions';
import { Toast, type ToastState } from '../../shared/components/Feedback';
import { TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import {
  ExportButton,
  Field,
  PaperPicker,
  inputCls,
  letterPage,
  useLetterExport,
} from '../../shared/components/LetterKit';
import FormSection from '../../shared/components/FormSection';
import KontakFields from '../../shared/components/KontakFields';
import TemplateRibbon from '../../shared/components/TemplateRibbon';
import { randomDocNo } from '../../shared/lib/docNumber';
import { num, terbilangRupiah } from '../../shared/lib/money';
import {
  DEFAULT_KWITANSI,
  METODE_BAYAR,
  STORAGE_KEY,
  USER_KEYS,
  type KwitansiData,
} from './types';
import { TEMPLATES } from './templates';

export default function Kwitansi() {
  const [f, setF] = useState<KwitansiData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_KWITANSI, ...JSON.parse(raw) };
    } catch {
      // fallback jika json corrupt
    }
    return DEFAULT_KWITANSI;
  });

  const [toast, setToast] = useState<ToastState>(null);
  const notify = (type: 'success' | 'error' | 'info' | 'loading', msg: string) => {
    setToast({ type, msg });
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      // ignore
    }
  }, [f]);

  const set = <K extends keyof KwitansiData>(key: K, val: KwitansiData[K]) => {
    setF((prev) => ({ ...prev, [key]: val }));
  };

  const [canvas, setCanvas] = useCanvasMode();
  const [geser, setGeser] = useState('logo');

  // Perhitungan dimensi kertas dan skala responsif
  const pg = letterPage(f.paper, f.landscape);
  const letterRef = useRef<HTMLDivElement>(null);
  const k = useFitScale(
    f.skala / 100,
    () => letterRef.current?.firstElementChild as HTMLElement,
    true,
    [f],
  );

  const fileName = `kwitansi-${(f.nomor || 'resmi').replace(/[^\w-]+/g, '-').toLowerCase()}`;
  const { exporting, run } = useLetterExport(
    () => letterRef.current!.firstElementChild as HTMLElement,
    fileName,
    notify,
    pg.paper,
  );

  // Template terpilih
  const currentTemplate = TEMPLATES.find((t) => t.id === f.gaya) || TEMPLATES[0];

  const randomizeNomor = () => {
    const no = randomDocNo('KWT/{yyyy}/{rom}/{n3}');
    set('nomor', no);
    notify('info', `Nomor kwitansi diacak: ${no}`);
  };

  // Live terbilang preview
  const liveTerbilang = f.terbilangCustom && f.terbilangManual.trim()
    ? f.terbilangManual
    : terbilangRupiah(num(f.jumlah));

  // Tampilan tab Edit Tampilan
  const tampilan = (
    <div className="space-y-4">
      <DocOptions
        nomor={{ value: f.pakaiNomor, onChange: (v) => set('pakaiNomor', v) }}
        kosong={{ value: f.kosong, onChange: (v) => set('kosong', v) }}
      />

      <div className="pt-1">
        <TemplateRibbon label="GANTI TEMPLATE" />
        <Field label="Desain & Tata Letak (20 Pilihan Unik)">
          <select
            className={inputCls}
            value={f.gaya}
            onChange={(e) => set('gaya', e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.desc}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/40">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set('gaya', t.id)}
              className={`p-2 rounded text-left text-xs transition border flex flex-col justify-between ${
                f.gaya === t.id
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 font-bold text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="truncate">{t.name}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal line-clamp-1 mt-0.5">
                {t.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <PaperPicker
        paper={f.paper}
        landscape={f.landscape}
        onPaper={(v) => set('paper', v)}
        onLandscape={(v) => set('landscape', v)}
      />

      <TextSizeSlider value={f.skala} effective={k} onChange={(v) => set('skala', v)} />

      <PositionPad
        targets={[
          { id: 'logo', label: 'Logo Lembaga' },
          { id: 'ttd', label: 'Tanda Tangan Kasir' },
          { id: 'stempel', label: 'Stempel Cap' },
        ]}
        active={geser}
        onActive={setGeser}
        value={f.posisi}
        onChange={(v) => set('posisi', v)}
      />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Halaman */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Invoice & Faktur</span>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100 font-semibold">Kwitansi Pembayaran Resmi</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Kwitansi Pembayaran Resmi
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Buat tanda terima pembayaran uang resmi, nominal terbilang otomatis, bonggol kasir, dan meterai tempel dengan 20 pilihan desain tata letak.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Formulir / Panel Kontrol */}
        <div className="lg:col-span-5 space-y-4">
          <UserData
            storageKey="data-user:kwitansi"
            keys={USER_KEYS}
            data={f}
            onApply={(picked) => setF((prev) => ({ ...prev, ...picked }))}
          />

          {canvas ? (
            <CanvasPanel
              unduh={
                <>
                  <ExportButton
                    kind="PDF"
                    color="bg-red-600 hover:bg-red-700"
                    exporting={exporting}
                    onRun={run}
                  />
                  <ExportButton
                    kind="PNG"
                    color="bg-emerald-600 hover:bg-emerald-700"
                    exporting={exporting}
                    onRun={run}
                  />
                  <ExportButton
                    kind="Print"
                    color="bg-blue-600 hover:bg-blue-700"
                    exporting={exporting}
                    onRun={run}
                  />
                </>
              }
              tampilan={tampilan}
              galeri={
                <SharedGallery
                  keys={['logo', 'ttd', 'stempel']}
                  data={{ logo: f.logo, ttd: f.ttd, stempel: f.stempel }}
                  onApply={(picked) => setF((prev) => ({ ...prev, ...picked }))}
                  onPicked={(msg) => notify('success', msg)}
                />
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Form Section: Data Kwitansi & Transaksi */}
              <FormSection title="Data Kwitansi & Transaksi">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <Field label="Nomor Kwitansi">
                      <input
                        type="text"
                        className={inputCls}
                        value={f.nomor}
                        onChange={(e) => set('nomor', e.target.value)}
                        placeholder="KWT/2026/XI/001"
                      />
                    </Field>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={randomizeNomor}
                      className="w-full min-h-[42px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center justify-center gap-1.5 transition"
                    >
                      <RefreshCw size={14} /> Acak No
                    </button>
                  </div>
                </div>

                <Field label="Telah Diterima Dari (Penyetor / Pembayar)">
                  <input
                    type="text"
                    className={inputCls}
                    value={f.terimaDari}
                    onChange={(e) => set('terimaDari', e.target.value)}
                    placeholder="Nama Orang Pribadi atau Nama Perusahaan"
                  />
                </Field>

                <Field label="Uang Sejumlah (Nominal Angka Rupiah)">
                  <NumberFormatInput
                    className={inputCls}
                    value={f.jumlah}
                    onChange={(v) => set('jumlah', v)}
                    placeholder="15000000"
                  />
                </Field>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Terbilang Otomatis:
                    </span>
                    <button
                      type="button"
                      onClick={() => set('terbilangCustom', !f.terbilangCustom)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {f.terbilangCustom ? 'Gunakan Otomatis' : 'Ketik Manual'}
                    </button>
                  </div>

                  {f.terbilangCustom ? (
                    <input
                      type="text"
                      className={inputCls}
                      value={f.terbilangManual}
                      onChange={(e) => set('terbilangManual', e.target.value)}
                      placeholder="Ketik teks terbilang kustom..."
                    />
                  ) : (
                    <div className="text-xs font-serif italic text-gray-800 dark:text-gray-200 leading-relaxed bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      {liveTerbilang}
                    </div>
                  )}
                </div>

                <Field label="Untuk Keperluan Pembayaran">
                  <AutoTextarea
                    className={inputCls}
                    value={f.untuk}
                    onChange={(e) => set('untuk', e.target.value)}
                    placeholder="Rincian peruntukan pembayaran atau keperluan transaksi..."
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Kota Penandatanganan">
                    <input
                      type="text"
                      className={inputCls}
                      value={f.kota}
                      onChange={(e) => set('kota', e.target.value)}
                      placeholder="Jakarta"
                    />
                  </Field>
                  <Field label="Tanggal Transaksi">
                    <input
                      type="date"
                      className={inputCls}
                      value={f.tanggal}
                      onChange={(e) => set('tanggal', e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* Form Section: Metode & Status Bayar */}
              <FormSection title="Metode Pembayaran & Rekening">
                <Field label="Metode Pembayaran">
                  <select
                    className={inputCls}
                    value={f.metode}
                    onChange={(e) => set('metode', e.target.value)}
                  >
                    {METODE_BAYAR.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Info Bank / Nomor Rekening / Referensi">
                  <input
                    type="text"
                    className={inputCls}
                    value={f.bankInfo}
                    onChange={(e) => set('bankInfo', e.target.value)}
                    placeholder="BCA No. Rek 873-501-9283 a.n PT NUSANTARA JAYA"
                  />
                </Field>

                <Switch
                  checked={f.statusLunas}
                  onChange={(v) => set('statusLunas', v)}
                  label="Tampilkan Cap Status LUNAS"
                  hint="Membubuhkan cap stempel status lunas pada kwitansi."
                />
              </FormSection>

              {/* Form Section: Penerima & Legalitas */}
              <FormSection title="Penerima & Legalitas Kwitansi">
                <Field label="Nama Penerima (Kasir / Bendahara)">
                  <input
                    type="text"
                    className={inputCls}
                    value={f.namaPenerima}
                    onChange={(e) => set('namaPenerima', e.target.value)}
                    placeholder="Budi Santoso, S.E."
                  />
                </Field>

                <Field label="Jabatan / Peran Penerima">
                  <input
                    type="text"
                    className={inputCls}
                    value={f.jabatanPenerima}
                    onChange={(e) => set('jabatanPenerima', e.target.value)}
                    placeholder="Bendahara / Bagian Keuangan"
                  />
                </Field>

                <Switch
                  checked={f.pakaiMeterai}
                  onChange={(v) => set('pakaiMeterai', v)}
                  label="Sediakan Ruang Meterai Tempel Rp 10.000"
                  hint="Untuk kwitansi resmi bernilai Rp 5.000.000 ke atas sesuai UU Bea Meterai."
                />

                <Switch
                  checked={f.pakaiBonggol}
                  onChange={(v) => set('pakaiBonggol', v)}
                  label="Tampilkan Bonggol Arsip Kasir"
                  hint="Menampilkan potongan samping kiri untuk arsip pembukuan kasir (tersedia pada template klasik & retro)."
                />
              </FormSection>

              {/* Form Section: Pihak Penyetor (Opsional) */}
              <FormSection title="Pihak Penyetor (Opsional)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nama Penyetor">
                    <input
                      type="text"
                      className={inputCls}
                      value={f.namaPenyetor}
                      onChange={(e) => set('namaPenyetor', e.target.value)}
                      placeholder="Nama orang yang menyerahkan uang"
                    />
                  </Field>
                  <Field label="Jabatan Penyetor">
                    <input
                      type="text"
                      className={inputCls}
                      value={f.jabatanPenyetor}
                      onChange={(e) => set('jabatanPenyetor', e.target.value)}
                      placeholder="Staf Pengadaan / Pelanggan"
                    />
                  </Field>
                </div>
              </FormSection>

              {/* Form Section: Kop Lembaga / Instansi */}
              <FormSection title="Kop Lembaga / Perusahaan">
                <Switch
                  checked={f.pakaiKop}
                  onChange={(v) => set('pakaiKop', v)}
                  label="Tampilkan Kop Perusahaan / Lembaga"
                  hint="Matikan jika ingin kwitansi perorangan tanpa identitas instansi."
                />

                {f.pakaiKop && (
                  <>
                    <Field label="Nama Perusahaan / Lembaga">
                      <AutoTextarea
                        className={inputCls}
                        value={f.instansi}
                        onChange={(e) => set('instansi', e.target.value)}
                        placeholder="PT NUSANTARA JAYA ABADI"
                      />
                    </Field>

                    <Field label="Sub-Kop / Bidang Usaha">
                      <AutoTextarea
                        className={inputCls}
                        value={f.subKop}
                        onChange={(e) => set('subKop', e.target.value)}
                        placeholder="Solusi Pengadaan & Perdagangan Umum"
                      />
                    </Field>

                    <Field label="Alamat Lengkap">
                      <AutoTextarea
                        className={inputCls}
                        value={f.alamat}
                        onChange={(e) => set('alamat', e.target.value)}
                        placeholder="Jl. Jenderal Sudirman Kav. 45-46, Jakarta Selatan"
                      />
                    </Field>

                    <KontakFields
                      value={f.kontak}
                      onChange={(v) => set('kontak', v)}
                    />
                  </>
                )}
              </FormSection>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Pratinjau Dokumen (Sticky) */}
        <div className="lg:col-span-7 sticky top-4">
          <FitPreview
            canvas={canvas}
            onCanvasChange={setCanvas}
            showModeToggle={true}
          >
            <div
              ref={letterRef}
              className="bg-white shadow-2xl transition-all duration-150 mx-auto"
              style={{
                width: `${pg.W}px`,
                minHeight: `${pg.H}px`,
                fontSize: `${(f.skala / 100) * 14 * pg.f * k}px`,
              }}
            >
              {currentTemplate.render({ d: f, scaleFactor: pg.f * k })}
            </div>
          </FitPreview>
        </div>
      </div>
    </div>
  );
}
