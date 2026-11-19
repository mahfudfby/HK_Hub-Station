import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Lock, Maximize2, Minimize2, Unlock } from 'lucide-react';
import AutoTextarea from './AutoTextarea';

// Kartu form (bagian "Isi Formulir") dengan tombol di pojok kanan atas:
// - Layar penuh: kartu mengambang lebih lebar agar nyaman mengetik di desktop (Esc / tombol untuk menutup).
// - Kunci narasi (bila `lockable`): narasi baku terkunci, hanya bagian {…} yang diisi; buka kunci = edit penuh.
// Struktur elemen tidak berubah saat layar penuh, jadi isian & fokus tidak hilang.
const LockCtx = createContext(false);
export const useNarrativeLocked = () => useContext(LockCtx);

export default function FormSection({ title, lockable = false, children, className = '' }: {
  title: ReactNode; lockable?: boolean; children: ReactNode; className?: string;
}) {
  const [full, setFull] = useState(false);
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    addEventListener('keydown', esc);
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [full]);
  const btn = 'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-xs transition-colors';
  return (
    <div className={full ? 'fixed inset-0 z-50 overflow-auto bg-black/60 backdrop-blur-xs p-3 md:p-8' : ''} onClick={full ? (e) => e.target === e.currentTarget && setFull(false) : undefined}>
      <section className={`relative rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-800/90 p-4 sm:p-5 shadow-xs transition-shadow duration-150 hover:shadow-sm space-y-3.5 ${full ? 'mx-auto max-w-5xl rounded-3xl bg-white p-6 shadow-2xl md:p-8' : ''} ${className}`}
        role={full ? 'dialog' : undefined} aria-modal={full || undefined} aria-label={full && typeof title === 'string' ? title : undefined}>
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-primary-600 dark:bg-primary-500" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h2>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {lockable && (
              <button type="button" onClick={() => setLocked((v) => !v)} aria-pressed={locked} className={btn}
                title={locked ? 'Buka kunci: edit seluruh narasi' : 'Kunci narasi: hanya isi bagian {...}'}>
                {locked ? <Lock size={15} aria-hidden="true" /> : <Unlock size={15} aria-hidden="true" />}
                <span className="hidden sm:inline">{locked ? 'Narasi terkunci' : 'Edit narasi'}</span>
              </button>
            )}
            <button type="button" onClick={() => setFull((v) => !v)} className={btn}
              aria-label={full ? 'Tutup layar penuh' : 'Buka layar penuh'} title={full ? 'Tutup layar penuh (Esc)' : 'Layar penuh'}>
              {full ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="space-y-3.5 pt-1">
          <LockCtx.Provider value={lockable && locked}>{children}</LockCtx.Provider>
        </div>
      </section>
    </div>
  );
}

// Narasi dengan isian {kunci}. Terkunci: teks baku tampil, tiap {kunci} jadi kotak isian kecil.
// Terbuka: seluruh narasi diedit bebas (textarea). `vars` = nilai isian per kunci; kunci tanpa `vars` tampil apa adanya.
export function NarrativeField({ label, value, onChange, vars = {}, onVar, rows = 3 }: {
  label?: string; value: string; onChange: (v: string) => void;
  vars?: Record<string, string>; onVar?: (key: string, v: string) => void; rows?: number;
}) {
  const locked = useNarrativeLocked();
  const field = 'w-full p-2 border border-gray-300 rounded-lg text-sm';
  if (!locked || !onVar) {
    return (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        <AutoTextarea rows={rows} className={`${field} mt-1`} value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }
  const parts = value.split(/(\{[^{}]+\})/g);
  return (
    <div className="text-sm text-gray-700">
      {label && <p className="font-medium">{label}</p>}
      <p className="mt-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2 leading-8 whitespace-pre-line">
        {parts.map((p, i) => {
          const m = /^\{([^{}]+)\}$/.exec(p);
          if (!m || !(m[1] in vars)) return <span key={i}>{p}</span>;
          const key = m[1];
          return (
            <input key={i} value={vars[key]} onChange={(e) => onVar(key, e.target.value)} aria-label={key} placeholder={key}
              size={Math.max(6, Math.min(40, (vars[key] || key).length + 1))}
              className="mx-0.5 inline-block rounded border border-blue-300 bg-white px-1.5 py-0.5 align-baseline text-sm" />
          );
        })}
      </p>
    </div>
  );
}
