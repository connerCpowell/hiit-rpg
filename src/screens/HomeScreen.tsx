import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Workout RPG</Text>
          <Text style={styles.title}>Train your character.</Text>
          <Text style={styles.subtitle}>
            Log workouts, grow attributes, and track which muscle groups are leveling up.
          </Text>
        </View>

        <View style={styles.menu}>
          <MenuCard
            title="User"
            subtitle="Level, XP, attributes, body map, and stats"
            action="Open profile"
            onPress={() => navigation.navigate('User')}
          />
          <MenuCard
            title="Add Workout"
            subtitle="Search one exercise at a time and build today’s workout"
            action="Log workout"
            onPress={() => navigation.navigate('AddWorkout')}
          />
          <MenuCard
            title="Past Workouts"
            subtitle="Review saved sessions and muscle-load summaries"
            action="View history"
            onPress={() => navigation.navigate('WorkoutHistory')}
          />
          <MenuCard
            title="Workouts"
            subtitle="Browse and inspect the exercise catalog"
            action="Browse exercises"
            onPress={() => navigation.navigate('Workouts')}
          />
        </View>

        <View style={styles.disabledCard}>
          <Text style={styles.disabledTitle}>Team mates / competition</Text>
          <Text style={styles.disabledText}>Coming later once the solo loop feels good.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuCard({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.cardAction}>{action}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    borderColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    marginBottom: 16,
  },
  kicker: {
    color: '#94a3b8',
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
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  menu: {
    gap: 12,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#020817',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cardAction: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  disabledTitle: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  disabledText: {
    color: '#64748b',
    marginTop: 4,
  },
});