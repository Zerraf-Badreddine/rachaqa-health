import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Footprints, Target, Flame, Route } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getStepsDaily, getCaloriesDaily } from '../api/activity';
import type { CaloriesRollupDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { useDateRange } from '../context/DateRangeContext';
import { DashboardTooltip } from './common/DashboardTooltip';

interface DayData {
  date: string;
  steps: number;
  timestamp: number;
}

interface StepsGoals {
  daily: number;
  weekly: number;
}

const GOALS_KEY = 'steps_goals';
const DEFAULT_GOALS: StepsGoals = { daily: 10000, weekly: 70000 };

function kcalValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (value && typeof value === 'object') {
    const parsedValue = (value as { parsedValue?: unknown }).parsedValue;
    if (typeof parsedValue === 'number') return parsedValue;
    const source = (value as { source?: unknown }).source;
    if (typeof source === 'string') return Number(source) || 0;
  }
  return 0;
}

function loadGoals(): StepsGoals {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_GOALS;
}

function saveGoals(goals: StepsGoals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function ActivityCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [stepsData, setStepsData] = useState<DayData[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [goals, setGoals] = useState<StepsGoals>(loadGoals);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getStepsDaily(accessToken, daysBack),
      getCaloriesDaily(accessToken, Math.min(daysBack, 14)),
    ])
      .then(([stepsRes, calRes]) => {
        if (stepsRes.status === 'fulfilled') {
          const map = new Map<string, { steps: number; timestamp: number }>();
          for (const d of stepsRes.value) {
            let label = '?';
            let timestamp = 0;
            if (d.civilStartTime?.date) {
              const { month, day, year } = d.civilStartTime.date;
              label = `${month}/${day}`;
              timestamp = new Date(year, month - 1, day).getTime();
            } else if (d.startTime) {
              const dt = new Date(d.startTime);
              label = `${dt.getMonth() + 1}/${dt.getDate()}`;
              timestamp = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
            }
            const count = parseInt(d.steps?.countSum || (d.steps as any)?.stepsCountSum || '0', 10);
            if (map.has(label)) {
              const existing = map.get(label)!;
              existing.steps += count;
              if (timestamp > existing.timestamp) existing.timestamp = timestamp;
            } else {
              map.set(label, { steps: count, timestamp });
            }
          }

          const points = Array.from(map.entries())
            .map(([date, val]) => ({ date, steps: val.steps, timestamp: val.timestamp }))
            .sort((a, b) => a.timestamp - b.timestamp);

          setStepsData(points);
        } else {
          setError(stepsRes.reason?.message || 'Steps unavailable');
        }

        if (calRes.status === 'fulfilled') {
          let sum = 0;
          for (const d of calRes.value as CaloriesRollupDataPoint[]) {
            sum += kcalValue(d.basalEnergyBurned?.kcalSum) || kcalValue(d.calories?.kcalSum);
          }
          setTotalCalories(Math.round(sum));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  function updateGoal(key: keyof StepsGoals, val: number) {
    const updated = { ...goals, [key]: val };
    setGoals(updated);
    saveGoals(updated);
  }

  if (loading) return <LoadingCard title="Steps & Activity" />;
  if (error) return <ErrorCard title="Steps & Activity" error={error} />;
  if (stepsData.length === 0) return <EmptyCard title="Steps & Activity" />;

  const todayData = stepsData[stepsData.length - 1];
  const todaySteps = todayData ? todayData.steps : 0;
  const avgSteps = Math.round(stepsData.reduce((s, d) => s + d.steps, 0) / stepsData.length);
  const totalStepsPeriod = stepsData.reduce((s, d) => s + d.steps, 0);
  const weekDays = Math.min(daysBack, stepsData.length);
  const daysHit = stepsData.slice(-weekDays).filter((d) => d.steps >= goals.daily).length;
  const todayDistanceKm = Number(((todaySteps * 0.762) / 1000).toFixed(1));
  const progressRatio = Math.min(todaySteps / (goals.daily || 10000), 1);

  const editButton = (
    <button
      onClick={() => setEditing(!editing)}
      className="text-xs font-semibold text-slate-500 hover:text-[#FF7043] dark:text-slate-400 dark:hover:text-[#FF7043] transition-colors cursor-pointer"
    >
      {editing ? 'Done' : 'Goal'}
    </button>
  );

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Today's Steps</p>
          <p className="text-3xl font-extrabold text-[#FF7043] mt-1">{todaySteps.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Daily Average</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{avgSteps.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Est. Distance</p>
          <p className="text-3xl font-extrabold text-teal-500 mt-1">{todayDistanceKm} <span className="text-sm font-normal text-slate-400">km</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Period Steps</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{totalStepsPeriod.toLocaleString()}</p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stepsData}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} steps`, 'Steps']}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <ReferenceLine y={goals.daily} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="steps" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {stepsData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.steps >= goals.daily ? '#10B981' : '#FF7043'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Daily Step History</h4>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          {stepsData.slice().reverse().map((d, idx) => (
            <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{d.date}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">{d.steps.toLocaleString()} steps</span>
                {d.steps >= goals.daily && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold">Goal Met</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Activity & Steps"
      subtitle={`Goal: ${goals.daily.toLocaleString()} steps/day`}
      category="KINETICS & MOVEMENT"
      accentColor="#FF7043"
      icon={<Footprints className="w-5 h-5 text-[#FF7043]" />}
      iconBg="bg-orange-500/10"
      headerActions={editButton}
      expandedContent={expandedView}
    >
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <p className="font-mono text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {todaySteps.toLocaleString()}
          </p>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">steps taken today</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-base font-black text-[#FF7043] tabular-nums">
            {Math.round(progressRatio * 100)}%
          </span>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">of goal</p>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out shadow-xs"
          style={{
            width: `${progressRatio * 100}%`,
            backgroundColor: progressRatio >= 1 ? '#10B981' : '#FF7043',
          }}
        />
      </div>

      {/* Metric chips */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/[0.06]">
          <div className="flex items-center gap-1 text-slate-400 mb-1">
            <Route className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Dist</span>
          </div>
          <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{todayDistanceKm} km</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/[0.06]">
          <div className="flex items-center gap-1 text-slate-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Burned</span>
          </div>
          <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{totalCalories > 0 ? totalCalories.toLocaleString() : '—'} kcal</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/[0.06]">
          <div className="flex items-center gap-1 text-slate-400 mb-1">
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Streak</span>
          </div>
          <p className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{daysHit}/{weekDays} d</p>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08]">
          <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Daily Goal:</span>
          <input
            type="number"
            value={goals.daily}
            onChange={(e) => updateGoal('daily', parseInt(e.target.value) || 0)}
            className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-right text-slate-900 dark:text-white text-xs font-bold"
          />
          <span className="text-xs text-slate-400">steps</span>
        </div>
      )}

      {/* Trend Bar Chart */}
      <div className="h-32 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stepsData} barSize={22}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax, goals.daily * 1.1)]} />
            <ReferenceLine y={goals.daily} stroke="#10B981" strokeDasharray="3 3" opacity={0.5} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DayData;
                return (
                  <DashboardTooltip
                    active={active}
                    title={label}
                    items={[
                      { label: 'Steps', value: d.steps.toLocaleString(), color: d.steps >= goals.daily ? '#10B981' : '#FF7043' },
                      { label: 'Target', value: goals.daily.toLocaleString() },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="steps" radius={[6, 6, 0, 0]}>
              {stepsData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.steps >= goals.daily ? '#10B981' : '#FF7043'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
