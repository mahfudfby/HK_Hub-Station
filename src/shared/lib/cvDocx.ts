// Ekspor CV ke Word (.docx) yang meniru PREVIEW halaman demi halaman: setiap kotak/garis/foto menjadi Shape,
// setiap blok teks menjadi Text Box di posisi yang sama (teks tetap bisa diedit, mis. mengoreksi terjemahan).
// Cara kerja: membaca DOM halaman preview (posisi, warna, border, foto, font) lalu menulis DrawingML (wps) terjangkar ke halaman.
// Word mengabaikan perataan kanan/tengah bila Text Box "tanpa bungkus" (wrap="none"), jadi semua kotak memakai wrap="square".
// shortcut: ukuran huruf sudah kelipatan 0,5 pt (halfPt di CvTemplates) agar sama dengan Word; pembungkusan baris di Word
// memakai font Arial/Times (metrik sama dengan Arimo/Tinos) tetapi tetap bisa berbeda tipis; ratakan manual bila perlu.

const EMU = 9525; // 1 px (96 dpi) = 9525 EMU
const emu = (n: number) => Math.round(n * EMU);
const tw = (n: number) => Math.round(n * 15); // px -> twips
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type R = { x: number; y: number; w: number; h: number };
type Rgba = { hex: string; a: number };

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

export function parseColor(s: string): Rgba | null {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { hex: [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(), a };
}
const solid = (c: Rgba) => `<a:solidFill><a:srgbClr val="${c.hex}">${c.a < 1 ? `<a:alpha val="${Math.round(c.a * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>`;

// Pembangun satu dokumen: menampung shape, gambar, dan relasi
class Doc {
  id = 0;
  z = 0;
  media = new Map<string, { rid: string; name: string; bytes: Uint8Array; ext: string }>();

  anchor(r: R, kind: 'shape' | 'text', spPr: string, body: string): string {
    const n = ++this.id;
    return `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${++this.z}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(r.x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(r.y)}</wp:posOffset></wp:positionV><wp:extent cx="${emu(r.w)}" cy="${emu(r.h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${n}" name="${kind === 'text' ? 'Text Box' : 'Shape'} ${n}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr${kind === 'text' ? ' txBox="1"' : ''}/>${spPr}${body}</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>`;
  }

  spPr(r: R, geom: string, adj: string, fill: string, ln: string) {
    return `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(r.w)}" cy="${emu(r.h)}"/></a:xfrm><a:prstGeom prst="${geom}"><a:avLst>${adj}</a:avLst></a:prstGeom>${fill}${ln}</wps:spPr>`;
  }

  async picture(src: string): Promise<{ rid: string; w: number; h: number }> {
    let hit = this.media.get(src);
    const img = await loadImage(src);
    if (!hit) {
      const m = src.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      let bytes: Uint8Array;
      let ext = 'png';
      if (m) {
        bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        ext = m[1] === 'png' ? 'png' : 'jpeg';
      } else {
        // webp / url lain: gambar ulang ke PNG (Word tidak membaca webp)
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        cv.getContext('2d')!.drawImage(img, 0, 0);
        bytes = Uint8Array.from(atob(cv.toDataURL('image/png').split(',')[1]), (c) => c.charCodeAt(0));
      }
      hit = { rid: `rId${10 + this.media.size}`, name: `image${this.media.size + 1}.${ext}`, bytes, ext };
      this.media.set(src, hit);
    }
    return { rid: hit.rid, w: img.naturalWidth, h: img.naturalHeight };
  }
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, no) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = () => no(new Error('Foto gagal dibaca untuk DOCX.'));
  i.src = src;
});

const FONT_MAP: Record<string, { name: string; mf: number }> = {
  arimo: { name: 'Arial', mf: 1.117 }, arial: { name: 'Arial', mf: 1.117 }, helvetica: { name: 'Arial', mf: 1.117 },
  tinos: { name: 'Times New Roman', mf: 1.107 }, times: { name: 'Times New Roman', mf: 1.107 }, 'times new roman': { name: 'Times New Roman', mf: 1.107 },
};
const fontOf = (cs: CSSStyleDeclaration) => FONT_MAP[cs.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase()] ?? FONT_MAP.arial;

const underlined = (el: HTMLElement, stop: HTMLElement) => {
  for (let e: HTMLElement | null = el; e && e !== stop.parentElement; e = e.parentElement) if (getComputedStyle(e).textDecorationLine.includes('underline')) return true;
  return false;
};

// ---------- Teks -> Text Box ----------
function textBox(d: Doc, el: HTMLElement, cs: CSSStyleDeclaration, r: R, page: HTMLElement): string {
  let text = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? '').join('').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  const px = (v: string) => parseFloat(v) || 0;
  const bx = { l: px(cs.borderLeftWidth) + px(cs.paddingLeft), r: px(cs.borderRightWidth) + px(cs.paddingRight), t: px(cs.borderTopWidth) + px(cs.paddingTop), b: px(cs.borderBottomWidth) + px(cs.paddingBottom) };
  const c: R = { x: r.x + bx.l, y: r.y + bx.t, w: Math.max(1, r.w - bx.l - bx.r), h: Math.max(1, r.h - bx.t - bx.b) };
  const fsPx = px(cs.fontSize);
  const f = fontOf(cs);
  const lh = px(cs.lineHeight) || fsPx * 1.15;
  const flexCenter = cs.display.includes('flex') && cs.alignItems === 'center';
  const align = flexCenter && cs.justifyContent === 'center' ? 'center' : cs.textAlign === 'center' ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : cs.textAlign === 'justify' ? 'both' : 'left';
  const multi = !flexCenter && c.h > lh * 1.5;
  const rule = lh >= fsPx * f.mf ? 'exact' : 'atLeast';
  // Word menaruh kelebihan tinggi baris (exact) di atas teks, CSS membaginya dua: naikkan kotak setengahnya
  const shift = rule === 'exact' && !flexCenter ? (lh - fsPx * f.mf) / 2 : 0;
  let box: R = { x: c.x, y: c.y - shift, w: c.w, h: c.h + lh };
  if (flexCenter) box = { x: c.x, y: c.y, w: c.w, h: c.h };
  else if (!multi) { // satu baris: lebarkan kotak (rata kanan/tengah tetap di tepi aslinya) agar selisih font tidak memecah baris
    const pad = Math.max(24, c.w * 0.25);
    box = align === 'left' ? { ...box, w: c.w + pad } : align === 'right' ? { ...box, x: box.x - pad, w: c.w + pad } : { ...box, x: box.x - pad, w: c.w + pad * 2 };
  }
  const color = parseColor(cs.color) ?? { hex: '000000', a: 1 };
  const ls = px(cs.letterSpacing); // 'normal' -> 0
  const half = Math.round(fsPx * 1.5);
  const rpr = `<w:rPr><w:rFonts w:ascii="${f.name}" w:hAnsi="${f.name}" w:cs="${f.name}"/>${parseInt(cs.fontWeight, 10) >= 600 ? '<w:b/>' : ''}${cs.fontStyle === 'italic' ? '<w:i/>' : ''}<w:color w:val="${color.hex}"/>${ls ? `<w:spacing w:val="${Math.round(ls * 15)}"/>` : ''}<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>${underlined(el, page) ? '<w:u w:val="single"/>' : ''}</w:rPr>`;
  const runs = text.split('­').map((t) => `<w:r>${rpr}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`).join(`<w:r>${rpr}<w:softHyphen/></w:r>`);
  const para = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(lh)}" w:lineRule="${rule}"/><w:jc w:val="${align}"/></w:pPr>${runs}</w:p>`;
  const sp = d.spPr(box, 'rect', '', '<a:noFill/>', '<a:ln><a:noFill/></a:ln>');
  const body = `<wps:txbx><w:txbxContent>${para}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${flexCenter ? 'ctr' : 't'}" anchorCtr="0"><a:noAutofit/></wps:bodyPr>`;
  return d.anchor(box, 'text', sp, body);
}

// ---------- Kotak, garis, foto -> Shape ----------
async function boxShapes(d: Doc, cs: CSSStyleDeclaration, r: R): Promise<string> {
  const px = (v: string) => parseFloat(v) || 0;
  const bg = parseColor(cs.backgroundColor);
  const fill = bg && bg.a > 0 ? bg : null;
  const url = cs.backgroundImage.match(/url\(["']?(.+?)["']?\)$/)?.[1];
  const w4 = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
  const col4 = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parseColor);
  const hasBorder = w4.some((v) => v > 0);
  if (!fill && !url && !hasBorder) return '';

  const rad = cs.borderTopLeftRadius;
  const rpx = rad.includes('%') ? Math.min(r.w, r.h) * (parseFloat(rad) / 100) : px(rad);
  const geom = rpx > 0 ? (rad.includes('%') && parseFloat(rad) >= 50 ? 'ellipse' : 'roundRect') : 'rect';
  const adj = geom === 'roundRect' ? `<a:gd name="adj" fmla="val ${Math.min(50000, Math.round((rpx / Math.min(r.w, r.h)) * 100000))}"/>` : '';
  const uniform = hasBorder && w4.every((v) => v === w4[0]) && col4.every((c) => c && c.hex === col4[0]!.hex);
  let out = '';

  let fillXml = fill ? solid(fill) : '<a:noFill/>';
  if (url) {
    const pic = await d.picture(url);
    // background-size: cover; background-position: center top -> srcRect
    const br = r.w / r.h;
    const ir = pic.w / pic.h;
    const crop = ir > br ? { l: Math.round(((1 - br / ir) / 2) * 100000), r: Math.round(((1 - br / ir) / 2) * 100000), b: 0 } : { l: 0, r: 0, b: Math.round((1 - ir / br) * 100000) };
    fillXml = `<a:blipFill><a:blip r:embed="${pic.rid}"/><a:srcRect l="${crop.l}" t="0" r="${crop.r}" b="${crop.b}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill>`;
  }
  let box = r;
  let ln = '<a:ln><a:noFill/></a:ln>';
  if (uniform) { // garis tepi seragam: garis shape (di tengah tepi), shape dikecilkan setengah tebal
    const bw = w4[0];
    box = { x: r.x + bw / 2, y: r.y + bw / 2, w: r.w - bw, h: r.h - bw };
    ln = `<a:ln w="${emu(bw)}">${solid(col4[0]!)}</a:ln>`;
  }
  if (fill || url || uniform) out += d.anchor(box, 'shape', d.spPr(box, geom, adj, fillXml, ln), '<wps:bodyPr/>');
  if (hasBorder && !uniform) { // tepi per sisi: persegi tipis berwarna
    const side = (x: number, y: number, w: number, h: number, c: Rgba | null) => (c && c.a > 0 && w > 0 && h > 0
      ? d.anchor({ x, y, w, h }, 'shape', d.spPr({ x, y, w, h }, 'rect', '', solid(c), '<a:ln><a:noFill/></a:ln>'), '<wps:bodyPr/>') : '');
    out += side(r.x, r.y, r.w, w4[0], col4[0]) + side(r.x, r.y + r.h - w4[2], r.w, w4[2], col4[2]) + side(r.x, r.y, w4[3], r.h, col4[3]) + side(r.x + r.w - w4[1], r.y, w4[1], r.h, col4[1]);
  }
  return out;
}

async function walk(d: Doc, el: HTMLElement, page: HTMLElement, pr: DOMRect, s: number): Promise<string> {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return '';
  const b = el.getBoundingClientRect();
  const r: R = { x: (b.left - pr.left) / s, y: (b.top - pr.top) / s, w: b.width / s, h: b.height / s };
  let out = '';
  if (r.w > 0 && r.h > 0) {
    out += await boxShapes(d, cs, r);
    out += textBox(d, el, cs, r, page);
  }
  for (const c of Array.from(el.children)) out += await walk(d, c as HTMLElement, page, pr, s);
  return out;
}

// ---------- Paket .docx ----------
const FILES = {
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/settings.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
  'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:lang w:val="LANG"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
};

// pages: elemen [data-page] dari preview; W/H: ukuran halaman (px)
export async function buildCvDocx(pages: HTMLElement[], W: number, H: number, lang: 'id-ID' | 'en-US' = 'id-ID'): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const d = new Doc();
  const body: string[] = [];
  for (const [i, page] of pages.entries()) {
    const pr = page.getBoundingClientRect();
    const s = pr.width / page.offsetWidth || 1; // preview boleh diperkecil (transform): kembalikan ke ukuran asli
    let shapes = '';
    for (const c of Array.from(page.children)) shapes += await walk(d, c as HTMLElement, page, pr, s);
    // satu paragraf per halaman menjadi jangkar semua shape; paragraf kecil agar tidak menambah halaman kosong
    body.push(`<w:p><w:pPr>${i ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr>${shapes}</w:p>`);
  }
  const imgs = [...d.media.values()];
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${tw(W)}" w:h="${tw(H)}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${imgs.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')}</Relationships>`;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(types), '_rels/.rels': strToU8(FILES['_rels/.rels']), 'word/document.xml': strToU8(doc), 'word/_rels/document.xml.rels': strToU8(rels),
    'word/styles.xml': strToU8(FILES['word/styles.xml'].replace('LANG', lang)), 'word/settings.xml': strToU8(FILES['word/settings.xml']),
  };
  imgs.forEach((m) => (files[`word/media/${m.name}`] = m.bytes));
  return new Blob([zipSync(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

console.assert(parseColor('rgb(17, 17, 17)')?.hex === '111111' && parseColor('rgba(0, 0, 0, 0)')?.a === 0 && esc('a&b"') === 'a&amp;b&quot;', 'cvDocx util');
