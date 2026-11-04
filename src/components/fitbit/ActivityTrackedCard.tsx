import { useEffect, useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { listExercises } from '../../api/exercise';

export function ActivityTrackedCard() {
  const { accessToken } = useAuth();
  const [latestExercise, setLatestExercise] = useState<{
    name: string;
    time: string;
    duration: string;
    distance?: string;
  } | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    listExercises(accessToken, 7)
      .then((data) => {
        if (data.length > 0) {
          const lastEx = data[0];
          const start = lastEx.exercise?.interval?.startTime;
          const end = lastEx.exercise?.interval?.endTime;
          const durMin = start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000) : 45;
          const dObj = start ? new Date(start) : new Date();
          const timeStr = dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const nameStr = lastEx.exercise?.exerciseType ? lastEx.exercise.exerciseType.toLowerCase().replace(/_/g, ' ') : 'Workout';
          const distMm = lastEx.exercise?.metricsSummary?.distanceMillimeters;
          setLatestExercise({
            name: nameStr.charAt(0).toUpperCase() + nameStr.slice(1),
            time: timeStr,
            duration: `${Math.floor(durMin / 60) > 0 ? `${Math.floor(durMin / 60)} h ` : ''}${durMin % 60} m`,
            distance: distMm ? `${(Number(distMm) / 1609344).toFixed(2)} mi` : undefined,
          });
        }
      })
      .catch(() => {});
  }, [accessToken]);

  return (
    <div className="rounded-[28px] bg-white dark:bg-[#181E24] border border-slate-200/90 dark:border-white/[0.08] p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {latestExercise?.time || '5:34 pm'}
          </span>
        </div>
        <span className="text-xs font-black text-slate-900 dark:text-white">
          Activity tracked
        </span>
      </div>

      <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Play className="w-4 h-4 fill-current" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Today</p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {latestExercise?.name || 'Outdoor Run'}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {latestExercise?.time || '4:00 pm'} • {latestExercise?.duration || '1 h 34 m'}
              {latestExercise?.distance ? ` • ${latestExercise.distance}` : ' • 3.42 mi'}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
