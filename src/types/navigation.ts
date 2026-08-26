import type { WorkoutRewardSummary } from './player';

export type RootStackParamList = {
  Home: undefined;
  User: undefined;
  AddWorkout: undefined;
  Workouts: undefined;
  WorkoutHistory: undefined;
  WorkoutDetail: { sessionId: string };
  WorkoutReward: { reward: WorkoutRewardSummary };
};
