import { healthFetch } from "./client";
import type {
  ListResponse,
  WeightDataPoint,
  HeightDataPoint,
} from "../types/health";

export async function getWeightData(
  accessToken: string,
  daysBack: number = 30,
): Promise<WeightDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  try {
    const filter = `weight.sample_time.physical_time >= "${startDate.toISOString()}"`;
    const params = new URLSearchParams({ filter, page_size: "100" });
    const data = await healthFetch<ListResponse<WeightDataPoint>>(
      `/users/me/dataTypes/weight/dataPoints?${params}`,
      accessToken,
    );
    if (data.dataPoints && data.dataPoints.length > 0) {
      return data.dataPoints;
    }
  } catch {
    // If filtered query fails, retry without filter
  }

  try {
    const data = await healthFetch<ListResponse<WeightDataPoint>>(
      `/users/me/dataTypes/weight/dataPoints?page_size=100`,
      accessToken,
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}

export async function getHeightData(
  accessToken: string,
): Promise<HeightDataPoint[]> {
  try {
    const data = await healthFetch<ListResponse<HeightDataPoint>>(
      `/users/me/dataTypes/height/dataPoints?page_size=5`,
      accessToken,
    );
    return data.dataPoints || [];
  } catch {
    return [];
  }
}
