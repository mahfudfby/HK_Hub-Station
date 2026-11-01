import type { CSSProperties, ReactNode } from 'react';
import { fxOf, type Offset } from '../../shared/components/PositionPad';
import { cssFamily, useGoogleFonts } from '../../shared/lib/fonts';
import type { Tone, Tpl } from './templates';

// Tampilan undangan lipat 3: 1 sisi = 3 panel selebar W/3, garis lipat titik-titik ikut tercetak.
// Style inline + CSS aman html2canvas (tanpa gradient/filter/transform/box-shadow/text-decoration).

export type Isi = {
  foto: string; fotoOff: Offset; ttd: string; ttdOff: Offset;
  jk: 'L' | 'P'; nama: string; nasab: string; wafat: string; hari: string;
  judul: string; subjudul: string;
  kepada: string; diTempat: string; catatan: string;
  doaArab: string; doaArti: string; turut: string; alamat: string;
  salam: string; pembuka: string; pengantar: string; tanggal: string; waktu: string; tempat: string; acara: string;
  penutup: string; wassalam: string; ttdHeading: string; keluarga: string; anggota: string;
};

export const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ';
export const ISTIRJA = 'إِنَّا لِلّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُوْنَ';

export const fmtHari = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
export const almLabel = (jk: 'L' | 'P') => (jk === 'P' ? 'Almarhumah' : 'Almarhum');
export const peringatanText = (hari: string) => (/^haul/i.test(hari.trim()) ? `Memperingati ${hari}` : `Memperingati ${hari} Wafatnya`);

type Panel = 'penerima' | 'belakang' | 'sampul' | 'pembuka' | 'waktu' | 'penutup';
const toneOf = (t: Tpl, id: Panel): Tone =>
  t.fill === 'all' || (id === 'sampul' && (t.fill === 'cover' || t.fill === 'alt')) || (id === 'waktu' && t.fill === 'alt')
    ? t.tone : { bg: t.paper, ink: t.ink, accent: t.accent };

const pre: CSSProperties = { whiteSpace: 'pre-line', overflowWrap: 'anywhere' };

function Arab({ t, k, size, children, style }: { t: Tpl; k: number; size: number; children: ReactNode; style?: CSSProperties }) {
  return <div dir="rtl" lang="ar" style={{ fontFamily: cssFamily(t.arab, 'serif'), fontSize: size * k, lineHeight: 1.9, textAlign: 'center', ...style }}>{children}</div>;
}

function Head({ t, k, size, c, children, style }: { t: Tpl; k: number; size: number; c: Tone; children: ReactNode; style?: CSSProperties }) {
  const w = t.headW ?? [400, 700];
  return (
    <div style={{ fontFamily: cssFamily(t.head, t.script ? 'cursive' : 'serif'), fontWeight: w.includes(700) ? 700 : 400, fontSize: size * k * (t.script ? 1.3 : 1),
      lineHeight: 1.15, color: c.accent, ...style }}>{children}</div>
  );
}

const Rule = ({ c, k, w = 60 }: { c: Tone; k: number; w?: number }) => <div style={{ width: w * k, borderTop: `${1.2 * k}px solid ${c.accent}`, margin: `${8 * k}px auto` }} />;
const Gap = () => <div style={{ flex: '1 1 0' }} />;
const DotLine = ({ c, k }: { c: Tone; k: number }) => <div style={{ height: 22 * k, borderBottom: `1.5px dotted ${c.ink}` }} />;

function Corners({ c, k }: { c: Tone; k: number }) {
  const b = `${2.5 * k}px solid ${c.accent}`;
  const s = (v: 'top' | 'bottom', h: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', [v]: 0, [h]: 0, width: 26 * k, height: 26 * k,
    [v === 'top' ? 'borderTop' : 'borderBottom']: b, [h === 'left' ? 'borderLeft' : 'borderRight']: b,
  });
  return <>{(['top', 'bottom'] as const).flatMap((v) => (['left', 'right'] as const).map((h) => <span key={v + h} style={s(v, h)} />))}</>;
}

// Satu panel: warna blok, pita, bingkai. Isi boleh meluber (overflow terlihat) agar useFitScale bisa mengecilkan teks.
function PanelBox({ t, id, k, pad, w, h, align = 'center', children }: {
  t: Tpl; id: Panel; k: number; pad: number; w: number; h: number; align?: 'center' | 'left'; children: (c: Tone) => ReactNode;
}) {
  const c = toneOf(t, id);
  const band = t.fill === 'band';
  const line = (px: number) => `${px * k}px solid ${c.accent}`;
  const frame: CSSProperties =
    t.frame === 'single' ? { border: line(1.2) }
    : t.frame === 'double' ? { border: `${4.5 * k}px double ${c.accent}` }
    : t.frame === 'rounded' ? { border: line(1.5), borderRadius: 14 * k }
    : t.frame === 'inset' ? { border: line(1), padding: 3 * k }
    : t.frame === 'side' ? { borderTop: line(3), borderBottom: line(3) }
    : {};
  const inner: CSSProperties = { flex: '1 0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', textAlign: align,
    padding: t.frame === 'none' ? 4 * k : t.frame === 'corners' ? `${20 * k}px ${16 * k}px` : `${14 * k}px ${12 * k}px` };
  return (
    <div data-panel={id} style={{ position: 'relative', width: w, height: h, flexShrink: 0, boxSizing: 'border-box', padding: band ? `${pad + 14 * k}px ${pad}px` : pad,
      background: c.bg, color: c.ink, display: 'flex', flexDirection: 'column' }}>
      {band && <>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 14 * k, background: t.tone.bg }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14 * k, background: t.tone.bg }} />
      </>}
      <div style={{ position: 'relative', flex: '1 0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', ...frame }}>
        {t.frame === 'corners' && <Corners c={c} k={k} />}
        {t.frame === 'inset'
          ? <div style={{ ...inner, border: line(1) }}>{children(c)}</div>
          : <div style={inner}>{children(c)}</div>}
      </div>
    </div>
  );
}

// Foto almarhum/ah: background-image (html2canvas tidak mendukung object-fit) dipotong border-radius
function Photo({ t, src, off, c, k, size }: { t: Tpl; src: string; off: Offset; c: Tone; k: number; size: number }) {
  if (!src) return null;
  const fx = fxOf(off, 'logo');
  const round = t.photo === 'round';
  const w = size * k * fx.z * (round ? 1 : 0.85);
  const h = size * k * fx.z * (round ? 1 : 1.1);
  return (
    <div role="img" aria-label="Foto" style={{ alignSelf: 'center', position: 'relative', left: off.x, top: off.y, width: w, height: h, flexShrink: 0, opacity: fx.a,
      boxSizing: 'border-box', border: `${3 * k}px solid ${c.accent}`, borderRadius: round ? '50%' : t.photo === 'arch' ? `${w / 2}px ${w / 2}px ${4 * k}px ${4 * k}px` : 4 * k,
      backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat', margin: `${8 * k}px 0` }} />
  );
}

function Sampul({ t, d, c, k }: { t: Tpl; d: Isi; c: Tone; k: number }) {
  const judul = <div style={{ fontSize: 12 * k, letterSpacing: 4 * k, fontWeight: 700, textTransform: 'uppercase' }}>{d.judul}</div>;
  const sub = <Head t={t} k={k} size={26} c={c} style={{ margin: `${4 * k}px 0` }}>{d.subjudul}</Head>;
  const per = <div style={{ fontSize: 11.5 * k }}>{peringatanText(d.hari)}</div>;
  const nama = (
    <div style={{ margin: `${6 * k}px 0` }}>
      <div style={{ fontSize: 11 * k }}>{almLabel(d.jk)}</div>
      <div style={{ fontSize: 15 * k, fontWeight: 700, lineHeight: 1.25, ...pre }}>{d.nama}</div>
      {d.nasab && <div style={{ fontSize: 11.5 * k }}>{d.jk === 'P' ? 'binti' : 'bin'} {d.nasab}</div>}
      {d.wafat && <div style={{ fontSize: 10.5 * k, marginTop: 4 * k }}>Wafat: {fmtHari(d.wafat)}</div>}
    </div>
  );
  const foto = (size: number) => <Photo t={t} src={d.foto} off={d.fotoOff} c={c} k={k} size={size} />;
  const istirja = <Arab t={t} k={k} size={15} style={{ color: c.accent }}>{ISTIRJA}</Arab>;

  switch (t.cover) {
    case 'bottom':
      return <>{istirja}{foto(120)}{nama}<Gap /><Rule c={c} k={k} />{judul}{sub}{per}</>;
    case 'medallion':
      return (
        <>{judul}<Gap />
          <div style={{ alignSelf: 'center', width: 168 * k, height: 168 * k, borderRadius: '50%', border: `${6 * k}px double ${c.accent}`, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `${8 * k}px 0`, padding: 12 * k }}>
            {d.foto ? <Photo t={{ ...t, photo: 'round' }} src={d.foto} off={d.fotoOff} c={c} k={k} size={124} /> : <Arab t={t} k={k} size={17} style={{ color: c.accent }}>{ISTIRJA}</Arab>}
          </div>
          {sub}{per}<Gap />{nama}
        </>
      );
    case 'vertical':
      return (
        <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          {judul}
          <div style={{ borderLeft: `${5 * k}px solid ${c.accent}`, paddingLeft: 10 * k, margin: `${12 * k}px 0` }}>
            {d.subjudul.split(/\s+/).filter(Boolean).map((w, i) => <Head key={i} t={t} k={k} size={32} c={c}>{w}</Head>)}
          </div>
          {per}<Gap />
          <div style={{ display: 'flex', gap: 10 * k, alignItems: 'center' }}>{foto(84)}<div style={{ flex: 1, minWidth: 0 }}>{nama}</div></div>
          {istirja}
        </div>
      );
    case 'big':
      return (
        <>{judul}<Rule c={c} k={k} w={120} />
          {d.subjudul.split(/\s+/).filter(Boolean).map((w, i) => <Head key={i} t={t} k={k} size={42} c={c} style={{ textTransform: t.script ? undefined : 'uppercase' }}>{w}</Head>)}
          <Rule c={c} k={k} w={120} />{per}<Gap />{foto(72)}{nama}{istirja}
        </>
      );
    default: // top
      return <>{judul}{sub}{per}<Gap />{foto(130)}{nama}<Gap />{istirja}</>;
  }
}

function Waktu({ t, d, c, k }: { t: Tpl; d: Isi; c: Tone; k: number }) {
  const rows = ([['Hari / Tanggal', fmtHari(d.tanggal)], ['Waktu', d.waktu], ['Tempat', d.tempat], ['Acara', d.acara]] as const).filter((r) => r[1]);
  const lbl: CSSProperties = { fontSize: 10 * k, letterSpacing: 1.5 * k, textTransform: 'uppercase', color: c.accent, fontWeight: 700 };
  const val: CSSProperties = { fontWeight: 700, ...pre };
  switch (t.time) {
    case 'table':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'max-content auto 1fr', columnGap: 6 * k, textAlign: 'left', borderTop: `1px solid ${c.accent}` }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display: 'contents' }}>
              {[l, ':', v].map((x, i) => <div key={i} style={{ padding: `${6 * k}px 0`, borderBottom: `1px solid ${c.accent}`, ...(i === 2 ? val : {}) }}>{x}</div>)}
            </div>
          ))}
        </div>
      );
    case 'card':
      return (
        <div style={{ border: `${1.5 * k}px solid ${c.accent}`, borderRadius: 10 * k, padding: 12 * k, textAlign: 'left' }}>
          {rows.map(([l, v], i) => <div key={l} style={{ marginTop: i ? 8 * k : 0 }}><div style={lbl}>{l}</div><div style={val}>{v}</div></div>)}
        </div>
      );
    case 'timeline':
      return (
        <div style={{ borderLeft: `${2 * k}px solid ${c.accent}`, marginLeft: 6 * k, textAlign: 'left' }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ position: 'relative', padding: `0 0 ${12 * k}px ${16 * k}px` }}>
              <div style={{ position: 'absolute', left: -6 * k, top: 3 * k, width: 10 * k, height: 10 * k, borderRadius: '50%', background: c.accent }} />
              <div style={lbl}>{l}</div><div style={val}>{v}</div>
            </div>
          ))}
        </div>
      );
    case 'pills':
      return (
        <div>
          {rows.map(([l, v]) => (
            <div key={l} style={{ marginBottom: 10 * k }}>
              <span style={{ display: 'inline-block', background: c.accent, color: c.bg, borderRadius: 999, padding: `${2 * k}px ${12 * k}px`, fontSize: 10 * k, fontWeight: 700 }}>{l}</span>
              <div style={{ ...val, marginTop: 3 * k }}>{v}</div>
            </div>
          ))}
        </div>
      );
    default: // center
      return <div>{rows.map(([l, v]) => <div key={l} style={{ marginBottom: 10 * k }}><div style={lbl}>{l}</div><div style={{ ...val, fontSize: 13 * k }}>{v}</div></div>)}</div>;
  }
}

export function useTplFonts(t: Tpl) {
  useGoogleFonts([{ family: t.body, weights: [400, 700] }, { family: t.head, weights: t.headW ?? [400, 700] }, { family: t.arab, weights: [400, 700] }]);
}

// Satu sisi kertas. sisi luar: [penerima][belakang][sampul]; sisi dalam: [pembuka][waktu][penutup]
export function Sisi({ t, d, sisi, k, pad, W, H }: { t: Tpl; d: Isi; sisi: 'luar' | 'dalam'; k: number; pad: number; W: number; H: number }) {
  const pw = W / 3;
  const box = (id: Panel, render: (c: Tone) => ReactNode, align?: 'left') =>
    <PanelBox t={t} id={id} k={k} pad={pad} w={pw} h={H} align={align}>{render}</PanelBox>;
  const small: CSSProperties = { fontSize: 10 * k, lineHeight: 1.4 };
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', display: 'flex', background: t.paper, color: t.ink,
      fontFamily: cssFamily(t.body, 'serif'), fontSize: 11.5 * k, lineHeight: 1.5 }}>
      {sisi === 'luar' ? <>
        {box('penerima', (c) => <>
          <Gap />
          <div style={{ fontSize: 12 * k }}>Kepada Yth.</div>
          {d.kepada
            ? <div style={{ fontWeight: 700, fontSize: 13 * k, borderBottom: `1.5px dotted ${c.ink}`, paddingBottom: 4 * k, ...pre }}>{d.kepada}</div>
            : <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 * k }}><span>Bapak/Ibu/Sdr.</span><div style={{ flex: 1 }}><DotLine c={c} k={k} /></div></div>
              <DotLine c={c} k={k} /><DotLine c={c} k={k} />
            </>}
          <div style={{ marginTop: 6 * k }}>{d.diTempat}</div>
          <Gap />
          {d.catatan && <div style={{ ...small, textAlign: 'center', ...pre }}>{d.catatan}</div>}
        </>, 'left')}
        {box('belakang', (c) => <>
          <Head t={t} k={k} size={14} c={c}>Doa untuk {almLabel(d.jk)}</Head>
          <Arab t={t} k={k} size={18} style={{ margin: `${6 * k}px 0` }}>{d.doaArab}</Arab>
          {d.doaArti && <div style={{ fontSize: 10.5 * k, ...pre }}>“{d.doaArti}”</div>}
          <Rule c={c} k={k} />
          <Gap />
          {d.turut && <><div style={{ fontWeight: 700, color: c.accent }}>Turut mengundang:</div><div style={{ ...small, ...pre, marginBottom: 10 * k }}>{d.turut}</div></>}
          {d.alamat && <><div style={{ fontWeight: 700, color: c.accent }}>Alamat shohibul hajat:</div><div style={{ ...small, ...pre }}>{d.alamat}</div></>}
        </>)}
        {box('sampul', (c) => <Sampul t={t} d={d} c={c} k={k} />)}
      </> : <>
        {box('pembuka', (c) => <>
          <Arab t={t} k={k} size={22} style={{ color: c.accent }}>{BASMALAH}</Arab>
          <Rule c={c} k={k} />
          <div style={{ fontWeight: 700, margin: `${4 * k}px 0 ${8 * k}px` }}>{d.salam}</div>
          <div style={{ textAlign: 'justify', ...pre }}>{d.pembuka}</div>
          <Gap />
          <div style={{ margin: `${10 * k}px 0` }}>
            <Head t={t} k={k} size={15} c={c}>{peringatanText(d.hari)}</Head>
            <div style={{ fontSize: 11 * k, marginTop: 4 * k }}>{almLabel(d.jk)}</div>
            <div style={{ fontWeight: 700, fontSize: 13.5 * k, ...pre }}>{d.nama}</div>
            {d.nasab && <div>{d.jk === 'P' ? 'binti' : 'bin'} {d.nasab}</div>}
          </div>
          <Gap />
        </>)}
        {box('waktu', (c) => <>
          <Head t={t} k={k} size={17} c={c}>Waktu &amp; Tempat</Head>
          <Rule c={c} k={k} />
          {d.pengantar && <div style={{ marginBottom: 10 * k, ...pre }}>{d.pengantar}</div>}
          <Gap />
          <Waktu t={t} d={d} c={c} k={k} />
          <Gap />
          <Arab t={t} k={k} size={14} style={{ color: c.accent }}>{ISTIRJA}</Arab>
        </>)}
        {box('penutup', (c) => <>
          <div style={{ textAlign: 'justify', ...pre }}>{d.penutup}</div>
          <div style={{ fontWeight: 700, margin: `${10 * k}px 0` }}>{d.wassalam}</div>
          <Gap />
          <div>{d.ttdHeading}</div>
          {d.ttd ? (() => { const fx = fxOf(d.ttdOff, 'ttd'); return (
            <div style={{ height: 60 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src={d.ttd} alt="Tanda tangan" style={{ position: 'relative', left: d.ttdOff.x, top: d.ttdOff.y, height: 56 * k * fx.z, maxWidth: 'none', opacity: fx.a }} />
            </div>); })() : <div style={{ height: 8 * k }} />}
          <Head t={t} k={k} size={14} c={c} style={pre}>{d.keluarga}</Head>
          {d.anggota && <div style={{ ...small, marginTop: 6 * k, ...pre }}>{d.anggota}</div>}
          <Gap />
        </>)}
      </>}
      {/* Garis lipat (bantu melipat), ikut tercetak */}
      {[1, 2].map((i) => <div key={i} aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: pw * i, borderLeft: '1px dotted #9ca3af' }} />)}
    </div>
  );
}
