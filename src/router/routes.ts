import { lazy } from 'react';

// Satu baris = satu slug = satu folder di src/pages.
// SPA dengan menu internal: pakai path '/<slug>/*' lalu baca location di dalam SPA.
// Tambah SPA baru: buat folder src/pages/<slug>/ (+ index.ts), lalu tambah SATU baris di bawah.
// title/desc dipakai otomatis oleh halaman Home (kartu Linktree). Tanpa title = tidak tampil di Home.
// cat = kategori di Home (lihat CATEGORIES di pages/home/Home.tsx); login: true = hanya tampil setelah login.
export const routes = [
  { path: '/', component: lazy(() => import('../pages/home')) },
  { path: '/login', component: lazy(() => import('../pages/login')) },
  {
    path: '/spbu/*', // wildcard: menu internal (/spbu/edit, /spbu/baru) ditangani di dalam SPA
    cat: 'nota',
    component: lazy(() => import('../pages/spbu')),
    title: 'Generator Nota SPBU',
    desc: 'Buat dan cetak nota BBM dengan template SPBU yang tersimpan.',
  },
  {
    path: '/slip-gaji/*',
    cat: 'gaji',
    component: lazy(() => import('../pages/slip-gaji')),
    title: 'Slip Gaji (BPJS & PPh 21)',
    desc: 'Buat slip gaji lengkap dengan potongan BPJS dan PPh 21, ekspor ke PNG.',
  },
  {
    path: '/surat-dokter/*',
    cat: 'kesehatan',
    login: true, // khusus dokter: disembunyikan di Home sebelum login
    component: lazy(() => import('../pages/surat-dokter')),
    title: 'Surat Keterangan Dokter',
    desc: 'Khusus dokter terdaftar: surat keterangan sakit/sehat, ekspor PDF & PNG.',
  },
  {
    path: '/surat-sehat/*',
    cat: 'kesehatan',
    login: true, // khusus dokter: disembunyikan di Home sebelum login
    component: lazy(() => import('../pages/surat-sehat')),
    title: 'Surat Keterangan Sehat',
    desc: 'Khusus dokter terdaftar: surat sehat dengan BB, TB, tensi & golongan darah, ekspor PDF & PNG.',
  },
  {
    path: '/surat-jalan/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-jalan')),
    title: 'Surat Jalan',
    desc: 'Surat jalan pengiriman barang berkop lengkap: daftar barang, kendaraan, tanda tangan penerima & sopir.',
  },
  {
    path: '/surat-tugas/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-tugas')),
    title: 'Surat Penugasan Perusahaan',
    desc: 'Surat tugas karyawan dari perusahaan: petugas, keperluan, tujuan & tanggal tugas.',
  },
  {
    path: '/surat-penugasan-kegiatan/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-penugasan-kegiatan')),
    title: 'Surat Penugasan Kegiatan',
    desc: 'Penugasan panitia/petugas kegiatan: data kegiatan & daftar tugas tiap petugas.',
  },
  {
    path: '/surat-undangan/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-undangan')),
    title: 'Surat Undangan',
    desc: 'Undangan rapat/acara resmi: nomor, perihal, waktu & tempat, berkop lengkap.',
  },
  {
    path: '/surat-pemberitahuan/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-pemberitahuan')),
    title: 'Surat Pemberitahuan',
    desc: 'Pemberitahuan resmi kepada karyawan, mitra atau pelanggan, berkop lengkap.',
  },
  {
    path: '/surat-peringatan/*',
    cat: 'surat',
    component: lazy(() => import('../pages/surat-peringatan')),
    title: 'Surat Peringatan (Teguran Pelanggaran)',
    desc: 'Surat peringatan SP-1/2/3 untuk pelanggaran karyawan, dengan tanda tangan penerima.',
  },
  {
    path: '/invoice/*',
    cat: 'invoice',
    component: lazy(() => import('../pages/invoice')),
    title: 'Generator Invoice',
    desc: '4 gaya template, kertas A4/A5/Letter/F4, vertikal atau landscape. Ekspor PDF & PNG.',
  },
  {
    path: '/faktur-penjualan/*',
    cat: 'invoice',
    component: lazy(() => import('../pages/faktur-penjualan')),
    title: 'Generator Faktur Penjualan',
    desc: 'Faktur dengan PPN, terbilang & tanda tangan; pilih gaya, ukuran kertas & orientasi.',
  },
  {
    path: '/invoice-toko-online/*',
    cat: 'invoice',
    component: lazy(() => import('../pages/invoice-toko-online')),
    title: 'Custom Invoices Toko Online',
    desc: 'Nota pesanan gaya marketplace untuk toko online Anda: rincian produk & variasi, biaya layanan, voucher. PDF, PNG & Print.',
  },
  {
    path: '/nota-58mm/*',
    cat: 'nota',
    component: lazy(() => import('../pages/nota-58mm')),
    title: 'Nota Pembelian 58mm',
    desc: 'Nota kasir untuk printer thermal 58mm (PNG 384px siap RawBT), PDF & Print.',
  },
  {
    path: '/nota-80mm/*',
    cat: 'nota',
    component: lazy(() => import('../pages/nota-80mm')),
    title: 'Nota Pembelian 80mm',
    desc: 'Nota kasir untuk printer thermal 80mm (PNG 576px siap RawBT), PDF & Print.',
  },
  {
    path: '/resi-80mm/*',
    cat: 'nota',
    component: lazy(() => import('../pages/resi-80mm')),
    title: 'Resi Pengiriman 80mm',
    desc: 'Label pengiriman gaya marketplace dengan barcode otomatis. Label 80×100mm atau continuous.',
  },
];
