import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { Field, inputCls, signSpace } from './LetterKit';
import { fxOf, type Offset } from './PositionPad';
import { FitLine } from './LetterStyles';
import { cssFamily, useGoogleFonts } from '../lib/fonts';

// 20 TATA LETAK surat untuk menu surat baru (Izin Sekolah, Pengajuan, Lamaran, Pengunduran Diri, Musyawarah Desa).
// Beda dengan LetterStyles (font/garis): di sini susunan halaman berubah (kop samping, kop bawah, kolom, pita, dll.).
// Menu cukup mengisi LayoutDoc; isi surat ditulis dengan <P> & <InfoRows> agar ikut gaya tata letak.
// Semua CSS aman untuk html2canvas (warna polos, border, flex/grid; tanpa gradient/filter/transform).

// ============================================================
// SECTION: Kontrak data (dipakai semua menu; jangan diubah tanpa mengubah menu)
// ============================================================
export type LayoutSigner = {
  heading: string; // salam/peran di atas tanda tangan, boleh multi-baris: "Mengetahui,\nKetua RT 003"
  role?: string; // jabatan (di bawah heading)
  name: string;
  idLine?: string; // NIP / NIK / NIP (opsional, di bawah nama)
  ttd?: string; // gambar tanda tangan (sudah lewat Hapus BG)
  stempel?: string;
  ttdOffset?: Offset; // geseran PositionPad
  stempelOffset?: Offset;
  main?: boolean; // penanda tangan utama (biasanya pembuat surat): diletakkan paling kanan / paling menonjol
};

export type LayoutRow = { label: string; value: string };

export type LayoutDoc = {
  logo?: string;
  logoOffset?: Offset;
  kopName: string; // baris utama kop (instansi / nama pengirim)
  kopLines: string[]; // baris kecil kop: unit/tagline, alamat, kontak (yang kosong dibuang)
  title?: string; // judul surat, mis. SURAT IZIN TIDAK MASUK SEKOLAH (kosong = tanpa judul)
  nomor?: string; // nomor dokumen; kosong = baris nomor tidak tampil
  meta?: LayoutRow[]; // Lampiran, Perihal, Sifat… (tanpa nomor)
  placeDate: string; // "Jakarta, 1 November 2026"
  recipient?: string[]; // ['Kepada Yth.', 'Bapak/Ibu Wali Kelas …', 'di Tempat']
  body: ReactNode; // isi surat: <P>, <InfoRows>, elemen biasa
  signers: LayoutSigner[]; // urutan bebas; yang main: true = penanda tangan utama
  signersTitle?: string; // label baris penanda tangan lain, mis. "Mengetahui,"
  footer?: ReactNode; // tembusan / catatan kecil di bawah
};

export type LayoutProps = { layout: string; doc: LayoutDoc; k: number; W: number; H: number; pf: number };

// ============================================================
// SECTION: Gaya bersama untuk isi (P, InfoRows) lewat context
// ============================================================
type Theme = { accent: string; rows: 'colon' | 'table' | 'dotted' | 'stacked'; para: 'indent' | 'block' };
const Ctx = createContext<{ k: number; t: Theme }>({ k: 1, t: { accent: '#000', rows: 'colon', para: 'block' } });

export function P({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { k, t } = useContext(Ctx);
  if (!children) return null;
  return <p style={{ margin: `0 0 ${8 * k}px`, textAlign: 'justify', textIndent: t.para === 'indent' ? 28 * k : 0, whiteSpace: 'pre-line', ...style }}>{children}</p>;
}

export function InfoRows({ rows }: { rows: LayoutRow[] }) {
  const { k, t } = useContext(Ctx);
  const list = rows.filter((r) => r.label || r.value);
  if (!list.length) return null;
  if (t.rows === 'table') {
    const cell: CSSProperties = { border: `1px solid ${t.accent}`, padding: `${3 * k}px ${6 * k}px`, verticalAlign: 'top' };
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: `0 0 ${10 * k}px` }}>
        <tbody>{list.map((r, i) => <tr key={i}><td style={{ ...cell, width: '34%', fontWeight: 700 }}>{r.label}</td><td style={{ ...cell, whiteSpace: 'pre-line' }}>{r.value}</td></tr>)}</tbody>
      </table>
    );
  }
  if (t.rows === 'stacked') {
    return (
      <div style={{ margin: `0 0 ${10 * k}px ${16 * k}px` }}>
        {list.map((r, i) => (
          <div key={i} style={{ marginBottom: 4 * k }}>
            <div style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: 1, color: t.accent }}>{r.label}</div>
            <div style={{ fontWeight: 700, whiteSpace: 'pre-line' }}>{r.value}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 8 * k, rowGap: 3 * k, margin: `0 0 ${10 * k}px ${16 * k}px` }}>
      {list.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span style={{ minWidth: 110 * k }}>{r.label}</span>
          <span style={{ display: 'flex', gap: 6 * k, ...(t.rows === 'dotted' && { borderBottom: '1px dotted #000' }) }}><span>:</span><span style={{ flex: 1, whiteSpace: 'pre-line' }}>{r.value}</span></span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SECTION: Potongan bersama tata letak
// ============================================================
// Blok tanda tangan: ruang tanda tangan cukup untuk meterai (signSpace), teks rata sesuai `align`
export function SignBlock({ s, k, align = 'center', width = 170 }: { s: LayoutSigner; k: number; align?: 'left' | 'center' | 'right'; width?: number }) {
  const h = signSpace(78 * k);
  const fxT = fxOf(s.ttdOffset, 'ttd');
  const fxS = fxOf(s.stempelOffset, 'stempel');
  const oT = s.ttdOffset ?? { x: 0, y: 0 };
  const oS = s.stempelOffset ?? { x: 0, y: 0 };
  const imgX = align === 'right' ? { right: -oT.x } : align === 'left' ? { left: oT.x } : { left: `calc(50% - ${(90 * k * fxT.z)}px + ${oT.x}px)` };
  return (
    <div style={{ textAlign: align, minWidth: width * k }}>
      <div style={{ whiteSpace: 'pre-line' }}>{s.heading}</div>
      {s.role && <div style={{ whiteSpace: 'pre-line' }}>{s.role}</div>}
      <div style={{ position: 'relative', height: h }}>
        {s.stempel && <img src={s.stempel} alt="Stempel" style={{ position: 'absolute', left: oS.x, top: oS.y, height: 80 * k * fxS.z, opacity: fxS.a, mixBlendMode: 'multiply' }} />}
        {s.ttd && <img src={s.ttd} alt="Tanda tangan" style={{ position: 'absolute', ...imgX, top: (h - 66 * k * fxT.z) / 2 + oT.y, height: 66 * k * fxT.z, maxWidth: 180 * k * fxT.z, opacity: fxT.a, objectFit: 'contain', mixBlendMode: 'multiply' }} />}
      </div>
      <div><span style={{ display: 'inline-block', fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 1, minWidth: 120 * k }}>{s.name || ' '}</span></div>
      {s.idLine && <div style={{ fontSize: '0.85em' }}>{s.idLine}</div>}
    </div>
  );
}

// Penanda tangan utama (main) di kanan, lainnya di kiri/berjajar
export const splitSigners = (list: LayoutSigner[]) => {
  const main = list.find((s) => s.main) ?? list[list.length - 1];
  return { main, others: list.filter((s) => s !== main) };
};

// ============================================================
// SECTION: Tata letak
// ============================================================
type Def = { id: string; name: string; desc: string; render: (p: LayoutProps) => ReactNode };

const page = (p: LayoutProps, extra?: CSSProperties): CSSProperties => ({
  width: p.W, height: p.H, overflow: 'hidden', boxSizing: 'border-box', padding: `${40 * p.pf}px ${56 * p.pf}px`,
  background: '#fff', color: '#000', fontFamily: 'Helvetica, Arimo, Arial, sans-serif', fontSize: 13 * p.k, lineHeight: 1.45,
  display: 'flex', flexDirection: 'column', ...extra,
});

// 01 Klasik: kop tengah + garis ganda, nomor kiri & tanggal kanan, tanda tangan kanan
function Klasik(p: LayoutProps) {
  const { doc: d, k } = p;
  const { main, others } = splitSigners(d.signers);
  return (
    <div style={page(p)}>
      <div style={{ position: 'relative', textAlign: 'center', minHeight: d.logo ? 64 * k : undefined }}>
        {d.logo && <img src={d.logo} alt="Logo" style={{ position: 'absolute', left: d.logoOffset?.x ?? 0, top: d.logoOffset?.y ?? 0, height: 64 * k * ((d.logoOffset?.s ?? 100) / 100), maxWidth: 72 * k, objectFit: 'contain', opacity: (d.logoOffset?.a ?? 100) / 100 }} />}
        <div style={{ padding: d.logo ? `0 ${76 * k}px` : 0 }}>
          <div style={{ fontWeight: 700, fontSize: 20 * k, lineHeight: 1.15 }}>{d.kopName}</div>
          {d.kopLines.filter(Boolean).map((l, i) => <FitLine key={i} style={{ fontSize: (i === 0 ? 12 : 11) * k }}>{l}</FitLine>)}
        </div>
      </div>
      <div style={{ margin: `6px 0 ${14 * k}px` }}><div style={{ height: 3, background: '#000' }} /><div style={{ height: 2 }} /><div style={{ height: 1, background: '#000' }} /></div>
      {d.title && <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 * k, letterSpacing: 1, marginBottom: d.nomor && !d.meta?.length ? 2 : 12 * k }}><span style={{ borderBottom: '1.5px solid #000', paddingBottom: 1 }}>{d.title}</span></div>}
      {d.title && d.nomor && !d.meta?.length && <div style={{ textAlign: 'center', marginBottom: 12 * k }}>Nomor: {d.nomor}</div>}
      {(d.meta?.length || d.recipient?.length) ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 * k, marginBottom: 12 * k }}>
          <div>
            {!!d.meta?.length && (
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content auto 1fr', columnGap: 6 * k, marginBottom: 8 * k }}>
                {d.nomor && <><span>Nomor</span><span>:</span><span>{d.nomor}</span></>}
                {d.meta.map((r, i) => <div key={i} style={{ display: 'contents' }}><span>{r.label}</span><span>:</span><span style={{ fontWeight: r.label === 'Perihal' ? 700 : undefined }}>{r.value}</span></div>)}
              </div>
            )}
            {d.recipient?.map((l, i) => <div key={i} style={{ fontWeight: i === 1 ? 700 : undefined, whiteSpace: 'pre-line' }}>{l}</div>)}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>{d.placeDate}</div>
        </div>
      ) : null}
      <div>{d.body}</div>
      <div aria-hidden="true" style={{ flex: `0 1 ${48 * k}px`, minHeight: 14 * k }} />
      {!(d.meta?.length || d.recipient?.length) && <div style={{ textAlign: 'right' }}>{d.placeDate}</div>}
      <div style={{ display: 'flex', justifyContent: others.length ? 'space-between' : 'flex-end', alignItems: 'flex-end', gap: 16 * k }}>
        {others.length > 0 && (
          <div>
            {d.signersTitle && <div style={{ textAlign: 'center', marginBottom: 2 * k }}>{d.signersTitle}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 * k }}>{others.map((s, i) => <SignBlock key={i} s={s} k={k} />)}</div>
          </div>
        )}
        {main && <SignBlock s={main} k={k} align="right" />}
      </div>
      {d.footer && <div style={{ marginTop: 10 * k, fontSize: 11 * k }}>{d.footer}</div>}
    </div>
  );
}

// ------------------------------------------------------------
// Potongan kecil untuk tata letak 02–20
// ------------------------------------------------------------
const lines = (d: LayoutDoc) => d.kopLines.filter(Boolean);
const metaRows = (d: LayoutDoc, nomor = true): LayoutRow[] =>
  [...(nomor && d.nomor ? [{ label: 'Nomor', value: d.nomor }] : []), ...(d.meta ?? [])].filter((r) => r.label || r.value);

// Font Google milik tata letak + warna aksen dari THEMES
function useLook(body: string, fallback = 'sans-serif', head?: string, headFallback = 'serif') {
  useGoogleFonts([{ family: body }, head ? { family: head } : null]);
  return { a: useContext(Ctx).t.accent, ff: cssFamily(body, fallback), hf: head ? cssFamily(head, headFallback) : cssFamily(body, fallback) };
}

// Logo ikut geser (x/y), ukuran (s) & transparansi (a); tanpa logo = tidak ada elemen sama sekali
function Logo({ d, k, h, style }: { d: LayoutDoc; k: number; h: number; style?: CSSProperties }) {
  if (!d.logo) return null;
  const o = d.logoOffset;
  const z = (o?.s ?? 100) / 100;
  return <img src={d.logo} alt="Logo" style={{ position: 'relative', left: o?.x ?? 0, top: o?.y ?? 0, height: h * k * z, maxWidth: h * 1.3 * k * z, objectFit: 'contain', opacity: (o?.a ?? 100) / 100, flexShrink: 0, display: 'block', ...style }} />;
}

function MetaGrid({ d, k, nomor = true, style }: { d: LayoutDoc; k: number; nomor?: boolean; style?: CSSProperties }) {
  const rows = metaRows(d, nomor);
  if (!rows.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content auto 1fr', columnGap: 6 * k, ...style }}>
      {rows.map((r, i) => <div key={i} style={{ display: 'contents' }}><span>{r.label}</span><span>:</span><span style={{ fontWeight: r.label === 'Perihal' ? 700 : undefined, whiteSpace: 'pre-line' }}>{r.value}</span></div>)}
    </div>
  );
}

function Rcpt({ d, style }: { d: LayoutDoc; style?: CSSProperties }) {
  if (!d.recipient?.length) return null;
  return <div style={style}>{d.recipient.map((l, i) => <div key={i} style={{ fontWeight: i === 1 ? 700 : undefined, whiteSpace: 'pre-line' }}>{l}</div>)}</div>;
}

const Foot = ({ d, k, style }: { d: LayoutDoc; k: number; style?: CSSProperties }) => (d.footer ? <div style={{ marginTop: 10 * k, fontSize: 11 * k, ...style }}>{d.footer}</div> : null);

// Ruang lentur sebelum tanda tangan: surat pendek lega, surat panjang tidak meluap
const Gap = ({ k, n = 48 }: { k: number; n?: number }) => <div aria-hidden="true" style={{ flex: `0 1 ${n * k}px`, minHeight: 14 * k }} />;
const Fill = ({ k }: { k: number }) => <div aria-hidden="true" style={{ flex: '1 1 0px', minHeight: 8 * k }} />;

// Baris tanda tangan: main di kanan/kiri/tengah, lainnya berkelompok di bawah label signersTitle; grid = sama lebar
function Signs({ d, k, align = 'right', grid, date }: { d: LayoutDoc; k: number; align?: 'left' | 'center' | 'right'; grid?: boolean; date?: boolean }) {
  if (!d.signers.length) return null;
  const { main, others } = splitSigners(d.signers);
  const g = 16 * k;
  const when = date ? <div style={{ textAlign: align, marginBottom: 2 * k }}>{d.placeDate}</div> : null;
  const label = d.signersTitle && others.length ? <div style={{ textAlign: 'center', marginBottom: 4 * k }}>{d.signersTitle}</div> : null;
  if (grid) {
    return (
      <div>
        {when}
        {label}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${130 * k}px, 1fr))`, gap: g }}>
          {[...others, main].map((s, i) => <div key={i} style={{ border: '1px solid #d4d4d8', borderRadius: 10 * k, padding: 8 * k }}><SignBlock s={s} k={k} width={0} /></div>)}
        </div>
      </div>
    );
  }
  // 3+ penanda tangan: blok lebih ramping agar tetap satu baris di kolom sempit
  const w = d.signers.length >= 3 ? 110 : 170;
  const mainEl = <div style={align === 'right' && !others.length ? { marginLeft: 'auto' } : undefined}>{when}<SignBlock s={main} k={k} align={align} width={w} /></div>;
  // Tanpa label bersama: semua tanda tangan sejajar langsung (jarak rata kiri–tengah–kanan)
  const group = !others.length ? null : label ? (
    <div>
      {label}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: g }}>{others.map((s, i) => <SignBlock key={i} s={s} k={k} width={w} />)}</div>
    </div>
  ) : <>{others.map((s, i) => <SignBlock key={i} s={s} k={k} width={w} />)}</>;
  if (align === 'center') return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: g }}>{mainEl}<div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: g * 2 }}>{group}</div></div>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: g }}>
      {align === 'left' ? <>{mainEl}{group}</> : <>{group}{mainEl}</>}
    </div>
  );
}

const col: CSSProperties = { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' };

// 02 Kop rata kiri + garis tebal aksen, tanggal kanan atas
function KiriAksen(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Lato');
  return (
    <div style={page(p, { fontFamily: ff })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 * k }}>
        <Logo d={d} k={k} h={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 19 * k, lineHeight: 1.15, color: a }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 11 * k }}>{l}</div>)}
        </div>
        <div style={{ fontSize: 11.5 * k, textAlign: 'right', maxWidth: '38%' }}>{d.placeDate}</div>
      </div>
      <div style={{ height: 5 * k, background: a, margin: `${8 * k}px 0 ${14 * k}px` }} />
      <MetaGrid d={d} k={k} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      {d.title && <div style={{ fontWeight: 700, fontSize: 15 * k, color: a, marginBottom: 10 * k }}>{d.title}</div>}
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 03 Sidebar kiri berwarna berisi identitas & data surat; kertas sempit: sidebar jadi blok atas
function Sidebar(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { a, ff } = useLook('Nunito Sans');
  const narrow = p.W < 450;
  return (
    <div style={page(p, { padding: 0, flexDirection: narrow ? 'column' : 'row', fontFamily: ff })}>
      <div style={{ ...(narrow ? { padding: `${16 * pf}px ${20 * pf}px` } : { width: '28%', flexShrink: 0, padding: `${40 * pf}px ${18 * pf}px` }), boxSizing: 'border-box', background: a, color: '#fff', display: 'flex', flexDirection: 'column', gap: 10 * k, overflowWrap: 'anywhere' }}>
        {d.logo && <div style={{ background: '#fff', borderRadius: 8 * k, padding: 6 * k, alignSelf: 'flex-start' }}><Logo d={d} k={k} h={50} /></div>}
        <div style={{ fontWeight: 800, fontSize: 16 * k, lineHeight: 1.2 }}>{d.kopName}</div>
        {lines(d).length > 0 && <div style={{ fontSize: 10.5 * k, lineHeight: 1.4 }}>{lines(d).map((l, i) => <div key={i}>{l}</div>)}</div>}
        {metaRows(d).map((r, i) => (
          <div key={i}>
            <div style={{ fontSize: 9 * k, textTransform: 'uppercase', letterSpacing: 1, color: '#bfe0e6' }}>{r.label}</div>
            <div style={{ fontWeight: 700, fontSize: 11 * k, whiteSpace: 'pre-line' }}>{r.value}</div>
          </div>
        ))}
        <div style={{ fontSize: 11 * k }}>{d.placeDate}</div>
      </div>
      <div style={{ ...col, padding: narrow ? `${16 * pf}px ${20 * pf}px` : `${40 * pf}px ${40 * pf}px` }}>
        {d.title && <div style={{ fontWeight: 800, fontSize: 18 * k, lineHeight: 1.2, color: a, borderBottom: `2px solid ${a}`, paddingBottom: 4 * k, marginBottom: 14 * k }}>{d.title}</div>}
        <Rcpt d={d} style={{ marginBottom: 12 * k }} />
        <div>{d.body}</div>
        <Gap k={k} />
        <Signs d={d} k={k} />
        <Foot d={d} k={k} />
      </div>
    </div>
  );
}

// 04 Pita kop warna penuh tepi ke tepi, teks putih
function Pita(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { a, ff } = useLook('Montserrat');
  return (
    <div style={page(p, { padding: 0, fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ background: a, color: '#fff', padding: `${18 * pf}px ${56 * pf}px`, display: 'flex', alignItems: 'center', gap: 14 * k }}>
        {d.logo && <div style={{ background: '#fff', borderRadius: 8 * k, padding: 5 * k }}><Logo d={d} k={k} h={46} /></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 19 * k, lineHeight: 1.15, letterSpacing: 0.5, textTransform: 'uppercase' }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10.5 * k }}>{l}</div>)}
        </div>
      </div>
      <div style={{ height: 4 * k, background: '#1f2937' }} />
      <div style={{ ...col, padding: `${22 * pf}px ${56 * pf}px ${40 * pf}px` }}>
        {d.title && <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 15 * k, letterSpacing: 2, color: a }}>{d.title}</div>}
        {d.nomor && <div style={{ textAlign: 'center', fontSize: 11.5 * k }}>Nomor: {d.nomor}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 * k, margin: `${12 * k}px 0` }}>
          <div>
            <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
            <Rcpt d={d} />
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>{d.placeDate}</div>
        </div>
        <div>{d.body}</div>
        <Gap k={k} />
        <Signs d={d} k={k} />
        <Foot d={d} k={k} />
      </div>
    </div>
  );
}

// 05 Kop di kaki halaman; atas hanya logo kecil + judul besar
function KopBawah(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff, hf } = useLook('Source Sans 3', 'sans-serif', 'Playfair Display');
  return (
    <div style={page(p, { fontFamily: ff })}>
      <div style={{ marginBottom: 16 * k }}>
        {(d.logo || d.title) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k }}>
            <Logo d={d} k={k} h={36} />
            {d.title && <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 26 * k, lineHeight: 1.1 }}>{d.title}</div>}
          </div>
        )}
        {d.nomor && <div style={{ fontSize: 11 * k, color: '#555', marginTop: 4 * k }}>Nomor: {d.nomor}</div>}
      </div>
      <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} date />
      <Foot d={d} k={k} />
      <Fill k={k} />
      <div style={{ borderTop: `2px solid ${a}`, paddingTop: 6 * k, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 * k, fontSize: 10.5 * k }}>
        <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 13 * k, color: a }}>{d.kopName}</div>
        <div style={{ textAlign: 'right' }}>{lines(d).join(' · ')}</div>
      </div>
    </div>
  );
}

// 06 Memo / nota dinas: kepala berupa tabel berbingkai
function Memo(p: LayoutProps) {
  const { doc: d, k } = p;
  const { ff } = useLook('IBM Plex Sans');
  const { main } = splitSigners(d.signers);
  const to = (d.recipient ?? []).filter((l) => !/^kepada\b/i.test(l.trim()));
  const rows: LayoutRow[] = [
    { label: 'Kepada', value: to.join('\n') },
    { label: 'Dari', value: main ? [main.name, main.role].filter(Boolean).join(', ') : d.kopName },
    { label: 'Nomor', value: d.nomor ?? '' },
    { label: 'Tanggal', value: d.placeDate },
    ...(d.meta ?? []),
  ].filter((r) => r.value);
  const c: CSSProperties = { border: '1px solid #000', padding: `${4 * k}px ${8 * k}px`, verticalAlign: 'top' };
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 * k }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 * k }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10 * k }}>{l}</div>)}
        </div>
        <Logo d={d} k={k} h={44} />
      </div>
      {d.title && <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 * k, letterSpacing: 3, margin: `${12 * k}px 0 ${8 * k}px` }}>{d.title}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', margin: `${d.title ? 0 : 12 * k}px 0 ${14 * k}px` }}>
        <tbody>{rows.map((r, i) => <tr key={i}><td style={{ ...c, width: '22%', fontWeight: 700, background: '#f1f1f1' }}>{r.label}</td><td style={{ ...c, whiteSpace: 'pre-line' }}>{r.value}</td></tr>)}</tbody>
      </table>
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 07 Bingkai halaman penuh (garis ganda dibuat dari dua border solid, aman untuk html2canvas)
function Bingkai(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { a, ff } = useLook('EB Garamond', 'serif');
  return (
    <div style={page(p, { padding: 20 * pf, fontFamily: ff, fontSize: 14 * k })}>
      <div style={{ flex: 1, minHeight: 0, border: `3px solid ${a}`, padding: 3 * k, display: 'flex' }}>
        <div style={{ ...col, border: `1px solid ${a}`, padding: `${20 * pf}px ${32 * pf}px` }}>
          <div style={{ textAlign: 'center' }}>
            {d.logo && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 * k }}><Logo d={d} k={k} h={50} /></div>}
            <div style={{ fontWeight: 700, fontSize: 20 * k, lineHeight: 1.15, color: a, textTransform: 'uppercase', letterSpacing: 1 }}>{d.kopName}</div>
            {lines(d).map((l, i) => <div key={i} style={{ fontSize: 12 * k, fontStyle: 'italic' }}>{l}</div>)}
          </div>
          <div style={{ width: '30%', height: 1, background: a, margin: `${10 * k}px auto ${14 * k}px` }} />
          {d.title && <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 * k, letterSpacing: 1 }}>{d.title}</div>}
          {d.nomor && <div style={{ textAlign: 'center' }}>Nomor: {d.nomor}</div>}
          <div style={{ height: 12 * k }} />
          <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
          <Rcpt d={d} style={{ marginBottom: 12 * k }} />
          <div>{d.body}</div>
          <Gap k={k} />
          <Signs d={d} k={k} date />
          <Foot d={d} k={k} />
        </div>
      </div>
    </div>
  );
}

// 08 Kop dua kolom: identitas kiri, alamat/kontak kanan, garis tipis
function DuaKolom(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Inter');
  const L = lines(d);
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 * k }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k, minWidth: 0 }}>
          <Logo d={d} k={k} h={46} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 * k, lineHeight: 1.15 }}>{d.kopName}</div>
            {L[0] && <div style={{ fontSize: 11 * k, color: a }}>{L[0]}</div>}
          </div>
        </div>
        {L.length > 1 && <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 10.5 * k, lineHeight: 1.35 }}>{L.slice(1).map((l, i) => <div key={i}>{l}</div>)}</div>}
      </div>
      <div style={{ height: 1, background: a, margin: `${8 * k}px 0 ${14 * k}px` }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 * k, marginBottom: 12 * k }}>
        <MetaGrid d={d} k={k} />
        <div style={{ marginLeft: 'auto' }}>{d.placeDate}</div>
      </div>
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      {d.title && <div style={{ fontWeight: 700, fontSize: 13.5 * k, textTransform: 'uppercase', letterSpacing: 0.5, borderLeft: `3px solid ${a}`, paddingLeft: 8 * k, marginBottom: 10 * k }}>{d.title}</div>}
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 09 Modern minimal: judul besar kiri, garis aksen pendek, tanda tangan kiri
function Minimal(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { a, ff } = useLook('DM Sans');
  return (
    <div style={page(p, { padding: `${56 * pf}px ${72 * pf}px`, fontFamily: ff, fontSize: 12.5 * k, lineHeight: 1.6 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 * k, marginBottom: 28 * k }}>
        <Logo d={d} k={k} h={28} />
        <div style={{ fontSize: 11 * k, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>{d.kopName}</div>
      </div>
      {d.title && <div style={{ fontSize: 28 * k, lineHeight: 1.15, marginBottom: 10 * k }}>{d.title}</div>}
      <div style={{ width: 44 * k, height: 4 * k, background: a, marginBottom: 12 * k }} />
      <div style={{ fontSize: 11 * k, color: '#666', marginBottom: 18 * k }}>{[d.nomor && `No. ${d.nomor}`, d.placeDate].filter(Boolean).join('  ·  ')}</div>
      <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 16 * k }} />
      <div>{d.body}</div>
      <Gap k={k} n={64} />
      <Signs d={d} k={k} align="left" />
      <Foot d={d} k={k} />
      <Fill k={k} />
      {lines(d).length > 0 && <div style={{ fontSize: 9.5 * k, color: '#888' }}>{lines(d).join('  ·  ')}</div>}
    </div>
  );
}

// 10 Mesin ketik: huruf monospasi, semua rata kiri, pemisah garis putus-putus
function MesinKetik(p: LayoutProps) {
  const { doc: d, k } = p;
  const { ff } = useLook('Courier Prime', "'Courier New', monospace");
  const dash = <div style={{ borderTop: '1px dashed #000', margin: `${8 * k}px 0` }} />;
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k }}>
        <Logo d={d} k={k} h={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      {dash}
      <div>{d.placeDate}</div>
      <MetaGrid d={d} k={k} />
      {dash}
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      {d.title && <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 * k }}>{d.title}</div>}
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} align="left" />
      {d.footer && dash}
      <Foot d={d} k={k} style={{ marginTop: 0 }} />
    </div>
  );
}

// 11 Kop tengah huruf berjarak + ornamen garis tiga
function HurufJarak(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff, hf } = useLook('Lora', 'serif', 'Cinzel');
  return (
    <div style={page(p, { fontFamily: ff })}>
      <div style={{ textAlign: 'center' }}>
        {d.logo && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 * k }}><Logo d={d} k={k} h={52} /></div>}
        <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 19 * k, letterSpacing: 4 * k, textTransform: 'uppercase', lineHeight: 1.2 }}>{d.kopName}</div>
        {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10.5 * k, letterSpacing: 1 }}>{l}</div>)}
      </div>
      <div style={{ margin: `${8 * k}px 0 ${14 * k}px` }}>{[1, 3, 1].map((h, i) => <div key={i} style={{ height: h, background: a, marginTop: i ? 2 : 0 }} />)}</div>
      {d.title && <div style={{ textAlign: 'center', fontFamily: hf, fontWeight: 700, fontSize: 15 * k, letterSpacing: 3 }}>{d.title}</div>}
      {d.nomor && <div style={{ textAlign: 'center', fontStyle: 'italic' }}>Nomor: {d.nomor}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 * k, margin: `${12 * k}px 0` }}>
        <div>
          <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
          <Rcpt d={d} />
        </div>
        <div style={{ marginLeft: 'auto' }}>{d.placeDate}</div>
      </div>
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 12 Gaya DIN/Eropa: blok penerima kiri, kotak info sempit di kanan
function Din(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Source Sans 3');
  const L = lines(d);
  const info: LayoutRow[] = [...metaRows(d).filter((r) => r.label === 'Nomor'), { label: 'Tanggal', value: d.placeDate }, ...metaRows(d, false)];
  return (
    <div style={page(p, { fontFamily: ff })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 * k }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 * k, color: a }}>{d.kopName}</div>
          {L.length > 0 && <div style={{ fontSize: 10.5 * k }}>{L.join(' · ')}</div>}
        </div>
        <Logo d={d} k={k} h={48} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 * k, margin: `${22 * k}px 0 ${18 * k}px` }}>
        <div style={{ flex: '1 1 55%', minWidth: 0 }}>
          <div style={{ fontSize: 8.5 * k, color: '#555', borderBottom: '1px solid #999', paddingBottom: 1, marginBottom: 6 * k, display: 'inline-block' }}>{[d.kopName, L[1]].filter(Boolean).join(' · ')}</div>
          <Rcpt d={d} />
        </div>
        <div style={{ flex: `0 1 32%`, minWidth: 120 * k, borderLeft: `2px solid ${a}`, paddingLeft: 10 * k }}>
          {info.map((r, i) => (
            <div key={i} style={{ marginBottom: 4 * k }}>
              <div style={{ fontSize: 9 * k, textTransform: 'uppercase', letterSpacing: 1, color: a }}>{r.label}</div>
              <div style={{ fontSize: 11.5 * k, whiteSpace: 'pre-line' }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
      {d.title && <div style={{ fontWeight: 700, fontSize: 14 * k, marginBottom: 10 * k }}>{d.title}</div>}
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 13 Kepala kotak-kotak: logo | nama instansi | nomor & tanggal
function KotakKop(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Archivo');
  // margin negatif agar border sel yang bersebelahan tidak menebal
  const cell: CSSProperties = { border: `1.5px solid ${a}`, margin: '0 -1.5px -1.5px 0', padding: `${6 * k}px ${10 * k}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {d.logo && <div style={{ ...cell, alignItems: 'center' }}><Logo d={d} k={k} h={52} /></div>}
        <div style={{ ...cell, flex: '1 1 200px', minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17 * k, lineHeight: 1.15, textTransform: 'uppercase' }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10 * k }}>{l}</div>)}
        </div>
        <div style={{ ...cell, flex: '0 1 auto', fontSize: 10.5 * k }}>
          {d.nomor && <div>No: <b>{d.nomor}</b></div>}
          <div>{d.placeDate}</div>
        </div>
      </div>
      {d.title && <div style={{ ...cell, margin: 0, marginTop: 0, background: a, color: '#fff', fontWeight: 700, textAlign: 'center', letterSpacing: 2 }}>{d.title}</div>}
      <div style={{ height: 14 * k }} />
      <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 14 Batang aksen vertikal sepanjang margin kiri
function BatangKiri(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { a, ff } = useLook('Poppins');
  return (
    <div style={page(p, { padding: 0, flexDirection: 'row', fontFamily: ff, fontSize: 12 * k })}>
      <div style={{ width: Math.max(5, 12 * pf), flexShrink: 0, background: a }} />
      <div style={{ ...col, padding: `${40 * pf}px ${48 * pf}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k, marginBottom: 18 * k }}>
          <Logo d={d} k={k} h={46} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18 * k, lineHeight: 1.15, color: a }}>{d.kopName}</div>
            {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10 * k, color: '#555' }}>{l}</div>)}
          </div>
        </div>
        <MetaGrid d={d} k={k} style={{ marginBottom: 10 * k }} />
        <Rcpt d={d} style={{ marginBottom: 12 * k }} />
        {d.title && <div style={{ fontWeight: 700, fontSize: 14 * k, textTransform: 'uppercase', color: a, marginBottom: 10 * k }}>{d.title}</div>}
        <div>{d.body}</div>
        <Gap k={k} />
        <Signs d={d} k={k} date />
        <Foot d={d} k={k} />
      </div>
    </div>
  );
}

// 15 Judul dalam blok hitam lebar penuh
function BlokHitam(p: LayoutProps) {
  const { doc: d, k, pf } = p;
  const { ff, hf } = useLook('Open Sans', 'sans-serif', 'Oswald', 'sans-serif');
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k, marginBottom: 12 * k }}>
        <Logo d={d} k={k} h={50} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: hf, fontWeight: 700, fontSize: 22 * k, lineHeight: 1.1, textTransform: 'uppercase' }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10.5 * k }}>{l}</div>)}
        </div>
      </div>
      <div style={{ margin: `0 -${56 * pf}px ${6 * k}px`, background: '#000', color: '#fff', padding: d.title ? `${10 * k}px ${56 * pf}px` : 3 * k, fontFamily: hf, fontSize: 20 * k, lineHeight: 1.2, letterSpacing: 3, textTransform: 'uppercase' }}>{d.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 * k, fontSize: 11 * k, marginBottom: 14 * k }}>
        <div>{d.nomor && `Nomor: ${d.nomor}`}</div>
        <div>{d.placeDate}</div>
      </div>
      <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 16 Bagian bernomor dengan subjudul kecil berwarna
function Bernomor(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Work Sans');
  let n = 0;
  const Head = ({ t }: { t: string }) => (
    <div style={{ color: a, fontSize: 10 * k, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: `1px solid ${a}`, paddingBottom: 2 * k, margin: `${10 * k}px 0 ${6 * k}px` }}>{String(++n).padStart(2, '0')} · {t}</div>
  );
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k }}>
        <Logo d={d} k={k} h={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18 * k, lineHeight: 1.15 }}>{d.kopName}</div>
          {lines(d).length > 0 && <div style={{ fontSize: 10.5 * k }}>{lines(d).join(' · ')}</div>}
        </div>
      </div>
      <div style={{ width: 60 * k, height: 3 * k, background: a, margin: `${6 * k}px 0 ${12 * k}px` }} />
      {d.title && <div style={{ fontWeight: 700, fontSize: 17 * k, lineHeight: 1.2 }}>{d.title}</div>}
      <Head t="Data Surat" />
      <InfoRows rows={[...metaRows(d).filter((r) => r.label === 'Nomor'), { label: 'Tanggal', value: d.placeDate }, ...metaRows(d, false)]} />
      {!!d.recipient?.length && <><Head t="Kepada" /><Rcpt d={d} /></>}
      <Head t="Isi" />
      <div>{d.body}</div>
      <Gap k={k} n={32} />
      {d.signers.length > 0 && <Head t="Pengesahan" />}
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 17 Kop pemerintahan/desa: logo kiri, nama kapital bertingkat, garis tebal-tipis, tanda tangan tengah
function Desa(p: LayoutProps) {
  const { doc: d, k } = p;
  const { ff } = useLook('Tinos', "'Times New Roman', serif");
  const L = lines(d);
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 13.5 * k })}>
      <div style={{ position: 'relative', textAlign: 'center', minHeight: d.logo ? 70 * k : undefined }}>
        <Logo d={d} k={k} h={70} style={{ position: 'absolute' }} />
        <div style={{ padding: d.logo ? `0 ${84 * k}px` : 0, lineHeight: 1.2 }}>
          {L[0] && <div style={{ fontWeight: 700, fontSize: 14 * k, textTransform: 'uppercase' }}>{L[0]}</div>}
          <div style={{ fontWeight: 700, fontSize: 19 * k, letterSpacing: 1, textTransform: 'uppercase' }}>{d.kopName}</div>
          {L.slice(1).map((l, i) => <div key={i} style={{ fontSize: 11.5 * k }}>{l}</div>)}
        </div>
      </div>
      <div style={{ margin: `${6 * k}px 0 ${14 * k}px` }}><div style={{ height: 4, background: '#000' }} /><div style={{ height: 2 }} /><div style={{ height: 1, background: '#000' }} /></div>
      {d.title && <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 * k, textTransform: 'uppercase' }}><span style={{ borderBottom: '1.5px solid #000', paddingBottom: 1 }}>{d.title}</span></div>}
      {d.nomor && <div style={{ textAlign: 'center' }}>Nomor: {d.nomor}</div>}
      <div style={{ height: 12 * k }} />
      <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} align="center" date />
      <Foot d={d} k={k} />
    </div>
  );
}

// 18 Kartu: isi dalam kotak membulat, tanda tangan sama lebar dalam grid
function Kartu(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Nunito');
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 * k, marginBottom: 12 * k }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * k, minWidth: 0 }}>
          <Logo d={d} k={k} h={40} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 * k, lineHeight: 1.15, color: a }}>{d.kopName}</div>
            {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10 * k }}>{l}</div>)}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11 * k }}>{d.placeDate}</div>
      </div>
      <div style={{ border: `1.5px solid ${a}`, borderRadius: 14 * k, padding: `${14 * k}px ${18 * k}px` }}>
        {d.title && <div style={{ display: 'inline-block', background: a, color: '#fff', borderRadius: 999, padding: `${3 * k}px ${12 * k}px`, fontWeight: 700, fontSize: 12 * k, marginBottom: 6 * k }}>{d.title}</div>}
        {d.nomor && <div style={{ fontSize: 11 * k, color: '#555', marginBottom: 8 * k }}>Nomor: {d.nomor}</div>}
        <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
        <Rcpt d={d} style={{ marginBottom: 10 * k }} />
        <div>{d.body}</div>
      </div>
      <Gap k={k} n={32} />
      <Signs d={d} k={k} grid />
      <Foot d={d} k={k} />
    </div>
  );
}

// 19 Kop rata kanan (logo kanan), tanggal di kiri
function Kanan(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Raleway');
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12.5 * k })}>
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 12 * k }}>
        <Logo d={d} k={k} h={56} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 19 * k, lineHeight: 1.15, color: a }}>{d.kopName}</div>
          {lines(d).map((l, i) => <div key={i} style={{ fontSize: 10.5 * k }}>{l}</div>)}
        </div>
      </div>
      <div style={{ width: '60%', height: 3, background: a, margin: `${8 * k}px 0 ${8 * k}px auto` }} />
      <div style={{ fontWeight: 600, marginBottom: 14 * k }}>{d.placeDate}</div>
      <MetaGrid d={d} k={k} style={{ marginBottom: 10 * k }} />
      <Rcpt d={d} style={{ marginBottom: 12 * k }} />
      {d.title && <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 * k, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 * k }}>{d.title}</div>}
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
    </div>
  );
}

// 20 Elegan serif marun: garis tipis atas & bawah halaman, kontak di kaki
function Marun(p: LayoutProps) {
  const { doc: d, k } = p;
  const { a, ff } = useLook('Libre Baskerville', 'serif');
  const rule = <div style={{ height: 1.5, background: a }} />;
  return (
    <div style={page(p, { fontFamily: ff, fontSize: 12 * k, lineHeight: 1.55 })}>
      {rule}
      <div style={{ textAlign: 'center', margin: `${14 * k}px 0 ${16 * k}px` }}>
        {d.logo && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 * k }}><Logo d={d} k={k} h={46} /></div>}
        <div style={{ fontSize: 17 * k, letterSpacing: 2, textTransform: 'uppercase', color: a, lineHeight: 1.2 }}>{d.kopName}</div>
      </div>
      {d.title && <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 15 * k, color: a }}>{d.title}</div>}
      {d.nomor && <div style={{ textAlign: 'center', fontSize: 11 * k }}>Nomor: {d.nomor}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 * k, margin: `${12 * k}px 0` }}>
        <div>
          <MetaGrid d={d} k={k} nomor={false} style={{ marginBottom: 8 * k }} />
          <Rcpt d={d} />
        </div>
        <div style={{ marginLeft: 'auto', fontStyle: 'italic' }}>{d.placeDate}</div>
      </div>
      <div>{d.body}</div>
      <Gap k={k} />
      <Signs d={d} k={k} />
      <Foot d={d} k={k} />
      <Fill k={k} />
      {lines(d).length > 0 && <div style={{ textAlign: 'center', fontSize: 9.5 * k, color: a, marginBottom: 6 * k }}>{lines(d).join('  •  ')}</div>}
      {rule}
    </div>
  );
}

// Daftar 20 tata letak (id harus unik & stabil karena tersimpan di data pengguna)
export const LETTER_LAYOUTS: Def[] = [
  { id: 'klasik', name: '01. Klasik Resmi', desc: 'Kop tengah, garis ganda', render: (p) => <Klasik {...p} /> },
  { id: 'kiri-aksen', name: '02. Kop Kiri Aksen', desc: 'Kop rata kiri, garis biru tebal, tanggal kanan atas', render: (p) => <KiriAksen {...p} /> },
  { id: 'sidebar', name: '03. Sidebar Warna', desc: 'Kolom kiri berwarna berisi identitas & data surat', render: (p) => <Sidebar {...p} /> },
  { id: 'pita', name: '04. Pita Kop', desc: 'Pita warna penuh di atas, teks putih', render: (p) => <Pita {...p} /> },
  { id: 'kop-bawah', name: '05. Kop di Kaki', desc: 'Judul besar di atas, identitas di kaki halaman', render: (p) => <KopBawah {...p} /> },
  { id: 'memo', name: '06. Memo / Nota Dinas', desc: 'Kepala berupa tabel Kepada–Dari–Perihal', render: (p) => <Memo {...p} /> },
  { id: 'bingkai', name: '07. Bingkai Penuh', desc: 'Garis ganda mengelilingi halaman', render: (p) => <Bingkai {...p} /> },
  { id: 'dua-kolom', name: '08. Kop Dua Kolom', desc: 'Identitas kiri, alamat & kontak kanan', render: (p) => <DuaKolom {...p} /> },
  { id: 'minimal', name: '09. Modern Minimal', desc: 'Judul besar kiri, ruang putih lega', render: (p) => <Minimal {...p} /> },
  { id: 'mesin-ketik', name: '10. Mesin Ketik', desc: 'Huruf monospasi, rata kiri, garis putus-putus', render: (p) => <MesinKetik {...p} /> },
  { id: 'huruf-jarak', name: '11. Huruf Berjarak', desc: 'Kop tengah renggang, ornamen garis tiga', render: (p) => <HurufJarak {...p} /> },
  { id: 'din', name: '12. Gaya Eropa (DIN)', desc: 'Blok penerima kiri, kotak info kanan', render: (p) => <Din {...p} /> },
  { id: 'kotak-kop', name: '13. Kop Kotak-kotak', desc: 'Kepala grid: logo | instansi | nomor', render: (p) => <KotakKop {...p} /> },
  { id: 'batang-kiri', name: '14. Batang Aksen', desc: 'Batang warna vertikal di tepi kiri', render: (p) => <BatangKiri {...p} /> },
  { id: 'blok-hitam', name: '15. Judul Blok Hitam', desc: 'Judul putih dalam blok hitam lebar penuh', render: (p) => <BlokHitam {...p} /> },
  { id: 'bernomor', name: '16. Bagian Bernomor', desc: 'Subjudul bernomor berwarna per bagian', render: (p) => <Bernomor {...p} /> },
  { id: 'desa', name: '17. Pemerintahan / Desa', desc: 'Kop kapital bertingkat, tanda tangan tengah', render: (p) => <Desa {...p} /> },
  { id: 'kartu', name: '18. Kartu', desc: 'Isi dalam kotak membulat, tanda tangan sejajar', render: (p) => <Kartu {...p} /> },
  { id: 'kanan', name: '19. Kop Rata Kanan', desc: 'Logo & kop di kanan, tanggal di kiri', render: (p) => <Kanan {...p} /> },
  { id: 'marun', name: '20. Elegan Marun', desc: 'Serif marun, garis tipis atas & bawah', render: (p) => <Marun {...p} /> },
];

// Aksen, gaya InfoRows & paragraf per tata letak (klasik memakai bawaan)
const THEMES: Record<string, Theme> = {
  'kiri-aksen': { accent: '#1e3a8a', rows: 'colon', para: 'block' },
  sidebar: { accent: '#0f4c5c', rows: 'table', para: 'block' },
  pita: { accent: '#b45309', rows: 'dotted', para: 'block' },
  'kop-bawah': { accent: '#374151', rows: 'colon', para: 'indent' },
  memo: { accent: '#000', rows: 'colon', para: 'block' },
  bingkai: { accent: '#14532d', rows: 'dotted', para: 'indent' },
  'dua-kolom': { accent: '#475569', rows: 'colon', para: 'block' },
  minimal: { accent: '#e11d48', rows: 'stacked', para: 'block' },
  'mesin-ketik': { accent: '#000', rows: 'colon', para: 'block' },
  'huruf-jarak': { accent: '#6b4f1d', rows: 'dotted', para: 'indent' },
  din: { accent: '#0e7490', rows: 'table', para: 'block' },
  'kotak-kop': { accent: '#1f2937', rows: 'table', para: 'block' },
  'batang-kiri': { accent: '#7c3aed', rows: 'colon', para: 'block' },
  'blok-hitam': { accent: '#000', rows: 'colon', para: 'indent' },
  bernomor: { accent: '#c2410c', rows: 'stacked', para: 'block' },
  desa: { accent: '#000', rows: 'colon', para: 'indent' },
  kartu: { accent: '#2563eb', rows: 'table', para: 'block' },
  kanan: { accent: '#065f46', rows: 'dotted', para: 'block' },
  marun: { accent: '#7f1d1d', rows: 'dotted', para: 'indent' },
};
export const getLayout = (id?: string) => LETTER_LAYOUTS.find((l) => l.id === id) ?? LETTER_LAYOUTS[0];

export function LayoutLetter(p: LayoutProps) {
  const def = getLayout(p.layout);
  const t = THEMES[def.id] ?? { accent: '#000', rows: 'colon', para: 'block' };
  return <Ctx.Provider value={{ k: p.k, t }}>{def.render(p)}</Ctx.Provider>;
}

export function LayoutPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <Field label="Template (tata letak)">
      <select className={inputCls} value={getLayout(value).id} onChange={(e) => onChange(e.target.value)}>
        {LETTER_LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.desc}</option>)}
      </select>
    </Field>
  );
}

console.assert(LETTER_LAYOUTS.length === 20 && new Set(LETTER_LAYOUTS.map((l) => l.id)).size === 20 && LETTER_LAYOUTS.every((l) => l.id === 'klasik' || THEMES[l.id]), 'LETTER_LAYOUTS');
