import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import type { ExerciseWithActivations } from '../types/exercise';

const DB_NAME = 'workout.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

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

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  await ensureDatabaseCopied();
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
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
