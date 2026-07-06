import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
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
      <Text style={styles.title}>{detail.title}</Text>
      <Text style={styles.sessionMeta}>
        {new Date(detail.performedAt).toLocaleDateString()} · {detail.points} pts
      </Text>
      <Text style={styles.sectionTitle}>Exercises</Text>
      {detail.items.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          <Text style={styles.itemName}>{item.exerciseName}</Text>
          <Text style={styles.itemMeta}>
            {item.sets}×{item.reps} · {item.weight} kg · {Math.round(item.volume)} volume
          </Text>
          {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: '#f0f6fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionMeta: {
    color: '#8b949e',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemName: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#8b949e',
    marginTop: 6,
  },
  itemNotes: {
    color: '#8b949e',
    marginTop: 10,
  },
  empty: {
    color: '#8b949e',
    paddingVertical: 8,
  },
});