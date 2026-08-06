import { Stack } from 'expo-router';
import { colors } from '@/theme';
import { RequireAuth } from '@/lib/RequireAuth';

export default function LearnLayout() {
  // The lesson flow is signed-in-only, same as the tabs — see lib/RequireAuth.tsx.
  return (
    <RequireAuth>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.screen },
        }}
      />
    </RequireAuth>
  );
}
