import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

// "Analog" (joystick) untuk menggeser posisi tanda tangan / stempel di dokumen.
// Tarik tombol bulat: makin jauh ditarik, makin cepat bergeser. Tombol panah keyboard: 1px (Shift: 10px).
// Geseran disimpan per bagian sebagai {x, y} piksel dokumen; halaman menambahkannya ke posisi elemen.

export type Offset = { x: number; y: number };
export type Offsets = Record<string, Offset>;
export const LIMIT = 220; // batas geser (px dokumen) agar tidak hilang dari kertas

export const getOffset = (o: Offsets | undefined, id: string): Offset => o?.[id] ?? { x: 0, y: 0 };
const clamp = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, Math.round(v * 10) / 10));
export const moveOffset = (o: Offsets | undefined, id: string, dx: number, dy: number): Offsets => {
  const cur = getOffset(o, id);
  return { ...(o ?? {}), [id]: { x: clamp(cur.x + dx), y: clamp(cur.y + dy) } };
};
console.assert(
  moveOffset({}, 'ttd', 3, -2).ttd.x === 3 && moveOffset({}, 'ttd', 3, -2).ttd.y === -2 && moveOffset({ a: { x: 219, y: 0 } }, 'a', 10, 0).a.x === LIMIT,
  'moveOffset',
);

const BASE = 104; // diameter alas joystick
const KNOB = 44;
const MAX_R = (BASE - KNOB) / 2;
const SPEED = 4; // px dokumen per frame saat ditarik penuh

export default function PositionPad({ targets, active, onActive, value, onChange }: {
  targets: { id: string; label: string }[];
  active: string;
  onActive: (id: string) => void;
  value: Offsets | undefined;
  onChange: (next: Offsets) => void;
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const vec = useRef({ x: 0, y: 0 });
  const timer = useRef<number>();
  const base = useRef<HTMLDivElement>(null);
  // Simpan nilai terbaru agar loop animasi tidak memakai nilai lama
  const latest = useRef({ value, onChange, active });
  latest.current = { value, onChange, active };

  // Gerak ±60× per detik selama joystick ditarik
  const tick = () => {
    const { x, y } = vec.current;
    if (!x && !y) return;
    const { value: v, onChange: set, active: id } = latest.current;
    const next = moveOffset(v, id, x * SPEED, y * SPEED);
    latest.current.value = next; // langsung dipakai tick berikutnya walau React belum render ulang
    set(next);
  };
  const stop = () => window.clearInterval(timer.current);
  useEffect(() => stop, []);

  const track = (e: PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > MAX_R) { dx = (dx / d) * MAX_R; dy = (dy / d) * MAX_R; }
    setKnob({ x: dx, y: dy });
    // zona mati kecil di tengah, lalu kecepatan bertambah kuadratik (halus untuk geser sedikit)
    const n = Math.min(1, d / MAX_R);
    const f = n < 0.12 ? 0 : ((n - 0.12) / 0.88) ** 2 / (n || 1);
    vec.current = { x: (dx / MAX_R) * f, y: (dy / MAX_R) * f };
  };
  const down = (e: PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); // tetap terlacak walau jari keluar lingkaran
    } catch {
      /* pointer sudah dilepas */
    }
    track(e);
    stop();
    timer.current = window.setInterval(tick, 16);
  };
  const up = () => {
    vec.current = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
    stop();
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onChange(moveOffset(value, active, d[0], d[1]));
  };
  const cur = getOffset(value, active);
  const seg = (on: boolean) =>
    `px-3 py-2 rounded-lg border text-sm font-medium min-h-[44px] ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">Geser posisi tanda tangan &amp; stempel</div>
      <div className="flex items-center gap-4">
        <div ref={base} role="slider" tabIndex={0} aria-label={`Geser ${targets.find((t) => t.id === active)?.label ?? ''} (panah keyboard)`}
          aria-valuetext={`x ${cur.x}, y ${cur.y}`} onKeyDown={key}
          onPointerDown={down} onPointerMove={(e) => e.buttons && track(e)} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}
          className="relative shrink-0 rounded-full border-2 border-gray-300 bg-gray-100 touch-none select-none cursor-grab focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
          style={{ width: BASE, height: BASE }}>
          {['↑', '→', '↓', '←'].map((a, i) => (
            <span key={a} aria-hidden="true" className="absolute text-xs text-gray-400"
              style={[{ top: 2, left: '50%', transform: 'translateX(-50%)' }, { right: 5, top: '50%', transform: 'translateY(-50%)' }, { bottom: 2, left: '50%', transform: 'translateX(-50%)' }, { left: 5, top: '50%', transform: 'translateY(-50%)' }][i]}>{a}</span>
          ))}
          <span aria-hidden="true" className="absolute rounded-full bg-blue-600 shadow-md"
            style={{ width: KNOB, height: KNOB, left: (BASE - KNOB) / 2 - 2 + knob.x, top: (BASE - KNOB) / 2 - 2 + knob.y }} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bagian yang digeser">
            {targets.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={active === t.id} onClick={() => onActive(t.id)} className={seg(active === t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="tabular-nums">x {Math.round(cur.x)} • y {Math.round(cur.y)}</span>
            <button type="button" onClick={() => onChange({ ...(value ?? {}), [active]: { x: 0, y: 0 } })} disabled={!cur.x && !cur.y}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 font-medium hover:bg-gray-50 disabled:opacity-50">Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}
