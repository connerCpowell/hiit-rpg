import type { MuscleActivation } from '../types/exercise';

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
