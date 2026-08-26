import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { portraitStageForLevel } from '../lib/portrait';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutReward'>;

export default function WorkoutRewardScreen({ navigation, route }: Props) {
  const { reward } = route.params;
  const previousStage = portraitStageForLevel(reward.previousLevel);
  const newStage = portraitStageForLevel(reward.newLevel);
  const formUnlocked = reward.leveledUp && previousStage.id !== newStage.id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Workout complete</Text>
        <Text style={styles.title}>{reward.title}</Text>
        <Text style={styles.subtitle}>{reward.points} session points earned</Text>

        <View style={styles.heroCard}>
          <Text style={styles.xpLabel}>Total XP</Text>
          <Text style={styles.xpValue}>+{reward.totalXpGained}</Text>
          <View style={styles.xpBreakdown}>
            <Text style={styles.muted}>Workout +{reward.workoutXp}</Text>
            {reward.streakBonusXp > 0 ? (
              <Text style={styles.muted}>Streak +{reward.streakBonusXp}</Text>
            ) : null}
            {reward.questBonusXp > 0 ? (
              <Text style={styles.muted}>Quests +{reward.questBonusXp}</Text>
            ) : null}
            {reward.achievementBonusXp > 0 ? (
              <Text style={styles.muted}>Badges +{reward.achievementBonusXp}</Text>
            ) : null}
          </View>
        </View>

        {reward.leveledUp ? (
          <View style={styles.levelUpCard}>
            <Text style={styles.levelUpKicker}>Level up</Text>
            <Text style={styles.levelUpTitle}>
              Level {reward.previousLevel} → {reward.newLevel}
            </Text>
            <Text style={styles.muted}>Your character just got stronger.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Level {reward.newLevel}</Text>
            <Text style={styles.muted}>Forms advance every 30 levels.</Text>
          </View>
        )}

        {formUnlocked ? (
          <View style={styles.formCard}>
            <Text style={[styles.levelUpKicker, styles.formKicker]}>New form</Text>
            <Text style={styles.levelUpTitle}>
              {previousStage.name} → {newStage.name}
            </Text>
            <Text style={styles.muted}>{newStage.blurb}</Text>
          </View>
        ) : null}

        {reward.newlyUnlockedAchievements.length > 0 ? (
          <View style={styles.badgeCard}>
            <Text style={[styles.levelUpKicker, styles.badgeKicker]}>Badges unlocked</Text>
            {reward.newlyUnlockedAchievements.map((achievement) => (
              <View key={achievement.id} style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>★ {achievement.title}</Text>
                  <Text style={styles.muted}>{labelize(achievement.focus)} focus</Text>
                </View>
                <Text style={styles.badge}>+{achievement.xpReward} XP</Text>
              </View>
            ))}
            <Text style={styles.muted}>Focus badges reshape your character gear.</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Streak</Text>
          <Text style={styles.rowTitle}>{reward.currentStreak} day streak</Text>
          <Text style={styles.muted}>Best {reward.bestStreak}</Text>
        </View>

        {reward.completedQuests.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Quests completed</Text>
            {reward.completedQuests.map((quest) => (
              <View key={`${quest.title}-${quest.xpReward}`} style={styles.row}>
                <Text style={styles.rowTitle}>✓ {quest.title}</Text>
                <Text style={styles.badge}>+{quest.xpReward} XP</Text>
              </View>
            ))}
          </View>
        ) : null}

        {reward.attributeGains.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            {reward.attributeGains.map((gain) => (
              <View key={gain.attributeId} style={styles.row}>
                <Text style={styles.rowTitle}>{labelize(gain.attributeId)}</Text>
                <Text style={styles.badge}>+{gain.xpGained} XP</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.replace('User')}
        >
          <Text style={styles.primaryButtonText}>View player</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            navigation.replace('WorkoutDetail', { sessionId: reward.sessionId })
          }
        >
          <Text style={styles.secondaryButtonText}>View workout</Text>
        </Pressable>
        <Pressable
          style={styles.ghostButton}
          onPress={() => navigation.replace('AddWorkout')}
        >
          <Text style={styles.ghostButtonText}>Log another</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    marginBottom: 16,
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 20,
  },
  xpLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  xpValue: {
    color: '#f8fafc',
    fontSize: 48,
    fontWeight: '700',
    marginTop: 4,
  },
  xpBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  levelUpCard: {
    backgroundColor: '#082f49',
    borderColor: '#38bdf8',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#422006',
    borderColor: '#fbbf24',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  badgeCard: {
    backgroundColor: '#14532d',
    borderColor: '#86efac',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  formKicker: {
    color: '#fcd34d',
  },
  badgeKicker: {
    color: '#bbf7d0',
  },
  levelUpKicker: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  levelUpTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
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
  row: {
    alignItems: 'center',
    borderBottomColor: '#1e293b',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowTitle: {
    color: '#f8fafc',
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
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  muted: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#020817',
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  ghostButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 12,
  },
  ghostButtonText: {
    color: '#94a3b8',
    fontWeight: '700',
  },
});
