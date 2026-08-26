import type { PlayerAttribute, PlayerAttributeId, PlayerMuscleProgress } from '../types/player';

export type PortraitStageId = 'novice' | 'trainee' | 'athlete' | 'champion' | 'legend';

export interface PortraitStage {
  id: PortraitStageId;
  name: string;
  minLevel: number;
  blurb: string;
}

/** Form tiers unlock every 30 levels. */
export const PORTRAIT_STAGES: PortraitStage[] = [
  {
    id: 'novice',
    name: 'Novice',
    minLevel: 1,
    blurb: 'Just starting the journey.',
  },
  {
    id: 'trainee',
    name: 'Trainee',
    minLevel: 30,
    blurb: 'Form is tightening. Gear starts to fit.',
  },
  {
    id: 'athlete',
    name: 'Athlete',
    minLevel: 60,
    blurb: 'Trained and marked by real volume.',
  },
  {
    id: 'champion',
    name: 'Champion',
    minLevel: 90,
    blurb: 'A proven fighter with presence.',
  },
  {
    id: 'legend',
    name: 'Legend',
    minLevel: 120,
    blurb: 'Rare presence. Aura of consistency.',
  },
];

export type PortraitVisualTag =
  | 'cardio_sash'
  | 'strength_gauntlets'
  | 'flexibility_bands'
  | 'endurance_aura'
  | 'consistency_flame'
  | 'arms_bands'
  | 'core_plate'
  | 'legs_greaves'
  | 'chest_crest'
  | 'back_cloak'
  | 'shoulders_pads';

export function portraitStageForLevel(level: number): PortraitStage {
  const safeLevel = Math.max(1, Math.floor(level));
  let current = PORTRAIT_STAGES[0];
  for (const stage of PORTRAIT_STAGES) {
    if (safeLevel >= stage.minLevel) current = stage;
  }
  return current;
}

export function nextPortraitStage(level: number): PortraitStage | null {
  const current = portraitStageForLevel(level);
  const index = PORTRAIT_STAGES.findIndex((stage) => stage.id === current.id);
  return PORTRAIT_STAGES[index + 1] ?? null;
}

const ATTRIBUTE_ACCENTS: Record<PlayerAttributeId, string> = {
  strength: '#f97316',
  cardio: '#38bdf8',
  flexibility: '#a3e635',
  endurance: '#818cf8',
  consistency: '#fbbf24',
};

export const VISUAL_TAG_COLORS: Record<PortraitVisualTag, string> = {
  cardio_sash: '#38bdf8',
  strength_gauntlets: '#f97316',
  flexibility_bands: '#a3e635',
  endurance_aura: '#818cf8',
  consistency_flame: '#fbbf24',
  arms_bands: '#ca8a04',
  core_plate: '#65a30d',
  legs_greaves: '#2563eb',
  chest_crest: '#dc2626',
  back_cloak: '#b45309',
  shoulders_pads: '#ea580c',
};

export function dominantAttributeAccent(attributes: PlayerAttribute[]): {
  attributeId: PlayerAttributeId;
  accent: string;
} {
  let best: PlayerAttribute | null = null;
  for (const attribute of attributes) {
    if (!best || attribute.xp > best.xp) best = attribute;
  }
  const attributeId = best?.attributeId ?? 'consistency';
  return {
    attributeId,
    accent: ATTRIBUTE_ACCENTS[attributeId],
  };
}

export function regionXpTotals(muscles: PlayerMuscleProgress[]): Record<string, number> {
  const totals: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Core: 0,
    Legs: 0,
  };
  for (const muscle of muscles) {
    const region = muscle.regionName ?? 'Core';
    totals[region] = (totals[region] ?? 0) + muscle.xp;
  }
  return totals;
}
