export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility';
export type ExerciseSource = 'wger' | 'manual' | 'user';
export type ActivationRole = 'primary' | 'secondary' | 'stabilizer';

export interface MuscleGroup {
  id: string;
  name: string;
  parentRegionId: string | null;
  mapSlot: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  category: ExerciseCategory;
  equipment: string[];
  isCompound: boolean;
  source: ExerciseSource;
}

export interface MuscleActivation {
  exerciseId: string;
  muscleId: string;
  activation: number;
  role: ActivationRole;
}

export interface ExerciseAlias {
  alias: string;
  exerciseId: string;
}

export interface ExerciseWithActivations extends Exercise {
  activations: Array<MuscleActivation & { muscleName: string; regionName: string | null }>;
}

export type ExerciseOverrides = Record<string, Record<string, number>>;
