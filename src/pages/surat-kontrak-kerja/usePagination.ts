import { useLayoutEffect, useState } from 'react';

// Pembagian halaman otomatis. Isi dipecah jadi unit (paragraf/ayat/blok tanda tangan) yang dirender di
// elemen [data-flow] tiap halaman [data-page]. Setelah render, halaman yang meluap memindahkan unit terakhirnya
// ke halaman berikut; diulang sampai tidak ada yang meluap. `group` = unit sekelompok: bila kelompok terpotong dan
// bagian yang tertinggal <= maxKeep px, kelompok dipindah utuh; selain itu dipotong per unit (ayat).

// Indeks lokal unit pertama yang dipindah dari halaman yang meluap `ov` px; null = tidak bisa (sisa 1 unit).
export function nextCut(heights: number[], groups: number[], ov: number, maxKeep = Infinity): number | null {
  let c = heights.length;
  let sum = 0;
  while (c > 0 && sum < ov) sum += heights[--c];
  const gs = groups.indexOf(groups[c]);
  if (gs > 0 && heights.slice(gs, c).reduce((a, b) => a + b, 0) <= maxKeep) c = gs; // kelompok terpotong: pindah utuh bila tidak menyisakan ruang kosong besar
  c = Math.max(c, 1);
  return c < heights.length ? c : null;
}
console.assert(
  nextCut([100, 50, 50, 50], [0, 1, 1, 2], 40) === 3 &&
    nextCut([100, 50, 50, 50], [0, 1, 1, 1], 40) === 1 &&
    nextCut([100, 50, 50], [1, 1, 1], 60) === 1 &&
    nextCut([500], [0], 100) === null &&
    nextCut([100, 50], [0, 0], 500) === 1 &&
    nextCut([100, 50, 50, 50], [0, 1, 1, 1], 40, 60) === 3,
  'nextCut',
);

// key: objek baru setiap isi/kertas/template/font berubah → pembagian dihitung ulang dari awal.
// Kembalian: [awal, akhir) indeks unit per halaman.
export function usePagination(count: number, groups: number[], key: unknown, getRoot: () => HTMLElement | null) {
  const [st, setSt] = useState<{ key: unknown; cuts: number[] }>({ key, cuts: [] });
  const cuts = st.key === key ? st.cuts : [];
  const bounds = [0, ...cuts.filter((c) => c < count), count];

  useLayoutEffect(() => {
    const pages = [...(getRoot()?.querySelectorAll<HTMLElement>('[data-page]') ?? [])];
    for (const [i, page] of pages.entries()) {
      const flow = page.querySelector<HTMLElement>('[data-flow]');
      if (!flow) continue;
      // Luapan terbesar di antara pembungkus isi (halaman, kolom, bingkai) yang tingginya tetap
      let ov = 0;
      for (let a = flow.parentElement; a && a !== page.parentElement; a = a.parentElement) ov = Math.max(ov, a.scrollHeight - a.clientHeight);
      if (ov <= 1) continue;
      const heights = [...flow.children].map((el) => (el as HTMLElement).offsetHeight);
      const c = nextCut(heights, groups.slice(bounds[i], bounds[i + 1]), ov, page.offsetHeight * 0.35);
      if (c === null) continue;
      setSt({ key, cuts: [...cuts.slice(0, i), bounds[i] + c] }); // halaman sesudahnya dihitung ulang
      return;
    }
  });

  return bounds.slice(0, -1).map((b, i) => [b, bounds[i + 1]] as const);
}
