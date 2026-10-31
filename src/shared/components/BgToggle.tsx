import { Spinner } from './Feedback';

// Toggle geser "Hapus BG" yang dipasang di sebelah input file gambar.
export default function BgToggle({ checked, onChange, busy = false, disabled = false }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label="Hapus background gambar" disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-xs font-medium text-gray-700 disabled:opacity-50 min-h-[44px]">
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
      <span className="whitespace-nowrap">{busy ? <Spinner className="h-4 w-4 inline" /> : null} Hapus BG</span>
    </button>
  );
}
