export type PlayerAttributeId =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'endurance'
  | 'consistency';

export interface PlayerProgress {
  userId: string;
  totalXp: number;
  level: number;
  workoutCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerAttribute {
  userId: string;
  attributeId: PlayerAttributeId;
  xp: number;
  level: number;
  updatedAt: string;
}

export interface PlayerMuscleProgress {
  userId: string;
  muscleId: string;
  muscleName: string;
  regionName: string | null;
  xp: number;
  level: number;
  updatedAt: string;
}

export interface PlayerSummary {
  progress: PlayerProgress;
  attributes: PlayerAttribute[];
  muscles: PlayerMuscleProgress[];
}
