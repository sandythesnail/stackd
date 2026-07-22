-- Feedback / bug-report inbox, submitted from the Settings page (web + mobile).
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query). Safe to
-- run again — every statement below is idempotent (create ... if not exists).
--
-- Same assumption as referrals.sql: Clerk user ids are exposed to Postgres as
-- auth.jwt()->>'sub' (the standard Clerk + Supabase third-party auth integration).

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  category text not null default 'feedback' check (category in ('bug', 'feedback')),
  message text not null,
  -- Which client sent it, and roughly where they were when they did — purely for triage,
  -- never shown back to the user.
  app text not null check (app in ('web', 'mobile')),
  page text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_clerk_user_id_idx on public.feedback (clerk_user_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- A signed-in user may only ever file feedback as themselves.
drop policy if exists feedback_insert_self on public.feedback;
create policy feedback_insert_self on public.feedback
  for insert
  with check (auth.jwt()->>'sub' = clerk_user_id);

-- A signed-in user can see their own past submissions (not currently surfaced in the UI,
-- but harmless to allow and useful for a future "your past feedback" view). Nobody can read
-- anyone else's — reviewing the inbox as a whole is a service-role/dashboard task, not a
-- client-facing one.
drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select
  using (auth.jwt()->>'sub' = clerk_user_id);
