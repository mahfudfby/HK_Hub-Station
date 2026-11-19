import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, GripVertical, Lock, Star } from 'lucide-react';
import { AppItem } from './types';

interface KanbanCardProps {
  app: AppItem;
  onToggleFavorite: (path: string, title: string) => void;
  onCopyLink: (path: string, title: string) => void;
  isDragging?: boolean;
  viewMode?: 'board' | 'grid' | 'list';
}

const tagColors: Record<string, string> = {
  '58mm': 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
  '80mm': 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  'Thermal': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50',
  'PDF': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  'PNG': 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  'Payroll': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  'ATS': 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
  'Dokter': 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800/50',
  'Undangan': 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
  'Surat': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export default function KanbanCard({ app, onToggleFavorite, onCopyLink, viewMode = 'board' }: KanbanCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCopyLink(app.path, app.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(app.path, app.title);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ path: app.path, title: app.title }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Dense List View mode
  if (viewMode === 'list') {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 p-3 shadow-xs hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all duration-150"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0" title="Geser kartu">
            <GripVertical size={16} />
          </span>
          <span className="shrink-0 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/70 px-2 py-0.5 rounded">
            {app.no}
          </span>
          <div className="min-w-0 flex-1">
            <Link to={app.path} className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block">
              {app.title}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.desc}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {app.tags.map((tag) => (
              <span key={tag} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${tagColors[tag] || tagColors['Surat']}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={app.isFavorite ? 'Lepas sematan' : 'Sematkan ke favorit'}
            title={app.isFavorite ? 'Lepas sematan' : 'Sematkan ke favorit'}
            className={`p-1.5 rounded-lg border transition-colors ${
              app.isFavorite
                ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                : 'border-transparent text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Star size={16} fill={app.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Salin tautan ${app.title}`}
            title="Salin tautan"
            className="p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={16} />}
          </button>
          <Link
            to={app.path}
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
          >
            <span>Buka</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // Kanban Card (Board & Grid view)
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col justify-between rounded-xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-400 dark:hover:border-primary-400/80 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary-500"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 px-2 py-0.5 rounded-md">
            <span className="text-gray-400 opacity-60 cursor-grab active:cursor-grabbing hover:opacity-100" title="Geser kartu">
              <GripVertical size={12} className="inline -mt-0.5" />
            </span>
            {app.no}
          </span>
          {app.login && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60">
              <Lock size={10} /> Khusus Dokter
            </span>
          )}
          {app.tags.map((tag) => (
            <span
              key={tag}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${tagColors[tag] || tagColors['Surat']}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick action controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={app.isFavorite ? 'Hapus dari favorit' : 'Sematkan ke favorit'}
            title={app.isFavorite ? 'Disematkan di Favorit' : 'Sematkan ke Favorit'}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
              app.isFavorite
                ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-400 shadow-xs'
                : 'border-transparent text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Star size={14} fill={app.isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Salin link ${app.title}`}
            title="Salin link langsung"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Title & Body */}
      <div className="mb-3.5">
        <Link
          to={app.path}
          className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2 block"
        >
          {app.title}
        </Link>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-2">
          {app.desc}
        </p>
      </div>

      {/* Footer Action */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">
          {app.cat}
        </span>
        <Link
          to={app.path}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 hover:underline"
        >
          <span>Buka Aplikasi</span>
          <ArrowUpRight
            size={14}
            className={`transition-transform duration-200 ${isHovered ? 'translate-x-0.5 -translate-y-0.5' : ''}`}
          />
        </Link>
      </div>
    </div>
  );
}
