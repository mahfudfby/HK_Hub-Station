import { useEffect, useRef, useState } from 'react';

// Kontak kop (telepon, email, website, lainnya) sebagai isian terpisah; semuanya opsional.
// Disimpan tetap sebagai SATU teks "Telp. … • email • web" (data lama, Data User & template tidak berubah):
// teks lama dipecah otomatis ke kotak masing-masing, dan isian kosong tidak ikut ditampilkan di kop.
export type Kontak = { telp: string; email: string; web: string; lain: string };
const SEP = ' • ';
const TELP_PREFIX = /^(telp|tel|telepon|phone|ph)(\.\s*|\s*:\s*|\s+)/i;

export function parseKontak(s: string): Kontak {
  const out: Kontak = { telp: '', email: '', web: '', lain: '' };
  const lain: string[] = [];
  for (const raw of (s || '').split(/\s*[•|]\s*|\n+/)) {
    const p = raw.trim();
    if (!p) continue;
    if (!out.email && /\S+@\S+\.\S+/.test(p)) out.email = p.replace(/^e-?mail\s*:\s*/i, ''); // label hanya bila diikuti titik dua (email@… tetap utuh)
    else if (!out.web && /^(https?:\/\/|www\.)|^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(p) && !/@/.test(p)) out.web = p.replace(/^(web(site)?)\s*:\s*/i, '');
    else if (!out.telp && /\d{3,}/.test(p) && /^(telp|tel|telepon|phone|ph|hp|wa|\+|\(|\d)/i.test(p)) out.telp = p.replace(TELP_PREFIX, '');
    else lain.push(p);
  }
  out.lain = lain.join(SEP);
  return out;
}

export function joinKontak(k: Kontak): string {
  const t = k.telp.trim();
  // "Telp." ditambahkan bila isian telepon diawali angka; "WA 0812…" / "HP …" dibiarkan apa adanya
  const telp = t ? (/^[+(\d]/.test(t) ? `Telp. ${t}` : t) : '';
  return [telp, k.email.trim(), k.web.trim(), k.lain.trim()].filter(Boolean).join(SEP);
}

{
  const k = parseKontak('Telp. (021) 000-0000 • email@perusahaan.co.id • www.perusahaan.co.id');
  console.assert(k.telp === '(021) 000-0000' && k.email === 'email@perusahaan.co.id' && k.web === 'www.perusahaan.co.id' && k.lain === '', 'parseKontak', k);
  console.assert(joinKontak(k) === 'Telp. (021) 000-0000 • email@perusahaan.co.id • www.perusahaan.co.id', 'joinKontak');
  console.assert(joinKontak({ telp: '', email: 'a@b.id', web: '', lain: '' }) === 'a@b.id', 'joinKontak kosong');
  console.assert(parseKontak('Email: info@x.id • website.co.id').email === 'info@x.id' && parseKontak('webmaster@x.id').email === 'webmaster@x.id' && parseKontak('Telp. 021').telp === '021', 'parseKontak label');
  const w = parseKontak('WA 0812-3456-7890 • Email: rt003@gmail.com • linkedin.com/in/budi • Fax 021-555');
  console.assert(w.telp === 'WA 0812-3456-7890' && w.email === 'rt003@gmail.com' && w.web === 'linkedin.com/in/budi' && w.lain === 'Fax 021-555', 'parseKontak WA', w);
}

const FIELDS: { key: keyof Kontak; label: string; ph: string; type: string }[] = [
  { key: 'telp', label: 'Telepon / WA', ph: '(021) 000-0000 atau WA 0812-…', type: 'tel' },
  { key: 'email', label: 'Email', ph: 'email@perusahaan.co.id', type: 'email' },
  { key: 'web', label: 'Website', ph: 'www.perusahaan.co.id', type: 'url' },
  { key: 'lain', label: 'Lainnya (opsional)', ph: 'mis. Fax, LinkedIn, Instagram', type: 'text' },
];

export default function KontakFields({ value, onChange, label = 'Kontak (opsional, kosongkan yang tidak dipakai)' }: {
  value: string; onChange: (v: string) => void; label?: string;
}) {
  const [k, setK] = useState(() => parseKontak(value));
  const last = useRef(value);
  // Nilai berubah dari luar (Data User, galeri, reset): pecah ulang ke kotak-kotak
  useEffect(() => {
    if (value !== last.current) { last.current = value; setK(parseKontak(value)); }
  }, [value]);
  const set = (key: keyof Kontak, v: string) => {
    const next = { ...k, [key]: v };
    setK(next);
    last.current = joinKontak(next);
    onChange(last.current);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-xs font-medium text-gray-600">
            {f.label}
            <span className="mt-1 flex gap-1">
              <input type={f.type} inputMode={f.type === 'tel' ? 'tel' : undefined} value={k[f.key]} placeholder={f.ph}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 p-2 text-sm" />
              {k[f.key] && (
                <button type="button" onClick={() => set(f.key, '')} aria-label={`Hapus ${f.label}`} title={`Hapus ${f.label}`}
                  className="shrink-0 rounded-lg border border-red-200 px-3 text-red-600">✕</button>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
