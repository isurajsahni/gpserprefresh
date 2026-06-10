import { MapPin } from 'lucide-react';

export default function Logo({ subtitle = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white shadow-sm">
        <MapPin size={20} />
      </div>
      <div className="leading-tight">
        <div className={`text-base font-extrabold ${light ? 'text-white' : 'text-gray-900'}`}>GPSFDK<span className="text-accent-500">.com</span></div>
        {subtitle && (
          <div className={`text-[10px] font-medium uppercase tracking-wide ${light ? 'text-brand-100' : 'text-gray-400'}`}>
            Enterprise Resource Planning
          </div>
        )}
      </div>
    </div>
  );
}
