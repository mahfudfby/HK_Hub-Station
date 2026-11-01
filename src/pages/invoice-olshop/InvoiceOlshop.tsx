import OrderPage, { BASE, HUMANIST, MONO, SANS, SERIF, checkTemplates, tpl, type Cfg } from '../receipt-olshop/OrderDoc';

// Invoice Toko Online: tagihan dari toko online milik pengguna ke pembeli.
// Menu berdiri sendiri (terpisah dari "Custom Invoices Toko Online"); mesin tampilan & editor dari ../receipt-olshop/OrderDoc.

const TEMPLATES = [
  tpl('klasik', 'Klasik — logo kiri, tabel kisi, hitam-putih', SANS, 'left', 'grid', 'right', 'list', 'line', true),
  tpl('modern', 'Modern — pita warna, tabel belang, bilah total', SANS, 'band', 'zebra', 'bar', 'cols', 'tint'),
  tpl('tengah', 'Tengah — kop tengah, ringkasan kotak penuh', HUMANIST, 'center', 'lines', 'box', 'box', 'none'),
  tpl('bilah', 'Bilah Samping — strip warna kiri', SANS, 'side', 'zebra', 'right', 'box', 'tint'),
  tpl('dua-kotak', 'Dua Kotak — kop toko & judul berdampingan', SANS, 'split', 'grid', 'bar', 'list', 'line'),
  tpl('kanan', 'Logo Kanan — judul di kiri, rekening berjajar', HUMANIST, 'right', 'lines', 'right', 'cols', 'none'),
  tpl('kartu', 'Kartu Produk — produk per kartu', SANS, 'left', 'cards', 'box', 'cols', 'tint'),
  tpl('ringkas', 'Ringkas — tabel rapat, hitam-putih', SANS, 'left', 'compact', 'right', 'list', 'none', true),
  tpl('resmi', 'Resmi — serif, kop tengah, kisi', SERIF, 'center', 'grid', 'box', 'list', 'line', true),
  tpl('kasir', 'Kasir — huruf ketik, cocok dot-matrix', MONO, 'left', 'compact', 'box', 'list', 'line', true),
  tpl('pita-kartu', 'Pita & Kartu — pita warna, produk per kartu', HUMANIST, 'band', 'cards', 'right', 'box', 'none'),
  tpl('bilah-kisi', 'Bilah & Kisi — strip kiri, bilah total', SANS, 'side', 'grid', 'bar', 'list', 'line'),
  tpl('dua-belang', 'Dua Kotak Belang — ringkasan kotak penuh', SANS, 'split', 'zebra', 'box', 'cols', 'tint'),
  tpl('kanan-bilah', 'Kanan & Bilah Total', SANS, 'right', 'zebra', 'bar', 'box', 'line'),
  tpl('tengah-kartu', 'Tengah & Kartu — bilah total berwarna', HUMANIST, 'center', 'cards', 'bar', 'cols', 'none'),
  tpl('elegan', 'Elegan — serif, logo kanan', SERIF, 'right', 'lines', 'box', 'list', 'tint'),
  tpl('lembut', 'Lembut — Carlito, belang, rekening berjajar', HUMANIST, 'left', 'zebra', 'right', 'cols', 'tint'),
  tpl('tegas', 'Tegas — pita hitam, kisi, hitam-putih', SANS, 'band', 'grid', 'box', 'list', 'line', true),
  tpl('minimal', 'Minimal — kop tengah, tabel rapat', SANS, 'center', 'compact', 'right', 'list', 'none'),
  tpl('arsip', 'Arsip — strip kiri, kartu, hitam-putih', SERIF, 'side', 'cards', 'right', 'list', 'line', true),
];
checkTemplates(TEMPLATES, 'invoice-olshop');

const CFG: Cfg = {
  kind: 'invoice', slug: 'invoice-olshop', title: 'Invoice Toko Online',
  noFmt: 'INV/{yyyy}{mm}{dd}/OLS/{n4}{n4}', noLabel: 'No. Invoice', templates: TEMPLATES,
  defaults: {
    ...BASE, gaya: TEMPLATES[0].id, judul: 'INVOICE',
    catatan: 'Mohon lakukan pembayaran sebelum jatuh tempo dan kirim bukti transfer via WhatsApp.',
    catatanKecil: 'Harga sudah termasuk pajak yang berlaku (jika ada).',
    penutup: 'Terima kasih telah berbelanja di toko kami.',
  },
};

export default function InvoiceOlshop() {
  return <OrderPage cfg={CFG} />;
}
