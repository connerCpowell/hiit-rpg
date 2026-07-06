export interface User {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  performedAt: string;
  title: string;
  notes: string | null;
  points: number;
  createdAt: string;
}

export interface WorkoutSessionItem {
  id: string;
  sessionId: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  volume: number;
  notes: string | null;
}

export interface WorkoutSessionItemDetail extends WorkoutSessionItem {
  exerciseName: string;
  category: string;
  slug: string;
}

export interface WorkoutSessionDetail extends WorkoutSession {
  items: WorkoutSessionItemDetail[];
}

export interface WorkoutSessionSubmissionItem {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}

export interface WorkoutSessionSubmission {
  userId: string;
  performedAt: string;
  title: string;
  notes?: string;
  items: WorkoutSessionSubmissionItem[];
}
