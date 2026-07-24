import { ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, font } from '@/theme';
import { Txt } from './Txt';
import { TourTarget } from './OnboardingTour';

const TAB_PRESS_SPRING = { damping: 16, stiffness: 380 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Minimal structural subset of the props expo-router's Tabs passes to `tabBar`. */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const ICONS: Record<
  string,
  { label: string; render: (color: string) => ReactNode }
> = {
  home: { label: 'Home', render: (c) => <Feather name="home" size={25} color={c} /> },
  modules: { label: 'Modules', render: (c) => <Feather name="grid" size={25} color={c} /> },
  progress: { label: 'Progress', render: (c) => <Feather name="bar-chart-2" size={25} color={c} /> },
  tools: { label: 'Tools', render: (c) => <Ionicons name="calculator-outline" size={26} color={c} /> },
  room: { label: 'Room', render: (c) => <MaterialCommunityIcons name="pig-variant" size={27} color={c} /> },
  shop: { label: 'Shop', render: (c) => <Feather name="shopping-bag" size={25} color={c} /> },
};

function TabButton({
  route,
  focused,
  color,
  meta,
  navigation,
}: {
  route: { key: string; name: string };
  focused: boolean;
  color: string;
  meta: { label: string; render: (color: string) => ReactNode };
  navigation: TabBarProps['navigation'];
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      style={[styles.tab, animatedStyle]}
      onPressIn={() => { scale.value = withSpring(0.9, TAB_PRESS_SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, TAB_PRESS_SPRING); }}
      onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      }}
    >
      {meta.render(color)}
      <Txt style={[styles.label, { color }]}>{meta.label}</Txt>
    </AnimatedPressable>
  );
}

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, i) => {
        const meta = ICONS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        const color = focused ? colors.green : colors.muted6;
        const tab = <TabButton key={route.key} route={route} focused={focused} color={color} meta={meta} navigation={navigation} />;
        // The Shop, Modules, and Tools tabs are the ones spotlighted by the onboarding tour
        // (see OnboardingTour.tsx) — wrapped only for those routes so every other tab stays a
        // plain Pressable.
        if (route.name === 'shop') {
          return <TourTarget key={route.key} id="tour-shop-tab" style={styles.tab}>{tab}</TourTarget>;
        }
        if (route.name === 'modules') {
          return <TourTarget key={route.key} id="tour-modules-tab" style={styles.tab}>{tab}</TourTarget>;
        }
        if (route.name === 'tools') {
          return <TourTarget key={route.key} id="tour-tools-tab" style={styles.tab}>{tab}</TourTarget>;
        }
        return tab;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1.5,
    borderTopColor: colors.borderCool,
    paddingTop: 9,
    paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: font.extra, fontSize: 10.5 },
});
