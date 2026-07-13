import { getDatabase } from './database';
import {
  computeSetMuscleLoad,
  levelFromXp,
  muscleXpFromLoad,
  xpFromWorkoutPoints,
} from './scoring';
import type { ExerciseCategory, MuscleActivation } from '../types/exercise';
import type {
  PlayerAttribute,
  PlayerAttributeId,
  PlayerMuscleProgress,
  PlayerProgress,
  PlayerSummary,
} from '../types/player';
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

const PLAYER_ATTRIBUTES: PlayerAttributeId[] = [
  'strength',
  'cardio',
  'flexibility',
  'endurance',
  'consistency',
];

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

  const muscleLoads = await db.getAllAsync<WorkoutSessionDetail['muscleLoads'][number]>(
    `SELECT
       wml.muscle_id AS muscleId,
       m.name AS muscleName,
       r.name AS regionName,
       wml.load
     FROM workout_session_muscle_loads wml
     JOIN muscle_groups m ON m.id = wml.muscle_id
     LEFT JOIN muscle_groups r ON r.id = m.parent_region_id AND r.map_slot IS NOT NULL
     WHERE wml.session_id = ?
     ORDER BY wml.load DESC`,
    [sessionId]
  );

  return {
    ...session,
    items,
    muscleLoads,
  };
}

export async function getPlayerSummary(userId: string): Promise<PlayerSummary> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const progress = await db.getFirstAsync<PlayerProgress>(
    `SELECT
       user_id AS userId,
       total_xp AS totalXp,
       level,
       workout_count AS workoutCount,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM player_progress
     WHERE user_id = ?`,
    [userId]
  );

  const attributes = await db.getAllAsync<PlayerAttribute>(
    `SELECT
       user_id AS userId,
       attribute_id AS attributeId,
       xp,
       level,
       updated_at AS updatedAt
     FROM player_attributes
     WHERE user_id = ?`,
    [userId]
  );
  const attributeById = new Map(attributes.map((row) => [row.attributeId, row]));

  const muscles = await db.getAllAsync<PlayerMuscleProgress>(
    `SELECT
       pmp.user_id AS userId,
       pmp.muscle_id AS muscleId,
       m.name AS muscleName,
       r.name AS regionName,
       pmp.xp,
       pmp.level,
       pmp.updated_at AS updatedAt
     FROM player_muscle_progress pmp
     JOIN muscle_groups m ON m.id = pmp.muscle_id
     LEFT JOIN muscle_groups r ON r.id = m.parent_region_id AND r.map_slot IS NOT NULL
     WHERE pmp.user_id = ?
     ORDER BY pmp.xp DESC`,
    [userId]
  );

  return {
    progress: progress ?? {
      userId,
      totalXp: 0,
      level: 1,
      workoutCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    attributes: PLAYER_ATTRIBUTES.map((attributeId) => (
      attributeById.get(attributeId) ?? {
        userId,
        attributeId,
        xp: 0,
        level: 1,
        updatedAt: now,
      }
    )),
    muscles,
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

async function getActivationsForExercise(
  db: Awaited<ReturnType<typeof getDatabase>>,
  exerciseId: string
): Promise<MuscleActivation[]> {
  return db.getAllAsync<MuscleActivation>(
    `SELECT exercise_id AS exerciseId, muscle_id AS muscleId, activation, role
     FROM exercise_muscle_activation
     WHERE exercise_id = ?`,
    [exerciseId]
  );
}

async function getExerciseCategory(
  db: Awaited<ReturnType<typeof getDatabase>>,
  exerciseId: string
): Promise<ExerciseCategory> {
  const exercise = await db.getFirstAsync<{ category: ExerciseCategory }>(
    'SELECT category FROM exercises WHERE id = ?',
    [exerciseId]
  );
  return exercise?.category ?? 'strength';
}

async function addPlayerXp(
  db: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
  xpGained: number
): Promise<void> {
  const existing = await db.getFirstAsync<Pick<PlayerProgress, 'totalXp' | 'workoutCount'>>(
    `SELECT total_xp AS totalXp, workout_count AS workoutCount
     FROM player_progress
     WHERE user_id = ?`,
    [userId]
  );

  const totalXp = (existing?.totalXp ?? 0) + xpGained;
  const workoutCount = (existing?.workoutCount ?? 0) + 1;
  const level = levelFromXp(totalXp);

  await db.runAsync(
    `INSERT INTO player_progress (user_id, total_xp, level, workout_count, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       total_xp = excluded.total_xp,
       level = excluded.level,
       workout_count = excluded.workout_count,
       updated_at = datetime('now')`,
    [userId, totalXp, level, workoutCount]
  );
}

async function addAttributeXp(
  db: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
  attributeId: PlayerAttributeId,
  xpGained: number
): Promise<void> {
  if (xpGained <= 0) return;

  const existing = await db.getFirstAsync<Pick<PlayerAttribute, 'xp'>>(
    `SELECT xp FROM player_attributes
     WHERE user_id = ? AND attribute_id = ?`,
    [userId, attributeId]
  );
  const xp = (existing?.xp ?? 0) + xpGained;
  const level = levelFromXp(xp);

  await db.runAsync(
    `INSERT INTO player_attributes (user_id, attribute_id, xp, level, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, attribute_id) DO UPDATE SET
       xp = excluded.xp,
       level = excluded.level,
       updated_at = datetime('now')`,
    [userId, attributeId, xp, level]
  );
}

async function addMuscleProgressXp(
  db: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
  muscleId: string,
  xpGained: number
): Promise<void> {
  if (xpGained <= 0) return;

  const existing = await db.getFirstAsync<{ xp: number }>(
    `SELECT xp FROM player_muscle_progress
     WHERE user_id = ? AND muscle_id = ?`,
    [userId, muscleId]
  );
  const xp = (existing?.xp ?? 0) + xpGained;
  const level = levelFromXp(xp);

  await db.runAsync(
    `INSERT INTO player_muscle_progress (user_id, muscle_id, xp, level, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, muscle_id) DO UPDATE SET
       xp = excluded.xp,
       level = excluded.level,
       updated_at = datetime('now')`,
    [userId, muscleId, xp, level]
  );
}

async function updatePlayerProgressFromWorkout(
  db: Awaited<ReturnType<typeof getDatabase>>,
  userId: string,
  points: number,
  categoryPoints: Record<ExerciseCategory, number>,
  muscleLoads: Record<string, number>
): Promise<void> {
  await addPlayerXp(db, userId, xpFromWorkoutPoints(points));
  await addAttributeXp(db, userId, 'consistency', 10);
  await addAttributeXp(
    db,
    userId,
    'strength',
    categoryPoints.strength > 0 ? xpFromWorkoutPoints(categoryPoints.strength) : 0
  );
  await addAttributeXp(
    db,
    userId,
    'cardio',
    categoryPoints.cardio > 0 ? xpFromWorkoutPoints(categoryPoints.cardio) : 0
  );
  await addAttributeXp(
    db,
    userId,
    'endurance',
    categoryPoints.cardio > 0 ? xpFromWorkoutPoints(categoryPoints.cardio) : 0
  );
  await addAttributeXp(
    db,
    userId,
    'flexibility',
    categoryPoints.flexibility > 0 ? xpFromWorkoutPoints(categoryPoints.flexibility) : 0
  );

  for (const [muscleId, load] of Object.entries(muscleLoads)) {
    await addMuscleProgressXp(db, userId, muscleId, muscleXpFromLoad(load));
  }
}

export async function createWorkoutSession(
  submission: WorkoutSessionSubmission
): Promise<WorkoutSession> {
  const db = await getDatabase();
  const sessionId = generateId('session');
  const points = computeSessionPoints(submission.items);
  const muscleLoads: Record<string, number> = {};
  const categoryPoints: Record<ExerciseCategory, number> = {
    strength: 0,
    cardio: 0,
    flexibility: 0,
  };

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
      const category = await getExerciseCategory(db, item.exerciseId);
      categoryPoints[category] += volume;

      await db.runAsync(
        `INSERT INTO workout_session_items (id, session_id, exercise_id, sets, reps, weight, volume, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, sessionId, item.exerciseId, item.sets, item.reps, item.weight, volume, item.notes ?? null]
      );

      const itemLoads = computeSetMuscleLoad(
        await getActivationsForExercise(db, item.exerciseId),
        volume
      );

      for (const [muscleId, load] of Object.entries(itemLoads)) {
        muscleLoads[muscleId] = (muscleLoads[muscleId] ?? 0) + load;
      }
    }

    for (const [muscleId, load] of Object.entries(muscleLoads)) {
      await db.runAsync(
        `INSERT INTO workout_session_muscle_loads (session_id, muscle_id, load)
         VALUES (?, ?, ?)`,
        [sessionId, muscleId, load]
      );
    }

    await updatePlayerProgressFromWorkout(
      db,
      submission.userId,
      points,
      categoryPoints,
      muscleLoads
    );

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
