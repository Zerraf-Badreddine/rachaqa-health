import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';
import { Moon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSleepData } from '../api/sleep';
import type { SleepDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { calcSleepScore } from '../utils/sleep-score';
import { useDateRange } from '../context/DateRangeContext';
import { DashboardTooltip } from './common/DashboardTooltip';

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMinutesShort(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

const STAGE_COLORS: Record<string, string> = {
  DEEP: '#1E3A8A',
  REM: '#4DD0E1',
  LIGHT: '#64B5F6',
  AWAKE: '#FF6B6B',
};

interface NightData {
  date: string;
  total: number;
  deep: number;
  light: number;
  rem: number;
  awake: number;
  score: number;
}

function parseNight(sp: SleepDataPoint): NightData {
  const stages = sp.sleep.summary?.stagesSummary || [];
  const get = (type: string) => parseInt(stages.find((s) => s.type === type)?.minutes || '0', 10);
  const deep = get('DEEP');
  const rem = get('REM');
  const light = get('LIGHT');
  const awake = get('AWAKE');
  const total = parseInt(sp.sleep.summary?.minutesAsleep || '0', 10);

  let dateStr = '';
  const endTime = sp.sleep.interval?.endTime;
  if (endTime) {
    const d = new Date(endTime);
    dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return { date: dateStr, total, deep, light, rem, awake, score: calcSleepScore(deep, rem, light, awake) };
}

function sleepQualityLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: 'text-emerald-500' };
  if (score >= 75) return { label: 'Good', color: 'text-teal-400' };
  if (score >= 60) return { label: 'Fair', color: 'text-amber-400' };
  return { label: 'Restless', color: 'text-rose-400' };
}

export function SleepCard() {
  const { accessToken } = useAuth();
  const [nights, setNights] = useState<NightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const { daysBack } = useDateRange();

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    getSleepData(accessToken, daysBack)
      .then((data) => {
        const parsed = data
          .filter((d) => d.sleep.summary?.stagesSummary?.length)
          .map(parseNight)
          .filter((n) => n.total >= 120)
          .reverse();
        setNights(parsed);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Sleep & Stages" />;
  if (error) return <ErrorCard title="Sleep & Stages" error={error} />;
  if (nights.length === 0) return <EmptyCard title="Sleep & Stages" message="No sleep logs recorded in Google Health" />;

  const lastNight = nights[nights.length - 1];
  const avgTotal = Math.round(nights.reduce((s, n) => s + n.total, 0) / nights.length);
  const avgScore = Math.round(nights.reduce((s, n) => s + n.score, 0) / nights.length);

  function handleLegendClick(e: { value?: string }) {
    const stage = e.value?.toLowerCase();
    if (!stage) return;
    setActiveStage(activeStage === stage ? null : stage);
  }

  const chartData = activeStage
    ? nights.map((n) => ({ ...n, _solo: n[activeStage as keyof NightData] as number }))
    : nights;

  const totalStages = lastNight.deep + lastNight.rem + lastNight.light + lastNight.awake || 1;
  const pctDeep = Math.round((lastNight.deep / totalStages) * 100);
  const pctRem = Math.round((lastNight.rem / totalStages) * 100);
  const pctLight = Math.round((lastNight.light / totalStages) * 100);
  const pctAwake = Math.round((lastNight.awake / totalStages) * 100);

  const quality = sleepQualityLabel(lastNight.score);

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Sleep Score</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {lastNight.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Time Asleep</p>
          <p className="text-3xl font-black text-indigo-500 mt-1 tabular-nums">{formatMinutes(lastNight.total)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Avg Duration</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{formatMinutes(avgTotal)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Avg Score</p>
          <p className="text-3xl font-black text-teal-400 mt-1 tabular-nums">{avgScore}</p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-200/80 dark:border-white/[0.08]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={36}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMinutes(v)}
              width={50}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as NightData;
                return (
                  <DashboardTooltip
                    active={active}
                    title={`Night of ${label}`}
                    subtitle={`Score ${d.score}`}
                    items={[
                      { label: 'Deep', value: formatMinutes(d.deep), color: STAGE_COLORS.DEEP },
                      { label: 'REM', value: formatMinutes(d.rem), color: STAGE_COLORS.REM },
                      { label: 'Light', value: formatMinutes(d.light), color: STAGE_COLORS.LIGHT },
                      { label: 'Awake', value: formatMinutes(d.awake), color: STAGE_COLORS.AWAKE },
                    ]}
                  />
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }} onClick={handleLegendClick} />
            <Bar dataKey="deep" stackId="sleep" name="Deep" fill={STAGE_COLORS.DEEP} />
            <Bar dataKey="rem" stackId="sleep" name="REM" fill={STAGE_COLORS.REM} />
            <Bar dataKey="light" stackId="sleep" name="Light" fill={STAGE_COLORS.LIGHT} />
            <Bar dataKey="awake" stackId="sleep" name="Awake" fill={STAGE_COLORS.AWAKE} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <Card
      title="Sleep & Stages"
      subtitle={`Last ${daysBack} days`}
      category="CIRCADIAN ARCHITECTURE"
      accentColor="#6366F1"
      icon={<Moon className="w-5 h-5 text-indigo-400" />}
      iconBg="bg-indigo-500/10"
      expandedContent={expandedView}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatMinutes(lastNight.total)}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">last night</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Avg: <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{formatMinutes(avgTotal)}</strong> · {nights.length} nights tracked
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl px-3.5 py-2">
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Score</span>
            <span className={`text-xs font-bold ${quality.color}`}>{quality.label}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-mono font-black text-indigo-400 text-lg tabular-nums">
            {lastNight.score}
          </div>
        </div>
      </div>

      {/* Proportional Stage Hypnogram Bar */}
      <div className="mb-4 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200/70 dark:border-white/[0.05]">
        <div className="flex justify-between items-center mb-1.5 text-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stage Architecture</span>
          <span className="text-[10px] text-slate-400 font-medium">Total: {formatMinutes(lastNight.total)}</span>
        </div>
        <div className="h-3.5 w-full rounded-xl overflow-hidden flex shadow-xs mb-2 bg-slate-200/70 dark:bg-slate-800/80">
          <div style={{ width: `${pctDeep}%` }} className="bg-[#3b82f6] transition-all duration-500" title={`Deep: ${formatMinutes(lastNight.deep)} (${pctDeep}%)`} />
          <div style={{ width: `${pctRem}%` }} className="bg-[#06b6d4] transition-all duration-500" title={`REM: ${formatMinutes(lastNight.rem)} (${pctRem}%)`} />
          <div style={{ width: `${pctLight}%` }} className="bg-[#93c5fd] transition-all duration-500" title={`Light: ${formatMinutes(lastNight.light)} (${pctLight}%)`} />
          <div style={{ width: `${pctAwake}%` }} className="bg-[#f43f5e] transition-all duration-500" title={`Awake: ${formatMinutes(lastNight.awake)} (${pctAwake}%)`} />
        </div>
        <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            <span>Deep {pctDeep}%</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
            <span>REM {pctRem}%</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#93c5fd]" />
            <span>Light {pctLight}%</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
            <span>Awake {pctAwake}%</span>
          </div>
        </div>
      </div>

      <div className="h-36 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={24} margin={{ top: 12, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMinutes(v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as NightData;
                return (
                  <DashboardTooltip
                    active={active}
                    title={`Night of ${label}`}
                    subtitle={`Score ${d.score}`}
                    items={[
                      { label: 'Deep', value: formatMinutes(d.deep), color: STAGE_COLORS.DEEP },
                      { label: 'REM', value: formatMinutes(d.rem), color: STAGE_COLORS.REM },
                      { label: 'Light', value: formatMinutes(d.light), color: STAGE_COLORS.LIGHT },
                      { label: 'Awake', value: formatMinutes(d.awake), color: STAGE_COLORS.AWAKE },
                    ]}
                  />
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', cursor: 'pointer', paddingTop: '4px' }}
              onClick={handleLegendClick}
            />
            {activeStage ? (
              <Bar
                dataKey="_solo"
                name={activeStage.charAt(0).toUpperCase() + activeStage.slice(1)}
                fill={STAGE_COLORS[activeStage.toUpperCase()]}
                radius={[6, 6, 0, 0]}
              >
                <LabelList
                  dataKey="_solo"
                  position="top"
                  formatter={(v) => formatMinutesShort(Number(v))}
                  style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                />
              </Bar>
            ) : (
              <>
                <Bar dataKey="deep" stackId="sleep" name="Deep" fill={STAGE_COLORS.DEEP} />
                <Bar dataKey="rem" stackId="sleep" name="REM" fill={STAGE_COLORS.REM} />
                <Bar dataKey="light" stackId="sleep" name="Light" fill={STAGE_COLORS.LIGHT} />
                <Bar dataKey="awake" stackId="sleep" name="Awake" fill={STAGE_COLORS.AWAKE} radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(v) => formatMinutesShort(Number(v))}
                    style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                  />
                </Bar>
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
