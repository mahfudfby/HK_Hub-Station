import type { Offsets } from '../../shared/components/PositionPad';
import { randomDocNo } from '../../shared/lib/docNumber';

export interface KwitansiData {
  gaya: string;
  paper: string;
  landscape: boolean;
  skala: number;
  posisi: Offsets;
  pakaiNomor: boolean;
  kosong: boolean;
  accentColor: string;

  // Kop Lembaga / Perusahaan
  pakaiKop: boolean;
  logo: string;
  instansi: string;
  subKop: string;
  alamat: string;
  kontak: string;

  // Transaksi Kwitansi
  nomor: string;
  terimaDari: string;
  jumlah: string;
  terbilangCustom: boolean;
  terbilangManual: string;
  untuk: string;
  kota: string;
  tanggal: string;
  metode: string;
  bankInfo: string;
  statusLunas: boolean;

  // Pengesahan & Legalitas
  namaPenerima: string;
  jabatanPenerima: string;
  ttd: string;
  stempel: string;
  pakaiMeterai: boolean;
  pakaiBonggol: boolean;

  // Pihak Pembayar / Penyetor (opsional untuk serah terima)
  namaPenyetor: string;
  jabatanPenyetor: string;
  ttdPenyetor: string;
}

export const STORAGE_KEY = 'kwitansi:v1';
export const USER_KEYS = [
  'logo',
  'instansi',
  'subKop',
  'alamat',
  'kontak',
  'kota',
  'namaPenerima',
  'jabatanPenerima',
  'bankInfo',
  'posisi',
] as const;

export const METODE_BAYAR = [
  'Tunai / Cash',
  'Transfer Bank',
  'Cek / Bilyet Giro',
  'QRIS / Uang Elektronik',
  'Kartu Debit / Kredit',
];

const isoToday = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_KWITANSI: KwitansiData = {
  gaya: 'klasik-buku',
  paper: 'A5',
  landscape: true,
  skala: 100,
  posisi: {},
  pakaiNomor: true,
  kosong: false,
  accentColor: '#1e40af',

  pakaiKop: true,
  logo: '',
  instansi: 'PT NUSANTARA JAYA ABADI',
  subKop: 'Solusi Pengadaan & Perdagangan Umum',
  alamat: 'Jl. Jenderal Sudirman Kav. 45-46, Karet Semanggi, Jakarta Selatan 12190',
  kontak: 'Telp: (021) 520-8910 | Email: keuangan@nusantarajaya.co.id',

  nomor: randomDocNo('KWT/{yyyy}/{rom}/{n3}'),
  terimaDari: 'CV Berkah Mitra Sejahtera',
  jumlah: '17500000',
  terbilangCustom: false,
  terbilangManual: '',
  untuk: 'Pembayaran Pelunasan Pengadaan 5 Unit Komputer Kantor & Instalasi Jaringan LAN',
  kota: 'Jakarta',
  tanggal: isoToday(),
  metode: 'Transfer Bank',
  bankInfo: 'BCA No. Rek. 873-501-9283 a.n PT NUSANTARA JAYA ABADI',
  statusLunas: true,

  namaPenerima: 'Hendra Setiawan, S.E.',
  jabatanPenerima: 'Head of Finance & Treasury',
  ttd: '',
  stempel: '',
  pakaiMeterai: true,
  pakaiBonggol: true,

  namaPenyetor: 'Rahmat Hidayat',
  jabatanPenyetor: 'Bagian Logistik & Pembelian',
  ttdPenyetor: '',
};
