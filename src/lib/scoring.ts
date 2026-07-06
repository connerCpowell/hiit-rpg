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
