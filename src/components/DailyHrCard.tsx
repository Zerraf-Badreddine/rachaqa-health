import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { HeartPulse, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getDailyHeartRate, type HeartRateSample } from '../api/heart-rate';
import { getDailyHeartRateZones } from '../api/cardio';
import type { DailyHeartRateZonesDataPoint } from '../types/health';
import { Card, LoadingCard, ErrorCard, EmptyCard } from './Card';
import { DashboardTooltip } from './common/DashboardTooltip';

interface ZoneThresholds {
  light: number;
  moderate: number;
  vigorous: number;
  peak: number;
}

const DEFAULT_ZONES: ZoneThresholds = { light: 104, moderate: 134, vigorous: 153, peak: 171 };

interface ChartPoint {
  hour: number;
  timeLabel: string;
  bpm: number;
}

function parseZones(zoneDays: DailyHeartRateZonesDataPoint[]): ZoneThresholds | null {
  if (zoneDays.length === 0) return null;
  const latest = zoneDays[zoneDays.length - 1];
  const zoneList = latest.dailyHeartRateZones?.heartRateZones || [];
  const get = (type: string) => {
    const z = zoneList.find((z) => z.heartRateZoneType === type);
    return z ? parseInt(z.minBeatsPerMinute, 10) : 0;
  };
  const light = get('LIGHT');
  const moderate = get('MODERATE');
  const vigorous = get('VIGOROUS');
  const peak = get('PEAK');
  if (light && moderate && vigorous && peak) return { light, moderate, vigorous, peak };
  return null;
}

export function DailyHrCard() {
  const { accessToken } = useAuth();
  const [samples, setSamples] = useState<HeartRateSample[]>([]);
  const [zones, setZones] = useState<ZoneThresholds>(DEFAULT_ZONES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getDailyHeartRate(accessToken, selectedDay),
      getDailyHeartRateZones(accessToken, 7).catch(() => []),
    ])
      .then(([hrSamples, zoneDays]) => {
        setSamples(hrSamples);
        const parsed = parseZones(zoneDays);
        if (parsed) setZones(parsed);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, selectedDay]);

  function prevDay() {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d);
  }

  function nextDay() {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setSelectedDay(d);
  }

  const isToday = selectedDay.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? 'Today'
    : selectedDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  if (loading) return <LoadingCard title="24h Heart Rate" />;
  if (error) return <ErrorCard title="24h Heart Rate" error={error} />;
  if (samples.length === 0) return <EmptyCard title="24h Heart Rate" message="No heart rate telemetry for this day" />;

  const data: ChartPoint[] = samples.map((s) => {
    const d = new Date(s.time);
    const hours = d.getHours() + d.getMinutes() / 60;
    return {
      hour: Math.round(hours * 100) / 100,
      timeLabel: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      bpm: s.bpm,
    };
  });

  const maxBpm = Math.max(...data.map((d) => d.bpm), zones.peak + 10);
  const minBpm = Math.max(40, Math.min(...data.map((d) => d.bpm)) - 5);
  const domainMin = minBpm - 5;
  const domainMax = maxBpm + 5;

  const avgBpm = Math.round(data.reduce((s, d) => s + d.bpm, 0) / data.length);
  const peakBpm = Math.max(...data.map((d) => d.bpm));
  const lowBpm = Math.min(...data.map((d) => d.bpm));

  const navHeader = (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] p-0.5 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
      <button
        onClick={prevDay}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Previous day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-[11px] font-bold px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {dateLabel}
      </span>
      <button
        onClick={nextDay}
        disabled={isToday}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
          isToday
            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
        }`}
        title="Next day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Heart Rate</p>
          <p className="text-3xl font-black text-[#00B0B9] mt-1 tabular-nums">
            {avgBpm} <span className="text-sm font-semibold text-slate-400">bpm</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Peak Heart Rate</p>
          <p className="text-3xl font-black text-rose-500 mt-1 tabular-nums">
            {peakBpm} <span className="text-sm font-semibold text-rose-400/80">bpm</span>
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-500">Lowest Heart Rate</p>
          <p className="text-3xl font-black text-sky-500 mt-1 tabular-nums">
            {lowBpm} <span className="text-sm font-semibold text-sky-400/80">bpm</span>
          </p>
        </div>
      </div>

      <div className="h-80 w-full bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-200/80 dark:border-white/[0.08]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="hrPulseGradientExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <ReferenceArea y1={domainMin} y2={zones.light} fill="#38bdf8" fillOpacity={0.06} />
            <ReferenceArea y1={zones.light} y2={zones.moderate} fill="#10b981" fillOpacity={0.08} />
            <ReferenceArea y1={zones.moderate} y2={zones.vigorous} fill="#f59e0b" fillOpacity={0.1} />
            <ReferenceArea y1={zones.vigorous} y2={domainMax} fill="#f43f5e" fillOpacity={0.12} />

            <ReferenceLine y={zones.moderate} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={zones.vigorous} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={zones.peak} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6} />

            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 24]}
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              ticks={[0, 4, 8, 12, 16, 20, 24]}
              tickFormatter={(v) => `${v}:00`}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              stroke="#94a3b8"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              ticks={[zones.moderate, zones.vigorous, zones.peak]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const pt = payload[0].payload as ChartPoint;
                const zoneName =
                  pt.bpm >= zones.peak
                    ? 'Peak Zone'
                    : pt.bpm >= zones.vigorous
                    ? 'Cardio Zone'
                    : pt.bpm >= zones.moderate
                    ? 'Fat Burn Zone'
                    : 'Light Zone';
                return (
                  <DashboardTooltip
                    active={active}
                    title={pt.timeLabel}
                    items={[
                      { label: 'Heart Rate', value: pt.bpm, unit: 'bpm', color: '#EF4444' },
                      { label: 'Intensity', value: zoneName },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="bpm"
              stroke="#EF4444"
              strokeWidth={2.5}
              fill="url(#hrPulseGradientExp)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-xs">
          <p className="font-bold text-sky-800 dark:text-sky-300">Light Zone</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1">&lt; {zones.moderate} bpm</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs">
          <p className="font-bold text-emerald-800 dark:text-emerald-300">Moderate (Fat Burn)</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{zones.moderate} - {zones.vigorous} bpm</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs">
          <p className="font-bold text-amber-800 dark:text-amber-300">Vigorous (Cardio)</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{zones.vigorous} - {zones.peak} bpm</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs">
          <p className="font-bold text-rose-800 dark:text-rose-300">Peak</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1">&gt; {zones.peak} bpm</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="24h Heart Rate"
      subtitle={dateLabel}
      category="Heart"
      accentColor="#EF4444"
      icon={<HeartPulse className="w-5 h-5 text-rose-500" />}
      iconBg="bg-rose-500/10 text-rose-500"
      headerActions={navHeader}
      expandedContent={expandedView}
    >
      <div className="flex justify-between items-center mb-4 text-xs bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06]">
        <div className="text-center flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Avg Pulse
          </span>
          <span className="font-black text-slate-900 dark:text-white text-base tabular-nums">
            {avgBpm}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 ml-1">bpm</span>
        </div>
        <div className="border-r border-slate-200 dark:border-white/[0.08] h-6" />
        <div className="text-center flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
            Peak Pulse
          </span>
          <span className="font-black text-rose-500 text-base tabular-nums">
            {peakBpm}
          </span>
          <span className="text-[10px] font-semibold text-rose-400/80 ml-1">bpm</span>
        </div>
        <div className="border-r border-slate-200 dark:border-white/[0.08] h-6" />
        <div className="text-center flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500 block">
            Resting
          </span>
          <span className="font-black text-sky-500 text-base tabular-nums">
            {lowBpm}
          </span>
          <span className="text-[10px] font-semibold text-sky-400/80 ml-1">bpm</span>
        </div>
      </div>

      <div className="h-44 flex-1 min-h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="hrPulseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#F59E0B" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <ReferenceArea y1={domainMin} y2={zones.light} fill="#38bdf8" fillOpacity={0.05} />
            <ReferenceArea y1={zones.light} y2={zones.moderate} fill="#10b981" fillOpacity={0.06} />
            <ReferenceArea y1={zones.moderate} y2={zones.vigorous} fill="#f59e0b" fillOpacity={0.08} />
            <ReferenceArea y1={zones.vigorous} y2={domainMax} fill="#f43f5e" fillOpacity={0.1} />

            <ReferenceLine y={lowBpm} stroke="#38bdf8" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={zones.peak} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />

            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 24]}
              stroke="#94a3b8"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              ticks={[0, 6, 12, 18, 24]}
              tickFormatter={(v) => `${v}:00`}
            />
            <YAxis
              domain={[domainMin, domainMax]}
              stroke="#94a3b8"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              ticks={[lowBpm, zones.moderate, zones.peak]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const pt = payload[0].payload as ChartPoint;
                const zoneName =
                  pt.bpm >= zones.peak
                    ? 'Peak'
                    : pt.bpm >= zones.vigorous
                    ? 'Cardio'
                    : pt.bpm >= zones.moderate
                    ? 'Fat Burn'
                    : 'Light';
                return (
                  <DashboardTooltip
                    active={active}
                    title={pt.timeLabel}
                    items={[
                      { label: 'Pulse', value: pt.bpm, unit: 'bpm', color: '#EF4444' },
                      { label: 'Zone', value: zoneName },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="bpm"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#hrPulseGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
          Light (&lt;{zones.moderate})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
          Fat Burn ({zones.moderate}–{zones.vigorous})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          Cardio ({zones.vigorous}–{zones.peak})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
          Peak (&gt;{zones.peak})
        </span>
      </div>
    </Card>
  );
}
