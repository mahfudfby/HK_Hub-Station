import React, { useEffect, useRef } from 'react';
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  Columns3,
  FileText,
  LayoutGrid,
  List,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { SortOption, ViewMode } from './types';

interface KanbanHeaderProps {
  totalApps: number;
  totalFavorites: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  onOpenQris: () => void;
  onToggleCollapseAll: () => void;
  allCollapsed: boolean;
}

const CATEGORY_TABS = [
  { key: 'all', label: 'Semua Kategori', icon: SlidersHorizontal },
  { key: 'favorites', label: 'Favorit', icon: Star },
  { key: 'gaji', label: 'Gaji', icon: Briefcase },
  { key: 'invoice', label: 'Invoice', icon: Receipt },
  { key: 'surat', label: 'Surat', icon: Building2 },
  { key: 'warga', label: 'Warga & Desa', icon: Users },
  { key: 'pribadi', label: 'Pribadi', icon: FileText },
  { key: 'nota', label: 'Nota Thermal', icon: Printer },
  { key: 'kesehatan', label: 'Dokter', icon: Stethoscope },
];

export default function KanbanHeader({
  totalApps,
  totalFavorites,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedCategory,
  onSelectCategory,
  sortOption,
  onSortOptionChange,
  onOpenQris,
  onToggleCollapseAll,
  allCollapsed,
}: KanbanHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    <header className="mb-6 space-y-4">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <img
            src="/favicon.svg"
            alt="HK Hub Station"
            className="h-11 w-11 shrink-0 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 bg-slate-900 p-1"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">
                HK Hub Station
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-950/80 px-2.5 py-0.5 text-[11px] font-bold text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60">
                Kanban Board
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Pusat pembuatan dokumen resmi, slip gaji, invoice dan nota thermal praktis.
            </p>
          </div>
        </div>

        {/* Right Action: QRIS Support + Stats */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenQris}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all"
            aria-label="Buka Scan QRIS"
          >
            <QrCode size={15} />
            <span>Donasi QRIS</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 p-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
              {totalApps} Dokumen
            </span>
            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg flex items-center gap-1">
              <Star size={12} fill="currentColor" /> {totalFavorites} Favorit
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search + View Switcher + Sort */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
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
            className="w-full min-h-[42px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/90 py-2 pl-10 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-xs focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 dark:text-gray-500">
              /
            </kbd>
          )}
        </div>

        {/* View Mode & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/90 p-1 shadow-xs">
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              aria-pressed={viewMode === 'board'}
              title="Tampilan Papan Kanban (Kolom Samping)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'board'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Columns3 size={15} />
              <span className="hidden sm:inline">Papan</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              title="Tampilan Grid Kartu"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              title="Tampilan Daftar Ringkas"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List size={15} />
              <span className="hidden sm:inline">Daftar</span>
            </button>
          </div>

          {/* Sort Selection */}
          <select
            value={sortOption}
            onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
            aria-label="Urutkan dokumen"
            className="min-h-[38px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 px-3 py-1.5 shadow-xs cursor-pointer focus:border-primary-500"
          >
            <option value="default">Urutan Baku</option>
            <option value="az">Nama (A - Z)</option>
            <option value="za">Nama (Z - A)</option>
          </select>

          {/* Toggle All Columns Collapse (Board mode only) */}
          {viewMode === 'board' && (
            <button
              type="button"
              onClick={onToggleCollapseAll}
              aria-label={allCollapsed ? 'Buka semua kolom' : 'Ciutkan semua kolom'}
              title={allCollapsed ? 'Buka semua kolom' : 'Ciutkan semua kolom'}
              className="flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-xs transition-colors"
            >
              <RotateCcw size={13} className={allCollapsed ? 'rotate-180' : ''} />
              <span className="hidden md:inline">{allCollapsed ? 'Buka Kolom' : 'Ciutkan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectCategory(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-white' : 'text-primary-500'} />
              <span>{tab.label}</span>
              {tab.key === 'favorites' && totalFavorites > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
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
