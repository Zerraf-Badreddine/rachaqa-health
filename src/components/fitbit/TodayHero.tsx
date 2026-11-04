import { useEffect, useState } from 'react';
import {
  Footprints,
  Flame,
  Zap,
  Moon,
  Sparkles,
  MapPin,
  Dumbbell,
  Clock,
  Plus,
  Play,
  Pencil,
  Check,
  X,
  Droplets,
  Scale,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getStepsDaily, getCaloriesDaily } from '../../api/activity';
import { getActiveZoneMinutesDaily } from '../../api/cardio';
import { getSleepData } from '../../api/sleep';
import { listExercises } from '../../api/exercise';
import { FitbitRing } from './FitbitRing';
import { calcSleepScore } from '../../utils/sleep-score';

export function TodayHero() {
  const { accessToken } = useAuth();
  const [steps, setSteps] = useState(6984);
  const [distanceKm, setDistanceKm] = useState(5.4);
  const [distanceMiles, setDistanceMiles] = useState(3.35);
  const [calories, setCalories] = useState(2894);
  const [azm, setAzm] = useState(42);
  const [weeklyAzm, setWeeklyAzm] = useState(541);
  const [weeklyAzmGoal] = useState(484);
  const [sleepMins, setSleepMins] = useState(453); // 7h 33m
  const [sleepScore, setSleepScore] = useState<number | null>(82);
  const [readinessScore, setReadinessScore] = useState(78);
  const [exerciseDays, setExerciseDays] = useState(6);
  const [activeHours] = useState(5);
  const [loading, setLoading] = useState(true);

  // Carousel view: 0 = Weekly Cardio Dial (Dark/Light screenshot 1 & 3), 1 = Mint Steps Hero (screenshot 2)
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Modals state
  const [showLogModal, setShowLogModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);

  const stepGoal = 10000;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (workoutActive) {
      timer = setInterval(() => setWorkoutSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [workoutActive]);

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getStepsDaily(accessToken, 7),
      getActiveZoneMinutesDaily(accessToken, 7),
      getCaloriesDaily(accessToken, 1),
      getSleepData(accessToken, 1),
      listExercises(accessToken, 7),
    ]).then(([stepsRes, azmRes, calRes, sleepRes, exRes]) => {
      if (stepsRes.status === 'fulfilled' && stepsRes.value.length > 0) {
        const latest = stepsRes.value[stepsRes.value.length - 1];
        const count = parseInt(latest.steps?.countSum || (latest.steps as any)?.stepsCountSum || '0', 10);
        if (count > 0) {
          setSteps(count);
          const km = Number(((count * 0.762) / 1000).toFixed(1));
          setDistanceKm(km);
          setDistanceMiles(Number((km * 0.621371).toFixed(2)));
        }
      }

      if (azmRes.status === 'fulfilled' && azmRes.value.length > 0) {
        let weeklyTotal = 0;
        azmRes.value.forEach((d) => {
          const fat = parseInt(d.activeZoneMinutes?.sumInFatBurnHeartZone || '0', 10);
          const cardio = parseInt(d.activeZoneMinutes?.sumInCardioHeartZone || '0', 10);
          const peak = parseInt(d.activeZoneMinutes?.sumInPeakHeartZone || '0', 10);
          weeklyTotal += fat + cardio * 2 + peak * 2;
        });
        if (weeklyTotal > 0) setWeeklyAzm(weeklyTotal);

        const latest = azmRes.value[azmRes.value.length - 1];
        const fat = parseInt(latest.activeZoneMinutes?.sumInFatBurnHeartZone || '0', 10);
        const cardio = parseInt(latest.activeZoneMinutes?.sumInCardioHeartZone || '0', 10);
        const peak = parseInt(latest.activeZoneMinutes?.sumInPeakHeartZone || '0', 10);
        const todayAzm = fat + cardio * 2 + peak * 2;
        if (todayAzm > 0) setAzm(todayAzm);
      }

      if (calRes.status === 'fulfilled' && calRes.value.length > 0) {
        const latest = calRes.value[calRes.value.length - 1];
        const total = Number(latest.basalEnergyBurned?.kcalSum || latest.calories?.kcalSum || 0);
        if (total > 0) setCalories(Math.round(total));
      }

      if (sleepRes.status === 'fulfilled' && sleepRes.value.length > 0) {
        const latest = sleepRes.value[sleepRes.value.length - 1];
        const mins = parseInt(latest.sleep.summary?.minutesAsleep || '0', 10);
        if (mins > 0) setSleepMins(mins);
        const stages = latest.sleep.summary?.stagesSummary || [];
        const get = (type: string) => parseInt(stages.find((s) => s.type === type)?.minutes || '0', 10);
        const score = calcSleepScore(get('DEEP'), get('REM'), get('LIGHT'), get('AWAKE'));
        if (score) {
          setSleepScore(score);
          setReadinessScore(Math.min(99, Math.max(45, Math.round(score * 0.95 + 4))));
        }
      }

      if (exRes.status === 'fulfilled' && exRes.value.length > 0) {
        setExerciseDays(Math.min(7, exRes.value.length));
      }

      setLoading(false);
    });
  }, [accessToken]);

  const weeklyCardioPct = Math.round((weeklyAzm / weeklyAzmGoal) * 100);
  const cardioDiff = weeklyAzm - weeklyAzmGoal;
  const cardioBadge = cardioDiff >= 0 ? `+${cardioDiff}` : `${cardioDiff}`;

  const sleepHours = Math.floor(sleepMins / 60);
  const sleepRemMins = sleepMins % 60;
  const sleepQuality = (sleepScore || 80) >= 80 ? 'Good' : (sleepScore || 80) >= 65 ? 'Fair' : 'Poor';

  return (
    <div className="mb-8 select-none">
      {/* Top action row: Edit button */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Today's Overview
        </span>
        <button
          onClick={() => setCarouselIndex((prev) => (prev === 0 ? 1 : 0))}
          className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Switch style view"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Hero Container: Authentic Fitbit Redesign */}
      <div className="relative overflow-hidden rounded-[32px] bg-white dark:bg-[#11161B] border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all">
        {carouselIndex === 0 ? (
          /* View A: Weekly Cardio Ring + 3 Stacked Pills (Screenshot 1 & 3) */
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Weekly Cardio Dial */}
            <div className="flex flex-col items-center justify-center p-3">
              <FitbitRing
                progress={weeklyCardioPct / 100}
                size={180}
                strokeWidth={18}
                gradientColors={['#2AD352', '#52E394']}
                bgColor="rgba(255,255,255,0.08)"
                innerBg="rgba(17, 40, 30, 0.95)"
                badgeText={cardioBadge}
                badgeBg="#52E394"
                badgeTextColor="#042E16"
                className="drop-shadow-md"
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300/90">
                    Weekly cardio
                  </span>
                  <span className="text-4xl font-black tracking-tight text-white tabular-nums my-0.5">
                    {weeklyCardioPct}%
                  </span>
                  <span className="text-xs font-semibold text-slate-300 tabular-nums">
                    {weeklyAzm} of {weeklyAzmGoal}
                  </span>
                </div>
              </FitbitRing>
            </div>

            {/* Right: 3 Stacked Metric Pills */}
            <div className="flex flex-col gap-3 w-full lg:max-w-md flex-1">
              {/* Pill 1: Steps */}
              <div className="rounded-[24px] bg-[#D1F4ED] dark:bg-[#0B383D] border border-[#A3EAD8] dark:border-[#115057] p-3.5 flex items-center gap-4 transition-all hover:scale-[1.01]">
                <div className="w-12 h-12 rounded-full bg-[#A3EAD8] dark:bg-[#022428] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Footprints className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#004F47] dark:text-teal-200/90">Steps</p>
                  <p className="text-2xl font-black text-[#003833] dark:text-white tabular-nums tracking-tight">
                    {loading ? '...' : steps.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Pill 2: Readiness */}
              <div className="rounded-[24px] bg-[#D4F4E2] dark:bg-[#0D3823] border border-[#A9E8C2] dark:border-[#145334] p-3.5 flex items-center gap-4 transition-all hover:scale-[1.01]">
                <div className="w-12 h-12 rounded-full bg-[#A9E8C2] dark:bg-[#052416] text-[#0A532C] dark:text-[#52E394] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#0A532C] dark:text-emerald-200/90">Readiness</p>
                  <p className="text-2xl font-black text-[#07381E] dark:text-white tabular-nums tracking-tight">
                    {readinessScore}
                  </p>
                </div>
              </div>

              {/* Pill 3: Total Sleep */}
              <div className="rounded-[24px] bg-[#ECE2FA] dark:bg-[#36195A] border border-[#D6C1F5] dark:border-[#4E247D] p-3.5 flex items-center gap-4 transition-all hover:scale-[1.01]">
                <div className="w-12 h-12 rounded-full bg-[#D6C1F5] dark:bg-[#230E3D] text-[#4A1D7E] dark:text-[#C59DFE] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Moon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#4A1D7E] dark:text-purple-200/90">Total sleep</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-[#321257] dark:text-white tabular-nums tracking-tight">
                      {sleepHours}h {sleepRemMins}m
                    </p>
                    <span className="text-xs font-bold text-[#6B32A8] dark:text-purple-300/80">
                      {sleepScore} • {sleepQuality}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* View B: Mint Steps Hero Card + 3 Stacked Pills (Screenshot 2) */
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
            {/* Mint Green Steps Hero Card */}
            <div className="rounded-[28px] bg-[#4CD7C5] dark:bg-[#0F564F] text-[#00383C] dark:text-[#D1F9F3] p-6 sm:p-8 flex flex-col justify-between flex-1 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-white/40 dark:bg-black/20 flex items-center justify-center text-[#00383C] dark:text-white mb-6">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-wide block mb-1">Steps</span>
                <p className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-[#002B2E] dark:text-white">
                  {steps.toLocaleString()}
                </p>
                <p className="text-sm font-semibold opacity-85 mt-1">
                  of {stepGoal.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right: 3 Stacked Pills */}
            <div className="flex flex-col gap-3 w-full lg:max-w-md flex-1 justify-center">
              {/* Distance Pill */}
              <div className="rounded-[24px] bg-[#D1F4ED] dark:bg-[#0B383D] border border-[#A3EAD8] dark:border-[#115057] p-3.5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#A3EAD8] dark:bg-[#022428] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#004F47] dark:text-teal-200">Distance</p>
                  <p className="text-xl font-black text-[#003833] dark:text-white tabular-nums">
                    {distanceMiles} mi ({distanceKm} km)
                  </p>
                </div>
              </div>

              {/* Cal burned Pill */}
              <div className="rounded-[24px] bg-[#D1F4ED] dark:bg-[#0B383D] border border-[#A3EAD8] dark:border-[#115057] p-3.5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#A3EAD8] dark:bg-[#022428] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#004F47] dark:text-teal-200">Cal burned</p>
                  <p className="text-xl font-black text-[#003833] dark:text-white tabular-nums">
                    {calories.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Zone Min Pill */}
              <div className="rounded-[24px] bg-[#D1F4ED] dark:bg-[#0B383D] border border-[#A3EAD8] dark:border-[#115057] p-3.5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#A3EAD8] dark:bg-[#022428] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#004F47] dark:text-teal-200">Zone min</p>
                  <p className="text-xl font-black text-[#003833] dark:text-white tabular-nums">
                    {azm}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Metric Pills (2x2 grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/60 dark:border-white/[0.06]">
          {/* Distance */}
          <div className="rounded-[22px] bg-[#D1F4ED] dark:bg-[#0C3236] border border-[#A3EAD8] dark:border-[#124B51] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#A3EAD8] dark:bg-[#032326] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#004F47] dark:text-teal-200 truncate">Distance</p>
              <p className="text-base font-black text-[#003833] dark:text-white tabular-nums">{distanceKm} km</p>
            </div>
          </div>

          {/* Cal burned */}
          <div className="rounded-[22px] bg-[#D1F4ED] dark:bg-[#0C3236] border border-[#A3EAD8] dark:border-[#124B51] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#A3EAD8] dark:bg-[#032326] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#004F47] dark:text-teal-200 truncate">Cal burned</p>
              <p className="text-base font-black text-[#003833] dark:text-white tabular-nums">{calories.toLocaleString()}</p>
            </div>
          </div>

          {/* Exercise days */}
          <div className="rounded-[22px] bg-[#D1F4ED] dark:bg-[#0C3236] border border-[#A3EAD8] dark:border-[#124B51] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#A3EAD8] dark:bg-[#032326] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#004F47] dark:text-teal-200 truncate">Exercise days</p>
              <p className="text-base font-black text-[#003833] dark:text-white tabular-nums">{exerciseDays} of 6</p>
            </div>
          </div>

          {/* Hourly activity */}
          <div className="rounded-[22px] bg-[#D1F4ED] dark:bg-[#0C3236] border border-[#A3EAD8] dark:border-[#124B51] p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#A3EAD8] dark:bg-[#032326] text-[#004F47] dark:text-[#55E0E8] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#004F47] dark:text-teal-200 truncate">Hourly activity</p>
              <p className="text-base font-black text-[#003833] dark:text-white tabular-nums">{activeHours} of 9</p>
            </div>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setCarouselIndex(0)}
            className={`transition-all rounded-full cursor-pointer ${
              carouselIndex === 0
                ? 'w-6 h-2 bg-slate-800 dark:bg-white'
                : 'w-2 h-2 bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50'
            }`}
            title="Cardio Dial View"
          />
          <button
            onClick={() => setCarouselIndex(1)}
            className={`transition-all rounded-full cursor-pointer ${
              carouselIndex === 1
                ? 'w-6 h-2 bg-slate-800 dark:bg-white'
                : 'w-2 h-2 bg-slate-300 dark:bg-white/30 hover:bg-slate-400 dark:hover:bg-white/50'
            }`}
            title="Steps Card View"
          />
        </div>

        {/* Quick Action Pill Buttons (Screenshot 1 & 2) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-5">
          <button
            onClick={() => setShowLogModal(true)}
            className="w-full sm:flex-1 py-3 px-6 rounded-full bg-[#D3E4F6] dark:bg-[#0B3A60] hover:bg-[#C2DCF5] dark:hover:bg-[#134975] text-[#041E49] dark:text-[#A8C7FA] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-99"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log</span>
          </button>

          <button
            onClick={() => setShowStartModal(true)}
            className="w-full sm:flex-1 py-3 px-6 rounded-full bg-[#D3E4F6] dark:bg-[#0B3A60] hover:bg-[#C2DCF5] dark:hover:bg-[#134975] text-[#041E49] dark:text-[#A8C7FA] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-99"
          >
            <Play className="w-4 h-4 fill-current stroke-[2]" />
            <span>Start</span>
          </button>
        </div>
      </div>

      {/* Quick Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#181E24] border border-slate-200 dark:border-white/[0.08] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Quick Log</h4>
              <button
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogModal(false)}
                className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-300 flex flex-col items-center gap-2 cursor-pointer hover:bg-teal-500/15"
              >
                <Droplets className="w-6 h-6" />
                <span className="text-xs font-bold">Water (250ml)</span>
              </button>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-300 flex flex-col items-center gap-2 cursor-pointer hover:bg-orange-500/15"
              >
                <UtensilsCrossed className="w-6 h-6" />
                <span className="text-xs font-bold">Food & Calories</span>
              </button>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 flex flex-col items-center gap-2 cursor-pointer hover:bg-blue-500/15"
              >
                <Scale className="w-6 h-6" />
                <span className="text-xs font-bold">Weight Entry</span>
              </button>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex flex-col items-center gap-2 cursor-pointer hover:bg-emerald-500/15"
              >
                <Dumbbell className="w-6 h-6" />
                <span className="text-xs font-bold">Workout Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Workout Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#181E24] border border-slate-200 dark:border-white/[0.08] p-6 shadow-2xl text-center">
            <div className="flex justify-end">
              <button
                onClick={() => setShowStartModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-16 h-16 rounded-full bg-[#0B3A60] text-[#A8C7FA] mx-auto flex items-center justify-center mb-4">
              <Play className="w-7 h-7 fill-current" />
            </div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">Workout Tracker</h4>
            <p className="text-xs text-slate-500 mb-6">Track your real-time cardio, pace, and heart rate zones</p>

            <div className="text-4xl font-black font-mono tabular-nums text-slate-900 dark:text-white mb-6">
              {String(Math.floor(workoutSeconds / 60)).padStart(2, '0')}:
              {String(workoutSeconds % 60).padStart(2, '0')}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setWorkoutActive((v) => !v)}
                className={`px-6 py-3 rounded-full font-bold text-sm cursor-pointer ${
                  workoutActive
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-[#00B0B9] text-white hover:bg-[#00969E]'
                }`}
              >
                {workoutActive ? 'Pause Workout' : 'Start Workout'}
              </button>
              {workoutSeconds > 0 && (
                <button
                  onClick={() => {
                    setWorkoutActive(false);
                    setWorkoutSeconds(0);
                    setShowStartModal(false);
                  }}
                  className="px-6 py-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-sm cursor-pointer"
                >
                  End & Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
