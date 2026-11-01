import type { ComponentType } from 'react';
import { SleepCard } from '../components/SleepCard';
import { ReadinessCard } from '../components/ReadinessCard';
import { HrvCard } from '../components/HrvCard';
import { RestingHrCard } from '../components/RestingHrCard';
import { CardioCard, HeartZonesCard } from '../components/CardioCard';
import { NutritionCard } from '../components/NutritionCard';
import { ActivityCard } from '../components/ActivityCard';
import { ExerciseCard } from '../components/ExerciseCard';
import { DailyHrCard } from '../components/DailyHrCard';
import { DebugCard } from '../components/DebugCard';
import { WeightCard } from '../components/WeightCard';

export type WidgetCategory = 'activity' | 'heart' | 'body' | 'sleep' | 'system';

export interface WidgetDef {
  type: string;
  name: string;
  description: string;
  category: WidgetCategory;
  component: ComponentType;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  activity: { type: 'activity', name: 'Activity & Steps', description: 'Steps, distance, active minutes, and calories', category: 'activity', component: ActivityCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  weight: { type: 'weight', name: 'Weight & BMI', description: 'Body weight trend, BMI, and body composition', category: 'body', component: WeightCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  sleep: { type: 'sleep', name: 'Sleep & Stages', description: 'Sleep duration, sleep score, and stage cycles', category: 'sleep', component: SleepCard, defaultW: 8, defaultH: 6, minW: 4, minH: 5 },
  'resting-hr': { type: 'resting-hr', name: 'Resting Heart Rate', description: 'Resting heart rate trends and baseline', category: 'heart', component: RestingHrCard, defaultW: 4, defaultH: 5, minW: 3, minH: 4 },
  'daily-hr': { type: 'daily-hr', name: '24h Heart Rate', description: 'Full-day continuous HR curve and heart zones', category: 'heart', component: DailyHrCard, defaultW: 8, defaultH: 6, minW: 4, minH: 5 },
  readiness: { type: 'readiness', name: 'Daily Readiness', description: 'Holistic recovery score from HRV, RHR, and sleep', category: 'heart', component: ReadinessCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  hrv: { type: 'hrv', name: 'Heart Rate Variability', description: 'Nightly HRV trends and autonomic nervous state', category: 'heart', component: HrvCard, defaultW: 4, defaultH: 5, minW: 3, minH: 4 },
  cardio: { type: 'cardio', name: 'Cardio Fitness & AZM', description: 'Active zone minutes, VO2 max, and active burn', category: 'activity', component: CardioCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  'heart-zones': { type: 'heart-zones', name: 'Heart Rate Zones', description: 'Time spent in moderate, vigorous, and peak zones', category: 'heart', component: HeartZonesCard, defaultW: 4, defaultH: 6, minW: 3, minH: 4 },
  exercise: { type: 'exercise', name: 'Workouts & Exercises', description: 'Workout calendar, GPS pace, and workout logs', category: 'activity', component: ExerciseCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  nutrition: { type: 'nutrition', name: 'Nutrition & Macros', description: 'Calorie intake vs burn, macro balance, and food logs', category: 'body', component: NutritionCard, defaultW: 4, defaultH: 6, minW: 3, minH: 5 },
  debug: { type: 'debug', name: 'Diagnostics & Devices', description: 'Raw API responses, profile metadata, paired devices', category: 'system', component: DebugCard, defaultW: 6, defaultH: 8, minW: 4, minH: 5 },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
