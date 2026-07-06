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
      <Text style={styles.title}>Workout History</Text>
      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : workouts.length === 0 ? (
        <Text style={styles.empty}>No workouts logged yet.</Text>
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
    backgroundColor: '#0d1117',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: '#f0f6fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionTitle: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionMeta: {
    color: '#8b949e',
    marginTop: 6,
  },
  empty: {
    color: '#8b949e',
    paddingVertical: 8,
  },
});