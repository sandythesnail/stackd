import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Header, Txt, Card, Tag, Segmented, StackedAreaChart } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { computeCompoundGrowth, computeMinPaymentDebt, computeLoanMinPayment, computeLoanPayoff, SeriesPoint } from '@/simulators';

/** Adds a `zero` key alongside a debt/payoff series so StackedAreaChart can draw a single
 * area from zero up to `balance` — mirrors the website's `points.map(p => ({ ...p, zero: 0 }))`. */
const withZero = (points: SeriesPoint[]): SeriesPoint[] => points.map((p) => ({ ...p, zero: 0 }));

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

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

/** Screen 10 — Tools. Three real calculators ported from the website's Tools page
 * (Compound Interest, Loan Payoff, Budget 50/30/20), all with live math instead of a
 * static mock display. */
export default function Tools() {
  const { state, level, tierName } = useStore();
  const [tab, setTab] = useState(0);
  return (
    <Screen edges={['top']}>
      <Header level={level} name={tierName} coins={state.coins} diamonds={state.diamonds} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Txt variant="disp" style={{ fontSize: 23 }}>Tools</Txt>
        <Segmented options={['Budget', 'Loan Payoff', 'Compound Interest']} value={tab} onChange={setTab} />
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
  const [annualRatePct, setAnnualRatePct] = useState(8);
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
      <Card style={{ gap: 14 }}>
        <Txt style={styles.cardTitle}>Your Numbers</Txt>
        <SliderRow label="Starting amount" value={startingAmount} onChange={setStartingAmount} min={0} max={5000} step={50} format={money} />
        <SliderRow label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} min={0} max={1000} step={10} format={money} />
        <SliderRow label="Years" value={years} onChange={setYears} min={1} max={47} step={1} format={(v) => String(v)} />
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
        <SliderRow
          label="Annual interest rate" value={annualRatePct}
          onChange={(v) => { setAnnualRatePct(v); setRateMode('custom'); }}
          min={1} max={12} step={0.5} format={(v) => `${v}%`}
        />
        <Pressable onPress={() => setShowCompare((s) => !s)}>
          <Tag tone="lock" style={{ paddingVertical: 8, alignSelf: 'flex-start' }}>
            {showCompare ? 'Hide comparison ▴' : 'Compare: start at 18 vs. start at 28 →'}
          </Tag>
        </Pressable>
      </Card>

      {showCompare ? (
        <Card style={{ gap: 8 }}>
          <Txt style={styles.cardTitle}>Start at 18 vs. Start at 28</Txt>
          <Txt variant="lead" style={{ fontSize: 12.5 }}>
            Same {money(monthlyContribution)}/month, same {annualRatePct}% rate, both stop contributing at 65. A 10-year head start:
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
            The 10-year head start is worth {money(earlyFinal - lateFinal)} more by 65 — from the same monthly amount.
          </Txt>
        </Card>
      ) : null}

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>WHERE YOU&apos;LL LAND</Txt>
        <Txt style={styles.resultBig}>{money(final.balance)}</Txt>
        <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
          after {years} year{years === 1 ? '' : 's'} — you&apos;ll have put in {money(final.contributed)}, interest earned the rest: {money(final.balance - final.contributed)}
        </Txt>
        <StackedAreaChart points={points} baseKey="contributed" totalKey="balance" tone="growth" />
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.greenSoft }]} />
            <Txt style={styles.legendTxt}>What you put in</Txt>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.pinkBorder }]} />
            <Txt style={styles.legendTxt}>What interest earned</Txt>
          </View>
        </View>
        {doublingYears ? (
          <Txt variant="lead" style={styles.milestone}>
            📈 At {annualRatePct}%, your money roughly doubles every {doublingYears.toFixed(1)} years (Rule of 72).
          </Txt>
        ) : null}
        {milestone && milestonePoint ? (
          <Txt variant="lead" style={styles.milestone}>
            🎯 You&apos;ll cross {money(milestone)} around year {(milestonePoint.month / 12).toFixed(1)}.
          </Txt>
        ) : null}
      </Card>

      <Card style={styles.warningCard}>
        <Txt style={styles.resultCap}>⚠ CREDIT CARD WARNING</Txt>
        <Txt variant="lead" style={{ fontSize: 12 }}>
          A $1,000 balance at 24% APR, paying only the minimum (2% of balance or $25, whichever is more) every month:
        </Txt>
        <StackedAreaChart points={withZero(debtPoints)} baseKey="zero" totalKey="balance" tone="debt" />
        <Txt variant="lead" style={{ fontSize: 12.5 }}>
          {debtFinal.balance <= 0.5
            ? `Paid off after about ${debtYears.toFixed(1)} years — total interest paid: ${money(debtFinal.totalInterest)}, more than the original balance.`
            : `Still not paid off after 10 years — total interest paid so far: ${money(debtFinal.totalInterest)}, and ${money(debtFinal.balance)} of the balance remains.`}
        </Txt>
      </Card>
    </>
  );
}

const RATE_PRESETS = [
  { mode: 'subsidized', label: 'Fed. Subsidized', rate: 5.5 },
  { mode: 'unsubsidized', label: 'Fed. Unsubsidized', rate: 7 },
  { mode: 'private', label: 'Private', rate: 9 },
] as const;

function LoanPayoffPanel() {
  const [loanBalance, setLoanBalance] = useState(27000);
  const [annualRatePct, setAnnualRatePct] = useState(5.5);
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
      <Card style={{ gap: 14 }}>
        <Txt style={styles.cardTitle}>Your Loan</Txt>
        <SliderRow label="Loan balance" value={loanBalance} onChange={setLoanBalance} min={1000} max={100000} step={500} format={money} />
        <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
          {RATE_PRESETS.map((p) => (
            <Pressable key={p.mode} onPress={() => setAnnualRatePct(p.rate)}>
              <Tag tone={annualRatePct === p.rate ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>
                {p.label} ~{p.rate}%
              </Tag>
            </Pressable>
          ))}
        </View>
        <SliderRow label="Interest rate" value={annualRatePct} onChange={setAnnualRatePct} min={1} max={14} step={0.25} format={(v) => `${v}%`} />
        <SliderRow label="Term (years)" value={termYears} onChange={setTermYears} min={5} max={25} step={5} format={(v) => `${v}yr`} />
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt style={styles.cardTitle}>Monthly Take-Home Pay & Living Costs</Txt>
        <Txt variant="lead" style={{ fontSize: 12 }}>Uses take-home (net) pay, not gross salary.</Txt>
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
              paid off — total interest paid: {money(payoffFinal.totalInterest)}, total paid: {money(loanBalance + payoffFinal.totalInterest)}
            </Txt>
            <StackedAreaChart points={withZero(payoffPoints)} baseKey="zero" totalKey="balance" tone="debt" />
            <Txt variant="lead" style={styles.milestone}>
              💳 A {money(totalPayment)}/month payment clears a {money(loanBalance)} balance at {annualRatePct}% in {payoffYears.toFixed(1)} years.
            </Txt>
          </>
        ) : (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            A {money(totalPayment)}/month payment doesn&apos;t even cover this loan&apos;s interest — the balance would only grow. Raise the payment to see a payoff timeline.
          </Txt>
        )}
      </Card>

      <Card style={!canAffordMinimum ? [styles.resultCard, styles.warningCard] : styles.resultCard}>
        <Txt style={styles.resultCap}>{canAffordMinimum ? 'MINIMUM PAYMENT' : '⚠ BUDGET REALITY CHECK'}</Txt>
        <Txt style={styles.resultBig}>{money(minPayment)}/mo</Txt>
        {canAffordMinimum ? (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            After rent, food, other expenses, and the minimum loan payment, you have {money(Math.max(0, availableForLoan - minPayment))}/month left over.
          </Txt>
        ) : (
          <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
            After rent, food, and other expenses, you have {money(Math.max(0, availableForLoan))}/month left, but the minimum payment is {money(minPayment)} — you&apos;re {money(shortfall)} short.
          </Txt>
        )}
      </Card>

      {canAffordMinimum && maxExtra > 0 ? (
        <Card style={{ gap: 12 }}>
          <Txt style={styles.cardTitle}>Pay Extra With What&apos;s Left Over</Txt>
          <SliderRow label="Extra toward the loan" value={cappedExtra} onChange={setExtraPayment} min={0} max={maxExtra} step={5} format={money} />
          {cappedExtra > 0 && minOnlyFinal && withExtraFinal && minOnly && withExtra ? (
            <View style={{ gap: 6 }}>
              <CompareRow label="Minimum payments only" years={(minOnly.length - 1) / 12} interest={minOnlyFinal.totalInterest} />
              <CompareRow label={`With ${money(cappedExtra)} extra/month`} years={(withExtra.length - 1) / 12} interest={withExtraFinal.totalInterest} />
              <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 4 }}>
                That extra {money(cappedExtra)}/month pays this off {((minOnly.length - withExtra.length) / 12).toFixed(1)} years sooner and saves {money(minOnlyFinal.totalInterest - withExtraFinal.totalInterest)} in interest.
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

// Matches the website's BUDGET_CATEGORY_LABELS / BUDGET_CATEGORY_ORDER (app.js) exactly.
const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Groceries', diningOut: 'Dining Out', foodDelivery: 'Food Delivery',
  coffee: 'Coffee', clothing: 'Clothing / Thrift', beauty: 'Beauty / Personal Care',
  transportation: 'Transportation', entertainment: 'Entertainment', textbooks: 'Textbooks', gym: 'Gym',
};
const BUDGET_CATEGORY_ORDER = ['groceries', 'diningOut', 'foodDelivery', 'coffee', 'clothing', 'beauty', 'transportation', 'entertainment', 'textbooks', 'gym'];
const BUDGET_CATEGORY_DEFAULTS: Record<string, number> = {
  groceries: 220, diningOut: 90, foodDelivery: 60, coffee: 25, clothing: 40,
  beauty: 30, transportation: 70, entertainment: 40, textbooks: 20, gym: 20,
};

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
  const [monthlyIncome, setMonthlyIncome] = useState(1200);
  const [fixedExpenses, setFixedExpenses] = useState(700);
  const [variable, setVariable] = useState<Record<string, number>>(BUDGET_CATEGORY_DEFAULTS);
  const [savingsGoal, setSavingsGoal] = useState(150);
  const [whatIfCategory, setWhatIfCategory] = useState('foodDelivery');
  const [whatIfCut, setWhatIfCut] = useState(0);

  const setCategory = (key: string, v: number) => setVariable((prev) => ({ ...prev, [key]: v }));

  const totalVariable = BUDGET_CATEGORY_ORDER.reduce((s, k) => s + (variable[k] || 0), 0);
  const totalExpenses = fixedExpenses + totalVariable;
  const remaining = monthlyIncome - totalExpenses;
  const deliveryBeautyTotal = (variable.foodDelivery || 0) + (variable.beauty || 0);
  const overThreshold = deliveryBeautyTotal > 100;

  const goalGap = savingsGoal > 0 ? remaining - savingsGoal : null;

  const maxCut = Math.min(100, variable[whatIfCategory] || 0);
  const cut = Math.min(whatIfCut, maxCut);
  const newRemaining = remaining + cut;
  const maxBar = Math.max(fixedExpenses, ...BUDGET_CATEGORY_ORDER.map((k) => variable[k] || 0), 1);

  return (
    <>
      <Card style={{ gap: 12 }}>
        <Txt style={styles.cardTitle}>Monthly Income</Txt>
        <SliderRow label="Take-home pay" value={monthlyIncome} onChange={setMonthlyIncome} min={0} max={6000} step={25} format={money} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt style={styles.cardTitle}>Fixed Expenses</Txt>
        <SliderRow label="Rent & other fixed costs" value={fixedExpenses} onChange={setFixedExpenses} min={0} max={3000} step={25} format={money} />
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt style={styles.cardTitle}>Variable Expenses</Txt>
        <Txt variant="lead" style={{ fontSize: 12 }}>
          Food delivery and beauty services add up faster than most students expect — see your monthly total below.
        </Txt>
        {BUDGET_CATEGORY_ORDER.map((key) => (
          <SliderRow
            key={key}
            label={BUDGET_CATEGORY_LABELS[key]}
            value={variable[key] || 0}
            onChange={(v) => setCategory(key, v)}
            min={0} max={key === 'groceries' ? 600 : 300} step={5} format={money}
          />
        ))}
        <Txt variant="lead" style={[{ fontSize: 12.5 }, overThreshold && styles.overThresholdTxt]}>
          Food delivery + beauty: {money(deliveryBeautyTotal)}/month{overThreshold ? ' — that adds up fast.' : ''}
        </Txt>
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt style={styles.cardTitle}>Savings Goal</Txt>
        <SliderRow label="I want to save" value={savingsGoal} onChange={setSavingsGoal} min={0} max={1500} step={25} format={money} />
      </Card>

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>SUMMARY</Txt>
        <View style={{ width: '100%', gap: 6 }}>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Total income</Txt><Txt style={styles.compareVal}>{money(monthlyIncome)}</Txt></View>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Fixed expenses</Txt><Txt style={styles.compareVal}>{money(fixedExpenses)}</Txt></View>
          <View style={styles.summaryRow}><Txt style={styles.compareLabel}>Variable expenses</Txt><Txt style={styles.compareVal}>{money(totalVariable)}</Txt></View>
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Txt style={{ fontFamily: font.displayMed, fontSize: 14, color: remaining < 0 ? colors.pinkDark : colors.ink }}>Remaining balance</Txt>
            <Txt style={{ fontFamily: font.display, fontSize: 17, color: remaining < 0 ? colors.pinkDark : colors.greenDark }}>{money(remaining)}</Txt>
          </View>
        </View>
        {goalGap !== null ? (
          <Txt variant="lead" style={[{ fontSize: 12.5, textAlign: 'center' }, goalGap < 0 && styles.overThresholdTxt]}>
            {goalGap >= 0
              ? `On track — this leaves ${money(goalGap)}/month beyond your ${money(savingsGoal)} goal.`
              : `You'd need to cut about ${money(Math.abs(goalGap))}/month to hit your ${money(savingsGoal)} savings goal.`}
          </Txt>
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt style={styles.cardTitle}>Spending by Category</Txt>
        <BarRow label="Fixed Expenses" val={fixedExpenses} max={maxBar} tone="pink" />
        {BUDGET_CATEGORY_ORDER.map((key) => (
          <BarRow key={key} label={BUDGET_CATEGORY_LABELS[key]} val={variable[key] || 0} max={maxBar} tone="green" />
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt style={styles.cardTitle}>What If?</Txt>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {BUDGET_CATEGORY_ORDER.map((key) => (
            <Pressable key={key} onPress={() => { setWhatIfCategory(key); setWhatIfCut(0); }}>
              <Tag tone={whatIfCategory === key ? 'green' : 'lock'} style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
                {BUDGET_CATEGORY_LABELS[key]}
              </Tag>
            </Pressable>
          ))}
        </View>
        {maxCut > 0 ? (
          <>
            <SliderRow label={`Cut ${BUDGET_CATEGORY_LABELS[whatIfCategory]} by`} value={cut} onChange={setWhatIfCut} min={0} max={maxCut} step={1} format={money} />
            <Txt variant="lead" style={{ fontSize: 12.5 }}>
              Cut this by {money(cut)} → remaining balance becomes {money(newRemaining)}
              {savingsGoal > 0
                ? (newRemaining >= savingsGoal ? ' — enough to hit your savings goal.' : `, still ${money(Math.max(0, savingsGoal - newRemaining))} short of your goal.`)
                : '.'}
            </Txt>
          </>
        ) : (
          <Txt variant="lead" style={{ fontSize: 12.5 }}>Add a monthly amount for this category above to see what cutting it would save.</Txt>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 15 },
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
});
