import { useState, ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

// Raised from 0.85 — a 15% shrink was big enough to read as the whole screen visibly
// "minimizing" whenever an answer's explanation card pushed content past the fit, rather
// than a subtle reflow. Anything past what this smaller floor can absorb now scrolls
// instead of shrinking further (see `overflowsAtFloor` below), so this only ever needs to
// cover minor overflow, not the full range up to "unreadably tiny."
const MIN_SCALE = 0.94;

/** Fits its children into the available height instead of letting them scroll — measures
 * both the container's available height and the content's natural (unscaled) height, then
 * visually shrinks the content down to fit if it would otherwise overflow. Used by chapter
 * types whose content is real-but-bounded (a teach concept, a knowledge-check question, a
 * matching grid) rather than open-ended, per the "modules should never scroll" pass — see
 * quest.tsx's `fitMode`.
 *
 * Deliberately NOT used for every chapter type: a chapter with a raw touch/gesture surface
 * (mythcards' swipe-drag) would have its gesture coordinates thrown out of sync with the
 * visually-scaled card, since a transform scale doesn't rescale touch coordinates. Safe for
 * plain tap-driven content (teach/knowledgecheck/matching).
 *
 * Scale floors at MIN_SCALE rather than shrinking without limit — content denser than that
 * falls back to a scrollable container instead (see `overflowsAtFloor`), not an unreadably
 * tiny shrink. */
export function FitToViewport({
  children,
  style,
  contentStyle,
}: {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  const [availableH, setAvailableH] = useState<number | null>(null);
  const [naturalH, setNaturalH] = useState<number | null>(null);

  const onContainerLayout = (e: LayoutChangeEvent) => setAvailableH(e.nativeEvent.layout.height);
  // Re-measured every time content changes size (new chapter, more concepts revealed) —
  // onLayout fires again whenever the measured view's own laid-out height changes.
  const onContentLayout = (e: LayoutChangeEvent) => setNaturalH(e.nativeEvent.layout.height);

  const ready = availableH != null && naturalH != null;
  const rawScale = ready && naturalH! > availableH! ? availableH! / naturalH! : 1;
  const scale = Math.max(MIN_SCALE, rawScale);
  // Content that's STILL taller than the container at the MIN_SCALE floor (e.g. a
  // knowledge-check question whose answer explanation pushed the total past what the floor
  // shrink can absorb) used to just get clipped — `root` was always `overflow: hidden`
  // regardless of whether the floor was actually enough, silently cutting off whatever sat
  // at the bottom (in the worst case, the last answer option itself). Falling back to a
  // scrollable container only for this case keeps everything reachable without giving up
  // the shrink-to-fit behavior for the common case where MIN_SCALE fits fine.
  const overflowsAtFloor = ready && naturalH! * scale > availableH!;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scale, { duration: 180 }) }],
    // Hidden until the very first measurement resolves — otherwise the very first paint of
    // any new chapter briefly showed the content at full, unscaled size for one frame before
    // snapping down to its real scale the instant onContentLayout fired, reading as an
    // obvious "pop"/flash rather than a clean fit. Once ready, later resizes (a new question,
    // a longer concept) still transition smoothly via the withTiming above rather than
    // popping, since scale only ever changes gradually from an already-correct starting point.
    opacity: withTiming(ready ? 1 : 0, { duration: ready ? 120 : 0 }),
  }));

  const content = (
    <Animated.View
      onLayout={onContentLayout}
      // Shrinks from the top edge, not the true center — keeps the content's top flush
      // with the container instead of also opening a gap above it.
      style={[contentStyle, animatedStyle, { transformOrigin: 'top center' }]}
    >
      {children}
    </Animated.View>
  );

  return (
    // alignItems: 'center' compensates the visual width shrink from `scale` by centering the
    // (still full-width-measured) content horizontally, splitting the gap evenly on both
    // sides — NOT by widening the content itself (an earlier version set `width: 100/scale%`
    // here, which changed how its own text wrapped, which changed the measured height,
    // which recomputed a different scale, which changed the width again: a feedback loop
    // that visibly kept re-shrinking/re-growing the content instead of settling). Measuring
    // at a fixed, never-adjusted width is what keeps this stable.
    <View style={[styles.root, style]} onLayout={onContainerLayout}>
      {overflowsAtFloor ? (
        <ScrollView style={styles.scrollFallback} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', alignItems: 'center' },
  scrollFallback: { width: '100%' },
});
