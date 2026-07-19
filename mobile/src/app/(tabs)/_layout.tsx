import { Tabs } from 'expo-router';
import { TabBar } from '@/components';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.screen },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="modules" />
      <Tabs.Screen name="real-life" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="tools" />
      <Tabs.Screen name="room" />
      <Tabs.Screen name="shop" />
    </Tabs>
  );
}
