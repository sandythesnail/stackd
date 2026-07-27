-- Referral system schema + secure payout function.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query). If you already
-- ran an earlier version of this file, it's safe to run again — every statement below is
-- idempotent (create/add ... if not exists, create or replace).
--
-- IMPORTANT: this assumes Clerk user ids are exposed to Postgres as auth.jwt()->>'sub',
-- which is the standard Clerk + Supabase third-party auth integration. If your existing
-- `user_progress` RLS policy keys off a different claim, swap every auth.jwt()->>'sub'
-- below to match it before running this.

-- 1. Referrals table -----------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id text not null,
  referred_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'activated')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  reward_paid boolean not null default false,
  referrer_credited boolean not null default false
);

-- For installs that ran an earlier version of this file before referrer_credited existed.
alter table public.referrals add column if not exists referrer_credited boolean not null default false;

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

-- A signed-in user can see referrals where they're the referrer (to show their stats)
-- or the referred user.
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select
  using (auth.jwt()->>'sub' = referrer_id or auth.jwt()->>'sub' = referred_id);

-- A brand-new signed-in user may record themselves as referred exactly once, only as the
-- referred_id (never crediting someone else), and only in 'pending'/unpaid state. This is
-- the ONLY insert path a client is allowed to use — actually paying the reward requires
-- claim_referral_activation() below, which a plain client-side write can never do.
--
-- referrer_id must belong to a real user_progress row: previously any arbitrary string was
-- accepted with no existence check at all, so a typo'd or entirely made-up id could sit in
-- this table forever. This doesn't (and isn't meant to) prevent one person from controlling
-- both a real referrer and a real referred account — that's an accepted, lower-stakes risk
-- since it's capped at in-app currency and requires two genuinely distinct signups either
-- way. It only rules out crediting an id that was never a real account to begin with.
drop policy if exists referrals_insert_self_pending on public.referrals;
create policy referrals_insert_self_pending on public.referrals
  for insert
  with check (
    auth.jwt()->>'sub' = referred_id
    and referrer_id <> referred_id
    and status = 'pending'
    and reward_paid = false
    and exists (select 1 from public.user_progress where clerk_user_id = referrer_id)
  );

-- 2. Secure activation function -------------------------------------------------
-- The only path that ever activates a referral. SECURITY DEFINER lets it flip the exact
-- pending referral row owned by the calling user (which they could never do directly under
-- RLS, since the insert policy only allows creating 'pending' rows), so nobody can activate
-- someone else's referral or replay an already-activated one.
--
-- This used to also write the referrer's +25 diamonds directly into their user_progress row
-- from here. That's a different user's row being written from *this* (the referred user's)
-- session, and it raced the referrer's own client: user_progress.state is a single JSONB
-- blob that each client's autosave overwrites wholesale, so if the referrer had a tab open
-- with a stale cached diamond count, their next autosave clobbered this write right back
-- out. Diamonds are now claimed by the referrer's own client instead, via
-- claim_referrer_rewards() below — the same pattern the +15 coins here already use.
create or replace function public.claim_referral_activation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_id text := auth.jwt()->>'sub';
  v_row public.referrals;
  v_has_progress boolean;
  v_updated_rows int;
begin
  if v_referred_id is null then
    return jsonb_build_object('claimed', false, 'reason', 'not_authenticated');
  end if;

  select * into v_row from public.referrals
    where referred_id = v_referred_id and status = 'pending' and reward_paid = false
    for update;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'no_pending_referral');
  end if;

  -- Require genuine engagement (at least one completed lesson) before paying out, instead
  -- of trusting the client to only call this after its own "finished first lesson" check.
  -- Previously this function had NO server-side gate on that at all — it could be called
  -- directly (e.g. via the Supabase REST/RPC endpoint, bypassing the app UI entirely) the
  -- instant the referral row was inserted, letting a scripted throwaway account claim the
  -- +15 coins without ever touching real content. questProgress is the authoritative
  -- per-lesson completion record (see app.js's finishQuest/startQuest and
  -- mobile/src/lib/webState.ts's mobileToWeb) — this checks for at least one entry marked
  -- actually done, on either platform.
  select exists (
    select 1
    from public.user_progress up, jsonb_each(coalesce(up.state->'questProgress', '{}'::jsonb)) as qp(key, value)
    where up.clerk_user_id = v_referred_id
      and (qp.value->>'done')::boolean is true
  ) into v_has_progress;

  if not v_has_progress then
    return jsonb_build_object('claimed', false, 'reason', 'no_lesson_completed');
  end if;

  -- Referred user: +15 coins (mirrored client-side too so their local session reflects it
  -- immediately without waiting for the next full state reload). Done BEFORE marking the
  -- referral activated/paid below, and its row count checked — a brand-new account's very
  -- first autosave might not have landed yet, which previously updated 0 rows silently
  -- while still marking reward_paid true right after, permanently losing the +15 coins
  -- with no retry path (that same reward_paid guard blocks any future attempt). Now the
  -- referral is only marked paid if the credit actually lands.
  update public.user_progress
    set state = jsonb_set(
      state, '{coins}',
      to_jsonb(coalesce((state->>'coins')::int, 0) + 15)
    )
    where clerk_user_id = v_referred_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    return jsonb_build_object('claimed', false, 'reason', 'user_progress_missing');
  end if;

  update public.referrals
    set status = 'activated', activated_at = now(), reward_paid = true
    where id = v_row.id;

  return jsonb_build_object('claimed', true, 'referrer_id', v_row.referrer_id);
end;
$$;

grant execute on function public.claim_referral_activation() to authenticated;

-- 3. Referrer payout function ----------------------------------------------------
-- Called by the referrer's OWN client on every app load. Finds every activated referral
-- credited to them that hasn't been paid out yet, atomically marks those specific rows
-- referrer_credited so a repeat call (or a second open tab) can't double-pay, and hands
-- back how many diamonds that's worth. The caller adds that to their own local diamond
-- count and saves — same as every other reward in this app, avoiding the cross-session
-- write race described above entirely.
create or replace function public.claim_referrer_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id text := auth.jwt()->>'sub';
  v_claimed_count int;
begin
  if v_referrer_id is null then
    return jsonb_build_object('diamonds', 0);
  end if;

  with claimed as (
    update public.referrals
      set referrer_credited = true
      where referrer_id = v_referrer_id
        and status = 'activated'
        and referrer_credited = false
      returning 1
  )
  select count(*) into v_claimed_count from claimed;

  return jsonb_build_object('diamonds', v_claimed_count * 25);
end;
$$;

grant execute on function public.claim_referrer_rewards() to authenticated;
