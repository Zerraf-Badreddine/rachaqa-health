import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getWeightData } from '../api/weight';
import { getProfile } from '../api/user';
import { getStepsDaily } from '../api/activity';
import { getSleepData } from '../api/sleep';
import { getHrvData } from '../api/hrv';
import { getRestingHrData } from '../api/resting-hr';
import { getActiveZoneMinutesDaily, getTimeInHeartRateZoneDaily } from '../api/cardio';
import { getNutritionHistory } from '../api/nutrition';
import { listExercises } from '../api/exercise';
import { getDailyHeartRate } from '../api/heart-rate';

export type WidgetDataMap = Record<string, boolean | undefined>;

interface WidgetDataContextValue {
  dataStatus: WidgetDataMap;
  isProbing: boolean;
  reportWidgetData: (type: string, hasData: boolean) => void;
  recheckData: () => Promise<void>;
}

const WidgetDataContext = createContext<WidgetDataContextValue>({
  dataStatus: {},
  isProbing: false,
  reportWidgetData: () => {},
  recheckData: async () => {},
});

export function useWidgetData() {
  return useContext(WidgetDataContext);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function WidgetDataProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [dataStatus, setDataStatus] = useState<WidgetDataMap>({
    debug: true,
  });
  const [isProbing, setIsProbing] = useState(false);

  const reportWidgetData = useCallback((type: string, hasData: boolean) => {
    setDataStatus((prev) => {
      if (prev[type] === hasData) return prev;
      return { ...prev, [type]: hasData };
    });
  }, []);

  const probeAll = useCallback(async (token: string) => {
    setIsProbing(true);

    const results: WidgetDataMap = {
      debug: true,
    };

    // Stagger queries to prevent spiking the per-minute quota
    try {
      // 1. Weight & Profile
      const [wPoints, profile] = await Promise.all([
        getWeightData(token, 30).catch(() => []),
        getProfile(token).catch(() => null),
      ]);
      results.weight = wPoints.length > 0 || profile?.weight != null;
      setDataStatus((prev) => ({ ...prev, weight: results.weight }));
      await delay(120);

      // 2. Activity / Steps
      const steps = await getStepsDaily(token, 30).catch(() => []);
      results.activity = steps.some((s) => {
        const val = parseInt(String(s.steps?.countSum || '0'), 10);
        return !isNaN(val) && val > 0;
      });
      setDataStatus((prev) => ({ ...prev, activity: results.activity }));
      await delay(120);

      // 3. Sleep
      const sleeps = await getSleepData(token, 30).catch(() => []);
      results.sleep = sleeps.length > 0;
      setDataStatus((prev) => ({ ...prev, sleep: results.sleep }));
      await delay(120);

      // 4. HRV & Resting HR
      const [hrv, rhr] = await Promise.all([
        getHrvData(token, 30).catch(() => []),
        getRestingHrData(token, 30).catch(() => []),
      ]);
      results.hrv = hrv.some((d) => d.dailyHeartRateVariability?.averageHeartRateVariabilityMilliseconds != null);
      results['resting-hr'] = rhr.some((d) => d.dailyRestingHeartRate?.beatsPerMinute != null);
      results.readiness = Boolean(results.hrv && results.sleep);
      setDataStatus((prev) => ({
        ...prev,
        hrv: results.hrv,
        'resting-hr': results['resting-hr'],
        readiness: results.readiness,
      }));
      await delay(120);

      // 5. Cardio & Heart Zones
      const [azm, hz] = await Promise.all([
        getActiveZoneMinutesDaily(token, 30).catch(() => []),
        getTimeInHeartRateZoneDaily(token, 30).catch(() => []),
      ]);
      results.cardio = azm.some((d) => {
        const fatBurn = parseInt(d.activeZoneMinutes?.sumInFatBurnHeartZone || '0', 10) || 0;
        const cardio = parseInt(d.activeZoneMinutes?.sumInCardioHeartZone || '0', 10) || 0;
        return fatBurn > 0 || cardio > 0;
      });
      results['heart-zones'] = hz.some((d) => (d.timeInHeartRateZone?.timeInHeartRateZones || []).length > 0);
      setDataStatus((prev) => ({
        ...prev,
        cardio: results.cardio,
        'heart-zones': results['heart-zones'],
      }));
      await delay(120);

      // 6. Nutrition, Exercises & Daily HR
      const [nut, ex, dhr] = await Promise.all([
        getNutritionHistory(token, 30).catch(() => []),
        listExercises(token, 60).catch(() => []),
        getDailyHeartRate(token).catch(() => []),
      ]);
      results.nutrition = nut.length > 0;
      results.exercise = ex.length > 0;
      results['daily-hr'] = dhr.length > 0;
      setDataStatus((prev) => ({
        ...prev,
        nutrition: results.nutrition,
        exercise: results.exercise,
        'daily-hr': results['daily-hr'],
      }));
    } catch {}

    setIsProbing(false);
  }, []);

  const recheckData = useCallback(async () => {
    if (accessToken) {
      await probeAll(accessToken);
    }
  }, [accessToken, probeAll]);

  useEffect(() => {
    if (accessToken) {
      probeAll(accessToken);
    }
  }, [accessToken, probeAll]);

  return (
    <WidgetDataContext.Provider
      value={{
        dataStatus,
        isProbing,
        reportWidgetData,
        recheckData,
      }}
    >
      {children}
    </WidgetDataContext.Provider>
  );
}
