import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { routes } from '../../router/routes';
import { useAuthUser } from '../../shared/lib/auth';
import {
  CATEGORIES_CONFIG,
  COLLAPSED_COLS_STORAGE_KEY,
  extractTags,
  FAVORITE_CATEGORY,
  FAVORITES_STORAGE_KEY,
  loadCollapsedCols,
  loadFavorites,
  saveCollapsedCols,
  saveFavorites,
  VIEW_MODE_STORAGE_KEY,
} from './helpers';
import KanbanColumn from './KanbanColumn';
import KanbanHeader from './KanbanHeader';
import QrisModal from './QrisModal';
import { AppItem, KanbanGroup, SortOption, ToastState, ViewMode } from './types';

// ============================================================
// SECTION: Kategori Baku (Kebutuhan router & CLAUDE.md)
// ============================================================
export const CATEGORIES = [
  { key: 'gaji', title: 'Gaji & Kepegawaian' },
  { key: 'invoice', title: 'Invoice & Faktur' },
  { key: 'surat', title: 'Surat Perusahaan' },
  { key: 'warga', title: 'Surat Warga, Sekolah & Desa' },
  { key: 'pribadi', title: 'Surat Pribadi & Lamaran' },
  { key: 'kesehatan', title: 'Kesehatan (Khusus Dokter)' },
  { key: 'nota', title: 'Nota & Resi' },
];

// ============================================================
// SECTION: Toast Notification
// ============================================================
function Toast({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md animate-[toastIn_250ms_ease-out] ${
        isSuccess
          ? 'border-emerald-600 bg-white/95 dark:bg-gray-800/95 text-emerald-800 dark:text-emerald-300'
          : isError
          ? 'border-red-600 bg-white/95 dark:bg-gray-800/95 text-red-800 dark:text-red-300'
          : 'border-primary-600 bg-white/95 dark:bg-gray-800/95 text-primary-800 dark:text-primary-300'
      }`}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {isSuccess ? <Check size={18} /> : isError ? <AlertCircle size={18} /> : <Info size={18} />}
      </span>
      <div className="flex-1 text-xs sm:text-sm">
        <strong className="block font-bold">
          {isSuccess ? 'Berhasil' : isError ? 'Peringatan' : 'Informasi'}
        </strong>
        <p className="mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <X size={15} aria-hidden="true" />
      </button>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

// ============================================================
// SECTION: Ambient Background
// ============================================================
function AmbientBackground() {
  return (
    <div className="bg-orbs pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary-400/10 dark:bg-primary-600/5 blur-3xl" />
      <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-purple-400/10 dark:bg-purple-600/5 blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-teal-400/10 dark:bg-teal-600/5 blur-3xl" />
    </div>
  );
}

// ============================================================
// SECTION: Home (Kanban Edition)
// ============================================================
export default function Home() {
  const [toast, setToast] = useState<ToastState>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [qrisOpen, setQrisOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode) || 'board';
    } catch {
      return 'board';
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>(() => loadCollapsedCols());

  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Sync viewMode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore
    }
  };

  // Sync collapsedCols to localStorage
  const toggleCollapseColumn = (key: string) => {
    setCollapsedCols((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedCols(next);
      return next;
    });
  };

  // Toggle Collapse All columns
  const allCollapsed = useMemo(() => {
    const keys = ['favorites', ...CATEGORIES_CONFIG.map((c) => c.key)];
    return keys.every((k) => !!collapsedCols[k]);
  }, [collapsedCols]);

  const toggleCollapseAll = () => {
    setCollapsedCols((prev) => {
      const nextState = !allCollapsed;
      const updated: Record<string, boolean> = {};
      ['favorites', ...CATEGORIES_CONFIG.map((c) => c.key)].forEach((k) => {
        updated[k] = nextState;
      });
      saveCollapsedCols(updated);
      return updated;
    });
  };

  // Handle incoming redirect toast (e.g. from logout or admin action)
  useEffect(() => {
    const msg = (location.state as { toast?: string } | null)?.toast;
    if (!msg) return;
    setToast({ type: 'success', message: msg });
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================================
  // SECTION: Data Preparation
  // ============================================================
  // Menu login: true (dokter) disembunyikan sampai user login.
  const visibleRoutes = useMemo(() => {
    return routes.filter((r) => 'title' in r && (!('login' in r) || user));
  }, [user]);

  // Map into AppItem with tags and sequence numbering
  const allAppItems = useMemo<AppItem[]>(() => {
    let count = 0;
    return visibleRoutes.map((r) => {
      const path = r.path.replace(/\/\*$/, '');
      const title = String(r.title);
      const desc = String((r as any).desc || '');
      const cat = String((r as any).cat || 'surat');
      const login = (r as any).login === true;
      const no = String(++count).padStart(2, '0');
      const tags = extractTags({ path, title, desc, login });
      const isFavorite = favorites.includes(path);

      return {
        path,
        cat,
        title,
        desc,
        no,
        login,
        tags,
        isFavorite,
      };
    });
  }, [visibleRoutes, favorites]);

  // ============================================================
  // SECTION: Favorite Management & Drag-and-Drop
  // ============================================================
  const toggleFavorite = useCallback((path: string, title: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(path);
      const next = exists ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      setToast({
        type: exists ? 'info' : 'success',
        message: exists
          ? `"${title}" dihapus dari daftar favorit.`
          : `"${title}" berhasil disematkan ke kolom Favorit!`,
      });
      return next;
    });
  }, []);

  const handleDropAppToColumn = useCallback((columnKey: string, appPath: string) => {
    if (columnKey === 'favorites') {
      setFavorites((prev) => {
        if (prev.includes(appPath)) return prev;
        const next = [...prev, appPath];
        saveFavorites(next);
        const item = allAppItems.find((a) => a.path === appPath);
        setToast({
          type: 'success',
          message: `"${item?.title || 'Dokumen'}" disematkan ke Favorit!`,
        });
        return next;
      });
    }
  }, [allAppItems]);

  const copyLink = useCallback(async (path: string, title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + path);
      setToast({
        type: 'success',
        message: `Tautan "${title}" berhasil disalin ke papan klip.`,
      });
    } catch {
      setToast({
        type: 'error',
        message: 'Gagal menyalin tautan: izin clipboard ditolak browser.',
      });
    }
  }, []);

  // Filter and sort items helper
  const processItems = useCallback((items: AppItem[]) => {
    let result = items;

    // Filter by search query
    if (searchQuery.trim()) {
      const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((item) => {
        const textToSearch = `${item.title} ${item.desc} ${item.tags.join(' ')} ${item.cat}`.toLowerCase();
        return words.every((w) => textToSearch.includes(w));
      });
    }

    // Sort
    if (sortOption === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'za') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [searchQuery, sortOption]);

  // ============================================================
  // SECTION: Build Kanban Columns
  // ============================================================
  const kanbanGroups = useMemo<KanbanGroup[]>(() => {
    const list: KanbanGroup[] = [];

    // Favorite Column (always present if user has favorites, or shown empty in board view)
    const favoriteItems = allAppItems.filter((a) => a.isFavorite);
    const processedFavs = processItems(favoriteItems);

    list.push({
      ...FAVORITE_CATEGORY,
      apps: processedFavs,
      isFavoriteCol: true,
    });

    // Standard Category Columns
    CATEGORIES_CONFIG.forEach((cat) => {
      const catItems = allAppItems.filter((a) => a.cat === cat.key);
      const processed = processItems(catItems);

      list.push({
        ...cat,
        apps: processed,
      });
    });

    // Filter down if selectedCategory is set
    if (selectedCategory !== 'all') {
      return list.filter((g) => g.key === selectedCategory);
    }

    return list;
  }, [allAppItems, processItems, selectedCategory]);

  // Total matching apps across all non-favorite categories
  const totalMatchingApps = useMemo(() => {
    const nonFavGroups = kanbanGroups.filter((g) => !g.isFavoriteCol);
    return nonFavGroups.reduce((acc, g) => acc + g.apps.length, 0);
  }, [kanbanGroups]);

  // Scroll to column when category pill is tapped in board view
  const handleSelectCategory = (catKey: string) => {
    setSelectedCategory(catKey);
    if (catKey === 'all') return;

    if (viewMode === 'board' && boardContainerRef.current) {
      const element = document.getElementById(`kanban-col-${catKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    }
  };

  return (
    <main className="relative min-h-screen bg-gray-100/90 dark:bg-gray-950 px-4 py-8 text-gray-900 dark:text-gray-100 sm:px-6 sm:py-10 transition-colors duration-200">
      <AmbientBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* Kanban Top Navigation & Controls */}
        <KanbanHeader
          totalApps={allAppItems.length}
          totalFavorites={favorites.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          onOpenQris={() => setQrisOpen(true)}
          onToggleCollapseAll={toggleCollapseAll}
          allCollapsed={allCollapsed}
        />

        {/* Empty Search Result Message */}
        {totalMatchingApps === 0 && searchQuery && (
          <div className="my-12 p-8 text-center rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 shadow-xs max-w-md mx-auto">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Tidak ada dokumen yang cocok dengan "{searchQuery}".
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Coba gunakan kata kunci lain seperti "surat", "gaji", "nota", atau "invoice".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Reset Pencarian
            </button>
          </div>
        )}

        {/* ============================================================
            SECTION: Board View (Horizontal Scrollable Lanes)
           ============================================================ */}
        {viewMode === 'board' && (
          <div
            ref={boardContainerRef}
            className="kanban-board-scroll flex items-start gap-4 overflow-x-auto pb-6 pt-1 select-none scroll-smooth"
            style={{ minHeight: 'calc(100vh - 250px)' }}
          >
            {kanbanGroups.map((group) => {
              // In board mode, if selectedCategory !== 'all', only render that or show all
              if (selectedCategory !== 'all' && group.key !== selectedCategory) {
                return null;
              }

              return (
                <div key={group.key} id={`kanban-col-${group.key}`} className="shrink-0">
                  <KanbanColumn
                    group={group}
                    isCollapsed={!!collapsedCols[group.key]}
                    onToggleCollapse={toggleCollapseColumn}
                    onToggleFavorite={toggleFavorite}
                    onCopyLink={copyLink}
                    onDropAppToColumn={handleDropAppToColumn}
                    viewMode="board"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================
            SECTION: Grid & List Views
           ============================================================ */}
        {(viewMode === 'grid' || viewMode === 'list') && (
          <div className="space-y-6 pt-2">
            {kanbanGroups.map((group) => {
              // Hide empty favorites in grid/list if no favorites
              if (group.isFavoriteCol && group.apps.length === 0) return null;

              return (
                <KanbanColumn
                  key={group.key}
                  group={group}
                  isCollapsed={false}
                  onToggleCollapse={toggleCollapseColumn}
                  onToggleFavorite={toggleFavorite}
                  onCopyLink={copyLink}
                  onDropAppToColumn={handleDropAppToColumn}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-14 pt-6 border-t border-gray-200/80 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            HK Hub Station • Platform Generator Dokumen & Cetak Cepat
          </p>
        </footer>
      </div>

      {/* QRIS Modal & Toast */}
      {qrisOpen && <QrisModal onClose={() => setQrisOpen(false)} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
