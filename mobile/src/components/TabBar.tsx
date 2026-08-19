import { ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, ModulesIcon, ProgressIcon, ToolsIcon, RoomIcon, ShopIcon } from './NavIcons';
import { colors, font } from '@/theme';
import { Txt } from './Txt';
import { TourTarget } from './OnboardingTour';

/** Minimal structural subset of the props expo-router's Tabs passes to `tabBar`. */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** The website's sidebar icons, drawn from its own path data — see NavIcons.tsx.
 *
 * These used to come from three different icon fonts, and three of the six disagreed with what
 * the same destination wears on the web: Modules was a grid against an open book, Progress a
 * bar chart against a trend line, Room a pig against a bed.
 *
 * They are also all one size now. The old set was 25, 26 and 27 depending on which font a
 * glyph came from, which is why iconBox below had to exist at all — these are vector drawings
 * on a shared 24 viewBox, so they simply agree. */
const ICONS: Record<
  string,
  { label: string; render: (color: string) => ReactNode }
> = {
  home: { label: 'Home', render: (c) => <HomeIcon color={c} /> },
  modules: { label: 'Modules', render: (c) => <ModulesIcon color={c} /> },
  progress: { label: 'Progress', render: (c) => <ProgressIcon color={c} /> },
  tools: { label: 'Tools', render: (c) => <ToolsIcon color={c} /> },
  room: { label: 'Room', render: (c) => <RoomIcon color={c} /> },
  shop: { label: 'Shop', render: (c) => <ShopIcon color={c} /> },
};

/** No motion at all on a tab — no press squeeze, no hop when it becomes active. Both used to
 * be here (a scale-to-0.9 spring on press, and a -5px lift replayed every time a tab BECAME
 * focused) and both were removed deliberately: the tab bar is hit on essentially every
 * navigation in the app, so a bounce on each one is a lot of movement to sit through, and the
 * lift in particular fired on arrivals the user never tapped for (deep links, Continue
 * buttons, the onboarding tour) which read as the bar twitching by itself.
 *
 * The active tab is now shown by state rather than by motion: green icon and label (as
 * before) plus a pale-green pill behind them. The pill is always laid out and only changes
 * color, so making a tab active never changes the bar's size or shifts anything. */
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
  return (
    <Pressable
      style={styles.tab}
      onPress={() => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      }}
    >
      <View style={[styles.pill, focused && styles.pillOn]}>
        {/* Fixed-height box around the icon so every pill is the same size. Less critical now
            that all six are vector drawings on one 24 viewBox at one size — the mixed 25/26/27
            glyph fonts this originally compensated for are gone — but kept because it pins the
            pill's height to a number rather than to whatever the artwork happens to measure. */}
        <View style={styles.iconBox}>{meta.render(color)}</View>
        {/* numberOfLines so a label can never wrap onto a second line and make one pill
            taller than the other five — the bar gets tight on small phones and "Progress"
            is the widest label by some margin. */}
        <Txt numberOfLines={1} style={[styles.label, { color }]}>{meta.label}</Txt>
      </View>
    </Pressable>
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
        // The wrapper takes `tabSlot`, NOT `tab`: `tab` centres its children, which stopped
        // the TabButton inside from filling the slot, so these three pills shrank to their own
        // label width while the four unwrapped tabs stretched to a full sixth of the bar.
        if (route.name === 'shop') {
          return <TourTarget key={route.key} id="tour-shop-tab" style={styles.tabSlot}>{tab}</TourTarget>;
        }
        if (route.name === 'modules') {
          return <TourTarget key={route.key} id="tour-modules-tab" style={styles.tabSlot}>{tab}</TourTarget>;
        }
        if (route.name === 'tools') {
          return <TourTarget key={route.key} id="tour-tools-tab" style={styles.tabSlot}>{tab}</TourTarget>;
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
  // One slot per tab, all six an equal sixth of the bar. `tabSlot` is the width alone, for the
  // tour wrappers to sit in without imposing any alignment on what they hold.
  tabSlot: { flex: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Always rendered, transparent until focused — so the highlight appearing is purely a color
  // change and can never resize the bar or nudge a neighbouring tab. Stretching to the slot is
  // what makes all six identical: the pill's size comes from the bar's own even division,
  // never from how long its label happens to be.
  pill: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    alignSelf: 'stretch', marginHorizontal: 3,
    paddingVertical: 7, paddingHorizontal: 2, borderRadius: 14,
    backgroundColor: 'transparent',
  },
  pillOn: { backgroundColor: colors.greenPale },
  iconBox: { height: 28, alignItems: 'center', justifyContent: 'center' },
  // Explicit lineHeight for the same reason as iconBox: the labels all share one font and
  // size, but pinning it means the pill's height is a fixed number rather than something the
  // font's metrics get a vote in.
  label: { fontFamily: font.extra, fontSize: 10.5, lineHeight: 14 },
});
