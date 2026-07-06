import { join } from 'node:path';
import {
  DATA_DIR,
  REGIONS,
  activationRole,
  fetchAllPages,
  mapWgerMuscle,
  readJson,
  slugify,
  writeJson,
} from './utils';
import type { ExerciseCategory, ExerciseSource } from '../src/types/exercise';

const WGER_BASE = 'https://wger.de/api/v2';

interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerEquipment {
  id: number;
  name: string;
}

interface WgerTranslation {
  id: number;
  name: string;
  language: number;
  aliases?: Array<{ alias: string }>;
}

interface WgerExerciseInfo {
  id: number;
  name?: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations?: WgerTranslation[];
}

const ENGLISH_LANGUAGE_ID = 2;

function getEnglishTranslation(info: WgerExerciseInfo): WgerTranslation | null {
  const translations = info.translations ?? [];
  return (
    translations.find((t) => t.language === ENGLISH_LANGUAGE_ID) ??
    translations.find((t) => t.name?.trim()) ??
    null
  );
}

interface SeedMuscle {
  id: string;
  name: string;
  parentRegionId: string;
  mapSlot: string | null;
  wgerId: number | null;
}

interface SeedExercise {
  id: string;
  name: string;
  slug: string;
  category: ExerciseCategory;
  equipment: string[];
  isCompound: boolean;
  source: ExerciseSource;
  wgerId: number;
}

interface SeedActivation {
  exerciseId: string;
  muscleId: string;
  activation: number;
  role: ReturnType<typeof activationRole>;
}

function mapCategory(name: string): ExerciseCategory {
  const lower = name.toLowerCase();
  if (lower.includes('cardio')) return 'cardio';
  if (lower.includes('stretch') || lower.includes('flex')) return 'flexibility';
  return 'strength';
}

function inferRegionForMuscle(muscleId: string): string {
  const regionByMuscle: Record<string, string> = {
    biceps: 'arms',
    brachialis: 'arms',
    triceps: 'arms',
    forearms: 'arms',
    pectorals: 'chest',
    serratus: 'chest',
    lats: 'back',
    traps: 'back',
    erector_spinae: 'back',
    rhomboids: 'back',
    deltoids: 'shoulders',
    abs: 'core',
    obliques: 'core',
    quads: 'legs',
    hamstrings: 'legs',
    glutes: 'legs',
    calves: 'legs',
    soleus: 'legs',
    hip_flexors: 'legs',
    adductors: 'legs',
  };
  return regionByMuscle[muscleId] ?? 'core';
}

function isCompoundExercise(muscles: WgerMuscle[], secondary: WgerMuscle[]): boolean {
  const total = new Set([...muscles, ...secondary].map((m) => m.id));
  return total.size >= 3 || muscles.length >= 2;
}

async function main(): Promise<void> {
  console.log('Fetching wger muscles...');
  const wgerMuscles = await fetchAllPages<WgerMuscle>(`${WGER_BASE}/muscle/?limit=100`);

  console.log('Fetching wger exercises...');
  const wgerExercises = await fetchAllPages<WgerExerciseInfo>(
    `${WGER_BASE}/exerciseinfo/?limit=100`
  );

  const muscleById = new Map<string, SeedMuscle>();

  function ensureMuscle(muscleId: string, regionId = 'core'): void {
    if (muscleById.has(muscleId)) return;
    const name = muscleId
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    muscleById.set(muscleId, {
      id: muscleId,
      name,
      parentRegionId: regionId,
      mapSlot: null,
      wgerId: null,
    });
  }

  for (const region of REGIONS) {
    muscleById.set(region.id, {
      id: region.id,
      name: region.name,
      parentRegionId: region.id,
      mapSlot: region.mapSlot,
      wgerId: null,
    });
  }

  // Regions are their own parent for rollup; detailed muscles point to a region id.

  for (const wgerMuscle of wgerMuscles) {
    const mapped = mapWgerMuscle(wgerMuscle.name_en || wgerMuscle.name);
    if (!muscleById.has(mapped.id)) {
      muscleById.set(mapped.id, {
        id: mapped.id,
        name: mapped.name,
        parentRegionId: mapped.regionId,
        mapSlot: null,
        wgerId: wgerMuscle.id,
      });
    }
  }

  const exercises: SeedExercise[] = [];
  const activations: SeedActivation[] = [];
  const aliases: Array<{ alias: string; exerciseId: string }> = [];
  const usedSlugs = new Set<string>();

  for (const info of wgerExercises) {
    const translation = getEnglishTranslation(info);
    const exerciseName = translation?.name?.trim() || info.name?.trim();
    if (!exerciseName) continue;

    let slug = slugify(exerciseName);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${info.id}`;
    }
    usedSlugs.add(slug);
    const exerciseId = `wger-${info.id}`;

    exercises.push({
      id: exerciseId,
      name: exerciseName,
      slug,
      category: mapCategory(info.category?.name ?? 'strength'),
      equipment: info.equipment?.map((e) => e.name) ?? [],
      isCompound: isCompoundExercise(info.muscles ?? [], info.muscles_secondary ?? []),
      source: 'wger',
      wgerId: info.id,
    });

    for (const muscle of info.muscles ?? []) {
      const mapped = mapWgerMuscle(muscle.name_en || muscle.name);
      ensureMuscle(mapped.id, mapped.regionId);
      activations.push({
        exerciseId,
        muscleId: mapped.id,
        activation: 10,
        role: 'primary',
      });
    }

    for (const muscle of info.muscles_secondary ?? []) {
      const mapped = mapWgerMuscle(muscle.name_en || muscle.name);
      ensureMuscle(mapped.id, mapped.regionId);
      activations.push({
        exerciseId,
        muscleId: mapped.id,
        activation: 6,
        role: 'secondary',
      });
    }

    for (const aliasEntry of translation?.aliases ?? []) {
      const alias = aliasEntry.alias?.toLowerCase().trim();
      if (alias) {
        aliases.push({ alias, exerciseId });
      }
    }
  }

  const overrides = readJson<Record<string, Record<string, number>>>(
    join(DATA_DIR, 'exercise-overrides.json')
  );

  const overrideSlugToExerciseId = new Map<string, string>();
  for (const exercise of exercises) {
    overrideSlugToExerciseId.set(exercise.slug, exercise.id);
  }

  const manualAliases = readJson<Record<string, string[]>>(
    join(DATA_DIR, 'exercise-aliases.json')
  );

  const activationKey = (exerciseId: string, muscleId: string) => `${exerciseId}::${muscleId}`;
  const activationMap = new Map<string, SeedActivation>();
  for (const row of activations) {
    activationMap.set(activationKey(row.exerciseId, row.muscleId), row);
  }

  let overrideCount = 0;
  for (const [overrideSlug, muscleScores] of Object.entries(overrides)) {
    let exerciseId = overrideSlugToExerciseId.get(overrideSlug);

    if (!exerciseId) {
      const matched = exercises.find((e) => e.slug === overrideSlug);
      if (matched) {
        exerciseId = matched.id;
        overrideSlugToExerciseId.set(overrideSlug, exerciseId);
      }
    }

    if (!exerciseId) {
      exerciseId = `manual-${overrideSlug}`;
      exercises.push({
        id: exerciseId,
        name: overrideSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        slug: overrideSlug,
        category: 'strength',
        equipment: [],
        isCompound: Object.keys(muscleScores).length >= 3,
        source: 'manual',
        wgerId: -1,
      });
      overrideSlugToExerciseId.set(overrideSlug, exerciseId);
    }

    for (const [muscleId, score] of Object.entries(muscleScores)) {
      ensureMuscle(muscleId, inferRegionForMuscle(muscleId));
      activationMap.set(activationKey(exerciseId, muscleId), {
        exerciseId,
        muscleId,
        activation: score,
        role: activationRole(score),
      });
      overrideCount += 1;
    }
  }

  const aliasMap = new Map<string, string>();
  for (const row of aliases) {
    aliasMap.set(row.alias, row.exerciseId);
  }

  for (const [slug, aliasList] of Object.entries(manualAliases)) {
    const exerciseId = overrideSlugToExerciseId.get(slug);
    if (!exerciseId) continue;
    for (const alias of aliasList) {
      aliasMap.set(alias.toLowerCase().trim(), exerciseId);
    }
    aliasMap.set(slug, exerciseId);
  }

  const dedupedAliases = [...aliasMap.entries()].map(([alias, exerciseId]) => ({
    alias,
    exerciseId,
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    muscles: [...muscleById.values()],
    exercises,
    activations: [...activationMap.values()],
    aliases: dedupedAliases,
    stats: {
      muscleCount: muscleById.size,
      exerciseCount: exercises.length,
      activationCount: activationMap.size,
      aliasCount: dedupedAliases.length,
      overrideRowsApplied: overrideCount,
    },
  };

  writeJson(join(DATA_DIR, 'muscles.snapshot.json'), snapshot.muscles);
  writeJson(join(DATA_DIR, 'exercises.snapshot.json'), {
    generatedAt: snapshot.generatedAt,
    exercises: snapshot.exercises,
    activations: snapshot.activations,
    aliases: snapshot.aliases,
    stats: snapshot.stats,
  });

  console.log('Seed complete:', snapshot.stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
