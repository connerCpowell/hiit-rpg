import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../db/schema';
import { ASSETS_DB_PATH, DATA_DIR, ensureDir, readJson } from './utils';

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

function main(): void {
  const musclesPath = join(DATA_DIR, 'muscles.snapshot.json');
  const exercisesPath = join(DATA_DIR, 'exercises.snapshot.json');

  if (!existsSync(musclesPath) || !existsSync(exercisesPath)) {
    console.error('Snapshot files missing. Run: npm run seed');
    process.exit(1);
  }

  const muscles = readJson<SnapshotMuscle[]>(musclesPath);
  const exerciseData = readJson<{
    exercises: SnapshotExercise[];
    activations: SnapshotActivation[];
    aliases: SnapshotAlias[];
  }>(exercisesPath);

  ensureDir(join(ASSETS_DB_PATH, '..'));

  if (existsSync(ASSETS_DB_PATH)) unlinkSync(ASSETS_DB_PATH);

  const db = new DatabaseSync(ASSETS_DB_PATH);
  db.exec(SCHEMA_SQL);

  const insertMuscle = db.prepare(
    'INSERT INTO muscle_groups (id, name, parent_region_id, map_slot) VALUES (?, ?, ?, ?)'
  );
  const insertExercise = db.prepare(
    `INSERT INTO exercises (id, name, slug, category, equipment, is_compound, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertActivation = db.prepare(
    `INSERT INTO exercise_muscle_activation (exercise_id, muscle_id, activation, role)
     VALUES (?, ?, ?, ?)`
  );
  const insertAlias = db.prepare('INSERT INTO exercise_aliases (alias, exercise_id) VALUES (?, ?)');
  const insertUser = db.prepare(
    'INSERT INTO users (id, display_name, created_at) VALUES (?, ?, ?)'
  );

  db.exec('BEGIN');
  try {
    for (const muscle of muscles) {
      insertMuscle.run(muscle.id, muscle.name, muscle.parentRegionId, muscle.mapSlot);
    }

    for (const exercise of exerciseData.exercises) {
      insertExercise.run(
        exercise.id,
        exercise.name,
        exercise.slug,
        exercise.category,
        JSON.stringify(exercise.equipment),
        exercise.isCompound ? 1 : 0,
        exercise.source
      );
    }

    for (const row of exerciseData.activations) {
      insertActivation.run(row.exerciseId, row.muscleId, row.activation, row.role);
    }

    for (const row of exerciseData.aliases) {
      insertAlias.run(row.alias, row.exerciseId);
    }

    insertUser.run('local-user', 'Player One', new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  db.close();

  console.log('Database built:', {
    path: ASSETS_DB_PATH,
    muscles: muscles.length,
    exercises: exerciseData.exercises.length,
    activations: exerciseData.activations.length,
    aliases: exerciseData.aliases.length,
  });
}

main();
