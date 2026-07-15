/** Ported verbatim from the website's HAMMY_MOODS + todaysHammyMood (app.js) — one mood per
 * calendar day, deterministic from the date string so it holds steady across renders/
 * refreshes and only changes once players come back on a new day. The website swaps
 * Hammy's face art per mood id; mobile's Hammy keeps its single illustrated expression and
 * surfaces the mood via its message instead. */
export type HammyMood = { id: string; label: string; msg: string };

export const HAMMY_MOODS: HammyMood[] = [
  { id: 'star', label: 'starstruck', msg: "Hammy's feeling starstruck today. Give them something to be proud of — finish a module!" },
  { id: 'sleepy', label: 'sleepy', msg: "Hammy's a little sleepy today. Wake them up with a quick module!" },
  { id: 'curious', label: 'curious', msg: "Hammy's feeling curious today. Satisfy their curiosity — start a module!" },
  { id: 'angry', label: 'grumpy', msg: "Hammy woke up grumpy today. Turn their mood around with a module!" },
  { id: 'love', label: 'smitten', msg: "Hammy's feeling the love today! Show them some back — finish a module." },
  { id: 'nervy', label: 'nervous', msg: "Hammy's a bit nervous today. Ease their nerves — complete a module." },
  { id: 'sad', label: 'a little blue', msg: "Hammy's feeling a little blue today. Cheer them up — finish a module!" },
  { id: 'surprise', label: 'surprised', msg: "Hammy's totally surprised today. See what's in store — start a module!" },
  { id: 'wink', label: 'playful', msg: "Hammy's feeling playful today. Play along — finish a module!" },
];

export function todaysHammyMood(): HammyMood {
  const dateStr = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  return HAMMY_MOODS[Math.abs(hash) % HAMMY_MOODS.length];
}

/** Flips Home's Hammy to a satisfied/happy message for the rest of the day once a lesson
 * has been finished, instead of the daily mood. */
export function hasModuleActivityToday(lastModuleActivityDate: string | null): boolean {
  return lastModuleActivityDate === new Date().toDateString();
}
