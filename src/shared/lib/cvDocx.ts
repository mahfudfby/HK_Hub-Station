import { periodeEn, type Cv, type Lbl } from '../components/CvKit';

// Ekspor CV ke Word (.docx) berisi teks asli: bahasa sesuai pilihan (Indonesia / English hasil Auto-Translate),
// supaya terjemahan bisa dikoreksi manual. Satu kolom, margin 1,5 cm, tanpa foto & tanpa tata letak template.
// shortcut: DOCX sederhana (judul, butir, tebal); tata letak warna/kolom template tidak ikut terbawa.

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Run = { t: string; b?: boolean; i?: boolean; sz?: number };
const run = ({ t, b, i, sz }: Run) => {
  const body = t.split('\n').map((line) => `<w:t xml:space="preserve">${esc(line)}</w:t>`).join('<w:br/>');
  return `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${sz ? `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` : ''}</w:rPr>${body}</w:r>`;
};
type ParaOpt = { style?: string; bullet?: boolean; after?: number; keepNext?: boolean };
const para = (runs: Run[] | string, o: ParaOpt = {}) => {
  const rs = typeof runs === 'string' ? [{ t: runs }] : runs;
  const pr = `${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${o.keepNext ? '<w:keepNext/>' : ''}${o.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : ''}${o.after !== undefined ? `<w:spacing w:after="${o.after}"/>` : ''}`;
  return `<w:p><w:pPr>${pr}</w:pPr>${rs.map(run).join('')}</w:p>`;
};

// Isi dokumen: urutan sama dengan template satu kolom
export function cvDocxXml(cv: Cv, tr: (s: string) => string, L: Lbl, en: boolean): string {
  const shown = (b: (typeof cv.sembunyi)[number]) => !cv.sembunyi.includes(b);
  const heading = (t: string) => para(t, { style: 'Heading1', keepNext: true });
  const bullets = (items: string[] = []) => items.filter(Boolean).map((t) => para(tr(t), { bullet: true, after: 40 }));
  const out: string[] = [];

  out.push(para(cv.nama, { style: 'Title' }));
  if (cv.jabatan) out.push(para([{ t: tr(cv.jabatan), sz: 26 }], { after: 60 }));
  const kontak = [cv.email, cv.telepon, cv.web, cv.alamat].filter(Boolean).join('  |  ');
  if (kontak) out.push(para(kontak, { after: 120 }));

  if (shown('ringkasan') && (cv.ringkasan || (cv.ringkasanPoin ?? []).some(Boolean))) {
    out.push(heading(L.ringkasan));
    if (cv.ringkasan) out.push(para(tr(cv.ringkasan), { after: 80 }));
    out.push(...bullets(cv.ringkasanPoin));
  }
  if (shown('pengalaman') && cv.pengalaman.length) {
    out.push(heading(L.pengalaman));
    cv.pengalaman.forEach((j) => {
      out.push(para([{ t: tr(j.posisi), b: true }], { keepNext: true, after: 0 }));
      const sub = [j.perusahaan, tr(j.bidang)].filter(Boolean).join(' · ');
      const per = en ? periodeEn(j.periode) : j.periode;
      out.push(para([{ t: [sub, per].filter(Boolean).join('  |  '), i: true }], { keepNext: true, after: 40 }));
      out.push(...bullets(j.poin));
    });
  }
  if (shown('pendidikan') && cv.pendidikan.length) {
    out.push(heading(L.pendidikan));
    cv.pendidikan.forEach((e) => {
      out.push(para([{ t: tr(e.jurusan), b: true }], { after: 0 }));
      out.push(para([e.institusi, e.ket && tr(e.ket)].filter(Boolean).join(' · '), { after: 40 }));
      out.push(...bullets(e.poin));
    });
  }
  if (shown('pelatihan') && cv.pelatihan.length) {
    out.push(heading(L.pelatihan));
    cv.pelatihan.forEach((p) => {
      out.push(para(tr(p.judul), { bullet: true, after: 20 }));
      p.rincian.filter(Boolean).forEach((r, i) => out.push(para(`${i + 1}. ${tr(r)}`, { after: 20 })));
    });
  }
  const daftar = (b: 'keahlian' | 'alat' | 'hobi', title: string) => {
    if (shown(b) && cv[b].length) out.push(heading(title), para(cv[b].map(tr).join(', '), { after: 80 }));
  };
  daftar('keahlian', L.keahlian);
  daftar('alat', L.alat);
  if (shown('organisasi') && cv.organisasi.length) {
    out.push(heading(L.organisasi));
    cv.organisasi.forEach((o) => {
      out.push(para([{ t: tr(o.peran), b: true }], { keepNext: true, after: 0 }));
      out.push(para([o.organisasi, o.ket && tr(o.ket)].filter(Boolean).join(' · '), { after: 40 }));
      out.push(...bullets(o.poin));
    });
  }
  if (shown('referensi') && cv.referensi.length) {
    out.push(heading(L.referensi));
    cv.referensi.forEach((r) => {
      out.push(para([{ t: r.nama, b: true }], { after: 0 }));
      out.push(para([r.jabatan && tr(r.jabatan), r.perusahaan, r.ket && tr(r.ket)].filter(Boolean).join(' · '), { after: 40 }));
      out.push(...bullets(r.poin));
    });
  }
  daftar('hobi', L.hobi);
  return out.join('');
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const MARGIN = 850; // 1,5 cm dalam twips
const FILES = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
  'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="2" w:color="000000"/></w:pBdr><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style></w:styles>`,
  'word/numbering.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="260"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
};

export async function buildCvDocx(cv: Cv, tr: (s: string) => string, L: Lbl, en: boolean, a4 = true): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const [w, h] = a4 ? [11906, 16838] : [12240, 15840]; // A4 / Letter (twips)
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${cvDocxXml(cv, tr, L, en)}<w:sectPr><w:pgSz w:w="${w}" w:h="${h}"/><w:pgMar w:top="${MARGIN}" w:right="${MARGIN}" w:bottom="${MARGIN}" w:left="${MARGIN}" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const zip = zipSync(Object.fromEntries(Object.entries({ ...FILES, 'word/document.xml': doc }).map(([k, v]) => [k, strToU8(v)])));
  return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

console.assert(esc('A & B <c> "d"') === 'A &amp; B &lt;c&gt; &quot;d&quot;' && run({ t: 'a\nb' }).includes('<w:br/>'), 'cvDocx escape');
