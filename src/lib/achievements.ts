import type { SQLiteDatabase } from 'expo-sqlite';
import type { PortraitVisualTag } from './portrait';
import type { PlayerAttribute, PlayerAttributeId, PlayerMuscleProgress } from '../types/player';
import { regionXpTotals } from './portrait';

type Db = SQLiteDatabase;

export type AchievementFocus =
  | 'cardio'
  | 'strength'
  | 'flexibility'
  | 'endurance'
  | 'consistency'
  | 'arms'
  | 'core'
  | 'legs'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'general';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  focus: AchievementFocus;
  visualTag: PortraitVisualTag | null;
  xpReward: number;
}

export interface PlayerAchievement {
  id: string;
  title: string;
  description: string;
  focus: AchievementFocus;
  visualTag: PortraitVisualTag | null;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementEvalContext {
  workoutCount: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  attributes: PlayerAttribute[];
  muscles: PlayerMuscleProgress[];
}

/** Focus badges + milestones. Visual tags change portrait gear. */
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Log your first workout',
    focus: 'general',
    visualTag: null,
    xpReward: 10,
  },
  {
    id: 'wind_runner',
    title: 'Wind Runner',
    description: 'Reach 80 cardio XP',
    focus: 'cardio',
    visualTag: 'cardio_sash',
    xpReward: 25,
  },
  {
    id: 'iron_lifter',
    title: 'Iron Lifter',
    description: 'Reach 80 strength XP',
    focus: 'strength',
    visualTag: 'strength_gauntlets',
    xpReward: 25,
  },
  {
    id: 'limber_soul',
    title: 'Limber Soul',
    description: 'Reach 60 flexibility XP',
    focus: 'flexibility',
    visualTag: 'flexibility_bands',
    xpReward: 25,
  },
  {
    id: 'long_haul',
    title: 'Long Haul',
    description: 'Reach 80 endurance XP',
    focus: 'endurance',
    visualTag: 'endurance_aura',
    xpReward: 25,
  },
  {
    id: 'steady_flame',
    title: 'Steady Flame',
    description: 'Reach a 5-day streak',
    focus: 'consistency',
    visualTag: 'consistency_flame',
    xpReward: 30,
  },
  {
    id: 'arm_forge',
    title: 'Arm Forge',
    description: 'Earn 100 Arms region XP',
    focus: 'arms',
    visualTag: 'arms_bands',
    xpReward: 30,
  },
  {
    id: 'core_keeper',
    title: 'Core Keeper',
    description: 'Earn 100 Core region XP',
    focus: 'core',
    visualTag: 'core_plate',
    xpReward: 30,
  },
  {
    id: 'leg_engine',
    title: 'Leg Engine',
    description: 'Earn 100 Legs region XP',
    focus: 'legs',
    visualTag: 'legs_greaves',
    xpReward: 30,
  },
  {
    id: 'chest_plate',
    title: 'Chest Plate',
    description: 'Earn 100 Chest region XP',
    focus: 'chest',
    visualTag: 'chest_crest',
    xpReward: 30,
  },
  {
    id: 'back_line',
    title: 'Back Line',
    description: 'Earn 100 Back region XP',
    focus: 'back',
    visualTag: 'back_cloak',
    xpReward: 30,
  },
  {
    id: 'shoulder_guard',
    title: 'Shoulder Guard',
    description: 'Earn 100 Shoulders region XP',
    focus: 'shoulders',
    visualTag: 'shoulders_pads',
    xpReward: 30,
  },
  {
    id: 'cardio_devotee',
    title: 'Cardio Devotee',
    description: 'Reach 250 cardio XP',
    focus: 'cardio',
    visualTag: 'cardio_sash',
    xpReward: 50,
  },
  {
    id: 'flex_master',
    title: 'Flex Master',
    description: 'Reach 180 flexibility XP',
    focus: 'flexibility',
    visualTag: 'flexibility_bands',
    xpReward: 50,
  },
  {
    id: 'arm_tyrant',
    title: 'Arm Tyrant',
    description: 'Earn 300 Arms region XP',
    focus: 'arms',
    visualTag: 'arms_bands',
    xpReward: 50,
  },
  {
    id: 'core_sovereign',
    title: 'Core Sovereign',
    description: 'Earn 300 Core region XP',
    focus: 'core',
    visualTag: 'core_plate',
    xpReward: 50,
  },
];

function attrXp(attributes: PlayerAttribute[], id: PlayerAttributeId): number {
  return attributes.find((row) => row.attributeId === id)?.xp ?? 0;
}

function isUnlocked(def: AchievementDef, ctx: AchievementEvalContext): boolean {
  const regions = regionXpTotals(ctx.muscles);

  switch (def.id) {
    case 'first_steps':
      return ctx.workoutCount >= 1;
    case 'wind_runner':
      return attrXp(ctx.attributes, 'cardio') >= 80;
    case 'iron_lifter':
      return attrXp(ctx.attributes, 'strength') >= 80;
    case 'limber_soul':
      return attrXp(ctx.attributes, 'flexibility') >= 60;
    case 'long_haul':
      return attrXp(ctx.attributes, 'endurance') >= 80;
    case 'steady_flame':
      return ctx.bestStreak >= 5 || ctx.currentStreak >= 5;
    case 'arm_forge':
      return (regions.Arms ?? 0) >= 100;
    case 'core_keeper':
      return (regions.Core ?? 0) >= 100;
    case 'leg_engine':
      return (regions.Legs ?? 0) >= 100;
    case 'chest_plate':
      return (regions.Chest ?? 0) >= 100;
    case 'back_line':
      return (regions.Back ?? 0) >= 100;
    case 'shoulder_guard':
      return (regions.Shoulders ?? 0) >= 100;
    case 'cardio_devotee':
      return attrXp(ctx.attributes, 'cardio') >= 250;
    case 'flex_master':
      return attrXp(ctx.attributes, 'flexibility') >= 180;
    case 'arm_tyrant':
      return (regions.Arms ?? 0) >= 300;
    case 'core_sovereign':
      return (regions.Core ?? 0) >= 300;
    default:
      return false;
  }
}

export async function getPlayerAchievements(db: Db, userId: string): Promise<PlayerAchievement[]> {
  const unlockedRows = await db.getAllAsync<{ achievement_id: string; unlocked_at: string }>(
    `SELECT achievement_id, unlocked_at FROM player_achievements WHERE user_id = ?`,
    [userId]
  );
  const unlockedAtById = new Map(unlockedRows.map((row) => [row.achievement_id, row.unlocked_at]));

  return ACHIEVEMENT_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    focus: def.focus,
    visualTag: def.visualTag,
    unlocked: unlockedAtById.has(def.id),
    unlockedAt: unlockedAtById.get(def.id) ?? null,
  }));
}

export async function evaluateAndUnlockAchievements(
  db: Db,
  userId: string,
  ctx: AchievementEvalContext
): Promise<{ newlyUnlocked: PlayerAchievement[]; bonusXp: number }> {
  const existing = await db.getAllAsync<{ achievement_id: string }>(
    `SELECT achievement_id FROM player_achievements WHERE user_id = ?`,
    [userId]
  );
  const owned = new Set(existing.map((row) => row.achievement_id));
  const newlyUnlocked: PlayerAchievement[] = [];
  let bonusXp = 0;
  const now = new Date().toISOString();

  for (const def of ACHIEVEMENT_DEFS) {
    if (owned.has(def.id)) continue;
    if (!isUnlocked(def, ctx)) continue;

    await db.runAsync(
      `INSERT INTO player_achievements (user_id, achievement_id, unlocked_at)
       VALUES (?, ?, ?)`,
      [userId, def.id, now]
    );

    bonusXp += def.xpReward;
    newlyUnlocked.push({
      id: def.id,
      title: def.title,
      description: def.description,
      focus: def.focus,
      visualTag: def.visualTag,
      unlocked: true,
      unlockedAt: now,
    });
  }

  return { newlyUnlocked, bonusXp };
}

export function visualTagsFromAchievements(
  achievements: Array<{ unlocked: boolean; visualTag: PortraitVisualTag | null }>
): PortraitVisualTag[] {
  const tags = new Set<PortraitVisualTag>();
  for (const achievement of achievements) {
    if (achievement.unlocked && achievement.visualTag) {
      tags.add(achievement.visualTag);
    }
  }
  return [...tags];
}
