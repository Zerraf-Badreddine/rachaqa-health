import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Scale } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import { getWeightData, getHeightData } from '../api/weight';
import { getProfile } from '../api/user';
import type { WeightDataPoint, HeightDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { DashboardTooltip } from './common/DashboardTooltip';

const UNIT_KEY = 'dashboard_weight_unit';

type WeightUnit = 'kg' | 'lbs';

interface ParsedWeightSample {
  date: string;
  timestamp: number;
  weightKg: number;
  weightLbs: number;
}

function parseWeightKg(point: WeightDataPoint): number | null {
  const raw = point.weight?.weightGrams ?? point.weightGrams;
  if (raw != null) {
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!isNaN(num) && num > 0) {
      return num > 1000 ? num / 1000 : num;
    }
  }
  return null;
}

function parseTimestamp(point: WeightDataPoint): number {
  const pTime = point.weight?.sampleTime?.physicalTime ?? point.sampleTime?.physicalTime;
  if (pTime) {
    const t = new Date(pTime).getTime();
    if (!isNaN(t)) return t;
  }

  const cDate = point.weight?.sampleTime?.civilTime?.date ?? point.sampleTime?.civilTime?.date;
  if (cDate) {
    return new Date(cDate.year, cDate.month - 1, cDate.day).getTime();
  }

  return Date.now();
}

function parseHeightMeters(heightPoints: HeightDataPoint[], profile: Record<string, unknown> | null): number | null {
  for (const hp of heightPoints) {
    const raw = hp.height?.heightMillimeters ?? hp.heightMillimeters;
    if (raw != null) {
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
      if (!isNaN(num) && num > 0) {
        return num > 50 ? num / 1000 : num;
      }
    }
  }

  if (profile?.height != null) {
    const h = typeof profile.height === 'number' ? profile.height : parseFloat(String(profile.height));
    if (!isNaN(h) && h > 0) {
      return h > 50 ? h / 100 : h;
    }
  }

  return null;
}

function getBmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-500 dark:text-sky-400' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-600 dark:text-emerald-400' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Obese', color: 'text-rose-600 dark:text-rose-400' };
}

export function WeightCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [samples, setSamples] = useState<ParsedWeightSample[]>([]);
  const [heightMeters, setHeightMeters] = useState<number | null>(null);
  const [unit, setUnit] = useState<WeightUnit>(() => {
    try {
      return (localStorage.getItem(UNIT_KEY) as WeightUnit) || 'kg';
    } catch {
      return 'kg';
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleUnitChange(newUnit: WeightUnit) {
    setUnit(newUnit);
    try {
      localStorage.setItem(UNIT_KEY, newUnit);
    } catch {}
  }

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getWeightData(accessToken, daysBack),
      getHeightData(accessToken),
      getProfile(accessToken),
    ])
      .then(([weightRes, heightRes, profileRes]) => {
        const rawPoints: WeightDataPoint[] =
          weightRes.status === 'fulfilled' ? weightRes.value : [];
        const heightPoints: HeightDataPoint[] =
          heightRes.status === 'fulfilled' ? heightRes.value : [];
        const profile: Record<string, unknown> | null =
          profileRes.status === 'fulfilled' ? profileRes.value : null;

        const parsedHeight = parseHeightMeters(heightPoints, profile);
        setHeightMeters(parsedHeight);

        const list: ParsedWeightSample[] = [];
        for (const pt of rawPoints) {
          const kg = parseWeightKg(pt);
          if (kg != null) {
            const ts = parseTimestamp(pt);
            const d = new Date(ts);
            list.push({
              date: `${d.getMonth() + 1}/${d.getDate()}`,
              timestamp: ts,
              weightKg: Math.round(kg * 10) / 10,
              weightLbs: Math.round(kg * 2.20462 * 10) / 10,
            });
          }
        }

        // Fallback to profile weight
        if (list.length === 0 && profile?.weight != null) {
          const wNum =
            typeof profile.weight === 'number'
              ? profile.weight
              : parseFloat(String(profile.weight));
          if (!isNaN(wNum) && wNum > 0) {
            const kg = wNum > 500 ? wNum / 1000 : wNum;
            list.push({
              date: 'Profile',
              timestamp: Date.now(),
              weightKg: Math.round(kg * 10) / 10,
              weightLbs: Math.round(kg * 2.20462 * 10) / 10,
            });
          }
        }

        list.sort((a, b) => a.timestamp - b.timestamp);
        setSamples(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Weight & BMI" />;
  if (error) return <ErrorCard title="Weight & BMI" error={error} />;
  if (samples.length === 0) return <EmptyCard title="Weight & BMI" message="No weight logs recorded in Google Health" />;

  const latest = samples[samples.length - 1];
  const first = samples[0];
  const displayVal = unit === 'kg' ? latest.weightKg : latest.weightLbs;
  const diffVal =
    samples.length > 1
      ? Math.round(
          (unit === 'kg' ? latest.weightKg - first.weightKg : latest.weightLbs - first.weightLbs) * 10
        ) / 10
      : null;

  const bmi =
    heightMeters && heightMeters > 0
      ? Math.round((latest.weightKg / (heightMeters * heightMeters)) * 10) / 10
      : null;
  const bmiInfo = bmi ? getBmiCategory(bmi) : null;

  const chartData = samples.map((s) => ({
    date: s.date,
    weight: unit === 'kg' ? s.weightKg : s.weightLbs,
  }));

  const weights = chartData.map((d) => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  const unitToggle = (
    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 text-xs">
      <button
        onClick={() => handleUnitChange('kg')}
        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer font-medium ${
          unit === 'kg'
            ? 'bg-white dark:bg-slate-700 text-[#00B0B9] dark:text-teal-300 shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        kg
      </button>
      <button
        onClick={() => handleUnitChange('lbs')}
        className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer font-medium ${
          unit === 'lbs'
            ? 'bg-white dark:bg-slate-700 text-[#00B0B9] dark:text-teal-300 shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        lbs
      </button>
    </div>
  );

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Weight</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {displayVal} <span className="text-sm font-normal text-slate-500">{unit}</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Body Mass Index</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{bmi != null ? bmi : '—'}</span>
            {bmiInfo && <span className={`text-xs font-semibold ${bmiInfo.color}`}>{bmiInfo.label}</span>}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Period Change</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {diffVal != null ? `${diffVal > 0 ? `+${diffVal}` : diffVal} ${unit}` : '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Height</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {heightMeters != null ? `${Math.round(heightMeters * 100)} cm` : '—'}
          </p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[minW, maxW]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              }}
              formatter={(val) => [`${val} ${unit}`, 'Weight']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#00B0B9"
              strokeWidth={3}
              dot={{ fill: '#00B0B9', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recorded Entries</h4>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          {samples.slice().reverse().map((s, idx) => (
            <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{s.date}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {unit === 'kg' ? `${s.weightKg} kg` : `${s.weightLbs} lbs`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Weight & BMI"
      subtitle={`Last ${daysBack} days`}
      category="BODY COMPOSITION"
      accentColor="#00B0B9"
      icon={<Scale className="w-5 h-5 text-[#00B0B9]" />}
      iconBg="bg-teal-500/10"
      headerActions={unitToggle}
      expandedContent={expandedView}
    >
      <div className="flex items-baseline gap-2 mb-3">
        <p className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
          {displayVal}
          <span className="text-sm font-semibold text-slate-400 ml-1.5">{unit}</span>
        </p>
        {diffVal != null && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              diffVal === 0
                ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
                : diffVal < 0
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80'
            }`}
          >
            {diffVal > 0 ? `+${diffVal}` : diffVal} {unit}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06]">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">BMI Ratio</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {bmi != null ? bmi : '—'}
            </span>
            {bmiInfo && (
              <span className={`text-xs font-bold ${bmiInfo.color}`}>
                {bmiInfo.label}
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06]">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Height</p>
          <p className="font-mono text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {heightMeters != null ? `${Math.round(heightMeters * 100)} cm` : '—'}
          </p>
        </div>
      </div>

      {bmi != null && (
        <div className="mb-4 px-1">
          <div className="relative h-2 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex">
            <div className="w-[17.5%] bg-sky-400" title="Underweight (< 18.5)" />
            <div className="w-[32.5%] bg-emerald-500" title="Normal (18.5 - 24.9)" />
            <div className="w-[25%] bg-amber-500" title="Overweight (25 - 29.9)" />
            <div className="w-[25%] bg-rose-500" title="Obese (>= 30)" />
          </div>
          <div className="relative w-full h-3">
            <div
              className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-900 shadow-sm transition-all duration-500 -ml-1.25"
              style={{ left: `${Math.min(98, Math.max(2, ((bmi - 15) / 20) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 -mt-0.5">
            <span>15</span>
            <span className="text-emerald-600 dark:text-emerald-400">18.5 - 24.9 Normal</span>
            <span>35</span>
          </div>
        </div>
      )}

      {samples.length > 1 ? (
        <div className="h-32 mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00B0B9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00B0B9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                hide
                domain={[minW, maxW]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { weight: number };
                  return (
                    <DashboardTooltip
                      active={active}
                      title={label}
                      items={[
                        { label: 'Weight', value: `${d.weight} ${unit}`, color: '#00B0B9' },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#00B0B9"
                strokeWidth={2.5}
                fill="url(#weightAreaGrad)"
                dot={{ fill: '#00B0B9', r: 3 }}
                activeDot={{ r: 5, fill: '#00B0B9' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-auto pt-2">
          {latest.date === 'Profile'
            ? 'From Google Health profile'
            : `Logged on ${latest.date}`}
        </div>
      )}
    </Card>
  );
}
