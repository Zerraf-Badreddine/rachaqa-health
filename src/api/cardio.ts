import { healthFetch } from './client';
import type {
  ActiveMinutesRollupDataPoint,
  ActiveZoneMinutesRollupDataPoint,
  DailyHeartRateZonesDataPoint,
  DailyVo2MaxDataPoint,
  ListResponse,
  RollupResponse,
  TimeInHeartRateZoneRollupDataPoint,
} from '../types/health';

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

function startDateFilter(daysBack: number, field: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  return `${field} >= "${startDate.toISOString().split('T')[0]}"`;
}

async function getDailyRollup<T>(accessToken: string, dataType: string, daysBack: number): Promise<T[]> {
  try {
    const clamped = Math.min(daysBack, 85);
    const data = await healthFetch<RollupResponse<T>>(
      `/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(getDailyRollUpBody(clamped)),
      }
    );

    return data.rollupDataPoints || [];
  } catch {
    return [];
  }
}

export function getActiveZoneMinutesDaily(accessToken: string, daysBack: number = 7) {
  return getDailyRollup<ActiveZoneMinutesRollupDataPoint>(accessToken, 'active-zone-minutes', daysBack);
}

export function getTimeInHeartRateZoneDaily(accessToken: string, daysBack: number = 7) {
  return getDailyRollup<TimeInHeartRateZoneRollupDataPoint>(accessToken, 'time-in-heart-rate-zone', daysBack);
}

export function getActiveMinutesDaily(accessToken: string, daysBack: number = 7) {
  // active-minutes allows max 14 days rollup
  return getDailyRollup<ActiveMinutesRollupDataPoint>(accessToken, 'active-minutes', Math.min(daysBack, 14));
}

export async function getDailyVo2Max(accessToken: string, daysBack: number = 30) {
  const params = new URLSearchParams({
    filter: startDateFilter(daysBack, 'daily_vo2_max.date'),
    page_size: '100',
  });

  try {
    const data = await healthFetch<ListResponse<DailyVo2MaxDataPoint>>(
      `/users/me/dataTypes/daily-vo2-max/dataPoints?${params}`,
      accessToken
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}

export async function getDailyHeartRateZones(accessToken: string, daysBack: number = 30) {
  const params = new URLSearchParams({
    filter: startDateFilter(daysBack, 'daily_heart_rate_zones.date'),
    page_size: '100',
  });

  try {
    const data = await healthFetch<ListResponse<DailyHeartRateZonesDataPoint>>(
      `/users/me/dataTypes/daily-heart-rate-zones/dataPoints?${params}`,
      accessToken
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}
