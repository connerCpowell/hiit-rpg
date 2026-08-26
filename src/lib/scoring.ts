import type { ExerciseCategory, MuscleActivation } from '../types/exercise';

/** Phase 2 stub — compute muscle load from a single set. */
export function computeSetMuscleLoad(
  activations: MuscleActivation[],
  volume: number,
  setFactor = 1
): Record<string, number> {
  const loads: Record<string, number> = {};

  for (const { muscleId, activation } of activations) {
    loads[muscleId] = (loads[muscleId] ?? 0) + (activation / 10) * volume * setFactor;
  }

  return loads;
}

/** Fallback muscle map for cardio entries with no activation rows. */
export const DEFAULT_CARDIO_ACTIVATIONS: MuscleActivation[] = [
  { exerciseId: 'cardio-default', muscleId: 'quads', activation: 8, role: 'primary' },
  { exerciseId: 'cardio-default', muscleId: 'calves', activation: 7, role: 'primary' },
  { exerciseId: 'cardio-default', muscleId: 'glutes', activation: 6, role: 'secondary' },
  { exerciseId: 'cardio-default', muscleId: 'hamstrings', activation: 5, role: 'secondary' },
  { exerciseId: 'cardio-default', muscleId: 'abs', activation: 4, role: 'stabilizer' },
];

/** Strength volume: sets * reps * weight (bodyweight uses 1). */
export function computeStrengthVolume(sets: number, reps: number, weight: number): number {
  return Math.max(0, sets) * Math.max(0, reps) * (weight > 0 ? weight : 1);
}

/**
 * Cardio volume from minutes and kilometers.
 * Tunable later: ~12 pts/min + 40 pts/km.
 */
export function computeCardioVolume(durationMinutes: number, distanceKm: number): number {
  const minutes = Math.max(0, durationMinutes);
  const km = Math.max(0, distanceKm);
  return minutes * 12 + km * 40;
}

export function computeItemVolume(
  category: ExerciseCategory,
  input: {
    sets: number;
    reps: number;
    weight: number;
    durationMinutes?: number;
    distanceKm?: number;
  }
): number {
  if (category === 'cardio') {
    return computeCardioVolume(input.durationMinutes ?? 0, input.distanceKm ?? 0);
  }
  return computeStrengthVolume(input.sets, input.reps, input.weight);
}

/** Daily decay applied to character-map region values (phase 2). */
export const DAILY_DECAY_FACTOR = 0.85;

export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * (safeLevel - 1) ** 2;
}

export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(Math.sqrt(safeXp / 100)) + 1;
}

export function xpFromWorkoutPoints(points: number): number {
  return Math.max(1, Math.round(Math.sqrt(Math.max(0, points)) * 10));
}

export function muscleXpFromLoad(load: number): number {
  if (load <= 0) return 0;
  return Math.max(1, Math.round(Math.sqrt(load) * 6));
}

/** 0–1 intensity for body-map coloring/sizing from region XP. */
export function regionIntensity(xp: number, maxXp: number): number {
  if (xp <= 0) return 0;
  if (maxXp <= 0) return 0.2;
  return Math.max(0.15, Math.min(1, xp / maxXp));
}
