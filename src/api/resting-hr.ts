import { healthFetch } from './client';
import type { ListResponse, RestingHrDataPoint } from '../types/health';

export async function getRestingHrData(
  accessToken: string,
  daysBack: number = 7
): Promise<RestingHrDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const filter = `daily_resting_heart_rate.date >= "${startDate.toISOString().split('T')[0]}"`;
  const pageSize = Math.min(Math.max(daysBack, 50), 200).toString();
  const params = new URLSearchParams({ filter, page_size: pageSize });

  try {
    const data = await healthFetch<ListResponse<RestingHrDataPoint>>(
      `/users/me/dataTypes/daily-resting-heart-rate/dataPoints?${params}`,
      accessToken
    );
    if (data.dataPoints && data.dataPoints.length > 0) {
      return data.dataPoints;
    }
  } catch {
    // Retry without filter
  }

  try {
    const data = await healthFetch<ListResponse<RestingHrDataPoint>>(
      `/users/me/dataTypes/daily-resting-heart-rate/dataPoints?page_size=100`,
      accessToken
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}
