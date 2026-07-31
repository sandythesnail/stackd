/** Illustrated face overlays — ported pixel-for-pixel from the website's .hammy-face-overlay
 * CSS (app.css), which positions each cropped PNG within the same unscaled 440x460 pig frame
 * Hammy.tsx already uses. Two families: HAMMY_MOODS' 9 daily-mood faces (Home's mascot always
 * shows one) and 3 reaction faces (happy/gentle/streak) shown transiently after a graded
 * answer in the quest player. */
import type { ImageSourcePropType } from 'react-native';

export type FaceOverlay = {
  image: ImageSourcePropType; top: number; left: number; width: number; height: number;
  /** Draw ON TOP of the resting face instead of replacing it — Hammy keeps its own eyes,
   *  cheeks, snout and shading, and only this overlay's own art is added. Used by the
   *  mouth-only wrong-answer reaction; see Hammy.tsx. */
  keepBase?: boolean;
};

const DEFAULT_OVERLAY = { top: 145, left: 90, width: 260, height: 155 };

export const MOOD_FACES: Record<string, FaceOverlay> = {
  star: { image: require('../assets/images/hammy-faces/star-face.png'), top: 143, left: 117, width: 206, height: 160 },
  sleepy: { image: require('../assets/images/hammy-faces/sleepy-face.png'), top: 143, left: 115, width: 211, height: 160 },
  curious: { image: require('../assets/images/hammy-faces/curious-face.png'), top: 143, left: 91, width: 259, height: 160 },
  angry: { image: require('../assets/images/hammy-faces/angry-face.png'), top: 143, left: 94, width: 252, height: 160 },
  love: { image: require('../assets/images/hammy-faces/love-face.png'), top: 143, left: 96, width: 248, height: 160 },
  nervy: { image: require('../assets/images/hammy-faces/nervy-face.png'), top: 143, left: 103, width: 234, height: 160 },
  sad: { image: require('../assets/images/hammy-faces/sad-face.png'), top: 143, left: 100, width: 240, height: 160 },
  surprise: { image: require('../assets/images/hammy-faces/surprise-face.png'), top: 143, left: 110, width: 220, height: 160 },
  wink: { image: require('../assets/images/hammy-faces/wink-face.png'), top: 143, left: 102, width: 237, height: 160 },
  // Post-lesson "satisfied" state reuses hammy-happy.png at the default (unmodified) crop position.
  satisfied: { image: require('../assets/images/hammy-faces/hammy-happy.png'), ...DEFAULT_OVERLAY },
};

/** streak keeps the full-face swap; happy/gentle add only a mouth to the resting face. */
export const REACTION_FACES: Record<'happy' | 'gentle' | 'streak', FaceOverlay> = {
  // Right answer adds only a mouth to the resting face rather than replacing it — the
  // shockhappy pig's own mouth (outline + tongue) lifted off its skin as an alpha mask, same
  // technique as gentle below. Box mirrors app.css exactly.
  happy: { image: require('../assets/images/hammy-faces/hammy-mouth-happy.png'), top: 260, left: 204, width: 32, height: 37, keepBase: true },
  // Wrong answer adds only a mouth to the resting face rather than replacing it — the confused
  // pig's mouth from newconfusedface.png as an alpha mask. Box mirrors app.css exactly.
  gentle: { image: require('../assets/images/hammy-faces/hammy-mouth-confused.png'), top: 258, left: 214, width: 48, height: 30, keepBase: true },
  streak: { image: require('../assets/images/hammy-faces/hammy-happy.png'), ...DEFAULT_OVERLAY },
};
