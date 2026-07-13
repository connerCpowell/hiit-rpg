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
import type { ExerciseWithActivations } from '../types/exercise';

export default function WorkoutsScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [selected, setSelected] = useState<ExerciseWithActivations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      setError(null);
      setResults(await searchExercises(searchQuery, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises.');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Workouts</Text>
          <Text style={styles.title}>Exercise catalog</Text>
          <Text style={styles.subtitle}>Search the movement database and inspect muscle activation.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Search exercises..."
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
              style={[styles.exerciseRow, selected?.id === item.id && styles.exerciseRowActive]}
              onPress={() => void handleSelect(item)}
            >
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.muted}>{item.category} · {item.slug}</Text>
            </Pressable>
          ))}
        </View>

        {selected ? (
          <View style={styles.card}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.sectionTitle}>{selected.name}</Text>
                <Text style={styles.muted}>
                  {selected.category} · {selected.isCompound ? 'compound' : 'isolation'}
                </Text>
              </View>
              <Text style={styles.badge}>{selected.activations.length} muscles</Text>
            </View>

            {selected.activations.length === 0 ? (
              <Text style={styles.empty}>No activation data for this exercise.</Text>
            ) : (
              selected.activations.map((row) => (
                <View key={row.muscleId} style={styles.activationRow}>
                  <View style={styles.activationText}>
                    <Text style={styles.exerciseName}>{row.muscleName}</Text>
                    <Text style={styles.muted}>{row.regionName ?? 'Other'} · {row.role}</Text>
                  </View>
                  <View style={styles.activationTrack}>
                    <View style={[styles.activationFill, { width: `${row.activation * 10}%` }]} />
                  </View>
                  <Text style={styles.activationScore}>{row.activation}/10</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
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
  loader: {
    marginTop: 12,
  },
  exerciseRow: {
    borderColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  exerciseRowActive: {
    backgroundColor: '#082f49',
    borderColor: '#38bdf8',
  },
  exerciseName: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  muted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  detailHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
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
    paddingVertical: 6,
  },
  activationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  activationText: {
    flex: 1,
  },
  activationTrack: {
    backgroundColor: '#1e293b',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: 86,
  },
  activationFill: {
    backgroundColor: '#38bdf8',
    height: '100%',
  },
  activationScore: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    width: 38,
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
