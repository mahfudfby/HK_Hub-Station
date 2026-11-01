import type { CSSProperties, ReactNode } from 'react';
import { fxOf, type Offset } from '../../shared/components/PositionPad';
import { cssFamily, useGoogleFonts } from '../../shared/lib/fonts';
import type { Tone, Tpl } from './templates';

// Undangan lipat 3 dalam 1 halaman: 3 panel (kolom di kertas landscape, baris di kertas vertikal), garis lipat ikut tercetak.
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

type Panel = 'sampul' | 'waktu' | 'penutup';
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

function Corners({ c, k }: { c: Tone; k: number }) {
  const b = `${2.5 * k}px solid ${c.accent}`;
  const s = (v: 'top' | 'bottom', h: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', [v]: 0, [h]: 0, width: 26 * k, height: 26 * k,
    [v === 'top' ? 'borderTop' : 'borderBottom']: b, [h === 'left' ? 'borderLeft' : 'borderRight']: b,
  });
  return <>{(['top', 'bottom'] as const).flatMap((v) => (['left', 'right'] as const).map((h) => <span key={v + h} style={s(v, h)} />))}</>;
}

// Satu panel: warna blok, pita, bingkai. minHeight (bukan height): isi kepanjangan memanjangkan halaman sehingga useFitScale mengecilkan teks.
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
    <div data-panel={id} style={{ position: 'relative', width: w, minHeight: h, flexShrink: 0, boxSizing: 'border-box', padding: band ? `${pad + 14 * k}px ${pad}px` : pad,
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

function Sampul({ t, d, c, k, wide, kotak }: { t: Tpl; d: Isi; c: Tone; k: number; wide: boolean; kotak: ReactNode }) {
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

  if (wide) {
    // Panel mendatar: visual di satu sisi, teks di sisi lain (dibalik untuk sampul 'bottom')
    const words = (size: number, upper?: boolean) => d.subjudul.split(/\s+/).filter(Boolean)
      .map((w, i) => <Head key={i} t={t} k={k} size={size} c={c} style={{ textTransform: upper && !t.script ? 'uppercase' : undefined }}>{w}</Head>);
    const bigTitle = t.cover === 'big' || t.cover === 'vertical';
    const visual = t.cover === 'medallion' ? (
      <div style={{ alignSelf: 'center', width: 150 * k, height: 150 * k, borderRadius: '50%', border: `${6 * k}px double ${c.accent}`, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 * k }}>
        {d.foto ? <Photo t={{ ...t, photo: 'round' }} src={d.foto} off={d.fotoOff} c={c} k={k} size={110} /> : <Arab t={t} k={k} size={16} style={{ color: c.accent }}>{ISTIRJA}</Arab>}
      </div>
    ) : t.cover === 'vertical' ? (
      <div style={{ borderLeft: `${5 * k}px solid ${c.accent}`, paddingLeft: 10 * k, textAlign: 'left' }}>{judul}{words(30)}</div>
    ) : t.cover === 'big' ? <>{judul}<Rule c={c} k={k} w={100} />{words(36, true)}<Rule c={c} k={k} w={100} /></>
      : d.foto ? foto(120) : <>{judul}{sub}</>;
    const text = <>{!bigTitle && d.foto && judul}{!bigTitle && d.foto && sub}{per}{bigTitle && foto(64)}{nama}{kotak}</>;
    const col = (x: ReactNode) => <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{x}</div>;
    return (
      <div style={{ flex: '1 0 auto', display: 'flex', gap: 16 * k, alignItems: 'stretch' }}>
        {t.cover === 'bottom' ? <>{col(text)}{col(visual)}</> : <>{col(visual)}{col(text)}</>}
      </div>
    );
  }
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

// Satu kotak putih polos "Kepada Yth." di sampul: ruang kosong untuk ditulis bolpoin setelah difotokopi massal.
// Selalu putih bertinta gelap (juga di template sampul gelap) agar tulisan tangan jelas.
function KotakPenerima({ d, c, k, wide }: { d: Isi; c: Tone; k: number; wide: boolean }) {
  return (
    <div style={{ alignSelf: 'center', width: '100%', minHeight: (wide ? 70 : 84) * k, boxSizing: 'border-box', marginTop: 12 * k, background: '#ffffff', color: '#111827',
      border: `${1.5 * k}px solid ${c.accent}`, borderRadius: 6 * k, padding: `${6 * k}px ${10 * k}px`, textAlign: 'left', fontSize: 10.5 * k, lineHeight: 1.3 }}>
      <div style={{ fontWeight: 700 }}>Kepada Yth.</div>
      {d.kepada && <div style={{ fontWeight: 700, fontSize: 12.5 * k, paddingTop: 4 * k, ...pre }}>{d.kepada}</div>}
    </div>
  );
}

// Dua kolom berdampingan di panel mendatar; di panel tegak cukup ditumpuk
function Cols({ wide, k, a, b }: { wide: boolean; k: number; a: ReactNode; b: ReactNode }) {
  if (!wide) return <>{a}{b}</>;
  const col: CSSProperties = { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' };
  return <div style={{ flex: '1 0 auto', display: 'flex', gap: 16 * k }}><div style={col}>{a}</div><div style={col}>{b}</div></div>;
}

// Satu halaman = 3 panel: [sampul][undangan: pembuka + waktu & tempat][penutup: doa + keluarga].
// Kertas landscape: 3 kolom tegak. Kertas vertikal: 3 baris mendatar, isi tiap panel ditata mendatar (2 kolom).
export function Lembar({ t, d, k, pad, W, H }: { t: Tpl; d: Isi; k: number; pad: number; W: number; H: number }) {
  const wide = H > W;
  const pw = wide ? W : W / 3;
  const ph = wide ? H / 3 : H;
  const box = (id: Panel, render: (c: Tone) => ReactNode) =>
    <PanelBox t={t} id={id} k={k} pad={pad} w={pw} h={ph}>{render}</PanelBox>;
  const small: CSSProperties = { fontSize: 10 * k, lineHeight: 1.4 };
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', display: 'flex', flexDirection: wide ? 'column' : 'row', background: t.paper, color: t.ink,
      fontFamily: cssFamily(t.body, 'serif'), fontSize: 11.5 * k, lineHeight: 1.5 }}>
      {box('sampul', (c) => {
        const kotak = <KotakPenerima d={d} c={c} k={k} wide={wide} />;
        return wide ? <Sampul t={t} d={d} c={c} k={k} wide kotak={kotak} /> : <><Sampul t={t} d={d} c={c} k={k} wide={false} kotak={null} />{kotak}</>;
      })}
      {box('waktu', (c) => <Cols wide={wide} k={k}
        a={<>
          <Arab t={t} k={k} size={20} style={{ color: c.accent }}>{BASMALAH}</Arab>
          <div style={{ fontWeight: 700, margin: `${2 * k}px 0 ${6 * k}px` }}>{d.salam}</div>
          <div style={{ textAlign: 'justify', ...pre }}>{d.pembuka}</div>
          <div style={{ margin: `${8 * k}px 0` }}>
            <Head t={t} k={k} size={14} c={c}>{peringatanText(d.hari)}</Head>
            <div style={{ fontWeight: 700, fontSize: 12.5 * k, ...pre }}>{almLabel(d.jk)} {d.nama}</div>
            {d.nasab && <div style={{ fontSize: 11 * k }}>{d.jk === 'P' ? 'binti' : 'bin'} {d.nasab}</div>}
          </div>
          <Gap />
        </>}
        b={<>
          <Head t={t} k={k} size={16} c={c}>Waktu &amp; Tempat</Head>
          <Rule c={c} k={k} />
          {d.pengantar && <div style={{ marginBottom: 8 * k, ...pre }}>{d.pengantar}</div>}
          <Waktu t={t} d={d} c={c} k={k} />
          <Gap />
        </>} />)}
      {box('penutup', (c) => <Cols wide={wide} k={k}
        a={<>
          <div style={{ textAlign: 'justify', ...pre }}>{d.penutup}</div>
          <Arab t={t} k={k} size={17} style={{ margin: `${6 * k}px 0 0` }}>{d.doaArab}</Arab>
          {d.doaArti && <div style={{ fontSize: 10 * k, fontStyle: 'italic', ...pre }}>“{d.doaArti}”</div>}
          <div style={{ fontWeight: 700, margin: `${8 * k}px 0` }}>{d.wassalam}</div>
          <Gap />
        </>}
        b={<>
          <Gap />
          <div>{d.ttdHeading}</div>
          {d.ttd ? (() => { const fx = fxOf(d.ttdOff, 'ttd'); return (
            <div style={{ height: 56 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src={d.ttd} alt="Tanda tangan" style={{ position: 'relative', left: d.ttdOff.x, top: d.ttdOff.y, height: 52 * k * fx.z, maxWidth: 'none', opacity: fx.a }} />
            </div>); })() : <div style={{ height: 6 * k }} />}
          <Head t={t} k={k} size={14} c={c} style={pre}>{d.keluarga}</Head>
          {d.anggota && <div style={{ ...small, marginTop: 4 * k, ...pre }}>{d.anggota}</div>}
          {d.turut && <div style={{ ...small, marginTop: 8 * k }}><b style={{ color: c.accent }}>Turut mengundang:</b><div style={pre}>{d.turut}</div></div>}
          {d.alamat && <div style={{ ...small, marginTop: 6 * k, ...pre }}><b style={{ color: c.accent }}>Alamat:</b> {d.alamat}</div>}
          {d.catatan && <div style={{ ...small, marginTop: 6 * k, fontStyle: 'italic', ...pre }}>{d.catatan}</div>}
          <Gap />
        </>} />)}
      {/* Garis lipat (bantu melipat), ikut tercetak */}
      {[1, 2].map((i) => <div key={i} aria-hidden="true" style={wide
        ? { position: 'absolute', left: 0, right: 0, top: ph * i, borderTop: '1px dotted #9ca3af' }
        : { position: 'absolute', top: 0, bottom: 0, left: pw * i, borderLeft: '1px dotted #9ca3af' }} />)}
    </div>
  );
}
