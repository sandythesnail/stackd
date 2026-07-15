/** Illustrated face overlays — ported pixel-for-pixel from the website's .hammy-face-overlay
 * CSS (app.css), which positions each cropped PNG within the same unscaled 440x460 pig frame
 * Hammy.tsx already uses. Two families: HAMMY_MOODS' 9 daily-mood faces (Home's mascot always
 * shows one) and 3 reaction faces (happy/gentle/streak) shown transiently after a graded
 * answer in the quest player. */
import type { ImageSourcePropType } from 'react-native';

export type FaceOverlay = { image: ImageSourcePropType; top: number; left: number; width: number; height: number };

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

/** happy/streak share the default position; gentle is taller and shifted up. */
export const REACTION_FACES: Record<'happy' | 'gentle' | 'streak', FaceOverlay> = {
  happy: { image: require('../assets/images/hammy-faces/hammy-streak.png'), ...DEFAULT_OVERLAY },
  gentle: { image: require('../assets/images/hammy-faces/hammy-gentle.png'), top: 98, left: 90, width: 260, height: 200 },
  streak: { image: require('../assets/images/hammy-faces/hammy-happy.png'), ...DEFAULT_OVERLAY },
};
