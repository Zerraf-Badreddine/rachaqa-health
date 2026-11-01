import { useEffect, useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Heart } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getRestingHrData } from '../api/resting-hr';
import type { RestingHrDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { useDateRange } from '../context/DateRangeContext';
import { DashboardTooltip } from './common/DashboardTooltip';

export function RestingHrCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [data, setData] = useState<RestingHrDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getRestingHrData(accessToken, daysBack)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Resting Heart Rate" />;
  if (error) return <ErrorCard title="Resting Heart Rate" error={error} />;
  if (data.length === 0) return <EmptyCard title="Resting Heart Rate" message="No resting heart rate data found" />;

  const chartData = data
    .map((d) => ({
      date: `${d.dailyRestingHeartRate.date.month}/${d.dailyRestingHeartRate.date.day}`,
      bpm: parseInt(d.dailyRestingHeartRate.beatsPerMinute || '0', 10),
    }))
    .reverse();

  const latest = chartData[chartData.length - 1]?.bpm || 0;
  const avgBpm = Math.round(chartData.reduce((s, d) => s + d.bpm, 0) / (chartData.length || 1));
  const minBpm = Math.min(...chartData.map((d) => d.bpm));
  const maxBpm = Math.max(...chartData.map((d) => d.bpm));

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Latest RHR</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{latest} <span className="text-sm font-normal text-slate-500">bpm</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Period Average</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{avgBpm} <span className="text-sm font-normal text-slate-500">bpm</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lowest RHR</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{minBpm} <span className="text-sm font-normal text-slate-500">bpm</span></p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Highest RHR</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{maxBpm} <span className="text-sm font-normal text-slate-500">bpm</span></p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
              }}
              formatter={(val) => [`${val} bpm`, 'Resting HR']}
            />
            <Line type="monotone" dataKey="bpm" stroke="#FF5A36" strokeWidth={3} dot={{ fill: '#FF5A36', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <Card
      title="Resting Heart Rate"
      subtitle={`Last ${daysBack} days`}
      category="VITAL BASELINE"
      accentColor="#F43F5E"
      icon={<Heart className="w-5 h-5 text-rose-500" />}
      iconBg="bg-rose-500/10"
      expandedContent={expandedView}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {latest}
          </p>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">bpm</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">Min {minBpm}</span>
          <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px]">Max {maxBpm}</span>
          <span className="text-slate-400 text-[11px]">Avg {avgBpm}</span>
        </div>
      </div>
      <div className="h-32 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="rhrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
            <ReferenceLine y={avgBpm} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.4} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { bpm: number };
                return (
                  <DashboardTooltip
                    active={active}
                    title={label}
                    items={[
                      { label: 'Resting HR', value: d.bpm, unit: 'bpm', color: '#F43F5E' },
                      { label: 'Period Avg', value: avgBpm, unit: 'bpm' },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="bpm"
              stroke="#F43F5E"
              strokeWidth={2.5}
              fill="url(#rhrAreaGrad)"
              dot={{ fill: '#F43F5E', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
