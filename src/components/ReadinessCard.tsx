import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getHrvData } from '../api/hrv';
import { getRestingHrData } from '../api/resting-hr';
import { getSleepData } from '../api/sleep';

import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { useDateRange } from '../context/DateRangeContext';
import { calcSleepScore } from '../utils/sleep-score';
import { DashboardTooltip } from './common/DashboardTooltip';

interface DayReadiness {
  date: string;
  score: number;
  hrvScore: number;
  rhrScore: number;
  sleepScore: number;
  hrv: number;
  rhr: number;
  sleepMins: number;
}

function dateKey(_y: number, m: number, d: number): string {
  return `${m}/${d}`;
}

function calcReadiness(
  hrv: number,
  hrvBaseline: number,
  rhr: number,
  rhrBaseline: number,
  sleepScoreVal: number
): { score: number; hrvScore: number; rhrScore: number; sleepScore: number } {
  let hrvScore = 50;
  if (hrvBaseline > 0) {
    const ratio = hrv / hrvBaseline;
    if (ratio >= 1.0) {
      hrvScore = 62 + Math.min(38, (ratio - 1.0) * 76);
    } else if (ratio >= 0.8) {
      hrvScore = 30 + (ratio - 0.8) * 160;
    } else if (ratio >= 0.6) {
      hrvScore = 10 + (ratio - 0.6) * 100;
    } else {
      hrvScore = Math.max(3, ratio * 17);
    }
  }

  let rhrScore = 50;
  if (rhrBaseline > 0) {
    const ratio = rhrBaseline / rhr;
    if (ratio >= 1.0) {
      rhrScore = 62 + Math.min(38, (ratio - 1.0) * 127);
    } else if (ratio >= 0.9) {
      rhrScore = 30 + (ratio - 0.9) * 320;
    } else if (ratio >= 0.8) {
      rhrScore = 10 + (ratio - 0.8) * 200;
    } else {
      rhrScore = Math.max(3, ratio * 12.5);
    }
  }

  const sleepScore = sleepScoreVal;
  const score = Math.round(hrvScore * 0.4 + rhrScore * 0.3 + sleepScore * 0.3);

  return {
    score: Math.min(100, Math.max(0, score)),
    hrvScore: Math.round(hrvScore),
    rhrScore: Math.round(rhrScore),
    sleepScore: Math.round(sleepScore),
  };
}

function getScoreColor(score: number): string {
  if (score >= 65) return '#10B981';
  if (score >= 30) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 65) return 'Ready to push';
  if (score >= 30) return 'Moderate ready';
  return 'Prioritize recovery';
}

export function ReadinessCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [days, setDays] = useState<DayReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      getHrvData(accessToken, Math.max(daysBack, 30)),
      getRestingHrData(accessToken, daysBack),
      getSleepData(accessToken, daysBack),
    ])
      .then(([hrvData, rhrData, sleepData]) => {
        const hrvByDate: Record<string, number> = {};
        const allHrvValues: number[] = [];
        for (const d of hrvData) {
          const hrv = d.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds;
          if (hrv != null) {
            const dt = d.dailyHeartRateVariability.date;
            hrvByDate[dateKey(dt.year, dt.month, dt.day)] = hrv;
            allHrvValues.push(hrv);
          }
        }
        const hrvBaseline = allHrvValues.length > 0
          ? allHrvValues.reduce((a, b) => a + b, 0) / allHrvValues.length
          : 0;

        const rhrByDate: Record<string, number> = {};
        const allRhrValues: number[] = [];
        for (const d of rhrData) {
          const bpm = parseInt(d.dailyRestingHeartRate?.beatsPerMinute || '0');
          if (bpm > 0) {
            const dt = d.dailyRestingHeartRate.date;
            rhrByDate[dateKey(dt.year, dt.month, dt.day)] = bpm;
            allRhrValues.push(bpm);
          }
        }
        const rhrBaseline = allRhrValues.length > 0
          ? allRhrValues.reduce((a, b) => a + b, 0) / allRhrValues.length
          : 0;

        const sleepByDate: Record<string, { mins: number; score: number }> = {};
        for (const d of sleepData) {
          const stages = d.sleep.summary?.stagesSummary || [];
          const get = (type: string) => parseInt(stages.find((s) => s.type === type)?.minutes || '0');
          const deep = get('DEEP');
          const rem = get('REM');
          const light = get('LIGHT');
          const awake = get('AWAKE');
          const mins = parseInt(d.sleep.summary?.minutesAsleep || '0');
          if (mins >= 120) {
            const endTime = d.sleep.interval?.endTime;
            if (endTime) {
              const dt = new Date(endTime);
              const score = calcSleepScore(deep, rem, light, awake);
              sleepByDate[dateKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())] = { mins, score };
            }
          }
        }

        const result: DayReadiness[] = [];
        for (let i = daysBack - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
          const hrv = hrvByDate[key] || 0;
          const rhr = rhrByDate[key] || 0;
          const sleepEntry = sleepByDate[key];
          const sleepMins = sleepEntry?.mins || 0;
          const sleepScoreVal = sleepEntry?.score || 0;

          if (hrv === 0 && rhr === 0 && sleepMins === 0) continue;

          const scores = calcReadiness(
            hrv || hrvBaseline,
            hrvBaseline,
            rhr || rhrBaseline,
            rhrBaseline,
            sleepScoreVal || 75
          );

          result.push({
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            ...scores,
            hrv: Math.round(hrv),
            rhr,
            sleepMins,
          });
        }

        setDays(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Daily Readiness" />;
  if (error) return <ErrorCard title="Daily Readiness" error={error} />;
  if (days.length === 0) return <EmptyCard title="Daily Readiness" message="Requires sleep and heart rate sensor logs" />;

  const today = days[days.length - 1];
  const weekAvg = Math.round(days.reduce((s, d) => s + d.score, 0) / days.length);

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Score</p>
          <p className="text-4xl font-bold mt-1" style={{ color: getScoreColor(today.score) }}>{today.score}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{getScoreLabel(today.score)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">HRV Component</p>
          <p className="text-3xl font-bold text-purple-500 mt-1">{today.hrvScore}%</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{today.hrv} ms</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">RHR Component</p>
          <p className="text-3xl font-bold text-rose-500 mt-1">{today.rhrScore}%</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{today.rhr} bpm</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sleep Component</p>
          <p className="text-3xl font-bold text-sky-500 mt-1">{today.sleepScore}%</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{Math.floor(today.sleepMins / 60)}h {today.sleepMins % 60}m</p>
        </div>
      </div>

      <div className="h-72 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Readiness Score History</h4>
        <ResponsiveContainer width="100%" height="88%">
          <BarChart data={days}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
              formatter={(val) => [`${val}/100`, 'Score']}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={28}>
              {days.map((d) => (
                <Cell key={d.date} fill={getScoreColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Daily Breakdown</h4>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          {days.slice().reverse().map((d, idx) => (
            <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
              <span className="font-medium text-slate-500 dark:text-slate-400">{d.date}</span>
              <div className="flex items-center gap-4">
                <span className="text-purple-500">HRV {d.hrv}ms</span>
                <span className="text-rose-500">RHR {d.rhr}bpm</span>
                <span className="text-sky-500">{Math.floor(d.sleepMins / 60)}h {d.sleepMins % 60}m</span>
                <span className="font-bold px-2 py-0.5 rounded-full text-[11px]" style={{ color: getScoreColor(d.score) }}>
                  {d.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Daily Readiness"
      subtitle={`Last ${daysBack} days`}
      category="Recovery"
      accentColor="#10B981"
      icon={<Sparkles className="w-5 h-5 text-emerald-500" />}
      iconBg="bg-emerald-500/10 text-emerald-500"
      expandedContent={expandedView}
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 shadow-sm transition-transform hover:scale-105"
          style={{ borderColor: getScoreColor(today.score), backgroundColor: `${getScoreColor(today.score)}18` }}
        >
          <span className="text-2xl font-black tracking-tight tabular-nums" style={{ color: getScoreColor(today.score) }}>
            {today.score}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">/ 100</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black truncate" style={{ color: getScoreColor(today.score) }}>
            {getScoreLabel(today.score)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Period Avg: <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{weekAvg}</strong></p>
          
          {/* Component balance progress strips */}
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                <span>HRV</span>
                <span className="tabular-nums">{today.hrvScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${today.hrvScore}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                <span>RHR</span>
                <span className="tabular-nums">{today.rhrScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${today.rhrScore}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                <span>Sleep</span>
                <span className="tabular-nums">{today.sleepScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${today.sleepScore}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 text-center border border-slate-200/80 dark:border-white/[0.06]">
          <p className="font-mono text-lg font-black text-purple-400 tabular-nums">{today.hrv}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">HRV (ms)</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 text-center border border-slate-200/80 dark:border-white/[0.06]">
          <p className="font-mono text-lg font-black text-rose-400 tabular-nums">{today.rhr}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">RHR (bpm)</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 text-center border border-slate-200/80 dark:border-white/[0.06]">
          <p className="font-mono text-lg font-black text-indigo-400 tabular-nums">
            {Math.floor(today.sleepMins / 60)}h {today.sleepMins % 60}m
          </p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">Sleep</p>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} barSize={22}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DayReadiness;
                return (
                  <DashboardTooltip
                    active={active}
                    title={label}
                    items={[
                      { label: 'Readiness', value: `${d.score}/100`, color: getScoreColor(d.score) },
                      { label: 'HRV', value: `${d.hrv} ms` },
                      { label: 'RHR', value: `${d.rhr} bpm` },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {days.map((d) => (
                <Cell key={d.date} fill={getScoreColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
