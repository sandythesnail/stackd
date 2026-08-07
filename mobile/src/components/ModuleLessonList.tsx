import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, radius } from '@/theme';
import { Txt } from './Txt';
import { ListRow } from './ModuleBits';
import { Button } from './Button';
import type { LessonSummary } from '@/content';
import { moduleContentById, mainLessonAbsoluteIndices } from '@/content';
import { resolveLessonSections } from '@/lessonSections';
import { useStore } from '@/store';

const QNODE: Record<string, { bg: string }> = {
  done: { bg: colors.green },
  active: { bg: colors.pink },
  upcoming: { bg: colors.greenSoft },
};

/** A module's full lesson list — grouped into pink-labeled collapsible sections when the
 * module's real lesson count matches a @/lessonSections config, else one flat list. Shared
 * between the module-detail screen and the Modules tab's inline-expand accordion (see
 * app/(tabs)/modules.tsx) so both surfaces render lessons identically, matching the
 * website's own module-row expand behavior appearing in more than one place. */
export function ModuleLessonList({
  moduleId,
  lessons,
  doneIndices,
  status,
  onPressLesson,
}: {
  moduleId: string;
  lessons: LessonSummary[];
  /** Exact completed lesson indices (store.moduleDoneIndices) — per-lesson, not a count,
   * so finishing lesson 3 alone marks ONLY lesson 3 done. */
  doneIndices: number[];
  status: 'done' | 'active';
  onPressLesson: (i: number) => void;
}) {
  const { lessonProgressFor } = useStore();
  // A row's position in this filtered list is NOT the index the store records progress
  // against — the real-life sub-quest is filtered out of `lessons` but still occupies a slot
  // in `lessons`/`quests`, so `doneIndices` is in the absolute space and every row position
  // has to be translated before it's compared. `savedFor` below already did this; the
  // done/next-up marks did not, and were only correct while the sub-quest sat last.
  // See mainLessonAbsoluteIndices.
  const mainIndices = mainLessonAbsoluteIndices(moduleContentById(moduleId));
  const absOf = (i: number) => mainIndices[i] ?? i;
  const doneSet = new Set(doneIndices);
  // "Next up" = the first not-yet-completed lesson, wherever it is in the list.
  const nextIdx = lessons.findIndex((_, i) => !doneSet.has(absOf(i)));
  const rowStatusFor = (i: number) =>
    status === 'done' || doneSet.has(absOf(i)) ? 'done' : i === nextIdx ? 'active' : 'upcoming';
  // Whether the player has finished anything in this module decides what the next-up row is
  // allowed to CALL itself. Nothing here tracks part-finished lessons — a lesson is done or
  // it isn't — so the next-up row cannot honestly claim to be in progress. On an untouched
  // module it's the starting point; on one you've been working through it's where you left
  // off. See LessonRow.
  const started = doneIndices.length > 0;
  const sections = resolveLessonSections(moduleId, lessons.length);
  const savedFor = (i: number) => lessonProgressFor(moduleId, absOf(i));

  if (sections) {
    return (
      <View style={{ gap: 6 }}>
        {sections.map((sec) => (
          <LessonSectionBlock
            key={sec.label}
            label={sec.label}
            lessons={lessons.slice(sec.start, sec.end)}
            startIndex={sec.start}
            // Section bounds are positions in the FILTERED list, so walk those positions and
            // ask whether each one's absolute index is done — rather than filtering the
            // absolute doneIndices by filtered bounds, which mixes the two index spaces and
            // miscounts "3/4 done" on any module whose sub-quest isn't last.
            done={lessons.slice(sec.start, sec.end).filter((_, i) => doneSet.has(absOf(sec.start + i))).length}
            defaultOpen={nextIdx >= sec.start && nextIdx < sec.end}
            rowStatusFor={rowStatusFor}
            started={started}
            savedFor={savedFor}
            onPressLesson={onPressLesson}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {lessons.map((lesson, i) => (
        <LessonRow
          key={lesson.title}
          lesson={lesson}
          index={i}
          status={rowStatusFor(i)}
          started={started}
          saved={savedFor(i)}
          onPress={() => onPressLesson(i)}
        />
      ))}
    </View>
  );
}

/** The module's real-life "step-by-step guide" quest (see LessonSummary.isLifeTask) —
 * surfaced right here, inline with the module's own lesson list, instead of mobile's
 * earlier separate Real Life tab. Ported from the website's .lt-subquest line ("🎯
 * Real-life sub-quest: {topic} →", "✓ ..." once done), which sits attached to the module
 * it belongs to rather than living on its own screen. Renders nothing if this module has
 * no life-task lesson. Shared between the Modules tab's accordion and the module-detail
 * screen, same reasoning as ModuleLessonList above. */
export function RealLifeSubQuestRow({ moduleId, onPress }: { moduleId: string; onPress: () => void }) {
  const { state } = useStore();
  const guide = moduleContentById(moduleId)?.lessons.find((l) => l.isLifeTask);
  if (!guide) return null;
  const done = state.completedLifeTaskIds.includes(moduleId);
  return (
    // Built like the lesson rows above rather than as one line of small text in a tinted
    // box. This is a REQUIRED lesson — moduleTotal counts it, and the module isn't mastered
    // without it — but it was drawn lighter than the eight rows it ranks alongside, which
    // read as an optional footnote. Same node/title/chevron anatomy as a LessonRow, in the
    // module's pink accent so it still reads as a different KIND of lesson.
    <Pressable onPress={onPress} style={[styles.subQuest, done && styles.subQuestDone]}>
      <View style={[styles.subQuestNode, done && styles.subQuestNodeDone]}>
        <Txt style={styles.subQuestNodeTxt}>{done ? '✓' : '🎯'}</Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={[styles.subQuestKicker, done && styles.subQuestTxtDone]}>REAL-LIFE SUB-QUEST</Txt>
        <Txt style={[styles.subQuestTitle, done && styles.subQuestTxtDone]}>{guide.title}</Txt>
      </View>
      <Feather name="chevron-right" size={18} color={done ? colors.greenDark : colors.pinkDark} />
    </Pressable>
  );
}

/** Pink-labeled, collapsible section header + its lesson rows — mirrors the website's
 * `.lesson-section-header` (`.lsh-label`/`.lsh-meta`, both `color: var(--pink-dark)`,
 * uppercase, 800-weight). The section containing the next not-done lesson starts open. */
function LessonSectionBlock({
  label,
  lessons,
  startIndex,
  done,
  defaultOpen,
  rowStatusFor,
  started,
  savedFor,
  onPressLesson,
}: {
  label: string;
  lessons: LessonSummary[];
  startIndex: number;
  done: number;
  defaultOpen: boolean;
  rowStatusFor: (i: number) => string;
  started: boolean;
  savedFor: (i: number) => { chapterIdx: number; chapterCount: number } | null;
  onPressLesson: (i: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.sectionHead}>
        <Txt style={styles.sectionLabel}>{label}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt style={styles.sectionMeta}>{done}/{lessons.length} done</Txt>
          {/* Feather, not the ▾/▸ glyph pair — see the same change on the module rows in
              app/(tabs)/modules.tsx: the two characters aren't the same width, so the
              control resized every time you opened a section. */}
          <Feather
            name="chevron-down"
            size={15}
            color={colors.pinkDark}
            style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}
          />
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 8, marginBottom: 4 }}>
          {lessons.map((lesson, i) => {
            const idx = startIndex + i;
            return (
              <LessonRow
                key={lesson.title}
                lesson={lesson}
                index={idx}
                status={rowStatusFor(idx)}
                started={started}
                saved={savedFor(idx)}
                onPress={() => onPressLesson(idx)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** One lesson. The next-up lesson gets the green outline, a caption and its own button;
 * everything else is a plain row.
 *
 * "In progress"/"Resume" is now a real state rather than a guess. It used to be rendered off
 * `started` alone, which meant the next-up row claimed to be in progress on modules the player
 * had never opened — the app describing history they didn't have — so it was reworded to
 * "Next up"/"Continue" with a comment saying nothing tracked a part-finished lesson. Something
 * does now (AppState.lessonProgress), so a row with a genuine saved chapter says so, names the
 * chapter, and offers Resume. Everything else keeps the honest "Next up"/"Start here" wording.
 *
 * A paused lesson isn't necessarily the next-up one — pause lesson 5 with lesson 3 still
 * unfinished and next-up is 3 — so the paused caption and its button render independently of
 * `isActive`. */
function LessonRow({
  lesson,
  index,
  status,
  started,
  saved,
  onPress,
}: {
  lesson: LessonSummary;
  index: number;
  status: string;
  started: boolean;
  /** Where this lesson was left, if it was left partway. */
  saved: { chapterIdx: number; chapterCount: number } | null;
  onPress: () => void;
}) {
  const node = QNODE[status];
  const isActive = status === 'active';
  const showCta = isActive || !!saved;

  return (
    <ListRow
      onPress={onPress}
      style={(isActive || !!saved) && { borderWidth: 2, borderColor: colors.green, backgroundColor: colors.tagGreenBg }}
    >
      <View style={[styles.qnode, { backgroundColor: node.bg }]}>
        <Txt style={styles.qnodeTxt}>{status === 'done' ? '✓' : String(index + 1)}</Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.qTitle}>{lesson.title}</Txt>
        {saved ? (
          <Txt style={[styles.qNote, { color: colors.green }]}>
            Paused · chapter {saved.chapterIdx + 1} of {saved.chapterCount}
          </Txt>
        ) : isActive ? (
          <Txt style={[styles.qNote, { color: colors.green }]}>{started ? 'Next up' : 'Start here'}</Txt>
        ) : null}
      </View>
      {showCta ? (
        <Button
          label={saved ? 'Resume' : started ? 'Continue' : 'Start'}
          variant="pink"
          size="sm"
          style={{ paddingHorizontal: 16 }}
          onPress={onPress}
        />
      ) : null}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EFEFE7',
  },
  // 11.5, up from 10.5: these headings are the module's structure and they're what you scan
  // to find a section, which is more work than 10.5px uppercase with letter-spacing wants to
  // do. The meta stays a step smaller, so the two stop competing.
  sectionLabel: { fontFamily: font.extra, fontSize: 11.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.pinkDark },
  sectionMeta: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.3, color: colors.pinkDark },
  qnode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qnodeTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  qTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  qNote: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
  subQuest: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    marginTop: 10, paddingVertical: 13, paddingHorizontal: 15,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.pinkBorder, backgroundColor: colors.pinkBg2,
  },
  subQuestDone: { borderColor: colors.greenSoft, backgroundColor: colors.tagGreenBg },
  // Same 40px circle as a lesson row's number node, so this row lines up with the eight
  // above it instead of sitting at its own indent.
  subQuestNode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pinkBright },
  subQuestNodeDone: { backgroundColor: colors.green },
  subQuestNodeTxt: { fontSize: 17 },
  subQuestKicker: { fontFamily: font.extra, fontSize: 9.5, letterSpacing: 0.5, color: colors.pinkDark },
  subQuestTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink, marginTop: 2 },
  subQuestTxtDone: { color: colors.greenDark },
});
