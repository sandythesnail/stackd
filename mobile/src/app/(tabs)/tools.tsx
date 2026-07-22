import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Header, Txt, Card, Tag, Segmented, StackedAreaChart } from '@/components';
import { colors, font } from '@/theme';
import { useStore, type BudgetLineItem } from '@/store';
import { computeCompoundGrowth, computeMinPaymentDebt, computeLoanMinPayment, computeLoanPayoff, SeriesPoint } from '@/simulators';

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
function AmountField({ value, onChangeText, width = 84 }: { value: number | ''; onChangeText: (v: number | '') => void; width?: number }) {
  return (
    <View style={[styles.amountWrap, { width }]}>
      <Txt style={styles.amountPrefix}>$</Txt>
      <TextInput
        style={styles.amountInput}
        value={value === '' ? '' : String(value)}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, '');
          onChangeText(cleaned === '' ? '' : Number(cleaned));
        }}
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
  return (
    <View style={styles.lineRow}>
      <TextInput
        style={styles.lineLabelInput}
        value={item.label}
        onChangeText={onLabelChange}
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
        {tab === 2 ? <CompoundInterestPanel /> : tab === 1 ? <LoanPayoffPanel /> : <BudgetPanel />}
      </ScrollView>
    </Screen>
  );
}

const CI_RATE_PRESETS = [
  { mode: 'hysa' as const, label: 'HYSA', sub: '4–5%', rate: 4.5 },
  { mode: 'index' as const, label: 'Index Fund', sub: '7–10%', rate: 8.5 },
];

function CompoundInterestPanel() {
  const [startingAmount, setStartingAmount] = useState(500);
  const [monthlyContribution, setMonthlyContribution] = useState(100);
  const [years, setYears] = useState(10);
  const [annualRatePct, setAnnualRatePct] = useState(8.5);
  const [rateMode, setRateMode] = useState<'hysa' | 'index' | 'custom'>('index');
  const [showCompare, setShowCompare] = useState(false);

  const points = computeCompoundGrowth({ startingAmount, monthlyContribution, annualRatePct, years });
  const final = points[points.length - 1];

  const debtPoints = computeMinPaymentDebt({ startingBalance: 1000, annualRatePct: 24 });
  const debtFinal = debtPoints[debtPoints.length - 1];
  const debtYears = (debtPoints.length - 1) / 12;

  const doublingYears = annualRatePct > 0 ? 72 / annualRatePct : null;
  const milestoneTargets = [10000, 50000, 100000, 500000, 1000000];
  const milestone = milestoneTargets.filter((m) => m > startingAmount).find((m) => points.some((p) => p.balance >= m));
  const milestonePoint = milestone ? points.find((p) => p.balance >= milestone) : null;

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
        <Txt style={styles.cardTitle}>Growth Rate</Txt>
        <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
          {CI_RATE_PRESETS.map((p) => (
            <Pressable key={p.mode} onPress={() => { setRateMode(p.mode); setAnnualRatePct(p.rate); }}>
              <Tag tone={rateMode === p.mode ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>{p.label} {p.sub}</Tag>
            </Pressable>
          ))}
          <Pressable onPress={() => setRateMode('custom')}>
            <Tag tone={rateMode === 'custom' ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>Custom</Tag>
          </Pressable>
        </View>
        {rateMode === 'custom' ? (
          <SliderRow
            label="Annual interest rate" value={annualRatePct}
            onChange={setAnnualRatePct}
            min={1} max={12} step={0.5} format={(v) => `${v}%`}
          />
        ) : (
          <Txt variant="lead" style={{ fontSize: 12.5 }}>Using {annualRatePct}% per year</Txt>
        )}
      </Card>

      <Pressable onPress={() => setShowCompare((s) => !s)} style={{ alignSelf: 'center' }}>
        <Tag tone="lock" style={{ paddingVertical: 8 }}>
          {showCompare ? 'Hide ▴' : 'Compare: 18 vs. 28 →'}
        </Tag>
      </Pressable>

      {showCompare ? (
        <Card style={{ gap: 8 }}>
          <Txt style={styles.cardTitle}>Start at 18 vs. 28</Txt>
          <Txt variant="lead" style={{ fontSize: 12.5 }}>
            Same {money(monthlyContribution)}/mo, same {annualRatePct}%, both stop at 65:
          </Txt>
          <View style={styles.compareRow}>
            <Txt style={styles.compareLabel}>Start at 18</Txt>
            <Txt style={styles.compareVal}>{money(earlyFinal)}</Txt>
          </View>
          <View style={styles.compareRow}>
            <Txt style={styles.compareLabel}>Start at 28</Txt>
            <Txt style={styles.compareVal}>{money(lateFinal)}</Txt>
          </View>
          <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 4 }}>
            Worth {money(earlyFinal - lateFinal)} more by 65 — same monthly amount.
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
        {doublingYears ? (
          <Txt variant="lead" style={styles.milestone}>
            📈 Doubles every {doublingYears.toFixed(1)} yrs at {annualRatePct}% (Rule of 72)
          </Txt>
        ) : null}
        {milestone && milestonePoint ? (
          <Txt variant="lead" style={styles.milestone}>
            🎯 Crosses {money(milestone)} around year {(milestonePoint.month / 12).toFixed(1)}
          </Txt>
        ) : null}
      </Card>

      <Card style={styles.warningCard}>
        <Collapsible title="⚠ Credit Card Warning">
          <Txt variant="lead" style={{ fontSize: 12 }}>
            $1,000 at 24% APR, minimum payments only:
          </Txt>
          <StackedAreaChart points={withZero(debtPoints)} baseKey="zero" totalKey="balance" tone="debt" />
          <Txt variant="lead" style={{ fontSize: 12.5 }}>
            {debtFinal.balance <= 0.5
              ? `${debtYears.toFixed(1)} yrs to pay off — ${money(debtFinal.totalInterest)} interest, more than the balance itself.`
              : `Still not paid off after 10 yrs — ${money(debtFinal.totalInterest)} interest paid, ${money(debtFinal.balance)} still owed.`}
          </Txt>
        </Collapsible>
      </Card>
    </>
  );
}

const RATE_PRESETS = [
  { mode: 'subsidized', label: 'Fed. Subsidized', rate: 5.5 },
  { mode: 'unsubsidized', label: 'Fed. Unsubsidized', rate: 7 },
  { mode: 'private', label: 'Private', rate: 9 },
] as const;

// Named terms, ported exactly from the website's 3 loan-term presets — not a plain 5/10/15/
// 20/25yr picker like this screen used to have.
const TERM_PRESETS = [
  { years: 10, label: 'Standard' },
  { years: 20, label: 'Extended' },
  { years: 25, label: 'Income-Driven' },
] as const;

function LoanPayoffPanel() {
  const [loanBalance, setLoanBalance] = useState(27000);
  const [annualRatePct, setAnnualRatePct] = useState(5.5);
  const [rateMode, setRateMode] = useState<'subsidized' | 'unsubsidized' | 'private' | 'custom'>('subsidized');
  const [termYears, setTermYears] = useState(10);
  const [monthlyIncome, setMonthlyIncome] = useState(3200);
  const [rent, setRent] = useState(1100);
  const [food, setFood] = useState(400);
  const [otherExpenses, setOtherExpenses] = useState(300);
  const [extraPayment, setExtraPayment] = useState(0);

  const minPayment = computeLoanMinPayment({ principal: loanBalance, annualRatePct, termYears });
  const essential = rent + food + otherExpenses;
  const availableForLoan = monthlyIncome - essential;
  const shortfall = minPayment - availableForLoan;
  const canAffordMinimum = shortfall <= 0;
  const maxExtra = Math.max(0, Math.floor(availableForLoan - minPayment));
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

        <View style={{ gap: 8 }}>
          <Txt style={styles.sliderLabel}>Interest rate</Txt>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            {RATE_PRESETS.map((p) => (
              <Pressable key={p.mode} onPress={() => { setRateMode(p.mode); setAnnualRatePct(p.rate); }}>
                <Tag tone={rateMode === p.mode ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>
                  {p.label} ~{p.rate}%
                </Tag>
              </Pressable>
            ))}
            <Pressable onPress={() => setRateMode('custom')}>
              <Tag tone={rateMode === 'custom' ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>Custom</Tag>
            </Pressable>
          </View>
          {rateMode === 'custom' ? (
            <SliderRow label="Annual rate" value={annualRatePct} onChange={setAnnualRatePct} min={1} max={14} step={0.25} format={(v) => `${v}%`} />
          ) : (
            <Txt variant="lead" style={{ fontSize: 12.5 }}>Using {annualRatePct}% per year</Txt>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Txt style={styles.sliderLabel}>Term</Txt>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            {TERM_PRESETS.map((p) => (
              <Pressable key={p.years} onPress={() => setTermYears(p.years)}>
                <Tag tone={termYears === p.years ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>{p.label} {p.years}yr</Tag>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 15 }}>
        <Txt style={styles.cardTitle}>Take-Home Pay & Living Costs</Txt>
        <Txt variant="lead" style={{ fontSize: 12, marginTop: -6 }}>
          Uses take-home (net) pay, not gross salary — see the Earning module for the difference.
        </Txt>
        <SliderRow label="Monthly take-home pay" value={monthlyIncome} onChange={setMonthlyIncome} min={1500} max={7000} step={50} format={money} />
        <SliderRow label="Rent" value={rent} onChange={setRent} min={0} max={3000} step={25} format={money} />
        <SliderRow label="Food" value={food} onChange={setFood} min={0} max={1000} step={10} format={money} />
        <SliderRow label="Other (utilities, transport, etc.)" value={otherExpenses} onChange={setOtherExpenses} min={0} max={1500} step={10} format={money} />
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
            <Txt variant="lead" style={styles.milestone}>
              💳 {money(totalPayment)}/mo clears {money(loanBalance)} at {annualRatePct}% in {payoffYears.toFixed(1)} yrs
            </Txt>
          </>
        ) : (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            {money(totalPayment)}/mo doesn&apos;t cover the interest — balance would grow. Raise the payment.
          </Txt>
        )}
      </Card>

      <Card style={!canAffordMinimum ? [styles.resultCard, styles.warningCard] : styles.resultCard}>
        <Txt style={styles.resultCap}>{canAffordMinimum ? 'MINIMUM PAYMENT' : '⚠ BUDGET REALITY CHECK'}</Txt>
        <Txt style={styles.resultBig}>{money(minPayment)}/mo</Txt>
        {canAffordMinimum ? (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            {money(Math.max(0, availableForLoan - minPayment))}/mo left after expenses + minimum payment
          </Txt>
        ) : (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            {money(Math.max(0, availableForLoan))}/mo left after expenses, but minimum is {money(minPayment)} — {money(shortfall)} short
          </Txt>
        )}
      </Card>

      {canAffordMinimum && maxExtra > 0 ? (
        <Card style={{ gap: 12 }}>
          <Txt style={styles.cardTitle}>Pay Extra With What&apos;s Left</Txt>
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

// Ported verbatim from the website's BUDGET_CATEGORY_LABELS/ORDER (app.js) — all 10 named
// categories, not a mobile-only grouped-down set, so the Budget Calculator matches the
// website's exactly (state.budgetPlan is now a shared, synced field — see lib/webState.ts).
const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Groceries', diningOut: 'Dining Out', foodDelivery: 'Food Delivery (DoorDash, Uber Eats, etc.)',
  coffee: 'Coffee', clothing: 'Clothing / Thrift', beauty: 'Beauty / Personal Care',
  transportation: 'Transportation', entertainment: 'Entertainment', textbooks: 'Textbooks', gym: 'Gym',
};
const BUDGET_CATEGORY_ORDER = ['groceries', 'diningOut', 'foodDelivery', 'coffee', 'clothing', 'beauty', 'transportation', 'entertainment', 'textbooks', 'gym'];

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
  // seeded back in, rather than showing a blank list with nothing to edit.
  useEffect(() => {
    if (plan.incomeSources.length === 0 || plan.fixedExpenses.length === 0) {
      setBudgetPlan((p) => ({
        ...p,
        incomeSources: p.incomeSources.length ? p.incomeSources : [{ id: 'inc0', label: 'Part-time job', amount: '' }],
        fixedExpenses: p.fixedExpenses.length ? p.fixedExpenses : [{ id: 'fix0', label: 'Rent', amount: '' }],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [whatIfCategory, setWhatIfCategory] = useState('foodDelivery');
  const [whatIfCut, setWhatIfCut] = useState(0);

  const totalIncome = plan.incomeSources.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalFixed = plan.fixedExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalVariable = BUDGET_CATEGORY_ORDER.reduce((s, k) => s + (Number(plan.variableExpenses[k]) || 0), 0);
  const totalExpenses = totalFixed + totalVariable;
  const remaining = totalIncome - totalExpenses;
  const deliveryBeautyTotal = (Number(plan.variableExpenses.foodDelivery) || 0) + (Number(plan.variableExpenses.beauty) || 0);
  const calloutOn = deliveryBeautyTotal > 100;

  const savingsGoal = Number(plan.savingsGoal) || 0;
  const goalGap = savingsGoal > 0 ? remaining - savingsGoal : null;

  // Hard $100 ceiling on the "what if" cut regardless of the category's own total — ported
  // as-is from the website's own maxCut math, not a mobile-side bug.
  const maxCut = Math.min(100, Number(plan.variableExpenses[whatIfCategory]) || 0);
  const cut = Math.min(whatIfCut, maxCut);
  const newRemaining = remaining + cut;

  const maxBar = Math.max(totalFixed, ...BUDGET_CATEGORY_ORDER.map((k) => Number(plan.variableExpenses[k]) || 0), 1);

  const updateIncome = (id: string, patch: Partial<BudgetLineItem>) =>
    setBudgetPlan((p) => ({ ...p, incomeSources: p.incomeSources.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const updateFixed = (id: string, patch: Partial<BudgetLineItem>) =>
    setBudgetPlan((p) => ({ ...p, fixedExpenses: p.fixedExpenses.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const removeIncome = (id: string) => setBudgetPlan((p) => ({ ...p, incomeSources: p.incomeSources.filter((x) => x.id !== id) }));
  const removeFixed = (id: string) => setBudgetPlan((p) => ({ ...p, fixedExpenses: p.fixedExpenses.filter((x) => x.id !== id) }));
  const addIncome = () => setBudgetPlan((p) => ({ ...p, incomeSources: [...p.incomeSources, { id: `inc${Date.now()}`, label: 'New source', amount: '' as const }] }));
  const addFixed = () => setBudgetPlan((p) => ({ ...p, fixedExpenses: [...p.fixedExpenses, { id: `fix${Date.now()}`, label: 'New expense', amount: '' as const }] }));
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
        <Txt style={styles.cardTitle}>Variable Expenses</Txt>
        <Txt variant="lead" style={{ fontSize: 12 }}>
          Food delivery and beauty services add up faster than most students expect — see your monthly total below.
        </Txt>
        {BUDGET_CATEGORY_ORDER.map((key) => (
          <CategoryRow
            key={key}
            label={BUDGET_CATEGORY_LABELS[key]}
            value={plan.variableExpenses[key] ?? ''}
            onChangeText={(v) => setVariable(key, v)}
            callout={calloutOn && (key === 'foodDelivery' || key === 'beauty')}
          />
        ))}
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
              ? `On track — ${money(goalGap)}/mo beyond your ${money(savingsGoal)} goal`
              : `Cut about ${money(Math.abs(goalGap))}/mo to hit your ${money(savingsGoal)} goal`}
          </Txt>
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt style={styles.cardTitle}>Spending by Category</Txt>
        <BarRow label="Fixed Expenses" val={totalFixed} max={maxBar} tone="pink" />
        {BUDGET_CATEGORY_ORDER.map((key) => (
          <BarRow key={key} label={shortLabel(BUDGET_CATEGORY_LABELS[key])} val={Number(plan.variableExpenses[key]) || 0} max={maxBar} tone="green" />
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Collapsible title="What If?">
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {BUDGET_CATEGORY_ORDER.map((key) => (
              <Pressable key={key} onPress={() => { setWhatIfCategory(key); setWhatIfCut(0); }}>
                <Tag tone={whatIfCategory === key ? 'green' : 'lock'} style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
                  {shortLabel(BUDGET_CATEGORY_LABELS[key])}
                </Tag>
              </Pressable>
            ))}
          </View>
          {maxCut > 0 ? (
            <>
              <SliderRow label={`Cut ${shortLabel(BUDGET_CATEGORY_LABELS[whatIfCategory])} by`} value={cut} onChange={setWhatIfCut} min={0} max={maxCut} step={1} format={money} />
              <Txt variant="lead" style={{ fontSize: 12.5 }}>
                Cut {money(cut)} → {money(newRemaining)} remaining
                {savingsGoal > 0
                  ? (newRemaining >= savingsGoal ? ' — hits your goal' : `, ${money(Math.max(0, savingsGoal - newRemaining))} short of goal`)
                  : ''}
              </Txt>
            </>
          ) : (
            <Txt variant="lead" style={{ fontSize: 12.5 }}>Add an amount above to see what cutting it would save.</Txt>
          )}
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
  warningCard: { backgroundColor: colors.dangerBg, borderColor: '#F2CDCD' },
  resultCap: { fontFamily: font.bold, fontSize: 12, color: colors.muted5, letterSpacing: 0.3 },
  resultBig: { fontFamily: font.display, fontSize: 32, color: colors.greenDark },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.screen, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  compareLabel: { fontFamily: font.semi, fontSize: 12.5, color: colors.ink },
  compareVal: { fontFamily: font.extra, fontSize: 12.5, color: colors.ink },
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
    flex: 1, fontFamily: font.semi, fontSize: 14, color: colors.ink,
    backgroundColor: colors.screen, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.screen, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderOpt,
    paddingVertical: 9, paddingHorizontal: 10, gap: 2,
  },
  amountPrefix: { fontFamily: font.extra, fontSize: 14, color: colors.muted4 },
  amountInput: { flex: 1, fontFamily: font.extra, fontSize: 14, color: colors.ink, padding: 0 },
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
