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
      <Card style={{ gap: 13 }}>
        <Txt style={styles.cardTitle}>Your Numbers</Txt>
        <SliderRow label="Starting amount" value={startingAmount} onChange={setStartingAmount} min={0} max={5000} step={50} format={money} />
        <SliderRow label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} min={0} max={1000} step={10} format={money} />
        <SliderRow label="Years" value={years} onChange={setYears} min={1} max={47} step={1} format={(v) => String(v)} />

        <View style={{ gap: 8 }}>
          <Txt style={styles.sliderLabel}>Where&apos;s the money growing?</Txt>
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
          ) : null}
        </View>

        <Pressable onPress={() => setShowCompare((s) => !s)}>
          <Tag tone="lock" style={{ paddingVertical: 8, alignSelf: 'flex-start' }}>
            {showCompare ? 'Hide ▴' : 'Compare: 18 vs. 28 →'}
          </Tag>
        </Pressable>
      </Card>

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

const TERM_PRESETS = [5, 10, 15, 20, 25];

function LoanPayoffPanel() {
  const [loanBalance, setLoanBalance] = useState(27000);
  const [annualRatePct, setAnnualRatePct] = useState(5.5);
  const [termYears, setTermYears] = useState(10);
  const [monthlyIncome, setMonthlyIncome] = useState(3200);
  const [livingExpenses, setLivingExpenses] = useState(1800);
  const [extraPayment, setExtraPayment] = useState(0);

  const minPayment = computeLoanMinPayment({ principal: loanBalance, annualRatePct, termYears });
  const essential = livingExpenses;
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
      <Card style={{ gap: 13 }}>
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
        <View style={{ gap: 8 }}>
          <Txt style={styles.sliderLabel}>Term</Txt>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            {TERM_PRESETS.map((yr) => (
              <Pressable key={yr} onPress={() => setTermYears(yr)}>
                <Tag tone={termYears === yr ? 'green' : 'lock'} style={{ paddingVertical: 6 }}>{yr}yr</Tag>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 13 }}>
        <Txt style={styles.cardTitle}>Take-Home Pay & Living Costs</Txt>
        <SliderRow label="Monthly take-home pay" value={monthlyIncome} onChange={setMonthlyIncome} min={1500} max={7000} step={50} format={money} />
        <SliderRow label="Living expenses (rent, food, everything else)" value={livingExpenses} onChange={setLivingExpenses} min={0} max={4000} step={25} format={money} />
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

// Grouped from the website's 10-category BUDGET_CATEGORY_LABELS (app.js) into 5 broader
// buckets — mobile's audience is first-time budgeters, and 10 individual sliders was more
// granularity than "basic and easy to understand" calls for. Not synced anywhere (this
// panel's state is local-only, see BudgetPanel), so the grouping is mobile-only.
const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Drink',
  shopping: 'Shopping & Personal Care',
  transportation: 'Transportation',
  funFitness: 'Entertainment & Fitness',
  textbooks: 'Textbooks',
};
const BUDGET_CATEGORY_ORDER = ['food', 'shopping', 'transportation', 'funFitness', 'textbooks'];
const BUDGET_CATEGORY_DEFAULTS: Record<string, number> = {
  food: 395, shopping: 70, transportation: 70, funFitness: 60, textbooks: 20,
};
const BUDGET_CATEGORY_MAX: Record<string, number> = {
  food: 900, shopping: 400, transportation: 400, funFitness: 400, textbooks: 300,
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
  const [whatIfCategory, setWhatIfCategory] = useState('food');
  const [whatIfCut, setWhatIfCut] = useState(0);

  const setCategory = (key: string, v: number) => setVariable((prev) => ({ ...prev, [key]: v }));

  const totalVariable = BUDGET_CATEGORY_ORDER.reduce((s, k) => s + (variable[k] || 0), 0);
  const totalExpenses = fixedExpenses + totalVariable;
  const remaining = monthlyIncome - totalExpenses;

  const goalGap = savingsGoal > 0 ? remaining - savingsGoal : null;

  const maxCut = Math.min(100, variable[whatIfCategory] || 0);
  const cut = Math.min(whatIfCut, maxCut);
  const newRemaining = remaining + cut;
  const maxBar = Math.max(fixedExpenses, ...BUDGET_CATEGORY_ORDER.map((k) => variable[k] || 0), 1);

  return (
    <>
      <Card style={{ gap: 13 }}>
        <SliderRow label="Take-home pay" value={monthlyIncome} onChange={setMonthlyIncome} min={0} max={6000} step={25} format={money} />
        <SliderRow label="Rent & fixed costs" value={fixedExpenses} onChange={setFixedExpenses} min={0} max={3000} step={25} format={money} />
        <SliderRow label="Savings goal" value={savingsGoal} onChange={setSavingsGoal} min={0} max={1500} step={25} format={money} />
      </Card>

      <Card style={{ gap: 13 }}>
        <Collapsible title={`Everyday Spending (${money(totalVariable)}/mo)`}>
          {BUDGET_CATEGORY_ORDER.map((key) => (
            <SliderRow
              key={key}
              label={BUDGET_CATEGORY_LABELS[key]}
              value={variable[key] || 0}
              onChange={(v) => setCategory(key, v)}
              min={0} max={BUDGET_CATEGORY_MAX[key]} step={5} format={money}
            />
          ))}
        </Collapsible>
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
              ? `On track — ${money(goalGap)}/mo beyond your ${money(savingsGoal)} goal`
              : `Cut about ${money(Math.abs(goalGap))}/mo to hit your ${money(savingsGoal)} goal`}
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
        <Collapsible title="What If?">
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
  content: { paddingHorizontal: 22, paddingBottom: 28, gap: 12 },
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
});
