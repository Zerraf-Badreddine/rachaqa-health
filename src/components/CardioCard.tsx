import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie } from 'recharts';
import { Zap, Heart } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  getActiveMinutesDaily,
  getActiveZoneMinutesDaily,
  getDailyHeartRateZones,
  getDailyVo2Max,
  getTimeInHeartRateZoneDaily,
} from '../api/cardio';
import { useDateRange } from '../context/DateRangeContext';
import type {
  ActiveMinutesRollupDataPoint,
  ActiveZoneMinutesRollupDataPoint,
  DailyHeartRateZonesDataPoint,
  DailyVo2MaxDataPoint,
  TimeInHeartRateZoneRollupDataPoint,
} from '../types/health';
import { Card, EmptyCard, ErrorCard, LoadingCard } from './Card';

interface DayData {
  date: string;
  fatBurnAzm: number;
  cardioAzm: number;
  peakAzm: number;
  activeLight: number;
  activeModerate: number;
  activeVigorous: number;
  zoneModerate: number;
  zoneVigorous: number;
  zonePeak: number;
}

interface ZoneTotals {
  light: number;
  moderate: number;
  vigorous: number;
  peak: number;
}

interface ActiveTotals {
  light: number;
  moderate: number;
  vigorous: number;
}

const ZONE_COLORS = {
  fatBurn: '#10B981',
  cardio: '#F59E0B',
  peak: '#EF4444',
  activeLight: '#00B0B9',
  moderate: '#F59E0B',
  vigorous: '#F43F5E',
};

function dateLabel(point: { civilStartTime?: { date: { month: number; day: number } } }) {
  const d = point.civilStartTime?.date;
  return d ? `${d.month}/${d.day}` : '?';
}

function dateLabelFromDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateKeyFromPoint(point: {
  civilStartTime?: { date: { year: number; month: number; day: number } };
  civilEndTime?: { date: { year: number; month: number; day: number } };
  startTime?: string;
}) {
  const d = point.civilStartTime?.date;
  if (d) return dateKey(d.year, d.month, d.day);
  const end = point.civilEndTime?.date;
  if (end) return dateKey(end.year, end.month, end.day);
  if (!point.startTime) return null;
  const start = new Date(point.startTime);
  return dateKey(start.getFullYear(), start.getMonth() + 1, start.getDate());
}

function getVisibleDates(daysBack: number) {
  return Array.from({ length: daysBack }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (daysBack - 1 - index));
    return date;
  });
}

function parseIntValue(value?: string) {
  return parseInt(value || '0', 10) || 0;
}

function parseGoogleDurationMinutes(duration?: string) {
  if (!duration) return 0;
  const match = duration.match(/^(-?\d+(?:\.\d+)?)s$/);
  return match ? Number(match[1]) / 60 : 0;
}

function labelFitnessLevel(level?: string) {
  if (!level || level === 'CARDIO_FITNESS_LEVEL_UNSPECIFIED') return 'Unknown';
  return level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function latestByDate<T extends { [key: string]: any }>(items: T[], key: keyof T): T | undefined {
  return [...items].sort((a, b) => {
    const da = a[key]?.date;
    const db = b[key]?.date;
    const av = da ? new Date(da.year, da.month - 1, da.day).getTime() : 0;
    const bv = db ? new Date(db.year, db.month - 1, db.day).getTime() : 0;
    return bv - av;
  })[0];
}

function CardioTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as DayData;

  return (
    <div className="bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700/60 rounded-2xl px-4 py-3 text-xs shadow-xl backdrop-blur-sm">
      <p className="text-white font-semibold mb-2">{label}</p>
      <div className="space-y-1">
        <p className="text-[#00B0B9] flex justify-between gap-3"><span>Light active:</span> <b>{data.activeLight}m</b></p>
        <p className="text-amber-400 flex justify-between gap-3"><span>Moderate active:</span> <b>{data.activeModerate}m</b></p>
        <p className="text-rose-400 flex justify-between gap-3"><span>Vigorous active:</span> <b>{data.activeVigorous}m</b></p>
        <div className="border-t border-slate-700 my-1.5" />
        <p className="text-slate-300 flex justify-between gap-3"><span>Moderate HR zone:</span> <b>{Math.round(data.zoneModerate)}m</b></p>
        <p className="text-slate-300 flex justify-between gap-3"><span>Vigorous HR zone:</span> <b>{Math.round(data.zoneVigorous)}m</b></p>
        <p className="text-red-400 flex justify-between gap-3"><span>Peak HR zone:</span> <b>{Math.round(data.zonePeak)}m</b></p>
        <div className="border-t border-slate-700 my-1.5" />
        <p className="text-emerald-400 flex justify-between gap-3"><span>Fat burn AZM:</span> <b>{data.fatBurnAzm}</b></p>
        <p className="text-orange-400 flex justify-between gap-3"><span>Cardio AZM:</span> <b>{data.cardioAzm}</b></p>
        <p className="text-rose-400 flex justify-between gap-3"><span>Peak AZM:</span> <b>{data.peakAzm}</b></p>
      </div>
    </div>
  );
}

export function CardioCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [azmData, setAzmData] = useState<DayData[]>([]);
  const [zoneTotals, setZoneTotals] = useState<ZoneTotals>({ light: 0, moderate: 0, vigorous: 0, peak: 0 });
  const [activeTotals, setActiveTotals] = useState<ActiveTotals>({ light: 0, moderate: 0, vigorous: 0 });
  const [latestVo2, setLatestVo2] = useState<DailyVo2MaxDataPoint | undefined>();
  const [latestZones, setLatestZones] = useState<DailyHeartRateZonesDataPoint | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    Promise.allSettled([
      getActiveZoneMinutesDaily(accessToken, daysBack),
      getTimeInHeartRateZoneDaily(accessToken, daysBack),
      getActiveMinutesDaily(accessToken, daysBack),
      getDailyVo2Max(accessToken, Math.max(daysBack, 30)),
      getDailyHeartRateZones(accessToken, Math.max(daysBack, 30)),
    ])
      .then(([azm, heartZones, activeMinutes, vo2, zones]) => {
        const failures = [azm, heartZones, activeMinutes, vo2, zones].filter((r) => r.status === 'rejected');
        if (failures.length === 5) {
          throw new Error(failures[0].reason?.message || 'Cardio metrics are unavailable');
        }

        const activePoints = activeMinutes.status === 'fulfilled' ? activeMinutes.value as ActiveMinutesRollupDataPoint[] : [];
        const active: ActiveTotals = { light: 0, moderate: 0, vigorous: 0 };
        const activeByDate = new Map<string, Pick<DayData, 'activeLight' | 'activeModerate' | 'activeVigorous'>>();
        for (const point of activePoints) {
          const key = dateKeyFromPoint(point);
          if (!key) continue;
          const dayActive = activeByDate.get(key) || { activeLight: 0, activeModerate: 0, activeVigorous: 0 };
          for (const item of point.activeMinutes?.activeMinutesRollupByActivityLevel || []) {
            const minutes = parseIntValue(item.activeMinutesSum);
            if (item.activityLevel === 'LIGHT') {
              active.light += minutes;
              dayActive.activeLight += minutes;
            }
            if (item.activityLevel === 'MODERATE') {
              active.moderate += minutes;
              dayActive.activeModerate += minutes;
            }
            if (item.activityLevel === 'VIGOROUS') {
              active.vigorous += minutes;
              dayActive.activeVigorous += minutes;
            }
          }
          activeByDate.set(key, dayActive);
        }
        setActiveTotals(active);

        const timePoints = heartZones.status === 'fulfilled' ? heartZones.value as TimeInHeartRateZoneRollupDataPoint[] : [];
        const totals: ZoneTotals = { light: 0, moderate: 0, vigorous: 0, peak: 0 };
        const zonesByDate = new Map<string, Pick<DayData, 'zoneModerate' | 'zoneVigorous' | 'zonePeak'>>();
        for (const point of timePoints) {
          const key = dateKeyFromPoint(point);
          const dayZones = key ? zonesByDate.get(key) || { zoneModerate: 0, zoneVigorous: 0, zonePeak: 0 } : null;
          for (const zone of point.timeInHeartRateZone?.timeInHeartRateZones || []) {
            const minutes = parseGoogleDurationMinutes(zone.duration);
            if (zone.heartRateZone === 'LIGHT') totals.light += minutes;
            if (zone.heartRateZone === 'MODERATE') {
              totals.moderate += minutes;
              if (dayZones) dayZones.zoneModerate += minutes;
            }
            if (zone.heartRateZone === 'VIGOROUS') {
              totals.vigorous += minutes;
              if (dayZones) dayZones.zoneVigorous += minutes;
            }
            if (zone.heartRateZone === 'PEAK') {
              totals.peak += minutes;
              if (dayZones) dayZones.zonePeak += minutes;
            }
          }
          if (key && dayZones) zonesByDate.set(key, dayZones);
        }
        setZoneTotals(totals);

        const azmPoints = azm.status === 'fulfilled' ? azm.value as ActiveZoneMinutesRollupDataPoint[] : [];
        const azmByDate = new Map<string, DayData>();
        for (const point of azmPoints) {
          const key = dateKeyFromPoint(point);
          if (!key) continue;
          const activeForDay = activeByDate.get(key) || { activeLight: 0, activeModerate: 0, activeVigorous: 0 };
          const zonesForDay = zonesByDate.get(key) || { zoneModerate: 0, zoneVigorous: 0, zonePeak: 0 };
          azmByDate.set(key, {
            date: dateLabel(point),
            fatBurnAzm: parseIntValue(point.activeZoneMinutes?.sumInFatBurnHeartZone),
            cardioAzm: parseIntValue(point.activeZoneMinutes?.sumInCardioHeartZone),
            peakAzm: parseIntValue(point.activeZoneMinutes?.sumInPeakHeartZone),
            ...activeForDay,
            ...zonesForDay,
          });
        }
        setAzmData(getVisibleDates(daysBack).map((date) => {
          const key = dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
          const activeForDay = activeByDate.get(key) || { activeLight: 0, activeModerate: 0, activeVigorous: 0 };
          const zonesForDay = zonesByDate.get(key) || { zoneModerate: 0, zoneVigorous: 0, zonePeak: 0 };
          return azmByDate.get(key) || {
            date: dateLabelFromDate(date),
            fatBurnAzm: 0,
            cardioAzm: 0,
            peakAzm: 0,
            ...activeForDay,
            ...zonesForDay,
          };
        }));

        setLatestVo2(vo2.status === 'fulfilled' ? latestByDate(vo2.value as DailyVo2MaxDataPoint[], 'dailyVo2Max') : undefined);
        setLatestZones(zones.status === 'fulfilled' ? latestByDate(zones.value as DailyHeartRateZonesDataPoint[], 'dailyHeartRateZones') : undefined);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Cardio" />;
  if (error) return <ErrorCard title="Cardio" error={error} />;

  const totalAzm = azmData.reduce((sum, d) => sum + d.fatBurnAzm + d.cardioAzm + d.peakAzm, 0);
  const cardioZoneMinutes = zoneTotals.moderate + zoneTotals.vigorous + zoneTotals.peak;
  const totalActiveMinutes = activeTotals.light + activeTotals.moderate + activeTotals.vigorous;

  if (totalAzm === 0 && cardioZoneMinutes === 0 && totalActiveMinutes === 0 && !latestVo2 && !latestZones) {
    return <EmptyCard title="Cardio" />;
  }

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Zone Min</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalAzm}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">VO2 Max</p>
          <p className="text-2xl font-bold text-[#00B0B9] mt-1">{latestVo2 ? latestVo2.dailyVo2Max.vo2Max.toFixed(1) : '—'}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Cardio Zone Min</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{Math.round(cardioZoneMinutes)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Active Min</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalActiveMinutes}</p>
        </div>
      </div>

      <div className="h-72 w-full bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={azmData}>
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip content={<CardioTooltip />} />
            <Bar dataKey="activeLight" name="Light Active" stackId="active" fill={ZONE_COLORS.activeLight} radius={[0, 0, 4, 4]} />
            <Bar dataKey="activeModerate" name="Moderate" stackId="active" fill={ZONE_COLORS.moderate} />
            <Bar dataKey="activeVigorous" name="Vigorous" stackId="active" fill={ZONE_COLORS.vigorous} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Daily Breakdown</h4>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
          {azmData.slice().reverse().map((day, idx) => {
            const dayTotal = day.activeLight + day.activeModerate + day.activeVigorous;
            return (
              <div key={idx} className="flex justify-between items-center py-2.5 px-4 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{day.date}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">L: {day.activeLight}m</span>
                  <span className="text-amber-500 font-medium">M: {day.activeModerate}m</span>
                  <span className="text-rose-500 font-medium">V: {day.activeVigorous}m</span>
                  <span className="font-bold text-slate-900 dark:text-white pl-2">{dayTotal}m</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Cardio"
      subtitle={`Last ${daysBack} days`}
      category="ENDURANCE & AZM"
      accentColor="#F59E0B"
      icon={<Zap className="w-5 h-5 text-amber-500" />}
      iconBg="bg-amber-500/10"
      expandedContent={expandedView}
    >
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06] hover:border-emerald-500/40 transition-colors">
          <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{totalAzm}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">Active Zone Min</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06] hover:border-teal-500/40 transition-colors">
          <p className="font-mono text-2xl font-black text-[#00B0B9] tabular-nums">{latestVo2 ? latestVo2.dailyVo2Max.vo2Max.toFixed(1) : '—'}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 mt-0.5">VO2 Max Score</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/40 transition-colors">
          <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{Math.round(cardioZoneMinutes)}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-0.5">Cardio Zone Min</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-3 border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-500/40 transition-colors">
          <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{totalActiveMinutes}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">Total Active Min</p>
        </div>
      </div>

      {azmData.length > 0 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={azmData}>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CardioTooltip />} />
              <Bar dataKey="activeLight" stackId="active" fill={ZONE_COLORS.activeLight} radius={[0, 0, 4, 4]} />
              <Bar dataKey="activeModerate" stackId="active" fill={ZONE_COLORS.moderate} />
              <Bar dataKey="activeVigorous" stackId="active" fill={ZONE_COLORS.vigorous} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function HeartZonesCard() {
  const { accessToken } = useAuth();
  const { daysBack } = useDateRange();
  const [zoneTotals, setZoneTotals] = useState<ZoneTotals>({ light: 0, moderate: 0, vigorous: 0, peak: 0 });
  const [latestVo2, setLatestVo2] = useState<DailyVo2MaxDataPoint | undefined>();
  const [latestZones, setLatestZones] = useState<DailyHeartRateZonesDataPoint | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    Promise.allSettled([
      getTimeInHeartRateZoneDaily(accessToken, daysBack),
      getDailyVo2Max(accessToken, Math.max(daysBack, 30)),
      getDailyHeartRateZones(accessToken, Math.max(daysBack, 30)),
    ])
      .then(([heartZones, vo2, zones]) => {
        const failures = [heartZones, vo2, zones].filter((r) => r.status === 'rejected');
        if (failures.length === 3) {
          throw new Error(failures[0].reason?.message || 'Heart zone metrics are unavailable');
        }

        const timePoints = heartZones.status === 'fulfilled' ? heartZones.value as TimeInHeartRateZoneRollupDataPoint[] : [];
        const totals: ZoneTotals = { light: 0, moderate: 0, vigorous: 0, peak: 0 };
        for (const point of timePoints) {
          for (const zone of point.timeInHeartRateZone?.timeInHeartRateZones || []) {
            const minutes = parseGoogleDurationMinutes(zone.duration);
            if (zone.heartRateZone === 'LIGHT') totals.light += minutes;
            if (zone.heartRateZone === 'MODERATE') totals.moderate += minutes;
            if (zone.heartRateZone === 'VIGOROUS') totals.vigorous += minutes;
            if (zone.heartRateZone === 'PEAK') totals.peak += minutes;
          }
        }
        setZoneTotals(totals);
        setLatestVo2(vo2.status === 'fulfilled' ? latestByDate(vo2.value as DailyVo2MaxDataPoint[], 'dailyVo2Max') : undefined);
        setLatestZones(zones.status === 'fulfilled' ? latestByDate(zones.value as DailyHeartRateZonesDataPoint[], 'dailyHeartRateZones') : undefined);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, daysBack]);

  if (loading) return <LoadingCard title="Heart Zones" />;
  if (error) return <ErrorCard title="Heart Zones" error={error} />;

  const cardioZoneMinutes = zoneTotals.moderate + zoneTotals.vigorous + zoneTotals.peak;

  if (cardioZoneMinutes === 0 && !latestVo2 && !latestZones) {
    return <EmptyCard title="Heart Zones" />;
  }

  const pieData = [
    { name: 'Moderate', value: Math.round(zoneTotals.moderate), color: ZONE_COLORS.moderate },
    { name: 'Vigorous', value: Math.round(zoneTotals.vigorous), color: ZONE_COLORS.vigorous },
    { name: 'Peak', value: Math.round(zoneTotals.peak), color: ZONE_COLORS.peak },
  ].filter((d) => d.value > 0);

  const expandedView = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cardio Minutes</p>
          <p className="text-3xl font-bold text-[#00B0B9] mt-1">{Math.round(cardioZoneMinutes)}m</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fitness Level</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{labelFitnessLevel(latestVo2?.dailyVo2Max.cardioFitnessLevel)}</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">VO2 Max Score</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{latestVo2 ? latestVo2.dailyVo2Max.vo2Max.toFixed(1) : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {pieData.length > 0 ? (
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(val) => [`${val} min`, 'Duration']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            No zone data recorded
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zone Breakdown</h4>
          {[
            ['Moderate', zoneTotals.moderate, ZONE_COLORS.moderate],
            ['Vigorous', zoneTotals.vigorous, ZONE_COLORS.vigorous],
            ['Peak', zoneTotals.peak, ZONE_COLORS.peak],
          ].map(([label, minutes, color]) => {
            const pct = cardioZoneMinutes > 0 ? (Number(minutes) / cardioZoneMinutes) * 100 : 0;
            return (
              <div key={label as string} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color as string }} />
                    {label}
                  </span>
                  <span>{Math.round(Number(minutes))}m ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color as string }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Heart Rate Ranges</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {latestZones?.dailyHeartRateZones.heartRateZones
            .filter((zone) => zone.heartRateZoneType !== 'HEART_RATE_ZONE_TYPE_UNSPECIFIED')
            .map((zone) => (
              <div key={zone.heartRateZoneType} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700/60">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {zone.heartRateZoneType.replace(/_/g, ' ')}
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {zone.minBeatsPerMinute} - {zone.maxBeatsPerMinute} <span className="text-xs font-normal text-slate-400">bpm</span>
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      title="Heart Zones"
      subtitle="Moderate and above"
      category="INTENSITY DISTRIBUTION"
      accentColor="#EC4899"
      icon={<Heart className="w-5 h-5 text-pink-500" />}
      iconBg="bg-pink-500/10"
      expandedContent={expandedView}
    >
      <div className="space-y-3 text-xs mb-4">
        {[
          ['Moderate', zoneTotals.moderate, ZONE_COLORS.moderate],
          ['Vigorous', zoneTotals.vigorous, ZONE_COLORS.vigorous],
          ['Peak', zoneTotals.peak, ZONE_COLORS.peak],
        ].map(([label, minutes, color]) => {
          const pct = cardioZoneMinutes > 0 ? (Number(minutes) / cardioZoneMinutes) * 100 : 0;
          return (
            <div key={label as string}>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1 font-medium">
                <span>{label}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(Number(minutes))}m</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color as string }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto text-xs">
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/[0.06]">
          <p className="text-slate-900 dark:text-white font-bold truncate">{labelFitnessLevel(latestVo2?.dailyVo2Max.cardioFitnessLevel)}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">fitness level</p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-slate-200/80 dark:border-white/[0.06]">
          <p className="font-mono text-slate-900 dark:text-white font-bold tabular-nums">{Math.round(cardioZoneMinutes)}m</p>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">cardio total</p>
        </div>
      </div>
    </Card>
  );
}
