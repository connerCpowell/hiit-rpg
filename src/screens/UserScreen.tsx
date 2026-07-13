import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { xpForLevel } from '../lib/scoring';
import { getOrCreateLocalUser, getPlayerSummary } from '../lib/workouts';
import type { PlayerSummary } from '../types/player';

const BODY_REGIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs'];

export default function UserScreen() {
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await getOrCreateLocalUser();
        setSummary(await getPlayerSummary(user.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const regionXp = useMemo(() => {
    const totals = new Map<string, number>();
    for (const region of BODY_REGIONS) {
      totals.set(region, 0);
    }
    for (const muscle of summary?.muscles ?? []) {
      const region = muscle.regionName ?? 'Core';
      totals.set(region, (totals.get(region) ?? 0) + muscle.xp);
    }
    return totals;
  }, [summary]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#38bdf8" />
      </SafeAreaView>
    );
  }

  if (error || !summary) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error ?? 'Player summary unavailable.'}</Text>
      </SafeAreaView>
    );
  }

  const currentLevelXp = xpForLevel(summary.progress.level);
  const nextLevelXp = xpForLevel(summary.progress.level + 1);
  const levelProgress =
    nextLevelXp === currentLevelXp
      ? 0
      : (summary.progress.totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Player</Text>
          <Text style={styles.title}>Level {summary.progress.level}</Text>
          <Text style={styles.subtitle}>
            {summary.progress.totalXp} XP · {summary.progress.workoutCount} workouts logged
          </Text>
          <ProgressBar progress={levelProgress} />
          <Text style={styles.muted}>
            {Math.max(0, nextLevelXp - summary.progress.totalXp)} XP to level {summary.progress.level + 1}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Attributes</Text>
          {summary.attributes.map((attribute) => (
            <View key={attribute.attributeId} style={styles.rowBlock}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{labelize(attribute.attributeId)}</Text>
                <Text style={styles.badge}>Lv {attribute.level}</Text>
              </View>
              <Text style={styles.muted}>{attribute.xp} XP</Text>
              <ProgressBar progress={attribute.xp / xpForLevel(attribute.level + 1)} />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Body map</Text>
          <View style={styles.bodyGrid}>
            {BODY_REGIONS.map((region) => {
              const xp = regionXp.get(region) ?? 0;
              return (
                <View key={region} style={[styles.bodyCell, xp > 0 && styles.bodyCellActive]}>
                  <Text style={styles.bodyRegion}>{region}</Text>
                  <Text style={styles.bodyXp}>{xp} XP</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Muscle progress</Text>
          {summary.muscles.length === 0 ? (
            <Text style={styles.empty}>Log a workout to start filling muscle progress.</Text>
          ) : (
            summary.muscles.slice(0, 8).map((muscle) => (
              <View key={muscle.muscleId} style={styles.rowBlock}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle}>{muscle.muscleName}</Text>
                  <Text style={styles.badge}>Lv {muscle.level}</Text>
                </View>
                <Text style={styles.muted}>{muscle.regionName ?? 'Other'} · {muscle.xp} XP</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  kicker: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  rowBlock: {
    borderBottomColor: '#1e293b',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTitle: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#020817',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  progressTrack: {
    backgroundColor: '#1e293b',
    borderRadius: 999,
    height: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#38bdf8',
    height: '100%',
  },
  bodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bodyCell: {
    backgroundColor: '#020817',
    borderColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  bodyCellActive: {
    borderColor: '#38bdf8',
  },
  bodyRegion: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  bodyXp: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  empty: {
    color: '#64748b',
  },
  error: {
    color: '#fecaca',
    padding: 16,
  },
});
