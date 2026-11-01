// Pemenggalan kata Bahasa Indonesia (pola suku kata KBBI, disederhanakan) untuk paragraf rata kiri-kanan:
// sisipkan soft hyphen (U+00AD) agar browser bisa memenggal kata di ujung baris dan spasi tidak melebar.
// Ekspor: unfitPreview mengganti soft hyphen yang jatuh di ujung baris dengan "-" sungguhan (html2canvas
// tidak menggambar tanda penggal otomatis).
export const SHY = String.fromCharCode(0xad); // soft hyphen (U+00AD)
const VOWEL = /[aiueoAIUEO]/;
const DIGRAPH = new Set(['ng', 'ny', 'kh', 'sy']);
// Gugus konsonan awal suku kata pada kata serapan: in-stru-men, kon-struk-si (KBBI)
const ONSET = new Set(['tr', 'pr', 'kr', 'gr', 'br', 'dr', 'fr', 'bl', 'kl', 'pl', 'fl', 'gl', 'sl', 'sp', 'st', 'sk', 'str', 'spr', 'skr']);
const MIN_LEFT = 3;
const MIN_RIGHT = 3;
const MIN_WORD = 8;

// Pecah kata menjadi unit huruf (digraf ng/ny/kh/sy dihitung satu konsonan)
function units(w: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const two = w.slice(i, i + 2).toLowerCase();
    if (DIGRAPH.has(two)) { out.push(w.slice(i, i + 2)); i++; } else out.push(w[i]);
  }
  return out;
}
const isV = (u: string) => VOWEL.test(u[0]);

// Posisi penggal (indeks karakter) di dalam kata
export function breakPoints(word: string): number[] {
  if (word.length < MIN_WORD || !/^[A-Za-z]+$/.test(word) || word === word.toUpperCase()) return [];
  const u = units(word);
  const cuts: number[] = []; // indeks unit tempat suku kata baru dimulai
  let i = 0;
  while (i < u.length && !isV(u[i])) i++; // konsonan awal ikut suku kata pertama
  while (i < u.length) {
    // dari vokal ke vokal berikutnya
    let j = i + 1;
    while (j < u.length && !isV(u[j])) j++;
    if (j >= u.length) break; // tidak ada vokal lagi: sisa konsonan ikut suku kata terakhir
    const cons = j - i - 1;
    if (cons === 0) { i = j; continue; } // dua vokal berurutan: tidak dipenggal (hindari salah diftong)
    let start = j - 1; // V-CV: suku kata baru mulai di konsonan terakhir
    if (cons >= 3) {
      const last2 = (u[j - 2] + u[j - 1]).toLowerCase();
      const last3 = (u[j - 3] + u[j - 2] + u[j - 1]).toLowerCase();
      if (ONSET.has(last3) && cons >= 4) start = j - 3;
      else if (ONSET.has(last2)) start = j - 2;
    }
    cuts.push(start);
    i = j;
  }
  // unit → karakter, terapkan batas minimal kiri/kanan
  const charAt: number[] = [];
  let c = 0;
  for (const x of u) { charAt.push(c); c += x.length; }
  return cuts.map((k) => charAt[k]).filter((p) => p >= MIN_LEFT && word.length - p >= MIN_RIGHT);
}

export const hyphenateWord = (w: string) => {
  const ps = breakPoints(w);
  if (!ps.length) return w;
  let out = '';
  let last = 0;
  for (const p of ps) { out += w.slice(last, p) + SHY; last = p; }
  return out + w.slice(last);
};

// Seluruh teks: hanya kata huruf; tanda baca, angka & spasi dibiarkan. Soft hyphen lama dibuang dulu.
export const hyphenateText = (t: string) => t.split(SHY).join('').replace(/[A-Za-z]+/g, hyphenateWord);

{
  const show = (w: string) => hyphenateWord(w).split(SHY).join('-');
  console.assert(show('pembayaran') === 'pem-ba-ya-ran', 'hyph pembayaran', show('pembayaran'));
  console.assert(show('mengambil') === 'mengam-bil', 'hyph mengambil', show('mengambil'));
  console.assert(show('instrumen') === 'instru-men', 'hyph instrumen', show('instrumen'));
  console.assert(show('perjanjian') === 'per-jan-jian', 'hyph perjanjian', show('perjanjian'));
  console.assert(show('kerja') === 'kerja' && show('PKWT') === 'PKWT' && show('sebagaimana') === 'seba-gai-mana', 'hyph pendek/akronim/diftong', show('sebagaimana'));
}
