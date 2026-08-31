import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from './Txt';
import { Card } from './Card';
import { colors, font, radius } from '@/theme';
import { openLegalPage, TERMS_URL } from '@/lib/legalLinks';

/**
 * "Stacked is education, not financial advice" — the two shapes it takes.
 *
 * This is a money app used by students who may act on what it says the same afternoon, so the
 * fact that nobody here is a licensed adviser and nothing here is personal advice cannot live
 * only in a Terms page nobody opens. It appears in the app itself: `DisclaimerStrip` wherever
 * teaching or a dollar figure is (Modules, Tools), `DisclaimerCard` in full on Settings.
 *
 * Both mirror the website exactly — app.html's `.disclaimer-strip` and `#disclaimer-card`,
 * same wording, same gold treatment — so a student reading it on their laptop and on their
 * phone is reading one notice and not two.
 *
 * Gold rather than the app's pink or the danger red: pink is the attention colour the whole
 * product already uses for progress and CTAs, and red is what the delete-account rows own.
 * Gold is unclaimed here and reads as "read this", not "something is wrong".
 */

/** The short form. Quiet enough to live permanently under a screen's content, loud enough
 * that the tag reads before the sentence does. */
export function DisclaimerStrip({ text, style }: { text: string; style?: object }) {
  return (
    <View style={[styles.strip, style]}>
      <View style={styles.stripTagRow}>
        <View style={styles.stripTag}>
          <Txt style={styles.stripTagTxt}>HEADS UP</Txt>
        </View>
      </View>
      <Txt style={styles.stripTxt}>{text}</Txt>
      <Pressable onPress={() => openLegalPage(TERMS_URL)} accessibilityRole="link">
        <Txt style={styles.stripLink}>Read the full disclaimer →</Txt>
      </Pressable>
    </View>
  );
}

/** The full section, on Settings. Paragraph by paragraph this is the same text as the
 * website's Settings card; each opens with the claim in bold so it can be skimmed and still
 * land. */
export function DisclaimerCard() {
  return (
    <Card style={styles.card}>
      <Txt variant="h2">Education, not financial advice</Txt>
      <Txt style={styles.cardSub}>Please read this before acting on anything you learn here.</Txt>

      <Txt style={styles.body}>
        <Txt style={styles.strong}>We are not financial advisers.</Txt> Stacked is a
        financial-literacy learning app. Nobody behind it is a licensed financial adviser,
        broker, tax preparer, accountant, attorney or lender, and using Stacked does not create
        an adviser–client or fiduciary relationship of any kind.
      </Txt>
      <Txt style={styles.body}>
        <Txt style={styles.strong}>Nothing here is personalised advice.</Txt> Stacked knows
        nothing about your circumstances. Nothing in a lesson, quiz, tool, sub-quest or message
        from Hammy is investment, tax, legal or credit advice, or a recommendation to buy, sell
        or hold any financial product, take on any loan, or use any particular bank, broker or
        service.
      </Txt>
      <Txt style={styles.body}>
        <Txt style={styles.strong}>The numbers are illustrations.</Txt> Lessons use simplified
        examples, and figures such as interest rates, tax bands, contribution limits, aid
        deadlines and prices change and may be out of date. The Budget, Loan Payoff and Interest
        tools work only on numbers you type in yourself, connect to no bank or financial
        institution, and show an illustration — not a projection of what will happen to you.
      </Txt>
      <Txt style={styles.body}>
        <Txt style={styles.strong}>Real-life sub-quests are optional.</Txt> The step-by-step
        guides walk through things like opening an account or filling in a W-4 so you know what
        to expect. They are general walkthroughs, not instructions for your situation, and you
        never have to do one — every module completes without them.
      </Txt>
      <Txt style={styles.body}>
        <Txt style={styles.strong}>Your decisions are your own.</Txt> Stacked is provided “as
        is”, with no warranty that its content is complete, current or correct. To the fullest
        extent the law allows, we accept no liability for any loss or damage arising from
        decisions you make after using it. Before making a real financial decision, talk to a
        qualified professional who can look at your actual situation.
      </Txt>

      <Pressable onPress={() => openLegalPage(TERMS_URL)} accessibilityRole="link">
        <Txt style={styles.cardLink}>Read the full Terms of Use →</Txt>
      </Pressable>
    </Card>
  );
}

/** The Modules and Tools wordings, kept here beside the component so the two screens can't
 * drift into saying it two different ways. */
export const DISCLAIMER_MODULES =
  'Stacked teaches general concepts — it is not financial advice and we are not financial advisers. Figures in lessons are simplified examples.';
export const DISCLAIMER_TOOLS =
  'These are teaching calculators, not financial advice. They use only the numbers you type in, connect to no bank, and their results are illustrations — not predictions or a recommendation about your money.';

const GOLD_BG = '#FFFBF0';
const GOLD_BORDER = '#F0DFA8';
const GOLD_TAG_BG = '#F3E2AE';
const GOLD_TAG_TXT = '#7A5E12';

const styles = StyleSheet.create({
  strip: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    backgroundColor: GOLD_BG,
    gap: 7,
  },
  stripTagRow: { flexDirection: 'row' },
  stripTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.round,
    backgroundColor: GOLD_TAG_BG,
  },
  stripTagTxt: { fontFamily: font.extra, fontSize: 9.5, letterSpacing: 0.5, color: GOLD_TAG_TXT },
  stripTxt: { fontFamily: font.semi, fontSize: 12.5, lineHeight: 18, color: colors.muted1 },
  stripLink: { fontFamily: font.extra, fontSize: 12.5, color: colors.greenDark },

  card: {
    gap: 0,
    padding: 18,
    marginTop: 14,
    backgroundColor: GOLD_BG,
    borderColor: GOLD_BORDER,
    borderLeftWidth: 5,
    borderLeftColor: colors.reward,
  },
  cardSub: { fontFamily: font.semi, fontSize: 13, lineHeight: 19, color: colors.muted2, marginTop: 4, marginBottom: 14 },
  body: { fontFamily: font.semi, fontSize: 13.5, lineHeight: 21, color: colors.inkSoft, marginBottom: 12 },
  strong: { fontFamily: font.extra, fontSize: 13.5, lineHeight: 21, color: colors.ink },
  cardLink: { fontFamily: font.extra, fontSize: 13, color: colors.greenDark, marginTop: 2 },
});
