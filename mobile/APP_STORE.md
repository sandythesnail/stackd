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
| **Contact Info → Name** | Only via Apple/Google/Microsoft SSO | Yes | No | App Functionality |
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

One consequence of adding Sign in with Apple (section 7): a student who chooses "Hide My Email"
signs up with an `@privaterelay.appleid.com` address. Nothing in the app needs to change — it is
still just the email on the account — but it is a real address that forwards, so don't treat one
as junk if it turns up in feedback or support.

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
- **Support URL**: `https://trystacked.app/support.html` — also required. Served from
  `support.html` at the repo root.
- **Terms of Use**: `https://trystacked.app/terms.html`. Not separately required by Apple
  (the standard EULA applies by default), but the signup screen asks students to agree to it,
  so it has to exist and be reachable — see the note below.
- **Screenshots**: 6.7"/6.9" iPhone is mandatory — `store-assets/screenshots-6.7/` holds seven
  at 1290×2796, which is the accepted size for that slot. Also supply 6.5" if you have it.
- **Age rating** questionnaire. Stacked is educational with no objectionable content; it is not
  directed at children under 13 (see the policy's Children section).
- Description, keywords, category (Education).

### The legal pages must survive the viewport redirect

`m-redirect.js` bounces any phone or narrow viewport off the vanilla site and into the app at
`/m/`. That applied to `privacy.html` too, so the Privacy Policy URL on the listing — tapped by
a reviewer, on an iPhone — replaced itself with the app before a word of the policy rendered.
The same broke Settings' "Read the full privacy policy" link and signup's Terms link, on the
device most likely to follow them.

`isLegalPage()` in `m-redirect.js` now exempts `/privacy.html`, `/terms.html` and
`/support.html` (and their extensionless forms), the same way the shared Clerk auth pages are
exempt. **If a legal page is ever added, add it there too** — otherwise it is unreachable from
a phone and nothing in the build will tell you.
- **Demo account in the review notes.** The app is behind a sign-in wall, so a reviewer cannot
  get past the signup screen without one. Create a real account, put the email and password in
  App Store Connect → App Review Information, and do not delete it while the app is in review.
  Omitting this is the single most common rejection for a gated app.

---

## 7. Guideline 4.8 — Sign in with Apple

The app offers Google and Microsoft SSO. Guideline 4.8 says an app that uses a third-party
login service to set up the user's primary account must **also** offer a privacy-preserving
equivalent, and Sign in with Apple is the one Apple names. Google-and-Microsoft-without-Apple
is the classic 4.8 rejection, and fixing it after the fact costs a rebuild and a resubmit.

The app side is done: `oauth_apple` is the first entry in `PROVIDERS` in `src/lib/socialAuth.tsx`,
above the other two (Apple asks for equal prominence), using the same browser round-trip. It
deliberately does **not** send `oidcPrompt` — Apple's authorize endpoint doesn't document
`prompt` and an unrecognised parameter risks an `invalid_request` bounce.

**Apple is now enabled on the Clerk instance, and Sign in with Apple still does not work —
on the phone or on the website.** The connection exists; the problem has moved one hop
further out, to Apple. As of 2026-09-02:

```
$ npm run check:sso                 # mobile: does Clerk hand out a provider URL?
    ✓ oauth_apple       enabled
    ✓ oauth_google      enabled
    ✓ oauth_microsoft   enabled

$ npm run check:sso                 # repo root: does the PROVIDER accept the client?
    ✗ oauth_apple       appleid.apple.com refused the client: invalid_client
    ✓ oauth_google      accounts.google.com accepts the client (asks which account)
    ✓ oauth_microsoft   login.microsoftonline.com accepts the client (asks which account)
```

Those are two different checks and the gap between them is the whole bug. This section's own
check (`mobile/scripts/check-sso-redirects.js`) asks Clerk whether it will start the flow, and
Clerk says yes: it produces a perfectly well-formed authorize URL for
`client_id=app.trystacked.signin`. Nobody was following that URL. Apple answers it with
`invalid_client` — byte-identical to what it answers for a client id that was never registered
at all, which is how it was checked.

`invalid_client` from `appleid.apple.com/auth/authorize` means one of three things, and Apple
reports all three the same way:

- the **Services ID** does not exist, or Clerk was given the App ID (the bundle identifier)
  where it wanted a Services ID — a common mix-up, and one that can leave native sign-in
  working while every web sign-in fails;
- the Services ID exists but is not **enabled for Sign in with Apple**;
- its **Return URL** is not exactly `https://clerk.trystacked.app/v1/oauth_callback`.

Fixing it needs the Apple Developer account, and no change in this repo can substitute:

1. Apple Developer → Certificates, Identifiers & Profiles → **Identifiers** → the **Services
   ID** (this is the OAuth client id, separate from the bundle identifier). Confirm it is
   `app.trystacked.signin`, that *Sign in with Apple* is ticked, and open **Configure**:
   the domain `clerk.trystacked.app` must be listed, and the Return URL must be exactly
   `https://clerk.trystacked.app/v1/oauth_callback`.
2. **Keys** → the key with *Sign in with Apple* enabled. The `.p8` downloads **once**; if it
   was lost, make a new key rather than guessing.
3. Clerk Dashboard → SSO Connections → **Apple** → re-paste the Team ID, Services ID, Key ID
   and the `.p8`.
4. `npm run check:sso` **from the repo root** — that is the one that asks Apple. The mobile
   one only asks Clerk, and will keep passing whether or not this is fixed.

Test the Apple button on a real device before submitting. Until step 3 is done the button is
there and fails, which is worse than not shipping it.

**Why a browser round-trip instead of the native `AuthenticationServices` button:** this app has
no other native code needing an Xcode-level rewrite for auth, and the browser flow is Apple's
own officially-supported OAuth path for exactly this case (it's what non-Apple-platform and
web integrations use, and Clerk implements it the same way for every provider so there's one
code path instead of a special case for Apple). It really is Apple's identity system underneath
— same account, same Face ID/Touch ID prompt if the device is signed in to iCloud, same
`appleid.com` domain. The one thing worth confirming on a real device once Clerk is configured:
that it *feels* native (Face ID sheet, not a login form) — if it ever shows Apple's website
asking for a typed password, that means the device isn't signed into an Apple ID, not that the
integration is wrong.

---

## 8. Before the first submission

**Supabase / Clerk (nothing in the repo can do these for you)**
- [ ] `supabase/account-deletion.sql` run against the production project
- [x] Clerk self-deletion enabled (Configure → User & Authentication → User profile) —
      verified 2026-08-31: the instance reports `actions.delete_self: true`. This one is done;
      the SQL above still is not, and it is the half that fails silently.
- [ ] Account deletion tested end to end on a throwaway account — and the row confirmed **gone
      in the Supabase table editor**, not just the success message in the app. Without the SQL
      above the delete matches zero rows and reports success, so the UI cannot tell you.
- [ ] Apple configured as an SSO connection on Clerk (section 7) and tested on a device —
      **still outstanding, and it is the one thing blocking submission** (verified 2026-08-31)
- [x] `stackd://` in the Clerk instance's allowed redirect URLs (`npm run check:sso`) —
      verified 2026-08-31 for Google and Microsoft; Apple cannot be redirect-checked until the
      connection above exists, so re-run `check:sso` after adding it
- [ ] Password reset tested — Settings is not the only way back in; `(onboarding)/reset-password`
      is what a locked-out reviewer needs

**Deploy**
- [x] `https://trystacked.app/privacy.html`, `/terms.html` and `/support.html` all live —
      all three verified 200 on 2026-08-31, and `isLegalPage()` in `m-redirect.js` exempts all
      three. Still worth one look **on a real phone** (see section 6): a 200 proves the page is
      served, not that the redirect left it on screen.
- [ ] Three `EXPO_PUBLIC_*` env vars set on EAS production

**App Store Connect**
- [ ] App name availability checked — "Stacked" must be unique across the whole store; reserve
      it early, before the listing depends on it
- [ ] Demo account created and entered in App Review Information
- [ ] `ascAppId` filled into `eas.json`
- [ ] Signed in on a TestFlight build — sign-in and cross-device sync actually work

**Already handled in `app.json`, listed so a future change doesn't quietly undo them**
- [x] `expo-audio` configured with `enableBackgroundPlayback: false` and `microphonePermission:
      false`. The defaults are both ON, which put `UIBackgroundModes: ["audio"]` and an unused
      microphone purpose string in Info.plist. The app plays two short sound effects; declaring
      background audio without playing audio in the background is a **2.5.4 rejection**.
- [x] `ITSAppUsesNonExemptEncryption: false` in `ios.infoPlist`. Correct (HTTPS only), and
      without it every build waits in App Store Connect for the export-compliance question.
- [x] Splash image is Hammy, not the Expo logo it shipped as.
- [x] `usesAppleSignIn: true` under `ios`. Adds the `com.apple.developer.applesignin`
      entitlement the build needs now that Apple is one of the SSO providers (section 7) —
      independent of Clerk's own configuration, and needed regardless of which Apple API a
      provider's SDK uses under the hood.
- [x] `expo-secure-store` configured with `faceIDPermission: false`. The plugin's default adds
      `NSFaceIDUsageDescription` unconditionally; the token cache (`lib/tokenCache.ts`) never
      requests biometric-protected storage, so the string described a capability the app
      doesn't use. Lower severity than the audio permissions above — Face ID access only
      prompts the user if the code actually asks for it, which it doesn't — but the same class
      of "declared, unused" mismatch, and free to remove.

---

## 9. Code-level audit — what was checked against the guidelines

Run on 2026-08-31 against the working tree. These are the guideline-facing things that live in
the code rather than in App Store Connect, so a future change can break one without anybody
touching the listing. Everything here passed; it is recorded so the next change can be checked
against it rather than re-derived.

| Guideline | What it requires | State |
|---|---|---|
| **2.3.1** hidden features | No dormant or undisclosed functionality | Pass — no remote config, no feature flags gating undisclosed behaviour |
| **2.5.4** background modes | Don't declare what you don't use | Pass — `expo-audio` background playback off, no `UIBackgroundModes` |
| **3.1.1** in-app purchase | Digital goods sold only through IAP | N/A — no IAP, no payments, no external purchase links. Shop currency is earned in-app only |
| **3.1.1** loot boxes | Odds disclosed before purchase | Pass — `shop.tsx` renders `RARITY_LABEL · mysteryDropChance%` on the item card itself |
| **4.8** Sign in with Apple | Required alongside third-party login | **Code passes, config does not.** Apple is first in `PROVIDERS`; the Clerk connection is missing (section 7) |
| **5.1.1(i)** data minimisation | Don't demand data you don't need | Pass — sign-up takes email + password. Username is derived, never asked for (`clerkSignUp.ts`) |
| **5.1.1(v)** account deletion | Deletable from inside the app | Code passes (`DeleteAccountRow`); needs `account-deletion.sql` run to actually delete rows |
| **5.1.2** tracking / ATT | Don't request ATT you don't use | Pass — no ad SDK, no analytics SDK, no `NSUserTrackingUsageDescription`, no IDFA reference |
| **5.1.5** permissions | Purpose strings only for used capabilities | Pass — no camera, location, contacts, photos, mic or Face ID strings requested |
| **Assets** | 1024×1024 icon, no alpha | Pass — `icon.png` is 1024×1024, PNG colour type 2 (RGB, no alpha channel). An alpha channel here is an automatic upload rejection |
| **Assets** | 6.7"/6.9" iPhone screenshots | Pass — seven at 1290×2796, RGB |
| **Listing accuracy** | Description must match the app | Pass — `store-assets/listing.md` claims eleven modules and ninety-nine lessons; `modules.json` holds exactly 11 and 99 |

Two things the audit found that are **not** rejections but are worth knowing:

- Settings' citation links (`settings.tsx`, the references list) use `Linking.openURL`, which
  leaves the app for Safari, while the legal links use `openLegalPage`'s in-app sheet. Not a
  guideline problem — just inconsistent, and the citation is the link a curious student is
  most likely to follow and least likely to come back from.
- The app is entirely behind a sign-in wall (`RequireAuth` wraps every tab, learn and sheet
  route). That is defensible for an app whose product is synced progress, and Apple approves
  this shape routinely — but it is exactly why the demo account in App Review Information is
  not optional. Without it a reviewer sees the sign-in screen and nothing else.
