import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadImage } from '../../shared/lib/cloudinary';
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

const SLIP_WIDTH = 794; // 21cm @96DPI
const SLIP_HEIGHT = 454; // 12cm @96DPI

const todayLocal = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const buildInitialForm = () => ({
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
      <input
        type={type} id={id} name={name} value={value} onChange={onChange} placeholder={placeholder || label}
        className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function FileField({ id, label, onChange, wrapClass = '' }) {
  return (
    <div className={`input-group ${wrapClass}`}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="file" id={id} accept="image/*" onChange={onChange}
        className="p-2 border border-gray-300 rounded-lg bg-gray-50"
      />
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
function SlipSpacer() {
  return (
    <div className="flex">
      <span className="w-40">&nbsp;</span><span className="w-4"></span><span className="flex-1 text-right"></span>
    </div>
  );
}
function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex">
      <span className="w-24 font-semibold">{label}</span>
      <span className="mr-2">:</span>
      <span className={highlight ? 'px-2 bg-yellow-100 rounded' : ''}>{value}</span>
    </div>
  );
}

// ============================================================
// SECTION: Komponen Form (Perusahaan, Karyawan, Penerimaan, Potongan)
// ============================================================
function CompanyForm({ form, onChange, onLogoChange }) {
  return (
    <div className="space-y-4 mb-8">
      <p className="block text-sm font-bold text-gray-700">Detail Perusahaan</p>
      <TextField id="inputCompanyName" label="Nama Perusahaan" name="companyName" value={form.companyName} onChange={onChange} />
      <TextField id="inputAddressLine1" label="Alamat Baris 1" name="addressLine1" value={form.addressLine1} onChange={onChange} placeholder="Jalan dan Nomor" />
      <TextField id="inputAddressLine2" label="Alamat Baris 2" name="addressLine2" value={form.addressLine2} onChange={onChange} placeholder="Kecamatan, Kota" />
      <TextField id="inputAddressLine3" label="Alamat Baris 3" name="addressLine3" value={form.addressLine3} onChange={onChange} placeholder="Negara & Kode Pos" />
      <FileField id="inputCompanyLogoFile" label="Upload Logo (Opsional)" onChange={onLogoChange} wrapClass="pt-4" />
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
function SlipPreview({ slipRef, form, calc, logo, signature }) {
  return (
    <div className="slip-scroll">
      <div id="slip-container" ref={slipRef} className="slip-box border border-gray-400 p-4">
        <div id="payslip-content" className="text-[10px] p-1">
          {/* Header perusahaan */}
          <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-2">
            <div className="flex-1">
              <p className="text-sm font-bold text-black slip-pre">{form.companyName}</p>
              <p className="text-[9px] text-gray-600 leading-tight slip-pre">{form.addressLine1}</p>
              <p className="text-[9px] text-gray-600 leading-tight slip-pre">{form.addressLine2}</p>
              <p className="text-[9px] text-gray-600 leading-tight slip-pre">{form.addressLine3}</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              {logo ? (
                <img src={logo} crossOrigin="anonymous" alt="Logo Perusahaan" className="slip-logo" />
              ) : (
                <div className="slip-logo-text font-extrabold text-red-700">LOGO</div>
              )}
            </div>
          </div>

          {/* Judul */}
          <div className="text-center mb-2">
            <p className="text-xs font-bold uppercase border-b border-t border-black py-1 tracking-wider">
              SLIP GAJI BULAN <span>{form.slipMonth.toUpperCase()}</span>
            </p>
          </div>

          {/* Info karyawan */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="space-y-0.5">
              <InfoRow label="ID" value={form.slipID} highlight />
              <InfoRow label="NAMA" value={form.name} />
              <InfoRow label="JABATAN" value={form.position} />
            </div>
            <div className="space-y-0.5">
              <InfoRow label="NO. REK" value={form.bankAccountNumber} />
              <InfoRow label="NAMA BANK" value={form.bankName} />
              <InfoRow label="STS PAJAK" value={form.status} />
            </div>
          </div>

          {/* Penerimaan & Potongan */}
          <div className="flex border border-black mb-1">
            <div className="w-1/2 border-r border-black">
              <div className="text-center font-bold border-b border-black p-0.5 bg-gray-100">PENERIMAAN</div>
              <div className="p-1 space-y-0.5">
                <SlipLine label="Gaji Pokok" value={formatRupiah(calc.basicSalary)} />
                <SlipLine label="Tunjangan" value={formatRupiah(calc.allowance)} />
                <SlipLine label="Lembur" value={formatRupiah(calc.overtime)} />
                <SlipLine label="Transport" value={formatRupiah(calc.transport)} />
                <SlipLine label="Uang Makan" value={formatRupiah(calc.mealAllowance)} />
                <SlipLine label="Bonus" value={formatRupiah(calc.bonus)} />
                <SlipSpacer />
              </div>
            </div>
            <div className="w-1/2">
              <div className="text-center font-bold border-b border-black p-0.5 bg-gray-100">POTONGAN</div>
              <div className="p-1 space-y-0.5">
                <SlipLine label="Pinjaman Karyawan" value={formatRupiah(calc.loanDeduction)} />
                <SlipLine label="BPJS Kes. + JP" value={formatRupiah(calc.bpjsKesAndJP)} />
                <SlipLine label="JHT" value={formatRupiah(calc.jht)} />
                <SlipLine label="PPh 21" value={formatRupiah(calc.pph21)} />
                <SlipLine label="Lain-lain (Manual)" value={formatRupiah(calc.otherDeduction)} />
                <SlipSpacer />
                <SlipSpacer />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex font-extrabold text-sm border-t-2 border-black pt-1 mb-0.5">
            <div className="w-1/2 border-r border-black bg-gray-200 p-0.5 flex justify-between">
              <span>TOTAL PENERIMAAN</span>
              <span className="pl-2">{formatRupiah(calc.totalEarnings)}</span>
            </div>
            <div className="w-1/2 bg-gray-200 p-0.5 flex justify-between">
              <span>TOTAL POTONGAN</span>
              <span className="pl-2">{formatRupiah(calc.totalDeductions)}</span>
            </div>
          </div>

          {/* THP */}
          <div className="relative py-2">
            <div className="absolute w-[49%] right-0 top-[2px] h-[1px] bg-black"></div>
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-lg">TAKE HOME PAY (THP)</span>
              <span className="font-extrabold text-lg">{formatRupiah(calc.takeHomePay)}</span>
            </div>
            <div className="absolute w-full h-[2px] bg-black bottom-[2px]"></div>
          </div>

          {/* Footer: transfer & tanda tangan */}
          <div className="flex justify-between text-[10px] mt-1">
            <div className="text-left" style={{ width: '40%' }}>
              <p className="text-[9px] leading-tight">Pembayaran gaji Telah Dilakukan Perusahaan Melalui Transfer</p>
              <div className="relative h-10 mb-1 pt-2">
                <p className="text-[9px] text-gray-700">Tanggal Transfer: <span>{formatTransferDate(form.transferDate)}</span></p>
              </div>
              <div className="pt-1">
                <p className="text-[9px]">&nbsp;</p>
                <p className="text-[9px]">&nbsp;</p>
              </div>
            </div>

            <div className="text-right" style={{ width: '40%' }}>
              <p>Tanda Tangan,</p>
              <div className="relative h-10 mb-1">
                {signature && <img src={signature} crossOrigin="anonymous" alt="Tanda Tangan Karyawan" className="slip-signature" />}
              </div>
              <div className="pt-1">
                <p className="border-b border-black font-semibold inline-block pb-1">{form.name}</p>
                <p className="text-[9px]">{form.position}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const slipRef = useRef(null);
  const toastId = useRef(0);

  const calc = useMemo(() => computeSlip(form), [form]);
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

  // --- Handler: Export PNG ---
  const handleExport = async () => {
    if (exporting || !slipRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(slipRef.current, {
        scale: 3,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: SLIP_WIDTH,
        height: SLIP_HEIGHT,
      });
      const fileName = `slip_gaji_${form.name.replace(/\s/g, '_')}_${form.slipMonth.toUpperCase().replace(/\s/g, '_')}.png`;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      pushToast('success', `Slip gaji diekspor sebagai ${fileName}.`);
    } catch (error) {
      console.error('Error saat ekspor:', error);
      pushToast('error', `Gagal mengekspor slip gaji: ${error && error.message ? error.message : 'proses render gambar gagal.'}`);
    } finally {
      setExporting(false);
    }
  };

  // --- Render ---
  return (
    <div className="slip-app p-4 md:p-8">
      <ToastStack toasts={toasts} onClose={removeToast} />

      <div className="max-w-7xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm font-medium text-blue-700 hover:text-blue-900">&larr; Kembali ke HK Hub Station</Link>
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Aplikasi Pembuat Slip Gaji Terintegrasi (BPJS &amp; PPh 21)
        </h1>

        {/* Render — Tombol Export */}
        <div className="mb-8 p-4 bg-white shadow-lg rounded-lg sticky top-0 z-10">
          <div className="flex justify-center">
            <button
              type="button" onClick={handleExport} disabled={exporting}
              className="slip-btn bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md inline-flex items-center gap-2"
            >
              {exporting ? <span className="slip-spinner" aria-hidden="true" /> : <IconDownload />}
              {exporting ? 'Memproses... Harap tunggu.' : 'Export Slip Gaji sebagai PNG'}
            </button>
          </div>
          {(exporting || uploading) && (
            <div className="slip-progress-track" role="progressbar" aria-label={exporting ? 'Memproses ekspor' : 'Memproses gambar'}>
              <div className="slip-progress-fill" />
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Render — Formulir */}
          <div className="slip-card bg-white p-6 md:p-8 shadow-lg rounded-xl h-fit">
            <h2 className="text-xl font-semibold mb-6 border-b pb-2 text-gray-700">Formulir Input Data Slip Gaji</h2>
            <CompanyForm form={form} onChange={handleChange} onLogoChange={handleLogoChange} />
            <EmployeeForm form={form} onChange={handleChange} statusText={statusText} />
            <EarningsForm form={form} onChange={handleChange} />
            <DeductionsForm form={form} onChange={handleChange} calc={calc} />

            <h3 className="text-lg font-medium mt-8 mb-4 border-t pt-4 text-gray-700">Detail Tanda Tangan Penerima</h3>
            <div className="space-y-4">
              <FileField id="inputReceiverSignatureFile" label="Tanda Tangan Karyawan (Opsional)" onChange={handleSignatureChange} />
            </div>
          </div>

          {/* Render — Preview Slip */}
          <div className="slip-card bg-white p-2 md:p-4 rounded-xl shadow-lg lg:col-span-1 min-w-0">
            <SlipPreview slipRef={slipRef} form={form} calc={calc} logo={logo} signature={signature} />
          </div>
        </div>
      </div>
    </div>
  );
}
