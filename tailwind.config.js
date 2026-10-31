// Tema Material minimalis: semua warna aksen dipetakan ke satu palet utama (Material Indigo),
// hijau = sukses, merah = bahaya. Teks putih di atas tingkat 400 ke atas lolos kontras WCAG AA (>= 4.5:1).
// Dokumen hasil unduh memakai style inline, jadi tidak terpengaruh palet ini.
import defaultTheme from 'tailwindcss/defaultTheme';

const primary = {
  50: '#E8EAF6', 100: '#C5CAE9', 200: '#9FA8DA', 300: '#7986CB', 400: '#5C6BC0',
  500: '#3F51B5', 600: '#3949AB', 700: '#303F9F', 800: '#283593', 900: '#1A237E', 950: '#0D1250',
};
const success = {
  50: '#E8F5E9', 100: '#C8E6C9', 200: '#A5D6A7', 300: '#81C784', 400: '#2E7D32',
  500: '#2E7D32', 600: '#2B6F2F', 700: '#1B5E20', 800: '#174F1B', 900: '#103814', 950: '#0A2410',
};
const danger = {
  50: '#FFEBEE', 100: '#FFCDD2', 200: '#EF9A9A', 300: '#E57373', 400: '#D32F2F',
  500: '#D32F2F', 600: '#C62828', 700: '#B71C1C', 800: '#9A1515', 900: '#7F0000', 950: '#4A0000',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary,
        blue: primary, indigo: primary, sky: primary, purple: primary, violet: primary,
        cyan: primary, teal: primary, yellow: primary,
        green: success, emerald: success,
        red: danger,
      },
      // Font UI keluarga Helvetica; Arimo (metrik sama dengan Helvetica/Arial, sudah dimuat) untuk perangkat tanpa Helvetica.
      // Dokumen punya font sendiri (dipilih pengguna/template).
      fontFamily: { sans: ['"Helvetica Neue"', 'Helvetica', 'Arimo', 'Arial', ...defaultTheme.fontFamily.sans] },
    },
  },
  plugins: [],
};
