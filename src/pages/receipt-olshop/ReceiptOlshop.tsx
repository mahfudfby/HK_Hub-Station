import OrderPage, { BASE, HUMANIST, MONO, SANS, SERIF, checkTemplates, tpl, type Cfg } from './OrderDoc';

// Receipt Pesanan Toko Online: bukti pemesanan/pembelian dari toko online milik pengguna.
// Menu berdiri sendiri; mesin tampilan & editor bersama ada di ./OrderDoc (dipakai juga oleh Invoice Toko Online).

const TEMPLATES = [
  tpl('bukti', 'Bukti Pembelian — logo kiri, garis tipis', SANS, 'left', 'lines', 'right', 'list', 'none'),
  tpl('bukti-kisi', 'Bukti Kisi — tabel kisi, hitam-putih', SANS, 'left', 'grid', 'right', 'box', 'line', true),
  tpl('pita', 'Pita Warna — bilah total', SANS, 'band', 'lines', 'bar', 'list', 'none'),
  tpl('tengah', 'Tengah — tabel belang, ringkasan kotak', HUMANIST, 'center', 'zebra', 'box', 'list', 'tint'),
  tpl('struk', 'Struk Ketik — huruf mesin ketik', MONO, 'center', 'compact', 'box', 'list', 'line', true),
  tpl('bilah', 'Bilah Samping — strip warna kiri', SANS, 'side', 'lines', 'right', 'cols', 'none'),
  tpl('dua-kotak', 'Dua Kotak — kop & judul berdampingan', SANS, 'split', 'zebra', 'right', 'box', 'line'),
  tpl('kartu', 'Kartu Produk — bilah total', HUMANIST, 'left', 'cards', 'bar', 'cols', 'tint'),
  tpl('kanan', 'Logo Kanan — kisi, ringkasan kotak', SANS, 'right', 'grid', 'box', 'list', 'none'),
  tpl('resmi', 'Resmi — serif, hitam-putih', SERIF, 'center', 'lines', 'right', 'box', 'line', true),
  tpl('belang', 'Belang — bilah total, kotak bayar', HUMANIST, 'left', 'zebra', 'bar', 'box', 'none'),
  tpl('pita-kisi', 'Pita & Kisi — metode bayar berjajar', SANS, 'band', 'grid', 'right', 'cols', 'line'),
  tpl('bilah-kartu', 'Bilah & Kartu — ringkasan kotak', SANS, 'side', 'cards', 'box', 'list', 'tint'),
  tpl('dua-ringkas', 'Dua Kotak Ringkas — tabel rapat', SANS, 'split', 'compact', 'bar', 'list', 'none'),
  tpl('kanan-kartu', 'Kanan & Kartu', HUMANIST, 'right', 'cards', 'right', 'box', 'tint'),
  tpl('tengah-kisi', 'Tengah & Kisi — bilah total', SANS, 'center', 'grid', 'bar', 'cols', 'line'),
  tpl('minimal', 'Minimal — rapat, hitam-putih', SANS, 'left', 'compact', 'right', 'list', 'none', true),
  tpl('pita-belang', 'Pita & Belang — ringkasan kotak', HUMANIST, 'band', 'zebra', 'box', 'box', 'tint'),
  tpl('arsip', 'Arsip — strip kiri, kisi, hitam-putih', SERIF, 'side', 'grid', 'bar', 'list', 'line', true),
  tpl('elegan', 'Elegan — serif, logo kanan', SERIF, 'right', 'lines', 'box', 'cols', 'tint'),
];
checkTemplates(TEMPLATES, 'receipt-olshop');

const CFG: Cfg = {
  kind: 'receipt', slug: 'receipt-olshop', title: 'Receipt Pesanan Toko Online',
  noFmt: 'RCP/{yyyy}{mm}{dd}/{A3}/{n4}{n4}', noLabel: 'No.', templates: TEMPLATES,
  defaults: {
    ...BASE, gaya: TEMPLATES[0].id, judul: 'BUKTI PEMBELIAN', resi: 'JX0012345678',
    catatanKecil: '*Harga sudah termasuk pajak yang berlaku.',
    penutup: 'Struk ini berfungsi sebagai bukti pemesanan dan/atau pembelian.',
  },
};

export default function ReceiptOlshop() {
  return <OrderPage cfg={CFG} />;
}
