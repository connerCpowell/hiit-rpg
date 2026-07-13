import { useEffect, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getOrCreateLocalUser, getWorkoutSessions } from '../lib/workouts';
import type { WorkoutSession } from '../types/workout';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutHistory'>;

export default function WorkoutHistoryScreen({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const user = await getOrCreateLocalUser();
      const sessionList = await getWorkoutSessions(user.id);
      setWorkouts(sessionList);
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Past workouts</Text>
        <Text style={styles.title}>Session history</Text>
        <Text style={styles.subtitle}>Tap a workout to inspect exercises and muscle load.</Text>
      </View>
      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : workouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.empty}>Saved sessions will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.sessionCard}
              onPress={() => navigation.navigate('WorkoutDetail', { sessionId: item.id })}
            >
              <Text style={styles.sessionTitle}>{item.title}</Text>
              <Text style={styles.sessionMeta}>
                {new Date(item.performedAt).toLocaleDateString()} · {item.points} pts
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
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
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sessionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionMeta: {
    color: '#94a3b8',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    color: '#64748b',
    paddingVertical: 8,
  },
});