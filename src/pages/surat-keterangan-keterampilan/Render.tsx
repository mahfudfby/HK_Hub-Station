import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { cssFamily } from '../../shared/lib/fonts';
import { fxOf, type Offset } from '../../shared/components/PositionPad';
import type { Tpl } from './templates';

// Penyaji 20 template: satu objek Cert -> halaman 1 (sertifikat) + halaman 2 (kompetensi).
// Semua ukuran dalam `em` (root = ukuran huruf dokumen) supaya ikut slider ukuran teks & jenis kertas.

// ============================================================
// SECTION: Data
// ============================================================
export type Cert = {
  logo: string; logoOff: Offset; lembaga: string; sub: string;
  judul: string; pembuka: string; namaLabel: string; nama: string; kompetensi: string;
  jenisLabel: string; jenis: string; regLabel: string; reg: string; masa: string;
  foto: string; qr: string; pakaiFoto: boolean; pakaiQr: boolean;
  kota: string; tgl: string; penetap: string; jabatan: string; pejabat: string; ttd: string; ttdOff: Offset;
  keterangan: string;
  judul2: string; items: string[]; logo2: string; nama2: string; jabatan2: string; ttd2: string;
};
type P = { t: Tpl; d: Cert };

const SERIF = ['Lora', 'Playfair Display', 'Merriweather', 'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'Cinzel', 'Roboto Slab'];
export const fam = (f: string) => (f === 'Arimo' ? 'Arimo, Arial, Helvetica, sans-serif' : cssFamily(f, SERIF.includes(f) ? 'serif' : 'sans-serif'));
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// ============================================================
// SECTION: Potongan kecil
// ============================================================
function Logo({ src, off, size, t }: { src: string; off?: Offset; size: number; t?: Tpl }) {
  if (!src) return t ? <div style={{ flexShrink: 0 }}><Blank w={size * 1.25} h={size} text="LOGO" t={t} /></div> : null;
  const o = off ?? { x: 0, y: 0 };
  const fx = fxOf(o, 'logo');
  return <img src={src} alt="Logo" style={{ height: `${size}em`, maxWidth: `${size * 1.7}em`, objectFit: 'contain', flexShrink: 0, opacity: fx.a, transform: `translate(${o.x}px, ${o.y}px) scale(${fx.z})` }} />;
}

const Blank = ({ w, h, text, t }: { w: number; h: number; text: string; t: Tpl }) => (
  <div style={{ width: `${w}em`, height: `${h}em`, boxSizing: 'border-box', border: `1px dashed ${t.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '0.6em', color: '#777' }}>{text}</div>
);
const Spacer = ({ w, h }: { w: number; h: number }) => <div style={{ width: `${w}em`, height: `${h}em`, flexShrink: 0 }} />;

function Foto({ t, d }: P) {
  if (!d.pakaiFoto) return <Spacer w={6} h={8} />;
  return d.foto
    ? <div role="img" aria-label="Foto pemegang" style={{ width: '6em', height: '8em', flexShrink: 0, background: `url("${d.foto}") center / cover no-repeat`, border: '1px solid #bbb' }} />
    : <div style={{ flexShrink: 0 }}><Blank w={6} h={8} text="FOTO 3×4" t={t} /></div>;
}
function Qr({ t, d }: P) {
  if (!d.pakaiQr) return <Spacer w={7.5} h={7.5} />;
  return d.qr
    ? <div role="img" aria-label="QR Code" style={{ width: '7.5em', height: '7.5em', flexShrink: 0, background: `url("${d.qr}") center / contain no-repeat #fff` }} />
    : <div style={{ flexShrink: 0 }}><Blank w={7.5} h={7.5} text="QR CODE" t={t} /></div>;
}

// Ditetapkan di / pada tanggal, lembaga penetap, jabatan, tanda tangan, nama pejabat
function Penetap({ t, d, w = 17 }: P & { w?: number }) {
  const o = d.ttdOff;
  const fx = fxOf(o, 'ttd');
  const row = (a: string, b: string) => (
    <div style={{ display: 'flex' }}><span style={{ width: '7.6em', flexShrink: 0, whiteSpace: 'nowrap' }}>{a}</span><span>: {b}</span></div>
  );
  return (
    <div style={{ width: `${w}em`, flexShrink: 0 }}>
      <div style={{ marginBottom: '0.9em' }}>{row('Ditetapkan di', d.kota)}{row('Pada tanggal', d.tgl)}</div>
      <div style={{ textAlign: 'center', fontWeight: 700, fontFamily: fam(t.head) }}>{lines(d.penetap).map((l, i) => <div key={i}>{l}</div>)}</div>
      <div style={{ textAlign: 'center', marginTop: '0.7em' }}>{d.jabatan}</div>
      <div style={{ position: 'relative', height: '4.2em' }}>
        {d.ttd && <img src={d.ttd} alt="Tanda tangan" style={{ position: 'absolute', left: `calc(50% - ${3.2 * fx.z}em + ${o.x}px)`, top: `${o.y}px`, height: `${4 * fx.z}em`, maxWidth: '9em', objectFit: 'contain', opacity: fx.a, mixBlendMode: 'multiply' }} />}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 700 }}>{d.pejabat}</div>
    </div>
  );
}

// ============================================================
// SECTION: Motif batik & ornamen (SVG, ubin 24×24 yang menyambung ke empat arah)
// ============================================================
export type Motif = 'guilloche' | 'kawung' | 'mega-mendung' | 'filigree' | 'parang' | 'sulur' | 'truntum' | 'tumpal' | 'ketupat' | 'meander';
const MOTIF_SVG: Record<Motif, (A: string, S: string) => string> = {
  // gelombang anyam (ala pita sertifikat)
  guilloche: (A) => `<path d='M0 6 Q6 -2 12 6 T24 6' fill='none' stroke='${A}' stroke-width='1.2'/><path d='M0 18 Q6 26 12 18 T24 18' fill='none' stroke='${A}' stroke-width='1.2'/><path d='M0 12 C4 0 8 0 12 12 S20 24 24 12' fill='none' stroke='${A}' stroke-width='1'/><path d='M0 12 C4 24 8 24 12 12 S20 0 24 12' fill='none' stroke='${A}' stroke-width='1'/>`,
  // kawung: empat kelopak lonjong mengelilingi pusat
  kawung: (A, S) => `<g fill='${A}'><ellipse cx='12' cy='6' rx='3.2' ry='5.4'/><ellipse cx='12' cy='18' rx='3.2' ry='5.4'/><ellipse cx='6' cy='12' rx='5.4' ry='3.2'/><ellipse cx='18' cy='12' rx='5.4' ry='3.2'/></g><circle cx='12' cy='12' r='2.2' fill='${S}' stroke='${A}' stroke-width='.8'/><g fill='#fff' stroke='${A}' stroke-width='.8'><circle cx='0' cy='0' r='1.8'/><circle cx='24' cy='0' r='1.8'/><circle cx='0' cy='24' r='1.8'/><circle cx='24' cy='24' r='1.8'/></g>`,
  // parang: garis diagonal berselang titik
  parang: (A) => `<g stroke='${A}' stroke-width='4' fill='none'><path d='M0 12 L12 0'/><path d='M0 24 L24 0'/><path d='M12 24 L24 12'/></g><g fill='${A}'><circle cx='9' cy='9' r='1.3'/><circle cx='15' cy='15' r='1.3'/><circle cx='3' cy='15' r='1.1'/><circle cx='21' cy='21' r='1.1'/></g>`,
  // mega mendung: lengkung awan berlapis
  'mega-mendung': (A) => `<g fill='none' stroke='${A}' stroke-width='1.5'><path d='M0 24 A12 12 0 0 1 24 24'/><path d='M4 24 A8 8 0 0 1 20 24'/><path d='M8 24 A4 4 0 0 1 16 24'/><path d='M0 0 A12 12 0 0 0 24 0'/><path d='M4 0 A8 8 0 0 0 20 0'/><path d='M8 0 A4 4 0 0 0 16 0'/></g>`,
  // truntum: bintang bertitik
  truntum: (A) => `<path d='M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2Z' fill='${A}'/><circle cx='12' cy='12' r='1.1' fill='#fff'/><g fill='${A}'><circle cx='0' cy='0' r='2'/><circle cx='24' cy='0' r='2'/><circle cx='0' cy='24' r='2'/><circle cx='24' cy='24' r='2'/></g>`,
  // tumpal: segitiga berderet
  tumpal: (A, S) => `<path d='M0 24 L12 3 L24 24Z' fill='${A}'/><path d='M6.5 24 L12 13.5 L17.5 24Z' fill='${S}'/><circle cx='12' cy='19.5' r='1.3' fill='${A}'/>`,
  // sulur: batang melengkung dengan daun
  sulur: (A) => `<path d='M0 12 C6 0 18 24 24 12' stroke='${A}' stroke-width='1.6' fill='none'/><ellipse cx='6' cy='5' rx='3' ry='1.6' transform='rotate(-40 6 5)' fill='${A}'/><ellipse cx='18' cy='19' rx='3' ry='1.6' transform='rotate(-40 18 19)' fill='${A}'/><circle cx='12' cy='12' r='1.7' fill='#fff' stroke='${A}' stroke-width='.9'/>`,
  // meander (kunci Yunani)
  meander: (A) => `<path d='M2 22 V2 H22 V16 H8 V8 H16 V12' fill='none' stroke='${A}' stroke-width='2.2' stroke-linejoin='miter'/>`,
  // ketupat: belah ketupat bersusun
  ketupat: (A, S) => `<path d='M12 1 L23 12 L12 23 L1 12Z' fill='${A}'/><path d='M12 6 L18 12 L12 18 L6 12Z' fill='${S}'/><circle cx='12' cy='12' r='1.7' fill='${A}'/>`,
  // filigree: roset delapan kelopak
  filigree: (A) => `<g fill='${A}'><circle cx='18.5' cy='12' r='2.6'/><circle cx='16.6' cy='16.6' r='2.6'/><circle cx='12' cy='18.5' r='2.6'/><circle cx='7.4' cy='16.6' r='2.6'/><circle cx='5.5' cy='12' r='2.6'/><circle cx='7.4' cy='7.4' r='2.6'/><circle cx='12' cy='5.5' r='2.6'/><circle cx='16.6' cy='7.4' r='2.6'/></g><circle cx='12' cy='12' r='3.4' fill='#fff' stroke='${A}' stroke-width='1'/>`,
};
const uriCache = new Map<string, string>();
// `url("data:image/svg+xml…")` untuk latar CSS berulang
export const motifBg = (m: Motif, A: string, S: string) => {
  const key = `${m}|${A}|${S}`;
  let u = uriCache.get(key);
  if (!u) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><rect width='24' height='24' fill='${S}'/>${MOTIF_SVG[m](A, S)}</svg>`;
    u = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
    uriCache.set(key, u);
  }
  return u;
};
console.assert(Object.keys(MOTIF_SVG).length === 10 && motifBg('kawung', '#111', '#eee').includes('svg+xml'), 'motif batik');

// Pita motif lurus (pengganti garis polos): horizontal (repeat-x) atau vertikal (repeat-y)
export function Strip({ t, h = 0.7, v = false, w, style }: { t: Tpl; h?: number; v?: boolean; w?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" style={{ flexShrink: 0, backgroundImage: motifBg(FRAMES[t.frame].motif, t.accent, t.soft), backgroundSize: `${h}em ${h}em`, backgroundRepeat: v ? 'repeat-y' : 'repeat-x', ...(v ? { width: `${h}em`, alignSelf: 'stretch' } : { height: `${h}em`, width: w ?? '100%' }), ...style }} />;
}

// ============================================================
// SECTION: Bingkai
// ============================================================
type Layout = 'keliling' | 'ganda' | 'atas-bawah' | 'samping' | 'sudut';
export const FRAMES: Record<Tpl['frame'], { motif: Motif; layout: Layout; w: number }> = {
  guilloche: { motif: 'guilloche', layout: 'keliling', w: 2.6 },
  kawung: { motif: 'kawung', layout: 'ganda', w: 2.8 },
  'mega-mendung': { motif: 'mega-mendung', layout: 'keliling', w: 2.6 },
  filigree: { motif: 'filigree', layout: 'sudut', w: 2.2 },
  parang: { motif: 'parang', layout: 'keliling', w: 2.4 },
  sulur: { motif: 'sulur', layout: 'ganda', w: 2.6 },
  truntum: { motif: 'truntum', layout: 'keliling', w: 2.4 },
  tumpal: { motif: 'tumpal', layout: 'atas-bawah', w: 3.0 },
  ketupat: { motif: 'ketupat', layout: 'samping', w: 3.0 },
  meander: { motif: 'meander', layout: 'atas-bawah', w: 2.4 },
};
console.assert(Object.keys(FRAMES).length === 10, 'FRAMES');

// Ukuran halaman (px) & huruf dokumen (px): untuk membagi pita motif menjadi ubin utuh (tidak terpotong di ujung)
export const BoxCtx = createContext({ W: 1123, H: 794, fs: 14 });

export function Frame({ t, children }: { t: Tpl; children: ReactNode }) {
  const A = t.accent;
  const { motif, layout, w } = FRAMES[t.frame];
  const bg = motifBg(motif, A, t.soft);
  const m = 0.8; // jarak bingkai dari tepi kertas (em)
  const px = (n: number) => `${n}em`;
  const { W, H, fs } = useContext(BoxCtx);
  // Panjang pita dibagi bilangan bulat ubin supaya motif utuh dan tebal pita sama di keempat sisi
  const fit = (len: number) => px(len / Math.max(1, Math.round(len / w)));
  const lenH = W / fs - 2 * m;
  const lenV = H / fs - 2 * m - (layout === 'samping' ? 0 : 2 * w);
  const band = (pos: CSSProperties, dir: 'h' | 'v' | 'c' = 'c'): CSSProperties => ({ position: 'absolute', backgroundImage: bg, backgroundSize: dir === 'h' ? `${fit(lenH)} ${px(w)}` : dir === 'v' ? `${px(w)} ${fit(lenV)}` : `${px(w)} ${px(w)}`, backgroundPosition: '0 0', backgroundRepeat: 'repeat', ...pos });
  const line = (inset: number): CSSProperties => ({ position: 'absolute', inset: px(inset), border: `1px solid ${A}`, pointerEvents: 'none' });
  const els: ReactNode[] = [];
  let pv = 2.4;
  let ph = 3.4;
  if (layout === 'keliling' || layout === 'ganda') {
    els.push(<div key="t" style={band({ left: px(m), right: px(m), top: px(m), height: px(w) }, 'h')} />, <div key="b" style={band({ left: px(m), right: px(m), bottom: px(m), height: px(w) }, 'h')} />);
    els.push(<div key="l" style={band({ left: px(m), top: px(m + w), bottom: px(m + w), width: px(w) }, 'v')} />, <div key="r" style={band({ right: px(m), top: px(m + w), bottom: px(m + w), width: px(w) }, 'v')} />);
    els.push(<div key="o" style={line(m)} />, <div key="i" style={line(m + w)} />);
    if (layout === 'ganda') els.push(<div key="i2" style={line(m + w + 0.35)} />);
    const e = m + w + (layout === 'ganda' ? 0.35 : 0);
    pv = e + 2.4;
    ph = e + 3.6;
  } else if (layout === 'atas-bawah') {
    els.push(<div key="o" style={line(m)} />);
    els.push(<div key="t" style={band({ left: px(m), right: px(m), top: px(m), height: px(w) }, 'h')} />, <div key="b" style={band({ left: px(m), right: px(m), bottom: px(m), height: px(w) }, 'h')} />);
    els.push(<div key="ti" style={{ position: 'absolute', left: px(m), right: px(m), top: px(m + w), borderTop: `1px solid ${A}` }} />, <div key="bi" style={{ position: 'absolute', left: px(m), right: px(m), bottom: px(m + w), borderTop: `1px solid ${A}` }} />);
    pv = m + w + 2.4;
    ph = m + 4;
  } else if (layout === 'samping') {
    els.push(<div key="o" style={line(m)} />);
    els.push(<div key="l" style={band({ left: px(m), top: px(m), bottom: px(m), width: px(w) }, 'v')} />, <div key="r" style={band({ right: px(m), top: px(m), bottom: px(m), width: px(w) }, 'v')} />);
    els.push(<div key="li" style={{ position: 'absolute', top: px(m), bottom: px(m), left: px(m + w), borderLeft: `1px solid ${A}` }} />, <div key="ri" style={{ position: 'absolute', top: px(m), bottom: px(m), right: px(m + w), borderLeft: `1px solid ${A}` }} />);
    pv = m + 2.6;
    ph = m + w + 3.4;
  } else { // sudut: blok ornamen di empat sudut + garis ganda tipis
    const c = (pos: CSSProperties): CSSProperties => band({ width: px(2 * w), height: px(2 * w), border: `1px solid ${A}`, boxSizing: 'border-box', ...pos });
    els.push(<div key="o" style={line(m + w * 0.6)} />, <div key="i" style={line(m + w * 0.6 + 0.35)} />);
    els.push(<div key="c1" style={c({ left: px(m), top: px(m) })} />, <div key="c2" style={c({ right: px(m), top: px(m) })} />, <div key="c3" style={c({ left: px(m), bottom: px(m) })} />, <div key="c4" style={c({ right: px(m), bottom: px(m) })} />);
    pv = m + 2 * w * 0.6 + 2.6;
    ph = m + 2 * w + 2.4;
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {els}
      <div data-fit style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: `${px(pv + 1.6)} ${px(ph)} 0`, position: 'relative' }}>{children}<div aria-hidden="true" style={{ height: px(pv), flexShrink: 0 }} /></div>
    </div>
  );
}

// ============================================================
// SECTION: Kop & judul
// ============================================================
function Teks({ t, d, align, color, big = 1.75 }: P & { align: 'left' | 'center' | 'right'; color?: string; big?: number }) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <div style={{ fontFamily: fam(t.head), fontWeight: 700, fontSize: `${big}em`, lineHeight: 1.1, color: color ?? t.accent, textTransform: 'uppercase' }}>{d.lembaga}</div>
      {d.sub && <div style={{ fontWeight: 700, fontSize: '1.02em', marginTop: '0.25em', color: color ?? t.ink }}>{d.sub}</div>}
    </div>
  );
}

function KopBody({ t, d, small = false }: P & { small?: boolean }) {
  const base: CSSProperties = { display: 'flex', alignItems: 'center', gap: '1.2em' };
  if (small || t.kop === 'kecil') {
    return (
      <div style={{ ...base, gap: '0.7em' }}>
        <Logo t={t} src={d.logo} off={d.logoOff} size={2.4} />
        <div style={{ fontFamily: fam(t.head), fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '1em', color: t.accent }}>{d.lembaga}</div>
        {d.sub && <div style={{ marginLeft: 'auto', fontSize: '0.85em', color: '#555' }}>{d.sub}</div>}
      </div>
    );
  }
  switch (t.kop) {
    case 'tengah': return (
      <div style={{ ...base, flexDirection: 'column', gap: '0.4em' }}>
        <Logo t={t} src={d.logo} off={d.logoOff} size={4.4} />
        <Teks t={t} d={d} align="center" big={1.6} />
      </div>
    );
    case 'kanan': return (
      <div style={{ ...base, flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
        <Logo t={t} src={d.logo} off={d.logoOff} size={4.8} />
        <div style={{ flex: 1 }}><Teks t={t} d={d} align="right" /></div>
      </div>
    );
    case 'banner': return (
      <div style={{ ...base, background: t.accent, padding: '0.7em 1.2em' }}>
        <div style={{ background: '#fff', padding: '0.25em', borderRadius: '0.3em', display: 'flex' }}><Logo t={t} src={d.logo} off={d.logoOff} size={3.6} /></div>
        <Teks t={t} d={d} align="left" color="#fff" big={1.55} />
      </div>
    );
    case 'dua-sisi': return (
      <div style={{ ...base, justifyContent: 'space-between' }}>
        <div style={{ width: '6em', display: 'flex' }}><Logo t={t} src={d.logo} off={d.logoOff} size={4.4} /></div>
        <div style={{ flex: 1 }}><Teks t={t} d={d} align="center" big={1.5} /></div>
        <div style={{ width: '6em' }} />
      </div>
    );
    default: return ( // kiri (referensi)
      <div style={base}>
        <Logo t={t} src={d.logo} off={d.logoOff} size={5} />
        <Teks t={t} d={d} align="left" />
      </div>
    );
  }
}

export function Kop(p: P & { small?: boolean }) {
  return <div style={{ marginBottom: '1em' }}><KopBody {...p} /><Strip t={p.t} h={0.6} style={{ marginTop: '0.55em' }} /></div>;
}

export function Judul({ t, text }: { t: Tpl; text: string }) {
  const f: CSSProperties = { fontFamily: fam(t.head), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.ink };
  const wrap: CSSProperties = { margin: '0.8em 0 0.8em' };
  const S = (h = 0.6, st?: CSSProperties, w?: string) => <Strip t={t} h={h} w={w} style={st} />;
  switch (t.title) {
    case 'kiri': return <div style={wrap}><span style={{ ...f, fontSize: '1.5em', display: 'inline-block' }}>{text}</span>{S(0.6, { marginTop: '0.25em' }, '7em')}</div>;
    case 'bar': return <div style={wrap}>{S()}<div style={{ ...f, textAlign: 'center', fontSize: '1.3em', background: t.accent, color: '#fff', padding: '0.35em 1em' }}>{text}</div>{S()}</div>;
    case 'garis': return <div style={wrap}>{S(0.7)}<div style={{ ...f, textAlign: 'center', fontSize: '1.4em', padding: '0.25em 0' }}>{text}</div>{S(0.7)}</div>;
    case 'kotak': return <div style={{ ...wrap, textAlign: 'center' }}><div style={{ display: 'inline-block' }}>{S(0.6)}<div style={{ ...f, fontSize: '1.35em', padding: '0.25em 1.6em' }}>{text}</div>{S(0.6)}</div></div>;
    default: return <div style={wrap}><div style={{ ...f, textAlign: 'center', fontSize: '1.5em' }}>{text}</div>{S(0.6, { margin: '0.3em auto 0' }, '9em')}</div>;
  }
}

// ============================================================
// SECTION: Blok data halaman 1
// ============================================================
const Para = ({ children }: { children: ReactNode }) => <p style={{ margin: '0.55em 0', lineHeight: 1.45, textAlign: 'justify' }}>{children}</p>;

function Who({ t, d }: P) {
  const nama = d.nama || '\u00a0';
  switch (t.who) {
    case 'besar': return (
      <div style={{ textAlign: 'center', margin: '0.7em 0' }}>
        <div style={{ fontSize: '0.85em', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>{d.namaLabel}</div>
        <div style={{ fontFamily: fam(t.head), fontWeight: 700, fontSize: '2em', lineHeight: 1.2, color: t.accent, padding: '0 1em 0.1em' }}>{nama}</div>
        <Strip t={t} h={0.55} w="24em" style={{ margin: '0 auto' }} />
      </div>
    );
    case 'kartu': return (
      <div style={{ margin: '0.7em 0', background: t.soft, display: 'flex', gap: '0.8em', alignItems: 'stretch', padding: '0 0.9em 0 0' }}>
        <Strip t={t} v h={0.9} />
        <div style={{ padding: '0.5em 0' }}>
          <div style={{ fontSize: '0.8em', color: '#444' }}>{d.namaLabel}</div>
          <div style={{ fontFamily: fam(t.head), fontWeight: 700, fontSize: '1.45em' }}>{nama}</div>
        </div>
      </div>
    );
    case 'garis': return (
      <div style={{ margin: '0.7em 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8em', paddingBottom: '0.2em' }}>
          <span style={{ flexShrink: 0 }}>{d.namaLabel} :</span>
          <span style={{ fontFamily: fam(t.head), fontWeight: 700, fontSize: '1.3em' }}>{nama}</span>
        </div>
        <Strip t={t} h={0.5} />
      </div>
    );
    default: return (
      <div style={{ margin: '0.6em 0', display: 'flex', alignItems: 'baseline' }}>
        <span style={{ width: '5em', flexShrink: 0 }}>{d.namaLabel}</span>
        <span style={{ marginRight: '0.8em' }}>:</span>
        <span style={{ fontFamily: fam(t.head), fontWeight: 700, fontSize: '1.1em' }}>{nama}</span>
      </div>
    );
  }
}

function Qual({ t, d }: P) {
  const items = [{ label: d.jenisLabel, value: d.jenis }, { label: d.regLabel, value: d.reg }];
  const val = (): CSSProperties => ({ fontWeight: 700, minHeight: '1.2em', fontFamily: fam(t.head) });
  const nb = '\u00a0';
  const S = (h = 0.6) => <Strip t={t} h={h} />;
  switch (t.qual) {
    case 'tabel': return (
      <div style={{ margin: '0.7em 0' }}>
        {S()}
        <div style={{ borderLeft: `1px solid ${t.accent}`, borderRight: `1px solid ${t.accent}` }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.32fr) minmax(0,1fr)', borderTop: i ? `1px solid ${t.accent}` : undefined }}>
              <div style={{ background: t.soft, padding: '0.45em 0.8em', fontWeight: 700 }}>{it.label}</div>
              <div style={{ padding: '0.45em 0.8em', ...val() }}>{it.value || nb}</div>
            </div>
          ))}
        </div>
        {S()}
      </div>
    );
    case 'pita': return (
      <div style={{ margin: '0.7em 0' }}>
        {S(0.5)}
        {items.map((it, i) => (
          <div key={i} style={{ margin: '0.4em 0' }}>
            <div style={{ fontStyle: 'italic', fontSize: '0.88em', color: '#444' }}>{it.label}</div>
            <div style={{ background: i ? t.soft : t.accent, color: i ? t.ink : '#fff', textAlign: 'center', padding: '0.4em 0.8em', ...val() }}>{it.value || nb}</div>
          </div>
        ))}
        {S(0.5)}
      </div>
    );
    case 'dua': return (
      <div style={{ margin: '0.7em 0', display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: '0.8em' }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: t.soft, display: 'flex', gap: '0.7em', alignItems: 'stretch', paddingRight: '0.8em' }}>
            <Strip t={t} v h={0.8} />
            <div style={{ padding: '0.5em 0' }}>
              <div style={{ fontSize: '0.8em', fontStyle: 'italic', color: '#444' }}>{it.label}</div>
              <div style={val()}>{it.value || nb}</div>
            </div>
          </div>
        ))}
      </div>
    );
    case 'polos': return (
      <div style={{ margin: '0.7em 0' }}>
        {S(0.5)}
        <div style={{ padding: '0.3em 0' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', margin: '0.25em 0' }}>
              <span style={{ width: '12em', flexShrink: 0, fontStyle: 'italic' }}>{it.label}</span>
              <span style={{ marginRight: '0.6em' }}>:</span>
              <span style={val()}>{it.value || nb}</span>
            </div>
          ))}
        </div>
        {S(0.5)}
      </div>
    );
    default: return ( // kotak (referensi): pita motif di atas & bawah, sisi tipis
      <div style={{ margin: '0.7em 0' }}>
        {items.map((it, i) => (
          <div key={i} style={{ margin: '0.5em auto', width: i ? '88%' : undefined }}>
            {S(0.55)}
            <div style={{ textAlign: 'center', borderLeft: '1px solid #aaa', borderRight: '1px solid #aaa', padding: '0.35em 0.8em' }}>
              <div style={{ fontStyle: 'italic', fontSize: '0.92em' }}>{it.label}</div>
              <div style={val()}>{it.value || nb}</div>
            </div>
            {S(0.55)}
          </div>
        ))}
      </div>
    );
  }
}

const Ket = ({ d }: { d: Cert }) => {
  const ks = lines(d.keterangan);
  if (!ks.length) return null;
  return <div style={{ marginTop: '0.8em', fontSize: '0.72em', lineHeight: 1.35, color: '#333' }}>{ks.map((l, i) => <div key={i}>{l}</div>)}</div>;
};

// ============================================================
// SECTION: Halaman 1
// ============================================================
export function Hal1({ t, d }: P) {
  const body = (
    <>
      <Para>{d.pembuka}</Para>
      {t.media === 'foto-who' ? (
        <div style={{ display: 'flex', gap: '1.2em', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}><Who t={t} d={d} /><Para>{d.kompetensi}</Para></div>
          <Foto t={t} d={d} />
        </div>
      ) : (<><Who t={t} d={d} /><Para>{d.kompetensi}</Para></>)}
      <Qual t={t} d={d} />
      <Para>{d.masa}</Para>
    </>
  );

  const row = (children: ReactNode, extra?: CSSProperties) => <div style={{ marginTop: 'auto', paddingTop: '0.8em', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1em', ...extra }}>{children}</div>;
  let main: ReactNode;
  switch (t.media) {
    case 'kolom-kanan': main = (
      <div style={{ display: 'flex', gap: '1.6em', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <div style={{ width: '17em', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1em', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.8em', alignItems: 'flex-start' }}><Foto t={t} d={d} /><Qr t={t} d={d} /></div>
          <Penetap t={t} d={d} />
        </div>
      </div>
    ); break;
    case 'cermin': main = <>{body}{row(<><Penetap t={t} d={d} /><Foto t={t} d={d} /><Qr t={t} d={d} /></>)}</>; break;
    case 'tengah': main = <>{body}{row(<><Foto t={t} d={d} /><Penetap t={t} d={d} /><Qr t={t} d={d} /></>, { alignItems: 'center' })}</>; break;
    case 'foto-who': main = <>{body}{row(<><Qr t={t} d={d} /><Penetap t={t} d={d} /></>)}</>; break;
    case 'strip': main = (
      <>{body}{row(<><div style={{ display: 'flex', gap: '0.9em' }}><Foto t={t} d={d} /><Qr t={t} d={d} /></div><Penetap t={t} d={d} /></>, { background: t.soft, padding: '0.8em 1em', alignItems: 'center' })}</>
    ); break;
    default: main = <>{body}{row(<><Qr t={t} d={d} /><Foto t={t} d={d} /><Penetap t={t} d={d} /></>)}</>; // tiga
  }

  if (t.kop === 'sidebar') {
    return (
      <Frame t={t}>
        <div style={{ display: 'flex', gap: '1.6em', flex: 1, minHeight: 0 }}>
          <div style={{ width: '12.5em', flexShrink: 0, background: t.accent, color: '#fff', padding: '1.2em 0.9em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9em', textAlign: 'center', alignSelf: 'stretch' }}>
            <Strip t={t} h={1} style={{ margin: '-1.2em -0.9em 0', width: 'calc(100% + 1.8em)' }} />
            <div style={{ background: '#fff', padding: '0.3em', borderRadius: '0.3em', display: 'flex' }}><Logo t={t} src={d.logo} off={d.logoOff} size={5} /></div>
            <Teks t={t} d={d} align="center" color="#fff" big={1.2} />
            <div style={{ flex: 1 }} />
            <Strip t={t} h={1} style={{ margin: '0 -0.9em -1.2em', width: 'calc(100% + 1.8em)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Judul t={t} text={d.judul} />
            {main}
            <Ket d={d} />
          </div>
        </div>
      </Frame>
    );
  }
  return (
    <Frame t={t}>
      <Kop t={t} d={d} />
      <Judul t={t} text={d.judul} />
      {main}
      <Ket d={d} />
    </Frame>
  );
}

// ============================================================
// SECTION: Halaman 2 (kompetensi + pengesah)
// ============================================================
function Daftar({ t, d }: P) {
  const items = d.items;
  switch (t.list) {
    case 'dua': return (
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridTemplateRows: `repeat(${Math.ceil(items.length / 2)}, auto)`, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', columnGap: '2em', rowGap: '0.5em' }}>
        {items.map((s, i) => <div key={i} style={{ display: 'flex', gap: '0.6em', lineHeight: 1.4 }}><b style={{ width: '1.6em', flexShrink: 0, color: t.accent }}>{i + 1}.</b><span>{s}</span></div>)}
      </div>
    );
    case 'kartu': return (
      <div style={{ display: 'grid', gap: '0.55em' }}>
        {items.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.9em', background: t.soft, padding: '0.5em 0.9em', borderRadius: '0.4em' }}>
            <span style={{ width: '1.9em', height: '1.9em', borderRadius: '50%', background: t.accent, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.9em' }}>{i + 1}</span>
            <span style={{ lineHeight: 1.35 }}>{s}</span>
          </div>
        ))}
      </div>
    );
    case 'tabel': return (
      <div style={{ border: `1px solid ${t.accent}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3.2em minmax(0,1fr)', background: t.accent, color: '#fff', fontWeight: 700, padding: '0.4em 0.7em' }}><span>No</span><span>Kompetensi</span></div>
        {items.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '3.2em minmax(0,1fr)', padding: '0.4em 0.7em', background: i % 2 ? t.soft : '#fff', lineHeight: 1.35 }}><span>{i + 1}</span><span>{s}</span></div>
        ))}
      </div>
    );
    case 'titik': return (
      <div style={{ display: 'grid', gap: '0.5em' }}>
        {items.map((s, i) => <div key={i} style={{ display: 'flex', gap: '0.8em', lineHeight: 1.4 }}><span style={{ width: '0.55em', height: '0.55em', background: t.accent, marginTop: '0.5em', flexShrink: 0 }} /><span>{s}</span></div>)}
      </div>
    );
    default: return ( // angka (referensi)
      <div style={{ display: 'grid', gap: '0.35em' }}>
        {items.map((s, i) => <div key={i} style={{ display: 'flex', gap: '0.5em', lineHeight: 1.5 }}><span style={{ width: '1.6em', flexShrink: 0, textAlign: 'right' }}>{i + 1}.</span><span>{s}</span></div>)}
      </div>
    );
  }
}

function Pengesah({ t, d }: P) {
  const o = { x: 0, y: 0 };
  const ttd = d.ttd2 && <img src={d.ttd2} alt="Tanda tangan" style={{ height: '3.6em', maxWidth: '9em', objectFit: 'contain', mixBlendMode: 'multiply', display: 'block', margin: '0 auto' }} />;
  const nama = <div style={{ fontWeight: 700, fontFamily: fam(t.head) }}>{d.nama2}</div>;
  const jab = <div>{d.jabatan2}</div>;
  const logo = (s: number) => <Logo t={t} src={d.logo2} off={o} size={s} />;
  switch (t.sign) {
    case 'kanan': case 'kiri': case 'tengah': {
      const al = t.sign === 'kanan' ? 'flex-end' : t.sign === 'kiri' ? 'flex-start' : 'center';
      return (
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: al }}>
          <div style={{ width: '16em', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3em' }}>
            {logo(3.6)}{jab}<div style={{ minHeight: '3.2em' }}>{ttd}</div>{nama}
          </div>
        </div>
      );
    }
    case 'strip': return (
      <div style={{ marginTop: 'auto' }}><Strip t={t} h={0.8} /><div style={{ background: t.soft, padding: '0.9em 1.2em', display: 'flex', alignItems: 'center', gap: '1.2em' }}>
        {logo(4)}
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', minWidth: '14em' }}>{jab}<div style={{ minHeight: '3.2em' }}>{ttd}</div>{nama}</div>
      </div><Strip t={t} h={0.8} /></div>
    );
    default: return ( // kotak (referensi): logo | nama + jabatan, pita motif atas & bawah
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '62%' }}>
          <Strip t={t} h={0.7} />
          <div style={{ borderLeft: `1px solid ${t.ink}`, borderRight: `1px solid ${t.ink}`, display: 'grid', gridTemplateColumns: '9em minmax(0,1fr)' }}>
            <div style={{ borderRight: `1px solid ${t.ink}`, padding: '0.5em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{logo(5.2)}</div>
            <div style={{ padding: '0.6em', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>{ttd}{nama}{jab}</div>
          </div>
          <Strip t={t} h={0.7} />
        </div>
      </div>
    );
  }
}

export function Hal2({ t, d }: P) {
  return (
    <Frame t={t}>
      {t.kop2 && <Kop t={t} d={d} small />}
      <Judul t={t} text={d.judul2} />
      <Daftar t={t} d={d} />
      <div style={{ height: '1.6em' }} />
      <Pengesah t={t} d={d} />
    </Frame>
  );
}

export const rootStyle = (t: Tpl, fs: number): CSSProperties => ({ width: '100%', height: '100%', boxSizing: 'border-box', color: t.ink, fontFamily: fam(t.body), fontSize: fs, lineHeight: 1.35, background: '#fff', overflow: 'visible' });
