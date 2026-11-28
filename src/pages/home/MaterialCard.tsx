import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Lock, Star } from 'lucide-react';
import { AppItem } from './types';

interface MaterialCardProps {
  app: AppItem;
  onToggleFavorite: (path: string, title: string) => void;
  onCopyLink: (path: string, title: string) => void;
}

const tagStyles: Record<string, string> = {
  '58mm': 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/80 dark:border-orange-900/40',
  '80mm': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40',
  'Thermal': 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-900/40',
  'PDF': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/40',
  'PNG': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/40',
  'Payroll': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/40',
  'ATS': 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/80 dark:border-teal-900/40',
  'Dokter': 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200/80 dark:border-red-900/40',
  'Undangan': 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/40',
  'Surat': 'bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export default function MaterialCard({ app, onToggleFavorite, onCopyLink }: MaterialCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    navigate(app.path);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/90 p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md cursor-pointer"
    >
      {/* Top Meta Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300">
              #{app.no}
            </span>
            {app.login && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                <Lock size={11} /> Dokter
              </span>
            )}
            {app.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${tagStyles[tag] || tagStyles['Surat']}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleFavorite}
              aria-label={app.isFavorite ? 'Lepas favorit' : 'Sematkan ke favorit'}
              title={app.isFavorite ? 'Disematkan di Favorit' : 'Sematkan ke Favorit'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                app.isFavorite
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                  : 'text-gray-500 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-700/80'
              }`}
            >
              <Star size={15} fill={app.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Salin tautan ${app.title}`}
              title="Salin tautan"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
            >
              {copied ? <Check size={15} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <Link
          to={app.path}
          className="block font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors tracking-tight line-clamp-2"
        >
          {app.title}
        </Link>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {app.desc}
        </p>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 capitalize">
          {app.cat}
        </span>
        <Link
          to={app.path}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 hover:underline"
        >
          <span>Buka Dokumen</span>
          <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}
