import { getDatabase } from './database';
import {
  ACHIEVEMENT_DEFS,
  evaluateAndUnlockAchievements,
  getPlayerAchievements,
} from './achievements';
import {
  ensureDailyQuests,
  getPlayerStreak,
  progressDailyQuestsFromWorkout,
  updateStreakForWorkout,
} from './quests';
import {
  computeItemVolume,
  computeSetMuscleLoad,
  DEFAULT_CARDIO_ACTIVATIONS,
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
  WorkoutRewardSummary,
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
    `SELECT i.id, i.session_id AS sessionId, i.exercise_id AS exerciseId, i.sets, i.reps, i.weight,
            i.duration_minutes AS durationMinutes, i.distance_km AS distanceKm, i.volume, i.notes,
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
    items: items.map((item) => ({
      ...item,
      durationMinutes: item.durationMinutes ?? 0,
      distanceKm: item.distanceKm ?? 0,
    })),
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

  const streak = await getPlayerStreak(db, userId);
  const dailyQuests = await ensureDailyQuests(db, userId);
  const achievements = await getPlayerAchievements(db, userId);

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
    streak,
    dailyQuests,
    achievements,
  };
}

function computeSessionPoints(
  items: Array<WorkoutSessionSubmissionItem & { category: ExerciseCategory }>
): number {
  let points = 0;
  for (const item of items) {
    points += Math.round(
      computeItemVolume(item.category, {
        sets: item.sets,
        reps: item.reps,
        weight: item.weight,
        durationMinutes: item.durationMinutes,
        distanceKm: item.distanceKm,
      })
    );
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
  xpGained: number,
  options: { incrementWorkoutCount?: boolean } = {}
): Promise<void> {
  if (xpGained <= 0 && !options.incrementWorkoutCount) return;

  const existing = await db.getFirstAsync<Pick<PlayerProgress, 'totalXp' | 'workoutCount'>>(
    `SELECT total_xp AS totalXp, workout_count AS workoutCount
     FROM player_progress
     WHERE user_id = ?`,
    [userId]
  );

  const totalXp = (existing?.totalXp ?? 0) + Math.max(0, xpGained);
  const workoutCount =
    (existing?.workoutCount ?? 0) + (options.incrementWorkoutCount ? 1 : 0);
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
  muscleLoads: Record<string, number>,
  performedAtIso: string
): Promise<Omit<WorkoutRewardSummary, 'sessionId' | 'title' | 'points'>> {
  const before = await db.getFirstAsync<Pick<PlayerProgress, 'totalXp' | 'level'>>(
    `SELECT total_xp AS totalXp, level FROM player_progress WHERE user_id = ?`,
    [userId]
  );
  const previousLevel = before?.level ?? 1;

  const workoutXp = xpFromWorkoutPoints(points);
  await addPlayerXp(db, userId, workoutXp, { incrementWorkoutCount: true });

  const attributeGains: WorkoutRewardSummary['attributeGains'] = [];
  const pushAttr = async (attributeId: PlayerAttributeId, xpGained: number) => {
    if (xpGained <= 0) return;
    await addAttributeXp(db, userId, attributeId, xpGained);
    attributeGains.push({ attributeId, xpGained });
  };

  await pushAttr('consistency', 10);
  await pushAttr(
    'strength',
    categoryPoints.strength > 0 ? xpFromWorkoutPoints(categoryPoints.strength) : 0
  );
  await pushAttr(
    'cardio',
    categoryPoints.cardio > 0 ? xpFromWorkoutPoints(categoryPoints.cardio) : 0
  );
  await pushAttr(
    'endurance',
    categoryPoints.cardio > 0 ? xpFromWorkoutPoints(categoryPoints.cardio) : 0
  );
  await pushAttr(
    'flexibility',
    categoryPoints.flexibility > 0 ? xpFromWorkoutPoints(categoryPoints.flexibility) : 0
  );

  for (const [muscleId, load] of Object.entries(muscleLoads)) {
    await addMuscleProgressXp(db, userId, muscleId, muscleXpFromLoad(load));
  }

  const { streak, streakBonusXp } = await updateStreakForWorkout(db, userId, performedAtIso);
  if (streakBonusXp > 0) {
    await addPlayerXp(db, userId, streakBonusXp);
    await pushAttr('consistency', streakBonusXp);
  }

  const regionLoads = await rollupRegionLoads(db, muscleLoads);
  const { completedQuests, bonusXp: questBonusXp } = await progressDailyQuestsFromWorkout(
    db,
    userId,
    {
      performedAtIso,
      categoryPoints,
      regionLoads,
    }
  );
  if (questBonusXp > 0) {
    await addPlayerXp(db, userId, questBonusXp);
  }

  const progressAfter = await db.getFirstAsync<Pick<PlayerProgress, 'totalXp' | 'level' | 'workoutCount'>>(
    `SELECT total_xp AS totalXp, level, workout_count AS workoutCount
     FROM player_progress WHERE user_id = ?`,
    [userId]
  );
  const attributesAfter = await db.getAllAsync<PlayerAttribute>(
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
  const musclesAfter = await db.getAllAsync<PlayerMuscleProgress>(
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
     WHERE pmp.user_id = ?`,
    [userId]
  );

  const { newlyUnlocked, bonusXp: achievementBonusXp } = await evaluateAndUnlockAchievements(
    db,
    userId,
    {
      workoutCount: progressAfter?.workoutCount ?? 0,
      level: progressAfter?.level ?? previousLevel,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      attributes: attributesAfter,
      muscles: musclesAfter,
    }
  );
  if (achievementBonusXp > 0) {
    await addPlayerXp(db, userId, achievementBonusXp);
  }

  const after = await db.getFirstAsync<Pick<PlayerProgress, 'totalXp' | 'level'>>(
    `SELECT total_xp AS totalXp, level FROM player_progress WHERE user_id = ?`,
    [userId]
  );
  const newLevel = after?.level ?? previousLevel;
  const totalXpGained = workoutXp + streakBonusXp + questBonusXp + achievementBonusXp;

  const mergedAttributes = new Map<PlayerAttributeId, number>();
  for (const gain of attributeGains) {
    mergedAttributes.set(
      gain.attributeId,
      (mergedAttributes.get(gain.attributeId) ?? 0) + gain.xpGained
    );
  }

  const achievementXpById = new Map(ACHIEVEMENT_DEFS.map((def) => [def.id, def.xpReward]));

  return {
    workoutXp,
    streakBonusXp,
    questBonusXp,
    achievementBonusXp,
    totalXpGained,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    completedQuests: completedQuests.map((quest) => ({
      title: quest.title,
      xpReward: quest.xpReward,
    })),
    attributeGains: [...mergedAttributes.entries()].map(([attributeId, xpGained]) => ({
      attributeId,
      xpGained,
    })),
    newlyUnlockedAchievements: newlyUnlocked.map((achievement) => ({
      id: achievement.id,
      title: achievement.title,
      focus: achievement.focus,
      xpReward: achievementXpById.get(achievement.id) ?? 0,
    })),
  };
}

async function rollupRegionLoads(
  db: Awaited<ReturnType<typeof getDatabase>>,
  muscleLoads: Record<string, number>
): Promise<Record<string, number>> {
  const regionLoads: Record<string, number> = {};
  for (const [muscleId, load] of Object.entries(muscleLoads)) {
    const row = await db.getFirstAsync<{ regionName: string | null }>(
      `SELECT r.name AS regionName
       FROM muscle_groups m
       LEFT JOIN muscle_groups r ON r.id = m.parent_region_id AND r.map_slot IS NOT NULL
       WHERE m.id = ?`,
      [muscleId]
    );
    const region = row?.regionName ?? 'Core';
    regionLoads[region] = (regionLoads[region] ?? 0) + load;
  }
  return regionLoads;
}

export async function createWorkoutSession(
  submission: WorkoutSessionSubmission
): Promise<{ session: WorkoutSessionDetail; reward: WorkoutRewardSummary }> {
  const db = await getDatabase();
  const sessionId = generateId('session');
  const muscleLoads: Record<string, number> = {};
  const categoryPoints: Record<ExerciseCategory, number> = {
    strength: 0,
    cardio: 0,
    flexibility: 0,
  };

  const categorizedItems: Array<WorkoutSessionSubmissionItem & { category: ExerciseCategory }> = [];
  for (const item of submission.items) {
    const category = await getExerciseCategory(db, item.exerciseId);
    categorizedItems.push({ ...item, category });
  }
  const points = computeSessionPoints(categorizedItems);

  let rewardCore: Omit<WorkoutRewardSummary, 'sessionId' | 'title' | 'points'> | null = null;

  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      `INSERT INTO workout_sessions (id, user_id, performed_at, title, notes, points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, submission.userId, submission.performedAt, submission.title, submission.notes ?? null, points]
    );

    for (const item of categorizedItems) {
      const itemId = generateId('item');
      const durationMinutes = item.durationMinutes ?? 0;
      const distanceKm = item.distanceKm ?? 0;
      const volume = computeItemVolume(item.category, {
        sets: item.sets,
        reps: item.reps,
        weight: item.weight,
        durationMinutes,
        distanceKm,
      });
      categoryPoints[item.category] += volume;

      await db.runAsync(
        `INSERT INTO workout_session_items
           (id, session_id, exercise_id, sets, reps, weight, duration_minutes, distance_km, volume, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          sessionId,
          item.exerciseId,
          item.sets,
          item.reps,
          item.weight,
          durationMinutes,
          distanceKm,
          volume,
          item.notes ?? null,
        ]
      );

      let activations = await getActivationsForExercise(db, item.exerciseId);
      if (activations.length === 0 && item.category === 'cardio') {
        activations = DEFAULT_CARDIO_ACTIVATIONS.map((row) => ({
          ...row,
          exerciseId: item.exerciseId,
        }));
      }

      const itemLoads = computeSetMuscleLoad(activations, volume);
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

    rewardCore = await updatePlayerProgressFromWorkout(
      db,
      submission.userId,
      points,
      categoryPoints,
      muscleLoads,
      submission.performedAt
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  const session = await getWorkoutSessionDetail(sessionId);
  if (!session || !rewardCore) {
    throw new Error('Failed to load created workout session.');
  }

  return {
    session,
    reward: {
      sessionId,
      title: submission.title,
      points,
      ...rewardCore,
    },
  };
}
