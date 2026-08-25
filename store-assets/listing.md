# App Store listing copy

Paste each field into App Store Connect. Character limits are Apple's, and the counts below
are the actual length of the text as written.

---

## App Name (30 max)

```
Stacked
```
*(7)*

---

## Subtitle (30 max)

```
Money skills for students
```
*(25)*

Alternatives if you want a different angle:
- `Learn money before you need it` (30)
- `Financial literacy, gamified` (28)
- `Real money skills for college` (29)

---

## Promotional Text (170 max)

Shows above the description, and can be changed any time without submitting an update. Good
place for news later.

```
Free, no ads, built by a student who couldn't find a money app that explained anything. Eleven modules, ninety-nine lessons, and a pig who reacts when you get it right.
```
*(168)*

---

## Description (4000 max)

```
Nobody really teaches you how to handle money. You get a first paycheck that is smaller than you expected, a financial aid offer full of words nobody defined, and a vague sense that you should be saving something. Then you figure it out by getting it wrong.

Stacked is the app I wanted when that happened to me.

It is eleven modules and ninety-nine short lessons on the money situations that actually come up in college. Not compound interest in the abstract. Your first pay stub, and where the missing fifty-nine dollars went. A meal plan you are not using. A credit card offer at a football game. A subscription you forgot about in March.

WHAT YOU ACTUALLY DO

Lessons are short and you tap through them. A scenario sets up a real situation, Hammy the pig talks you through what is happening, and then you make the call yourself. You pick an answer, spot the red flag in a job posting, decide whether to take the loan. You find out straight away whether it worked, and why.

Getting things right earns XP and coins. Coins buy hats for Hammy and furniture for your room, which is a ridiculous reason to learn about index funds and it works anyway.

WHAT IS IN IT

Earning, spending, saving, investing, credit, risk, loans, taxes, consumer psychology, career and salary, and scams. Every module ends with a real life sub-quest that walks you through actually doing the thing, like setting up direct deposit or opening a high-yield savings account.

There are calculators too. A budget you can keep, a loan payoff estimator, and a compound interest tool, all of which remember what you typed.

HOW IT IS BUILT

Free. No ads. No in-app purchases. Nothing is locked behind anything.

Every fact has a source, and the sources are listed in the app so you can check them.

Your progress syncs, so you can do a lesson on your phone at the bus stop and pick it up on a laptop later.

A NOTE ON WHAT THIS IS NOT

Stacked teaches concepts. It is not financial advice, it does not connect to your bank, and it never asks for account or card details. The budget tool holds numbers you type in yourself, for your own planning, and nothing else.

Start with one lesson. It takes about five minutes.
```
*(2,101)*

---

## Keywords (100 max, comma separated, no spaces)

Do not repeat words already in the name or subtitle. Apple indexes those separately, so
repeating them wastes characters.

```
budget,saving,invest,credit,loans,taxes,college,finance,literacy,quiz,scam,paycheck,fafsa
```
*(88)*

---

## URLs

| Field | Value |
|---|---|
| Support URL | `https://trystacked.app/support.html` |
| Marketing URL | `https://trystacked.app` |
| Privacy Policy URL | `https://trystacked.app/privacy.html` |

Support URL is required. It has to be a page a person can actually get help from, so make sure
the contact address is visible on the homepage or add a small support section.

---

## Category

- Primary: **Education**
- Secondary: **Finance**

Education first is deliberate. Finance as primary puts you against banking apps, and it invites
reviewers to look at you as a financial services product, which brings a stricter read.

---

## Age rating answers

Answer the questionnaire in App Store Connect. For this app:

| Question | Answer |
|---|---|
| Violence (cartoon, realistic, prolonged) | None |
| Sexual content or nudity | None |
| Profanity or crude humor | None |
| Alcohol, tobacco, drug use or references | None |
| Mature or suggestive themes | None |
| Horror or fear themes | None |
| Medical or treatment information | None |
| Gambling (real money) | No |
| Contests | No |
| Unrestricted web access | No |
| User generated content | No |

Expected result: **4+**

### Mystery boxes — already handled, not a decision left to make

The shop sells mystery boxes for coins and diamonds you earn by playing. Apple asks about
"Simulated Gambling", and loot boxes have drawn scrutiny, but two things are already true of
this app and both matter:

- **No real money is involved anywhere.** The odds-disclosure rule in Guideline 3.1.1 is about
  loot boxes bought with real money; Stacked has no in-app purchases at all.
- **The odds are already shown.** Every mystery-linked item in the shop displays its rarity and
  exact drop percentage next to the price (`shop.tsx`'s `mysteryDropChance` /
  `RARITY_LABEL` — a line like "Rare · 12%" sits on the card itself, not buried in a menu).
  That's the stronger of the two options this file used to describe as a choice to make before
  submitting — it's built, not pending.

Answer "None" for Simulated Gambling with confidence.

---

## App Review Information

**This is the field people forget, and it is the most common rejection for an app behind a
login.** A reviewer cannot get past your sign-in screen without an account.

```
Sign-in required: yes

Demo account
Email:    (create a real account and put it here)
Password: (put it here)

Notes for the reviewer:
Stacked is a financial literacy app for college students. All content is free and
nothing is locked.

The demo account above has progress on it so you can see completed lessons and the
progress screens. To try a lesson from the start, open the Modules tab, pick any
module, and choose a lesson that is not yet marked done.

Account deletion is at Settings, then "Delete my account". It removes the login and
all saved progress immediately.

The app takes no payments, has no ads, and does not connect to any financial
institution. The Budget tool only stores figures the user types in themselves.
```

Create that account before you submit, do a couple of lessons on it, and do not delete it while
the app is in review.

---

## What's New (for later updates, 4000 max)

First release, so this is not needed yet. When you do update, write what changed in plain words.
"Bug fixes and performance improvements" is true of everything and tells nobody anything.
