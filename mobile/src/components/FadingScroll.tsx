/**
 * A ScrollView that says when there is more below it.
 *
 * Several screens in this app are fixed columns with a scroller in the middle and a button
 * bar pinned underneath — the quest player and the onboarding survey both are — and both
 * hide the native scroll indicator (it's noisy on a cream page, and on iOS it only appears
 * once you are already scrolling, i.e. after you've discovered the thing it was meant to
 * tell you about). The result is content that overflows being cut off dead flat against the
 * same cream as the bar below it. There is nothing on screen distinguishing "this is the
 * end" from "there are two more options under this line", so an answer list that doesn't
 * quite fit reads as a wall.
 *
 * The fix is a cue, not a movement. Scrolling the page on the user's behalf was tried in the
 * quest player and reverted — being moved mid-sentence is worse than having to scroll, since
 * a scroll is something you chose. So this just fades: a short gradient in the surface colour
 * along the scroller's bottom edge, shown only while there IS something below, which reads as
 * the content continuing under the edge rather than stopping at it.
 *
 * Fully transparent to touches, and it forwards its ref, so a caller can still scrollTo().
 */
import { forwardRef } from 'react';
import { useCallback, useRef, useState } from 'react';
import {
  ScrollView, View, StyleSheet,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
  type ScrollViewProps, type ViewStyle, type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { hexToRgba } from '@/colorMix';

/** Rounding between content and viewport heights routinely leaves a pixel or two unreached,
 * and a cue pointing at nothing is worse than no cue. */
const OVERFLOW_SLACK = 16;

export type FadingScrollProps = ScrollViewProps & {
  /** The surface the fade dissolves into — whatever colour is actually behind the scroller.
   * Cream (the app background) for every current caller. */
  fadeColor?: string;
  fadeHeight?: number;
  /** Style for the wrapper the scroller and its fade share, NOT for the scroller — the
   * scroller keeps `style`. The wrapper is what has to be flex:1 in a column. */
  wrapperStyle?: StyleProp<ViewStyle>;
};

export const FadingScroll = forwardRef<ScrollView, FadingScrollProps>(function FadingScroll(
  {
    fadeColor = colors.screen,
    fadeHeight = 28,
    wrapperStyle,
    onLayout,
    onContentSizeChange,
    onScroll,
    scrollEventThrottle = 32,
    children,
    ...props
  },
  ref,
) {
  const [moreBelow, setMoreBelow] = useState(false);
  // Refs rather than state for the three measurements: only their COMBINATION is rendered,
  // so keeping them out of state means one re-render when the answer flips instead of three
  // on every scroll frame.
  const viewportH = useRef(0);
  const contentH = useRef(0);
  const offsetY = useRef(0);

  const recompute = useCallback(() => {
    setMoreBelow(contentH.current - offsetY.current - viewportH.current > OVERFLOW_SLACK);
  }, []);

  // Each handler runs ours and then the caller's — a caller that needs onScroll for its own
  // reasons (the quest player doesn't, the survey might) must not have to choose.
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    viewportH.current = e.nativeEvent.layout.height;
    recompute();
    onLayout?.(e);
  }, [onLayout, recompute]);

  const handleContentSizeChange = useCallback((w: number, h: number) => {
    contentH.current = h;
    recompute();
    onContentSizeChange?.(w, h);
  }, [onContentSizeChange, recompute]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
    recompute();
    onScroll?.(e);
  }, [onScroll, recompute]);

  return (
    <View style={[styles.wrap, wrapperStyle]}>
      <ScrollView
        ref={ref}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        {...props}
      >
        {children}
      </ScrollView>
      {moreBelow ? (
        <LinearGradient
          pointerEvents="none"
          colors={[hexToRgba(fadeColor, 0), fadeColor]}
          style={[styles.fade, { height: fadeHeight }]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
