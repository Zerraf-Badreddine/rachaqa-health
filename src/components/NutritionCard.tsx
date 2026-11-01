import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend, LabelList } from 'recharts';
import { Utensils } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getNutritionData, getNutritionHistory } from '../api/nutrition';
import { getActiveCaloriesDaily, getCaloriesDaily } from '../api/activity';
import { useDateRange } from '../context/DateRangeContext';
import type { CaloriesRollupDataPoint, NutritionDataPoint } from '../types/health';

import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';

interface MacroSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  deficit: number;
}

const DEFAULT_GOALS: Goals = { calories: 2000, protein: 120, carbs: 250, fat: 65, deficit: 500 };
const GOALS_KEY = 'nutrition_goals';

function loadGoals(): Goals {
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    if (stored) return { ...DEFAULT_GOALS, ...JSON.parse(stored) };
  } catch {
    // Ignore malformed persisted goals and fall back to defaults.
  }
  return DEFAULT_GOALS;
}

function saveGoals(goals: Goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

const TOLERANCE = 0.1;

type GoalStatus = 'under' | 'met' | 'over';

function getGoalStatus(current: number, goal: number): GoalStatus {
  if (goal === 0) return 'under';
  const ratio = current / goal;
  if (ratio < 1 - TOLERANCE) return 'under';
  if (ratio > 1 + TOLERANCE) return 'over';
  return 'met';
}

const STATUS_LABELS: Record<GoalStatus, string> = {
  under: '',
  met: 'Met',
  over: 'Over',
};

function ProgressRow({
  label,
  current,
  goal,
  unit,
  color,
  editing,
  onGoalChange,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  editing: boolean;
  onGoalChange: (val: number) => void;
}) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const status = getGoalStatus(current, goal);
  const barColor = status === 'met' ? '#10B981' : status === 'over' ? '#F59E0B' : color;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
          {status !== 'under' && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                status === 'met'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {STATUS_LABELS[status]}
            </span>
          )}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-medium">
          <span className="text-slate-900 dark:text-white font-bold">{Math.round(current)}</span>{unit}
          {' / '}
          {editing ? (
            <input
              type="number"
              value={goal}
              onChange={(e) => onGoalChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-right text-slate-900 dark:text-white text-xs"
            />
          ) : (
            <span>{goal}{unit}</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-transparent">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

interface DayNutrition {
  iso: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayDeficit {
  iso: string;
  date: string;
  eaten: number;
  burned: number;
  basalBurned: number;
  activeBurned: number;
  deficit: number;
}

interface DayBurnedCalories {
  basal: number;
  active: number;
}

function localDateIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function civilDateIso(date?: { year: number; month: number; day: number }): string | null {
  if (!date) return null;
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function nutritionDateIso(point: NutritionDataPoint): string | null {
  const civilDate = civilDateIso(point.nutritionLog?.interval?.civilStartTime?.date);
  if (civilDate) return civilDate;

  const time = point.nutritionLog?.interval?.startTime;
  return time ? localDateIso(new Date(time)) : null;
}

function kcalFromMetric(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const metric = value as { kcalSum?: unknown; kcal?: unknown; calories?: unknown };
  return numberFromKcalValue(metric.kcalSum) ?? numberFromKcalValue(metric.kcal) ?? numberFromKcalValue(metric.calories);
}

function numberFromKcalValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === 'object') {
    const parsedValue = (value as { parsedValue?: unknown }).parsedValue;
    if (typeof parsedValue === 'number') return parsedValue;
    const source = (value as { source?: unknown }).source;
    if (typeof source === 'string') {
      const parsed = Number(source);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function kcalFromAnyField(point: CaloriesRollupDataPoint, keys: string[]): number | undefined {
  const record = point as unknown as Record<string, unknown>;
  for (const key of keys) {
    const kcal = kcalFromMetric(record[key]);
    if (kcal !== undefined) return kcal;
  }
  return undefined;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function aggregateByDay(points: NutritionDataPoint[], daysBack: number): DayNutrition[] {
  const byDate: Record<string, MacroSummary> = {};

  for (const d of points) {
    const dateStr = nutritionDateIso(d);
    if (!dateStr) continue;
    if (!byDate[dateStr]) byDate[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const day = byDate[dateStr];
    const log = d.nutritionLog;
    day.calories += log?.energy?.kcal ?? 0;
    day.carbs += log?.totalCarbohydrate?.grams ?? 0;
    day.fat += log?.totalFat?.grams ?? 0;
    for (const n of log?.nutrients || []) {
      if (n.nutrient === 'PROTEIN') day.protein += n.quantity?.grams ?? 0;
    }
  }

  const result: DayNutrition[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = localDateIso(d);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const entry = byDate[iso];
    result.push({
      iso,
      date: label,
      calories: Math.round(entry?.calories ?? 0),
      protein: Math.round(entry?.protein ?? 0),
      carbs: Math.round(entry?.carbs ?? 0),
      fat: Math.round(entry?.fat ?? 0),
    });
  }
  return result;
}

function aggregateCaloriesByDay(
  basalPoints: CaloriesRollupDataPoint[],
  activePoints: CaloriesRollupDataPoint[],
  daysBack: number
): Record<string, DayBurnedCalories> {
  const byDate: Record<string, DayBurnedCalories> = {};

  for (const point of basalPoints) {
    const iso = civilDateIso(point.civilStartTime?.date) ?? (point.startTime ? localDateIso(new Date(point.startTime)) : null);
    if (!iso) continue;
    byDate[iso] = {
      basal: Math.round(kcalFromAnyField(point, ['basalEnergyBurned', 'basalMetabolicRate', 'totalCalories', 'totalEnergyBurned', 'calories', 'energy']) ?? 0),
      active: 0,
    };
  }

  for (const point of activePoints) {
    const iso = civilDateIso(point.civilStartTime?.date) ?? (point.startTime ? localDateIso(new Date(point.startTime)) : null);
    if (!iso) continue;
    const current = byDate[iso] ?? { basal: 0, active: 0 };
    byDate[iso] = {
      ...current,
      active: Math.round(kcalFromAnyField(point, ['activeEnergyBurned', 'activeCaloriesBurned', 'totalCalories', 'totalEnergyBurned', 'calories', 'energy']) ?? 0),
    };
  }

  const plausibleBasals = Object.values(byDate)
    .map((day) => day.basal - day.active)
    .filter((value) => value >= 1200 && value <= 2800);
  const baselineBasal = median(plausibleBasals);

  for (const day of Object.values(byDate)) {
    if (day.active <= 0 || baselineBasal === 0) continue;

    const derivedBasal = day.basal - day.active;
    const rawLooksLikeTotal = derivedBasal >= 1200 && derivedBasal <= 2800 && day.basal > baselineBasal + Math.max(300, day.active * 0.5);
    if (rawLooksLikeTotal) {
      day.basal = Math.round(derivedBasal);
    }
  }

  const complete: Record<string, DayBurnedCalories> = {};
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = localDateIso(d);
    complete[iso] = byDate[iso] ?? { basal: 0, active: 0 };
  }

  return complete;
}

function buildDeficitHistory(nutrition: DayNutrition[], burnedByDay: Record<string, DayBurnedCalories>): DayDeficit[] {
  return nutrition.map((day) => {
    const burned = burnedByDay[day.iso] ?? { basal: 0, active: 0 };
    const totalBurned = burned.basal + burned.active;
    return {
      iso: day.iso,
      date: day.date,
      eaten: day.calories,
      burned: totalBurned,
      basalBurned: burned.basal,
      activeBurned: burned.active,
      deficit: totalBurned - day.calories,
    };
  });
}

function deficitGoalMet(deficit: number, goal: number): boolean {
  return goal >= 0 ? deficit >= goal : deficit <= goal;
}

interface FoodEntry {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  time?: string;
}

function parseMealType(type?: string): string {
  if (!type) return 'Other';
  const map: Record<string, string> = {
    MEAL_TYPE_BREAKFAST: 'Breakfast',
    MEAL_TYPE_LUNCH: 'Lunch',
    MEAL_TYPE_DINNER: 'Dinner',
    MEAL_TYPE_SNACK: 'Snack',
    MEAL_TYPE_DRINK: 'Drink',
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner',
    SNACK: 'Snack',
  };
  return map[type] || type.replace(/MEAL_TYPE_/g, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseFoodEntries(data: NutritionDataPoint[]): FoodEntry[] {
  return data.map((d) => {
    const log = d.nutritionLog;
    let protein = 0;
    for (const n of log?.nutrients || []) {
      if (n.nutrient === 'PROTEIN') protein += n.quantity?.grams ?? 0;
    }
    const serving = log?.serving
      ? `${log.serving.amount}${log.serving.foodMeasurementUnitDisplayName ? ' ' + log.serving.foodMeasurementUnitDisplayName : ''}`
      : undefined;
    const time = log?.interval?.startTime
      ? new Date(log.interval.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : undefined;
    return {
      name: log?.foodDisplayName || 'Unknown food',
      mealType: parseMealType(log?.mealType),
      calories: Math.round(log?.energy?.kcal ?? 0),
      protein: Math.round(protein),
      carbs: Math.round(log?.totalCarbohydrate?.grams ?? 0),
      fat: Math.round(log?.totalFat?.grams ?? 0),
      serving,
      time,
    };
  }).sort((a, b) => {
    const order = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink', 'Other'];
    return order.indexOf(a.mealType) - order.indexOf(b.mealType);
  });
}

const MEAL_COLORS: Record<string, string> = {
  Breakfast: '#f59e0b',
  Lunch: '#10b981',
  Dinner: '#3b82f6',
  Snack: '#a855f7',
  Drink: '#00B0B9',
  Other: '#64748b',
};

type NutritionView = 'today' | 'foods' | 'history' | 'deficit';

export function NutritionCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [macros, setMacros] = useState<MacroSummary | null>(null);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [history, setHistory] = useState<DayNutrition[]>([]);
  const [deficitHistory, setDeficitHistory] = useState<DayDeficit[]>([]);
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<NutritionView>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      getNutritionData(accessToken),
      getNutritionHistory(accessToken, Math.max(daysBack, 7)),
      getCaloriesDaily(accessToken, Math.max(daysBack, 7)),
      getActiveCaloriesDaily(accessToken, Math.max(daysBack, 7)),
    ])
      .then(([todayData, historyData, burnedData, activeBurnedData]) => {
        const summary: MacroSummary = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        for (const d of todayData) {
          const log = d.nutritionLog;
          summary.calories += log?.energy?.kcal ?? 0;
          summary.carbs += log?.totalCarbohydrate?.grams ?? 0;
          summary.fat += log?.totalFat?.grams ?? 0;
          for (const n of log?.nutrients || []) {
            if (n.nutrient === 'PROTEIN') summary.protein += n.quantity?.grams ?? 0;
          }
        }
        setMacros(summary);
        setFoods(parseFoodEntries(todayData));
        const nutritionHistory = aggregateByDay(historyData, Math.max(daysBack, 7));
        const deficitRows = buildDeficitHistory(nutritionHistory.slice(-7), aggregateCaloriesByDay(burnedData, activeBurnedData, Math.max(daysBack, 7)));
        setHistory(nutritionHistory.slice(-daysBack));
        setDeficitHistory(deficitRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  function updateGoal(key: keyof Goals, value: number) {
    const updated = { ...goals, [key]: value };
    setGoals(updated);
    saveGoals(updated);
  }

  if (loading) return <LoadingCard title="Nutrition" />;
  if (error) return <ErrorCard title="Nutrition" error={error} />;
  if (!macros || (macros.calories === 0 && history.every((d) => d.calories === 0))) return <EmptyCard title="Nutrition" />;

  const daysWithData = history.filter((d) => d.calories > 0);
  const daysMetCalories = daysWithData.filter((d) => getGoalStatus(d.calories, goals.calories) === 'met').length;
  const daysMetProtein = daysWithData.filter((d) => getGoalStatus(d.protein, goals.protein) === 'met').length;
  const todayDeficit = deficitHistory[deficitHistory.length - 1];
  const deficitDaysWithData = deficitHistory.filter((d) => d.eaten > 0 || d.burned > 0);
  const deficitDaysMet = deficitDaysWithData.filter((d) => deficitGoalMet(d.deficit, goals.deficit)).length;
  const averageDeficit = deficitDaysWithData.length > 0
    ? Math.round(deficitDaysWithData.reduce((sum, d) => sum + d.deficit, 0) / deficitDaysWithData.length)
    : 0;

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Calories Today</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{Math.round(macros.calories)} <span className="text-xs font-normal text-slate-400">kcal</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Protein</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{Math.round(macros.protein)}g</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Carbs</p>
          <p className="text-2xl font-bold text-sky-500 mt-1">{Math.round(macros.carbs)}g</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Fat</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{Math.round(macros.fat)}g</p>
        </div>
      </div>

      <div className="h-72 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Historical Calorie Intake</h4>
        <ResponsiveContainer width="100%" height="88%">
          <BarChart data={history}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
              formatter={(value) => [`${value} kcal`, 'Calories']}
            />
            <ReferenceLine y={goals.calories} stroke="#00B0B9" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]} barSize={28}>
              {history.map((d) => {
                const status = getGoalStatus(d.calories, goals.calories);
                return (
                  <Cell
                    key={d.date}
                    fill={d.calories === 0 ? '#334155' : status === 'met' ? '#10B981' : status === 'over' ? '#F59E0B' : '#00B0B9'}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Today's Meals & Logged Items</h4>
        {foods.length === 0 ? (
          <p className="text-slate-400 text-xs italic">No items logged today.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {foods.map((food, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                      {food.mealType}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5">{food.name}</p>
                    {food.serving && <p className="text-xs text-slate-400">{food.serving}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 dark:text-white">{food.calories} <span className="text-xs font-normal text-slate-400">kcal</span></p>
                    {food.time && <p className="text-[10px] text-slate-400">{food.time}</p>}
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                  <span>P: <b className="text-emerald-500">{food.protein}g</b></span>
                  <span>C: <b className="text-sky-500">{food.carbs}g</b></span>
                  <span>F: <b className="text-rose-500">{food.fat}g</b></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card
      title="Nutrition & Macros"
      subtitle={view === 'today' ? 'Today' : view === 'foods' ? 'Food Log' : view === 'deficit' ? 'Deficit - Last 7 days' : `Last ${daysBack} days`}
      category="METABOLIC INTAKE"
      accentColor="#F59E0B"
      icon={<Utensils className="w-5 h-5 text-amber-500" />}
      iconBg="bg-amber-500/10"
      expandedContent={expandedView}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-2xl text-xs">
          {(['today', 'foods', 'history', 'deficit'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer capitalize text-[11px] ${
                view === v
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-slate-500 hover:text-[#00B0B9] transition-colors cursor-pointer font-medium"
        >
          {editing ? 'Done' : 'Edit goals'}
        </button>
      </div>

      {view === 'today' ? (
        <>
          <p className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">
            {Math.round(macros.calories)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">kcal</span>
          </p>
          <div className="space-y-2.5">
            <ProgressRow label="Calories" current={macros.calories} goal={goals.calories} unit=" kcal" color="#F59E0B" editing={editing} onGoalChange={(v) => updateGoal('calories', v)} />
            <ProgressRow label="Protein" current={macros.protein} goal={goals.protein} unit="g" color="#10B981" editing={editing} onGoalChange={(v) => updateGoal('protein', v)} />
            <ProgressRow label="Carbs" current={macros.carbs} goal={goals.carbs} unit="g" color="#3B82F6" editing={editing} onGoalChange={(v) => updateGoal('carbs', v)} />
            <ProgressRow label="Fat" current={macros.fat} goal={goals.fat} unit="g" color="#EF4444" editing={editing} onGoalChange={(v) => updateGoal('fat', v)} />
          </div>
        </>
      ) : view === 'foods' ? (
        <>
          {foods.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[140px] text-center">
              <p className="text-slate-400 dark:text-slate-500 text-xs">No food entries logged today</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
              {(() => {
                let lastMeal = '';
                return foods.map((food, i) => {
                  const showHeader = food.mealType !== lastMeal;
                  lastMeal = food.mealType;
                  const mealColor = MEAL_COLORS[food.mealType] || MEAL_COLORS.Other;
                  return (
                    <div key={i}>
                      {showHeader && (
                        <p className="text-[11px] font-bold mt-2 mb-1 first:mt-0 uppercase tracking-wider" style={{ color: mealColor }}>
                          {food.mealType}
                        </p>
                      )}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-3 py-2 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{food.name}</p>
                            {food.serving && <p className="text-[10px] text-slate-400">{food.serving}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{food.calories} <span className="text-[10px] font-normal text-slate-400">kcal</span></p>
                            {food.time && <p className="text-[10px] text-slate-400">{food.time}</p>}
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>P <b className="text-emerald-500">{food.protein}g</b></span>
                          <span>C <b className="text-sky-500">{food.carbs}g</b></span>
                          <span>F <b className="text-rose-500">{food.fat}g</b></span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      ) : view === 'history' ? (
        <>
          <div className="h-28 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  formatter={(value, name) => {
                    const unit = String(name) === 'calories' ? ' kcal' : 'g';
                    return [`${value}${unit}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)];
                  }}
                />
                <ReferenceLine y={goals.calories} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="calories" radius={[4, 4, 0, 0]} barSize={18}>
                  {history.map((d) => {
                    const status = getGoalStatus(d.calories, goals.calories);
                    return (
                      <Cell
                        key={d.date}
                        fill={d.calories === 0 ? '#334155' : status === 'met' ? '#10B981' : status === 'over' ? '#F59E0B' : '#00B0B9'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span>Cal met: <b className="text-slate-900 dark:text-white">{daysMetCalories}/{daysWithData.length}</b></span>
            <span>Pro met: <b className="text-slate-900 dark:text-white">{daysMetProtein}/{daysWithData.length}</b></span>
            <span>Avg: <b className="text-slate-900 dark:text-white">{daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length) : 0}</b> kcal</span>
          </div>

          {editing && (
            <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <ProgressRow label="Calories" current={0} goal={goals.calories} unit=" kcal" color="#F59E0B" editing={true} onGoalChange={(v) => updateGoal('calories', v)} />
              <ProgressRow label="Protein" current={0} goal={goals.protein} unit="g" color="#10B981" editing={true} onGoalChange={(v) => updateGoal('protein', v)} />
              <ProgressRow label="Carbs" current={0} goal={goals.carbs} unit="g" color="#3B82F6" editing={true} onGoalChange={(v) => updateGoal('carbs', v)} />
              <ProgressRow label="Fat" current={0} goal={goals.fat} unit="g" color="#EF4444" editing={true} onGoalChange={(v) => updateGoal('fat', v)} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-base font-bold text-slate-900 dark:text-white">{todayDeficit ? Math.round(todayDeficit.deficit).toLocaleString() : 0}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">today kcal</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-base font-bold text-slate-900 dark:text-white">{averageDeficit.toLocaleString()}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">avg kcal</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-base font-bold text-slate-900 dark:text-white">{deficitDaysMet}<span className="text-xs font-normal text-slate-400">/{deficitDaysWithData.length}</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">goal met</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Using basal + active</span>
            {editing && (
              <label className="flex items-center gap-2">
                goal
                <input
                  type="number"
                  value={goals.deficit}
                  onChange={(e) => updateGoal('deficit', parseInt(e.target.value) || 0)}
                  className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-right text-slate-900 dark:text-white text-xs"
                />
              </label>
            )}
          </div>

          <div className="min-h-36 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deficitHistory}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      basalBurned: 'Basal burn',
                      activeBurned: 'Active burn',
                      eaten: 'Intake',
                      deficit: 'Deficit',
                    };
                    return [`${Number(value).toLocaleString()} kcal`, labels[String(name)] ?? String(name)];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                <Bar dataKey="basalBurned" name="Basal" stackId="burned" fill="#2563eb" barSize={12} />
                <Bar dataKey="activeBurned" name="Active" stackId="burned" fill="#00B0B9" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="eaten" name="Intake" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="deficit" name="Deficit" barSize={8}>
                  <LabelList dataKey="deficit" position="top" formatter={(value: unknown) => Number(value).toLocaleString()} style={{ fill: '#94a3b8', fontSize: 9 }} />
                  {deficitHistory.map((d) => (
                    <Cell
                      key={d.iso}
                      fill={d.eaten === 0 && d.burned === 0 ? '#334155' : deficitGoalMet(d.deficit, goals.deficit) ? '#10B981' : '#EF4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
