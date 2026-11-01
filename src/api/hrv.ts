import { healthFetch } from './client';
import type { ListResponse, HrvDataPoint } from '../types/health';

export async function getHrvData(
  accessToken: string,
  daysBack: number = 7
): Promise<HrvDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const filter = `daily_heart_rate_variability.date >= "${startDate.toISOString().split('T')[0]}"`;
  const pageSize = Math.min(Math.max(daysBack, 50), 200).toString();
  const params = new URLSearchParams({ filter, page_size: pageSize });

  try {
    const data = await healthFetch<ListResponse<HrvDataPoint>>(
      `/users/me/dataTypes/daily-heart-rate-variability/dataPoints?${params}`,
      accessToken
    );
    if (data.dataPoints && data.dataPoints.length > 0) {
      return data.dataPoints;
    }
  } catch {
    // Retry without filter
  }

  try {
    const data = await healthFetch<ListResponse<HrvDataPoint>>(
      `/users/me/dataTypes/daily-heart-rate-variability/dataPoints?page_size=100`,
      accessToken
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}
