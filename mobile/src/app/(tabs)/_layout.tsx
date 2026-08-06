import { Tabs } from 'expo-router';
import { TabBar } from '@/components';
import { colors } from '@/theme';
import { RequireAuth } from '@/lib/RequireAuth';

export default function TabsLayout() {
  // Every tab (home, modules, progress, badges, tools, room, shop, settings) sits behind
  // the session gate — reaching any of them by deep link/refresh while signed out
  // redirects to sign-in instead of rendering the app. See lib/RequireAuth.tsx.
  return (
    <RequireAuth>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.screen },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="modules" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="tools" />
        <Tabs.Screen name="room" />
        <Tabs.Screen name="shop" />
      </Tabs>
    </RequireAuth>
  );
}
