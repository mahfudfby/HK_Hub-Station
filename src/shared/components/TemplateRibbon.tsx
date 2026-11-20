import { Palette } from 'lucide-react';

export default function TemplateRibbon({ label = 'GANTI TEMPLATE' }: { label?: string }) {
  return (
    <div className="my-2 flex items-center">
      <div className="relative inline-flex items-center drop-shadow-sm">
        {/* Badan Pita */}
        <div className="relative z-10 flex items-center gap-2 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white px-4 py-2 font-black text-sm sm:text-base tracking-wider uppercase shadow-md rounded-l-md border-l-4 border-amber-400">
          <Palette size={18} className="text-amber-300 shrink-0" aria-hidden="true" />
          <span className="font-extrabold tracking-wide drop-shadow-xs">{label}</span>
        </div>
        {/* Ujung Lipatan / Notch Pita */}
        <div
          className="w-0 h-0 border-y-[19px] border-y-transparent border-l-[14px] border-l-blue-600 -ml-[1px]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
