import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { regionIntensity } from '../lib/scoring';

export type BodyRegionId = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Core' | 'Legs';

export type RegionXpMap = Record<BodyRegionId, number>;

const REGION_ORDER: BodyRegionId[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs'];

/** Anatomical-style palette inspired by classic muscle diagrams. */
function regionBaseColor(region: BodyRegionId): string {
  switch (region) {
    case 'Chest':
      return '#dc2626';
    case 'Shoulders':
      return '#ea580c';
    case 'Arms':
      return '#ca8a04';
    case 'Core':
      return '#65a30d';
    case 'Back':
      return '#b45309';
    case 'Legs':
      return '#2563eb';
    default:
      return '#475569';
  }
}

function fillFor(region: BodyRegionId, intensity: number): string {
  if (intensity <= 0) return '#334155';
  // Mix toward gold as XP rises so trained areas "pop".
  if (intensity >= 0.75) return '#fbbf24';
  if (intensity >= 0.45) return regionBaseColor(region);
  return `${regionBaseColor(region)}99`;
}

function strokeFor(intensity: number): string {
  return intensity > 0.55 ? '#f8fafc' : '#0f172a';
}

export default function BodyMap({ regionXp }: { regionXp: RegionXpMap }) {
  const maxXp = Math.max(...REGION_ORDER.map((region) => regionXp[region] ?? 0), 1);
  const intensities = Object.fromEntries(
    REGION_ORDER.map((region) => [region, regionIntensity(regionXp[region] ?? 0, maxXp)])
  ) as Record<BodyRegionId, number>;

  return (
    <View style={styles.wrap}>
      <View style={styles.figures}>
        <View style={styles.figureCol}>
          <Text style={styles.viewLabel}>Anterior</Text>
          <AnteriorFigure intensities={intensities} />
        </View>
        <View style={styles.figureCol}>
          <Text style={styles.viewLabel}>Posterior</Text>
          <PosteriorFigure intensities={intensities} />
        </View>
      </View>

      <View style={styles.legend}>
        {REGION_ORDER.map((region) => (
          <View key={region} style={styles.legendRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: fillFor(region, Math.max(0.35, intensities[region])) },
              ]}
            />
            <Text style={styles.legendText}>
              {region} · {regionXp[region] ?? 0} XP
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>Trained regions brighten and shift toward gold.</Text>
    </View>
  );
}

function AnteriorFigure({ intensities }: { intensities: Record<BodyRegionId, number> }) {
  return (
    <Svg width={150} height={320} viewBox="0 0 150 320">
      {/* Head / neck */}
      <Circle cx="75" cy="28" r="18" fill="#64748b" />
      <Rect x="68" y="44" width="14" height="14" rx="4" fill="#475569" />

      {/* Shoulders */}
      <Ellipse
        cx="42"
        cy="72"
        rx="20"
        ry="14"
        fill={fillFor('Shoulders', intensities.Shoulders)}
        stroke={strokeFor(intensities.Shoulders)}
        strokeWidth="1.5"
      />
      <Ellipse
        cx="108"
        cy="72"
        rx="20"
        ry="14"
        fill={fillFor('Shoulders', intensities.Shoulders)}
        stroke={strokeFor(intensities.Shoulders)}
        strokeWidth="1.5"
      />

      {/* Chest */}
      <Path
        d="M48 70 C58 62, 92 62, 102 70 L98 108 C90 118, 60 118, 52 108 Z"
        fill={fillFor('Chest', intensities.Chest)}
        stroke={strokeFor(intensities.Chest)}
        strokeWidth="1.5"
      />

      {/* Arms */}
      <Path
        d="M24 78 C18 100, 16 130, 20 160 C24 168, 34 166, 36 156 C34 128, 36 98, 42 82 Z"
        fill={fillFor('Arms', intensities.Arms)}
        stroke={strokeFor(intensities.Arms)}
        strokeWidth="1.5"
      />
      <Path
        d="M126 78 C132 100, 134 130, 130 160 C126 168, 116 166, 114 156 C116 128, 114 98, 108 82 Z"
        fill={fillFor('Arms', intensities.Arms)}
        stroke={strokeFor(intensities.Arms)}
        strokeWidth="1.5"
      />

      {/* Core / abs */}
      <Path
        d="M56 112 C66 122, 84 122, 94 112 L90 168 C84 178, 66 178, 60 168 Z"
        fill={fillFor('Core', intensities.Core)}
        stroke={strokeFor(intensities.Core)}
        strokeWidth="1.5"
      />

      {/* Legs */}
      <Path
        d="M58 172 C52 210, 48 250, 50 300 C56 306, 68 302, 70 290 C72 250, 72 210, 74 178 Z"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />
      <Path
        d="M92 172 C98 210, 102 250, 100 300 C94 306, 82 302, 80 290 C78 250, 78 210, 76 178 Z"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

function PosteriorFigure({ intensities }: { intensities: Record<BodyRegionId, number> }) {
  return (
    <Svg width={150} height={320} viewBox="0 0 150 320">
      <Circle cx="75" cy="28" r="18" fill="#64748b" />
      <Rect x="68" y="44" width="14" height="14" rx="4" fill="#475569" />

      <Ellipse
        cx="42"
        cy="72"
        rx="20"
        ry="14"
        fill={fillFor('Shoulders', intensities.Shoulders)}
        stroke={strokeFor(intensities.Shoulders)}
        strokeWidth="1.5"
      />
      <Ellipse
        cx="108"
        cy="72"
        rx="20"
        ry="14"
        fill={fillFor('Shoulders', intensities.Shoulders)}
        stroke={strokeFor(intensities.Shoulders)}
        strokeWidth="1.5"
      />

      {/* Traps / upper back as shoulders+back blend area */}
      <Path
        d="M48 68 C58 58, 92 58, 102 68 L98 96 C90 104, 60 104, 52 96 Z"
        fill={fillFor('Back', intensities.Back)}
        stroke={strokeFor(intensities.Back)}
        strokeWidth="1.5"
      />

      {/* Lats / mid back */}
      <Path
        d="M50 94 C60 108, 90 108, 100 94 L96 150 C88 164, 62 164, 54 150 Z"
        fill={fillFor('Back', Math.max(intensities.Back, intensities.Core * 0.4))}
        stroke={strokeFor(intensities.Back)}
        strokeWidth="1.5"
      />

      <Path
        d="M24 78 C18 100, 16 130, 20 160 C24 168, 34 166, 36 156 C34 128, 36 98, 42 82 Z"
        fill={fillFor('Arms', intensities.Arms)}
        stroke={strokeFor(intensities.Arms)}
        strokeWidth="1.5"
      />
      <Path
        d="M126 78 C132 100, 134 130, 130 160 C126 168, 116 166, 114 156 C116 128, 114 98, 108 82 Z"
        fill={fillFor('Arms', intensities.Arms)}
        stroke={strokeFor(intensities.Arms)}
        strokeWidth="1.5"
      />

      {/* Glutes as legs+core */}
      <Ellipse
        cx="62"
        cy="168"
        rx="16"
        ry="14"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />
      <Ellipse
        cx="88"
        cy="168"
        rx="16"
        ry="14"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />

      <Path
        d="M58 178 C52 214, 48 252, 50 300 C56 306, 68 302, 70 290 C72 250, 72 214, 74 184 Z"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />
      <Path
        d="M92 178 C98 214, 102 252, 100 300 C94 306, 82 302, 80 290 C78 250, 78 214, 76 184 Z"
        fill={fillFor('Legs', intensities.Legs)}
        stroke={strokeFor(intensities.Legs)}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  figures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  figureCol: {
    alignItems: 'center',
    flex: 1,
  },
  viewLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  legend: {
    gap: 8,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    borderColor: '#334155',
    borderRadius: 4,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
  },
});
