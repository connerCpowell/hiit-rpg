import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import AddWorkoutScreen from './src/screens/AddWorkoutScreen';
import HomeScreen from './src/screens/HomeScreen';
import UserScreen from './src/screens/UserScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import type { RootStackParamList } from './src/types/navigation';

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0d1117' },
          headerTintColor: '#f0f6fc',
          contentStyle: { backgroundColor: '#0d1117' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Workout RPG' }} />
        <Stack.Screen name="User" component={UserScreen} options={{ title: 'Player' }} />
        <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} options={{ title: 'Add Workout' }} />
        <Stack.Screen name="Workouts" component={WorkoutsScreen} options={{ title: 'Workouts' }} />
        <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Past Workouts' }} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Workout Detail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
