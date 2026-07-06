import { DatabaseSync } from 'node:sqlite';
import { ASSETS_DB_PATH } from './utils';

const db = new DatabaseSync(ASSETS_DB_PATH);

const curl = db
  .prepare(`SELECT id, name, slug FROM exercises WHERE slug = 'barbell-curl'`)
  .get() as { id: string; name: string; slug: string } | undefined;

if (!curl) {
  console.error('barbell-curl not found');
  process.exit(1);
}

const activations = db
  .prepare(
    `SELECT m.name, ema.activation, ema.role
     FROM exercise_muscle_activation ema
     JOIN muscle_groups m ON m.id = ema.muscle_id
     WHERE ema.exercise_id = ?
     ORDER BY ema.activation DESC`
  )
  .all(curl.id);

console.log(curl);
console.table(activations);
