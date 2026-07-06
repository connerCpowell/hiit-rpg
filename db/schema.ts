export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS muscle_groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  parent_region_id TEXT REFERENCES muscle_groups(id),
  map_slot TEXT
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility')),
  equipment TEXT NOT NULL DEFAULT '[]',
  is_compound INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('wger', 'manual', 'user'))
);

CREATE TABLE IF NOT EXISTS exercise_muscle_activation (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id TEXT NOT NULL REFERENCES muscle_groups(id),
  activation REAL NOT NULL CHECK (activation >= 0 AND activation <= 10),
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary', 'stabilizer')),
  PRIMARY KEY (exercise_id, muscle_id)
);

CREATE TABLE IF NOT EXISTS exercise_aliases (
  alias TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  performed_at TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_session_items (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  weight REAL NOT NULL DEFAULT 0,
  volume REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_activation_muscle ON exercise_muscle_activation(muscle_id);
CREATE INDEX IF NOT EXISTS idx_aliases_exercise ON exercise_aliases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_session_items_session ON workout_session_items(session_id);
`;
