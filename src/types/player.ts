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

export interface PlayerStreak {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastWorkoutDate: string | null;
  updatedAt: string;
}

export interface DailyQuest {
  id: string;
  userId: string;
  questDate: string;
  questKey: string;
  title: string;
  description: string;
  targetValue: number;
  progressValue: number;
  xpReward: number;
  completed: boolean;
  completedAt: string | null;
}

export interface PlayerSummary {
  progress: PlayerProgress;
  attributes: PlayerAttribute[];
  muscles: PlayerMuscleProgress[];
  streak: PlayerStreak;
  dailyQuests: DailyQuest[];
  achievements: PlayerAchievementView[];
}

export interface PlayerAchievementView {
  id: string;
  title: string;
  description: string;
  focus: string;
  visualTag: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface WorkoutRewardQuest {
  title: string;
  xpReward: number;
}

export interface WorkoutRewardAttributeGain {
  attributeId: PlayerAttributeId;
  xpGained: number;
}

export interface WorkoutRewardAchievement {
  id: string;
  title: string;
  focus: string;
  xpReward: number;
}

export interface WorkoutRewardSummary {
  sessionId: string;
  title: string;
  points: number;
  workoutXp: number;
  streakBonusXp: number;
  questBonusXp: number;
  achievementBonusXp: number;
  totalXpGained: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  currentStreak: number;
  bestStreak: number;
  completedQuests: WorkoutRewardQuest[];
  attributeGains: WorkoutRewardAttributeGain[];
  newlyUnlockedAchievements: WorkoutRewardAchievement[];
}
