import { useEffect, useState } from 'react';
import { Footprints, Flame, Zap, Moon, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getStepsDaily, getCaloriesDaily } from '../../api/activity';
import { getActiveZoneMinutesDaily } from '../../api/cardio';
import { getSleepData } from '../../api/sleep';
import { FitbitRing } from './FitbitRing';
import { calcSleepScore } from '../../utils/sleep-score';

export function TodayHero() {
  const { accessToken } = useAuth();
  const [steps, setSteps] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [calories, setCalories] = useState(0);
  const [azm, setAzm] = useState(0);
  const [sleepMins, setSleepMins] = useState(0);
  const [sleepScore, setSleepScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const stepGoal = 10000;

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getStepsDaily(accessToken, 1),
      getActiveZoneMinutesDaily(accessToken, 1),
      getCaloriesDaily(accessToken, 1),
      getSleepData(accessToken, 1),
    ]).then(([stepsRes, azmRes, calRes, sleepRes]) => {
      if (stepsRes.status === 'fulfilled' && stepsRes.value.length > 0) {
        const latest = stepsRes.value[stepsRes.value.length - 1];
        const count = parseInt(latest.steps?.countSum || (latest.steps as any)?.stepsCountSum || '0', 10);
        setSteps(count);
        // Estimate distance in km: ~0.762m per step
        setDistanceKm(Number(((count * 0.762) / 1000).toFixed(1)));
      }

      if (azmRes.status === 'fulfilled' && azmRes.value.length > 0) {
        const latest = azmRes.value[azmRes.value.length - 1];
        const fat = parseInt(latest.activeZoneMinutes?.sumInFatBurnHeartZone || '0', 10);
        const cardio = parseInt(latest.activeZoneMinutes?.sumInCardioHeartZone || '0', 10);
        const peak = parseInt(latest.activeZoneMinutes?.sumInPeakHeartZone || '0', 10);
        setAzm(fat + cardio * 2 + peak * 2);
      }

      if (calRes.status === 'fulfilled' && calRes.value.length > 0) {
        const latest = calRes.value[calRes.value.length - 1];
        const total = Number(latest.basalEnergyBurned?.kcalSum || latest.calories?.kcalSum || 0);
        setCalories(Math.round(total));
      }

      if (sleepRes.status === 'fulfilled' && sleepRes.value.length > 0) {
        const latest = sleepRes.value[sleepRes.value.length - 1];
        const mins = parseInt(latest.sleep.summary?.minutesAsleep || '0', 10);
        setSleepMins(mins);
        const stages = latest.sleep.summary?.stagesSummary || [];
        const get = (type: string) => parseInt(stages.find((s) => s.type === type)?.minutes || '0', 10);
        setSleepScore(calcSleepScore(get('DEEP'), get('REM'), get('LIGHT'), get('AWAKE')));
      }

      setLoading(false);
    });
  }, [accessToken]);

  const stepProgress = steps / stepGoal;
  const remainingSteps = Math.max(0, stepGoal - steps);

  return (
    <div className="glass-card relative overflow-hidden rounded-[32px] bg-white dark:bg-[#181E24] border border-slate-200/80 dark:border-white/[0.08] p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] mb-8 transition-all">
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <FitbitRing
            progress={stepProgress}
            size={148}
            strokeWidth={12}
            color="#FF7043"
            className="flex-shrink-0 drop-shadow-sm"
          >
            <Footprints className="w-6 h-6 text-[#FF7043] mb-1" />
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {loading ? '...' : steps.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              steps
            </span>
          </FitbitRing>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00B0B9]/10 text-[#00B0B9] dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Today's Activity</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {stepProgress >= 1 ? 'Daily Goal Achieved!' : `${Math.round(stepProgress * 100)}% of your daily goal`}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              {stepProgress >= 1 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Exceeded target by {(steps - stepGoal).toLocaleString()} steps
                </span>
              ) : (
                <span>
                  <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{remainingSteps.toLocaleString()}</strong> steps remaining to reach {stepGoal.toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 dark:border-white/[0.06] flex flex-col items-center text-center hover:border-amber-400/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
              <Zap className="w-5 h-5" />
            </div>
            <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{loading ? '—' : azm}</p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Active Min</p>
          </div>

          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 dark:border-white/[0.06] flex flex-col items-center text-center hover:border-orange-400/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF7043] flex items-center justify-center mb-2">
              <Flame className="w-5 h-5" />
            </div>
            <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{loading ? '—' : (calories > 0 ? calories.toLocaleString() : '—')}</p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Calories (kcal)</p>
          </div>

          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 dark:border-white/[0.06] flex flex-col items-center text-center hover:border-teal-400/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#00B0B9] flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">{loading ? '—' : `${distanceKm}`}</p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Distance (km)</p>
          </div>

          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-slate-200/70 dark:border-white/[0.06] flex flex-col items-center text-center hover:border-indigo-400/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Moon className="w-5 h-5" />
            </div>
            <p className="font-mono text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {loading ? '—' : sleepMins > 0 ? `${Math.floor(sleepMins / 60)}h ${sleepMins % 60}m` : '—'}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {sleepScore ? `Sleep Score (${sleepScore})` : 'Sleep Duration'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
