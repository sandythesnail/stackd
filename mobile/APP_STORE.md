# Shipping Stacked to the App Store

Everything Apple asks for, with the answers already worked out. Written against the real
codebase — the App Privacy answers below were derived by reading what the app actually stores,
not from a template.

---

## 1. Accounts and access

The app is published under **the Apple Developer account that holds the membership** ($99/yr).
Whoever holds it is the legal publisher: their name is the seller on the listing, they own the
app record, and Apple holds them responsible for it.

Ask the account holder for both of these:

**A. App Store Connect API key** (so builds and submissions need no password or 2FA round-trip)
App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys →
generate with the **App Manager** role. You get:
- the `.p8` file — **downloadable exactly once**, keep it safe and out of git
- the **Key ID**
- the **Issuer ID**

**B. A team invitation** (so you can edit the listing yourself)
App Store Connect → Users and Access → invite your Apple ID → role **App Manager**.

---

## 2. Identity, already configured

| | value |
|---|---|
| Display name | `Stacked` |
| Slug | `stackd` |
| iOS bundle identifier | `app.trystacked.mobile` |
| Android package | `app.trystacked.mobile` |

The bundle identifier is **permanent**. Changing it after release makes a different app that
existing users would have to install separately.

---

## 3. Build and submit

```bash
cd mobile
eas login                     # your own Expo account
npx eas-cli@latest init       # links the EAS project (writes projectId into app.json)
```

`eas.json` is already committed with `development`, `preview` and `production` profiles, and
`appVersionSource: "remote"` so build numbers increment on EAS rather than in git.

### Environment variables — do this before the first build

Cloud builds do **not** see your local `.env`. Without these three the app builds and runs, but
`env.authEnabled` is false, so it ships with no sign-in and no cross-device sync — and it looks
fine when you test locally, which is what makes this easy to miss.

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_... --environment production
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL          --value https://....supabase.co --environment production
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY     --value sb_publishable_... --environment production
```

All three are publishable client keys (hence `EXPO_PUBLIC_`), so they are meant to be in the
bundle. The Supabase **service role** key is not one of these and must never be added.

### Credentials, then TestFlight, then the store

```bash
npx eas-cli@latest credentials                          # attach the Apple team, generate signing
npx eas-cli@latest build -p ios --profile production
npx testflight                                          # test on a real device FIRST
npx eas-cli@latest build -p ios --profile production --submit
```

Fill `submit.production.ios.ascAppId` in `eas.json` once the app record exists in App Store
Connect (it is the numeric Apple ID on the app's page).

---

## 4. App Privacy answers

Apple asks this as a questionnaire in App Store Connect (App Privacy → Get Started). These are
the correct answers for this codebase. **Answer honestly** — a mismatch between this and what
the binary does is a rejection, and a later one is worse than an early one.

### Data collected

| Apple category | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| **Contact Info → Email Address** | Yes | Yes | No | App Functionality (sign-in) |
| **Contact Info → Name** | Only via Google/Microsoft SSO | Yes | No | App Functionality |
| **User Content → Other User Content** | Yes | Yes | No | App Functionality (budget figures, feedback messages) |
| **Identifiers → User ID** | Yes | Yes | No | App Functionality (Clerk user id keys every row) |
| **Usage Data → Product Interaction** | Yes | Yes | No | App Functionality (lessons completed, scores, streak — this is the product, not analytics) |

### Everything else: **not collected**

Location · Contacts · Photos/Video · Audio · Health & Fitness · Financial Info (payment or bank
data) · Browsing History · Search History · Sensitive Info · Device ID · Advertising Data ·
Diagnostics · Purchases.

### Three answers people get wrong here

- **Financial Info → No.** The Budget tool holds numbers the student types in for their own
  planning. It connects to no bank, asks for no account or card number, and takes no payments.
  It is User Content, not Financial Info.
- **Tracking → No, for everything.** "Tracking" in Apple's sense means linking data to
  third-party data for advertising or sharing with a data broker. Stacked has no ad SDK, no
  analytics SDK and no data broker. It therefore must **not** request App Tracking Transparency
  permission — asking for a permission you have no use for is itself a rejection.
- **Product Interaction → Yes, and that is fine.** Progress tracking is the point of the app.
  Declaring it costs nothing; failing to declare it is a misrepresentation.

---

## 5. Account deletion — required

App Review Guideline **5.1.1(v)**: an app offering account creation must offer account deletion
from inside the app. Not an email address, not a web form.

Implemented at **Settings → Delete my account** (`DeleteAccountRow` in
`src/app/(tabs)/settings.tsx`). It deletes the progress row, feedback and referral records, then
deletes the Clerk login — rows first, because once the login is gone no credential can reach
those rows again.

**Two things must be switched on for it to actually work:**

1. **Run `supabase/account-deletion.sql`** in the Supabase SQL editor. Row-level security denies
   by default and the existing policies only granted SELECT and INSERT. Without this the deletes
   are not errors — they match zero rows and report success, so the app would honestly report a
   deletion that never happened.
2. **Enable self-deletion in Clerk**: Dashboard → Configure → User & Authentication → User
   profile → "Allow users to delete their accounts". If it is off, `user.delete()` throws and the
   app shows the error rather than pretending.

Verify both on a throwaway account before submitting. A reviewer will test this.

---

## 6. Listing requirements

- **Privacy policy URL**: `https://trystacked.app/privacy.html` — required, and must be live
  before submission. Served from `privacy.html` at the repo root.
- **Screenshots**: 6.7" iPhone is mandatory. Also supply 6.5" if you have it.
- **Age rating** questionnaire. Stacked is educational with no objectionable content; it is not
  directed at children under 13 (see the policy's Children section).
- **Support URL**, description, keywords, category (Education).
- **Demo account in the review notes.** The app is behind a sign-in wall, so a reviewer cannot
  get past the signup screen without one. Create a real account, put the email and password in
  App Store Connect → App Review Information, and do not delete it while the app is in review.
  Omitting this is the single most common rejection for a gated app.

---

## 7. Before the first submission

- [ ] `supabase/account-deletion.sql` run against the production project
- [ ] Clerk self-deletion enabled
- [ ] Account deletion tested end to end on a throwaway account
- [ ] `https://trystacked.app/privacy.html` live
- [ ] Three `EXPO_PUBLIC_*` env vars set on EAS production
- [ ] Signed in on a TestFlight build — sign-in and cross-device sync actually work
- [ ] `stackd://sso-callback` in the Clerk instance's allowed redirect URLs (`npm run check:sso`)
- [ ] Demo account created and entered in App Review Information
- [ ] `ascAppId` filled into `eas.json`
