// Opsi dokumen bersama semua menu (di Edit Canvas → Tampilan):
// - Pakai nomor dokumen: matikan agar baris nomor tidak tampil.
// - Template kosongan: data dikosongkan (titik-titik/garis) untuk diisi manual dengan alat tulis;
//   kop, label, kalimat baku & tanda tangan tetap tampil. Isian form tidak hilang (hanya tampilan).
// Field form: `pakaiNomor` (bawaan true) & `kosong` (bawaan false); bukan bagian Data User.

// Titik-titik pengganti isian di dalam kalimat / teks bebas
export const TITIK = '…………………………';
export const TITIK_PENDEK = '…………';
// Nilai isian untuk tampilan: kosong saat mode template kosongan
export const isian = (v: string, kosong: boolean) => (kosong ? '' : v);
// Nomor dokumen kosongan tetap mengikuti susunan format: angka/huruf diganti titik, pemisah tetap
export const nomorKosong = (nomor: string) => nomor.replace(/[^/.\-\s]+/g, '……');
console.assert(nomorKosong('047/UND/XI/2026') === '……/……/……/……' && nomorKosong('TRX-261101-4160') === '……-……-……', 'nomorKosong');
// Nomor yang ditampilkan: undefined = baris nomor disembunyikan
export const nomorTampil = (nomor: string, pakai: boolean, kosong: boolean) => (!pakai ? undefined : kosong ? nomorKosong(nomor || '000/000/000') : nomor);

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 min-h-[44px] py-1 text-left text-sm font-medium text-gray-700">
      <span className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
      <span>
        {label}
        {hint && <span className="block text-xs font-normal text-gray-500">{hint}</span>}
      </span>
    </button>
  );
}

// Dua sakelar standar. Kirim `nomor` hanya bila menu punya nomor dokumen.
export default function DocOptions({ nomor, kosong }: {
  nomor?: { value: boolean; onChange: (v: boolean) => void };
  kosong: { value: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div className="space-y-1">
      {nomor && <Switch checked={nomor.value} onChange={nomor.onChange} label="Pakai nomor dokumen" hint="Matikan untuk dokumen tanpa nomor." />}
      <Switch checked={kosong.value} onChange={kosong.onChange} label="Template kosongan (isi manual)"
        hint="Data diganti titik-titik untuk ditulis tangan. Isian form tidak hilang." />
    </div>
  );
}
