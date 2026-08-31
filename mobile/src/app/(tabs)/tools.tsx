import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Screen, Header, Txt, Card, Tag, Segmented, StackedAreaChart, Select, type SelectOption,
  DisclaimerStrip, DISCLAIMER_TOOLS,
} from '@/components';
import { colors, font, selectableInput, noFocusOutline } from '@/theme';
import { useStore, type BudgetLineItem } from '@/store';
import { computeCompoundGrowth, computeLoanMinPayment, computeLoanPayoff, SeriesPoint } from '@/simulators';

/** Adds a `zero` key alongside a debt/payoff series so StackedAreaChart can draw a single
 * area from zero up to `balance` — mirrors the website's `points.map(p => ({ ...p, zero: 0 }))`. */
const withZero = (points: SeriesPoint[]): SeriesPoint[] => points.map((p) => ({ ...p, zero: 0 }));

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Strips a parenthetical aside from a category label — mirrors the website's chart-label
 * regex (`.replace(/\s*\(.*?\)/, '')`), used wherever the full descriptive label ("Food
 * Delivery (DoorDash, Uber Eats, etc.)") would be too long for a chart bar or filter chip. */
const shortLabel = (label: string) => label.replace(/\s*\(.*?\)/, '');

/** Collapsed-by-default section so secondary content (warnings, category editors, "what
 * if" scenarios) doesn't add to the default scroll length. */
function Collapsible({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.collapseHead}>
        <Txt style={styles.cardTitle}>{title}</Txt>
        <Txt style={styles.collapseChevron}>{open ? '▾' : '▸'}</Txt>
      </Pressable>
      {open ? children : null}
    </>
  );
}

function SliderRow({
  label, value, onChange, min, max, step, format,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (v: number) => string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.sliderLabelRow}>
        <Txt style={styles.sliderLabel}>{label}</Txt>
        <Txt style={styles.sliderVal}>{format(value)}</Txt>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.green}
        maximumTrackTintColor={colors.track}
        thumbTintColor={colors.green}
      />
    </View>
  );
}

/** A compact "$123" numeric field — mirrors the website's `<input type="number">` money
 * fields exactly (free-form amount, no slider) rather than mobile's earlier slider-only
 * take on these same values. */
/** Digits allowed in any money box on this screen.
 *
 * Six, i.e. up to $999,999 — comfortably past a real loan balance and far past a monthly
 * grocery bill, while being a hard stop on the box ever needing to be wider than it is.
 * Without a cap the field accepted digits forever: the number outgrew its box, and on the web
 * build (where TextInput is a real <input>) it pushed the row wider than the screen. A budget
 * row does not need to express a billion dollars, so the fix is at the input rather than in
 * ever-cleverer layout. */
const AMOUNT_MAX_DIGITS = 6;

/** Focus state for a field that has had the browser's black outline taken off it.
 *
 * The ring has to be replaced, not merely removed: without it there is no way to tell which
 * of eleven money boxes has the caret. The app's own version is the field's existing border
 * going green, which sits inside the rounded corner where a rectangle drawn around it did
 * not. */
function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return { focused, onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
}

function AmountField({ value, onChangeText, width = 74 }: { value: number | ''; onChangeText: (v: number | '') => void; width?: number }) {
  const ring = useFocusRing();
  return (
    // flexShrink 0 so the box keeps its stated width in a tight row instead of being squeezed
    // by a long label, and the input inside takes minWidth 0 so it can never demand more room
    // than the box gives it — the two halves of "this control is exactly `width` wide, full
    // stop", which is what stops a long number dragging the row off screen.
    <View style={[styles.amountWrap, { width }, ring.focused && styles.fieldFocused]}>
      <Txt style={styles.amountPrefix}>$</Txt>
      <TextInput
        style={styles.amountInput}
        value={value === '' ? '' : String(value)}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, '').slice(0, AMOUNT_MAX_DIGITS);
          onChangeText(cleaned === '' ? '' : Number(cleaned));
        }}
        onFocus={ring.onFocus}
        onBlur={ring.onBlur}
        maxLength={AMOUNT_MAX_DIGITS}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.muted6}
      />
    </View>
  );
}

/** One free-form income/fixed-expense row: an editable label, an editable amount, and a
 * remove button — mirrors the website's rowHtml() exactly (Budget Calculator's income
 * sources and fixed expenses are open-ended lists, not fixed sliders). */
function LineItemRow({
  item, onLabelChange, onAmountChange, onRemove,
}: {
  item: BudgetLineItem;
  onLabelChange: (t: string) => void;
  onAmountChange: (v: number | '') => void;
  onRemove: () => void;
}) {
  const ring = useFocusRing();
  return (
    <View style={styles.lineRow}>
      <TextInput
        style={[styles.lineLabelInput, ring.focused && styles.fieldFocused]}
        value={item.label}
        onChangeText={onLabelChange}
        onFocus={ring.onFocus}
        onBlur={ring.onBlur}
        placeholder="Label"
        placeholderTextColor={colors.muted6}
      />
      <AmountField value={item.amount} onChangeText={onAmountChange} />
      <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
        <Txt style={styles.removeTxt}>×</Txt>
      </Pressable>
    </View>
  );
}

/** One fixed-label variable-expense category row — mirrors the website's 10-category
 * variable-expense grid, with the same food-delivery/beauty "adds up fast" highlight. */
function CategoryRow({
  label, value, onChangeText, callout,
}: {
  label: string; value: number | ''; onChangeText: (v: number | '') => void; callout?: boolean;
}) {
  return (
    <View style={[styles.categoryRow, callout && styles.categoryRowCallout]}>
      <Txt style={[styles.categoryLabel, callout && { color: colors.calloutText }]} numberOfLines={2}>{label}</Txt>
      <AmountField value={value} onChangeText={onChangeText} />
    </View>
  );
}

/** Screen 10 — Tools. Three real calculators ported from the website's Tools page
 * (Budget, Loan Payoff, Compound Interest), matched field-for-field with the website's own
 * inputs/presets/copy rather than a simplified mobile-only take. */
export default function Tools() {
  const { state, level, tierName } = useStore();
  const [tab, setTab] = useState(0);
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Tools</Txt>
        <Segmented options={['Budget', 'Loan Payoff', 'Interest']} value={tab} onChange={setTab} />
        {/* Above the panels, not below them: these three print dollar figures, and a number on
            a screen is the single most advice-shaped thing this app produces. */}
        <DisclaimerStrip text={DISCLAIMER_TOOLS} style={{ marginTop: 0 }} />
        {tab === 2 ? <CompoundInterestPanel /> : tab === 1 ? <LoanPayoffPanel /> : <BudgetPanel />}
      </ScrollView>
    </Screen>
  );
}

/** Named places to put money, each with the rate it historically returns. A pick-list of real
 * options rather than the old two chips plus a "Custom" chip that revealed a 1–12% slider:
 * a student who doesn't already know what rate to expect can't answer a bare percentage
 * slider, but they can answer "where would the money sit". */
const CI_RATE_OPTIONS: SelectOption<number>[] = [
  { value: 0.5, label: 'Regular savings account', sub: 'about 0.5% a year' },
  { value: 4.5, label: 'High-yield savings (HYSA)', sub: 'about 4.5% a year' },
  { value: 6, label: 'Bonds', sub: 'about 6% a year' },
  { value: 8.5, label: 'Index fund', sub: 'about 8.5% a year' },
  { value: 10, label: 'All-stock portfolio', sub: 'about 10% a year, bumpier' },
];

function CompoundInterestPanel() {
  const [startingAmount, setStartingAmount] = useState(500);
  const [monthlyContribution, setMonthlyContribution] = useState(100);
  const [years, setYears] = useState(10);
  const [annualRatePct, setAnnualRatePct] = useState(8.5);
  const [showCompare, setShowCompare] = useState(false);

  const points = computeCompoundGrowth({ startingAmount, monthlyContribution, annualRatePct, years });
  const final = points[points.length - 1];

  const gap = 65 - 18;
  const early = computeCompoundGrowth({ startingAmount: 0, monthlyContribution, annualRatePct, years: gap });
  const late = computeCompoundGrowth({ startingAmount: 0, monthlyContribution, annualRatePct, years: gap - 10 });
  const earlyFinal = early[early.length - 1].balance;
  const lateFinal = late[late.length - 1].balance;

  return (
    <>
      <Card style={{ gap: 15 }}>
        <Txt style={styles.cardTitle}>Your Numbers</Txt>
        <SliderRow label="Starting amount" value={startingAmount} onChange={setStartingAmount} min={0} max={5000} step={50} format={money} />
        <SliderRow label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} min={0} max={1000} step={10} format={money} />
        <SliderRow label="Years" value={years} onChange={setYears} min={1} max={47} step={1} format={(v) => String(v)} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Select
          label="Where the money sits"
          value={annualRatePct}
          options={CI_RATE_OPTIONS}
          onChange={setAnnualRatePct}
        />
      </Card>

      {/* The single most persuasive thing this calculator can show a 19-year-old, so it stops
          looking like a muted grey tag among other muted grey tags. Red, full width, and
          phrased as the question it answers. */}
      <Pressable onPress={() => setShowCompare((s) => !s)} style={styles.compareToggle}>
        <Txt style={styles.compareToggleTxt}>
          {showCompare ? 'Hide the cost of waiting' : 'What does waiting 10 years cost?'}
        </Txt>
      </Pressable>

      {showCompare ? (
        <Card style={styles.compareCard}>
          <Txt style={styles.compareTitle}>Starting at 18 vs. starting at 28</Txt>
          <Txt variant="lead" style={{ fontSize: 12.5, color: colors.dangerDeep }}>
            Same {money(monthlyContribution)} a month, same {annualRatePct}%, both stop at 65.
          </Txt>
          <View style={styles.compareRow}>
            <Txt style={styles.compareLabel}>Start at 18</Txt>
            <Txt style={styles.compareVal}>{money(earlyFinal)}</Txt>
          </View>
          <View style={styles.compareRow}>
            <Txt style={styles.compareLabel}>Start at 28</Txt>
            <Txt style={styles.compareVal}>{money(lateFinal)}</Txt>
          </View>
          <Txt style={styles.comparePunch}>
            Waiting costs {money(earlyFinal - lateFinal)}, for the exact same monthly amount.
          </Txt>
        </Card>
      ) : null}

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>WHERE YOU&apos;LL LAND</Txt>
        <Txt style={styles.resultBig}>{money(final.balance)}</Txt>
        <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
          {years}yr: {money(final.contributed)} in, {money(final.balance - final.contributed)} interest
        </Txt>
        <StackedAreaChart points={points} baseKey="contributed" totalKey="balance" tone="growth" />
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.greenSoft }]} />
            <Txt style={styles.legendTxt}>Put in</Txt>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.pinkBorder }]} />
            <Txt style={styles.legendTxt}>Interest</Txt>
          </View>
        </View>
        {/* The "📈 Doubles every N yrs (Rule of 72)" and "🎯 Crosses $50,000 around year 12"
            lines that used to sit here are gone. Two emoji-led footnotes under a chart that
            already states the balance, the amount put in and the interest earned were a third
            and fourth number competing with the one the card exists to deliver. */}
      </Card>
    </>
  );
}

/** Loan types with the rate each one typically carries. Same idea as CI_RATE_OPTIONS: name
 * the thing the student actually has, not the number they'd have to already know. */
const LOAN_RATE_OPTIONS: SelectOption<number>[] = [
  { value: 5.5, label: 'Federal subsidized', sub: 'about 5.5%' },
  { value: 7, label: 'Federal unsubsidized', sub: 'about 7%' },
  { value: 9, label: 'Private loan', sub: 'about 9%' },
  { value: 12, label: 'High-rate private loan', sub: 'about 12%' },
];

// The three real federal repayment plans, named as the student's paperwork names them.
const TERM_OPTIONS: SelectOption<number>[] = [
  { value: 10, label: 'Standard', sub: '10 years' },
  { value: 20, label: 'Extended', sub: '20 years' },
  { value: 25, label: 'Income-driven', sub: '25 years' },
];

function LoanPayoffPanel() {
  const [loanBalance, setLoanBalance] = useState(27000);
  const [annualRatePct, setAnnualRatePct] = useState(5.5);
  const [termYears, setTermYears] = useState(10);
  const [extraPayment, setExtraPayment] = useState(0);

  const minPayment = computeLoanMinPayment({ principal: loanBalance, annualRatePct, termYears });
  /* How much extra the slider offers: up to the minimum payment again, i.e. as far as
   * doubling what you already owe each month.
   *
   * This used to be derived from a whole second card of sliders — take-home pay, rent, food,
   * other — which computed what was "left over" and capped the extra payment at that. Those
   * four numbers were a budget, and the app has a Budget tool one tab away that does the same
   * job properly and remembers what you typed. Here they were four guesses you had to make
   * before the loan calculator would tell you anything, and every one of them was a default
   * ($3,200 income, $1,100 rent) standing in for a life the student hasn't started yet.
   *
   * The loan question is answerable without them: what does this balance cost me, and what
   * does paying more change. So the tool asks about the loan and nothing else. */
  const maxExtra = Math.max(0, Math.round(minPayment));
  const cappedExtra = Math.min(extraPayment, maxExtra);

  const totalPayment = minPayment + cappedExtra;
  const payoffPoints = computeLoanPayoff({ principal: loanBalance, annualRatePct, monthlyPayment: totalPayment });
  const payoffYears = payoffPoints ? (payoffPoints.length - 1) / 12 : 0;
  const payoffFinal = payoffPoints ? payoffPoints[payoffPoints.length - 1] : null;

  const minOnly = computeLoanPayoff({ principal: loanBalance, annualRatePct, monthlyPayment: minPayment });
  const withExtra = cappedExtra > 0 ? computeLoanPayoff({ principal: loanBalance, annualRatePct, monthlyPayment: minPayment + cappedExtra }) : null;
  const minOnlyFinal = minOnly ? minOnly[minOnly.length - 1] : null;
  const withExtraFinal = withExtra ? withExtra[withExtra.length - 1] : null;

  return (
    <>
      <Card style={{ gap: 15 }}>
        <Txt style={styles.cardTitle}>Your Loan</Txt>
        <SliderRow label="Loan balance" value={loanBalance} onChange={setLoanBalance} min={1000} max={100000} step={500} format={money} />

        <Select label="Loan type" value={annualRatePct} options={LOAN_RATE_OPTIONS} onChange={setAnnualRatePct} />
        <Select label="Repayment plan" value={termYears} options={TERM_OPTIONS} onChange={setTermYears} />
      </Card>

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>WHERE YOU&apos;LL LAND</Txt>
        {payoffPoints && payoffFinal ? (
          <>
            <Txt style={styles.resultBig}>{payoffYears.toFixed(1)} yrs</Txt>
            <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
              {money(payoffFinal.totalInterest)} interest, {money(loanBalance + payoffFinal.totalInterest)} total paid
            </Txt>
            <StackedAreaChart points={withZero(payoffPoints)} baseKey="zero" totalKey="balance" tone="debt" />
            {/* Italic, no card emoji. This is the one sentence that states the whole result in
                plain words, so it's set apart by the type rather than by a 💳 glyph. */}
            <Txt variant="lead" style={styles.payoffSentence}>
              {money(totalPayment)} a month clears {money(loanBalance)} at {annualRatePct}% in {payoffYears.toFixed(1)} years.
            </Txt>
          </>
        ) : (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            {money(totalPayment)} a month doesn&apos;t even cover the interest, so the balance would grow. Raise the payment.
          </Txt>
        )}
      </Card>

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>MINIMUM PAYMENT</Txt>
        <Txt style={styles.resultBig}>{money(minPayment)}/mo</Txt>
        <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
          What this plan requires every month for {termYears} years.
        </Txt>
      </Card>

      {maxExtra > 0 ? (
        <Card style={{ gap: 12 }}>
          <Txt style={styles.cardTitle}>Pay Extra</Txt>
          <SliderRow label="Extra toward the loan" value={cappedExtra} onChange={setExtraPayment} min={0} max={maxExtra} step={5} format={money} />
          {cappedExtra > 0 && minOnlyFinal && withExtraFinal && minOnly && withExtra ? (
            <View style={{ gap: 6 }}>
              <CompareRow label="Minimum only" years={(minOnly.length - 1) / 12} interest={minOnlyFinal.totalInterest} />
              <CompareRow label={`+${money(cappedExtra)}/mo extra`} years={(withExtra.length - 1) / 12} interest={withExtraFinal.totalInterest} />
              <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 4 }}>
                {((minOnly.length - withExtra.length) / 12).toFixed(1)} yrs sooner, saves {money(minOnlyFinal.totalInterest - withExtraFinal.totalInterest)}
              </Txt>
            </View>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

function CompareRow({ label, years, interest }: { label: string; years: number; interest: number }) {
  return (
    <View style={styles.compareRow}>
      <Txt style={{ fontFamily: font.semi, fontSize: 12.5, color: colors.ink }}>{label}</Txt>
      <Txt style={{ fontFamily: font.extra, fontSize: 12.5, color: colors.ink }}>{years.toFixed(1)} yrs · {money(interest)}</Txt>
    </View>
  );
}

// The website's BUDGET_CATEGORY_ORDER (app.js) — all 10 named categories, not a mobile-only
// grouped-down set, so the Budget Calculator matches the website's (state.budgetPlan is a
// shared, synced field — see lib/webState.ts).
//
// The LABELS have been shortened away from the website's: no brand examples after Food
// Delivery, no slashed pairs ("Clothing / Thrift", "Beauty / Personal Care"). A slash asks
// the reader to decide whether their spending counts as one side or the other before they
// can type a number into it, and the examples were three brand names' worth of line for a
// row whose job is to hold one figure. School Supplies and Exercise replace Textbooks and
// Gym for the same reason — they cover what students actually buy without naming one
// instance of it.
const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Groceries', diningOut: 'Dining Out', foodDelivery: 'Food Delivery',
  coffee: 'Coffee', clothing: 'Clothing', beauty: 'Personal Care',
  transportation: 'Transportation', entertainment: 'Entertainment', textbooks: 'School Supplies', gym: 'Exercise',
};
const BUDGET_CATEGORY_ORDER = ['groceries', 'diningOut', 'foodDelivery', 'coffee', 'clothing', 'beauty', 'transportation', 'entertainment', 'textbooks', 'gym'];

/** The five most students actually spend on every month, shown by default. The other five are
 * behind "More categories".
 *
 * Ten money fields in a row was most of what made this screen a chore: a first-time visitor
 * met a wall of inputs with no indication that leaving one blank was fine, so filling in a
 * budget felt like a form to complete rather than a question to answer. The stored shape is
 * untouched — all ten still exist, still sync with the web (see webState.ts), and still count
 * toward every total. This is only what's on screen before you ask for more. */
const BUDGET_CATEGORIES_COMMON = ['groceries', 'diningOut', 'foodDelivery', 'coffee', 'transportation'];
const BUDGET_CATEGORIES_MORE = BUDGET_CATEGORY_ORDER.filter((k) => !BUDGET_CATEGORIES_COMMON.includes(k));

function BarRow({ label, val, max, tone }: { label: string; val: number; max: number; tone: 'pink' | 'green' }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.chartHead}>
        <Txt style={styles.barLabel}>{label}</Txt>
        <Txt style={styles.barVal}>{money(val)}</Txt>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={tone === 'pink' ? ['#F2A9BB', colors.pink] : [colors.greenBright, colors.green]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 8 }}
        />
      </View>
    </View>
  );
}

function BudgetPanel() {
  const { state, setBudgetPlan } = useStore();
  const plan = state.budgetPlan;

  // Mirrors the website's renderBudgetCalculatorPanel: an empty income/fixed-expense list
  // (a first-time visit, or one the player cleared out entirely) gets a single starter row
  // seeded back in, rather than showing a blank list with nothing to edit. Depends on the
  // list LENGTHS (not `[]`) so this actually re-fires if the player removes every row of
  // either list mid-session via the × button — an empty-deps effect only ever ran once at
  // mount, so "cleared out entirely" never actually reseeded after the first load, despite
  // this comment claiming it does.
  useEffect(() => {
    if (plan.incomeSources.length === 0 || plan.fixedExpenses.length === 0) {
      setBudgetPlan((p) => ({
        ...p,
        incomeSources: p.incomeSources.length ? p.incomeSources : [{ id: 'inc0', label: 'Part-time job', amount: '' }],
        fixedExpenses: p.fixedExpenses.length ? p.fixedExpenses : [{ id: 'fix0', label: 'Rent', amount: '' }],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.incomeSources.length, plan.fixedExpenses.length]);

  // Once true it stays true for the session — see the reveal below.
  const [showAllCategories, setShowAllCategories] = useState(false);

  const totalIncome = plan.incomeSources.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalFixed = plan.fixedExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalVariable = BUDGET_CATEGORY_ORDER.reduce((s, k) => s + (Number(plan.variableExpenses[k]) || 0), 0);
  const totalExpenses = totalFixed + totalVariable;
  const remaining = totalIncome - totalExpenses;
  const deliveryBeautyTotal = (Number(plan.variableExpenses.foodDelivery) || 0) + (Number(plan.variableExpenses.beauty) || 0);
  const calloutOn = deliveryBeautyTotal > 100;

  const savingsGoal = Number(plan.savingsGoal) || 0;
  const goalGap = savingsGoal > 0 ? remaining - savingsGoal : null;

  const maxBar = Math.max(totalFixed, ...BUDGET_CATEGORY_ORDER.map((k) => Number(plan.variableExpenses[k]) || 0), 1);

  const updateIncome = (id: string, patch: Partial<BudgetLineItem>) =>
    setBudgetPlan((p) => ({ ...p, incomeSources: p.incomeSources.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const updateFixed = (id: string, patch: Partial<BudgetLineItem>) =>
    setBudgetPlan((p) => ({ ...p, fixedExpenses: p.fixedExpenses.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const removeIncome = (id: string) => setBudgetPlan((p) => ({ ...p, incomeSources: p.incomeSources.filter((x) => x.id !== id) }));
  const removeFixed = (id: string) => setBudgetPlan((p) => ({ ...p, fixedExpenses: p.fixedExpenses.filter((x) => x.id !== id) }));
  // A Date.now()-only id lets two rapid taps (same millisecond) mint identical ids — since
  // every mutator above matches by `x.id === id`/`x.id !== id` and React keys rows by id
  // (below), a collision makes editing or removing "one" row silently act on both at once.
  // The random suffix makes that practically impossible regardless of tap timing.
  const newRowId = (prefix: string) => `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const addIncome = () => setBudgetPlan((p) => ({ ...p, incomeSources: [...p.incomeSources, { id: newRowId('inc'), label: 'New source', amount: '' as const }] }));
  const addFixed = () => setBudgetPlan((p) => ({ ...p, fixedExpenses: [...p.fixedExpenses, { id: newRowId('fix'), label: 'New expense', amount: '' as const }] }));
  const setVariable = (key: string, v: number | '') => setBudgetPlan((p) => ({ ...p, variableExpenses: { ...p.variableExpenses, [key]: v } }));
  const setSavingsGoal = (v: number | '') => setBudgetPlan((p) => ({ ...p, savingsGoal: v }));

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Txt style={styles.cardTitle}>Monthly Income</Txt>
        {plan.incomeSources.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            onLabelChange={(t) => updateIncome(item.id, { label: t })}
            onAmountChange={(v) => updateIncome(item.id, { amount: v })}
            onRemove={() => removeIncome(item.id)}
          />
        ))}
        <Pressable onPress={addIncome}>
          <Tag tone="lock">+ Add income source</Tag>
        </Pressable>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt style={styles.cardTitle}>Fixed Expenses</Txt>
        {plan.fixedExpenses.map((item) => (
          <LineItemRow
            key={item.id}
            item={item}
            onLabelChange={(t) => updateFixed(item.id, { label: t })}
            onAmountChange={(v) => updateFixed(item.id, { amount: v })}
            onRemove={() => removeFixed(item.id)}
          />
        ))}
        <Pressable onPress={addFixed}>
          <Tag tone="lock">+ Add fixed expense</Tag>
        </Pressable>
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt style={styles.cardTitle}>Spending</Txt>
        <Txt variant="lead" style={{ fontSize: 12 }}>
          Roughly, per month. Leave anything you don&apos;t spend on blank.
        </Txt>
        {BUDGET_CATEGORIES_COMMON.map((key) => (
          <CategoryRow
            key={key}
            label={BUDGET_CATEGORY_LABELS[key]}
            value={plan.variableExpenses[key] ?? ''}
            onChangeText={(v) => setVariable(key, v)}
            callout={calloutOn && key === 'foodDelivery'}
          />
        ))}
        {/* A one-way reveal, not a toggle. "More categories" is a request for the rest of the
            list, and once the list is there the control has nothing left to offer — a chevron
            that folds five half-filled rows back out of sight mostly invites you to lose the
            numbers you just typed. So it shows them and removes itself.
            It also opens itself when the delivery/personal-care callout is live, since
            Personal Care is one of the five hidden here and the callout is about that pair. */}
        {showAllCategories || calloutOn ? (
          BUDGET_CATEGORIES_MORE.map((key) => (
            <CategoryRow
              key={key}
              label={BUDGET_CATEGORY_LABELS[key]}
              value={plan.variableExpenses[key] ?? ''}
              onChangeText={(v) => setVariable(key, v)}
              callout={calloutOn && key === 'beauty'}
            />
          ))
        ) : (
          <Pressable onPress={() => setShowAllCategories(true)}>
            <Tag tone="lock">+ More categories ({BUDGET_CATEGORIES_MORE.length})</Tag>
          </Pressable>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt style={styles.cardTitle}>Savings Goal</Txt>
        <View style={styles.savingsRow}>
          <Txt style={styles.categoryLabel}>I want to save</Txt>
          <AmountField value={plan.savingsGoal} onChangeText={setSavingsGoal} width={72} />
          <Txt style={styles.categoryLabel}>per month</Txt>
        </View>
      </Card>

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>SUMMARY</Txt>
        <View style={{ width: '100%', gap: 6 }}>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Total income</Txt><Txt style={styles.compareVal}>{money(totalIncome)}</Txt></View>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Fixed expenses</Txt><Txt style={styles.compareVal}>{money(totalFixed)}</Txt></View>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Variable expenses</Txt><Txt style={styles.compareVal}>{money(totalVariable)}</Txt></View>
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: remaining < 0 ? colors.pinkDark : colors.ink }}>Remaining balance</Txt>
            <Txt style={{ fontFamily: font.display, fontSize: 17, color: remaining < 0 ? colors.pinkDark : colors.greenDark }}>{money(remaining)}</Txt>
          </View>
        </View>
        {goalGap !== null ? (
          <Txt variant="lead" style={[{ fontSize: 12.5, textAlign: 'center' }, goalGap < 0 && styles.overThresholdTxt]}>
            {goalGap >= 0
              ? `On track, with ${money(goalGap)} a month to spare beyond your ${money(savingsGoal)} goal.`
              : `Cut about ${money(Math.abs(goalGap))} a month to hit your ${money(savingsGoal)} goal.`}
          </Txt>
        ) : null}
      </Card>

      {/* Closed by default: eleven chart bars sitting open under the summary is a lot of
          screen for something you look at after you've finished entering the numbers, not
          while you're entering them.
          A "What If?" card used to sit below this one — ten category chips, a slider, and a
          sentence about what cutting one of them would leave. It has been removed rather
          than repaired. Its cut was capped at $100 regardless of the category (inherited
          from the website), so the slider frequently could not reach a number that changed
          anything, and it answered a question the Summary above already answers: the
          remaining balance moves as you edit the categories themselves. Two controls for one
          number, one of them lying about its range. */}
      <Card style={{ gap: 12 }}>
        <Collapsible title="Spending by Category">
          <View style={{ gap: 12, marginTop: 10 }}>
            <BarRow label="Fixed Expenses" val={totalFixed} max={maxBar} tone="pink" />
            {BUDGET_CATEGORY_ORDER.map((key) => (
              <BarRow key={key} label={shortLabel(BUDGET_CATEGORY_LABELS[key])} val={Number(plan.variableExpenses[key]) || 0} max={maxBar} tone="green" />
            ))}
          </View>
        </Collapsible>
      </Card>

    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 16 },
  cardTitle: { fontFamily: font.displayMed, fontSize: 14, color: colors.ink },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontFamily: font.semi, fontSize: 12.5, color: colors.muted1, flexShrink: 1 },
  sliderVal: { fontFamily: font.extra, fontSize: 12.5, color: colors.ink },
  chartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 9, borderRadius: 8, backgroundColor: colors.track, overflow: 'hidden' },
  resultCard: { backgroundColor: '#EFF5EC', borderColor: '#D9E7D3', alignItems: 'center', gap: 2 },
  resultCap: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, letterSpacing: 0.3 },
  resultBig: { fontFamily: font.display, fontSize: 32, color: colors.greenDark },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  compareLabel: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  compareVal: { fontFamily: font.extra, fontSize: 12.5, color: colors.ink },
  compareToggle: {
    backgroundColor: colors.danger, borderRadius: 16,
    paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center',
  },
  compareToggleTxt: { fontFamily: font.extra, fontSize: 14, color: colors.white },
  compareCard: { gap: 8, backgroundColor: colors.dangerBg, borderColor: colors.dangerSoft },
  compareTitle: { fontFamily: font.displayMed, fontSize: 14, color: colors.dangerDeep },
  comparePunch: { fontFamily: font.extra, fontSize: 13.5, color: colors.dangerDeep, marginTop: 4 },
  payoffSentence: { fontSize: 12.5, textAlign: 'center', fontStyle: 'italic' },
  legendRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendTxt: { fontFamily: font.semi, fontSize: 11.5, color: colors.muted1 },
  milestone: { fontSize: 12.5, textAlign: 'center' },
  barLabel: { fontFamily: font.extra, fontSize: 12.5, color: colors.ink, flexShrink: 1 },
  barVal: { fontFamily: font.display, fontSize: 13.5, color: colors.ink },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overThresholdTxt: { color: colors.pinkDark },
  collapseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  collapseChevron: { fontFamily: font.bold, fontSize: 13, color: colors.muted4 },

  // Free-form income/fixed-expense row.
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabelInput: {
    flex: 1, minWidth: 0, fontFamily: font.semi, fontSize: 14, color: colors.ink,
    backgroundColor: colors.screen, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 9, paddingHorizontal: 11, ...selectableInput, ...noFocusOutline,
  },
  // Replaces the outline noFocusOutline removes — see its comment in theme.ts.
  fieldFocused: { borderColor: colors.green },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center', flexShrink: 0,
    backgroundColor: colors.screen, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 9, paddingHorizontal: 9, gap: 2,
  },
  amountPrefix: { fontFamily: font.extra, fontSize: 14, color: colors.muted4 },
  amountInput: { flex: 1, minWidth: 0, fontFamily: font.extra, fontSize: 14, color: colors.ink, padding: 0, ...selectableInput, ...noFocusOutline },
  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  removeTxt: { fontFamily: font.bold, fontSize: 18, color: colors.muted5, lineHeight: 20 },

  // Fixed-category variable-expense row.
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingVertical: 6,
  },
  categoryRowCallout: {
    backgroundColor: colors.calloutBg, borderRadius: 10,
    paddingHorizontal: 8, marginHorizontal: -8,
  },
  categoryLabel: { flex: 1, fontFamily: font.semi, fontSize: 13, color: colors.ink },

  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
