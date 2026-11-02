import type { ReactNode } from 'react';
import { LBL, marginPx, periodeEn, PALET, type Bagian, type Cv, type Edu, type Job, type Lbl, type Org, type Pal, type Pelatihan, type Ref } from './CvKit';

// 20 template CV Creative + 20 template CV ATS. Isi data SAMA; yang berbeda: keluarga tata letak (lay), kolom samping,
// gaya judul, penanda butir, bentuk foto, daftar, kop pekerjaan, kop halaman, dan font.
// Aturan: margin tepi 1,5 cm (marginPx), grid kolom tetap, garis lurus, teks ≥ 12 px, palet berkontras ≥ 4,5:1 (CvKit).
// Semua CSS aman untuk html2canvas (warna polos, border, grid/flex; tanpa gradient/filter/transform).

// ============================================================
// SECTION: Definisi template
// ============================================================
export type Lay = 'ref' | 'kiri' | 'kanan' | 'pita' | 'sama' | 'satu' | 'tengah' | 'waktu' | 'kartu' | 'label';
export type Tpl = {
  id: string; name: string; desc: string;
  lay: Lay; flip: boolean; sw: number; // sw = lebar kolom samping (px)
  head: 'rule' | 'bar' | 'box' | 'caps' | 'num'; bul: 'dot' | 'sq' | 'dash' | 'none';
  photo: 'rect' | 'round' | 'circle' | 'none'; pal: string; list: 'bullet' | 'cols2' | 'inline';
  job: 'split' | 'stack' | 'row' | 'time'; hdr: 'kanan' | 'kiri' | 'tengah'; font: 'sans' | 'serif';
  plain?: boolean; track?: number; hs?: number;
};
const mk = (id: string, name: string, desc: string, o: Partial<Tpl>): Tpl => ({
  lay: 'satu', flip: false, sw: 240, head: 'rule', bul: 'dot', photo: 'none', pal: 'hitam', list: 'bullet', job: 'row', hdr: 'kanan', font: 'sans', id, name, desc, ...o,
});

export const TEMPLATES_CREATIVE: Tpl[] = [
  mk('replika', '01. Replika Referensi', 'Nama besar kiri, foto & kontak kanan, judul bergaris tebal', { lay: 'ref', sw: 268, head: 'rule', bul: 'dot', photo: 'rect', pal: 'hitam', job: 'split', plain: true, track: 0.4, hs: 24 }),
  mk('navy-kiri', '02. Sidebar Kiri Navy', 'Kolom kiri berwarna: foto bulat, kontak, keahlian', { lay: 'kiri', sw: 232, head: 'caps', bul: 'sq', photo: 'circle', pal: 'navy', job: 'row' }),
  mk('marun-kanan', '03. Sidebar Kanan Marun', 'Kolom kanan berwarna: foto, kontak, pendidikan', { lay: 'kanan', sw: 232, head: 'rule', bul: 'dash', photo: 'round', pal: 'marun', job: 'stack' }),
  mk('pita-teal', '04. Pita Teal', 'Pita warna penuh di atas, foto kiri, dua kolom di bawah', { lay: 'pita', sw: 240, head: 'bar', bul: 'dot', photo: 'circle', pal: 'teal', job: 'stack', hdr: 'kiri' }),
  mk('pita-ungu', '05. Pita Ungu Cermin', 'Pita atas, foto kanan, kolom samping di kiri', { lay: 'pita', flip: true, sw: 240, head: 'box', bul: 'sq', photo: 'round', pal: 'ungu', job: 'row', hdr: 'kanan' }),
  mk('tengah-emas', '06. Tengah Elegan', 'Kop rata tengah dengan foto bulat, serif, keahlian satu baris', { lay: 'tengah', head: 'caps', bul: 'dot', photo: 'circle', pal: 'emas', list: 'inline', job: 'row', hdr: 'tengah', font: 'serif' }),
  mk('sama-samudra', '07. Dua Kolom Sama Rata', 'Kop atas, dua kolom sama lebar, judul bernomor', { lay: 'sama', sw: 0, head: 'num', bul: 'dash', photo: 'rect', pal: 'samudra', job: 'stack', hdr: 'kanan' }),
  mk('waktu-hijau', '08. Garis Waktu Hijau', 'Tanggal di kolom kiri, uraian di kanan', { lay: 'waktu', head: 'bar', bul: 'dot', photo: 'round', pal: 'hijau', job: 'time', hdr: 'kiri' }),
  mk('kartu-magenta', '09. Kartu Magenta', 'Setiap pekerjaan dalam kotak bergaris', { lay: 'kartu', head: 'box', bul: 'sq', photo: 'rect', pal: 'magenta', job: 'row', hdr: 'kanan' }),
  mk('label-jingga', '10. Label Kiri Jingga', 'Nama bagian di kolom kiri, isi di kanan, garis pemisah lurus', { lay: 'label', head: 'caps', bul: 'dot', photo: 'round', pal: 'jingga', list: 'inline', job: 'row', hdr: 'kanan' }),
  mk('satu-foto', '11. Satu Kolom Foto Bulat', 'Satu kolom, foto bulat kiri, keahlian dua kolom', { lay: 'satu', head: 'rule', bul: 'dot', photo: 'circle', pal: 'hitam', list: 'cols2', job: 'row', hdr: 'kiri' }),
  mk('ref-cermin', '12. Referensi Cermin', 'Kolom samping di kiri, nama besar di kanan', { lay: 'ref', flip: true, sw: 250, head: 'bar', bul: 'sq', photo: 'circle', pal: 'samudra', job: 'stack' }),
  mk('kiri-lebar', '13. Sidebar Kiri Lebar', 'Kolom kiri hijau lebar, judul berkotak', { lay: 'kiri', sw: 280, head: 'box', bul: 'dot', photo: 'rect', pal: 'hijau', job: 'split' }),
  mk('kanan-ramping', '14. Sidebar Kanan Ramping', 'Kolom kanan ungu ramping, judul bernomor', { lay: 'kanan', sw: 204, head: 'num', bul: 'dash', photo: 'circle', pal: 'ungu', job: 'row' }),
  mk('pita-besar', '15. Pita Tengah Jingga', 'Pita rata tengah dengan foto, kolom samping lebar', { lay: 'pita', sw: 280, head: 'caps', bul: 'dot', photo: 'round', pal: 'jingga', job: 'row', hdr: 'tengah' }),
  mk('sama-cermin', '16. Dua Kolom Cermin', 'Dua kolom, kolom kanan memuat pengalaman', { lay: 'sama', flip: true, sw: 0, head: 'rule', bul: 'sq', photo: 'circle', pal: 'teal', job: 'row', hdr: 'kiri' }),
  mk('waktu-ungu', '17. Garis Waktu Serif', 'Garis waktu serif ungu, keahlian dua kolom', { lay: 'waktu', head: 'caps', bul: 'sq', photo: 'rect', pal: 'ungu', list: 'cols2', job: 'time', hdr: 'kanan', font: 'serif' }),
  mk('kartu-navy', '18. Kartu Navy', 'Kartu bergaris navy, foto bulat kiri', { lay: 'kartu', head: 'bar', bul: 'dash', photo: 'circle', pal: 'navy', job: 'stack', hdr: 'kiri' }),
  mk('label-hijau', '19. Label Kiri Hijau', 'Label kiri bernomor, keahlian satu baris', { lay: 'label', head: 'num', bul: 'dot', photo: 'rect', pal: 'hijau', list: 'inline', job: 'stack', hdr: 'kiri' }),
  mk('tengah-marun', '20. Tengah Marun', 'Kop tengah, judul berkotak marun, keahlian dua kolom', { lay: 'tengah', head: 'box', bul: 'sq', photo: 'round', pal: 'marun', list: 'cols2', job: 'stack', hdr: 'tengah' }),
];

const ats = (id: string, name: string, desc: string, o: Partial<Tpl>) => mk(id, name, desc, { pal: 'ats', photo: 'none', ...o });
export const TEMPLATES_ATS: Tpl[] = [
  ats('klasik', '01. Klasik Satu Kolom', 'Satu kolom, judul bergaris, keahlian satu baris (paling aman untuk ATS)', { lay: 'satu', head: 'rule', bul: 'dot', list: 'inline', job: 'row' }),
  ats('tengah-formal', '02. Tengah Formal Serif', 'Kop rata tengah, huruf serif', { lay: 'tengah', head: 'caps', bul: 'dot', list: 'inline', job: 'row', hdr: 'tengah', font: 'serif' }),
  ats('waktu', '03. Garis Waktu', 'Tanggal di kolom kiri, uraian di kanan', { lay: 'waktu', head: 'bar', bul: 'dot', list: 'bullet', job: 'time' }),
  ats('label', '04. Label Kiri', 'Nama bagian di kolom kiri, isi di kanan', { lay: 'label', head: 'caps', bul: 'dot', list: 'inline', job: 'stack' }),
  ats('satu-kotak', '05. Judul Blok Hitam', 'Judul putih di blok hitam, satu kolom', { lay: 'satu', head: 'box', bul: 'sq', list: 'bullet', job: 'stack' }),
  ats('kartu-garis', '06. Kotak Garis Serif', 'Setiap pekerjaan dalam kotak bergaris', { lay: 'kartu', head: 'rule', bul: 'dash', list: 'bullet', job: 'row', font: 'serif' }),
  ats('sama', '07. Dua Kolom Sama Rata (2 kolom)', 'Dua kolom sama lebar, judul bernomor', { lay: 'sama', sw: 0, head: 'num', bul: 'dot', list: 'bullet', job: 'stack' }),
  ats('kiri-garis', '08. Samping Kiri Bergaris (2 kolom)', 'Kolom samping kiri dipisah garis tegak', { lay: 'kiri', sw: 220, head: 'caps', bul: 'dot', list: 'bullet', job: 'row' }),
  ats('kanan-garis', '09. Samping Kanan Bergaris (2 kolom)', 'Kolom samping kanan dipisah garis tegak', { lay: 'kanan', sw: 220, head: 'bar', bul: 'sq', list: 'bullet', job: 'stack' }),
  ats('pita-garis', '10. Kop Bergaris Serif (2 kolom)', 'Kop lebar penuh bergaris, dua kolom di bawah', { lay: 'pita', sw: 240, head: 'rule', bul: 'dot', list: 'bullet', job: 'row', font: 'serif' }),
  ats('ref', '11. Referensi Dua Kolom (2 kolom)', 'Nama besar kiri, kolom samping kanan', { lay: 'ref', sw: 260, head: 'rule', bul: 'dot', list: 'bullet', job: 'split', plain: true, hs: 22 }),
  ats('ref-cermin', '12. Referensi Cermin (2 kolom)', 'Kolom samping di kiri', { lay: 'ref', flip: true, sw: 260, head: 'caps', bul: 'dash', list: 'bullet', job: 'row' }),
  ats('tengah-nomor', '13. Tengah Bernomor', 'Kop tengah, judul bernomor', { lay: 'tengah', head: 'num', bul: 'dot', list: 'inline', job: 'stack' }),
  ats('satu-nomor', '14. Satu Kolom Bernomor Serif', 'Satu kolom serif, judul bernomor', { lay: 'satu', head: 'num', bul: 'dash', list: 'bullet', job: 'row', font: 'serif' }),
  ats('waktu-caps', '15. Garis Waktu Serif', 'Garis waktu serif, keahlian dua kolom', { lay: 'waktu', head: 'caps', bul: 'sq', list: 'cols2', job: 'time', font: 'serif' }),
  ats('label-serif', '16. Label Kiri Serif', 'Label kiri serif, judul bergaris tegak', { lay: 'label', head: 'bar', bul: 'dot', list: 'inline', job: 'row', font: 'serif' }),
  ats('pita-cermin', '17. Kop Bergaris Cermin (2 kolom)', 'Kop lebar penuh, kolom samping di kiri', { lay: 'pita', flip: true, sw: 240, head: 'box', bul: 'sq', list: 'bullet', job: 'stack' }),
  ats('sama-cermin', '18. Dua Kolom Cermin (2 kolom)', 'Dua kolom, kolom kanan memuat pengalaman', { lay: 'sama', flip: true, sw: 0, head: 'rule', bul: 'dash', list: 'bullet', job: 'split' }),
  ats('kartu-box', '19. Kotak Judul Hitam', 'Kotak bergaris, judul blok hitam', { lay: 'kartu', head: 'box', bul: 'dot', list: 'inline', job: 'stack' }),
  ats('satu-serif', '20. Satu Kolom Serif', 'Satu kolom serif klasik', { lay: 'satu', head: 'rule', bul: 'dot', list: 'bullet', job: 'split', font: 'serif' }),
];

// Tidak boleh ada dua template dengan susunan yang sama persis
const sig = (t: Tpl) => [t.lay, t.flip, t.sw, t.head, t.bul, t.photo, t.pal, t.list, t.job, t.hdr, t.font].join();
for (const [nama, list] of [['creative', TEMPLATES_CREATIVE], ['ats', TEMPLATES_ATS]] as const) {
  console.assert(list.length === 20 && new Set(list.map((t) => t.id)).size === 20 && new Set(list.map(sig)).size === 20, `cv-${nama}: 20 template unik`);
  console.assert(list.every((t) => PALET[t.pal]), `cv-${nama}: palet ada`);
}
console.assert(TEMPLATES_ATS.every((t) => t.photo === 'none' && t.pal === 'ats'), 'cv-ats: hitam putih tanpa foto');

// ============================================================
// SECTION: Pembuat isi halaman
// ============================================================
export type Unit = { g: number; el: ReactNode };
export type Flows = { top: ReactNode; main: Unit[]; side: Unit[] };
export type Env = { cv: Cv; T: Tpl; p: Pal; k: number; foto: string; en: boolean; tr: (s: string) => string; L: Lbl; W: number; H: number };
type Col = { ink: string; muted: string; accent: string; on: string };

export const FONT = { sans: 'Arimo, Arial, Helvetica, sans-serif', serif: 'Tinos, "Times New Roman", Times, serif' };
const TWO: Lay[] = ['ref', 'kiri', 'kanan', 'pita', 'sama'];

export function buildFlows(e: Env): Flows {
  const { cv, T, p, k, tr, en, L, foto } = e;
  const z = (n: number) => Math.round(n * k * 100) / 100;
  const m = marginPx;
  let gid = 0;
  let secNo = 0;
  const filled = p.fill && (T.lay === 'kiri' || T.lay === 'kanan');
  const cm: Col = { ink: p.ink, muted: p.muted, accent: p.accent, on: p.accentInk };
  const cs: Col = filled ? { ink: p.accentInk, muted: p.accentInk, accent: p.accentInk, on: p.accent } : cm;
  const cb: Col = p.fill ? { ink: p.accentInk, muted: p.accentInk, accent: p.accentInk, on: p.accent } : cm; // pita
  const shown = (b: Bagian) => !cv.sembunyi.includes(b);
  const kont = ([['email', cv.email], ['telepon', cv.telepon], ['web', cv.web], ['alamat', cv.alamat]] as const).filter(([, v]) => v);

  // ---------- Foto (ukuran tetap px, tidak ikut skala teks) ----------
  const inisial = cv.nama.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const photoEl = (w: number, h: number, edge = p.accent): ReactNode => {
    if (T.photo === 'none') return null;
    const d = Math.min(w, h);
    const [pw, ph] = T.photo === 'circle' ? [d, d] : [w, h];
    return (
      <div role="img" aria-label={`Foto ${cv.nama}`} style={{
        width: pw, height: ph, boxSizing: 'border-box', borderRadius: T.photo === 'circle' ? '50%' : T.photo === 'round' ? 14 : 0,
        border: `2px solid ${edge}`, backgroundColor: p.soft, backgroundImage: foto ? `url("${foto}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center top',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: pw * 0.3, fontWeight: 700, color: p.ink,
      }}>{foto ? null : inisial}</div>
    );
  };

  // ---------- Judul bagian ----------
  const H = (c: Col, title: string): ReactNode => {
    const n = String(++secNo).padStart(2, '0');
    const base = { fontWeight: 700, lineHeight: 1.2 } as const;
    switch (T.head) {
      case 'bar': return <div style={{ ...base, fontSize: z(17), textTransform: 'uppercase', letterSpacing: z(1), color: c.ink, borderLeft: `${z(6)}px solid ${c.accent}`, paddingLeft: z(10), marginBottom: z(10) }}>{title}</div>;
      case 'box': return <div style={{ ...base, fontSize: z(13.5), textTransform: 'uppercase', letterSpacing: z(1.2), background: c.accent, color: c.on, padding: `${z(5)}px ${z(10)}px`, marginBottom: z(10) }}>{title}</div>;
      case 'caps': return <div style={{ marginBottom: z(10) }}><div style={{ width: z(32), height: z(3), background: c.accent, marginBottom: z(6) }} /><div style={{ ...base, fontSize: z(14), textTransform: 'uppercase', letterSpacing: z(2.2), color: c.ink }}>{title}</div></div>;
      case 'num': return <div style={{ display: 'flex', alignItems: 'baseline', columnGap: z(10), borderBottom: `${z(1.5)}px solid ${c.accent}`, paddingBottom: z(5), marginBottom: z(10) }}><span style={{ ...base, fontSize: z(20), color: c.accent }}>{n}</span><span style={{ ...base, fontSize: z(16), textTransform: 'uppercase', letterSpacing: z(1), color: c.ink }}>{title}</span></div>;
      default: return <div style={{ ...base, fontSize: z(T.hs ?? 19), letterSpacing: z(0.6), color: c.ink, borderBottom: `${z(3)}px solid ${c.ink}`, paddingBottom: z(6), marginBottom: z(10) }}>{title}</div>;
    }
  };

  // ---------- Butir & daftar ----------
  const mark = (c: Col): ReactNode => T.bul === 'none' ? null
    : T.bul === 'dash' ? <span aria-hidden style={{ display: 'block', width: z(8), height: z(2), background: c.accent, marginTop: z(10) }} />
    : <span aria-hidden style={{ display: 'block', width: z(6), height: z(6), background: c.accent, borderRadius: T.bul === 'dot' ? '50%' : 0, marginTop: z(7) }} />;
  const bullet = (c: Col, text: string, o: { bold?: boolean; size?: number; ind?: number } = {}): ReactNode => (
    <div style={{ display: 'grid', gridTemplateColumns: T.bul === 'none' ? 'minmax(0,1fr)' : `${z(16)}px minmax(0,1fr)`, marginLeft: o.ind ?? 0 }}>
      {mark(c)}<div style={{ fontSize: z(o.size ?? 13), fontWeight: o.bold ? 700 : 400, overflowWrap: 'anywhere' }}>{text}</div>
    </div>
  );
  // Daftar butir: satu unit per butir (bisa terpotong antarhalaman); inline / 2 kolom: satu blok
  const list = (c: Col, items: string[], wide: boolean): ReactNode[] => {
    if (T.list === 'inline') return [<div style={{ fontSize: z(13), overflowWrap: 'anywhere' }}>{items.join(', ')}</div>];
    const rows = items.map((t, i) => <div key={i}>{bullet(c, t)}</div>);
    return T.list === 'cols2' && wide ? [<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', columnGap: z(20) }}>{rows}</div>] : rows;
  };

  // ---------- Kop pekerjaan ----------
  const ind = T.job === 'time' ? z(136) : 0;
  const jobHead = (c: Col, j: Job): ReactNode => {
    const pos = tr(j.posisi);
    const bid = tr(j.bidang);
    const per = en ? periodeEn(j.periode) : j.periode;
    const sub = [j.perusahaan, bid].filter(Boolean).join(' · ');
    const bold = { fontWeight: 700, color: c.ink } as const;
    if (T.job === 'split') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', columnGap: z(16), alignItems: 'start' }}>
        <div><div style={{ ...bold, fontSize: z(18), lineHeight: 1.2, letterSpacing: z(0.3) }}>{pos}</div>{bid && <div style={{ fontSize: z(13.5) }}>{bid}</div>}</div>
        <div style={{ ...bold, fontSize: z(12.5), textAlign: 'right', textDecoration: 'underline' }}><div>{j.perusahaan}</div><div>{per}</div></div>
      </div>
    );
    if (T.job === 'stack') return <div><div style={{ ...bold, fontSize: z(16) }}>{pos}</div><div style={{ fontSize: z(13) }}>{sub}</div><div style={{ color: c.muted, fontSize: z(12.5) }}>{per}</div></div>;
    if (T.job === 'time') return (
      <div style={{ display: 'grid', gridTemplateColumns: `${z(112)}px minmax(0,1fr)`, columnGap: z(24) }}>
        <div style={{ fontSize: z(12.5), fontWeight: 700, color: c.muted }}>{per}</div>
        <div><div style={{ ...bold, fontSize: z(16) }}>{pos}</div><div style={{ fontSize: z(13) }}>{sub}</div></div>
      </div>
    );
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', columnGap: z(16), alignItems: 'baseline' }}>
          <div style={{ ...bold, fontSize: z(15) }}>{pos}</div><div style={{ fontSize: z(12.5), fontWeight: 700, color: c.muted, textAlign: 'right' }}>{per}</div>
        </div>
        <div style={{ fontSize: z(13) }}>{sub}</div>
      </div>
    );
  };

  // ---------- Pembungkus bagian -> unit halaman ----------
  const sec = (c: Col, title: string, groups: ReactNode[][], tight = false): Unit[] => {
    const out: Unit[] = [];
    if (T.lay === 'kartu') {
      groups.forEach((nodes, gi) => out.push({ g: ++gid, el: (
        <div style={{ paddingBottom: z(12) }}>
          {gi === 0 && H(c, title)}
          <div style={{ border: `${z(1.5)}px solid ${c.ink}`, padding: z(12) }}>{nodes.map((n, i) => <div key={i} style={{ paddingBottom: i < nodes.length - 1 ? z(6) : 0 }}>{n}</div>)}</div>
        </div>
      ) }));
      return out;
    }
    groups.forEach((nodes, gi) => {
      const g0 = ++gid;
      nodes.forEach((node, ni) => {
        const head = gi === 0 && ni === 0;
        const g = tight && ni > 1 ? ++gid : g0; // daftar rapat: 2 butir pertama menempel pada judul, sisanya bebas terpotong
        const body = <div style={{ paddingBottom: z(ni === nodes.length - 1 ? 16 : tight ? 0 : 6) }}>{node}</div>;
        out.push({ g, el: T.lay === 'label' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `${z(132)}px minmax(0,1fr)`, columnGap: z(20), borderTop: head ? `${z(1.5)}px solid ${c.ink}` : undefined, paddingTop: head ? z(10) : 0 }}>
            <div style={{ fontSize: z(12.5), fontWeight: 700, textTransform: 'uppercase', letterSpacing: z(1), color: c.ink }}>{head ? title : null}</div>{body}
          </div>
        ) : <>{head && H(c, title)}{body}</> });
      });
    });
    return out;
  };

  // ---------- Bagian ----------
  const extra = (c: Col, poin?: string[]): ReactNode => (poin ?? []).filter(Boolean).map((t, i) => <div key={i}>{bullet(c, tr(t), { size: 12.5 })}</div>);
  const edu = (c: Col, x: Edu): ReactNode => <div><div style={{ fontWeight: 700, fontSize: z(14), color: c.ink }}>{tr(x.jurusan)}</div><div>{x.institusi}</div>{x.ket && <div style={{ color: c.muted, fontSize: z(12.5) }}>{tr(x.ket)}</div>}{extra(c, x.poin)}</div>;
  const pel = (c: Col, x: Pelatihan): ReactNode => (
    <div>{bullet(c, tr(x.judul), { bold: true })}
      {x.rincian.map((r, i) => <div key={i} style={{ paddingLeft: z(T.bul === 'none' ? 0 : 16), fontSize: z(12.5) }}>{i + 1}. {tr(r)}</div>)}</div>
  );
  const ref = (c: Col, x: Ref): ReactNode => <div><div style={{ fontWeight: 700, color: c.ink }}>{x.nama}</div>{x.jabatan && <div>{tr(x.jabatan)}</div>}<div>{x.perusahaan}</div>{x.ket && <div style={{ color: c.muted, fontSize: z(12.5) }}>{tr(x.ket)}</div>}{extra(c, x.poin)}</div>;
  const org = (c: Col, x: Org): ReactNode[] => [
    <div key="h"><div style={{ fontWeight: 700, color: c.ink }}>{tr(x.peran)}</div><div>{x.organisasi}</div>{x.ket && <div style={{ color: c.muted, fontSize: z(12.5) }}>{tr(x.ket)}</div>}</div>,
    ...x.poin.map((t, i) => <div key={i}>{bullet(c, tr(t), { size: 12.5 })}</div>),
  ];
  const kontak = (c: Col): ReactNode => (
    <div style={{ display: 'grid', rowGap: z(6) }}>
      {kont.map(([key, v]) => T.plain
        ? <div key={key} style={{ overflowWrap: 'anywhere' }}>{v}</div>
        : <div key={key}><div style={{ fontSize: z(12), fontWeight: 700, textTransform: 'uppercase', letterSpacing: z(0.8), color: c.muted }}>{L[key]}</div><div style={{ overflowWrap: 'anywhere' }}>{v}</div></div>)}
    </div>
  );

  const S: Record<Bagian | 'kontak', (c: Col, wide: boolean) => Unit[]> = {
    kontak: (c) => (kont.length ? sec(c, L.kontak, [[kontak(c)]]) : []),
    ringkasan: (c) => (shown('ringkasan') && (cv.ringkasan || (cv.ringkasanPoin ?? []).some(Boolean)) ? sec(c, L.ringkasan, [[...(cv.ringkasan ? [<p style={{ margin: 0, fontSize: z(13.5), lineHeight: 1.6 }}>{tr(cv.ringkasan)}</p>] : []), ...(cv.ringkasanPoin ?? []).filter(Boolean).map((t, i) => <div key={i}>{bullet(c, tr(t), { size: 13.5 })}</div>)]]) : []),
    pengalaman: (c) => (shown('pengalaman') && cv.pengalaman.length ? sec(c, L.pengalaman, cv.pengalaman.map((j) => [jobHead(c, j), ...j.poin.filter(Boolean).map((t, i) => <div key={i}>{bullet(c, tr(t), { ind })}</div>)])) : []),
    pendidikan: (c) => (shown('pendidikan') && cv.pendidikan.length ? sec(c, L.pendidikan, cv.pendidikan.map((x) => [edu(c, x)])) : []),
    keahlian: (c, w) => (shown('keahlian') && cv.keahlian.length ? sec(c, L.keahlian, [list(c, cv.keahlian.map(tr), w)], true) : []),
    alat: (c, w) => (shown('alat') && cv.alat.length ? sec(c, L.alat, [list(c, cv.alat.map(tr), w)], true) : []),
    pelatihan: (c) => (shown('pelatihan') && cv.pelatihan.length ? sec(c, L.pelatihan, cv.pelatihan.map((x) => [pel(c, x)])) : []),
    referensi: (c) => (shown('referensi') && cv.referensi.length ? sec(c, L.referensi, cv.referensi.map((x) => [ref(c, x)])) : []),
    hobi: (c, w) => (shown('hobi') && cv.hobi.length ? sec(c, L.hobi, [list(c, cv.hobi.map(tr), w)], true) : []),
    organisasi: (c) => (shown('organisasi') && cv.organisasi.length ? sec(c, L.organisasi, cv.organisasi.map((x) => org(c, x))) : []),
  };
  const run = (c: Col, wide: boolean, ids: (Bagian | 'kontak')[]) => ids.flatMap((id) => S[id](c, wide));

  // ---------- Nama & kop ----------
  const nameBlock = (c: Col, big: boolean, align: 'left' | 'center' = 'left'): ReactNode => (
    <div style={{ textAlign: align, paddingBottom: z(14) }}>
      <div style={{ fontSize: z(big ? 46 : 32), fontWeight: 700, lineHeight: 1.08, letterSpacing: z(big ? -1 : -0.2), color: c.ink, overflowWrap: 'anywhere' }}>{cv.nama}</div>
      {cv.jabatan && <div style={{ fontSize: z(big ? 26 : 16), lineHeight: 1.25, marginTop: z(8), color: c.ink, fontWeight: big ? 400 : 600 }}>{tr(cv.jabatan)}</div>}
    </div>
  );
  const contactRow = (c: Col, cen: boolean): ReactNode => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: cen ? 'center' : 'flex-start', columnGap: z(18), rowGap: z(2), fontSize: z(13), color: c.ink }}>
      {kont.map(([key, v]) => <span key={key} style={{ overflowWrap: 'anywhere' }}>{v}</span>)}
    </div>
  );
  const headerBody = (c: Col, edge: string): ReactNode => {
    const cen = T.hdr === 'tengah';
    const ph = photoEl(cen ? 124 : 112, cen ? 156 : 144, edge);
    const txt = <div style={{ minWidth: 0, textAlign: cen ? 'center' : 'left' }}>{nameBlock(c, false, cen ? 'center' : 'left')}{contactRow(c, cen)}</div>;
    if (cen) return <div style={{ display: 'grid', justifyItems: 'center', rowGap: z(12) }}>{ph}{txt}</div>;
    if (!ph) return txt;
    return <div style={{ display: 'grid', gridTemplateColumns: T.hdr === 'kanan' ? 'minmax(0,1fr) auto' : 'auto minmax(0,1fr)', columnGap: z(24), alignItems: 'center' }}>{T.hdr === 'kanan' ? <>{txt}{ph}</> : <>{ph}{txt}</>}</div>;
  };
  const header: ReactNode = <div style={{ paddingBottom: z(14), marginBottom: z(8), borderBottom: `${z(2)}px solid ${p.accent}` }}>{headerBody(cm, p.accent)}</div>;
  const band: ReactNode = (
    <div style={{ margin: `${-m}px ${-m}px ${z(24)}px`, padding: `${m}px ${m}px ${z(20)}px`, background: p.fill ? p.accent : '#ffffff', borderBottom: p.fill ? undefined : `${z(2)}px solid ${p.ink}` }}>
      {headerBody(cb, p.fill ? p.accentInk : p.accent)}
    </div>
  );

  // ---------- Susun aliran ----------
  const U = (el: ReactNode): Unit[] => (el ? [{ g: ++gid, el }] : []);
  switch (T.lay) {
    case 'ref': {
      const ph = photoEl(186, 272);
      return { top: null,
        main: [...U(<div style={{ paddingBottom: z(10) }}>{nameBlock(cm, true)}</div>), ...run(cm, true, ['ringkasan', 'pengalaman'])],
        side: [...U(ph && <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: z(18) }}>{ph}</div>), ...run(cm, false, ['kontak', 'pendidikan', 'keahlian', 'alat', 'referensi', 'pelatihan', 'hobi', 'organisasi'])] };
    }
    case 'kiri':
    case 'kanan': {
      const d = Math.min(T.sw, 176);
      const ph = photoEl(d, Math.round(d * 1.25), cs.accent);
      return { top: null,
        main: [...U(nameBlock(cm, false)), ...run(cm, true, ['ringkasan', 'pengalaman', 'organisasi', 'pelatihan', 'referensi'])],
        side: [...U(ph && <div style={{ paddingBottom: z(18) }}>{ph}</div>), ...run(cs, false, ['kontak', 'pendidikan', 'keahlian', 'alat', 'hobi'])] };
    }
    case 'pita':
      return { top: band, main: run(cm, true, ['ringkasan', 'pengalaman', 'organisasi']), side: run(cm, false, ['pendidikan', 'keahlian', 'alat', 'pelatihan', 'referensi', 'hobi']) };
    case 'sama':
      return { top: header, main: run(cm, false, ['ringkasan', 'pengalaman']), side: run(cm, false, ['pendidikan', 'keahlian', 'alat', 'pelatihan', 'organisasi', 'referensi', 'hobi']) };
    default:
      return { top: null, main: [...U(header), ...run(cm, true, ['ringkasan', 'pengalaman', 'pendidikan', 'pelatihan', 'keahlian', 'alat', 'organisasi', 'referensi', 'hobi'])], side: [] };
  }
}

// ============================================================
// SECTION: Halaman (margin 1,5 cm; grid kolom tetap)
// ============================================================
export function PageView({ e, idx, top, main, side }: { e: Env; idx: number; top: ReactNode; main: ReactNode[]; side: ReactNode[] }) {
  const { T, p, k, W, H } = e;
  const m = marginPx;
  const two = TWO.includes(T.lay);
  const filled = p.fill && (T.lay === 'kiri' || T.lay === 'kanan');
  const gap = T.lay === 'kiri' || T.lay === 'kanan' ? 48 : 40;
  const sideLeft = T.lay === 'kiri' || (T.lay !== 'kanan' && T.flip);
  const cols = !two ? 'minmax(0,1fr)' : T.lay === 'sama' ? 'minmax(0,1fr) minmax(0,1fr)' : sideLeft ? `${T.sw}px minmax(0,1fr)` : `minmax(0,1fr) ${T.sw}px`;
  const edge = m + T.sw + gap / 2; // batas tepi kolom samping (dari tepi kertas)
  const mainCol = <div key="main" style={{ overflow: 'hidden', minHeight: 0 }}><div data-flow="main">{main.map((u, i) => <div key={i}>{u}</div>)}</div></div>;
  const sideCol = <div key="side" style={{ overflow: 'hidden', minHeight: 0 }}><div data-flow="side" style={{ color: filled ? p.accentInk : undefined }}>{side.map((u, i) => <div key={i}>{u}</div>)}</div></div>;
  const lines = !p.fill && (T.lay === 'kiri' || T.lay === 'kanan');
  return (
    <div data-page style={{
      position: 'relative', width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', background: '#ffffff', color: p.ink,
      fontFamily: FONT[T.font], fontSize: Math.round(13 * k * 100) / 100, lineHeight: 1.5, letterSpacing: T.track ? `${Math.round(T.track * k * 100) / 100}px` : undefined,
    }}>
      {filled && <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, background: p.accent, width: edge, ...(T.lay === 'kiri' ? { left: 0 } : { right: 0 }) }} />}
      {lines && <div aria-hidden style={{ position: 'absolute', top: m, bottom: m, width: 2, background: p.ink, left: T.lay === 'kiri' ? edge - 1 : W - edge - 1 }} />}
      <div style={{ position: 'absolute', top: m, right: m, bottom: m, left: m, display: 'grid', gridTemplateColumns: cols, gridTemplateRows: idx === 0 && top ? 'auto minmax(0,1fr)' : 'minmax(0,1fr)', columnGap: gap }}>
        {idx === 0 && top && <div style={{ gridColumn: '1 / -1' }}>{top}</div>}
        {two ? (sideLeft ? [sideCol, mainCol] : [mainCol, sideCol]) : mainCol}
      </div>
    </div>
  );
}

export { LBL };
