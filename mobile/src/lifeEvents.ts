/** Ported from the website's LIFE_EVENTS / LIFE_EVENT_UNLOCKS (app.js) — id/tag/title/
 * scenario/choices/result text match exactly. `effect` (savings/checking/creditScore) isn't
 * applied here since the mobile app has no financial-simulation state to mutate yet; only
 * `coinDelta` (which maps onto the real coins the app does track) actually changes anything. */
export type LifeEventChoice = {
  id: string;
  label: string;
  coinDelta?: number;
  result: string;
};

export type LifeEvent = {
  id: string;
  tag: string;
  title: string;
  scenario: string;
  choices: LifeEventChoice[];
};

/** Ambient random life events — can pop up after any lesson (mirrors the website's
 * maybeTriggerAmbientLifeEvent, which rolls between quiz questions). */
export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'car_repair',
    tag: 'Uh oh!',
    title: "The Car Won't Start",
    scenario: "It's 7:45am and you have an 8am final. Your car won't start. The mechanic says it's the alternator: $380, and they can have it done by tomorrow if you say yes right now.",
    choices: [
      { id: 'a', label: 'Pay it from savings', result: 'You cover it in full. Your savings takes a hit, but you walk away with zero debt and a working car.' },
      { id: 'b', label: "Put it on a credit card you're still paying off", result: 'The card absorbs it today. If you only pay the minimum, this $380 repair could quietly cost you $500+ by the time it\'s paid off.' },
      { id: 'c', label: 'Ask a parent to cover it, pay them back over time', result: 'No interest, no credit hit, but you now owe someone who trusts you. Worth protecting that.' },
    ],
  },
  {
    id: 'roommate_ghosted',
    tag: 'Life happens...',
    title: 'Your Roommate Stopped Paying Rent',
    scenario: 'Your name is on the lease with a roommate. This month, they said they\'d "get you back" and never paid their $450 half. Rent is due in 2 days.',
    choices: [
      { id: 'a', label: 'Cover their half from your emergency savings', result: "You avoid a late fee and a landlord conversation, but now you're the one owed money, and collecting from a friend is its own project." },
      { id: 'b', label: 'Pay only your half and let the landlord chase them', result: 'Depending on your lease, a missed partial payment can still show up as a late payment on the whole unit, including your name.' },
      { id: 'c', label: "Pay your half, ask for a written payment plan on theirs", result: 'You keep the lease current and start a paper trail. Get any repayment agreement in writing, even a text.' },
    ],
  },
  {
    id: 'medical_bill',
    tag: 'Something unexpected happened!',
    title: "A Bill You Didn't See Coming",
    scenario: 'You went to urgent care for what turned out to be nothing serious. Three weeks later, a bill for $210 shows up. Your insurance covered less than you expected.',
    choices: [
      { id: 'a', label: 'Pay it in full right away', result: 'Handled. One less thing hanging over you, and no risk of it going to collections.' },
      { id: 'b', label: "Ignore it and deal with it later", result: 'Unpaid medical bills can go to collections faster than people expect, and a collections account can knock a credit score down hard for years.' },
      { id: 'c', label: 'Call the billing office and ask for a payment plan', result: 'Most providers have an interest-free payment plan, but almost nobody asks. A 5-minute call turns $210 into $35/month.' },
    ],
  },
];

/** Guaranteed one-time event unlocked by mastering a specific module — keyed by module id. */
export const LIFE_EVENT_UNLOCKS: Record<string, LifeEvent> = {
  scams: {
    id: 'phishing_text_test',
    tag: 'Uh oh!',
    title: 'A Text From "Financial Aid"',
    scenario: 'You get a text: "Your financial aid disbursement is on hold. Verify your bank account within 24 hours: studentaid-verify.net/login" You just finished the Scams module. This one\'s on you.',
    choices: [
      { id: 'a', label: 'Click the link and check it out', result: "That wasn't studentaid.gov. It was a lookalike domain. Entering your bank login handed it straight to a scammer. This is exactly the pattern you just learned to spot." },
      { id: 'b', label: 'Ignore it and check your real aid portal directly', coinDelta: 15, result: 'Exactly right. You went straight to the source instead of trusting the link. Real disbursement holds show up in your official portal, never a text with a countdown.' },
      { id: 'c', label: 'Report it as phishing and delete', coinDelta: 20, result: "Even better. Reporting it helps your school's IT/security team warn other students before they fall for the same message." },
    ],
  },
};

export const LIFE_EVENT_CHANCE = 0.5;
export const LIFE_EVENT_COOLDOWN_SESSIONS = 2;
