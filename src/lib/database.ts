import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { SCHEMA_SQL } from '../../db/schema';
import type { ExerciseWithActivations } from '../types/exercise';

const DB_NAME = 'workout.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

interface SnapshotMuscle {
  id: string;
  name: string;
  parentRegionId: string;
  mapSlot: string | null;
}

interface SnapshotExercise {
  id: string;
  name: string;
  slug: string;
  category: string;
  equipment: string[];
  isCompound: boolean;
  source: string;
}

interface SnapshotActivation {
  exerciseId: string;
  muscleId: string;
  activation: number;
  role: string;
}

interface SnapshotAlias {
  alias: string;
  exerciseId: string;
}

interface ExerciseSnapshot {
  exercises: SnapshotExercise[];
  activations: SnapshotActivation[];
  aliases: SnapshotAlias[];
}

async function ensureRuntimeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_session_muscle_loads (
      session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      muscle_id TEXT NOT NULL REFERENCES muscle_groups(id),
      load REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (session_id, muscle_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workout_muscle_loads_muscle
      ON workout_session_muscle_loads(muscle_id);
  `);
}

async function ensureDatabaseCopied(): Promise<void> {
  const dbDirectory = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbDirectory}/${DB_NAME}`;

  const existing = await FileSystem.getInfoAsync(dbPath);
  if (existing.exists) return;

  const dirInfo = await FileSystem.getInfoAsync(dbDirectory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const asset = Asset.fromModule(require('../../assets/workout.db'));
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('Failed to load bundled workout database asset.');
  }

  await FileSystem.copyAsync({ from: asset.localUri, to: dbPath });
}

async function ensureWebDatabaseSeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);

  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM exercises'
  );
  if ((existing?.count ?? 0) > 0) return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const muscles = require('../../data/muscles.snapshot.json') as SnapshotMuscle[];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const exerciseData = require('../../data/exercises.snapshot.json') as ExerciseSnapshot;

  await db.execAsync('BEGIN');
  try {
    for (const muscle of muscles) {
      await db.runAsync(
        'INSERT INTO muscle_groups (id, name, parent_region_id, map_slot) VALUES (?, ?, ?, ?)',
        [muscle.id, muscle.name, muscle.parentRegionId, muscle.mapSlot]
      );
    }

    for (const exercise of exerciseData.exercises) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, slug, category, equipment, is_compound, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.name,
          exercise.slug,
          exercise.category,
          JSON.stringify(exercise.equipment),
          exercise.isCompound ? 1 : 0,
          exercise.source,
        ]
      );
    }

    for (const row of exerciseData.activations) {
      await db.runAsync(
        `INSERT INTO exercise_muscle_activation (exercise_id, muscle_id, activation, role)
         VALUES (?, ?, ?, ?)`,
        [row.exerciseId, row.muscleId, row.activation, row.role]
      );
    }

    for (const row of exerciseData.aliases) {
      await db.runAsync(
        'INSERT INTO exercise_aliases (alias, exercise_id) VALUES (?, ?)',
        [row.alias, row.exerciseId]
      );
    }

    await db.runAsync(
      'INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)',
      ['local-user', 'Player One', new Date().toISOString()]
    );
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS !== 'web') {
    await ensureDatabaseCopied();
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  if (Platform.OS === 'web') {
    await ensureWebDatabaseSeeded(db);
  }
  await ensureRuntimeSchema(db);
  dbInstance = db;
  return dbInstance;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (!dbPromise) {
    dbPromise = initializeDatabase().finally(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export interface ExerciseSearchResult {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export async function searchExercises(
  query: string,
  limit = 25
): Promise<ExerciseSearchResult[]> {
  const db = await getDatabase();
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return db.getAllAsync<ExerciseSearchResult>(
      `SELECT id, name, slug, category FROM exercises
       ORDER BY name LIMIT ?`,
      [limit]
    );
  }

  const like = `%${trimmed}%`;
  return db.getAllAsync<ExerciseSearchResult>(
    `SELECT DISTINCT e.id, e.name, e.slug, e.category
     FROM exercises e
     LEFT JOIN exercise_aliases a ON a.exercise_id = e.id
     WHERE lower(e.name) LIKE ? OR lower(e.slug) LIKE ? OR lower(a.alias) LIKE ?
     ORDER BY e.name LIMIT ?`,
    [like, like, like, limit]
  );
}

export async function getExerciseActivations(
  exerciseId: string
): Promise<ExerciseWithActivations | null> {
  const db = await getDatabase();

  const exercise = await db.getFirstAsync<{
    id: string;
    name: string;
    slug: string;
    category: string;
    equipment: string;
    is_compound: number;
    source: string;
  }>(
    `SELECT id, name, slug, category, equipment, is_compound, source
     FROM exercises WHERE id = ?`,
    [exerciseId]
  );

  if (!exercise) return null;

  const activations = await db.getAllAsync<{
    muscle_id: string;
    activation: number;
    role: string;
    muscle_name: string;
    region_name: string | null;
  }>(
    `SELECT
       ema.muscle_id,
       ema.activation,
       ema.role,
       m.name AS muscle_name,
       r.name AS region_name
     FROM exercise_muscle_activation ema
     JOIN muscle_groups m ON m.id = ema.muscle_id
     LEFT JOIN muscle_groups r ON r.id = m.parent_region_id AND r.map_slot IS NOT NULL
     WHERE ema.exercise_id = ?
     ORDER BY ema.activation DESC`,
    [exerciseId]
  );

  return {
    id: exercise.id,
    name: exercise.name,
    slug: exercise.slug,
    category: exercise.category as ExerciseWithActivations['category'],
    equipment: JSON.parse(exercise.equipment) as string[],
    isCompound: exercise.is_compound === 1,
    source: exercise.source as ExerciseWithActivations['source'],
    activations: activations.map((row) => ({
      exerciseId: exercise.id,
      muscleId: row.muscle_id,
      activation: row.activation,
      role: row.role as ExerciseWithActivations['activations'][number]['role'],
      muscleName: row.muscle_name,
      regionName: row.region_name,
    })),
  };
}
