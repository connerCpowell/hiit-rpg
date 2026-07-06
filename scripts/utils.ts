import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = join(ROOT, 'data');
export const DB_DIR = join(ROOT, 'db');
export const ASSETS_DB_PATH = join(ROOT, 'assets', 'workout.db');

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export function writeJson(path: string, data: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

export interface RegionDef {
  id: string;
  name: string;
  mapSlot: string;
}

export const REGIONS: RegionDef[] = [
  { id: 'chest', name: 'Chest', mapSlot: 'chest' },
  { id: 'back', name: 'Back', mapSlot: 'back' },
  { id: 'shoulders', name: 'Shoulders', mapSlot: 'shoulders' },
  { id: 'arms', name: 'Arms', mapSlot: 'arms' },
  { id: 'core', name: 'Core', mapSlot: 'core' },
  { id: 'legs', name: 'Legs', mapSlot: 'legs' },
];

/** Maps wger muscle name_en (lowercase) to our detailed muscle id + parent region. */
export const WGER_MUSCLE_MAP: Record<string, { id: string; regionId: string; name: string }> = {
  'biceps brachii': { id: 'biceps', regionId: 'arms', name: 'Biceps' },
  brachialis: { id: 'brachialis', regionId: 'arms', name: 'Brachialis' },
  'triceps brachii': { id: 'triceps', regionId: 'arms', name: 'Triceps' },
  brachioradialis: { id: 'forearms', regionId: 'arms', name: 'Forearms' },
  'pectoralis major': { id: 'pectorals', regionId: 'chest', name: 'Pectorals' },
  'latissimus dorsi': { id: 'lats', regionId: 'back', name: 'Lats' },
  trapezius: { id: 'traps', regionId: 'back', name: 'Traps' },
  'erector spinae': { id: 'erector_spinae', regionId: 'back', name: 'Erector Spinae' },
  'rhomboids major': { id: 'rhomboids', regionId: 'back', name: 'Rhomboids' },
  deltoids: { id: 'deltoids', regionId: 'shoulders', name: 'Deltoids' },
  'rectus abdominis': { id: 'abs', regionId: 'core', name: 'Abs' },
  'obliquus externus abdominis': { id: 'obliques', regionId: 'core', name: 'Obliques' },
  'quadriceps femoris': { id: 'quads', regionId: 'legs', name: 'Quads' },
  'biceps femoris': { id: 'hamstrings', regionId: 'legs', name: 'Hamstrings' },
  'gluteus maximus': { id: 'glutes', regionId: 'legs', name: 'Glutes' },
  gastrocnemius: { id: 'calves', regionId: 'legs', name: 'Calves' },
  soleus: { id: 'soleus', regionId: 'legs', name: 'Soleus' },
  'serratus anterior': { id: 'serratus', regionId: 'chest', name: 'Serratus' },
  'tensor fasciae latae': { id: 'hip_flexors', regionId: 'legs', name: 'Hip Flexors' },
  'adductor magnus': { id: 'adductors', regionId: 'legs', name: 'Adductors' },
};

export function mapWgerMuscle(nameEn: string): { id: string; regionId: string; name: string } {
  const key = nameEn.toLowerCase().trim();
  const mapped = WGER_MUSCLE_MAP[key];
  if (mapped) return mapped;

  const fallbackId = slugify(nameEn).replace(/-/g, '_');
  const regionId = inferRegionFromName(nameEn);
  return { id: fallbackId, regionId, name: nameEn };
}

function inferRegionFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bicep') || lower.includes('tricep') || lower.includes('forearm') || lower.includes('brachi')) {
    return 'arms';
  }
  if (lower.includes('pect') || lower.includes('chest')) return 'chest';
  if (lower.includes('lat') || lower.includes('trap') || lower.includes('rhomb') || lower.includes('spinae')) {
    return 'back';
  }
  if (lower.includes('delt') || lower.includes('shoulder')) return 'shoulders';
  if (lower.includes('abdom') || lower.includes('obliqu') || lower.includes('core') || lower.includes('abs')) {
    return 'core';
  }
  if (
    lower.includes('quad') ||
    lower.includes('hamstring') ||
    lower.includes('glute') ||
    lower.includes('calf') ||
    lower.includes('gastroc') ||
    lower.includes('soleus') ||
    lower.includes('femoris')
  ) {
    return 'legs';
  }
  return 'core';
}

export function activationRole(score: number): 'primary' | 'secondary' | 'stabilizer' {
  if (score >= 8) return 'primary';
  if (score >= 4) return 'secondary';
  return 'stabilizer';
}

export async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;

  while (next) {
    const response = await fetch(next);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${next}: ${response.status} ${response.statusText}`);
    }
    const page = (await response.json()) as { results: T[]; next: string | null };
    results.push(...page.results);
    next = page.next;
  }

  return results;
}
