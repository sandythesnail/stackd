-- Referral system schema + secure payout function.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
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
  reward_paid boolean not null default false
);

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
drop policy if exists referrals_insert_self_pending on public.referrals;
create policy referrals_insert_self_pending on public.referrals
  for insert
  with check (
    auth.jwt()->>'sub' = referred_id
    and referrer_id <> referred_id
    and status = 'pending'
    and reward_paid = false
  );

-- 2. Secure activation function -------------------------------------------------
-- The only path that ever pays a referral reward. SECURITY DEFINER lets it update the
-- referrer's user_progress row (which the referred user could never do directly under
-- RLS), but it only touches the exact pending referral row owned by the calling user, so
-- nobody can pay themselves, pay someone else's referral, or replay an already-paid one.
create or replace function public.claim_referral_activation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_id text := auth.jwt()->>'sub';
  v_row public.referrals;
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

  update public.referrals
    set status = 'activated', activated_at = now(), reward_paid = true
    where id = v_row.id;

  -- Referrer: +25 diamonds.
  update public.user_progress
    set state = jsonb_set(
      state, '{diamonds}',
      to_jsonb(coalesce((state->>'diamonds')::int, 0) + 25)
    )
    where clerk_user_id = v_row.referrer_id;

  -- Referred user: +15 coins (mirrored client-side too so their local session reflects it
  -- immediately without waiting for the next full state reload).
  update public.user_progress
    set state = jsonb_set(
      state, '{coins}',
      to_jsonb(coalesce((state->>'coins')::int, 0) + 15)
    )
    where clerk_user_id = v_referred_id;

  return jsonb_build_object('claimed', true, 'referrer_id', v_row.referrer_id);
end;
$$;

grant execute on function public.claim_referral_activation() to authenticated;
