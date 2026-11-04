import { createElement, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import {
  Plus,
  Trash2,
  RotateCcw,
  LayoutGrid,
  Rows3,
  X,
  Sparkles,
  CheckCircle2,
  Footprints,
  Scale,
  Moon,
  Heart,
  Activity,
  Flame,
  Utensils,
  Dumbbell,
  HeartPulse,
  Code,
} from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_TYPES } from '../widgets/registry';
import {
  loadInstances,
  saveInstances,
  createInstanceId,
  getDefaultInstances,
  type WidgetInstance,
} from '../widgets/store';
import { useWidgetData } from '../context/WidgetDataContext';
import { TodayHero } from './fitbit/TodayHero';
import { KeyMetricsGrid } from './fitbit/KeyMetricsGrid';
import { ActivityTrackedCard } from './fitbit/ActivityTrackedCard';
import { CoachWelcomeCard } from './fitbit/CoachWelcomeCard';
import { type GoogleHealthTab } from './Layout';
import { CardContext } from './Card';

const LAYOUT_KEY = 'dashboard_layout_v8';
const VIEW_MODE_KEY = 'dashboard_view_mode_v2';

function loadLayouts(): ResponsiveLayouts {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveLayouts(layouts: ResponsiveLayouts) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layouts));
}

function defaultLayoutForInstance(instance: WidgetInstance, index: number, cols: number): LayoutItem {
  const def = WIDGET_REGISTRY[instance.type];
  if (!def) return { i: instance.id, x: 0, y: index * 6, w: 4, h: 6, minW: 3, minH: 4 };
  const perRow = Math.max(1, Math.floor(cols / def.defaultW));
  return {
    i: instance.id,
    x: (index % perRow) * def.defaultW,
    y: Math.floor(index / perRow) * def.defaultH,
    w: def.defaultW,
    h: def.defaultH,
    minW: def.minW,
    minH: def.minH,
  };
}

function ensureLayoutsForInstances(layouts: ResponsiveLayouts, instances: WidgetInstance[]): ResponsiveLayouts {
  const breakpoints: Record<string, number> = { lg: 12, md: 10, sm: 6 };
  const result: Record<string, LayoutItem[]> = {};

  for (const [bp, cols] of Object.entries(breakpoints)) {
    const existing: readonly LayoutItem[] = layouts[bp] || [];
    const existingIds = new Set(existing.map((l: LayoutItem) => l.i));
    const newItems = instances
      .filter((inst) => !existingIds.has(inst.id))
      .map((inst, idx) => defaultLayoutForInstance(inst, existing.length + idx, cols));
    const kept = existing
      .filter((l: LayoutItem) => instances.some((inst) => inst.id === l.i))
      .map((l: LayoutItem) => {
        const inst = instances.find((i) => i.id === l.i);
        const def = inst ? WIDGET_REGISTRY[inst.type] : null;
        const targetH = def?.defaultH ? Math.max(def.defaultH, l.h) : Math.max(l.h, 6);
        const minH = def?.minH || 4;
        return {
          ...l,
          h: targetH,
          minH: Math.max(l.minH || minH, minH),
        };
      });
    result[bp] = [...kept, ...newItems];
  }

  return result as ResponsiveLayouts;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  activity: <Footprints className="w-4 h-4 text-orange-500" />,
  weight: <Scale className="w-4 h-4 text-teal-500" />,
  sleep: <Moon className="w-4 h-4 text-indigo-500" />,
  'resting-hr': <Heart className="w-4 h-4 text-rose-500" />,
  'daily-hr': <HeartPulse className="w-4 h-4 text-red-500" />,
  readiness: <Sparkles className="w-4 h-4 text-emerald-500" />,
  hrv: <Activity className="w-4 h-4 text-purple-500" />,
  cardio: <Flame className="w-4 h-4 text-amber-500" />,
  'heart-zones': <Heart className="w-4 h-4 text-pink-500" />,
  exercise: <Dumbbell className="w-4 h-4 text-violet-500" />,
  nutrition: <Utensils className="w-4 h-4 text-amber-500" />,
  debug: <Code className="w-4 h-4 text-slate-500" />,
};

function AddWidgetModal({
  onAdd,
  onClose,
  instances,
  dataStatus,
}: {
  onAdd: (type: string) => void;
  onClose: () => void;
  instances: WidgetInstance[];
  dataStatus: Record<string, boolean | undefined>;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const typeCounts: Record<string, number> = {};
  for (const inst of instances) {
    typeCounts[inst.type] = (typeCounts[inst.type] || 0) + 1;
  }

  const filteredTypes = WIDGET_TYPES.filter((type) => {
    if (selectedCat === 'all') return true;
    return WIDGET_REGISTRY[type]?.category === selectedCat;
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="glass-card bg-white dark:bg-[#181E24] border border-slate-200/80 dark:border-white/[0.08] rounded-[32px] p-6 md:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Add Health Widget</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select cards to display on your personal dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Cards' },
            { id: 'activity', label: 'Activity' },
            { id: 'heart', label: 'Heart & Cardio' },
            { id: 'body', label: 'Body & Nutrition' },
            { id: 'sleep', label: 'Sleep' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCat === cat.id
                  ? 'bg-[#00B0B9] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredTypes.map((type) => {
            const def = WIDGET_REGISTRY[type];
            const count = typeCounts[type] || 0;
            const hasData = dataStatus[type];

            return (
              <button
                key={type}
                onClick={() => { onAdd(type); onClose(); }}
                className="text-left bg-slate-50 dark:bg-slate-800/40 hover:bg-teal-50/50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 hover:border-[#00B0B9]/40 dark:hover:border-[#00B0B9]/40 rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700/60 shadow-xs flex items-center justify-center">
                        {CATEGORY_ICONS[type] || <Sparkles className="w-4 h-4 text-teal-500" />}
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#00B0B9] transition-colors">{def.name}</p>
                    </div>
                    {count > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-[#00B0B9] border border-teal-500/20 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : hasData === true ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Data
                      </span>
                    ) : hasData === false ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-500 font-medium">
                        No data
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{def.description}</p>
                </div>
                {count > 0 ? (
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-2 font-semibold">Active on dashboard • Click to bring to top</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Click to add to dashboard</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DashboardGrid({ activeTab = 'today' }: { activeTab?: GoogleHealthTab }) {
  const { dataStatus } = useWidgetData();
  const [instances, setInstances] = useState<WidgetInstance[]>(loadInstances);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    const stored = loadLayouts();
    return ensureLayoutsForInstances(stored, loadInstances());
  });
  const [filterMode, setFilterMode] = useState<'focus' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === 'feed' || stored === 'grid') return stored;
      return 'grid';
    } catch {
      return 'grid';
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1280 });

  useEffect(() => {
    // Deduplicate instances by type and persist
    const seen = new Set<string>();
    const unique = instances.filter((inst) => {
      if (seen.has(inst.type)) return false;
      seen.add(inst.type);
      return true;
    });
    if (unique.length !== instances.length) {
      setInstances(unique);
      return;
    }
    saveInstances(instances);
  }, [instances]);

  useEffect(() => {
    saveLayouts(layouts);
  }, [layouts]);

  function switchViewMode(mode: 'feed' | 'grid') {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  const addWidget = useCallback((type: string) => {
    let nextInstances: WidgetInstance[] = [];
    setInstances((prev) => {
      // Find any existing card of this type
      const existing = prev.find((inst) => inst.type === type);
      // Remove all instances of this type to guarantee zero duplication
      const remaining = prev.filter((inst) => inst.type !== type);
      const cardToPlace = existing || { id: createInstanceId(type), type };
      nextInstances = [cardToPlace, ...remaining];
      return nextInstances;
    });

    setLayouts((layoutsPrev) => {
      const targetInst = nextInstances.length > 0 ? nextInstances : instances;
      return ensureLayoutsForInstances(layoutsPrev, targetInst);
    });

    setFilterMode('all');
  }, [instances]);

  const removeWidget = useCallback((id: string) => {
    setInstances((prev) => prev.filter((inst) => inst.id !== id));
    setLayouts((prev) => {
      const next: Record<string, LayoutItem[]> = {};
      for (const [bp, bpItems] of Object.entries(prev)) {
        next[bp] = [...(bpItems || [])].filter((l: LayoutItem) => l.i !== id);
      }
      return next as ResponsiveLayouts;
    });
  }, []);

  const clearEmptyWidgets = useCallback(() => {
    setInstances((prev) => {
      const remaining = prev.filter((inst) => dataStatus[inst.type] !== false);
      setLayouts((layoutsPrev) => ensureLayoutsForInstances(layoutsPrev, remaining));
      return remaining;
    });
  }, [dataStatus]);

  const emptyCount = instances.filter((inst) => dataStatus[inst.type] === false).length;

  function resetAll() {
    const defaults = getDefaultInstances();
    setInstances(defaults);
    localStorage.removeItem(LAYOUT_KEY);
    setLayouts(ensureLayoutsForInstances({}, defaults));
  }

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleFeedDragStart = useCallback((e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, .recharts-wrapper, [role="button"]')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  }, []);

  const handleFeedDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId((prev) => (prev === targetId ? prev : targetId));
  }, []);

  const handleFeedDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setInstances((prev) => {
      const fromIdx = prev.findIndex((i) => i.id === sourceId);
      const toIdx = prev.findIndex((i) => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId]);

  const handleFeedDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const tabFilterSets: Record<GoogleHealthTab, string[]> = {
    today: [
      'weight',
      'activity',
      'readiness',
      'sleep',
      'daily-hr',
      'resting-hr',
      'cardio',
      'heart-zones',
      'exercise',
      'nutrition',
      'hrv',
      'debug',
    ],
    fitness: ['exercise', 'cardio', 'heart-zones', 'activity', 'daily-hr'],
    sleep: ['sleep', 'readiness', 'hrv', 'resting-hr'],
    health: ['weight', 'resting-hr', 'hrv', 'nutrition', 'debug'],
  };

  const visibleInstances = instances.filter((inst) => {
    if (activeTab === 'today') return true;
    if (filterMode === 'all') return true;
    const allowed = tabFilterSets[activeTab];
    return allowed ? allowed.includes(inst.type) : true;
  });

  // Strict deduplication by widget type so each card appears exactly once
  const seenTypes = new Set<string>();
  const uniqueVisibleInstances = visibleInstances.filter((inst) => {
    if (seenTypes.has(inst.type)) return false;
    seenTypes.add(inst.type);
    return true;
  });

  return (
    <div>
      {/* Top Section based on Active Tab */}
      {activeTab === 'today' && (
        <>
          <TodayHero />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <ActivityTrackedCard />
            <CoachWelcomeCard />
          </div>
        </>
      )}

      {activeTab === 'fitness' && (
        <div className="rounded-[28px] bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-500/20 p-6 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#00B0B9] text-white flex items-center justify-center shadow-md">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Fitness & Training</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Workout telemetry, cardio zones, and aerobic capacity
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sleep' && (
        <div className="rounded-[28px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 p-6 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Sleep & Recovery</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Circadian rhythm, sleep stages, and autonomic restorative rest
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <KeyMetricsGrid />
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Tab Title and Focus Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {activeTab === 'today' && "Today's Metrics"}
              {activeTab === 'fitness' && 'Fitness Logs & Zones'}
              {activeTab === 'sleep' && 'Sleep Architecture'}
              {activeTab === 'health' && 'Biometric Trends'}
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] font-bold text-slate-600 dark:text-slate-300">
              {uniqueVisibleInstances.length} cards
            </span>
          </div>

          {activeTab !== 'today' && (
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] p-0.5 rounded-2xl text-xs">
              <button
                onClick={() => setFilterMode('focus')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'focus'
                    ? 'bg-white dark:bg-slate-800 text-[#00B0B9] dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Focus ({tabFilterSets[activeTab]?.length || 5})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-800 text-[#00B0B9] dark:text-teal-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Cards ({instances.length})
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {emptyCount > 0 && (
            <button
              onClick={clearEmptyWidgets}
              className="text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-950/80 border border-amber-200 dark:border-amber-800/60 px-3.5 py-1.5 rounded-2xl transition-colors cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-xs"
              title="Remove all widgets that currently have no data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear empty ({emptyCount})</span>
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] p-0.5 rounded-2xl text-xs">
            <button
              onClick={() => switchViewMode('feed')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'feed'
                  ? 'bg-[#00B0B9] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Modern Feed view"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Feed</span>
            </button>
            <button
              onClick={() => switchViewMode('grid')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-[#00B0B9] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Custom Draggable Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#00B0B9] hover:bg-[#00969E] text-white px-4 py-1.5 rounded-2xl transition-all cursor-pointer font-bold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1.5 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Add card</span>
          </button>

          <button
            onClick={resetAll}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 p-2 rounded-2xl transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Reset layout to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid or Feed Content */}
      {viewMode === 'feed' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {uniqueVisibleInstances.map((inst) => {
            const def = WIDGET_REGISTRY[inst.type];
            if (!def) return null;
            const isWide = def.defaultW >= 8;
            const isDragging = draggedId === inst.id;
            const isOver = dragOverId === inst.id && !isDragging;
            return (
              <div
                key={inst.id}
                draggable
                onDragStart={(e) => handleFeedDragStart(e, inst.id)}
                onDragOver={(e) => handleFeedDragOver(e, inst.id)}
                onDrop={(e) => handleFeedDrop(e, inst.id)}
                onDragEnd={handleFeedDragEnd}
                className={`relative transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  isWide ? 'md:col-span-2 lg:col-span-2' : ''
                } ${isDragging ? 'opacity-35 scale-[0.98]' : ''} ${
                  isOver ? 'ring-2 ring-[#00B0B9] ring-offset-4 ring-offset-slate-100 dark:ring-offset-[#0B0F12] rounded-[28px]' : ''
                }`}
              >
                <CardContext.Provider value={{ onRemove: () => removeWidget(inst.id) }}>
                  {createElement(def.component)}
                </CardContext.Provider>
              </div>
            );
          })}
        </div>
      ) : (
        <div ref={containerRef}>
          {mounted && (
            <ResponsiveGridLayout
              width={width}
              layouts={layouts}
              breakpoints={{ lg: 1024, md: 768, sm: 0 }}
              cols={{ lg: 12, md: 10, sm: 6 }}
              rowHeight={64}
              margin={[24, 24]}
              containerPadding={[0, 0]}
              dragConfig={{
                enabled: true,
                bounded: false,
                cancel: 'button,input,select,textarea,a,.recharts-wrapper,.react-resizable-handle,.widget-remove-btn,[role="button"]',
                threshold: 3,
              }}
              resizeConfig={{ enabled: true, handles: ['se'] }}
              onLayoutChange={(_: Layout, allLayouts: ResponsiveLayouts) => setLayouts(allLayouts)}
            >
              {uniqueVisibleInstances.map((inst) => {
                const def = WIDGET_REGISTRY[inst.type];
                if (!def) return <div key={inst.id} />;
                return (
                  <div key={inst.id} className="relative overflow-hidden cursor-grab active:cursor-grabbing">
                    <CardContext.Provider value={{ onRemove: () => removeWidget(inst.id) }}>
                      {createElement(def.component)}
                    </CardContext.Provider>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          )}
        </div>
      )}

      {showAddModal && (
        <AddWidgetModal
          instances={instances}
          dataStatus={dataStatus}
          onAdd={addWidget}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
