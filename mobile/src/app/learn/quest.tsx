import { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RNSlider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { Screen, Txt, Button, Option, ProgressBar, IconButton, Card, Tag } from '@/components';
import { colors, font } from '@/theme';
import { moduleById } from '@/data';
import { moduleContentById } from '@/content';
import type {
  Chapter, Question, StoryChapter, TeachChapter, MatchingChapter, HintChapter, DecisionChapter,
  MicrosimChapter, PollChapter, MythcardsChapter, KnowledgecheckChapter, SimulatorChapter,
  BossbattleChapter, SpotcheckChapter, PriceisrightChapter, ExplainbackChapter, UrlinspectChapter,
} from '@/content';

/** A chapter reports back how much XP it earned, and — for chapters with a clear
 * right/wrong answer — whether the player got it right, so the quest can tally a real
 * score for the results screen (mirrors how knowledgecheck/poll/mythcards/priceisright
 * work on the website). */
type Complete = (xpDelta: number, graded?: boolean) => void;

/** Screen 17 (extended) — Quest player. Renders the website's full multi-chapter quest
 * content (story/teach/matching/decision/microsim/etc — all 15 chapter types) instead of
 * the flat single-quiz flow, one chapter at a time. */
export default function QuestPlayer() {
  const router = useRouter();
  const { moduleId, lessonIndex } = useLocalSearchParams<{ moduleId: string; lessonIndex: string }>();
  const mod = moduleById(moduleId ?? 'saving') ?? moduleById('saving')!;
  const content = moduleContentById(mod.id);
  const li = Number(lessonIndex ?? 0);
  const quest = content?.quests[li];

  const [chapterIdx, setChapterIdx] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gradedTotal, setGradedTotal] = useState(0);

  if (!quest || !content) {
    return (
      <Screen edges={['top']}>
        <View style={styles.content}>
          <Txt variant="h1">No quest found for this lesson.</Txt>
          <Button label="Back" onPress={() => router.back()} style={{ marginTop: 14 }} />
        </View>
      </Screen>
    );
  }

  const chapter = quest.chapters[chapterIdx];

  const onComplete: Complete = (xpDelta, graded) => {
    const nextXp = xpEarned + xpDelta;
    const nextCorrect = correctCount + (graded ? 1 : 0);
    const nextGraded = gradedTotal + (graded !== undefined ? 1 : 0);
    if (chapterIdx + 1 >= quest.chapters.length) {
      router.replace({
        pathname: '/learn/results',
        params: {
          moduleId: mod.id, lessonIndex: String(li),
          correctCount: String(nextCorrect), total: String(nextGraded), xpEarned: String(nextXp),
        },
      });
      return;
    }
    setXpEarned(nextXp);
    setCorrectCount(nextCorrect);
    setGradedTotal(nextGraded);
    setChapterIdx(chapterIdx + 1);
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.stick}>
        <IconButton name="x" size={34} iconSize={16} onPress={() => router.back()} />
        <ProgressBar value={chapterIdx / quest.chapters.length} style={{ flex: 1 }} height={10} />
        <Txt style={styles.step}>{chapterIdx + 1} / {quest.chapters.length}</Txt>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ChapterView key={chapter.id} chapter={chapter} questions={content.questions} onComplete={onComplete} />
      </ScrollView>
    </Screen>
  );
}

function ChapterView({ chapter, questions, onComplete }: { chapter: Chapter; questions: Question[]; onComplete: Complete }) {
  switch (chapter.type) {
    case 'story': return <StoryView chapter={chapter} onComplete={onComplete} />;
    case 'teach': return <TeachView chapter={chapter} onComplete={onComplete} />;
    case 'matching': return <MatchingView chapter={chapter} onComplete={onComplete} />;
    case 'hint': return <HintView chapter={chapter} onComplete={onComplete} />;
    case 'decision': return <DecisionView chapter={chapter} onComplete={onComplete} />;
    case 'microsim': return <MicrosimView chapter={chapter} onComplete={onComplete} />;
    case 'poll': return <PollView chapter={chapter} onComplete={onComplete} />;
    case 'mythcards': return <MythcardsView chapter={chapter} onComplete={onComplete} />;
    case 'knowledgecheck': return <KnowledgecheckView chapter={chapter} questions={questions} onComplete={onComplete} />;
    case 'simulator': return <SimulatorView chapter={chapter} onComplete={onComplete} />;
    case 'bossbattle': return <BossbattleView chapter={chapter} onComplete={onComplete} />;
    case 'spotcheck': return <SpotcheckView chapter={chapter} onComplete={onComplete} />;
    case 'priceisright': return <PriceisrightView chapter={chapter} onComplete={onComplete} />;
    case 'explainback': return <ExplainbackView chapter={chapter} onComplete={onComplete} />;
    case 'urlinspect': return <UrlinspectView chapter={chapter} onComplete={onComplete} />;
    default: return null;
  }
}

/* ───────────────────────── story ───────────────────────── */
function StoryView({ chapter, onComplete }: { chapter: StoryChapter; onComplete: Complete }) {
  const [i, setI] = useState(0);
  const beat = chapter.beats[i];
  const last = i + 1 >= chapter.beats.length;
  return (
    <View style={{ gap: 14 }}>
      {chapter.title ? <Txt variant="h2">{chapter.title}</Txt> : null}
      <Card style={{ gap: 6 }}>
        <Tag tone="pink">{beat.speaker}</Tag>
        <Txt variant="lead" style={{ fontSize: 15, color: colors.ink }}>{beat.text}</Txt>
      </Card>
      <Button label={last ? 'Continue →' : 'Next'} onPress={() => (last ? onComplete(0) : setI(i + 1))} />
    </View>
  );
}

/* ───────────────────────── teach ───────────────────────── */
function TeachView({ chapter, onComplete }: { chapter: TeachChapter; onComplete: Complete }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const concept = chapter.concepts[i];
  const last = i + 1 >= chapter.concepts.length;
  // Some concepts have no statement at all (check: {} or absent) — informational only, no quiz.
  const hasCheck = !!concept.check?.statement;

  const pick = (guess: boolean) => setAnswered(guess);
  const next = () => {
    if (last) { onComplete(chapter.xpOnComplete ?? 0); return; }
    setI(i + 1);
    setAnswered(null);
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Card style={{ gap: 8 }}>
        <Txt style={styles.term}>{concept.term}</Txt>
        <Txt variant="lead" style={{ fontSize: 14 }}>{concept.plain}</Txt>
        <Txt style={{ fontFamily: font.semi, fontSize: 12.5, color: colors.muted3, fontStyle: 'italic' }}>{concept.analogy}</Txt>
        {concept.linkOut ? (
          <Button label={`${concept.linkOut.label} →`} variant="ghost" size="sm" onPress={() => router.push('/(tabs)/tools')} />
        ) : null}
      </Card>
      {hasCheck ? (
        <Card style={{ gap: 10 }}>
          <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: colors.ink }}>{concept.check?.statement}</Txt>
          {answered === null ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="True" variant="ghost" onPress={() => pick(true)} style={{ flex: 1 }} />
              <Button label="False" variant="ghost" onPress={() => pick(false)} style={{ flex: 1 }} />
            </View>
          ) : (
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === concept.check?.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === concept.check?.isTrue ? 'Correct!' : `Not quite — that's ${concept.check?.isTrue ? 'true' : 'false'}.`}
            </Txt>
          )}
        </Card>
      ) : null}
      {!hasCheck || answered !== null ? <Button label={last ? 'Continue →' : 'Next concept'} onPress={next} /> : null}
    </View>
  );
}

/* ───────────────────────── matching ───────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

function MatchingView({ chapter, onComplete }: { chapter: MatchingChapter; onComplete: Complete }) {
  const [terms] = useState(() => shuffle(chapter.pairs.map((p) => p.term)));
  const [defs] = useState(() => shuffle(chapter.pairs.map((p) => p.definition)));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selTerm, setSelTerm] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<string | null>(null);

  const pickDef = (def: string) => {
    if (!selTerm) return;
    const correct = chapter.pairs.find((p) => p.term === selTerm)?.definition === def;
    if (correct) {
      const next = new Set(matched); next.add(selTerm);
      setMatched(next);
      setSelTerm(null);
      if (next.size === chapter.pairs.length) setTimeout(() => onComplete(chapter.xpOnComplete ?? 0), 400);
    } else {
      setWrongPair(def);
      setTimeout(() => { setWrongPair(null); setSelTerm(null); }, 500);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      {chapter.hintText ? <Txt variant="lead" style={{ fontSize: 13 }}>{chapter.hintText}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {terms.map((t) => (
            <Pressable
              key={t}
              disabled={matched.has(t)}
              onPress={() => setSelTerm(t)}
              style={[styles.matchChip, selTerm === t && styles.matchChipOn, matched.has(t) && styles.matchChipDone]}
            >
              <Txt style={styles.matchChipTxt}>{t}</Txt>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {defs.map((d) => {
            const isDone = chapter.pairs.some((p) => p.definition === d && matched.has(p.term));
            return (
              <Pressable
                key={d}
                disabled={isDone}
                onPress={() => pickDef(d)}
                style={[styles.matchChip, wrongPair === d && styles.matchChipWrong, isDone && styles.matchChipDone]}
              >
                <Txt style={styles.matchChipTxt}>{d}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────── hint ───────────────────────── */
function HintView({ chapter, onComplete }: { chapter: HintChapter; onComplete: Complete }) {
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 8 }}>
        <Tag tone="warm">{chapter.tag}</Tag>
        <Txt variant="lead" style={{ fontSize: 14.5, color: colors.ink }}>{chapter.text}</Txt>
      </Card>
      <Button label="Got it →" onPress={() => onComplete(chapter.xpOnComplete ?? 0)} />
    </View>
  );
}

/* ───────────────────────── decision ───────────────────────── */
function DecisionView({ chapter, onComplete }: { chapter: DecisionChapter; onComplete: Complete }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => setPickedId(c.id)} />
          ))}
        </View>
      ) : (
        <>
          <Card><Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked.outcome.text}</Txt></Card>
          <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0)} />
        </>
      )}
    </View>
  );
}

/* ───────────────────────── microsim ───────────────────────── */
function MicrosimView({ chapter, onComplete }: { chapter: MicrosimChapter; onComplete: Complete }) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(chapter.sliders.map((s) => [s.id, s.default])),
  );
  const [submitted, setSubmitted] = useState(false);
  const fixedTotal = chapter.fixedCosts.reduce((s, f) => s + f.amount, 0);
  const variableTotal = chapter.sliders.reduce((s, sl) => s + (values[sl.id] ?? 0), 0);
  const leftover = chapter.income - fixedTotal - variableTotal;
  // maxLeftover is null on the catch-all (highest) tier — treat as +Infinity, not 0, when sorting/matching.
  const cap = (v: number | null) => (v === null ? Infinity : v);
  const tier = [...chapter.feedbackTiers].sort((a, b) => cap(a.maxLeftover) - cap(b.maxLeftover)).find((t) => leftover <= cap(t.maxLeftover))
    ?? chapter.feedbackTiers[chapter.feedbackTiers.length - 1];

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <Card style={{ gap: 4 }}>
        <Txt style={styles.term}>Income: ${chapter.income}</Txt>
        {chapter.fixedCosts.map((f) => (
          <View key={f.label} style={styles.rowBetween}>
            <Txt variant="lead" style={{ fontSize: 12.5 }}>{f.label}</Txt>
            <Txt style={{ fontFamily: font.bold, fontSize: 12.5 }}>${f.amount}</Txt>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 14 }}>
        {chapter.sliders.map((s) => (
          <View key={s.id} style={{ gap: 4 }}>
            <View style={styles.rowBetween}>
              <Txt style={{ fontFamily: font.semi, fontSize: 12.5, color: colors.muted1 }}>{s.label}</Txt>
              <Txt style={{ fontFamily: font.extra, fontSize: 12.5 }}>${values[s.id]}</Txt>
            </View>
            <RNSlider
              minimumValue={s.min} maximumValue={s.max} step={s.step} value={values[s.id]}
              onValueChange={(v) => setValues((prev) => ({ ...prev, [s.id]: v }))}
              minimumTrackTintColor={colors.green} maximumTrackTintColor={colors.track} thumbTintColor={colors.green}
            />
          </View>
        ))}
      </Card>
      <Card style={{ alignItems: 'center', gap: 2 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5 }}>LEFT OVER</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 28, color: leftover < 0 ? colors.danger : colors.greenDark }}>${leftover}</Txt>
      </Card>
      {submitted ? (
        <>
          <Card><Txt style={{ fontFamily: font.semi, fontSize: 14, color: tier.ok ? colors.greenDark : colors.pinkDark }}>{tier.text}</Txt></Card>
          <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0)} />
        </>
      ) : (
        <Button label="See how you did" onPress={() => setSubmitted(true)} />
      )}
    </View>
  );
}

/* ───────────────────────── poll ───────────────────────── */
function PollView({ chapter, onComplete }: { chapter: PollChapter; onComplete: Complete }) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card><Txt style={{ fontFamily: font.displayMed, fontSize: 15, color: colors.ink }}>{chapter.statement}</Txt></Card>
      {answered === null ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="True" variant="ghost" onPress={() => setAnswered(true)} style={{ flex: 1 }} />
          <Button label="False" variant="ghost" onPress={() => setAnswered(false)} style={{ flex: 1 }} />
        </View>
      ) : (
        <>
          <Card>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === chapter.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === chapter.isTrue ? 'Correct!' : 'Not quite.'}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{chapter.explanation}</Txt>
          </Card>
          <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0, answered === chapter.isTrue)} />
        </>
      )}
    </View>
  );
}

/* ───────────────────────── mythcards ───────────────────────── */
function MythcardsView({ chapter, onComplete }: { chapter: MythcardsChapter; onComplete: Complete }) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [correctSoFar, setCorrectSoFar] = useState(0);
  const card = chapter.cards[i];
  const last = i + 1 >= chapter.cards.length;

  const pick = (guess: boolean) => {
    setAnswered(guess);
    if (guess === card.isTrue) setCorrectSoFar((c) => c + 1);
  };
  const next = () => {
    if (last) {
      onComplete((chapter.xpPerCorrect ?? 0) * correctSoFar, true);
      return;
    }
    setI(i + 1);
    setAnswered(null);
  };

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Card style={{ gap: 8 }}>
        <Tag tone="warm">MYTH OR FACT?</Tag>
        <Txt style={{ fontFamily: font.displayMed, fontSize: 15, color: colors.ink }}>{card.myth}</Txt>
      </Card>
      {answered === null ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Myth" variant="ghost" onPress={() => pick(false)} style={{ flex: 1 }} />
          <Button label="Fact" variant="ghost" onPress={() => pick(true)} style={{ flex: 1 }} />
        </View>
      ) : (
        <>
          <Card>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: answered === card.isTrue ? colors.greenDark : colors.pinkDark }}>
              {answered === card.isTrue ? 'Correct!' : `Actually, that's ${card.isTrue ? 'a fact' : 'a myth'}.`}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{card.explanation}</Txt>
          </Card>
          <Button label={last ? 'Continue →' : 'Next card'} onPress={next} />
        </>
      )}
    </View>
  );
}

/* ───────────────────────── knowledgecheck ───────────────────────── */
function KnowledgecheckView({ chapter, questions, onComplete }: { chapter: KnowledgecheckChapter; questions: Question[]; onComplete: Complete }) {
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const question = questions[chapter.qIndices[i]];
  const answered = sel !== null;
  const right = question ? sel === question.correct : false;
  const last = i + 1 >= chapter.qIndices.length;

  const next = () => {
    if (last) { onComplete(0, right); return; }
    setI(i + 1);
    setSel(null);
  };

  if (!question) return null;
  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{question.q}</Txt>
      <View style={{ gap: 10 }}>
        {question.opts.map((c, idx) => {
          const st = !answered ? 'default' : idx === question.correct ? 'correct' : idx === sel ? 'wrong' : 'default';
          return (
            <Option
              key={c}
              label={c}
              control="radio"
              state={st}
              onPress={() => !answered && setSel(idx)}
              right={st === 'correct' ? <Feather name="check" size={20} color={colors.greenDark} /> : st === 'wrong' ? <Feather name="x" size={20} color={colors.danger} /> : undefined}
            />
          );
        })}
      </View>
      {answered ? (
        <>
          <Card><Txt variant="lead" style={{ fontSize: 13 }}>{question.exp}</Txt></Card>
          <Button label={last ? 'Continue →' : 'Next question'} variant={right ? 'green' : 'pink'} onPress={next} />
        </>
      ) : null}
    </View>
  );
}

/* ───────────────────────── simulator ───────────────────────── */
function SimulatorView({ chapter, onComplete }: { chapter: SimulatorChapter; onComplete: Complete }) {
  // meterKey/meterMin/meterMax are missing on 2/22 real chapters — fall back to a plain 0-100 score.
  const meterKey = chapter.meterKey ?? 'score';
  const meterMin = chapter.meterMin ?? 0;
  const meterMax = chapter.meterMax ?? 100;
  const [meter, setMeter] = useState((meterMin + meterMax) / 2);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<string[]>([]);

  const apply = (d: SimulatorChapter['decisions'][number]) => {
    setMeter((m) => Math.min(meterMax, Math.max(meterMin, m + d.scoreDelta)));
    setUsed((prev) => new Set(prev).add(d.id));
    setNotes((prev) => [...prev, d.note]);
  };
  const pct = (meter - meterMin) / (meterMax - meterMin);

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 6 }}>
        <Txt style={{ fontFamily: font.bold, fontSize: 12, color: colors.muted5, textTransform: 'uppercase' }}>{meterKey}</Txt>
        <Txt style={{ fontFamily: font.display, fontSize: 28, color: colors.greenDark }}>{Math.round(meter)}</Txt>
        <ProgressBar value={pct} height={9} />
      </Card>
      <View style={{ gap: 10 }}>
        {chapter.decisions.map((d) => (
          <Option key={d.id} label={d.label} state={used.has(d.id) ? 'on' : 'default'} onPress={() => !used.has(d.id) && apply(d)} />
        ))}
      </View>
      {notes.length ? (
        <Card style={{ gap: 6 }}>
          {notes.map((n, idx) => <Txt key={idx} variant="lead" style={{ fontSize: 12.5 }}>{n}</Txt>)}
        </Card>
      ) : null}
      {used.size > 0 ? <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0)} /> : null}
    </View>
  );
}

/* ───────────────────────── bossbattle ───────────────────────── */
const BOSS_BASE_XP = 20;

function BossbattleView({ chapter, onComplete }: { chapter: BossbattleChapter; onComplete: Complete }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = chapter.choices.find((c) => c.id === pickedId);
  return (
    <View style={{ gap: 14 }}>
      <Tag tone="warm">⚔ BOSS CHALLENGE</Tag>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.scenario}</Txt>
      {!picked ? (
        <View style={{ gap: 10 }}>
          {chapter.choices.map((c) => (
            <Option key={c.id} label={c.label} onPress={() => setPickedId(c.id)} />
          ))}
        </View>
      ) : (
        <>
          <Card><Txt variant="lead" style={{ fontSize: 14, color: colors.ink }}>{picked.consequence.text}</Txt></Card>
          <Button label="Finish quest →" onPress={() => onComplete(Math.round(BOSS_BASE_XP * picked.consequence.xpMultiplier))} />
        </>
      )}
    </View>
  );
}

/* ───────────────────────── spotcheck ───────────────────────── */
function SpotcheckView({ chapter, onComplete }: { chapter: SpotcheckChapter; onComplete: Complete }) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 10 }}>
        <Txt style={styles.term}>{chapter.postingTitle}</Txt>
        {chapter.segments.map((s) => {
          const isFlagged = flagged.has(s.id);
          const showResult = revealed;
          return (
            <Pressable key={s.id} disabled={revealed} onPress={() => toggle(s.id)}>
              <View style={[
                styles.segment,
                isFlagged && styles.segmentFlagged,
                showResult && s.isRedFlag && styles.segmentBad,
                showResult && !s.isRedFlag && isFlagged && styles.segmentOk,
              ]}>
                <Txt style={{ fontFamily: font.semi, fontSize: 13, color: colors.ink }}>{s.text}</Txt>
                {showResult ? <Txt variant="lead" style={{ fontSize: 12, marginTop: 4 }}>{s.explanation}</Txt> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>
      {!revealed ? (
        <Button label="Check my answers" onPress={() => setRevealed(true)} />
      ) : (
        <Button label="Continue →" onPress={() => onComplete(0)} />
      )}
    </View>
  );
}

/* ───────────────────────── priceisright ───────────────────────── */
function PriceisrightView({ chapter, onComplete }: { chapter: PriceisrightChapter; onComplete: Complete }) {
  const { min, max, step } = chapter.guessRange;
  const [guess, setGuess] = useState(Math.round((min + max) / 2 / step) * step);
  const [submitted, setSubmitted] = useState(false);
  const diff = Math.abs(guess - chapter.actualValue);
  const close = diff <= (max - min) * 0.1;

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <Card style={{ gap: 8, alignItems: 'center' }}>
        <Txt style={{ fontFamily: font.display, fontSize: 32, color: colors.ink }}>${guess}</Txt>
        <RNSlider
          style={{ width: '100%' }}
          minimumValue={min} maximumValue={max} step={step} value={guess} disabled={submitted}
          onValueChange={setGuess}
          minimumTrackTintColor={colors.green} maximumTrackTintColor={colors.track} thumbTintColor={colors.green}
        />
      </Card>
      {submitted ? (
        <>
          <Card>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: close ? colors.greenDark : colors.pinkDark }}>
              {close ? 'Close enough!' : `Actual: $${chapter.actualValue}`}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13, marginTop: 4 }}>{chapter.explanation}</Txt>
          </Card>
          <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0, close)} />
        </>
      ) : (
        <Button label="Lock in my guess" onPress={() => setSubmitted(true)} />
      )}
    </View>
  );
}

/* ───────────────────────── explainback ───────────────────────── */
function ExplainbackView({ chapter, onComplete }: { chapter: ExplainbackChapter; onComplete: Complete }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const hitKeywords = chapter.keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase()));

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.prompt}</Txt>
      <TextInput
        style={styles.input}
        multiline
        editable={!submitted}
        value={text}
        onChangeText={setText}
        placeholder="Explain it in your own words…"
        placeholderTextColor={colors.muted6}
      />
      {submitted ? (
        <>
          <Card style={{ gap: 6 }}>
            <Txt style={{ fontFamily: font.bold, fontSize: 13, color: colors.greenDark }}>
              {hitKeywords.length ? `Nice — you covered: ${hitKeywords.join(', ')}` : "Here's the full picture:"}
            </Txt>
            <Txt variant="lead" style={{ fontSize: 13 }}>{chapter.fullDefinition}</Txt>
          </Card>
          <Button label="Continue →" onPress={() => onComplete(chapter.xpOnComplete ?? 0)} />
        </>
      ) : (
        <Button label="Check my answer" onPress={() => setSubmitted(true)} disabled={!text.trim()} />
      )}
    </View>
  );
}

/* ───────────────────────── urlinspect ───────────────────────── */
function UrlinspectView({ chapter, onComplete }: { chapter: UrlinspectChapter; onComplete: Complete }) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const toggle = (id: string) => setFlagged((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <View style={{ gap: 14 }}>
      <Txt variant="h2">{chapter.title}</Txt>
      <Txt variant="lead" style={{ fontSize: 14 }}>{chapter.intro}</Txt>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {chapter.parts.map((p) => {
            const isFlagged = flagged.has(p.id);
            return (
              <Pressable key={p.id} disabled={revealed} onPress={() => toggle(p.id)}>
                <Txt style={[
                  styles.urlPart,
                  isFlagged && styles.urlPartFlagged,
                  revealed && p.isSuspicious && styles.urlPartBad,
                ]}>
                  {p.segment}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>
      {revealed ? (
        <>
          <Card style={{ gap: 8 }}>
            {chapter.parts.filter((p) => p.isSuspicious).map((p) => (
              <Txt key={p.id} variant="lead" style={{ fontSize: 12.5 }}>• {p.note}</Txt>
            ))}
          </Card>
          <Button label="Continue →" onPress={() => onComplete(0)} />
        </>
      ) : (
        <Button label="Reveal the risky parts" onPress={() => setRevealed(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stick: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1.5, borderBottomColor: '#EFEFE7',
  },
  step: { fontFamily: font.bold, fontSize: 12, color: colors.green },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 28, gap: 14 },
  term: { fontFamily: font.display, fontSize: 17, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  matchChip: {
    borderWidth: 1.5, borderColor: colors.borderOpt, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.white,
  },
  matchChipOn: { borderColor: colors.green, backgroundColor: '#F1F6EF' },
  matchChipWrong: { borderColor: '#D98A9E', backgroundColor: colors.pinkBg2 },
  matchChipDone: { borderColor: colors.green, backgroundColor: colors.tagGreenBg, opacity: 0.6 },
  matchChipTxt: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  segment: { borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: colors.borderOpt },
  segmentFlagged: { borderColor: colors.pink, backgroundColor: colors.pinkBg2 },
  segmentBad: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  segmentOk: { borderColor: colors.lockBorder, backgroundColor: colors.lockBg },
  input: {
    borderWidth: 1.5, borderColor: colors.borderField, borderRadius: 16,
    padding: 14, minHeight: 100, fontFamily: font.semi, fontSize: 14, color: colors.ink,
    textAlignVertical: 'top',
  },
  urlPart: {
    fontFamily: font.bold, fontSize: 13, color: colors.ink,
    paddingVertical: 4, paddingHorizontal: 2,
  },
  urlPartFlagged: { backgroundColor: colors.pinkBg2, borderRadius: 4 },
  urlPartBad: { backgroundColor: colors.dangerBg, color: colors.danger, borderRadius: 4 },
});
