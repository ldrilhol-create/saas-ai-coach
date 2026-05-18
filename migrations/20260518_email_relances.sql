-- ============================================================
-- Migration : email relances + opt-out RGPD
-- À appliquer dans Supabase SQL Editor.
-- ============================================================

-- 1) Log de tout email transactionnel envoyé (anti-spam + audit)
--    Pas de RLS — table interne, jamais lue depuis le client.
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email_type text not null,
  -- Types attendus :
  --   'welcome'         — juste après signup
  --   'inactivity_1'    — première relance (J+5 d'inactivité)
  --   'inactivity_2'    — deuxième relance (J+10), envoyée seulement si _1 sans réaction
  --   'trial_d2'        — J-2 avant fin d'essai
  --   'trial_d1'        — J-1 avant fin d'essai
  sent_at timestamptz not null default now(),
  -- Optionnel : id du message Resend pour debug + tracking ouvertures plus tard
  resend_message_id text
);

create index if not exists email_log_user_type_sent_idx
  on public.email_log(user_id, email_type, sent_at desc);

create index if not exists email_log_user_recent_idx
  on public.email_log(user_id, sent_at desc);

-- 2) Opt-out RGPD : flag par user
--    Si true → on n'envoie AUCUN email de relance (les mails system
--    Supabase Auth restent envoyés car ils sont strictement nécessaires
--    au fonctionnement du compte).
alter table public.user_subscriptions
  add column if not exists email_optout boolean not null default false;

-- 3) Vue pratique : dernière activité par user
--    = max(dernier message chat, dernière tâche cochée, dernière maj roadmap)
--    Utilisée par le cron pour détecter l'inactivité.
create or replace view public.user_last_activity as
select
  u.id as user_id,
  u.email,
  greatest(
    coalesce((select max(created_at) from public.chat_messages where user_id = u.id), 'epoch'::timestamptz),
    coalesce((select max(completed_at) from public.task_completions where user_id = u.id), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.roadmaps where user_id = u.id), 'epoch'::timestamptz),
    u.created_at
  ) as last_activity_at,
  u.created_at as account_created_at
from auth.users u;

-- Note : pas de RLS sur la vue, elle n'est consultée que par le service role
-- côté webhook cron.

comment on table public.email_log is 'Audit + anti-spam pour les emails de relance déclenchés par l''activité user. Lu/écrit uniquement côté serveur (service role).';
comment on column public.user_subscriptions.email_optout is 'Opt-out RGPD. Si true, aucun email marketing/relance ne sera envoyé à cet user.';
comment on view public.user_last_activity is 'Dernière activité par user (chat, tâches cochées, roadmap mise à jour). Source de vérité pour les relances d''inactivité.';
