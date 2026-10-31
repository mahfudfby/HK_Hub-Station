import AutoTextarea from '../../shared/components/AutoTextarea';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QrisCard from '../../shared/components/QrisCard';
import { uploadImage } from '../../shared/lib/cloudinary';
import { canvasToBlob, saveFile } from '../../shared/lib/saveFile';
import { printImage } from '../../shared/lib/printImage';
import FitPreview, { unfitPreview } from '../../shared/components/FitPreview';
import { isStaleChunkError, reloadForNewVersion } from '../../shared/lib/staleChunk';
import PositionPad, { getOffset } from '../../shared/components/PositionPad';
import BgToggle from '../../shared/components/BgToggle';
import { ScaleBox, TextSizeSlider, useFitScale } from '../../shared/components/TextScale';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { cssFamily, fontsReady, useGoogleFonts } from '../../shared/lib/fonts';
import './SlipGaji.css';

// ============================================================
// SECTION: Constants (BPJS, PTKP, ukuran gambar)
// ============================================================
const MAX_SALARY_JP = 12000000; // Batas Atas Gaji Jaminan Pensiun (JP)
const MAX_SALARY_KES = 12000000; // Batas Atas Gaji BPJS Kesehatan

const JHT_RATE_WORKER = 0.02; // JHT Karyawan (2.0%)
const JP_RATE_WORKER = 0.01; // JP Karyawan (1.0%)
const BPJS_KES_RATE_WORKER = 0.01; // BPJS Kesehatan Karyawan (1.0%)

// Data PTKP Tahunan (Penghasilan Tidak Kena Pajak)
const PTKP_DATA = {
  'TK/0': 54000000,
  'K/0': 58500000,
  'K/1': 63000000,
  'K/2': 67500000,
  'K/3': 72000000,
  'KI/0': 112500000,
};

const STATUS_OPTIONS = [
  { value: 'TK/0', label: 'TK/0 (Tidak Kawin, 0 Tanggungan)' },
  { value: 'K/0', label: 'K/0 (Kawin, 0 Tanggungan)' },
  { value: 'K/1', label: 'K/1 (Kawin, 1 Tanggungan)' },
  { value: 'K/2', label: 'K/2 (Kawin, 2 Tanggungan)' },
  { value: 'K/3', label: 'K/3 (Kawin, 3 Tanggungan)' },
  { value: 'KI/0', label: 'KI/0 (Kawin Istri Digabung, 0 Tanggungan)' },
];

const LOGO_MAX_WIDTH = 300;
const LOGO_MAX_HEIGHT = 60;
const SIGNATURE_MAX_WIDTH = 120;
const SIGNATURE_MAX_HEIGHT = 70;

const SLIP_WIDTH = 912; // kertas dot-matrix continuous form 9,5" @96DPI (241 mm)
const SLIP_HEIGHT = 528; // 5,5" @96DPI (140 mm, setengah lembar 9,5×11")

// ============================================================
// SECTION: Template slip (tata letak + font). font kosong = Arimo via .doc-font (tampilan asli).
// header: right|left|center|band|box · title: lines|bar|big|pill · info: cols|table|pills
// body: tables|ruled|zebra|cards · total: classic|bar|box|big · dash: garis putus-putus tanpa blok warna (dot-matrix)
// ============================================================
const gf = (family, weights, fallback = 'sans-serif') => ({ font: cssFamily(family, fallback), gf: { family, weights } });
const SLIP_TEMPLATES = [
  { id: 'klasik', name: 'Klasik', desc: 'Arimo, tabel bergaris', header: 'right', title: 'lines', info: 'cols', body: 'tables', total: 'classic' },
  { id: 'dot-matrix', name: 'Dot Matrix', desc: 'Cousine, garis putus', font: cssFamily('Cousine', 'monospace'), dash: true, header: 'right', title: 'lines', info: 'cols', body: 'ruled', total: 'classic' },
  { id: 'mesin-ketik', name: 'Mesin Ketik', desc: 'Courier Prime, hitam putih', ...gf('Courier Prime', [400, 700], 'monospace'), dash: true, header: 'left', title: 'big', info: 'table', body: 'ruled', total: 'box' },
  { id: 'kontinu', name: 'Form Kontinu', desc: 'IBM Plex Mono, tabel', ...gf('IBM Plex Mono', [400, 700], 'monospace'), dash: true, header: 'center', title: 'lines', info: 'cols', body: 'tables', total: 'box' },
  { id: 'space-mono', name: 'Space Mono', desc: 'Mono, label bingkai', ...gf('Space Mono', [400, 700], 'monospace'), dash: true, header: 'box', title: 'pill', info: 'pills', body: 'ruled', total: 'classic' },
  { id: 'tegas', name: 'Tegas', desc: 'Carlito, bar hitam', font: cssFamily('Carlito'), header: 'right', title: 'bar', info: 'table', body: 'tables', total: 'bar' },
  { id: 'serif-resmi', name: 'Serif Resmi', desc: 'Tinos, tengah', font: cssFamily('Tinos', 'serif'), header: 'center', title: 'lines', info: 'cols', body: 'ruled', total: 'box' },
  { id: 'korporat-biru', name: 'Korporat Biru', desc: 'Roboto Condensed, pita', ...gf('Roboto Condensed', [400, 700]), accent: '#1d4ed8', soft: '#eff6ff', header: 'band', title: 'bar', info: 'table', body: 'zebra', total: 'bar' },
  { id: 'hijau-segar', name: 'Hijau Segar', desc: 'IBM Plex Sans, kartu', ...gf('IBM Plex Sans', [400, 600, 700]), accent: '#047857', soft: '#ecfdf5', header: 'left', title: 'pill', info: 'pills', body: 'cards', total: 'big' },
  { id: 'merah-bata', name: 'Merah Bata', desc: 'Source Sans 3, kotak', ...gf('Source Sans 3', [400, 600, 700]), accent: '#b91c1c', soft: '#fef2f2', header: 'box', title: 'big', info: 'cols', body: 'tables', total: 'box' },
  { id: 'navy', name: 'Navy', desc: 'Lato, daftar bergaris', ...gf('Lato', [400, 700, 900]), accent: '#1e3a8a', soft: '#eef2ff', header: 'right', title: 'pill', info: 'table', body: 'ruled', total: 'bar' },
  { id: 'modern-teal', name: 'Modern Teal', desc: 'Inter, angka besar', ...gf('Inter', [400, 600, 700, 800]), accent: '#0f766e', soft: '#f0fdfa', header: 'left', title: 'big', info: 'pills', body: 'zebra', total: 'big' },
  { id: 'ungu', name: 'Ungu', desc: 'Barlow, pita & kartu', ...gf('Barlow', [400, 600, 700, 800]), accent: '#6d28d9', soft: '#f5f3ff', header: 'band', title: 'lines', info: 'cols', body: 'cards', total: 'box' },
  { id: 'ringkas', name: 'Ringkas', desc: 'Barlow Condensed, B/W', ...gf('Barlow Condensed', [400, 600, 700, 800]), header: 'box', title: 'bar', info: 'table', body: 'zebra', total: 'bar' },
  { id: 'oranye', name: 'Oranye', desc: 'Archivo Narrow, tengah', ...gf('Archivo Narrow', [400, 600, 700]), accent: '#c2410c', soft: '#fff7ed', header: 'center', title: 'bar', info: 'pills', body: 'tables', total: 'big' },
  { id: 'biru-laut', name: 'Biru Laut', desc: 'PT Sans Narrow, kartu', ...gf('PT Sans Narrow', [400, 700]), accent: '#0369a1', soft: '#f0f9ff', header: 'left', title: 'lines', info: 'table', body: 'cards', total: 'bar' },
  { id: 'elegan', name: 'Elegan', desc: 'Merriweather, B/W', ...gf('Merriweather', [400, 700, 900], 'serif'), header: 'center', title: 'big', info: 'cols', body: 'ruled', total: 'box' },
  { id: 'cokelat', name: 'Cokelat', desc: 'Lora, baris selang', ...gf('Lora', [400, 600, 700], 'serif'), accent: '#92400e', soft: '#fffbeb', header: 'right', title: 'pill', info: 'cols', body: 'zebra', total: 'big' },
  { id: 'kotak-mono', name: 'Kotak Mono', desc: 'Cousine, blok hitam', font: cssFamily('Cousine', 'monospace'), header: 'box', title: 'bar', info: 'table', body: 'cards', total: 'bar' },
  { id: 'minimalis', name: 'Minimalis', desc: 'Arimo, abu slate', font: cssFamily('Arimo'), accent: '#334155', soft: '#f1f5f9', header: 'left', title: 'pill', info: 'pills', body: 'ruled', total: 'big' },
];

const todayLocal = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const buildInitialForm = () => ({
  template: 'klasik',
  skala: 100, // ukuran teks dokumen (%)
  posisi: {}, // geseran tanda tangan (px dokumen)
  companyName: 'PT. Nama Perusahaan Anda',
  addressLine1: 'Jl. Contoh Raya No. 12',
  addressLine2: 'Kec. Sudirman, Jakarta Pusat',
  addressLine3: 'Indonesia - 10220',
  slipID: 'SLIP-001',
  slipMonth: 'NOVEMBER 2025',
  transferDate: todayLocal(),
  name: 'Nama Karyawan',
  position: 'Staf Administrasi',
  bankAccountNumber: '123-456-7890',
  bankName: 'BANK ABC',
  status: 'TK/0',
  managerName: 'Nama Manager',
  managerTitle: 'Direktur / Manager',
  basicSalary: '8000000',
  allowance: '500000',
  overtime: '0',
  transport: '250000',
  mealAllowance: '1000000',
  bonus: '0',
  loanDeduction: '500000',
  otherDeduction: '0',
});

// ============================================================
// SECTION: Helpers — Format & Kalkulasi (BPJS, PPh 21)
// ============================================================
const formatRupiah = (number) => {
  if (isNaN(number) || number === null || number === 0) return 'Rp. 0';
  const formatted = Number(number).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `Rp. ${formatted}`;
};

const formatPlain = (number) => formatRupiah(number).replace('Rp. ', '');

function getPTKP(status) {
  const cleaned = status.toUpperCase().trim();
  return PTKP_DATA[cleaned] || PTKP_DATA['TK/0'];
}

// Tarif progresif PPh 21 Tahunan
function calculateProgressiveTax(pkp) {
  if (pkp <= 0) return 0;
  let pph21 = 0;
  let remaining = pkp;

  const layer1Limit = 60000000;
  if (remaining > 0) {
    const t = Math.min(remaining, layer1Limit);
    pph21 += t * 0.05;
    remaining -= t;
  }
  const layer2Limit = 250000000;
  if (remaining > 0) {
    const t = Math.min(remaining, layer2Limit - layer1Limit);
    pph21 += t * 0.15;
    remaining -= t;
  }
  const layer3Limit = 500000000;
  if (remaining > 0) {
    const t = Math.min(remaining, layer3Limit - layer2Limit);
    pph21 += t * 0.25;
    remaining -= t;
  }
  const layer4Limit = 5000000000;
  if (remaining > 0) {
    const t = Math.min(remaining, layer4Limit - layer3Limit);
    pph21 += t * 0.3;
    remaining -= t;
  }
  if (remaining > 0) pph21 += remaining * 0.35;

  return Math.round(pph21);
}

function calculateBPJSDeductions(salary) {
  if (salary <= 0) return { bpjsKes: 0, jht: 0, jp: 0 };
  const baseJP = Math.min(salary, MAX_SALARY_JP);
  const baseKes = Math.min(salary, MAX_SALARY_KES);
  return {
    bpjsKes: Math.round(BPJS_KES_RATE_WORKER * baseKes),
    jht: Math.round(JHT_RATE_WORKER * salary),
    jp: Math.round(JP_RATE_WORKER * baseJP),
  };
}

function calculatePPH21(grossIncome, deductionJHT, deductionJP, status) {
  const biayaJabatan = Math.min(grossIncome * 0.05, 500000);
  const netMonthly = grossIncome - (biayaJabatan + deductionJHT + deductionJP);
  const netAnnual = Math.max(0, netMonthly * 12);
  let pkpAnnual = netAnnual - getPTKP(status);
  if (pkpAnnual <= 0) return 0;
  pkpAnnual = Math.floor(pkpAnnual / 1000) * 1000;
  return Math.round(calculateProgressiveTax(pkpAnnual) / 12);
}

function computeSlip(form) {
  const num = (v) => Number(v) || 0;
  const basicSalary = num(form.basicSalary);
  const allowance = num(form.allowance);
  const overtime = num(form.overtime);
  const transport = num(form.transport);
  const mealAllowance = num(form.mealAllowance);
  const bonus = num(form.bonus);
  const loanDeduction = num(form.loanDeduction);
  const otherDeduction = num(form.otherDeduction);

  const bpjs = calculateBPJSDeductions(basicSalary);
  const bpjsKesAndJP = bpjs.bpjsKes + bpjs.jp;
  const jht = bpjs.jht;

  const totalEarnings = basicSalary + allowance + overtime + transport + mealAllowance + bonus;
  const pph21 = calculatePPH21(totalEarnings, jht, bpjs.jp, form.status);
  const totalDeductions = loanDeduction + bpjsKesAndJP + jht + pph21 + otherDeduction;

  return {
    basicSalary, allowance, overtime, transport, mealAllowance, bonus,
    loanDeduction, otherDeduction, bpjsKesAndJP, jht, pph21,
    totalEarnings, totalDeductions, takeHomePay: totalEarnings - totalDeductions,
  };
}

function formatTransferDate(value) {
  if (!value) return '...';
  try {
    const [y, m, d] = value.split('-');
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return 'Tanggal tidak valid';
  }
}

// Resize gambar (tanpa upscale) mempertahankan rasio, prioritas tinggi lalu lebar
function resizeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file tidak dapat dibaca.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('format gambar tidak valid atau rusak.'));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
        if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
        w = Math.max(1, w);
        h = Math.max(1, h);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');
        canvas.toBlob((blob) => resolve({ dataUrl, blob }), 'image/png');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// SECTION: Komponen kecil (SEMUA di top-level, tidak bersarang)
// ============================================================
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function Toast({ id, type, message, onClose }) {
  const [leaving, setLeaving] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => closeRef.current(id), 220);
  }, [id]);

  useEffect(() => {
    const t = setTimeout(dismiss, 4500);
    return () => clearTimeout(t);
  }, [dismiss]);

  return (
    <div className={`slip-toast slip-toast-${type}${leaving ? ' leaving' : ''}`} role="alert" aria-live="assertive">
      {type === 'success' ? <IconCheck /> : <IconAlert />}
      <div>
        <strong className="text-sm">{type === 'success' ? 'Berhasil' : 'Gagal'}</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="slip-toast-close" onClick={dismiss} aria-label="Tutup notifikasi">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

function ToastStack({ toasts, onClose }) {
  return (
    <div className="slip-toast-wrap">
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} type={t.type} message={t.message} onClose={onClose} />
      ))}
    </div>
  );
}

function TextField({ id, label, name, value, onChange, placeholder, type = 'text', wrapClass = '' }) {
  return (
    <div className={`input-group ${wrapClass}`}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      {type === 'text' ? (
        <AutoTextarea
          id={id} name={name} value={value} onChange={onChange} placeholder={placeholder || label}
          className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <input
          type={type} id={id} name={name} value={value} onChange={onChange} placeholder={placeholder || label}
          className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );
}

function FileField({ id, label, onChange, wrapClass = '', bg, onBg, bgBusy }) {
  return (
    <div className={`input-group ${wrapClass}`}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="upload-box flex-1 min-w-0">
          <input
            type="file" id={id} accept="image/*" onChange={onChange}
            className="p-2 border border-gray-300 rounded-lg bg-gray-50 w-full"
          />
        </div>
        <BgToggle checked={bg} onChange={onBg} busy={bgBusy} />
      </div>
    </div>
  );
}

function MoneyField({ id, label, name, value, onChange, itemClass }) {
  return (
    <div className={itemClass}>
      <label htmlFor={id} className="w-1/2 text-sm text-gray-700">{label}</label>
      <input
        type="number" id={id} name={name} value={value} onChange={onChange} placeholder="0"
        className="w-1/2 p-2 border border-gray-300 rounded-lg text-right"
      />
    </div>
  );
}

function ReadOnlyMoney({ id, label, value }) {
  return (
    <div className="deduction-item">
      <label htmlFor={id} className="w-1/2 text-gray-700 text-sm">{label}</label>
      <input
        type="text" id={id} value={value} readOnly placeholder="0"
        className="w-1/2 p-2 border border-gray-300 bg-white text-right rounded-lg"
      />
    </div>
  );
}

function SlipLine({ label, value }) {
  return (
    <div className="flex">
      <span className="w-40">{label}</span>
      <span className="w-4">:</span>
      <span className="flex-1 text-right">{value}</span>
    </div>
  );
}
function SignBlock({ heading, image, alt, name, title, offset }) {
  return (
    <div className="text-center" style={{ width: 150 }}>
      <p>{heading}</p>
      <div className="relative h-14 mb-0.5">
        {image && <img src={image} crossOrigin="anonymous" alt={alt} className="slip-signature" style={offset ? { marginLeft: offset.x, marginBottom: -offset.y } : undefined} />}
      </div>
      <div className="pt-1">
        <p className="border-b border-black font-semibold inline-block pb-0.5">{name}</p>
        <p className="text-[9px]">{title}</p>
      </div>
    </div>
  );
}
function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex">
      <span className="w-24 font-semibold">{label}</span>
      <span className="mr-2">:</span>
      <span className={highlight ? 'px-2 rounded' : ''} style={highlight ? { background: '#FEF9C3' } : undefined}>{value}</span>
    </div>
  );
}

// ============================================================
// SECTION: Komponen Form (Perusahaan, Karyawan, Penerimaan, Potongan)
// ============================================================
function CompanyForm({ form, onChange, onLogoChange, logoBg }) {
  return (
    <div className="space-y-4 mb-8">
      <p className="block text-sm font-bold text-gray-700">Detail Perusahaan</p>
      <TextField id="inputCompanyName" label="Nama Perusahaan" name="companyName" value={form.companyName} onChange={onChange} />
      <TextField id="inputAddressLine1" label="Alamat Baris 1" name="addressLine1" value={form.addressLine1} onChange={onChange} placeholder="Jalan dan Nomor" />
      <TextField id="inputAddressLine2" label="Alamat Baris 2" name="addressLine2" value={form.addressLine2} onChange={onChange} placeholder="Kecamatan, Kota" />
      <TextField id="inputAddressLine3" label="Alamat Baris 3" name="addressLine3" value={form.addressLine3} onChange={onChange} placeholder="Negara & Kode Pos" />
      <FileField id="inputCompanyLogoFile" label="Upload Logo (Opsional)" onChange={onLogoChange} wrapClass="pt-4" {...logoBg} />
    </div>
  );
}

function EmployeeForm({ form, onChange, statusText }) {
  return (
    <div className="space-y-4 mb-8">
      <p className="block text-sm font-bold text-gray-700">Detail Karyawan &amp; Transfer</p>
      <TextField id="inputSlipID" label="No. Slip Gaji (ID)" name="slipID" value={form.slipID} onChange={onChange} />
      <TextField id="inputSlipMonth" label="Bulan Gaji (Periode)" name="slipMonth" value={form.slipMonth} onChange={onChange} placeholder="Bulan Gaji (e.g., November 2025)" />
      <TextField id="inputTransferDate" label="Tanggal Transfer" name="transferDate" type="date" value={form.transferDate} onChange={onChange} />
      <TextField id="inputName" label="Nama Karyawan" name="name" value={form.name} onChange={onChange} wrapClass="pt-4" />
      <TextField id="inputPosition" label="Jabatan" name="position" value={form.position} onChange={onChange} />
      <TextField id="inputBankAccountNumber" label="Nomor Rekening" name="bankAccountNumber" value={form.bankAccountNumber} onChange={onChange} />
      <TextField id="inputBankName" label="Nama Bank" name="bankName" value={form.bankName} onChange={onChange} />
      <div className="input-group pt-4">
        <label htmlFor="inputStatus" className="text-sm font-medium text-gray-700">Status Pajak (PTKP)</label>
        <select
          id="inputStatus" name="status" value={form.status} onChange={onChange}
          className="p-2 border border-blue-500 text-blue-800 font-medium rounded-lg focus:ring-blue-500 focus:border-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Tarif PPh 21 Progresif:{' '}
        <span>{`PTKP ${statusText} diterapkan, dan tarif progresif PPh 21 (5% - 35%) digunakan.`}</span>
      </p>
    </div>
  );
}

function EarningsForm({ form, onChange }) {
  return (
    <>
      <h3 className="text-lg font-medium mt-6 mb-4 text-gray-700">Penerimaan (Earnings)</h3>
      <div className="space-y-2">
        <MoneyField itemClass="earnings-item" id="inputBasicSalary" label="Gaji Pokok" name="basicSalary" value={form.basicSalary} onChange={onChange} />
        <MoneyField itemClass="earnings-item" id="inputAllowance" label="Tunjangan" name="allowance" value={form.allowance} onChange={onChange} />
        <MoneyField itemClass="earnings-item" id="inputOvertime" label="Lembur" name="overtime" value={form.overtime} onChange={onChange} />
        <MoneyField itemClass="earnings-item" id="inputTransport" label="Transport" name="transport" value={form.transport} onChange={onChange} />
        <MoneyField itemClass="earnings-item" id="inputMealAllowance" label="Uang Makan" name="mealAllowance" value={form.mealAllowance} onChange={onChange} />
        <MoneyField itemClass="earnings-item" id="inputBonus" label="Bonus" name="bonus" value={form.bonus} onChange={onChange} />
      </div>
    </>
  );
}

function DeductionsForm({ form, onChange, calc }) {
  return (
    <>
      <h3 className="text-lg font-medium mt-6 mb-4 text-gray-700">Potongan (Deductions)</h3>
      <div className="space-y-2">
        <MoneyField itemClass="deduction-item" id="inputLoanDeduction" label="Pinjaman Karyawan" name="loanDeduction" value={form.loanDeduction} onChange={onChange} />
        <ReadOnlyMoney id="inputBPJS" label="BPJS Kes. + JP" value={formatPlain(calc.bpjsKesAndJP)} />
        <ReadOnlyMoney id="inputJHT" label="JHT" value={formatPlain(calc.jht)} />
        <ReadOnlyMoney id="inputPPH21" label="PPh 21" value={formatPlain(calc.pph21)} />
        <MoneyField itemClass="deduction-item" id="inputOtherDeduction" label="Lain-lain (Manual)" name="otherDeduction" value={form.otherDeduction} onChange={onChange} />
      </div>
    </>
  );
}

// ============================================================
// SECTION: Komponen Preview Slip (area yang di-export ke PNG)
// ============================================================
function LogoMark({ logo, h }) {
  if (logo) return <img src={logo} crossOrigin="anonymous" alt="Logo Perusahaan" className="slip-logo" style={h ? { height: h } : undefined} />;
  return <div className="slip-logo-text font-extrabold" style={{ color: '#b91c1c', ...(h ? { fontSize: Math.round(h * 0.6), lineHeight: `${h}px` } : {}) }}>LOGO</div>;
}

function CompanyText({ form, ink, oneLine }) {
  const c = ink ? { color: ink } : undefined;
  const addr = 'text-[9px] text-gray-600 leading-tight slip-pre';
  return (
    <>
      <p className="text-sm font-bold text-black slip-pre" style={c}>{form.companyName}</p>
      {oneLine ? (
        <p className={addr} style={c}>{[form.addressLine1, form.addressLine2, form.addressLine3].filter(Boolean).join(' · ')}</p>
      ) : (
        <>
          <p className={addr} style={c}>{form.addressLine1}</p>
          <p className={addr} style={c}>{form.addressLine2}</p>
          <p className={addr} style={c}>{form.addressLine3}</p>
        </>
      )}
    </>
  );
}

function SlipHeader({ t, form, logo, A }) {
  if (t.header === 'left') return (
    <div className="flex items-center gap-3 border-b-2 pb-1 mb-2" style={{ borderColor: A }}>
      <div className="flex-shrink-0"><LogoMark logo={logo} /></div>
      <div className="flex-1"><CompanyText form={form} /></div>
    </div>
  );
  if (t.header === 'center') return (
    <div className="text-center border-b-2 pb-1 mb-2" style={{ borderColor: A }}>
      <div className="flex justify-center"><LogoMark logo={logo} h={28} /></div>
      <CompanyText form={form} oneLine />
    </div>
  );
  if (t.header === 'band') return (
    <div className="flex justify-between items-center px-2 py-1 mb-2" style={{ background: A }}>
      <div className="flex-1"><CompanyText form={form} ink="#fff" /></div>
      <div className="ml-4 flex-shrink-0 bg-white px-1 rounded"><LogoMark logo={logo} h={40} /></div>
    </div>
  );
  if (t.header === 'box') return (
    <div className="flex justify-between items-center gap-3 mb-2">
      <div className="flex-1 border-2 px-2 py-0.5" style={{ borderColor: A, borderLeftWidth: 6 }}><CompanyText form={form} /></div>
      <div className="flex-shrink-0"><LogoMark logo={logo} /></div>
    </div>
  );
  return (
    <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
      <div className="flex-1"><CompanyText form={form} /></div>
      <div className="ml-4 flex-shrink-0"><LogoMark logo={logo} /></div>
    </div>
  );
}

function SlipTitle({ t, form, A, dash }) {
  const month = form.slipMonth.toUpperCase();
  if (t.title === 'bar') return (
    <div className="text-center mb-2">
      <p className="text-xs font-bold uppercase py-1 tracking-wider" style={{ background: A, color: '#fff' }}>SLIP GAJI BULAN {month}</p>
    </div>
  );
  if (t.title === 'big') return (
    <div className="flex justify-between items-end border-b-2 pb-0.5 mb-2" style={{ borderColor: A }}>
      <p className="font-bold uppercase" style={{ fontSize: 15, lineHeight: '20px', color: A }}>Slip Gaji</p>
      <p className="text-xs font-bold uppercase tracking-wider">PERIODE {month}</p>
    </div>
  );
  if (t.title === 'pill') return (
    <div className="text-center mb-2">
      <span className="inline-block text-xs font-bold uppercase tracking-wider border rounded-full px-4 py-0.5" style={dash ? { borderColor: A } : { background: A, color: '#fff', borderColor: A }}>
        SLIP GAJI BULAN {month}
      </span>
    </div>
  );
  return (
    <div className="text-center mb-2">
      <p className="text-xs font-bold uppercase border-b border-t border-black py-1 tracking-wider">
        SLIP GAJI BULAN <span>{month}</span>
      </p>
    </div>
  );
}

function SlipInfo({ t, form, A, soft, dash }) {
  const left = [['ID', form.slipID], ['NAMA', form.name], ['JABATAN', form.position]];
  const right = [['NO. REK', form.bankAccountNumber], ['NAMA BANK', form.bankName], ['STS PAJAK', form.status]];
  if (t.info === 'table') {
    const cell = { border: `1px solid ${A}`, padding: '0 4px', textAlign: 'left' };
    const head = { ...cell, background: dash ? undefined : soft, width: '13%' };
    return (
      <table className="w-full mb-2 border-collapse">
        <tbody>
          {left.map(([l1, v1], i) => (
            <tr key={l1}>
              <th className="font-semibold" style={head}>{l1}</th><td style={cell}>{v1}</td>
              <th className="font-semibold" style={head}>{right[i][0]}</th><td style={cell}>{right[i][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (t.info === 'pills') {
    const pill = dash ? { border: '1px solid #000', lineHeight: '13px' } : { border: `1px solid ${A}`, background: A, color: '#fff', lineHeight: '13px' };
    return (
      <div className="grid grid-cols-2 gap-4 mb-2">
        {[left, right].map((col, ci) => (
          <div key={ci} className="space-y-0.5">
            {col.map(([l, v]) => (
              <div key={l} className="flex items-center">
                <span className="w-24 mr-2 font-semibold text-[8.5px] text-center rounded-full" style={pill}>{l}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 mb-2">
      <div className="space-y-0.5">
        <InfoRow label="ID" value={form.slipID} highlight={!dash} />
        <InfoRow label="NAMA" value={form.name} />
        <InfoRow label="JABATAN" value={form.position} />
      </div>
      <div className="space-y-0.5">
        <InfoRow label="NO. REK" value={form.bankAccountNumber} />
        <InfoRow label="NAMA BANK" value={form.bankName} />
        <InfoRow label="STS PAJAK" value={form.status} />
      </div>
    </div>
  );
}

function SlipBody({ t, calc, A, soft, dash, colored }) {
  const groups = [
    ['PENERIMAAN', [['Gaji Pokok', calc.basicSalary], ['Tunjangan', calc.allowance], ['Lembur', calc.overtime], ['Transport', calc.transport], ['Uang Makan', calc.mealAllowance], ['Bonus', calc.bonus]]],
    ['POTONGAN', [['Pinjaman Karyawan', calc.loanDeduction], ['BPJS Kes. + JP', calc.bpjsKesAndJP], ['JHT', calc.jht], ['PPh 21', calc.pph21], ['Lain-lain (Manual)', calc.otherDeduction]]],
  ];
  if (t.body === 'ruled') return (
    <div className="grid grid-cols-2 gap-6 mb-1">
      {groups.map(([h, rows]) => (
        <div key={h}>
          <div className="font-bold border-b-2 mb-0.5 tracking-wider" style={{ borderColor: A, color: colored ? A : undefined }}>{h}</div>
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-dotted border-gray-400"><span>{l}</span><span>{formatRupiah(v)}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
  if (t.body === 'zebra') return (
    <div className="flex gap-3 mb-1">
      {groups.map(([h, rows]) => (
        <div key={h} className="flex-1 border" style={{ borderColor: A }}>
          <div className="font-bold px-1 py-0.5 tracking-wider" style={{ background: A, color: '#fff' }}>{h}</div>
          {rows.map(([l, v], i) => (
            <div key={l} className="flex justify-between px-1" style={i % 2 ? { background: soft } : undefined}><span>{l}</span><span>{formatRupiah(v)}</span></div>
          ))}
        </div>
      ))}
    </div>
  );
  if (t.body === 'cards') return (
    <div className="flex gap-3 mb-1">
      {groups.map(([h, rows]) => (
        <div key={h} className="flex-1 border rounded-md p-1.5" style={{ borderColor: A }}>
          <div className="font-bold text-center mb-0.5 pb-0.5 border-b tracking-wider" style={{ borderColor: A, color: A }}>{h}</div>
          {rows.map(([l, v]) => <SlipLine key={l} label={l} value={formatRupiah(v)} />)}
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex border border-black mb-1">
      {groups.map(([h, rows], gi) => (
        <div key={h} className={gi ? 'w-1/2' : 'w-1/2 border-r border-black'}>
          <div className={`text-center font-bold border-b border-black p-0.5 ${dash ? '' : 'bg-gray-100'}`}>{h}</div>
          <div className="p-1 space-y-0.5">
            {rows.map(([l, v]) => <SlipLine key={l} label={l} value={formatRupiah(v)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TotalsLine({ calc, A }) {
  return (
    <div className="flex font-bold border-t-2 pt-0.5 mt-1" style={{ borderColor: A }}>
      <div className="w-1/2 flex justify-between px-1 border-r" style={{ borderColor: A }}><span>TOTAL PENERIMAAN</span><span>{formatRupiah(calc.totalEarnings)}</span></div>
      <div className="w-1/2 flex justify-between px-1"><span>TOTAL POTONGAN</span><span>{formatRupiah(calc.totalDeductions)}</span></div>
    </div>
  );
}

function SlipTotals({ t, calc, A, dash }) {
  const thp = formatRupiah(calc.takeHomePay);
  if (t.total === 'bar') return (
    <>
      <TotalsLine calc={calc} A={A} />
      <div className="flex justify-between items-center px-2 py-1 mt-1 font-extrabold text-lg leading-tight" style={{ background: A, color: '#fff' }}>
        <span>TAKE HOME PAY (THP)</span><span>{thp}</span>
      </div>
    </>
  );
  if (t.total === 'box') return (
    <>
      <TotalsLine calc={calc} A={A} />
      <div className="flex justify-between items-center border-2 px-2 py-1 mt-1" style={{ borderColor: A }}>
        <span className="font-bold text-sm">TAKE HOME PAY (THP)</span>
        <span className="font-extrabold text-lg leading-tight" style={{ color: A }}>{thp}</span>
      </div>
    </>
  );
  if (t.total === 'big') return (
    <>
      <TotalsLine calc={calc} A={A} />
      <div className="flex justify-between items-end border-b-2 pb-0.5 mt-1" style={{ borderColor: A }}>
        <span className="font-bold text-xs tracking-wider">TAKE HOME PAY (THP)</span>
        <span className="font-extrabold" style={{ fontSize: 22, lineHeight: '26px', color: A }}>{thp}</span>
      </div>
    </>
  );
  // klasik; versi dash = garis putus-putus tanpa blok abu
  const rule = (h) => (dash ? { background: 'transparent', height: 0, borderTop: `${h}px dashed #000` } : undefined);
  const half = dash ? '' : 'bg-gray-200';
  return (
    <>
      <div className="flex font-extrabold text-sm border-t-2 border-black pt-1 mb-0.5">
        <div className={`w-1/2 border-r border-black ${half} py-0.5 px-1 flex justify-between`}>
          <span>TOTAL PENERIMAAN</span>
          <span className="pl-2">{formatRupiah(calc.totalEarnings)}</span>
        </div>
        <div className={`w-1/2 ${half} py-0.5 px-1 flex justify-between`}>
          <span>TOTAL POTONGAN</span>
          <span className="pl-2">{formatRupiah(calc.totalDeductions)}</span>
        </div>
      </div>
      <div className="relative py-2">
        <div className="absolute w-[49%] right-0 top-[2px] h-[1px] bg-black" style={rule(1)}></div>
        <div className="flex justify-between items-center">
          <span className="font-extrabold text-lg leading-tight">TAKE HOME PAY (THP)</span>
          <span className="font-extrabold text-lg leading-tight">{thp}</span>
        </div>
        <div className="absolute w-full h-[2px] bg-black bottom-[2px]" style={rule(2)}></div>
      </div>
    </>
  );
}

function SlipPreview({ slipRef, form, calc, logo, signature, managerSignature, t, k }) {
  const A = t.accent || '#000';
  const dash = !!t.dash;
  const soft = t.soft || '#f3f4f6';
  const p = { t, A, soft, dash, colored: !!t.accent };
  return (
    <div className="slip-scroll">
      <div
        id="slip-container" ref={slipRef}
        className={`slip-box ${t.font ? '' : 'doc-font'} ${dash ? 'slip-dash' : ''} border border-gray-400`}
        // Margin tepi kertas ±5mm atas/bawah, ±7mm kiri/kanan
        style={{ padding: '18px 26px', ...(t.font ? { fontFamily: t.font } : {}) }}
      >
        <ScaleBox k={k}>
        <div id="payslip-content" className="text-[10px] px-1">
          <SlipHeader {...p} form={form} logo={logo} />
          <SlipTitle {...p} form={form} />
          <SlipInfo {...p} form={form} />
          <SlipBody {...p} calc={calc} />
          <SlipTotals {...p} calc={calc} />

          {/* Footer: transfer & tanda tangan (sama di semua template) */}
          <div className="flex justify-between text-[10px] mt-1">
            <div className="text-left" style={{ width: '36%' }}>
              <p className="text-[9px] leading-tight">Pembayaran gaji Telah Dilakukan Perusahaan Melalui Transfer</p>
              <div className="relative h-10 mb-1 pt-2">
                <p className="text-[9px] text-gray-700">Tanggal Transfer: <span>{formatTransferDate(form.transferDate)}</span></p>
              </div>
            </div>

            <div className="flex items-end gap-6">
              <SignBlock heading="Mengetahui," image={managerSignature} alt="Tanda Tangan Manager" name={form.managerName} title={form.managerTitle} offset={getOffset(form.posisi, 'manager')} />
              <SignBlock heading="Penerima," image={signature} alt="Tanda Tangan Karyawan" name={form.name} title={form.position} offset={getOffset(form.posisi, 'karyawan')} />
            </div>
          </div>
        </div>
        </ScaleBox>
      </div>
    </div>
  );
}

function TemplatePicker({ value, onChange, id = 'inputTemplate' }) {
  return (
    <div className={`input-group ${id === 'inputTemplate' ? 'mb-8' : ''}`}>
      <label htmlFor={id} className="text-sm font-bold text-gray-700">Template Slip</label>
      <select
        id={id} name="template" value={value} onChange={onChange}
        className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      >
        {SLIP_TEMPLATES.map((x, i) => (
          <option key={x.id} value={x.id}>{`${i + 1}. ${x.name} — ${x.desc}`}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// SECTION: Halaman Utama — State, Handler & Render
// ============================================================
export default function SlipGaji() {
  // --- State & Refs ---
  const [form, setForm] = useState(buildInitialForm);
  const [logo, setLogo] = useState('');
  const [signature, setSignature] = useState('');
  const [managerSignature, setManagerSignature] = useState('');
  const [bg, setBg] = useState({ logo: false, signature: false, manager: false });
  const bgError = (m) => pushToast('error', m);
  const logoShown = useBgRemoved(logo, bg.logo, bgError);
  const signatureShown = useBgRemoved(signature, bg.signature, bgError);
  const managerShown = useBgRemoved(managerSignature, bg.manager, bgError);
  const bgBusy = logoShown.busy || signatureShown.busy || managerShown.busy;
  const bgProps = (key, shown) => ({ bg: bg[key], onBg: (v) => setBg((p) => ({ ...p, [key]: v })), bgBusy: shown.busy });
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const slipRef = useRef(null);
  const toastId = useRef(0);

  const calc = useMemo(() => computeSlip(form), [form]);
  const tpl = SLIP_TEMPLATES.find((x) => x.id === form.template) || SLIP_TEMPLATES[0];
  const k = useFitScale(form.skala / 100, () => slipRef.current, true, [form, logoShown.src, signatureShown.src, managerShown.src]);
  useGoogleFonts([tpl.gf]);
  const statusText = (STATUS_OPTIONS.find((o) => o.value === form.status) || STATUS_OPTIONS[0]).label;

  // --- Handler: Toast ---
  const pushToast = useCallback((type, message) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Handler: Input form ---
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  // --- Handler: Upload & resize gambar (logo / tanda tangan) ---
  const handleImage = async (event, setter, maxW, maxH, label, folder) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setter('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      event.target.value = '';
      pushToast('error', `Gagal mengunggah ${label}: file "${file.name}" bukan gambar.`);
      return;
    }
    setUploading(true);
    try {
      const { dataUrl, blob } = await resizeImage(file, maxW, maxH);
      setter(dataUrl); // pratinjau instan (lokal)
      try {
        const { url } = await uploadImage(blob, `hk-hub-station/slip-gaji/${folder}`); // Cloudinary = penyimpanan utama
        setter(url);
        pushToast('success', `${label} berhasil diunggah ke Cloudinary.`);
      } catch (cloudErr) {
        pushToast('error', `${label} dipakai secara lokal (Cloudinary gagal: ${cloudErr.message}).`);
      }
    } catch (err) {
      pushToast('error', `Gagal mengunggah ${label}: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };
  const handleLogoChange = (e) => handleImage(e, setLogo, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, 'Logo perusahaan', 'logo');
  const handleSignatureChange = (e) => handleImage(e, setSignature, SIGNATURE_MAX_WIDTH, SIGNATURE_MAX_HEIGHT, 'Tanda tangan', 'tanda-tangan');
  const handleManagerSignatureChange = (e) => handleImage(e, setManagerSignature, SIGNATURE_MAX_WIDTH, SIGNATURE_MAX_HEIGHT, 'Tanda tangan manager', 'tanda-tangan');

  const captureSlip = async () => {
    await fontsReady(); // font dokumen (termasuk Google Font template) wajib termuat agar tata letak sama di semua perangkat
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(slipRef.current, {
      scale: 3, // tetap (bukan devicePixelRatio): hasil selalu 2736×1584 px
      windowWidth: 1280,
      onclone: unfitPreview,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: SLIP_WIDTH,
      height: SLIP_HEIGHT,
    });
  };
  const slipFileName = () => `slip_gaji_${form.name.replace(/\s/g, '_')}_${form.slipMonth.toUpperCase().replace(/\s/g, '_')}`;

  // --- Handler: Print ---
  const handlePrint = async () => {
    if (exporting || printing || !slipRef.current) return;
    setPrinting(true);
    try {
      const canvas = await captureSlip();
      await printImage(canvas.toDataURL('image/png'), slipFileName(), { w: '9.5in', h: '5.5in' });
      pushToast('success', 'Jendela cetak dibuka.');
    } catch (error) {
      if (isStaleChunkError(error) && reloadForNewVersion()) return pushToast('success', 'Aplikasi baru saja diperbarui. Memuat ulang… lalu coba lagi.');
      pushToast('error', `Gagal mencetak slip gaji: ${error && error.message ? error.message : 'proses render gambar gagal.'}`);
    } finally {
      setPrinting(false);
    }
  };

  // --- Handler: Export PNG ---
  const handleExport = async () => {
    if (exporting || printing || !slipRef.current) return;
    setExporting(true);
    try {
      const canvas = await captureSlip();
      const fileName = `${slipFileName()}.png`;
      saveFile(await canvasToBlob(canvas), fileName);
      pushToast('success', `Slip gaji diekspor sebagai ${fileName}.`);
    } catch (error) {
      if (isStaleChunkError(error) && reloadForNewVersion()) return pushToast('success', 'Aplikasi baru saja diperbarui. Memuat ulang… lalu coba lagi.');
      console.error('Error saat ekspor:', error);
      pushToast('error', `Gagal mengekspor slip gaji: ${error && error.message ? error.message : 'proses render gambar gagal.'}`);
    } finally {
      setExporting(false);
    }
  };

  // Analog geser tanda tangan/stempel: desktop di atas form, ponsel di kotak bawah
  const [geser, setGeser] = useState('karyawan');
  const posPad = (
    <PositionPad targets={[{ id: 'karyawan', label: 'TTD Karyawan' }, { id: 'manager', label: 'TTD Manager' }]}
      active={geser} onActive={setGeser} value={form.posisi} onChange={(v) => setForm((prev) => ({ ...prev, posisi: v }))} />
  );
  // --- Render ---
  return (
    <div className="slip-app p-4 md:p-8">
      <ToastStack toasts={toasts} onClose={removeToast} />

      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700 hover:text-blue-900">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Aplikasi Pembuat Slip Gaji Terintegrasi (BPJS &amp; PPh 21)
        </h1>

        <div className="max-w-md mx-auto"><QrisCard /></div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Render — Formulir */}
          <div className="slip-card bg-white p-6 md:p-8 shadow-lg rounded-xl h-fit">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2 text-gray-700">Formulir Input Data Slip Gaji</h2>
            <div className="hidden lg:block"><div className="mb-4"><TextSizeSlider value={form.skala} onChange={(v) => setForm((prev) => ({ ...prev, skala: v }))} effective={k} /></div></div>
            <div className="hidden lg:block">{posPad}</div>
            <div className="hidden lg:block">
            <TemplatePicker value={tpl.id} onChange={handleChange} />
            </div>
            <CompanyForm form={form} onChange={handleChange} onLogoChange={handleLogoChange} logoBg={bgProps('logo', logoShown)} />
            <EmployeeForm form={form} onChange={handleChange} statusText={statusText} />
            <EarningsForm form={form} onChange={handleChange} />
            <DeductionsForm form={form} onChange={handleChange} calc={calc} />

            <h3 className="text-lg font-medium mt-8 mb-4 border-t pt-4 text-gray-700">Detail Tanda Tangan</h3>
            <div className="space-y-4">
              <FileField id="inputReceiverSignatureFile" label="Tanda Tangan Karyawan (Opsional)" onChange={handleSignatureChange} {...bgProps('signature', signatureShown)} />
              <TextField id="inputManagerName" label="Nama Direktur / Manager" name="managerName" value={form.managerName ?? ''} onChange={handleChange} />
              <TextField id="inputManagerTitle" label="Jabatan Penandatangan" name="managerTitle" value={form.managerTitle ?? ''} onChange={handleChange} placeholder="Direktur / Manager" />
              <FileField id="inputManagerSignatureFile" label="Tanda Tangan Direktur / Manager (Opsional)" onChange={handleManagerSignatureChange} {...bgProps('manager', managerShown)} />
            </div>
          </div>

          {/* Render — Preview Slip */}
          <div className="slip-card bg-white p-2 md:p-4 rounded-xl shadow-lg lg:col-span-1 min-w-0">
            <FitPreview>
              <SlipPreview slipRef={slipRef} form={form} calc={calc} logo={logoShown.src} signature={signatureShown.src} managerSignature={managerShown.src} t={tpl} k={k} />
            </FitPreview>
          </div>
        </div>

        {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
        <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
          <TextSizeSlider value={form.skala} onChange={(v) => setForm((prev) => ({ ...prev, skala: v }))} effective={k} />
          {posPad}
          <TemplatePicker id="inputTemplateMobile" value={tpl.id} onChange={handleChange} />
        </div>

        {/* Render — Tombol Export (paling bawah) */}
        <div className="mt-8 mb-20 p-4 bg-white shadow-lg rounded-lg">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button" onClick={handleExport} disabled={exporting || printing || bgBusy}
              className="slip-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md inline-flex items-center gap-2"
            >
              {exporting ? <span className="slip-spinner" aria-hidden="true" /> : <IconDownload />}
              {exporting ? 'Memproses... Harap tunggu.' : 'Export Slip Gaji sebagai PNG'}
            </button>
            <button
              type="button" onClick={handlePrint} disabled={exporting || printing || bgBusy}
              className="slip-btn bg-slate-700 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg shadow-md inline-flex items-center gap-2"
            >
              {printing && <span className="slip-spinner" aria-hidden="true" />}
              {printing ? 'Menyiapkan cetakan...' : 'Print'}
            </button>
          </div>
          {(exporting || printing || uploading) && (
            <div className="slip-progress-track" role="progressbar" aria-label={exporting ? 'Memproses ekspor' : 'Memproses gambar'}>
              <div className="slip-progress-fill" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
