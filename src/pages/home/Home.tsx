import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  FileText,
  Info,
  Printer,
  Receipt,
  Star,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { routes } from '../../router/routes';
import { useAuthUser } from '../../shared/lib/auth';
import {
  CATEGORIES_CONFIG,
  extractTags,
  FAVORITE_CATEGORY,
  loadFavorites,
  saveFavorites,
} from './helpers';
import MaterialCard from './MaterialCard';
import MaterialHeader from './MaterialHeader';
import QrisModal from './QrisModal';
import { AppItem, KanbanGroup, SortOption, ToastState } from './types';

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

const iconMap = {
  star: Star,
  briefcase: Briefcase,
  receipt: Receipt,
  building: Building2,
  users: Users,
  fileText: FileText,
  printer: Printer,
  stethoscope: Stethoscope,
};

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
// SECTION: Home (Material Design Edition)
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
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  // Handle incoming redirect toast
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

  // Filter visible routes
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

  // Favorite toggle
  const toggleFavorite = useCallback((path: string, title: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(path);
      const next = exists ? prev.filter((p) => p !== path) : [...prev, path];
      saveFavorites(next);
      setToast({
        type: exists ? 'info' : 'success',
        message: exists
          ? `"${title}" dihapus dari daftar favorit.`
          : `"${title}" berhasil disematkan ke Favorit!`,
      });
      return next;
    });
  }, []);

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

  // Build Category Groups
  const categoryGroups = useMemo<KanbanGroup[]>(() => {
    const list: KanbanGroup[] = [];

    // Favorite Group (if any favorite items)
    const favoriteItems = allAppItems.filter((a) => a.isFavorite);
    const processedFavs = processItems(favoriteItems);

    if (processedFavs.length > 0 || selectedCategory === 'favorites') {
      list.push({
        ...FAVORITE_CATEGORY,
        apps: processedFavs,
        isFavoriteCol: true,
      });
    }

    // Standard Category Groups
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

    // Otherwise show groups that have matching apps
    return list.filter((g) => g.apps.length > 0);
  }, [allAppItems, processItems, selectedCategory]);

  const totalMatchingApps = useMemo(() => {
    const nonFavGroups = categoryGroups.filter((g) => !g.isFavoriteCol);
    return nonFavGroups.reduce((acc, g) => acc + g.apps.length, 0);
  }, [categoryGroups]);

  return (
    <main className="relative min-h-screen bg-gray-50/70 dark:bg-gray-950 px-4 py-8 text-gray-900 dark:text-gray-100 sm:px-6 sm:py-12 transition-colors duration-200">
      <AmbientBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        {/* Material Header */}
        <MaterialHeader
          totalApps={allAppItems.length}
          totalFavorites={favorites.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          onOpenQris={() => setQrisOpen(true)}
        />

        {/* Empty Result Notification */}
        {totalMatchingApps === 0 && (
          <div className="my-12 p-8 text-center rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 shadow-xs max-w-md mx-auto">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Tidak ada dokumen yang ditemukan.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}".`
                : 'Belum ada dokumen pada kategori ini.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        )}

        {/* Material Sections & Grid of Cards */}
        <div className="space-y-10">
          {categoryGroups.map((group) => {
            const Icon = iconMap[group.iconName] || FileText;

            return (
              <section key={group.key} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${group.badgeBg} ${group.badgeText}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight">
                        {group.title}
                      </h2>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
                    {group.apps.length}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.apps.map((app) => (
                    <MaterialCard
                      key={app.path}
                      app={app}
                      onToggleFavorite={toggleFavorite}
                      onCopyLink={copyLink}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
          HK Hub Station • Platform Generator Dokumen & Cetak Cepat
        </footer>
      </div>

      {/* QRIS Modal & Toast */}
      {qrisOpen && <QrisModal onClose={() => setQrisOpen(false)} />}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
