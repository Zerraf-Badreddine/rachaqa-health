import { healthFetch } from './client';
import type { RollupResponse, ListResponse, StepsRollupDataPoint, CaloriesRollupDataPoint } from '../types/health';

function getDailyRollUpBody(daysBack: number) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date();
  start.setDate(start.getDate() - daysBack);

  return {
    range: {
      start: {
        date: { year: start.getFullYear(), month: start.getMonth() + 1, day: start.getDate() },
        time: { hours: 0, minutes: 0, seconds: 0 },
      },
      end: {
        date: { year: tomorrow.getFullYear(), month: tomorrow.getMonth() + 1, day: tomorrow.getDate() },
        time: { hours: 0, minutes: 0, seconds: 0 },
      },
    },
    windowSizeDays: 1,
  };
}

export async function getStepsDaily(
  accessToken: string,
  daysBack: number = 7
): Promise<StepsRollupDataPoint[]> {
  const allRollups: StepsRollupDataPoint[] = [];
  const chunkDays = 85;
  let remaining = daysBack;
  let offset = 0;

  while (remaining > 0) {
    const currentChunk = Math.min(remaining, chunkDays);
    const startOffset = offset + currentChunk;
    const endOffset = offset;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startOffset);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - endOffset + 1);

    const body = {
      range: {
        start: {
          date: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
          time: { hours: 0, minutes: 0, seconds: 0 },
        },
        end: {
          date: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() },
          time: { hours: 0, minutes: 0, seconds: 0 },
        },
      },
      windowSizeDays: 1,
    };

    try {
      const data = await healthFetch<RollupResponse<StepsRollupDataPoint>>(
        '/users/me/dataTypes/steps/dataPoints:dailyRollUp',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      if (data.rollupDataPoints && data.rollupDataPoints.length > 0) {
        allRollups.push(...data.rollupDataPoints);
      }
    } catch {
      break;
    }

    remaining -= currentChunk;
    offset += currentChunk;
  }

  if (allRollups.length > 0) {
    return allRollups;
  }

  // Fallback to raw data points if daily roll up is empty
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const data = await healthFetch<ListResponse<{
      startTime?: string;
      endTime?: string;
      steps?: { count?: number; countSum?: string };
    }>>('/users/me/dataTypes/steps/dataPoints?page_size=200', accessToken);

    const points = data.dataPoints || [];
    if (points.length > 0) {
      const dailyMap: Record<string, number> = {};
      for (const pt of points) {
        const time = pt.startTime || pt.endTime;
        if (!time) continue;
        const d = new Date(time);
        if (d < cutoff) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const count = pt.steps?.count ?? parseInt(String(pt.steps?.countSum || '0'), 10) ?? 0;
        dailyMap[key] = (dailyMap[key] || 0) + (isNaN(count) ? 0 : count);
      }

      return Object.entries(dailyMap).map(([dayKey, countSum]) => {
        const [year, month, day] = dayKey.split('-').map(Number);
        return {
          civilStartTime: { date: { year, month, day } },
          startTime: `${dayKey}T00:00:00Z`,
          steps: { countSum: String(countSum) },
        };
      });
    }
  } catch {}

  return [];
}

export async function getCaloriesDaily(
  accessToken: string,
  daysBack: number = 7
): Promise<CaloriesRollupDataPoint[]> {
  try {
    const clampedDays = Math.min(daysBack, 14);
    const data = await healthFetch<RollupResponse<CaloriesRollupDataPoint>>(
      '/users/me/dataTypes/total-calories/dataPoints:dailyRollUp',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(getDailyRollUpBody(clampedDays)),
      }
    );

    return data.rollupDataPoints || [];
  } catch {
    return [];
  }
}

export async function getActiveCaloriesDaily(
  accessToken: string,
  daysBack: number = 7
): Promise<CaloriesRollupDataPoint[]> {
  return getCaloriesDaily(accessToken, daysBack);
}
