import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  FileText,
  Moon,
  Printer,
  QrCode,
  Receipt,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { SortOption } from './types';

interface MaterialHeaderProps {
  totalApps: number;
  totalFavorites: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  onOpenQris: () => void;
}

const CATEGORY_CHIPS = [
  { key: 'all', label: 'Semua Dokumen', icon: SlidersHorizontal },
  { key: 'favorites', label: 'Favorit', icon: Star },
  { key: 'gaji', label: 'Gaji & Kepegawaian', icon: Briefcase },
  { key: 'invoice', label: 'Invoice & Faktur', icon: Receipt },
  { key: 'surat', label: 'Surat Perusahaan', icon: Building2 },
  { key: 'warga', label: 'Warga & Desa', icon: Users },
  { key: 'pribadi', label: 'Pribadi & Lamaran', icon: FileText },
  { key: 'nota', label: 'Nota & Resi Thermal', icon: Printer },
  { key: 'kesehatan', label: 'Kesehatan (Dokter)', icon: Stethoscope },
];

export default function MaterialHeader({
  totalApps,
  totalFavorites,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  sortOption,
  onSortOptionChange,
  onOpenQris,
}: MaterialHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ dark: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.dark === 'boolean') {
        setDark(customEvent.detail.dark);
      } else {
        setDark(document.documentElement.classList.contains('dark'));
      }
    };
    window.addEventListener('hk:theme-changed', handleThemeChange);
    return () => window.removeEventListener('hk:theme-changed', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('hk:tema', next ? 'dark' : 'light');
    } catch {
      // Ignore
    }
    window.dispatchEvent(new CustomEvent('hk:theme-changed', { detail: { dark: next } }));
  };

  // Keyboard shortcut: press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="mb-8 space-y-5">
      {/* Top App Bar (Material 3 Style) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <img
            src="/favicon.svg"
            alt="HK Hub Station"
            className="h-12 w-12 shrink-0 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 bg-slate-900 p-1.5"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">
                HK Hub Station
              </h1>
              <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-950/80 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60">
                Material Design
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Pusat generator surat resmi, slip gaji, invoice dan nota thermal praktis.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            title={dark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-amber-400 shadow-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={onOpenQris}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all"
            aria-label="Donasi QRIS: buka kode scan"
          >
            <QrCode size={16} />
            <span>Donasi QRIS</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 p-1 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-xs">
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl">
              {totalApps} Dokumen
            </span>
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl flex items-center gap-1">
              <Star size={12} fill="currentColor" /> {totalFavorites} Favorit
            </span>
          </div>
        </div>
      </div>

      {/* Material Search Bar & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Outlined Search Field */}
        <div className="relative flex-1">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari dokumen, surat, nota, invoice... (tekan /)"
            aria-label="Cari menu dokumen"
            className="w-full min-h-[44px] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-xs transition-colors focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:outline-hidden"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
              /
            </kbd>
          )}
        </div>

        {/* Sort Selection */}
        <select
          value={sortOption}
          onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
          aria-label="Urutkan dokumen"
          className="min-h-[44px] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 px-3.5 py-2 shadow-xs cursor-pointer focus:border-primary-500 focus:outline-hidden"
        >
          <option value="default">Urutan Baku</option>
          <option value="az">Nama (A - Z)</option>
          <option value="za">Nama (Z - A)</option>
        </select>
      </div>

      {/* Material Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {CATEGORY_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isActive = selectedCategory === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onSelectCategory(chip.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-primary-600 dark:text-primary-400'} />
              <span>{chip.label}</span>
              {chip.key === 'favorites' && totalFavorites > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                  {totalFavorites}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
