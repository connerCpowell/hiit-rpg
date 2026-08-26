import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExerciseCategory } from '../types/exercise';
import type { DailyQuest, PlayerStreak } from '../types/player';

type Db = SQLiteDatabase;

const REGION_QUESTS = [
  { key: 'train_legs', region: 'Legs', title: 'Leg day', description: 'Train Legs this workout' },
  { key: 'train_chest', region: 'Chest', title: 'Chest focus', description: 'Train Chest this workout' },
  { key: 'train_back', region: 'Back', title: 'Back focus', description: 'Train Back this workout' },
  { key: 'train_arms', region: 'Arms', title: 'Arm pump', description: 'Train Arms this workout' },
  { key: 'train_core', region: 'Core', title: 'Core work', description: 'Train Core this workout' },
  { key: 'train_shoulders', region: 'Shoulders', title: 'Shoulder work', description: 'Train Shoulders this workout' },
] as const;

function todayDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export async function ensureDailyQuests(db: Db, userId: string, dateKey = todayDateKey()): Promise<DailyQuest[]> {
  const existing = await db.getAllAsync<{
    id: string;
    user_id: string;
    quest_date: string;
    quest_key: string;
    title: string;
    description: string;
    target_value: number;
    progress_value: number;
    xp_reward: number;
    completed: number;
    completed_at: string | null;
  }>(
    `SELECT * FROM daily_quests
     WHERE user_id = ? AND quest_date = ?
     ORDER BY quest_key`,
    [userId, dateKey]
  );

  if (existing.length > 0) {
    return existing.map(mapQuestRow);
  }

  const dayIndex = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  const regionQuest = REGION_QUESTS[dayIndex % REGION_QUESTS.length];
  const categoryFocus: ExerciseCategory = dayIndex % 2 === 0 ? 'strength' : 'cardio';

  const templates = [
    {
      questKey: 'complete_workout',
      title: 'Log a workout',
      description: 'Complete any workout today',
      targetValue: 1,
      xpReward: 15,
    },
    {
      questKey: regionQuest.key,
      title: regionQuest.title,
      description: regionQuest.description,
      targetValue: 1,
      xpReward: 25,
    },
    {
      questKey: `category_${categoryFocus}`,
      title: categoryFocus === 'cardio' ? 'Cardio check-in' : 'Lift something',
      description:
        categoryFocus === 'cardio'
          ? 'Log at least one cardio exercise'
          : 'Log at least one strength exercise',
      targetValue: 1,
      xpReward: 20,
    },
  ];

  for (const template of templates) {
    await db.runAsync(
      `INSERT INTO daily_quests
         (id, user_id, quest_date, quest_key, title, description, target_value, progress_value, xp_reward, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0)`,
      [
        generateId('quest'),
        userId,
        dateKey,
        template.questKey,
        template.title,
        template.description,
        template.targetValue,
        template.xpReward,
      ]
    );
  }

  const created = await db.getAllAsync<{
    id: string;
    user_id: string;
    quest_date: string;
    quest_key: string;
    title: string;
    description: string;
    target_value: number;
    progress_value: number;
    xp_reward: number;
    completed: number;
    completed_at: string | null;
  }>(
    `SELECT * FROM daily_quests
     WHERE user_id = ? AND quest_date = ?
     ORDER BY quest_key`,
    [userId, dateKey]
  );

  return created.map(mapQuestRow);
}

export async function getPlayerStreak(db: Db, userId: string): Promise<PlayerStreak> {
  const now = new Date().toISOString();
  const row = await db.getFirstAsync<{
    user_id: string;
    current_streak: number;
    best_streak: number;
    last_workout_date: string | null;
    updated_at: string;
  }>(
    `SELECT user_id, current_streak, best_streak, last_workout_date, updated_at
     FROM player_streaks
     WHERE user_id = ?`,
    [userId]
  );

  if (!row) {
    return {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastWorkoutDate: null,
      updatedAt: now,
    };
  }

  // If last workout was more than 1 day ago, show streak as broken until next workout.
  const today = todayDateKey();
  let currentStreak = row.current_streak;
  if (row.last_workout_date) {
    const gap = daysBetween(row.last_workout_date, today);
    if (gap > 1) currentStreak = 0;
  }

  return {
    userId: row.user_id,
    currentStreak,
    bestStreak: row.best_streak,
    lastWorkoutDate: row.last_workout_date,
    updatedAt: row.updated_at,
  };
}

export async function updateStreakForWorkout(
  db: Db,
  userId: string,
  performedAtIso: string
): Promise<{ streak: PlayerStreak; streakBonusXp: number }> {
  const workoutDate = performedAtIso.slice(0, 10);
  const existing = await db.getFirstAsync<{
    current_streak: number;
    best_streak: number;
    last_workout_date: string | null;
  }>(
    `SELECT current_streak, best_streak, last_workout_date
     FROM player_streaks
     WHERE user_id = ?`,
    [userId]
  );

  let currentStreak = 1;
  let streakBonusXp = 0;

  if (!existing?.last_workout_date) {
    currentStreak = 1;
  } else {
    const gap = daysBetween(existing.last_workout_date, workoutDate);
    if (gap === 0) {
      // Same day — keep streak, no bonus again.
      currentStreak = Math.max(1, existing.current_streak);
      streakBonusXp = 0;
    } else if (gap === 1) {
      currentStreak = existing.current_streak + 1;
      streakBonusXp = Math.min(50, 5 * currentStreak);
    } else {
      currentStreak = 1;
      streakBonusXp = 0;
    }
  }

  const bestStreak = Math.max(existing?.best_streak ?? 0, currentStreak);
  const updatedAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO player_streaks (user_id, current_streak, best_streak, last_workout_date, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       current_streak = excluded.current_streak,
       best_streak = excluded.best_streak,
       last_workout_date = excluded.last_workout_date,
       updated_at = excluded.updated_at`,
    [userId, currentStreak, bestStreak, workoutDate, updatedAt]
  );

  return {
    streak: {
      userId,
      currentStreak,
      bestStreak,
      lastWorkoutDate: workoutDate,
      updatedAt,
    },
    streakBonusXp,
  };
}

export async function progressDailyQuestsFromWorkout(
  db: Db,
  userId: string,
  input: {
    performedAtIso: string;
    categoryPoints: Record<ExerciseCategory, number>;
    regionLoads: Record<string, number>;
  }
): Promise<{ completedQuests: DailyQuest[]; bonusXp: number }> {
  const dateKey = input.performedAtIso.slice(0, 10);
  const quests = await ensureDailyQuests(db, userId, dateKey);
  const completedQuests: DailyQuest[] = [];
  let bonusXp = 0;

  for (const quest of quests) {
    if (quest.completed) continue;

    let progress = quest.progressValue;

    if (quest.questKey === 'complete_workout') {
      progress = 1;
    } else if (quest.questKey.startsWith('train_')) {
      const regionName = REGION_QUESTS.find((q) => q.key === quest.questKey)?.region;
      if (regionName && (input.regionLoads[regionName] ?? 0) > 0) {
        progress = 1;
      }
    } else if (quest.questKey === 'category_strength' && input.categoryPoints.strength > 0) {
      progress = 1;
    } else if (quest.questKey === 'category_cardio' && input.categoryPoints.cardio > 0) {
      progress = 1;
    }

    if (progress <= quest.progressValue) continue;

    const completed = progress >= quest.targetValue ? 1 : 0;
    const completedAt = completed ? new Date().toISOString() : null;

    await db.runAsync(
      `UPDATE daily_quests
       SET progress_value = ?, completed = ?, completed_at = ?
       WHERE id = ?`,
      [progress, completed, completedAt, quest.id]
    );

    if (completed) {
      bonusXp += quest.xpReward;
      completedQuests.push({
        ...quest,
        progressValue: progress,
        completed: true,
        completedAt,
      });
    }
  }

  return { completedQuests, bonusXp };
}

function mapQuestRow(row: {
  id: string;
  user_id: string;
  quest_date: string;
  quest_key: string;
  title: string;
  description: string;
  target_value: number;
  progress_value: number;
  xp_reward: number;
  completed: number;
  completed_at: string | null;
}): DailyQuest {
  return {
    id: row.id,
    userId: row.user_id,
    questDate: row.quest_date,
    questKey: row.quest_key,
    title: row.title,
    description: row.description,
    targetValue: row.target_value,
    progressValue: row.progress_value,
    xpReward: row.xp_reward,
    completed: row.completed === 1,
    completedAt: row.completed_at,
  };
}
