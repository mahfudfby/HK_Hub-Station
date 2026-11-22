import type { CSSProperties, ReactNode } from 'react';
import type { KwitansiData } from './types';
import { fxOf, getOffset } from '../../shared/components/PositionPad';
import { fmtTanggal } from '../../shared/components/LetterKit';
import { num, rupiah, terbilangRupiah } from '../../shared/lib/money';
import { Scissors, CheckCircle, ShieldCheck, QrCode } from 'lucide-react';

export interface TemplateRenderProps {
  d: KwitansiData;
  scaleFactor?: number;
}

export interface KwitansiTemplate {
  id: string;
  name: string;
  desc: string;
  render: (props: TemplateRenderProps) => ReactNode;
}

// Helper formatters
function getNominal(d: KwitansiData): string {
  if (d.kosong) return '................................................';
  return `Rp ${rupiah(num(d.jumlah))},-`;
}

function getTerbilang(d: KwitansiData): string {
  if (d.kosong) return '................................................................................................................................';
  if (d.terbilangCustom && d.terbilangManual.trim()) return d.terbilangManual;
  return `# ${terbilangRupiah(num(d.jumlah))} #`;
}

// Komponen Pembantu: Kotak Meterai
function MeteraiBox({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`border-2 border-dashed border-amber-600/70 bg-amber-50/80 rounded flex flex-col items-center justify-center text-amber-800 select-none ${
        compact ? 'w-20 h-14 p-1 text-[8px]' : 'w-24 h-16 p-1.5 text-[9px]'
      }`}
    >
      <span className="font-bold tracking-wider">METERAI</span>
      <span className="text-[7px] text-amber-700">TEMPEL</span>
      <span className="font-extrabold text-[10px] mt-0.5">10.000</span>
    </div>
  );
}

// Komponen Pembantu: Stempel Lunas Grafis
function LunasBadge({ rotated = true }: { rotated?: boolean }) {
  return (
    <div
      className={`inline-block border-4 border-red-600 text-red-600 font-black tracking-widest px-4 py-1 rounded-md uppercase select-none opacity-85 ${
        rotated ? '-rotate-12' : ''
      }`}
      style={{ letterSpacing: '0.25em' }}
    >
      L U N A S
    </div>
  );
}

// Komponen Pembantu: Bonggol Klasik Kasir
function BonggolKiri({ d }: { d: KwitansiData }) {
  const oTtd = getOffset(d.posisi, 'ttd');
  return (
    <div className="w-[180px] shrink-0 pr-3 border-r-2 border-dashed border-gray-400 flex flex-col justify-between text-[11px] relative">
      <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 bg-white px-0.5 text-gray-400">
        <Scissors size={14} className="rotate-90" />
      </div>
      <div>
        <div className="font-bold text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          BONGGOL ARSIP
        </div>
        <div className="font-bold text-xs text-gray-900 border-b pb-1 mb-2">
          {d.instansi || 'KWITANSI'}
        </div>
        <div className="space-y-1 text-gray-700">
          <div>
            <span className="text-gray-500 block text-[9px]">No:</span>
            <span className="font-mono font-semibold">{d.pakaiNomor ? d.nomor : '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px]">Diterima Dari:</span>
            <span className="font-medium line-clamp-2">{d.kosong ? '..........' : d.terimaDari}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px]">Jumlah:</span>
            <span className="font-bold text-blue-900">{getNominal(d)}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[9px]">Untuk:</span>
            <span className="line-clamp-3 text-[10px] leading-tight">{d.kosong ? '..........' : d.untuk}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[10px]">
        <div>{d.kota}, {fmtTanggal(d.tanggal)}</div>
        <div className="text-gray-500 text-[9px]">Kasir / Penerima</div>
        <div className="h-10 flex items-center justify-center relative my-1">
          {d.ttd && (
            <img
              src={d.ttd}
              alt="ttd"
              className="max-h-10 object-contain pointer-events-none"
              style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
            />
          )}
        </div>
        <div className="font-semibold text-gray-800 text-[10px] underline">{d.namaPenerima}</div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 01: Klasik Buku Kasir
// ============================================================
function RenderKlasikBuku({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-serif p-6 bg-white min-h-full flex gap-5 text-gray-900 leading-relaxed">
      {d.pakaiBonggol && <BonggolKiri d={d} />}

      <div className="flex-1 flex flex-col justify-between">
        {/* Kop & Judul */}
        <div>
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
            <div className="flex items-center gap-3">
              {d.pakaiKop && d.logo && (
                <img
                  src={d.logo}
                  alt="Logo"
                  className="h-12 object-contain"
                  style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
                />
              )}
              {d.pakaiKop && (
                <div>
                  <h1 className="font-bold text-base uppercase tracking-wider">{d.instansi}</h1>
                  {d.subKop && <div className="text-xs text-gray-700">{d.subKop}</div>}
                  {d.alamat && <div className="text-[10px] text-gray-600">{d.alamat}</div>}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-2xl font-black tracking-widest uppercase underline">KWITANSI</div>
              {d.pakaiNomor && (
                <div className="text-xs font-mono font-semibold text-gray-800 mt-1">
                  NO: {d.nomor}
                </div>
              )}
            </div>
          </div>

          {/* Baris Isian Tradisional */}
          <table className="w-full text-sm border-collapse my-3">
            <tbody>
              <tr>
                <td className="w-40 py-2 align-top font-semibold text-gray-700">Telah Diterima Dari</td>
                <td className="w-4 py-2 align-top">:</td>
                <td className="py-2 border-b border-dotted border-gray-600 font-semibold text-gray-900">
                  {d.kosong ? '' : d.terimaDari}
                </td>
              </tr>
              <tr>
                <td className="py-2 align-top font-semibold text-gray-700">Uang Sejumlah</td>
                <td className="py-2 align-top">:</td>
                <td className="py-2 border-b border-dotted border-gray-600 italic font-semibold text-gray-800 bg-gray-50/50 px-1">
                  {getTerbilang(d)}
                </td>
              </tr>
              <tr>
                <td className="py-2 align-top font-semibold text-gray-700">Untuk Pembayaran</td>
                <td className="py-2 align-top">:</td>
                <td className="py-2 border-b border-dotted border-gray-600 leading-normal">
                  {d.kosong ? '' : d.untuk}
                </td>
              </tr>
              {d.bankInfo && !d.kosong && (
                <tr>
                  <td className="py-1 align-top font-semibold text-gray-700 text-xs">Metode / Rekening</td>
                  <td className="py-1 align-top text-xs">:</td>
                  <td className="py-1 border-b border-dotted border-gray-400 text-xs text-gray-700">
                    {d.metode} — {d.bankInfo}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bawah: Nominal & Tanda Tangan */}
        <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-end">
          <div className="space-y-2">
            <div className="border-2 border-black px-4 py-2 bg-gray-100/80 inline-block">
              <div className="text-[10px] uppercase font-sans font-bold text-gray-600 tracking-wide">
                Jumlah Uang (Rupiah)
              </div>
              <div className="text-xl font-bold font-mono text-black">{getNominal(d)}</div>
            </div>

            {d.statusLunas && (
              <div className="pt-1">
                <LunasBadge rotated={false} />
              </div>
            )}
          </div>

          <div className="text-center w-56 relative">
            <div className="text-xs">
              {d.kota}, {fmtTanggal(d.tanggal)}
            </div>
            <div className="text-xs font-semibold mt-1">Yang Menerima,</div>

            <div className="h-20 flex items-center justify-center relative my-1">
              {d.pakaiMeterai && (
                <div className="absolute left-2 top-2 z-0">
                  <MeteraiBox compact />
                </div>
              )}
              {d.stempel && (
                <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-4 h-16 object-contain pointer-events-none z-10"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
                />
              )}
              {d.ttd && (
                <img
                  src={d.ttd}
                  alt="Tanda Tangan"
                  className="max-h-16 object-contain pointer-events-none z-20"
                  style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
                />
              )}
            </div>

            <div className="font-bold underline text-sm">{d.namaPenerima}</div>
            {d.jabatanPenerima && <div className="text-xs text-gray-600">{d.jabatanPenerima}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 02: Modern Navy
// ============================================================
function RenderModernNavy({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900">
      <div>
        {/* Navy Header Banner */}
        <div className="bg-slate-900 text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-12 bg-white/10 p-1 rounded object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-bold text-lg tracking-wide text-white">{d.instansi}</h1>
                <div className="text-xs text-slate-300">{d.subKop || d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              OFFICIAL RECEIPT
            </span>
            <div className="text-xl font-black mt-1">KWITANSI RESMI</div>
            {d.pakaiNomor && (
              <div className="text-xs font-mono text-slate-300">NO: {d.nomor}</div>
            )}
          </div>
        </div>

        {/* Content Card */}
        <div className="border border-slate-200 border-t-0 p-5 rounded-b-xl bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Sudah Diterima Dari
              </span>
              <div className="text-base font-bold text-slate-800 mt-1">{d.kosong ? '—' : d.terimaDari}</div>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">
                Total Penerimaan
              </span>
              <div className="text-2xl font-black text-blue-900 mt-0.5">{getNominal(d)}</div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 mb-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
              Jumlah Terbilang
            </span>
            <div className="italic text-slate-700 font-medium text-sm leading-relaxed">{getTerbilang(d)}</div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
              Peruntukan Pembayaran
            </span>
            <div className="text-slate-800 text-sm">{d.kosong ? '—' : d.untuk}</div>
          </div>

          {d.bankInfo && !d.kosong && (
            <div className="mt-3 text-xs text-slate-600 flex items-center justify-between border-t border-slate-200 pt-2">
              <span>Metode: <strong className="text-slate-800">{d.metode}</strong></span>
              <span>Rekening: <strong className="font-mono text-slate-800">{d.bankInfo}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Pengesahan */}
      <div className="mt-6 flex justify-between items-end border-t border-slate-200 pt-4">
        <div>
          {d.statusLunas && <LunasBadge rotated={false} />}
          <div className="text-[11px] text-slate-500 mt-2">
            Dokumen ini merupakan bukti pembayaran sah yang diakui.
          </div>
        </div>

        <div className="text-center w-56 relative">
          <div className="text-xs text-slate-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5">Bendahara / Kasir,</div>

          <div className="h-20 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-2 top-2 z-0">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-4 h-16 object-contain pointer-events-none z-10"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-16 object-contain pointer-events-none z-20"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold text-slate-900 underline text-sm">{d.namaPenerima}</div>
          <div className="text-xs text-slate-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 03: Voucher Kas Akuntansi
// ============================================================
function RenderVoucherKas({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 border-2 border-gray-800">
      <div>
        {/* Header Grid */}
        <div className="grid grid-cols-3 border-b-2 border-gray-800 pb-3 items-center">
          <div className="flex items-center gap-2">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-10 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <div className="font-bold text-xs uppercase">{d.instansi}</div>
                <div className="text-[10px] text-gray-600 leading-tight">{d.alamat}</div>
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="font-black text-lg uppercase tracking-wider">BUKTI KAS MASUK</h1>
            <div className="text-[11px] font-semibold text-gray-600">(CASH RECEIPT VOUCHER)</div>
          </div>

          <div className="text-right text-xs">
            <div>No. Voucher: <strong className="font-mono">{d.nomor}</strong></div>
            <div>Tanggal: {fmtTanggal(d.tanggal)}</div>
            <div>Metode: {d.metode}</div>
          </div>
        </div>

        {/* Tabel Data Akuntansi */}
        <div className="my-3 text-xs">
          <div className="border border-gray-700 divide-y divide-gray-700">
            <div className="flex">
              <div className="w-36 bg-gray-100 font-bold p-2 border-r border-gray-700">Diterima Dari</div>
              <div className="flex-1 p-2 font-medium">{d.kosong ? '' : d.terimaDari}</div>
            </div>
            <div className="flex">
              <div className="w-36 bg-gray-100 font-bold p-2 border-r border-gray-700">Uang Sejumlah</div>
              <div className="flex-1 p-2 font-bold font-mono text-sm bg-gray-50">{getNominal(d)}</div>
            </div>
            <div className="flex">
              <div className="w-36 bg-gray-100 font-bold p-2 border-r border-gray-700">Terbilang</div>
              <div className="flex-1 p-2 italic font-serif">{getTerbilang(d)}</div>
            </div>
            <div className="flex">
              <div className="w-36 bg-gray-100 font-bold p-2 border-r border-gray-700">Untuk Keperluan</div>
              <div className="flex-1 p-2 leading-relaxed">{d.kosong ? '' : d.untuk}</div>
            </div>
            {d.bankInfo && (
              <div className="flex">
                <div className="w-36 bg-gray-100 font-bold p-2 border-r border-gray-700">Alokasi Rekening</div>
                <div className="flex-1 p-2 font-mono">{d.bankInfo}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Kolom Pengesahan Akuntansi */}
      <div className="mt-4">
        <div className="grid grid-cols-3 border border-gray-700 text-center text-xs divide-x divide-gray-700">
          <div className="p-2 flex flex-col justify-between h-28">
            <div className="font-bold text-gray-700">Penyetor / Pembayar</div>
            <div className="h-12 flex items-center justify-center">
              {d.ttdPenyetor && (
                <img src={d.ttdPenyetor} alt="ttd" className="max-h-12 object-contain" style={{ transform: `translate(${oPenyetor.x}px, ${oPenyetor.y}px) scale(${fxPenyetor.z})`, opacity: fxPenyetor.a, mixBlendMode: 'multiply' }} />
              )}
            </div>
            <div className="border-t border-gray-400 pt-1 font-semibold">
              {d.namaPenyetor || '( ........................ )'}
            </div>
          </div>

          <div className="p-2 flex flex-col justify-between h-28">
            <div className="font-bold text-gray-700">Kasir / Penerima</div>
            <div className="h-12 flex items-center justify-center relative">
              {d.pakaiMeterai && (
                <div className="absolute left-1">
                  <MeteraiBox compact />
                </div>
              )}
              {d.stempel && (
                <img
                src={d.stempel}
                alt="stempel"
                className="absolute h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
                />
              )}
              {d.ttd && (
                <img
                  src={d.ttd}
                  alt="ttd"
                  className="max-h-12 object-contain"
                  style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
                />
              )}
            </div>
            <div className="border-t border-gray-400 pt-1 font-semibold">{d.namaPenerima}</div>
          </div>

          <div className="p-2 flex flex-col justify-between h-28">
            <div className="font-bold text-gray-700">Mengetahui / Verifikasi</div>
            <div className="h-12 flex items-center justify-center">
              {d.statusLunas && <LunasBadge rotated={false} />}
            </div>
            <div className="border-t border-gray-400 pt-1 font-semibold">Bagian Akuntansi</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 04: Elegan Emerald
// ============================================================
function RenderEleganEmerald({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-serif p-7 bg-white min-h-full flex flex-col justify-between border-4 border-double border-emerald-900 text-gray-900">
      <div>
        {/* Ornamen Header Tengah */}
        <div className="text-center pb-4 border-b border-emerald-800/40">
          {d.pakaiKop && d.logo && (
            <div className="flex justify-center mb-2">
              <img
                src={d.logo}
                alt="Logo"
                className="h-14 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            </div>
          )}
          {d.pakaiKop && (
            <>
              <h1 className="font-bold text-lg uppercase tracking-widest text-emerald-950">{d.instansi}</h1>
              {d.subKop && <div className="text-xs text-emerald-800 italic">{d.subKop}</div>}
              {d.alamat && <div className="text-[10px] text-gray-600">{d.alamat}</div>}
            </>
          )}

          <div className="mt-3 pt-2 border-t border-emerald-800/20 inline-block px-8">
            <div className="text-2xl font-bold tracking-widest text-emerald-900 uppercase">TANDA TERIMA UANG</div>
            {d.pakaiNomor && (
              <div className="text-xs font-mono text-emerald-800 mt-0.5">NOMOR: {d.nomor}</div>
            )}
          </div>
        </div>

        {/* Konten Isian */}
        <div className="my-4 space-y-3 text-sm px-2">
          <div className="flex items-baseline border-b border-emerald-900/20 pb-1">
            <span className="w-44 font-semibold text-emerald-950">Sudah Diterima Dari</span>
            <span className="mr-2">:</span>
            <span className="flex-1 font-bold text-gray-900">{d.kosong ? '' : d.terimaDari}</span>
          </div>

          <div className="flex items-baseline border-b border-emerald-900/20 pb-1">
            <span className="w-44 font-semibold text-emerald-950">Sejumlah Uang</span>
            <span className="mr-2">:</span>
            <span className="flex-1 italic font-medium text-emerald-900 bg-emerald-50/60 px-2 py-0.5 rounded">
              {getTerbilang(d)}
            </span>
          </div>

          <div className="flex items-baseline border-b border-emerald-900/20 pb-1">
            <span className="w-44 font-semibold text-emerald-950">Untuk Pembayaran</span>
            <span className="mr-2">:</span>
            <span className="flex-1 text-gray-800 leading-normal">{d.kosong ? '' : d.untuk}</span>
          </div>
        </div>
      </div>

      {/* Bagian Bawah */}
      <div className="mt-4 pt-3 border-t border-emerald-800/40 flex justify-between items-end px-2">
        <div>
          <div className="border border-emerald-800 bg-emerald-50/40 p-3 rounded">
            <span className="text-[10px] font-sans font-bold text-emerald-800 uppercase tracking-wider block">
              TERBILANG NOMINAL
            </span>
            <div className="text-xl font-bold font-mono text-emerald-950">{getNominal(d)}</div>
          </div>
          {d.statusLunas && (
            <div className="mt-2">
              <span className="inline-block px-3 py-1 bg-emerald-800 text-white font-sans font-bold text-xs tracking-wider rounded">
                LUNAS TERVERIFIKASI
              </span>
            </div>
          )}
        </div>

        <div className="text-center w-56 relative">
          <div className="text-xs">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold mt-1">Penerima Dana,</div>

          <div className="h-20 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-2 top-2 z-0">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-4 h-16 object-contain pointer-events-none z-10"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-16 object-contain pointer-events-none z-20"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm text-emerald-950">{d.namaPenerima}</div>
          <div className="text-xs text-gray-600">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 05: Vintage Mesin Ketik (Retro Office)
// ============================================================
function RenderVintageKantor({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-mono p-6 bg-[#fbf9f4] min-h-full flex gap-4 text-gray-900 border-2 border-dashed border-gray-600 text-xs">
      {d.pakaiBonggol && (
        <div className="w-[170px] shrink-0 pr-3 border-r-2 border-dashed border-gray-500 flex flex-col justify-between">
          <div>
            <div className="font-bold text-[10px] uppercase border-b pb-1 mb-2">POTONGAN KASIR</div>
            <div className="space-y-1">
              <div>NO: {d.nomor}</div>
              <div>DARI: {d.kosong ? '...' : d.terimaDari}</div>
              <div>RP: {getNominal(d)}</div>
              <div>UNTUK: {d.kosong ? '...' : d.untuk}</div>
            </div>
          </div>
          <div className="text-center pt-2 border-t border-gray-400">
            <div>{fmtTanggal(d.tanggal)}</div>
            <div className="mt-6 font-bold">{d.namaPenerima}</div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Header Monospace */}
          <div className="border-b-2 border-gray-800 pb-2 mb-3 flex justify-between items-start">
            <div>
              {d.pakaiKop && d.logo && (
                <img
                  src={d.logo}
                  alt="Logo"
                  className="h-10 object-contain grayscale mb-1"
                  style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
                />
              )}
              {d.pakaiKop && (
                <>
                  <div className="font-bold text-sm">{d.instansi}</div>
                  <div className="text-[10px] text-gray-600">{d.alamat}</div>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="font-bold text-base tracking-widest">[ KWITANSI PEMBAYARAN ]</div>
              {d.pakaiNomor && <div>REG.NO: {d.nomor}</div>}
            </div>
          </div>

          {/* Form Isian Ketik */}
          <div className="space-y-2 leading-relaxed">
            <div className="flex">
              <span className="w-36 font-bold">SUDAH TERIMA DARI</span>
              <span className="mr-2">:</span>
              <span className="flex-1 underline font-bold">{d.kosong ? '....................' : d.terimaDari}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">JUMLAH NOMINAL</span>
              <span className="mr-2">:</span>
              <span className="flex-1 font-bold text-sm bg-gray-200/80 px-2">{getNominal(d)}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">BANYAKNYA UANG</span>
              <span className="mr-2">:</span>
              <span className="flex-1 italic">{getTerbilang(d)}</span>
            </div>
            <div className="flex">
              <span className="w-36 font-bold">UNTUK KEPERLUAN</span>
              <span className="mr-2">:</span>
              <span className="flex-1">{d.kosong ? '....................' : d.untuk}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-end">
          <div>
            {d.statusLunas && <LunasBadge rotated={false} />}
            <div className="text-[9px] text-gray-500 mt-1">Status: Terverifikasi Buku Kas Besar</div>
          </div>

          <div className="text-center w-52 relative">
            <div>{d.kota}, {fmtTanggal(d.tanggal)}</div>
            <div className="font-bold mt-0.5">BENDAHARA/KASIR</div>

            <div className="h-16 flex items-center justify-center relative my-1">
              {d.pakaiMeterai && (
                <div className="absolute left-1">
                  <MeteraiBox compact />
                </div>
              )}
              {d.stempel && (
                <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain pointer-events-none"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
                />
              )}
              {d.ttd && (
                <img
                  src={d.ttd}
                  alt="Tanda Tangan"
                  className="max-h-14 object-contain pointer-events-none"
                  style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
                />
              )}
            </div>

            <div className="font-bold underline">{d.namaPenerima}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 06: Minimalis Bersih
// ============================================================
function RenderMinimalisBersih({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-8 bg-white min-h-full flex flex-col justify-between text-gray-800">
      <div>
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-10 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-gray-950">{d.instansi}</h1>
                <div className="text-xs text-gray-500">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-widest font-semibold text-gray-400 block">Kwitansi</span>
            <span className="font-mono text-xs text-gray-600">{d.nomor}</span>
          </div>
        </div>

        <div className="py-6 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Diterima dari</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{d.kosong ? '—' : d.terimaDari}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Jumlah Pembayaran</div>
            <div className="text-2xl font-black text-gray-950 tracking-tight mt-0.5">{getNominal(d)}</div>
            <div className="text-xs italic text-gray-600 mt-1">{getTerbilang(d)}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Untuk Pembayaran</div>
            <div className="text-sm text-gray-700 leading-relaxed mt-0.5">{d.kosong ? '—' : d.untuk}</div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 flex justify-between items-end">
        <div className="text-xs text-gray-500">
          <div>Tanggal: {fmtTanggal(d.tanggal)}</div>
          <div>Metode: {d.metode}</div>
          {d.bankInfo && <div className="font-mono text-[11px] text-gray-600 mt-0.5">{d.bankInfo}</div>}
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-gray-500">Penerima,</div>
          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-2">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>
          <div className="font-semibold text-sm text-gray-900">{d.namaPenerima}</div>
          <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 07: Bendahara Dinas / Resmi Pemerintah
// ============================================================
function RenderBendaharaDinas({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-serif p-6 bg-white min-h-full flex flex-col justify-between text-gray-900">
      <div>
        {/* Kop Dinas Resmi (Garis Ganda Tebal-Tipis) */}
        {d.pakaiKop && (
          <div className="text-center pb-2 mb-3 border-b-4 border-double border-black">
            <div className="flex justify-center items-center gap-4">
              {d.logo && (
                <img
                  src={d.logo}
                  alt="Logo"
                  className="h-16 object-contain"
                  style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
                />
              )}
              <div>
                <h1 className="font-bold text-base uppercase tracking-wide">{d.instansi}</h1>
                {d.subKop && <div className="text-xs font-semibold">{d.subKop}</div>}
                {d.alamat && <div className="text-[10px] text-gray-700">{d.alamat}</div>}
                {d.kontak && <div className="text-[9px] text-gray-600">{d.kontak}</div>}
              </div>
            </div>
          </div>
        )}

        <div className="text-center my-2">
          <h2 className="font-bold text-base uppercase tracking-widest underline">K W I T A N S I</h2>
          {d.pakaiNomor && <div className="text-xs font-mono">Nomor Registrasi: {d.nomor}</div>}
        </div>

        {/* Tabel Data Resmi */}
        <table className="w-full text-xs border-collapse my-3">
          <tbody>
            <tr>
              <td className="w-36 py-1.5 font-semibold">Telah Diterima Dari</td>
              <td className="w-3 py-1.5">:</td>
              <td className="py-1.5 font-bold border-b border-gray-400">{d.kosong ? '' : d.terimaDari}</td>
            </tr>
            <tr>
              <td className="py-1.5 font-semibold">Uang Sejumlah</td>
              <td className="py-1.5">:</td>
              <td className="py-1.5 font-bold italic bg-gray-50 border-b border-gray-400 px-1">
                {getTerbilang(d)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 font-semibold">Untuk Keperluan</td>
              <td className="py-1.5">:</td>
              <td className="py-1.5 border-b border-gray-400 leading-relaxed">{d.kosong ? '' : d.untuk}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pengesahan Bendahara */}
      <div className="mt-4 pt-2 border-t border-black flex justify-between items-end">
        <div>
          <div className="border border-black px-3 py-1.5 inline-block bg-gray-100">
            <span className="text-[9px] font-sans font-bold block uppercase">Jumlah Yang Diterima</span>
            <span className="font-bold font-mono text-base">{getNominal(d)}</span>
          </div>
          {d.statusLunas && (
            <div className="mt-2">
              <LunasBadge rotated={false} />
            </div>
          )}
        </div>

        <div className="text-center w-60 relative">
          <div className="text-xs">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold">Bendahara Pengeluaran / Kasir,</div>

          <div className="h-18 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-2">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-4 h-16 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-16 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm">{d.namaPenerima}</div>
          <div className="text-xs text-gray-700">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 08: Arsip Ganda (Rangkap 2 Lembar Asli & Salinan)
// ============================================================
function RenderArsipGanda({ d }: TemplateRenderProps) {
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  const MiniReceipt = ({ label, isOriginal }: { label: string; isOriginal: boolean }) => (
    <div className={`p-4 rounded border ${isOriginal ? 'border-blue-900 bg-white' : 'border-gray-400 bg-amber-50/20'} flex flex-col justify-between h-[48%]`}>
      <div className="flex justify-between items-start border-b pb-2">
        <div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${isOriginal ? 'bg-blue-900 text-white' : 'bg-gray-600 text-white'}`}>
            {label}
          </span>
          <div className="font-bold text-xs uppercase text-gray-900 mt-1">{d.instansi}</div>
        </div>
        <div className="text-right">
          <div className="font-black text-sm uppercase">KWITANSI</div>
          <div className="text-[10px] font-mono text-gray-600">No: {d.nomor}</div>
        </div>
      </div>

      <div className="my-2 text-[11px] space-y-1">
        <div><span className="text-gray-500">Diterima dari:</span> <strong className="text-gray-900">{d.kosong ? '...' : d.terimaDari}</strong></div>
        <div><span className="text-gray-500">Nominal:</span> <strong className="font-mono text-blue-900">{getNominal(d)}</strong></div>
        <div className="italic text-[10px] text-gray-700 leading-tight"><span className="text-gray-500">Terbilang:</span> {getTerbilang(d)}</div>
        <div className="line-clamp-2"><span className="text-gray-500">Untuk:</span> {d.kosong ? '...' : d.untuk}</div>
      </div>

      <div className="flex justify-between items-end border-t pt-1 text-[10px]">
        <div>
          <div>{d.metode} {d.bankInfo ? `(${d.bankInfo})` : ''}</div>
          <div className="text-[9px] text-gray-500">Sah jika dibubuhi tanda tangan/cap</div>
        </div>
        <div className="text-center w-40 relative">
          <div>{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="h-9 flex items-center justify-center relative my-0.5">
            {isOriginal && d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="stempel"
                className="absolute right-2 h-10 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="ttd"
                className="max-h-9 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>
          <div className="font-bold underline text-[10px]">{d.namaPenerima}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="font-sans p-5 bg-white min-h-full flex flex-col justify-between gap-3 text-gray-900">
      <MiniReceipt label="LEMBAR 1: ASLI (UNTUK PEMBAYAR)" isOriginal={true} />

      {/* Garis Perforasi Potong */}
      <div className="relative border-b-2 border-dashed border-gray-400 my-1 text-center">
        <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-3 text-[9px] font-mono text-gray-500 flex items-center gap-1">
          <Scissors size={12} /> POTONG DI SINI UNTUK ARSIP KEUANGAN
        </span>
      </div>

      <MiniReceipt label="LEMBAR 2: SALINAN (UNTUK ARSIP KASIR)" isOriginal={false} />
    </div>
  );
}

// ============================================================
// TEMPLATE 09: Monokrom Bank Teller
// ============================================================
function RenderMonokromBank({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-mono p-6 bg-white min-h-full flex flex-col justify-between text-black border-2 border-black text-xs leading-normal">
      <div>
        <div className="flex justify-between items-start border-b-2 border-black pb-2">
          <div>
            <div className="font-black text-sm uppercase">{d.instansi}</div>
            <div className="text-[10px]">{d.alamat}</div>
          </div>
          <div className="text-right">
            <div className="font-black text-base tracking-widest border border-black px-2 py-0.5 inline-block">
              SLIP TANDA TERIMA
            </div>
            <div className="text-[10px] mt-1">REF: {d.nomor}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 my-3 border-b border-black pb-3">
          <div>
            <div className="text-[10px] text-gray-600">PENYETOR / DITERIMA DARI:</div>
            <div className="font-bold text-sm">{d.kosong ? '—' : d.terimaDari}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600">METODE PEMBAYARAN:</div>
            <div className="font-bold">{d.metode}</div>
            {d.bankInfo && <div className="text-[10px]">{d.bankInfo}</div>}
          </div>
        </div>

        <div className="my-2 border border-black p-3 bg-gray-50">
          <div className="text-[10px] font-bold">JUMLAH TRANSAKSI (RUPIAH):</div>
          <div className="text-2xl font-black">{getNominal(d)}</div>
          <div className="text-[11px] italic mt-1 border-t border-gray-300 pt-1">{getTerbilang(d)}</div>
        </div>

        <div className="my-2">
          <span className="text-[10px] text-gray-600 block">KETERANGAN / KEPERLUAN:</span>
          <div className="font-sans text-xs">{d.kosong ? '—' : d.untuk}</div>
        </div>
      </div>

      <div className="border-t-2 border-black pt-3 flex justify-between items-end">
        <div>
          <div className="border border-black p-2 text-[10px] w-48 text-center bg-gray-100">
            [ VALIDASI TELLER / SISTEM ]
            <div className="mt-1 font-bold">LUNAS - DIKREDITKAN</div>
          </div>
        </div>

        <div className="text-center w-52 relative">
          <div>{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="font-bold mt-1">PETUGAS / KASIR</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="ttd"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline">{d.namaPenerima}</div>
          <div className="text-[10px]">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 10: Korporat Tegas (Bilah Samping)
// ============================================================
function RenderKorporatTegas({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex gap-5 text-gray-900">
      {/* Bilah Aksen Kiri */}
      <div className="w-12 bg-blue-900 rounded-l-lg flex flex-col justify-between items-center py-6 text-white shrink-0">
        <ShieldCheck size={24} />
        <div className="rotate-180 writing-vertical-lr text-xs tracking-widest font-bold uppercase opacity-80">
          OFFICIAL SETTLEMENT
        </div>
        <div className="text-[10px] font-mono">HK</div>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start border-b-2 border-blue-900 pb-3">
            <div className="flex items-center gap-3">
              {d.pakaiKop && d.logo && (
                <img
                  src={d.logo}
                  alt="Logo"
                  className="h-12 object-contain"
                  style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
                />
              )}
              {d.pakaiKop && (
                <div>
                  <h1 className="font-bold text-base text-blue-950 uppercase">{d.instansi}</h1>
                  <div className="text-xs text-gray-600">{d.alamat}</div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-blue-900 uppercase">BUKTI PENERIMAAN KAS</div>
              <div className="text-xs font-mono font-semibold text-gray-600">No: {d.nomor}</div>
            </div>
          </div>

          <div className="my-4 grid grid-cols-3 gap-3 text-xs">
            <div className="col-span-2 bg-gray-50 p-3 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Diterima Dari</span>
              <span className="font-bold text-sm text-gray-900">{d.kosong ? '—' : d.terimaDari}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Jumlah Dana</span>
              <span className="font-black text-base text-blue-950">{getNominal(d)}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Terbilang</span>
              <span className="italic font-medium text-gray-800">{getTerbilang(d)}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Uraian Pembayaran</span>
              <span className="text-gray-900">{d.kosong ? '—' : d.untuk}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-300 flex justify-between items-end">
          <div>
            {d.statusLunas && <LunasBadge rotated={false} />}
            <div className="text-[10px] text-gray-500 mt-1">Metode: {d.metode}</div>
          </div>

          <div className="text-center w-52 relative">
            <div className="text-xs text-gray-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
            <div className="text-xs font-bold text-gray-900 mt-0.5">Finance Department,</div>

            <div className="h-16 flex items-center justify-center relative my-1">
              {d.pakaiMeterai && (
                <div className="absolute left-1">
                  <MeteraiBox compact />
                </div>
              )}
              {d.stempel && (
                <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
                />
              )}
              {d.ttd && (
                <img
                  src={d.ttd}
                  alt="Tanda Tangan"
                  className="max-h-14 object-contain"
                  style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
                />
              )}
            </div>

            <div className="font-bold underline text-sm">{d.namaPenerima}</div>
            <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 11: Nota Pembayaran (Rincian Termin / DP)
// ============================================================
function RenderNotaPembayaran({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 relative">
      <div>
        <div className="flex justify-between items-start border-b pb-3">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-12 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-bold text-sm uppercase">{d.instansi}</h1>
                <div className="text-xs text-gray-500">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <h2 className="font-black text-lg uppercase text-gray-900">KWITANSI / NOTA PEMBAYARAN</h2>
            <div className="text-xs font-mono text-gray-600">No: {d.nomor}</div>
            <div className="text-xs text-gray-500">{fmtTanggal(d.tanggal)}</div>
          </div>
        </div>

        <div className="my-3 text-xs flex justify-between bg-gray-50 p-3 rounded">
          <div>
            <span className="text-gray-500 block">Diterima Dari:</span>
            <span className="font-bold text-sm text-gray-900">{d.kosong ? '—' : d.terimaDari}</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 block">Metode Pembayaran:</span>
            <span className="font-semibold">{d.metode}</span>
            {d.bankInfo && <div className="text-[10px] text-gray-600">{d.bankInfo}</div>}
          </div>
        </div>

        {/* Tabel Breakdown */}
        <table className="w-full text-xs border border-gray-300 border-collapse my-3">
          <thead>
            <tr className="bg-gray-100 text-left border-b border-gray-300">
              <th className="p-2 border-r border-gray-300">No</th>
              <th className="p-2 border-r border-gray-300">Deskripsi / Peruntukan</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-2 border-r border-gray-300 text-center w-10">1</td>
              <td className="p-2 border-r border-gray-300">
                <div className="font-medium">{d.kosong ? '—' : d.untuk}</div>
                <div className="text-[10px] italic text-gray-500 mt-0.5">{getTerbilang(d)}</div>
              </td>
              <td className="p-2 text-right font-mono font-bold w-36">{getNominal(d)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={2} className="p-2 text-right border-r border-gray-300">TOTAL PEMBAYARAN</td>
              <td className="p-2 text-right font-mono text-sm text-blue-900">{getNominal(d)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between items-end border-t pt-3">
        <div className="relative">
          {d.statusLunas && (
            <div className="absolute -top-16 left-4 z-0 opacity-85">
              <LunasBadge rotated={true} />
            </div>
          )}
          <div className="text-xs text-gray-500">
            Terima kasih atas pembayaran Anda.
          </div>
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-gray-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold mt-0.5">Penerima Kas,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm">{d.namaPenerima}</div>
          <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 12: Simetris Dua Kolom Rapi
// ============================================================
function RenderDuaKolomRapi({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-7 bg-white min-h-full flex flex-col justify-between text-gray-900">
      <div className="border-b-2 border-indigo-900 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {d.pakaiKop && d.logo && (
            <img
              src={d.logo}
              alt="Logo"
              className="h-11 object-contain"
              style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
            />
          )}
          {d.pakaiKop && (
            <div>
              <h1 className="font-bold text-sm uppercase text-indigo-950">{d.instansi}</h1>
              <div className="text-[11px] text-gray-600">{d.alamat}</div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-indigo-900 tracking-wider">KWITANSI</div>
          <div className="text-xs font-mono text-gray-600">No: {d.nomor}</div>
        </div>
      </div>

      {/* Grid 2 Kolom */}
      <div className="grid grid-cols-2 gap-6 my-4">
        {/* Kolom Kiri: Pihak & Detail */}
        <div className="space-y-3 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Telah Diterima Dari
            </span>
            <div className="text-base font-bold text-gray-900 mt-1">{d.kosong ? '—' : d.terimaDari}</div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Untuk Pembayaran
            </span>
            <div className="text-gray-800 leading-relaxed mt-1">{d.kosong ? '—' : d.untuk}</div>
          </div>

          <div className="text-gray-600 text-[11px]">
            <span>Metode: <strong>{d.metode}</strong></span>
            {d.bankInfo && <div className="font-mono text-gray-700 mt-0.5">{d.bankInfo}</div>}
          </div>
        </div>

        {/* Kolom Kanan: Nominal & Terbilang */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 block">
                Total Diterima
              </span>
              <div className="text-2xl font-black text-indigo-950 font-mono mt-1">{getNominal(d)}</div>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Terbilang</span>
              <div className="italic text-gray-800 font-medium mt-0.5">{getTerbilang(d)}</div>
            </div>
          </div>

          {d.statusLunas && (
            <div className="mt-3">
              <LunasBadge rotated={false} />
            </div>
          )}
        </div>
      </div>

      {/* Footer Pengesahan */}
      <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
        <div className="text-xs text-gray-500">
          Bukti pembayaran sah secara hukum.
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-gray-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold mt-0.5">Penerima,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm">{d.namaPenerima}</div>
          <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 13: Badge Lunas Prominen
// ============================================================
function RenderBadgeLunas({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 border-4 border-amber-500/80 rounded-xl relative overflow-hidden">
      {/* Background Watermark Stamp */}
      <div className="absolute right-12 top-16 opacity-10 pointer-events-none select-none">
        <div className="border-8 border-red-600 text-red-600 font-black text-6xl px-12 py-6 rounded-2xl rotate-[-20deg]">
          LUNAS
        </div>
      </div>

      <div>
        <div className="flex justify-between items-start border-b-2 border-amber-500/40 pb-3">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-12 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-extrabold text-base uppercase text-gray-900">{d.instansi}</h1>
                <div className="text-xs text-gray-600">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="bg-amber-500 text-white font-black text-xs px-3 py-1 rounded uppercase tracking-wider">
              TANDA TERIMA SAH
            </span>
            <div className="text-lg font-black mt-1">KWITANSI RESMI</div>
            <div className="text-xs font-mono text-gray-600">NO: {d.nomor}</div>
          </div>
        </div>

        <div className="my-4 space-y-3 text-xs">
          <div className="flex border-b pb-2">
            <span className="w-36 font-bold text-gray-500 uppercase">Telah Terima Dari</span>
            <span className="mr-2">:</span>
            <span className="flex-1 font-bold text-sm text-gray-900">{d.kosong ? '' : d.terimaDari}</span>
          </div>

          <div className="flex border-b pb-2">
            <span className="w-36 font-bold text-gray-500 uppercase">Uang Sejumlah</span>
            <span className="mr-2">:</span>
            <span className="flex-1 italic font-serif text-sm bg-amber-50 px-2 py-0.5 rounded text-amber-950">
              {getTerbilang(d)}
            </span>
          </div>

          <div className="flex border-b pb-2">
            <span className="w-36 font-bold text-gray-500 uppercase">Untuk Pembayaran</span>
            <span className="mr-2">:</span>
            <span className="flex-1 text-gray-800 leading-normal">{d.kosong ? '' : d.untuk}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t-2 border-amber-500/40 flex justify-between items-end">
        <div>
          <div className="border-2 border-amber-500 bg-amber-50/70 p-3 rounded-lg inline-block">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">NOMINAL TERTERA</div>
            <div className="text-2xl font-black font-mono text-amber-950">{getNominal(d)}</div>
          </div>
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-gray-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-bold text-gray-800 mt-0.5">Penerima Pembayaran,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm">{d.namaPenerima}</div>
          <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 14: Eksekutif Charcoal & Emas (Aksen Emas)
// ============================================================
function RenderAksenEmas({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-serif p-7 bg-[#1c1c1e] text-amber-100 min-h-full flex flex-col justify-between border-2 border-amber-500/60">
      <div>
        <div className="flex justify-between items-start border-b border-amber-500/40 pb-3">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-12 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-bold text-base tracking-wider uppercase text-amber-300">{d.instansi}</h1>
                <div className="text-xs text-amber-200/70">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-amber-400 tracking-widest uppercase">KWITANSI EKSEKUTIF</div>
            <div className="text-xs font-mono text-amber-200/80">NO: {d.nomor}</div>
          </div>
        </div>

        <div className="my-5 space-y-3 text-sm">
          <div className="flex border-b border-amber-500/20 pb-2">
            <span className="w-40 font-semibold text-amber-300">Telah Diterima Dari</span>
            <span className="mr-2 text-amber-400">:</span>
            <span className="flex-1 font-bold text-white">{d.kosong ? '' : d.terimaDari}</span>
          </div>
          <div className="flex border-b border-amber-500/20 pb-2">
            <span className="w-40 font-semibold text-amber-300">Uang Sejumlah</span>
            <span className="mr-2 text-amber-400">:</span>
            <span className="flex-1 italic text-amber-200">{getTerbilang(d)}</span>
          </div>
          <div className="flex border-b border-amber-500/20 pb-2">
            <span className="w-40 font-semibold text-amber-300">Untuk Pembayaran</span>
            <span className="mr-2 text-amber-400">:</span>
            <span className="flex-1 text-amber-100/90 leading-normal">{d.kosong ? '' : d.untuk}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-500/40 flex justify-between items-end">
        <div>
          <div className="border border-amber-500 bg-amber-950/40 px-4 py-2 rounded">
            <span className="text-[10px] font-sans font-bold text-amber-400 uppercase tracking-widest block">
              NOMINAL TRANSAKSI
            </span>
            <div className="text-2xl font-black font-mono text-amber-300">{getNominal(d)}</div>
          </div>
          {d.statusLunas && (
            <div className="mt-2 text-xs font-sans font-bold text-amber-400 border border-amber-400/50 px-3 py-1 inline-block uppercase">
              STATUS: LUNAS DIVERIFIKASI
            </div>
          )}
        </div>

        <div className="text-center w-56 relative">
          <div className="text-xs text-amber-200/80">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold mt-0.5 text-amber-300">Penerima Kuasa,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain brightness-150"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm text-white">{d.namaPenerima}</div>
          <div className="text-xs text-amber-200/70">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 15: Kontemporer Kartu Neomorphic
// ============================================================
function RenderKontemporerKartu({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-slate-100 min-h-full flex flex-col justify-between text-slate-800">
      <div>
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-slate-200 mb-4">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-10 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-bold text-sm text-slate-900 uppercase">{d.instansi}</h1>
                <div className="text-xs text-slate-500">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              KWITANSI ELEKTRONIK
            </span>
            <div className="text-xs font-mono text-slate-500 mt-1">NO: {d.nomor}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Diterima Dari
            </span>
            <div className="text-base font-bold text-slate-900 mt-1">{d.kosong ? '—' : d.terimaDari}</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-indigo-200 tracking-wider">Jumlah</span>
            <div className="text-xl font-black font-mono">{getNominal(d)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-2 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Terbilang</span>
            <div className="italic text-slate-700 font-medium">{getTerbilang(d)}</div>
          </div>
          <div className="border-t border-slate-100 pt-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Peruntukan</span>
            <div className="text-slate-800">{d.kosong ? '—' : d.untuk}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex justify-between items-end">
        <div className="text-xs text-slate-500">
          <div>Metode: <strong className="text-slate-700">{d.metode}</strong></div>
          {d.bankInfo && <div className="font-mono text-[11px] text-slate-600 mt-0.5">{d.bankInfo}</div>}
          {d.statusLunas && (
            <div className="mt-2">
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                TERKONFIRMASI LUNAS
              </span>
            </div>
          )}
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-slate-500">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Penerima,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm text-slate-900">{d.namaPenerima}</div>
          <div className="text-xs text-slate-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 16: Grid Akuntansi (Ledger Table)
// ============================================================
function RenderGridAkuntansi({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 border-2 border-slate-700 text-xs">
      <div>
        <div className="flex justify-between items-center border-b-2 border-slate-700 pb-2 mb-2">
          <div className="flex items-center gap-2">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-9 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <span className="font-bold uppercase text-xs">{d.instansi}</span>
                <span className="text-[10px] text-gray-500 block">{d.alamat}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="font-black text-sm uppercase">BUKU JURNAL PENERIMAAN KAS</span>
            <div className="font-mono text-[11px]">KWT NO: {d.nomor}</div>
          </div>
        </div>

        {/* Tabel Kisi Grid Akuntansi */}
        <table className="w-full border-collapse border border-slate-600 my-2">
          <tbody>
            <tr className="border-b border-slate-600">
              <td className="w-8 p-1.5 bg-slate-100 text-center font-bold border-r border-slate-600">01</td>
              <td className="w-36 p-1.5 font-bold bg-slate-50 border-r border-slate-600">Nama Penyetor</td>
              <td className="p-1.5 font-semibold">{d.kosong ? '' : d.terimaDari}</td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 bg-slate-100 text-center font-bold border-r border-slate-600">02</td>
              <td className="p-1.5 font-bold bg-slate-50 border-r border-slate-600">Nominal Angka</td>
              <td className="p-1.5 font-black font-mono text-sm bg-blue-50/50">{getNominal(d)}</td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 bg-slate-100 text-center font-bold border-r border-slate-600">03</td>
              <td className="p-1.5 font-bold bg-slate-50 border-r border-slate-600">Nominal Terbilang</td>
              <td className="p-1.5 italic font-serif">{getTerbilang(d)}</td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 bg-slate-100 text-center font-bold border-r border-slate-600">04</td>
              <td className="p-1.5 font-bold bg-slate-50 border-r border-slate-600">Keterangan Transaksi</td>
              <td className="p-1.5 leading-relaxed">{d.kosong ? '' : d.untuk}</td>
            </tr>
            <tr>
              <td className="p-1.5 bg-slate-100 text-center font-bold border-r border-slate-600">05</td>
              <td className="p-1.5 font-bold bg-slate-50 border-r border-slate-600">Metode & Rekening</td>
              <td className="p-1.5 font-mono text-[11px]">{d.metode} — {d.bankInfo || 'Kas Tunai'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-slate-700 pt-3 flex justify-between items-end">
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500">Posting ke Akun Kas/Bank: <strong>DEBIT</strong></div>
          {d.statusLunas && <LunasBadge rotated={false} />}
        </div>

        <div className="text-center w-52 relative">
          <div>{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="font-bold text-[11px] mt-0.5">Petugas Keuangan,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-xs">{d.namaPenerima}</div>
          <div className="text-[10px] text-gray-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 17: Arsitektur & Teknis
// ============================================================
function RenderArsitekturTeknis({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-mono p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 border border-gray-400 relative">
      {/* Corner Crosshairs */}
      <div className="absolute top-1 left-1 text-[8px] text-gray-400 font-mono">+ 0.00</div>
      <div className="absolute top-1 right-1 text-[8px] text-gray-400 font-mono">+ 100.0</div>

      <div>
        <div className="flex justify-between items-start border-b border-gray-400 pb-2">
          <div>
            <div className="text-[10px] text-gray-500">SPEC: PAYMENT RECEIPT DOC</div>
            <div className="font-bold text-sm uppercase">{d.instansi}</div>
          </div>
          <div className="text-right">
            <div className="font-black text-sm">DOC NO. {d.nomor}</div>
            <div className="text-[10px] text-gray-500">DATE: {d.tanggal}</div>
          </div>
        </div>

        <div className="my-4 grid grid-cols-4 gap-2 text-xs">
          <div className="border border-gray-300 p-2 col-span-3">
            <span className="text-[9px] text-gray-400 block">ENTITY / PAYER:</span>
            <span className="font-bold text-sm">{d.kosong ? '—' : d.terimaDari}</span>
          </div>
          <div className="border border-gray-300 p-2">
            <span className="text-[9px] text-gray-400 block">CHANNEL:</span>
            <span className="font-semibold">{d.metode}</span>
          </div>
        </div>

        <div className="border border-gray-300 p-3 bg-gray-50 my-2">
          <div className="text-[9px] text-gray-400">AMOUNT CERTIFIED:</div>
          <div className="text-xl font-black">{getNominal(d)}</div>
          <div className="text-[10px] italic text-gray-600 mt-1">{getTerbilang(d)}</div>
        </div>

        <div className="border border-gray-300 p-2 text-xs my-2">
          <span className="text-[9px] text-gray-400 block">SCOPE OF PAYMENT:</span>
          <span>{d.kosong ? '—' : d.untuk}</span>
        </div>
      </div>

      <div className="border-t border-gray-400 pt-3 flex justify-between items-end text-xs">
        <div>
          <div className="text-[9px] font-mono text-gray-500">BARCODE SIGNATURE</div>
          <div className="font-mono tracking-widest text-xs mt-0.5">||||| | |||| ||| |||| | ||</div>
          {d.statusLunas && (
            <div className="mt-1 font-bold text-emerald-700 text-[10px]">[ STATUS: VERIFIED ]</div>
          )}
        </div>

        <div className="text-center w-52 relative">
          <div className="text-[10px]">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="font-bold text-[10px]">AUTHORIZED RECEIVER</div>

          <div className="h-14 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="stempel"
                className="absolute right-2 h-12 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="ttd"
                className="max-h-12 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-xs">{d.namaPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 18: Serah Terima Dana (Berita Acara Bilateral)
// ============================================================
function RenderSerahTerimaDana({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-serif p-7 bg-white min-h-full flex flex-col justify-between text-gray-900 leading-normal">
      <div>
        <div className="text-center border-b-2 border-black pb-3 mb-3">
          <h1 className="font-bold text-base uppercase tracking-wider">BERITA ACARA SERAH TERIMA DANA</h1>
          <div className="text-xs font-mono">Nomor: {d.nomor}</div>
        </div>

        <div className="text-xs space-y-2">
          <p>Pada hari ini, bertempat di <strong>{d.kota}</strong>, telah diserahterimakan sejumlah dana dengan rincian sebagai berikut:</p>

          <table className="w-full border-collapse my-2">
            <tbody>
              <tr>
                <td className="w-36 py-1 font-semibold text-gray-700">Pihak Yang Menyerahkan</td>
                <td className="w-3">:</td>
                <td className="py-1 font-bold">{d.kosong ? '..........' : d.terimaDari}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-gray-700">Pihak Yang Menerima</td>
                <td className="w-3">:</td>
                <td className="py-1 font-bold">{d.instansi} (up. {d.namaPenerima})</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-gray-700">Jumlah Dana</td>
                <td className="w-3">:</td>
                <td className="py-1 font-bold font-mono text-sm">{getNominal(d)}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold text-gray-700">Terbilang</td>
                <td className="w-3">:</td>
                <td className="py-1 italic bg-gray-50 px-1">{getTerbilang(d)}</td>
              </tr>
              <tr>
                <td className="py-1 align-top font-semibold text-gray-700">Keperluan Pembayaran</td>
                <td className="w-3 align-top">:</td>
                <td className="py-1 leading-relaxed">{d.kosong ? '..........' : d.untuk}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-[11px] text-gray-600">
            Demikian tanda terima serah terima ini dibuat dengan sebenarnya dalam keadaan sadar dan mengikat kedua belah pihak.
          </p>
        </div>
      </div>

      {/* Tanda Tangan Dua Pihak (Bilateral) */}
      <div className="mt-4 pt-3 border-t border-black grid grid-cols-2 text-center text-xs">
        <div>
          <div className="font-semibold">Yang Menyerahkan,</div>
          <div className="h-16 flex items-center justify-center">
            {d.ttdPenyetor && (
              <img src={d.ttdPenyetor} alt="ttd penyetor" className="max-h-14 object-contain" style={{ transform: `translate(${oPenyetor.x}px, ${oPenyetor.y}px) scale(${fxPenyetor.z})`, opacity: fxPenyetor.a, mixBlendMode: 'multiply' }} />
            )}
          </div>
          <div className="font-bold underline">{d.namaPenyetor || d.terimaDari}</div>
          <div className="text-[10px] text-gray-600">{d.jabatanPenyetor || 'Penyetor'}</div>
        </div>

        <div className="relative">
          <div className="font-semibold">Yang Menerima,</div>
          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-2">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="stempel"
                className="absolute right-4 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="ttd"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>
          <div className="font-bold underline">{d.namaPenerima}</div>
          <div className="text-[10px] text-gray-600">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 19: Banner Kop Lebar Atas
// ============================================================
function RenderKopLebarResmi({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans bg-white min-h-full flex flex-col justify-between text-gray-900">
      {/* Banner Lebar Full */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {d.pakaiKop && d.logo && (
            <img
              src={d.logo}
              alt="Logo"
              className="h-14 bg-white p-1 rounded object-contain"
              style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
            />
          )}
          {d.pakaiKop && (
            <div>
              <h1 className="font-black text-lg uppercase tracking-wide">{d.instansi}</h1>
              <div className="text-xs text-blue-200">{d.subKop}</div>
              <div className="text-[10px] text-blue-300 mt-0.5">{d.alamat}</div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-widest uppercase">KWITANSI</div>
          <div className="text-xs font-mono text-blue-200">NO. {d.nomor}</div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div className="space-y-4 my-2 text-sm">
          <div className="flex border-b border-gray-200 pb-2">
            <span className="w-40 font-bold text-gray-500 uppercase text-xs">Diterima Dari</span>
            <span className="mr-2">:</span>
            <span className="flex-1 font-bold text-base text-gray-900">{d.kosong ? '' : d.terimaDari}</span>
          </div>

          <div className="flex border-b border-gray-200 pb-2">
            <span className="w-40 font-bold text-gray-500 uppercase text-xs">Uang Sejumlah</span>
            <span className="mr-2">:</span>
            <span className="flex-1 italic font-serif text-sm bg-blue-50 px-3 py-1 rounded text-blue-950">
              {getTerbilang(d)}
            </span>
          </div>

          <div className="flex border-b border-gray-200 pb-2">
            <span className="w-40 font-bold text-gray-500 uppercase text-xs">Untuk Pembayaran</span>
            <span className="mr-2">:</span>
            <span className="flex-1 text-gray-800 leading-relaxed">{d.kosong ? '' : d.untuk}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex justify-between items-end">
          <div>
            <div className="border border-blue-900 bg-blue-50/50 p-3 rounded-lg inline-block">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                JUMLAH DITERIMA
              </span>
              <span className="text-2xl font-black font-mono text-blue-950">{getNominal(d)}</span>
            </div>
          </div>

          <div className="text-center w-52 relative">
            <div className="text-xs text-gray-600">{d.kota}, {fmtTanggal(d.tanggal)}</div>
            <div className="text-xs font-semibold mt-0.5">Bendahara,</div>

            <div className="h-16 flex items-center justify-center relative my-1">
              {d.pakaiMeterai && (
                <div className="absolute left-1">
                  <MeteraiBox compact />
                </div>
              )}
              {d.stempel && (
                <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
                />
              )}
              {d.ttd && (
                <img
                  src={d.ttd}
                  alt="Tanda Tangan"
                  className="max-h-14 object-contain"
                  style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
                />
              )}
            </div>

            <div className="font-bold underline text-sm">{d.namaPenerima}</div>
            <div className="text-xs text-gray-500">{d.jabatanPenerima}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEMPLATE 20: Digital Fintech Modern (QR & Barcode)
// ============================================================
function RenderDigitalModern({ d }: TemplateRenderProps) {
  const oLogo = getOffset(d.posisi, 'logo');
  const fxLogo = fxOf(oLogo, 'logo');
  const oTtd = getOffset(d.posisi, 'ttd');
  const fxTtd = fxOf(oTtd, 'ttd');
  const oStempel = getOffset(d.posisi, 'stempel');
  const fxStempel = fxOf(oStempel, 'stempel');

  return (
    <div className="font-sans p-6 bg-white min-h-full flex flex-col justify-between text-gray-900 border border-slate-200 rounded-2xl shadow-xs">
      <div>
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {d.pakaiKop && d.logo && (
              <img
                src={d.logo}
                alt="Logo"
                className="h-11 object-contain"
                style={{ transform: `translate(${oLogo.x}px, ${oLogo.y}px) scale(${fxLogo.z})`, opacity: fxLogo.a }}
              />
            )}
            {d.pakaiKop && (
              <div>
                <h1 className="font-bold text-sm text-slate-900 uppercase">{d.instansi}</h1>
                <div className="text-xs text-slate-500">{d.alamat}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                <CheckCircle size={14} /> DIVERIFIKASI
              </div>
              <div className="text-xs font-mono text-slate-500">ID: {d.nomor}</div>
            </div>
            <div className="p-1 bg-slate-100 rounded border border-slate-200">
              <QrCode size={34} className="text-slate-800" />
            </div>
          </div>
        </div>

        <div className="my-4 grid grid-cols-3 gap-3">
          <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Pihak Pembayar
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">{d.kosong ? '—' : d.terimaDari}</div>
          </div>

          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Transaksi</span>
            <div className="text-lg font-black font-mono text-emerald-400">{getNominal(d)}</div>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Terbilang Rupiah
            </span>
            <div className="italic text-slate-700 font-medium">{getTerbilang(d)}</div>
          </div>
          <div className="border-t border-slate-200 pt-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
              Tujuan Pembayaran
            </span>
            <div className="text-slate-800">{d.kosong ? '—' : d.untuk}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-end text-xs">
        <div className="space-y-1 text-slate-500">
          <div>Metode: <strong className="text-slate-800">{d.metode}</strong></div>
          {d.bankInfo && <div className="font-mono text-[11px]">{d.bankInfo}</div>}
          <div className="text-[10px] text-slate-400">Tanda terima ini terverifikasi secara elektronik.</div>
        </div>

        <div className="text-center w-52 relative">
          <div className="text-xs text-slate-500">{d.kota}, {fmtTanggal(d.tanggal)}</div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5">Petugas Otorisasi,</div>

          <div className="h-16 flex items-center justify-center relative my-1">
            {d.pakaiMeterai && (
              <div className="absolute left-1">
                <MeteraiBox compact />
              </div>
            )}
            {d.stempel && (
              <img
                src={d.stempel}
                alt="Stempel"
                className="absolute right-2 h-14 object-contain"
                style={{ transform: `translate(${oStempel.x}px, ${oStempel.y}px) scale(${fxStempel.z})`, opacity: fxStempel.a, mixBlendMode: 'multiply' }}
              />
            )}
            {d.ttd && (
              <img
                src={d.ttd}
                alt="Tanda Tangan"
                className="max-h-14 object-contain"
                style={{ transform: `translate(${oTtd.x}px, ${oTtd.y}px) scale(${fxTtd.z})`, opacity: fxTtd.a, mixBlendMode: 'multiply' }}
              />
            )}
          </div>

          <div className="font-bold underline text-sm text-slate-900">{d.namaPenerima}</div>
          <div className="text-xs text-slate-500">{d.jabatanPenerima}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DAFTAR 20 TEMPLATE TATA LETAK RESMI
// ============================================================
export const TEMPLATES: KwitansiTemplate[] = [
  { id: 'klasik-buku', name: '01. Klasik Buku Kasir', desc: 'Tradisional dengan bonggol kasir, garis titik-titik isian & meterai', render: RenderKlasikBuku },
  { id: 'modern-navy', name: '02. Modern Navy', desc: 'Banner biru tua kontemporer, kartu nominal berbayang & layout bersih', render: RenderModernNavy },
  { id: 'voucher-kas', name: '03. Voucher Kas Akuntansi', desc: 'Format voucher kas masuk debit/kredit, verifikasi kasir 3 kolom', render: RenderVoucherKas },
  { id: 'elegan-emerald', name: '04. Elegan Emerald', desc: 'Nuansa hijau zamrud berbingkai ganda, logo tengah & font serif mewah', render: RenderEleganEmerald },
  { id: 'vintage-kantor', name: '05. Vintage Mesin Ketik', desc: 'Huruf ketik mono typewriter, bingkai kotak jadul & stempel retro', render: RenderVintageKantor },
  { id: 'minimalis-bersih', name: '06. Minimalis Bersih', desc: 'Ultra-bersih tanpa bingkai berlebih, fokus utama ke nominal angka', render: RenderMinimalisBersih },
  { id: 'bendahara-dinas', name: '07. Bendahara Dinas Resmi', desc: 'Kop dinas garis ganda, nomor register kas & kolom NIP bendahara', render: RenderBendaharaDinas },
  { id: 'arsip-ganda', name: '08. Arsip Ganda Rangkap 2', desc: 'Dua kwitansi dalam 1 halaman: Lembar 1 Pembayar & Lembar 2 Arsip', render: RenderArsipGanda },
  { id: 'monokrom-bank', name: '09. Monokrom Bank Teller', desc: 'Slip transaksi bank hitam putih padat, hemat tinta & presisi tinggi', render: RenderMonokromBank },
  { id: 'korporat-tegas', name: '10. Korporat Bilah Samping', desc: 'Bilah warna vertikal kiri, logo korporat besar & tabel spesifikasi', render: RenderKorporatTegas },
  { id: 'nota-pembayaran', name: '11. Nota Rincian Termin', desc: 'Kwitansi dengan tabel breakdown pembayaran & stempel LUNAS diagonal', render: RenderNotaPembayaran },
  { id: 'dua-kolom-rapi', name: '12. Simetris Dua Kolom', desc: 'Kolom pembayar di kiri dan kartu nominal + pengesahan di kanan', render: RenderDuaKolomRapi },
  { id: 'badge-lunas', name: '13. Badge Lunas Prominen', desc: 'Stempel cap LUNAS miring bertekstur, kotak nominal emas kontras', render: RenderBadgeLunas },
  { id: 'aksen-emas', name: '14. Eksekutif Charcoal & Emas', desc: 'Palet gelap arang berpadu garis emas premium transaksi bernilai tinggi', render: RenderAksenEmas },
  { id: 'kontemporer-kartu', name: '15. Kontemporer Neomorphic', desc: 'Kartu-kartu mengambang rounded memisahkan identitas dan nominal', render: RenderKontemporerKartu },
  { id: 'grid-akuntansi', name: '16. Grid Kisi Akuntansi', desc: 'Setiap atribut masuk ke dalam kisi tabel akuntansi dengan nomor baris', render: RenderGridAkuntansi },
  { id: 'arsitektur-teknis', name: '17. Arsitektur & Teknis', desc: 'Tipografi teknis presisi, garis pandu ukuran tipis & barcode visual', render: RenderArsitekturTeknis },
  { id: 'serah-terima-dana', name: '18. Berita Acara Serah Terima', desc: 'Format berita acara serah terima dana, tanda tangan bilateral 2 pihak', render: RenderSerahTerimaDana },
  { id: 'kop-lebar-resmi', name: '19. Banner Kop Lebar Atas', desc: 'Header banner penuh di atas dengan identitas lembaga membentang', render: RenderKopLebarResmi },
  { id: 'digital-modern', name: '20. Digital Fintech Modern', desc: 'Format tanda terima digital lengkap dengan QR verifikasi & status chip', render: RenderDigitalModern },
];

console.assert(
  TEMPLATES.length === 20 && new Set(TEMPLATES.map((t) => t.id)).size === 20,
  'kwitansi: 20 template unik',
);
