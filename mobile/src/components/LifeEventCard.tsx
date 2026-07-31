import { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { colors, font } from '@/theme';
import { REACTION_FACES } from '@/hammyFaces';
import type { LifeEvent, LifeEventChoice } from '@/lifeEvents';
import { Txt } from './Txt';
import { Button } from './Button';
import { Option } from './Option';
import { Hammy } from './Hammy';

/** Website-faithful "Life happens…" card, ported from app.js showLifeEvent / .lifeevent-card.
 * Deliberately text-only and muted — no emoji, no bright fills — matching the web version
 * (a small Hammy, an uppercase tag, the scenario, plain bordered choices, then text "effect"
 * chips + the outcome). Shared by the ambient mid-lesson popup (learn/quest.tsx) and the
 * post-lesson route (app/sheet/life-event.tsx) so the two can never drift apart again. */

type ChipTone = 'pos' | 'neg' | 'neutral';

/** Mirrors the website's buildLifeEventEffectChips: the mobile LifeEvent model only tracks
 * coinDelta (no checking/savings/credit sim), so a choice either shows a coin change or
 * nothing at all.
 *
 * A choice with no coin change shows NO chip. There used to be a "No financial impact"
 * neutral pill (the website's fallback) but a chip that exists only to say nothing happened
 * is noise — the outcome text below already tells that story, and the empty row reads as a
 * missing value rather than a deliberate one. */
function effectChips(choice: LifeEventChoice): { text: string; tone: ChipTone }[] {
  if (choice.coinDelta) {
    const up = choice.coinDelta > 0;
    return [{ text: `${up ? '+' : '−'}${Math.abs(choice.coinDelta)} coins`, tone: up ? 'pos' : 'neg' }];
  }
  return [];
}

const CHIP: Record<ChipTone, { bg: string; color: string; border?: string }> = {
  pos: { bg: colors.tagGreenBg, color: colors.greenDark },
  neg: { bg: colors.pinkBg, color: colors.pinkDark },
  neutral: { bg: colors.screen, color: colors.muted3, border: colors.border },
};

export function LifeEventCard({
  event,
  onResolve,
  onDone,
}: {
  event: LifeEvent;
  onResolve: (choiceId: string) => void;
  onDone: () => void;
}) {
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const answered = event.choices.find((c) => c.id === answeredId) ?? null;

  // Answering swaps a list of choices for a chip row plus a result line, which is usually
  // shorter — and since both surfaces that show this card size themselves to it (the
  // post-lesson sheet and the mid-lesson popup), the whole sheet visibly shrank the moment
  // you picked something. Locking in the height measured while unanswered keeps it put.
  // Only ever grows (the tallest measurement wins) so applying the minHeight can't feed
  // back into a smaller one.
  const [lockedHeight, setLockedHeight] = useState(0);
  const onCardLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setLockedHeight((cur) => (h > cur ? h : cur));
  };

  const pick = (choiceId: string) => {
    setAnsweredId(choiceId);
    onResolve(choiceId);
  };

  return (
    <View style={[styles.card, lockedHeight > 0 && { minHeight: lockedHeight }]} onLayout={onCardLayout}>
      <View style={styles.header}>
        <Hammy size={56} bob={false} face={REACTION_FACES.gentle} />
        <View style={styles.headerText}>
          <Txt style={styles.tag}>{(event.tag || 'Life happens...').toUpperCase()}</Txt>
          <Txt style={styles.title}>{event.title}</Txt>
        </View>
      </View>

      {!answered ? (
        <>
          <Txt style={styles.body}>{event.scenario}</Txt>
          <View style={styles.choices}>
            {event.choices.map((c) => (
              <Option key={c.id} label={c.label} onPress={() => pick(c.id)} />
            ))}
          </View>
        </>
      ) : (
        <>
          {/* Dropped entirely when there's nothing to report, rather than left as an empty
              row — the row carries its own spacing, so rendering it chipless would leave a
              gap where the pill used to be. */}
          {effectChips(answered).length > 0 ? (
            <View style={styles.chipRow}>
              {effectChips(answered).map((chip, i) => {
                const c = CHIP[chip.tone];
                return (
                  <View
                    key={i}
                    style={[styles.chip, { backgroundColor: c.bg }, c.border ? { borderWidth: 1, borderColor: c.border } : null]}
                  >
                    <Txt style={[styles.chipTxt, { color: c.color }]}>{chip.text}</Txt>
                  </View>
                );
              })}
            </View>
          ) : null}
          <Txt style={styles.body}>{answered.result}</Txt>
          <Button label="Continue" onPress={onDone} style={{ marginTop: 4 }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerText: { flex: 1, gap: 4 },
  tag: { fontFamily: font.extra, fontSize: 11.5, letterSpacing: 0.6, color: colors.pinkDark },
  title: { fontFamily: font.display, fontSize: 20, lineHeight: 23, color: colors.ink },
  body: { fontFamily: font.semi, fontSize: 14, lineHeight: 21, color: colors.muted2 },
  choices: { gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  chipTxt: { fontFamily: font.bold, fontSize: 12 },
});
