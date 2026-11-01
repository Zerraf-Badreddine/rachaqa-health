import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, AlertCircle, Inbox, GripHorizontal } from 'lucide-react';

export const CardContext = createContext<{ onRemove?: () => void }>({});

interface CardProps {
  title: string;
  subtitle?: string;
  category?: string;
  accentColor?: string;
  icon?: ReactNode;
  iconBg?: string;
  badge?: ReactNode;
  headerActions?: ReactNode;
  expandedContent?: ReactNode;
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}

export function Card({
  title,
  subtitle,
  category,
  accentColor: _accentColor,
  icon,
  iconBg = 'bg-teal-500/10 text-[#00B0B9]',
  badge,
  headerActions,
  expandedContent,
  onRemove,
  children,
  className = '',
}: CardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardCtx = useContext(CardContext);
  const handleRemove = onRemove || cardCtx.onRemove;

  useEffect(() => {
    if (!isExpanded) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <>
      <div
        className={`glass-card group relative overflow-hidden bg-white dark:bg-[#181E24] border border-slate-200/80 dark:border-white/[0.08] rounded-[28px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_28px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col justify-between h-full select-none ${className}`}
      >
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="fitbit-card-handle flex items-center gap-3 min-w-0 flex-1 cursor-grab active:cursor-grabbing group/handle">
            {icon && (
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover/handle:scale-105 ${iconBg}`}>
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {category && (
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                  {category}
                </span>
              )}
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                  {title}
                </h3>
                {badge}
                <GripHorizontal className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover/handle:opacity-100 transition-opacity ml-auto mr-1" />
              </div>
              {subtitle && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {headerActions}
            <button
              onClick={() => setIsExpanded(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {handleRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="widget-remove-btn w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                title="Remove card"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col text-slate-800 dark:text-slate-200">
          {children}
        </div>
      </div>

      {isExpanded && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="glass-card bg-white dark:bg-[#181E24] border border-slate-200/80 dark:border-white/[0.08] rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl flex flex-col text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {icon}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
                    {badge}
                  </div>
                  {subtitle && (
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-[350px]">
              {expandedContent || children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function LoadingCard({ title }: { title: string }) {
  return (
    <Card title={title}>
      <div className="flex flex-col gap-3 py-6 animate-pulse">
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
        <div className="h-24 w-full bg-slate-100/70 dark:bg-slate-800/40 rounded-2xl mt-2" />
      </div>
    </Card>
  );
}

export function ErrorCard({ title, error }: { title: string; error: string }) {
  return (
    <Card title={title}>
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 my-auto flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-rose-700 dark:text-rose-300 text-xs leading-relaxed font-medium">
          {error}
        </p>
      </div>
    </Card>
  );
}

export function EmptyCard({ title, message = 'No data recorded for this time frame' }: { title: string; message?: string }) {
  return (
    <Card title={title}>
      <div className="flex flex-col items-center justify-center py-8 text-center my-auto px-4">
        <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 shadow-xs">
          <Inbox className="w-6 h-6 stroke-[1.5]" />
        </div>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          No records found
        </p>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 max-w-[240px] mt-1 leading-relaxed">
          {message}
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.06]">
          <span>Sync tracker or log in Fitbit</span>
        </div>
      </div>
    </Card>
  );
}
