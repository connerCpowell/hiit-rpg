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
import TopNav from '../components/TopNav';
import { getExerciseActivations, searchExercises, type ExerciseSearchResult } from '../lib/database';
import type { ExerciseWithActivations } from '../types/exercise';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Workouts'>;

export default function WorkoutsScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [expanded, setExpanded] = useState<ExerciseWithActivations | null>(null);
  const [loadingExpandedId, setLoadingExpandedId] = useState<string | null>(null);
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

  const handleToggle = async (exercise: ExerciseSearchResult) => {
    if (expanded?.id === exercise.id) {
      setExpanded(null);
      return;
    }

    setLoadingExpandedId(exercise.id);
    try {
      setError(null);
      const detail = await getExerciseActivations(exercise.id);
      setExpanded(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise.');
    } finally {
      setLoadingExpandedId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TopNav navigation={navigation} current="Workouts" />

        <View style={styles.header}>
          <Text style={styles.kicker}>Workouts</Text>
          <Text style={styles.title}>Exercise catalog</Text>
          <Text style={styles.subtitle}>Tap an exercise to expand its muscle groups inline.</Text>
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

          {results.map((item) => {
            const isOpen = expanded?.id === item.id;
            const isLoadingRow = loadingExpandedId === item.id;

            return (
              <View
                key={item.id}
                style={[styles.exerciseRow, isOpen && styles.exerciseRowActive]}
              >
                <Pressable onPress={() => void handleToggle(item)} style={styles.exerciseHeader}>
                  <View style={styles.exerciseHeaderText}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={styles.muted}>{item.category} · {item.slug}</Text>
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '▾' : '▸'}</Text>
                </Pressable>

                {isLoadingRow ? (
                  <ActivityIndicator color="#38bdf8" style={styles.inlineLoader} />
                ) : null}

                {isOpen && expanded ? (
                  <View style={styles.expandedPanel}>
                    <Text style={styles.expandedMeta}>
                      {expanded.category} · {expanded.isCompound ? 'compound' : 'isolation'} ·{' '}
                      {expanded.activations.length} muscles
                    </Text>

                    {expanded.activations.length === 0 ? (
                      <Text style={styles.empty}>No activation data for this exercise.</Text>
                    ) : (
                      expanded.activations.map((row) => (
                        <View key={row.muscleId} style={styles.activationRow}>
                          <View style={styles.activationText}>
                            <Text style={styles.muscleName}>{row.muscleName}</Text>
                            <Text style={styles.muted}>
                              {row.regionName ?? 'Other'} · {row.role}
                            </Text>
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
              </View>
            );
          })}
        </View>
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
    overflow: 'hidden',
  },
  exerciseRowActive: {
    backgroundColor: '#082f49',
    borderColor: '#38bdf8',
  },
  exerciseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  exerciseHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  exerciseName: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  chevron: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  inlineLoader: {
    marginBottom: 12,
  },
  expandedPanel: {
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  expandedMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  activationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  activationText: {
    flex: 1,
  },
  muscleName: {
    color: '#f8fafc',
    fontWeight: '700',
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
    paddingVertical: 8,
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
