import { getDatabase } from './database';
import type {
  WorkoutSession,
  WorkoutSessionDetail,
  WorkoutSessionSubmission,
  WorkoutSessionSubmissionItem,
  WorkoutSessionItemDetail,
  User,
} from '../types/workout';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export async function getOrCreateLocalUser(): Promise<User> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<User>(
    'SELECT id, display_name AS displayName, created_at AS createdAt FROM users LIMIT 1',
    []
  );

  if (existing) {
    return existing;
  }

  const user: User = {
    id: generateId('user'),
    displayName: 'Player One',
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    'INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)',
    [user.id, user.displayName, user.createdAt]
  );

  return user;
}

export async function getWorkoutSessions(userId: string): Promise<WorkoutSession[]> {
  const db = await getDatabase();
  return db.getAllAsync<WorkoutSession>(
    `SELECT id, user_id AS userId, performed_at AS performedAt, title, notes, points, created_at AS createdAt
     FROM workout_sessions
     WHERE user_id = ?
     ORDER BY performed_at DESC
     LIMIT 50`,
    [userId]
  );
}

export async function getWorkoutSessionDetail(sessionId: string): Promise<WorkoutSessionDetail | null> {
  const db = await getDatabase();

  const session = await db.getFirstAsync<WorkoutSession>(
    `SELECT id, user_id AS userId, performed_at AS performedAt, title, notes, points, created_at AS createdAt
     FROM workout_sessions
     WHERE id = ?`,
    [sessionId]
  );

  if (!session) return null;

  const items = await db.getAllAsync<WorkoutSessionItemDetail>(
    `SELECT i.id, i.session_id AS sessionId, i.exercise_id AS exerciseId, i.sets, i.reps, i.weight, i.volume, i.notes,
            e.name AS exerciseName, e.category, e.slug
     FROM workout_session_items i
     JOIN exercises e ON e.id = i.exercise_id
     WHERE i.session_id = ?`,
    [sessionId]
  );

  return {
    ...session,
    items,
  };
}

function computeSessionPoints(items: WorkoutSessionSubmissionItem[]): number {
  let points = 0;
  for (const item of items) {
    const volume = item.sets * item.reps * (item.weight || 1);
    points += Math.round(volume);
  }
  return Math.max(points, 1);
}

export async function createWorkoutSession(
  submission: WorkoutSessionSubmission
): Promise<WorkoutSession> {
  const db = await getDatabase();
  const sessionId = generateId('session');
  const points = computeSessionPoints(submission.items);

  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      `INSERT INTO workout_sessions (id, user_id, performed_at, title, notes, points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, submission.userId, submission.performedAt, submission.title, submission.notes ?? null, points]
    );

    for (const item of submission.items) {
      const itemId = generateId('item');
      const volume = item.sets * item.reps * (item.weight || 1);
      await db.runAsync(
        `INSERT INTO workout_session_items (id, session_id, exercise_id, sets, reps, weight, volume, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, sessionId, item.exerciseId, item.sets, item.reps, item.weight, volume, item.notes ?? null]
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  const session = await getWorkoutSessionDetail(sessionId);
  if (!session) {
    throw new Error('Failed to load created workout session.');
  }

  return session;
}
