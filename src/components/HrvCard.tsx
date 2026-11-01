import { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Activity } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getHrvData } from '../api/hrv';
import type { HrvDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { useDateRange } from '../context/DateRangeContext';
import { DashboardTooltip } from './common/DashboardTooltip';

function calcRange(values: number[]): { mean: number; low: number; high: number } {
  if (values.length === 0) return { mean: 0, low: 0, high: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance);
  return {
    mean: Math.round(mean),
    low: Math.round(Math.max(0, mean - sd)),
    high: Math.round(mean + sd),
  };
}

export function HrvCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [data, setData] = useState<HrvDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getHrvData(accessToken, Math.max(daysBack, 30))
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Heart Rate Variability" />;
  if (error) return <ErrorCard title="Heart Rate Variability" error={error} />;
  if (data.length === 0) return <EmptyCard title="Heart Rate Variability" message="No HRV data recorded in Google Health" />;

  const allValues = data
    .filter((d) => d.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds != null)
    .map((d) => d.dailyHeartRateVariability.averageHeartRateVariabilityMilliseconds || 0);

  const range = calcRange(allValues);

  const chartData = data
    .filter((d) => d.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds != null)
    .map((d) => ({
      date: `${d.dailyHeartRateVariability.date.month}/${d.dailyHeartRateVariability.date.day}`,
      rmssd: Math.round(d.dailyHeartRateVariability.averageHeartRateVariabilityMilliseconds || 0),
    }))
    .reverse()
    .slice(-daysBack);

  const latest = chartData[chartData.length - 1]?.rmssd || 0;
  const status = latest >= range.low && latest <= range.high
    ? 'Normal'
    : latest < range.low
      ? 'Below range'
      : 'Above range';

  const statusColor = status === 'Normal'
    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
    : status === 'Below range'
    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
    : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800';

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Latest HRV</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{latest} <span className="text-sm font-normal text-slate-500">ms</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Baseline Mean</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{range.mean} <span className="text-sm font-normal text-slate-500">ms</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Optimal Range</p>
          <p className="text-2xl font-bold text-indigo-500 mt-1">{range.low}–{range.high} <span className="text-sm font-normal text-slate-500">ms</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Status</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{status}</p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[Math.max(0, range.low - 20), range.high + 20]} />
            <ReferenceArea y1={range.low} y2={range.high} fill="#8b5cf6" fillOpacity={0.12} stroke="none" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              }}
              formatter={(value) => [`${value} ms`, 'HRV']}
            />
            <Line type="monotone" dataKey="rmssd" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <Card
      title="Heart Rate Variability"
      subtitle={`Last ${daysBack} days`}
      category="AUTONOMIC STATUS"
      accentColor="#8B5CF6"
      icon={<Activity className="w-5 h-5 text-purple-400" />}
      iconBg="bg-purple-500/10"
      expandedContent={expandedView}
    >
      <div className="flex items-baseline gap-3 mb-1">
        <p className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
          {latest} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ms</span>
        </p>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusColor}`}>{status}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-normal">
        Your range: {range.low}–{range.high} ms (avg {range.mean})
      </p>
      <div className="h-32 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="hrvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[Math.min(range.low - 10, (chartData[0]?.rmssd || 0) - 10), Math.max(range.high + 10, (chartData[chartData.length - 1]?.rmssd || 0) + 10)]} />
            <ReferenceArea
              y1={range.low}
              y2={range.high}
              fill="#8b5cf6"
              fillOpacity={0.12}
              stroke="none"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { rmssd: number };
                return (
                  <DashboardTooltip
                    active={active}
                    title={label}
                    items={[
                      { label: 'HRV (RMSSD)', value: d.rmssd, unit: 'ms', color: '#8B5CF6' },
                      { label: 'Baseline', value: `${range.low}–${range.high} ms` },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="rmssd"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill="url(#hrvAreaGrad)"
              dot={{ fill: '#8b5cf6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
