import type { ReactNode } from 'react';

interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
}

interface DashboardTooltipProps {
  active?: boolean;
  title?: string | number;
  subtitle?: string | number;
  items?: TooltipItem[];
  children?: ReactNode;
}

export function DashboardTooltip({
  active,
  title,
  subtitle,
  items,
  children,
}: DashboardTooltipProps) {
  if (!active) return null;

  return (
    <div className="bg-slate-900/95 dark:bg-[#0C1017]/95 backdrop-blur-xl border border-white/10 dark:border-white/[0.12] rounded-2xl p-3 shadow-2xl text-white text-xs min-w-[130px] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-100">
      {title && (
        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10">
          <span className="font-bold text-slate-200">{title}</span>
          {subtitle && (
            <span className="text-[10px] font-semibold text-slate-400">{subtitle}</span>
          )}
        </div>
      )}
      {children}
      {items && items.length > 0 && (
        <div className="space-y-1 mt-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {item.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-slate-300 font-medium">{item.label}</span>
              </div>
              <span className="font-mono font-bold text-white tabular-nums">
                {item.value}
                {item.unit && (
                  <span className="text-[10px] font-normal text-slate-400 ml-0.5">{item.unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
