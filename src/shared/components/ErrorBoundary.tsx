import { Component, type ReactNode } from 'react';

// Tanpa ini satu error render membuat seluruh halaman putih kosong tanpa petunjuk.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { pesan: string }> {
  state = { pesan: '' };

  static getDerivedStateFromError(e: unknown) {
    return { pesan: e instanceof Error ? e.message : String(e) };
  }

  render() {
    if (!this.state.pesan) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-100 text-gray-800">
        <h1 className="text-xl font-bold">Halaman ini mengalami galat</h1>
        <p className="max-w-md text-sm">Data tersimpan tidak dihapus. Coba muat ulang. Bila tetap gagal, kirim pesan di bawah ke admin.</p>
        <code className="max-w-full break-words rounded-lg bg-white border border-gray-300 p-3 text-xs">{this.state.pesan}</code>
        <div className="flex gap-3">
          <button type="button" onClick={() => location.reload()} className="min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold">Muat ulang</button>
          <a href="/" className="min-h-[44px] px-4 inline-flex items-center rounded-lg border border-gray-400 text-sm font-semibold">Ke Menu Utama</a>
        </div>
      </div>
    );
  }
}
