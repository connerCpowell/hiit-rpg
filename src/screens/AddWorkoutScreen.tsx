import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getExerciseActivations, searchExercises, type ExerciseSearchResult } from '../lib/database';
import { createWorkoutSession, getOrCreateLocalUser } from '../lib/workouts';
import type { ExerciseWithActivations } from '../types/exercise';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AddWorkout'>;

interface PendingWorkoutItem {
  localId: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
}

function parseWorkoutNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AddWorkoutScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [selected, setSelected] = useState<ExerciseWithActivations | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('My workout');
  const [sessionNote, setSessionNote] = useState('');
  const [setsInput, setSetsInput] = useState('3');
  const [repsInput, setRepsInput] = useState('10');
  const [weightInput, setWeightInput] = useState('0');
  const [workoutItems, setWorkoutItems] = useState<PendingWorkoutItem[]>([]);

  const loadResults = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      setResults(await searchExercises(trimmed, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search exercises.');
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

  const handleSelect = async (exercise: ExerciseSearchResult) => {
    setLoading(true);
    try {
      setError(null);
      setSelected(await getExerciseActivations(exercise.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = () => {
    if (!selected) {
      setError('Select an exercise first.');
      return;
    }

    const sets = Math.round(parseWorkoutNumber(setsInput));
    const reps = Math.round(parseWorkoutNumber(repsInput));
    const weight = parseWorkoutNumber(weightInput);

    if (sets <= 0 || reps <= 0 || weight < 0) {
      setError('Use positive sets/reps and a weight of 0 or more.');
      return;
    }

    setWorkoutItems((current) => [
      ...current,
      {
        localId: `${selected.id}-${Date.now()}-${current.length}`,
        exerciseId: selected.id,
        exerciseName: selected.name,
        sets,
        reps,
        weight,
      },
    ]);
    setQuery('');
    setResults([]);
    setSelected(null);
    setError(null);
  };

  const handleSaveWorkout = async () => {
    if (workoutItems.length === 0) {
      setError('Add at least one exercise before saving.');
      return;
    }

    setSaving(true);
    try {
      const user = await getOrCreateLocalUser();
      await createWorkoutSession({
        userId: user.id,
        performedAt: new Date().toISOString(),
        title: sessionTitle.trim() || 'Workout',
        notes: sessionNote,
        items: workoutItems.map((item) => ({
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight,
        })),
      });
      setWorkoutItems([]);
      setSessionTitle('My workout');
      setSessionNote('');
      navigation.navigate('WorkoutHistory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Add workout</Text>
          <Text style={styles.title}>Build one session.</Text>
          <Text style={styles.subtitle}>Search, configure, add. The catalog stays out of the way.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exercise search</Text>
          <TextInput
            style={styles.input}
            placeholder="Type at least 2 letters..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {loading ? <ActivityIndicator color="#38bdf8" style={styles.loader} /> : null}

          {results.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.searchResult, selected?.id === item.id && styles.searchResultActive]}
              onPress={() => void handleSelect(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.muted}>{item.category} · {item.slug}</Text>
            </Pressable>
          ))}
        </View>

        {selected ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{selected.name}</Text>
            <Text style={styles.muted}>
              {selected.category} · {selected.isCompound ? 'compound' : 'isolation'} ·{' '}
              {selected.activations.length} muscles
            </Text>

            <View style={styles.fieldRow}>
              <Field label="Sets" value={setsInput} onChangeText={setSetsInput} />
              <Field label="Reps" value={repsInput} onChangeText={setRepsInput} />
              <Field label="Weight" value={weightInput} onChangeText={setWeightInput} />
            </View>

            <Pressable style={styles.primaryButton} onPress={handleAddExercise}>
              <Text style={styles.primaryButtonText}>Add exercise</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current workout</Text>
          {workoutItems.length === 0 ? (
            <Text style={styles.empty}>No exercises added yet.</Text>
          ) : (
            workoutItems.map((item) => (
              <View key={item.localId} style={styles.pendingRow}>
                <View>
                  <Text style={styles.resultName}>{item.exerciseName}</Text>
                  <Text style={styles.muted}>
                    {item.sets}x{item.reps} · {item.weight === 0 ? 'bodyweight' : `${item.weight} kg`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setWorkoutItems((current) => current.filter((row) => row.localId !== item.localId))}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Save session</Text>
          <TextInput
            style={styles.input}
            placeholder="Workout title"
            placeholderTextColor="#64748b"
            value={sessionTitle}
            onChangeText={setSessionTitle}
          />
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Notes"
            placeholderTextColor="#64748b"
            value={sessionNote}
            onChangeText={setSessionNote}
            multiline
          />
          <Pressable style={styles.primaryButton} onPress={handleSaveWorkout} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save workout'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholderTextColor="#64748b"
      />
    </View>
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
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#020817',
    borderColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    color: '#f8fafc',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    marginTop: 10,
    minHeight: 80,
  },
  loader: {
    marginTop: 12,
  },
  searchResult: {
    borderColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  searchResultActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
  },
  resultName: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  muted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  field: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginTop: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#020817',
    fontWeight: '700',
  },
  pendingRow: {
    alignItems: 'center',
    borderBottomColor: '#1e293b',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  removeText: {
    color: '#f87171',
    fontWeight: '700',
  },
  empty: {
    color: '#64748b',
  },
  error: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    borderRadius: 12,
    borderWidth: 1,
    color: '#fecaca',
    marginBottom: 12,
    padding: 12,
  },
});
