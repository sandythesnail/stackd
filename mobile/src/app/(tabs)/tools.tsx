import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Header, Txt, Card, Tag, Segmented } from '@/components';
import { colors, font } from '@/theme';
import { useStore } from '@/store';
import { computeCompoundGrowth, computeLoanMinPayment, computeLoanPayoff } from '@/simulators';

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

function CompoundInterestPanel() {
  const [startingAmount, setStartingAmount] = useState(500);
  const [monthlyContribution, setMonthlyContribution] = useState(100);
  const [years, setYears] = useState(10);
  const [annualRatePct, setAnnualRatePct] = useState(8);
  const { balance, contributed, interestEarned } = computeCompoundGrowth({ startingAmount, monthlyContribution, annualRatePct, years });

  return (
    <>
      <Card style={{ gap: 14 }}>
        <Txt style={styles.cardTitle}>Your Numbers</Txt>
        <SliderRow label="Starting amount" value={startingAmount} onChange={setStartingAmount} min={0} max={5000} step={50} format={money} />
        <SliderRow label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} min={0} max={1000} step={10} format={money} />
        <SliderRow label="Years" value={years} onChange={setYears} min={1} max={47} step={1} format={(v) => String(v)} />
        <SliderRow label="Annual interest rate" value={annualRatePct} onChange={setAnnualRatePct} min={1} max={12} step={0.5} format={(v) => `${v}%`} />
      </Card>

      <Card style={styles.resultCard}>
        <Txt style={styles.resultCap}>YOU&apos;D HAVE</Txt>
        <Txt style={styles.resultBig}>{money(balance)}</Txt>
        <Txt variant="lead" style={{ fontSize: 13, textAlign: 'center' }}>
          You put in {money(contributed)} — {money(interestEarned)} of that is interest.
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

  const minOnly = computeLoanPayoff({ principal: loanBalance, annualRatePct, monthlyPayment: minPayment });
  const withExtra = cappedExtra > 0 ? computeLoanPayoff({ principal: loanBalance, annualRatePct, monthlyPayment: minPayment + cappedExtra }) : null;

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
          {cappedExtra > 0 && minOnly && withExtra ? (
            <View style={{ gap: 6 }}>
              <CompareRow label="Minimum payments only" years={minOnly.months / 12} interest={minOnly.totalInterest} />
              <CompareRow label={`With ${money(cappedExtra)} extra/month`} years={withExtra.months / 12} interest={withExtra.totalInterest} />
              <Txt variant="lead" style={{ fontSize: 12.5, marginTop: 4 }}>
                That extra {money(cappedExtra)}/month pays this off {((minOnly.months - withExtra.months) / 12).toFixed(1)} years sooner and saves {money(minOnly.totalInterest - withExtra.totalInterest)} in interest.
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

function BudgetPanel() {
  const [monthlyIncome, setMonthlyIncome] = useState(1200);
  const needs = monthlyIncome * 0.5;
  const wants = monthlyIncome * 0.3;
  const savings = monthlyIncome * 0.2;
  const BUDGET = [
    { label: 'Needs (50%)', amt: needs, pct: 0.5, tone: 'green' as const },
    { label: 'Wants (30%)', amt: wants, pct: 0.3, tone: 'pink' as const },
    { label: 'Savings (20%)', amt: savings, pct: 0.2, tone: 'green' as const },
  ];
  return (
    <>
      <Card style={{ gap: 12 }}>
        <SliderRow label="Monthly take-home pay" value={monthlyIncome} onChange={setMonthlyIncome} min={0} max={6000} step={25} format={money} />
        <Txt variant="lead" style={{ fontSize: 13 }}>The 50 / 30 / 20 rule splits every dollar into needs, wants, and savings.</Txt>
      </Card>
      <Card style={{ gap: 16 }}>
        {BUDGET.map((b) => (
          <View key={b.label} style={{ gap: 6 }}>
            <View style={styles.chartHead}>
              <Txt style={{ fontFamily: font.extra, fontSize: 13.5, color: colors.ink }}>{b.label}</Txt>
              <Txt style={{ fontFamily: font.display, fontSize: 15, color: colors.ink }}>{money(b.amt)}</Txt>
            </View>
            <View style={styles.track}>
              <LinearGradient
                colors={b.tone === 'pink' ? ['#F2A9BB', colors.pink] : [colors.greenBright, colors.green]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ width: `${b.pct * 100}%`, height: '100%', borderRadius: 8 }}
              />
            </View>
          </View>
        ))}
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
});
