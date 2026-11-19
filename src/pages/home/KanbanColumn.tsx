import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  Receipt,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react';
import KanbanCard from './KanbanCard';
import { AppItem, KanbanGroup, ViewMode } from './types';

interface KanbanColumnProps {
  group: KanbanGroup;
  isCollapsed: boolean;
  onToggleCollapse: (key: string) => void;
  onToggleFavorite: (path: string, title: string) => void;
  onCopyLink: (path: string, title: string) => void;
  onDropAppToColumn: (columnKey: string, appPath: string) => void;
  viewMode: ViewMode;
}

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

export default function KanbanColumn({
  group,
  isCollapsed,
  onToggleCollapse,
  onToggleFavorite,
  onCopyLink,
  onDropAppToColumn,
  viewMode,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const IconComponent = iconMap[group.iconName] || FileText;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.path) {
          onDropAppToColumn(group.key, data.path);
        }
      }
    } catch {
      // Ignore invalid drag payload
    }
  };

  // ============================================================
  // Collapsed State (Board View Only)
  // ============================================================
  if (isCollapsed && viewMode === 'board') {
    return (
      <div
        onClick={() => onToggleCollapse(group.key)}
        className="group relative flex flex-col items-center justify-between w-12 min-w-12 shrink-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 p-3 py-4 shadow-xs hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-all duration-200"
        title={`Klik untuk membuka kolom ${group.title}`}
      >
        <div className={`absolute top-0 inset-x-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${group.gradient}`} />
        <div className="flex flex-col items-center gap-3">
          <div className={`p-1.5 rounded-lg ${group.badgeBg} ${group.badgeText}`}>
            <IconComponent size={16} />
          </div>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {group.apps.length}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
          <span
            className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wider whitespace-nowrap select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {group.title}
          </span>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
      </div>
    );
  }

  // ============================================================
  // Expanded State (Board View)
  // ============================================================
  if (viewMode === 'board') {
    return (
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col w-[320px] sm:w-[340px] shrink-0 rounded-2xl border transition-all duration-200 ${
          isDragOver
            ? 'border-primary-500 ring-2 ring-primary-400/40 bg-primary-50/20 dark:bg-primary-950/20'
            : 'border-gray-200/90 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 shadow-xs'
        }`}
      >
        {/* Top colored gradient stripe */}
        <div className={`h-1.5 w-full rounded-t-2xl bg-gradient-to-r ${group.gradient}`} />

        {/* Column Header */}
        <header className="flex items-center justify-between p-3.5 border-b border-gray-200/70 dark:border-gray-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${group.badgeBg} ${group.badgeText}`}>
              <IconComponent size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {group.title}
              </h2>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {group.apps.length} dokumen
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleCollapse(group.key)}
              aria-label={`Ciutkan kolom ${group.title}`}
              title="Ciutkan kolom"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        {/* Cards Stack */}
        <div className="kanban-lane-scroll flex-1 p-3 overflow-y-auto max-h-[calc(100vh-270px)] flex flex-col gap-3">
          {group.apps.length > 0 ? (
            group.apps.map((app: AppItem) => (
              <KanbanCard
                key={app.path}
                app={app}
                onToggleFavorite={onToggleFavorite}
                onCopyLink={onCopyLink}
                viewMode={viewMode}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700/80 bg-white/40 dark:bg-gray-800/20">
              {group.isFavoriteCol ? (
                <>
                  <Star size={24} className="text-amber-400 mb-2 opacity-60" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Belum ada favorit</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                    Klik ikon bintang pada kartu atau geser ke kolom ini untuk menyematkan.
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">Tidak ada dokumen yang sesuai.</p>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ============================================================
  // Grid / List View Section
  // ============================================================
  return (
    <section className="mb-8">
      <header className="flex items-center justify-between mb-3.5 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${group.badgeBg} ${group.badgeText}`}>
            <IconComponent size={18} />
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {group.title}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {group.apps.length}
          </span>
        </div>
      </header>

      {group.apps.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.apps.map((app: AppItem) => (
              <KanbanCard
                key={app.path}
                app={app}
                onToggleFavorite={onToggleFavorite}
                onCopyLink={onCopyLink}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {group.apps.map((app: AppItem) => (
              <KanbanCard
                key={app.path}
                app={app}
                onToggleFavorite={onToggleFavorite}
                onCopyLink={onCopyLink}
                viewMode={viewMode}
              />
            ))}
          </div>
        )
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-center text-xs text-gray-400">
          Tidak ada dokumen pada kategori ini.
        </div>
      )}
    </section>
  );
}
