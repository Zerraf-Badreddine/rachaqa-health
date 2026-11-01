import { healthFetch } from './client';
import type { ListResponse, SleepDataPoint } from '../types/health';

export async function getSleepData(
  accessToken: string,
  daysBack: number = 7
): Promise<SleepDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const filter = `sleep.interval.civil_end_time >= "${startDate.toISOString().split('T')[0]}"`;
  const pageSize = Math.min(Math.max(daysBack, 50), 200).toString();
  const params = new URLSearchParams({ filter, page_size: pageSize });

  try {
    const data = await healthFetch<ListResponse<SleepDataPoint>>(
      `/users/me/dataTypes/sleep/dataPoints?${params}`,
      accessToken
    );
    if (data.dataPoints && data.dataPoints.length > 0) {
      return data.dataPoints;
    }
  } catch {
    // If filtered query fails, retry without filter
  }

  try {
    const data = await healthFetch<ListResponse<SleepDataPoint>>(
      `/users/me/dataTypes/sleep/dataPoints?page_size=100`,
      accessToken
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}
