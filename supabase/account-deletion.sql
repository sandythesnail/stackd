-- Account deletion: let a signed-in user delete their OWN rows.
--
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query). Safe to run
-- again — every statement is idempotent (drop policy if exists, then create).
--
-- Why this file exists: the App Store requires that any app offering account CREATION also
-- offers account DELETION from inside the app (App Review Guideline 5.1.1(v)). Settings'
-- "Delete my account" does that, and it deletes these rows before deleting the Clerk user.
--
-- Without the policies below that deletion silently does nothing. Row-level security denies
-- by default, and feedback.sql / referrals.sql only ever granted SELECT and INSERT — so a
-- DELETE from the client is not an error, it simply matches zero rows and reports success.
-- That is the worst possible failure for this feature: the user is told their data is gone,
-- Clerk really does delete their login, and every row keyed to that now-unreachable id stays
-- in the database forever with nobody able to reach it.
--
-- Same assumption as the other two files: Clerk user ids reach Postgres as
-- auth.jwt()->>'sub' (the standard Clerk + Supabase third-party auth integration).

-- 1. Progress ------------------------------------------------------------------
-- The row that holds everything the app remembers about a player: xp, level, coins,
-- diamonds, streak, per-lesson completion, owned/equipped items, daily login log, budget
-- figures, assessment result, onboarding answers.
alter table public.user_progress enable row level security;

drop policy if exists user_progress_delete_own on public.user_progress;
create policy user_progress_delete_own on public.user_progress
  for delete
  using (clerk_user_id = auth.jwt()->>'sub');

-- 2. Feedback ------------------------------------------------------------------
drop policy if exists feedback_delete_own on public.feedback;
create policy feedback_delete_own on public.feedback
  for delete
  using (clerk_user_id = auth.jwt()->>'sub');

-- 3. Referrals -----------------------------------------------------------------
-- Deletable from EITHER side of the pair: a referral row names two people, and whichever of
-- them asked to be forgotten is entitled to have their identifier gone. Deleting the row
-- outright (rather than nulling one column) is the honest reading of "delete my data" — a
-- half-row naming only the other person is still a record of the relationship.
--
-- The reward is already paid or already not; nothing downstream reads these rows to decide
-- anything after the fact (see referrals.sql's payout function, which credits at activation
-- time), so removing one cannot claw back or re-trigger a payout.
drop policy if exists referrals_delete_own on public.referrals;
create policy referrals_delete_own on public.referrals
  for delete
  using (
    referrer_id = auth.jwt()->>'sub'
    or referred_id = auth.jwt()->>'sub'
  );

-- Note on Clerk: deleting the LOGIN is done by the client calling Clerk's user.delete(), not
-- from here. That requires "Allow users to delete their accounts" to be enabled on the Clerk
-- instance (Clerk Dashboard > Configure > User & Authentication > User profile). If it is off,
-- self-deletion fails and the app surfaces the error instead of pretending it worked.
