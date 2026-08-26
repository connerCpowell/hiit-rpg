import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { visualTagsFromAchievements } from '../lib/achievements';
import {
  dominantAttributeAccent,
  nextPortraitStage,
  portraitStageForLevel,
  VISUAL_TAG_COLORS,
  type PortraitStageId,
  type PortraitVisualTag,
} from '../lib/portrait';
import type { PlayerAchievementView, PlayerAttribute } from '../types/player';

interface Props {
  level: number;
  attributes: PlayerAttribute[];
  achievements: PlayerAchievementView[];
}

export default function CharacterPortrait({ level, attributes, achievements }: Props) {
  const stage = portraitStageForLevel(level);
  const next = nextPortraitStage(level);
  const { attributeId, accent } = dominantAttributeAccent(attributes);
  const visualTags = visualTagsFromAchievements(
    achievements.map((row) => ({
      unlocked: row.unlocked,
      visualTag: row.visualTag as PortraitVisualTag | null,
    }))
  );
  const unlockedFocus = achievements.filter((row) => row.unlocked && row.visualTag);

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { borderColor: `${accent}66` }]}>
        <Svg width={220} height={260} viewBox="0 0 220 260">
          <PortraitFigure stageId={stage.id} accent={accent} visualTags={visualTags} />
        </Svg>
      </View>
      <Text style={styles.stageName}>{stage.name}</Text>
      <Text style={styles.blurb}>{stage.blurb}</Text>
      <Text style={styles.meta}>
        Accent from {labelize(attributeId)}
        {next ? ` · next form at Lv ${next.minLevel}` : ' · max form'}
      </Text>
      {unlockedFocus.length > 0 ? (
        <View style={styles.badgeRow}>
          {unlockedFocus.slice(0, 6).map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeChip,
                {
                  borderColor:
                    VISUAL_TAG_COLORS[(badge.visualTag as PortraitVisualTag) ?? 'consistency_flame'] ??
                    accent,
                },
              ]}
            >
              <Text style={styles.badgeChipText}>{badge.title}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.meta}>Earn focus badges to reshape this form.</Text>
      )}
    </View>
  );
}

function PortraitFigure({
  stageId,
  accent,
  visualTags,
}: {
  stageId: PortraitStageId;
  accent: string;
  visualTags: PortraitVisualTag[];
}) {
  const has = (tag: PortraitVisualTag) => visualTags.includes(tag);
  const bulk =
    stageId === 'novice'
      ? 0
      : stageId === 'trainee'
        ? 1
        : stageId === 'athlete'
          ? 2
          : stageId === 'champion'
            ? 3
            : 4;

  const armBoost = has('arms_bands') || has('strength_gauntlets') ? 3 : 0;
  const shoulderBoost = has('shoulders_pads') ? 3 : 0;
  const legBoost = has('legs_greaves') ? 2 : 0;
  const shoulderRx = 28 + bulk * 3 + shoulderBoost;
  const torsoWidth = 54 + bulk * 4 + (has('core_plate') ? 4 : 0);
  const armWidth = 12 + bulk + armBoost;
  const stageAura =
    stageId === 'legend' ? 0.28 : stageId === 'champion' ? 0.18 : stageId === 'athlete' ? 0.1 : 0;
  const enduranceAura = has('endurance_aura') ? 0.2 : 0;
  const auraOpacity = Math.max(stageAura, enduranceAura);
  const auraColor = has('endurance_aura') ? VISUAL_TAG_COLORS.endurance_aura : accent;
  const showCape = stageId === 'champion' || stageId === 'legend' || has('back_cloak');
  const capeColor = has('back_cloak') ? VISUAL_TAG_COLORS.back_cloak : accent;

  return (
    <>
      {auraOpacity > 0 ? (
        <Ellipse
          cx="110"
          cy="130"
          rx={70 + bulk * 4}
          ry={95 + bulk * 3}
          fill={auraColor}
          opacity={auraOpacity}
        />
      ) : null}

      {has('consistency_flame') ? (
        <>
          <Path d="M42 210 C48 190, 58 198, 54 220 Z" fill={VISUAL_TAG_COLORS.consistency_flame} opacity={0.85} />
          <Path d="M168 210 C174 190, 184 198, 180 220 Z" fill={VISUAL_TAG_COLORS.consistency_flame} opacity={0.85} />
        </>
      ) : null}

      {showCape ? (
        <Path
          d="M70 95 C40 140, 35 210, 55 245 L110 210 L165 245 C185 210, 180 140, 150 95 Z"
          fill={stageId === 'legend' ? '#1e293b' : '#0f172a'}
          stroke={capeColor}
          strokeWidth="2"
        />
      ) : null}

      <Rect
        x={110 - torsoWidth / 2 + 4}
        y="175"
        width={torsoWidth / 2 - 6}
        height={55 + legBoost}
        rx="8"
        fill="#334155"
      />
      <Rect
        x={110 + 2}
        y="175"
        width={torsoWidth / 2 - 6}
        height={55 + legBoost}
        rx="8"
        fill="#334155"
      />

      <Rect
        x={110 - torsoWidth / 2 + 2}
        y={220 + legBoost}
        width={torsoWidth / 2 - 2}
        height={has('legs_greaves') || bulk >= 2 ? 18 : 12}
        rx="4"
        fill={has('legs_greaves') ? VISUAL_TAG_COLORS.legs_greaves : bulk >= 3 ? accent : '#1e293b'}
      />
      <Rect
        x={110}
        y={220 + legBoost}
        width={torsoWidth / 2 - 2}
        height={has('legs_greaves') || bulk >= 2 ? 18 : 12}
        rx="4"
        fill={has('legs_greaves') ? VISUAL_TAG_COLORS.legs_greaves : bulk >= 3 ? accent : '#1e293b'}
      />

      <Path
        d={`M${110 - torsoWidth / 2} 95
            C${110 - torsoWidth / 2 - 4} 130, ${110 - torsoWidth / 2} 165, ${110 - 8} 175
            L${110 + 8} 175
            C${110 + torsoWidth / 2} 165, ${110 + torsoWidth / 2 + 4} 130, ${110 + torsoWidth / 2} 95
            Z`}
        fill="#475569"
        stroke={bulk >= 2 || has('chest_crest') ? accent : '#64748b'}
        strokeWidth={bulk >= 2 ? 2 : 1}
      />

      {(bulk >= 2 || has('chest_crest')) && (
        <Path
          d={`M${110 - 18} 108 L110 118 L${110 + 18} 108 L${110 + 14} 145 L110 155 L${110 - 14} 145 Z`}
          fill={has('chest_crest') ? VISUAL_TAG_COLORS.chest_crest : accent}
          opacity={0.6}
        />
      )}

      {has('core_plate') ? (
        <Path
          d="M98 138 L110 132 L122 138 L122 152 L110 158 L98 152 Z"
          fill={VISUAL_TAG_COLORS.core_plate}
          stroke="#f8fafc"
          strokeWidth="1"
        />
      ) : null}

      {has('cardio_sash') ? (
        <Path
          d="M78 100 C110 118, 130 140, 148 168"
          stroke={VISUAL_TAG_COLORS.cardio_sash}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      ) : null}

      <Rect x={110 - torsoWidth / 2 + 6} y="158" width={torsoWidth - 12} height="10" rx="3" fill="#0f172a" />
      {bulk >= 1 || has('core_plate') ? (
        <Circle
          cx="110"
          cy="163"
          r="4"
          fill={has('core_plate') ? VISUAL_TAG_COLORS.core_plate : accent}
        />
      ) : null}

      <Ellipse
        cx={110 - shoulderRx - 6}
        cy="115"
        rx={armWidth}
        ry={28 + bulk + armBoost}
        fill="#64748b"
        stroke={
          has('arms_bands') || has('strength_gauntlets') || bulk >= 2
            ? has('arms_bands')
              ? VISUAL_TAG_COLORS.arms_bands
              : has('strength_gauntlets')
                ? VISUAL_TAG_COLORS.strength_gauntlets
                : accent
            : 'transparent'
        }
        strokeWidth="2"
      />
      <Ellipse
        cx={110 + shoulderRx + 6}
        cy="115"
        rx={armWidth}
        ry={28 + bulk + armBoost}
        fill="#64748b"
        stroke={
          has('arms_bands') || has('strength_gauntlets') || bulk >= 2
            ? has('arms_bands')
              ? VISUAL_TAG_COLORS.arms_bands
              : has('strength_gauntlets')
                ? VISUAL_TAG_COLORS.strength_gauntlets
                : accent
            : 'transparent'
        }
        strokeWidth="2"
      />

      {has('strength_gauntlets') ? (
        <>
          <Rect
            x={110 - shoulderRx - 16}
            y="130"
            width="16"
            height="22"
            rx="4"
            fill={VISUAL_TAG_COLORS.strength_gauntlets}
          />
          <Rect
            x={110 + shoulderRx}
            y="130"
            width="16"
            height="22"
            rx="4"
            fill={VISUAL_TAG_COLORS.strength_gauntlets}
          />
        </>
      ) : null}

      {has('flexibility_bands') ? (
        <>
          <Path
            d={`M${110 - shoulderRx - 4} 100 Q110 120 ${110 + shoulderRx + 4} 100`}
            stroke={VISUAL_TAG_COLORS.flexibility_bands}
            strokeWidth="3"
            fill="none"
          />
          <Path
            d={`M${110 - 16} 180 Q110 195 ${110 + 16} 180`}
            stroke={VISUAL_TAG_COLORS.flexibility_bands}
            strokeWidth="3"
            fill="none"
          />
        </>
      ) : null}

      <Ellipse
        cx={110 - shoulderRx + 8}
        cy="88"
        rx={18 + bulk + shoulderBoost}
        ry={12 + bulk * 0.5}
        fill={has('shoulders_pads') || bulk >= 1 ? '#334155' : '#475569'}
        stroke={
          has('shoulders_pads')
            ? VISUAL_TAG_COLORS.shoulders_pads
            : bulk >= 3
              ? accent
              : '#1e293b'
        }
        strokeWidth={has('shoulders_pads') || bulk >= 3 ? 2 : 1}
      />
      <Ellipse
        cx={110 + shoulderRx - 8}
        cy="88"
        rx={18 + bulk + shoulderBoost}
        ry={12 + bulk * 0.5}
        fill={has('shoulders_pads') || bulk >= 1 ? '#334155' : '#475569'}
        stroke={
          has('shoulders_pads')
            ? VISUAL_TAG_COLORS.shoulders_pads
            : bulk >= 3
              ? accent
              : '#1e293b'
        }
        strokeWidth={has('shoulders_pads') || bulk >= 3 ? 2 : 1}
      />

      <Circle cx="110" cy="52" r={20 + Math.min(bulk, 2)} fill="#94a3b8" />
      <Rect x="102" y="68" width="16" height="14" rx="4" fill="#64748b" />

      {stageId === 'novice' || stageId === 'trainee' ? (
        <Path d="M90 48 C95 28, 125 28, 130 48 C122 42, 98 42, 90 48 Z" fill="#1e293b" />
      ) : (
        <Path
          d="M88 55 C90 28, 130 28, 132 55 L128 62 C120 48, 100 48, 92 62 Z"
          fill={bulk >= 3 ? '#0f172a' : '#1e293b'}
          stroke={bulk >= 3 ? accent : 'transparent'}
          strokeWidth="2"
        />
      )}

      {stageId === 'legend' ? (
        <Path
          d="M92 34 L98 22 L110 30 L122 22 L128 34 Z"
          fill={accent}
          stroke="#f8fafc"
          strokeWidth="1"
        />
      ) : null}

      {bulk >= 3 || has('chest_crest') ? (
        <Circle
          cx="110"
          cy="128"
          r="7"
          fill="#0f172a"
          stroke={has('chest_crest') ? VISUAL_TAG_COLORS.chest_crest : accent}
          strokeWidth="2"
        />
      ) : null}

      {bulk >= 2 || has('strength_gauntlets') ? (
        <Rect
          x="168"
          y="70"
          width="6"
          height="90"
          rx="2"
          fill="#1e293b"
          stroke={has('strength_gauntlets') ? VISUAL_TAG_COLORS.strength_gauntlets : accent}
          strokeWidth="1"
        />
      ) : null}
      {bulk >= 4 ? <Path d="M165 68 L177 68 L171 52 Z" fill={accent} /> : null}
    </>
  );
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  frame: {
    alignItems: 'center',
    backgroundColor: '#020817',
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 8,
    width: '100%',
  },
  stageName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  blurb: {
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  badgeChip: {
    backgroundColor: '#020817',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeChipText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
});
