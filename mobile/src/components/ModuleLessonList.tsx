import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, font } from '@/theme';
import { Txt } from './Txt';
import { ListRow } from './ModuleBits';
import { Button } from './Button';
import type { LessonSummary } from '@/content';
import { resolveLessonSections } from '@/lessonSections';

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
  done,
  status,
  onPressLesson,
}: {
  moduleId: string;
  lessons: LessonSummary[];
  done: number;
  status: 'done' | 'active';
  onPressLesson: (i: number) => void;
}) {
  const rowStatusFor = (i: number) => (status === 'done' || i < done ? 'done' : i === done ? 'active' : 'upcoming');
  const sections = resolveLessonSections(moduleId, lessons.length);

  if (sections) {
    return (
      <View style={{ gap: 6 }}>
        {sections.map((sec) => (
          <LessonSectionBlock
            key={sec.label}
            label={sec.label}
            lessons={lessons.slice(sec.start, sec.end)}
            startIndex={sec.start}
            done={Math.max(0, Math.min(done - sec.start, sec.end - sec.start))}
            defaultOpen={done >= sec.start && done < sec.end}
            rowStatusFor={rowStatusFor}
            onPressLesson={onPressLesson}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {lessons.map((lesson, i) => (
        <LessonRow key={lesson.title} lesson={lesson} index={i} status={rowStatusFor(i)} onPress={() => onPressLesson(i)} />
      ))}
    </View>
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
  onPressLesson,
}: {
  label: string;
  lessons: LessonSummary[];
  startIndex: number;
  done: number;
  defaultOpen: boolean;
  rowStatusFor: (i: number) => string;
  onPressLesson: (i: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.sectionHead}>
        <Txt style={styles.sectionLabel}>{label}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt style={styles.sectionMeta}>{done}/{lessons.length} done</Txt>
          <Txt style={styles.sectionChevron}>{open ? '▾' : '▸'}</Txt>
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 8, marginBottom: 4 }}>
          {lessons.map((lesson, i) => {
            const idx = startIndex + i;
            return (
              <LessonRow key={lesson.title} lesson={lesson} index={idx} status={rowStatusFor(idx)} onPress={() => onPressLesson(idx)} />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function LessonRow({
  lesson,
  index,
  status,
  onPress,
}: {
  lesson: LessonSummary;
  index: number;
  status: string;
  onPress: () => void;
}) {
  const node = QNODE[status];
  const isActive = status === 'active';
  return (
    <ListRow onPress={onPress} style={isActive ? [{ borderWidth: 2, borderColor: colors.green, backgroundColor: '#F1F6EF' }] : undefined}>
      <View style={[styles.qnode, { backgroundColor: node.bg }]}>
        <Txt style={styles.qnodeTxt}>{status === 'done' ? '✓' : String(index + 1)}</Txt>
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.qTitle}>{lesson.title}</Txt>
        {isActive ? <Txt style={[styles.qNote, { color: colors.green }]}>In progress</Txt> : null}
      </View>
      {isActive ? (
        <Button label="Resume" variant="pink" size="sm" style={{ paddingHorizontal: 16 }} onPress={onPress} />
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
  sectionLabel: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.pinkDark },
  sectionMeta: { fontFamily: font.extra, fontSize: 10.5, letterSpacing: 0.5, color: colors.pinkDark },
  sectionChevron: { fontFamily: font.bold, fontSize: 13, color: colors.pinkDark },
  qnode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qnodeTxt: { fontFamily: font.display, fontSize: 15, color: colors.white },
  qTitle: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  qNote: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, marginTop: 1 },
});
