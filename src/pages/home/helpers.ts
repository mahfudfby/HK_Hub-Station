import { CategoryDef } from './types';

export const FAVORITES_STORAGE_KEY = 'hk:kanban_favorites';
export const VIEW_MODE_STORAGE_KEY = 'hk:kanban_view_mode';
export const COLLAPSED_COLS_STORAGE_KEY = 'hk:kanban_collapsed_cols';

export const CATEGORIES_CONFIG: CategoryDef[] = [
  {
    key: 'gaji',
    title: 'Gaji & Kepegawaian',
    iconName: 'briefcase',
    gradient: 'from-indigo-500 via-indigo-600 to-blue-600',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/50',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-400 dark:border-indigo-500/40',
    accentBg: 'bg-indigo-50/60 dark:bg-indigo-950/20',
  },
  {
    key: 'invoice',
    title: 'Invoice & Faktur',
    iconName: 'receipt',
    gradient: 'from-emerald-500 via-teal-600 to-teal-700',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-400 dark:border-emerald-500/40',
    accentBg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
  },
  {
    key: 'surat',
    title: 'Surat Perusahaan',
    iconName: 'building',
    gradient: 'from-blue-500 via-blue-600 to-sky-600',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-400 dark:border-blue-500/40',
    accentBg: 'bg-blue-50/60 dark:bg-blue-950/20',
  },
  {
    key: 'warga',
    title: 'Surat Warga & Desa',
    iconName: 'users',
    gradient: 'from-purple-500 via-purple-600 to-indigo-600',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/50',
    badgeText: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-400 dark:border-purple-500/40',
    accentBg: 'bg-purple-50/60 dark:bg-purple-950/20',
  },
  {
    key: 'pribadi',
    title: 'Surat Pribadi & Lamaran',
    iconName: 'fileText',
    gradient: 'from-rose-500 via-rose-600 to-pink-600',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    badgeText: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-400 dark:border-rose-500/40',
    accentBg: 'bg-rose-50/60 dark:bg-rose-950/20',
  },
  {
    key: 'nota',
    title: 'Nota & Resi Thermal',
    iconName: 'printer',
    gradient: 'from-amber-500 via-orange-500 to-orange-600',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-400 dark:border-amber-500/40',
    accentBg: 'bg-amber-50/60 dark:bg-amber-950/20',
  },
  {
    key: 'kesehatan',
    title: 'Kesehatan (Khusus Dokter)',
    iconName: 'stethoscope',
    gradient: 'from-red-500 via-red-600 to-rose-700',
    badgeBg: 'bg-red-100 dark:bg-red-900/50',
    badgeText: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-400 dark:border-red-500/40',
    accentBg: 'bg-red-50/60 dark:bg-red-950/20',
  },
];

export const FAVORITE_CATEGORY: CategoryDef = {
  key: 'favorites',
  title: 'Disematkan (Favorit)',
  iconName: 'star',
  gradient: 'from-amber-400 via-yellow-500 to-amber-600',
  badgeBg: 'bg-amber-100 dark:bg-yellow-900/50',
  badgeText: 'text-amber-800 dark:text-yellow-300',
  borderColor: 'border-yellow-400 dark:border-yellow-500/40',
  accentBg: 'bg-amber-50/70 dark:bg-yellow-950/20',
};

export function extractTags(app: { path: string; title: string; desc: string; login?: boolean }): string[] {
  const tags: string[] = [];
  const text = (app.title + ' ' + app.desc + ' ' + app.path).toLowerCase();

  if (app.login) tags.push('Dokter');
  if (text.includes('58mm')) tags.push('58mm');
  else if (text.includes('80mm')) tags.push('80mm');
  else if (text.includes('thermal') || text.includes('nota') || text.includes('struk') || text.includes('resi') || text.includes('spbu')) tags.push('Thermal');

  if (text.includes('pdf')) tags.push('PDF');
  if (text.includes('png') || text.includes('rawbt')) tags.push('PNG');
  if (text.includes('bpjs') || text.includes('pph 21') || text.includes('gaji')) tags.push('Payroll');
  if (text.includes('ats')) tags.push('ATS');
  if (text.includes('undangan')) tags.push('Undangan');

  if (tags.length === 0) {
    tags.push('Surat');
  }

  return tags.slice(0, 3);
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // Ignore storage issues in private mode
  }
}

export function loadCollapsedCols(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_COLS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCollapsedCols(collapsed: Record<string, boolean>) {
  try {
    localStorage.setItem(COLLAPSED_COLS_STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    // Ignore storage issues in private mode
  }
}
