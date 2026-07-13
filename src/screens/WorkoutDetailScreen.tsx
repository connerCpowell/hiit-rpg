import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getWorkoutSessionDetail } from '../lib/workouts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import type { WorkoutSessionDetail } from '../types/workout';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export default function WorkoutDetailScreen({ route }: Props) {
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null);

  useEffect(() => {
    void (async () => {
      const session = await getWorkoutSessionDetail(route.params.sessionId);
      setDetail(session);
    })();
  }, [route.params.sessionId]);

  if (!detail) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Loading workout details…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.kicker}>Workout detail</Text>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.sessionMeta}>
            {new Date(detail.performedAt).toLocaleDateString()} · {detail.points} pts
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Muscle load</Text>
        {detail.muscleLoads.length === 0 ? (
          <Text style={styles.empty}>No muscle load data for this workout.</Text>
        ) : (
          <View style={styles.loadCard}>
            {detail.muscleLoads.map((load) => (
              <View key={load.muscleId} style={styles.loadRow}>
                <View style={styles.loadText}>
                  <Text style={styles.itemName}>{load.muscleName}</Text>
                  <Text style={styles.itemMeta}>{load.regionName ?? 'Other'}</Text>
                </View>
                <Text style={styles.loadPoints}>{Math.round(load.load)} load</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.sectionTitle}>Exercises</Text>
        {detail.items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.exerciseName}</Text>
            <Text style={styles.itemMeta}>
              {item.sets}x{item.reps} · {item.weight} kg · {Math.round(item.volume)} volume
            </Text>
            {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
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
  headerCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
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
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionMeta: {
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  loadCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  loadRow: {
    alignItems: 'center',
    borderBottomColor: '#1e293b',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
  },
  loadText: {
    flex: 1,
    paddingRight: 12,
  },
  loadPoints: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  itemName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#94a3b8',
    marginTop: 6,
  },
  itemNotes: {
    color: '#94a3b8',
    marginTop: 10,
  },
  empty: {
    color: '#64748b',
    paddingVertical: 8,
  },
});