import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Nav = Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>;

const LINKS: Array<{ route: keyof RootStackParamList; label: string }> = [
  { route: 'Home', label: 'Home' },
  { route: 'User', label: 'User' },
  { route: 'AddWorkout', label: 'Add' },
  { route: 'WorkoutHistory', label: 'Past' },
  { route: 'Workouts', label: 'Catalog' },
];

export default function TopNav({
  navigation,
  current,
}: {
  navigation: Nav;
  current: keyof RootStackParamList;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {LINKS.map((link) => {
          const active = link.route === current;
          return (
            <Pressable
              key={link.route}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                if (link.route === current) return;
                navigation.navigate(link.route as never);
              }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{link.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomColor: '#1e293b',
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 10,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#f8fafc',
    borderColor: '#f8fafc',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#020817',
  },
});
