import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import HomeScreen from './src/screens/HomeScreen';
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
        <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ title: 'Workout History' }} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'Workout Detail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
