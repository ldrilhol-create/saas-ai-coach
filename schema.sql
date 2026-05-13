-- Run this SQL in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
--
-- Order matters: `roadmaps` must come first because chat_messages /
-- task_completions / client_notes all reference its `id` column.

-- ============================================================================
-- Roadmaps — a user can have MANY roadmaps (multi-project, Pro+ feature)
-- ============================================================================
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mon projet',
  data jsonb not null,
  quiz_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmaps_user_id_idx on public.roadmaps(user_id, created_at desc);

-- ------------------------------------------------------------
-- Idempotent migration: if the table predates the multi-roadmap
-- refactor (PK on user_id, no `id` / `name` columns), upgrade it
-- in place without losing data. Must run BEFORE any other table's
-- migration that references `roadmaps.id`.
-- ------------------------------------------------------------
alter table public.roadmaps add column if not exists id uuid;
alter table public.roadmaps add column if not exists name text;
update public.roadmaps
  set id = coalesce(id, gen_random_uuid()),
      name = coalesce(name, 'Mon projet')
  where id is null or name is null;
alter table public.roadmaps alter column id set not null;
alter table public.roadmaps alter column name set not null;
alter table public.roadmaps alter column id set default gen_random_uuid();
alter table public.roadmaps alter column name set default 'Mon projet';

-- Swap PK from (user_id) → (id) only if still keyed on user_id.
do $$
declare
  pk_constraint text;
  pk_columns text[];
begin
  select c.conname,
         array(select a.attname from unnest(c.conkey) k join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k)
    into pk_constraint, pk_columns
  from pg_constraint c
  where c.contype = 'p' and c.conrelid = 'public.roadmaps'::regclass;

  if pk_constraint is not null and pk_columns = array['user_id'] then
    execute 'alter table public.roadmaps drop constraint ' || quote_ident(pk_constraint);
  end if;

  if not exists (
    select 1 from pg_constraint where contype = 'p' and conrelid = 'public.roadmaps'::regclass
  ) then
    alter table public.roadmaps add constraint roadmaps_pkey primary key (id);
  end if;
end $$;

alter table public.roadmaps enable row level security;

drop policy if exists "Users read own roadmap" on public.roadmaps;
drop policy if exists "Users insert own roadmap" on public.roadmaps;
drop policy if exists "Users update own roadmap" on public.roadmaps;
drop policy if exists "Users delete own roadmap" on public.roadmaps;

create policy "Users read own roadmap"
  on public.roadmaps for select
  using (auth.uid() = user_id);

create policy "Users insert own roadmap"
  on public.roadmaps for insert
  with check (auth.uid() = user_id);

create policy "Users update own roadmap"
  on public.roadmaps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own roadmap"
  on public.roadmaps for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Chat messages — scoped to a roadmap for multi-project support
-- ============================================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_id_created_at_idx
  on public.chat_messages(user_id, created_at);

-- Migration: add roadmap_id to legacy rows BEFORE creating the index on it
-- (legacy tables don't have the column yet — an index on a non-existent
-- column would fail).
alter table public.chat_messages add column if not exists roadmap_id uuid
  references public.roadmaps(id) on delete cascade;
update public.chat_messages cm
  set roadmap_id = (select r.id from public.roadmaps r where r.user_id = cm.user_id limit 1)
  where cm.roadmap_id is null;
-- Drop orphan messages (user had no roadmap at all — shouldn't happen but cleanup).
delete from public.chat_messages where roadmap_id is null;

create index if not exists chat_messages_roadmap_id_created_at_idx
  on public.chat_messages(roadmap_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "Users read own messages" on public.chat_messages;
drop policy if exists "Users insert own messages" on public.chat_messages;
drop policy if exists "Users delete own messages" on public.chat_messages;

create policy "Users read own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users insert own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users delete own messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

-- Task completions — scoped to a specific roadmap (multi-roadmap support).
-- user_id is kept for RLS simplicity (avoids joining through roadmaps in policies).
create table if not exists public.task_completions (
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_idx int not null,
  task_idx int not null,
  completed_at timestamptz not null default now(),
  primary key (roadmap_id, phase_idx, task_idx)
);

-- ------------------------------------------------------------
-- Idempotent migration of legacy task_completions (no roadmap_id).
-- ------------------------------------------------------------
alter table public.task_completions add column if not exists roadmap_id uuid;
update public.task_completions tc
  set roadmap_id = (select r.id from public.roadmaps r where r.user_id = tc.user_id limit 1)
  where tc.roadmap_id is null;
delete from public.task_completions where roadmap_id is null;
alter table public.task_completions alter column roadmap_id set not null;

do $$
declare
  pk_constraint text;
  pk_columns text[];
begin
  select c.conname,
         array(select a.attname from unnest(c.conkey) k join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k)
    into pk_constraint, pk_columns
  from pg_constraint c
  where c.contype = 'p' and c.conrelid = 'public.task_completions'::regclass;

  -- If the PK still references user_id (legacy), drop it and rebuild on roadmap_id.
  if pk_constraint is not null and 'user_id' = any(pk_columns) and not ('roadmap_id' = any(pk_columns)) then
    execute 'alter table public.task_completions drop constraint ' || quote_ident(pk_constraint);
  end if;
  if not exists (
    select 1 from pg_constraint where contype = 'p' and conrelid = 'public.task_completions'::regclass
  ) then
    alter table public.task_completions add constraint task_completions_pkey primary key (roadmap_id, phase_idx, task_idx);
  end if;
end $$;

alter table public.task_completions drop constraint if exists task_completions_roadmap_id_fkey;
alter table public.task_completions add constraint task_completions_roadmap_id_fkey
  foreign key (roadmap_id) references public.roadmaps(id) on delete cascade;

alter table public.task_completions enable row level security;

drop policy if exists "Users read own completions" on public.task_completions;
drop policy if exists "Users insert own completions" on public.task_completions;
drop policy if exists "Users delete own completions" on public.task_completions;

create policy "Users read own completions"
  on public.task_completions for select
  using (auth.uid() = user_id);

create policy "Users insert own completions"
  on public.task_completions for insert
  with check (auth.uid() = user_id);

create policy "Users delete own completions"
  on public.task_completions for delete
  using (auth.uid() = user_id);

-- Subscription tier per user. Defaults to 'trial'.
-- 'trial' = 7-day free trial granted at signup (current_period_end = signup + 7d).
-- After expiration, the user is locked out until a billing webhook upgrades them.
-- 'starter' / 'pro' / 'premium' = paid tiers, set by Lemon Squeezy / Stripe webhook.
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'trial',
  current_period_end timestamptz,
  provider text,                -- 'lemonsqueezy' | 'stripe' | null
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_tier_check check (tier in ('trial', 'starter', 'pro', 'premium'))
);

-- Idempotent migration: if the table was created under an older constraint
-- (free/pro only), drop+recreate the constraint and migrate legacy rows.
do $$
begin
  -- Migrate any legacy 'free' rows to an expired trial.
  update public.user_subscriptions set tier = 'trial', current_period_end = now()
  where tier = 'free';
exception when others then
  -- Table doesn't exist yet (first install) — handled by create above.
  null;
end $$;

alter table public.user_subscriptions drop constraint if exists user_subscriptions_tier_check;
alter table public.user_subscriptions
  add constraint user_subscriptions_tier_check check (tier in ('trial', 'starter', 'pro', 'premium'));
alter table public.user_subscriptions alter column tier set default 'trial';

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users read own subscription" on public.user_subscriptions;

-- Users may READ their own tier (to show usage in UI) but never WRITE it from the client.
-- Writes happen via service-role webhook only.
create policy "Users read own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Auto-provision a 7-day trial subscription when a new user signs up.
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_subscriptions (user_id, tier, current_period_end)
  values (new.id, 'trial', now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- ============================================================================
-- Anti-abuse: 1 account = 1 person (block trial re-creation via email tricks)
-- ============================================================================
-- Strategy:
-- 1) Normalize email (lowercase, strip Gmail +alias, strip Gmail dots) and
--    store the normalized form in a unique table.
-- 2) Maintain a blocklist of disposable / temp-mail domains.
-- 3) BEFORE INSERT trigger on auth.users enforces both rules. If a duplicate
--    normalized email exists or the domain is blocked, the signup aborts.

create or replace function public.normalize_email(email_input text)
returns text
language plpgsql
immutable
as $$
declare
  parts text[];
  local_part text;
  domain text;
begin
  if email_input is null then return null; end if;
  parts := string_to_array(lower(trim(email_input)), '@');
  if array_length(parts, 1) <> 2 then return lower(trim(email_input)); end if;
  local_part := parts[1];
  domain := parts[2];
  -- Strip everything after the first '+' (alias trick, works on most providers)
  local_part := split_part(local_part, '+', 1);
  -- Gmail/Googlemail also ignore dots in the local part, and are aliases
  if domain in ('gmail.com', 'googlemail.com') then
    local_part := replace(local_part, '.', '');
    domain := 'gmail.com';
  end if;
  return local_part || '@' || domain;
end;
$$;

-- Stores the normalized form of every signup email. Unique constraint here
-- enforces "1 person = 1 account" at the DB level (no race conditions).
create table if not exists public.normalized_emails (
  email_normalized text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists normalized_emails_user_id_idx
  on public.normalized_emails(user_id);

-- Disposable / temp-mail domains. Add more as you spot them.
create table if not exists public.blocked_email_domains (
  domain text primary key,
  reason text,
  added_at timestamptz not null default now()
);

insert into public.blocked_email_domains (domain, reason) values
  ('mailinator.com', 'disposable'),
  ('10minutemail.com', 'disposable'),
  ('10minutemail.net', 'disposable'),
  ('guerrillamail.com', 'disposable'),
  ('guerrillamail.info', 'disposable'),
  ('guerrillamail.org', 'disposable'),
  ('sharklasers.com', 'disposable'),
  ('grr.la', 'disposable'),
  ('yopmail.com', 'disposable'),
  ('yopmail.fr', 'disposable'),
  ('tempmail.com', 'disposable'),
  ('temp-mail.org', 'disposable'),
  ('throwawaymail.com', 'disposable'),
  ('mailnesia.com', 'disposable'),
  ('trashmail.com', 'disposable'),
  ('trashmail.de', 'disposable'),
  ('getairmail.com', 'disposable'),
  ('mintemail.com', 'disposable'),
  ('mohmal.com', 'disposable'),
  ('fakeinbox.com', 'disposable'),
  ('dispostable.com', 'disposable'),
  ('spam4.me', 'disposable'),
  ('jetable.org', 'disposable'),
  ('emailondeck.com', 'disposable'),
  ('discard.email', 'disposable'),
  ('maildrop.cc', 'disposable'),
  ('mailcatch.com', 'disposable'),
  ('mailtemp.info', 'disposable'),
  ('moakt.com', 'disposable'),
  ('mytemp.email', 'disposable')
on conflict (domain) do nothing;

-- BEFORE INSERT trigger on auth.users. Runs alphabetically before the
-- subscription trigger (n < s), so any rejection happens cleanly without
-- creating a partial state.
create or replace function public.enforce_one_account_per_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_normalized text;
begin
  -- 1) Block disposable domains
  v_domain := split_part(lower(trim(new.email)), '@', 2);
  if exists (select 1 from public.blocked_email_domains where domain = v_domain) then
    raise exception 'disposable_email_not_allowed'
      using errcode = '23514',
            hint = 'Use a permanent email address (Gmail, Outlook, ProtonMail, etc.).';
  end if;

  -- 2) Enforce uniqueness on normalized form
  v_normalized := public.normalize_email(new.email);
  if v_normalized is null then return new; end if;

  insert into public.normalized_emails (email_normalized, user_id)
  values (v_normalized, new.id);

  return new;
exception when unique_violation then
  raise exception 'email_already_registered'
    using errcode = '23505',
          hint = 'An account already exists for this email address.';
end;
$$;

-- AFTER INSERT (not BEFORE): the trigger inserts into normalized_emails with a FK
-- to auth.users.id, which only exists after the parent INSERT completes. If the
-- trigger raises, the entire transaction rolls back, so the auth.users row is
-- undone too — safe equivalent to BEFORE INSERT semantically.
drop trigger if exists on_auth_user_created_normalize on auth.users;
create trigger on_auth_user_created_normalize
  after insert on auth.users
  for each row execute function public.enforce_one_account_per_person();

-- Backfill: insert normalized form for all existing users (idempotent).
insert into public.normalized_emails (email_normalized, user_id)
select public.normalize_email(u.email), u.id
from auth.users u
where u.email is not null
on conflict do nothing;

-- Premium feature: durable client notes that the coach AI maintains across sessions.
-- The IA writes notes via the add_client_note tool when something important is learned
-- (goals, blockers, wins, business context). Notes are injected into the system prompt
-- on every chat, so the coach "remembers" the user beyond chat history alone.
-- Notes are scoped to a specific roadmap (a user with multiple projects has separate
-- notes for each).
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  content text not null,
  category text not null check (category in ('goal', 'blocker', 'win', 'context')),
  created_at timestamptz not null default now()
);

create index if not exists client_notes_user_id_created_at_idx
  on public.client_notes(user_id, created_at desc);

-- Migration: add the roadmap_id column BEFORE creating the index on it.
alter table public.client_notes add column if not exists roadmap_id uuid
  references public.roadmaps(id) on delete cascade;
update public.client_notes cn
  set roadmap_id = (select r.id from public.roadmaps r where r.user_id = cn.user_id limit 1)
  where cn.roadmap_id is null;
delete from public.client_notes where roadmap_id is null;

create index if not exists client_notes_roadmap_id_idx
  on public.client_notes(roadmap_id, created_at desc);

alter table public.client_notes enable row level security;

drop policy if exists "Users read own client notes" on public.client_notes;
drop policy if exists "Users insert own client notes" on public.client_notes;
drop policy if exists "Users delete own client notes" on public.client_notes;

create policy "Users read own client notes"
  on public.client_notes for select
  using (auth.uid() = user_id);

-- Insert is via the chat API (server-side with the user's session), so the standard
-- auth.uid() check is enough — no service role needed.
create policy "Users insert own client notes"
  on public.client_notes for insert
  with check (auth.uid() = user_id);

create policy "Users delete own client notes"
  on public.client_notes for delete
  using (auth.uid() = user_id);

-- Monthly usage counter. One row per user per calendar month (UTC).
-- Reset implicitly: a new month means a new row, so old rows can be archived/purged at leisure.
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,           -- first day of the month (UTC)
  messages_count int not null default 0,
  roadmaps_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.usage_counters enable row level security;

drop policy if exists "Users read own usage" on public.usage_counters;

create policy "Users read own usage"
  on public.usage_counters for select
  using (auth.uid() = user_id);

-- Atomic increment + cap check, called from API routes via supabase.rpc().
-- SECURITY DEFINER so it can write to usage_counters (which has no client-side
-- write policy). The function itself enforces auth via auth.uid().
create or replace function public.increment_usage(
  p_kind text,            -- 'message' | 'roadmap'
  p_limit int             -- monthly cap. Pass a very large int for "unlimited".
) returns table (
  new_count int,
  period date,
  allowed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_current int;
  v_new int;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;
  if p_kind not in ('message', 'roadmap') then
    raise exception 'invalid kind: %', p_kind;
  end if;

  insert into public.usage_counters (user_id, period_start)
  values (v_user, v_period)
  on conflict (user_id, period_start) do nothing;

  if p_kind = 'message' then
    select uc.messages_count into v_current
    from public.usage_counters uc
    where uc.user_id = v_user and uc.period_start = v_period
    for update;
  else
    select uc.roadmaps_count into v_current
    from public.usage_counters uc
    where uc.user_id = v_user and uc.period_start = v_period
    for update;
  end if;

  if v_current >= p_limit then
    new_count := v_current;
    period := v_period;
    allowed := false;
    return next;
    return;
  end if;

  if p_kind = 'message' then
    update public.usage_counters
    set messages_count = messages_count + 1, updated_at = now()
    where user_id = v_user and period_start = v_period
    returning messages_count into v_new;
  else
    update public.usage_counters
    set roadmaps_count = roadmaps_count + 1, updated_at = now()
    where user_id = v_user and period_start = v_period
    returning roadmaps_count into v_new;
  end if;

  new_count := v_new;
  period := v_period;
  allowed := true;
  return next;
end;
$$;

revoke all on function public.increment_usage(text, int) from public;
grant execute on function public.increment_usage(text, int) to authenticated;
