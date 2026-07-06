import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createWorkoutSession,
  getOrCreateLocalUser,
  getWorkoutSessions,
} from '../lib/workouts';
import {
  getExerciseActivations,
  searchExercises,
  type ExerciseSearchResult,
} from '../lib/database';
import type { ExerciseWithActivations } from '../types/exercise';
import type { WorkoutSession } from '../types/workout';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [selected, setSelected] = useState<ExerciseWithActivations | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [addingToLog, setAddingToLog] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('My workout');
  const [sessionNote, setSessionNote] = useState('');

  const loadResults = useCallback(async (searchQuery: string) => {
    try {
      setError(null);
      const items = await searchExercises(searchQuery);
      setResults(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search exercises.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserAndWorkouts = useCallback(async () => {
    try {
      const user = await getOrCreateLocalUser();
      setUserId(user.id);
      const sessionList = await getWorkoutSessions(user.id);
      setWorkouts(sessionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadResults(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, loadResults]);

  useEffect(() => {
    void loadUserAndWorkouts();
  }, [loadUserAndWorkouts]);

  const handleSelect = async (exercise: ExerciseSearchResult) => {
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getExerciseActivations(exercise.id);
      setSelected(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateWorkout = async () => {
    if (!userId || !selected) {
      setError('Select an exercise before logging a workout.');
      return;
    }

    setAddingToLog(true);
    setError(null);
    try {
      await createWorkoutSession({
        userId,
        performedAt: new Date().toISOString(),
        title: sessionTitle,
        notes: sessionNote,
        items: [
          {
            exerciseId: selected.id,
            sets: 3,
            reps: 10,
            weight: 0,
          },
        ],
      });
      const updatedWorkouts = await getWorkoutSessions(userId);
      setWorkouts(updatedWorkouts);
      setSessionTitle('My workout');
      setSessionNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout.');
    } finally {
      setAddingToLog(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Workout RPG</Text>
      <Text style={styles.subtitle}>Search and log workouts</Text>

      <Pressable style={styles.navButton} onPress={() => navigation.navigate('WorkoutHistory')}>
        <Text style={styles.navButtonText}>View workout history</Text>
      </Pressable>

      <TextInput
        style={styles.searchInput}
        placeholder="Search exercises (curl, bench, squat...)"
        placeholderTextColor="#8b949e"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#58a6ff" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>No exercises found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.resultItem, selected?.id === item.id && styles.resultItemActive]}
              onPress={() => void handleSelect(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMeta}>{item.slug}</Text>
            </Pressable>
          )}
        />
      )}

      {detailLoading ? <ActivityIndicator color="#58a6ff" style={styles.loader} /> : null}

      {selected ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selected.name}</Text>
          <Text style={styles.detailMeta}>
            {selected.category} · {selected.isCompound ? 'compound' : 'isolation'} ·{' '}
            {selected.activations.length} muscles
          </Text>
          {selected.activations.length === 0 ? (
            <Text style={styles.empty}>No muscle activation data for this exercise.</Text>
          ) : (
            selected.activations.map((row) => (
              <View key={row.muscleId} style={styles.activationRow}>
                <Text style={styles.muscleName}>{row.muscleName}</Text>
                <Text style={styles.muscleMeta}>
                  {row.regionName ?? '—'} · {row.role} · {row.activation}/10
                </Text>
              </View>
            ))
          )}

          <View style={styles.logForm}>
            <Text style={styles.sectionTitle}>Log this exercise</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Workout title"
              placeholderTextColor="#8b949e"
              value={sessionTitle}
              onChangeText={setSessionTitle}
              autoCapitalize="sentences"
            />
            <TextInput
              style={styles.textArea}
              placeholder="Notes (optional)"
              placeholderTextColor="#8b949e"
              value={sessionNote}
              onChangeText={setSessionNote}
              autoCapitalize="sentences"
              multiline
            />
            <Pressable style={styles.actionButton} onPress={handleCreateWorkout} disabled={addingToLog}>
              <Text style={styles.actionButtonText}>{addingToLog ? 'Saving…' : 'Save workout'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Recent workouts</Text>
        {workouts.length === 0 ? (
          <Text style={styles.empty}>No workouts logged yet.</Text>
        ) : (
          workouts.map((workout) => (
            <View key={workout.id} style={styles.workoutRow}>
              <Text style={styles.resultName}>{workout.title}</Text>
              <Text style={styles.muscleMeta}>
                {new Date(workout.performedAt).toLocaleDateString()} · {workout.points} pts
              </Text>
            </View>
          ))
        )}
      </View>
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
  },
  subtitle: {
    color: '#8b949e',
    marginBottom: 16,
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f0f6fc',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultsList: {
    maxHeight: 220,
  },
  resultItem: {
    backgroundColor: '#161b22',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  resultItemActive: {
    borderColor: '#58a6ff',
    borderWidth: 1,
  },
  resultName: {
    color: '#f0f6fc',
    fontSize: 16,
    fontWeight: '600',
  },
  resultMeta: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    flex: 1,
    marginTop: 12,
    padding: 16,
  },
  detailTitle: {
    color: '#f0f6fc',
    fontSize: 22,
    fontWeight: '700',
  },
  detailMeta: {
    color: '#8b949e',
    marginBottom: 16,
    marginTop: 4,
  },
  activationRow: {
    marginBottom: 12,
  },
  muscleName: {
    color: '#f0f6fc',
    fontWeight: '600',
  },
  muscleMeta: {
    color: '#8b949e',
    fontSize: 12,
  },
  barTrack: {
    backgroundColor: '#21262d',
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#58a6ff',
    borderRadius: 6,
    height: '100%',
  },
  loader: {
    marginVertical: 12,
  },
  empty: {
    color: '#8b949e',
    paddingVertical: 8,
  },
  error: {
    color: '#ff7b72',
    marginBottom: 8,
  },
  navButton: {
    backgroundColor: '#238636',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#f0f6fc',
    fontWeight: '700',
  },
  logForm: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#c9d1d9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f0f6fc',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  actionButton: {
    backgroundColor: '#238636',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#f0f6fc',
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    marginTop: 18,
    padding: 16,
  },
  workoutRow: {
    marginBottom: 12,
  },
});