# AI Business Coach — État du projet

Document de passation pour reprendre le projet dans une nouvelle session Claude (Code ou Cowork).

---

## Vue d'ensemble

**SaaS bilingue (FR/EN)** : un coach business propulsé par Claude IA qui génère une roadmap personnalisée à partir d'un diagnostic en 6 questions, puis suit l'utilisateur via un chat avec mémoire et auto-complétion des tâches.

**URL de prod** : https://buisness-ia-coach.vercel.app
**Repo local** : `~/Desktop/saas-ai-coach-master/`
**Repo GitHub déclaré (pas synchronisé en local)** : https://github.com/ldrilhol-create/saas-ai-coach

---

## Stack

- **Framework** : Next.js 16.2.6 (App Router, Turbopack). Particularité : `middleware.ts` est renommé `proxy.ts` dans cette version.
- **Auth** : Supabase Auth (email/password), `@supabase/ssr` v0.x pour la gestion cookies SSR
- **DB** : Supabase Postgres avec RLS (Row Level Security) activé sur toutes les tables
- **IA** : Anthropic SDK `@anthropic-ai/sdk` v0.95.1, modèles `claude-opus-4-7` (chat) et `claude-sonnet-4-6` (génération roadmap)
- **UI** : React 19, TailwindCSS v4, thème dark indigo/purple avec gradient blobs et glass-morphism, cards avec contour néon violet
- **Streaming** : `partial-json` côté client pour parser le JSON streamé de la roadmap progressive
- **Hosting** : Vercel **Pro** (60s timeout, nécessaire car certaines requêtes chat peuvent durer 15-25s)
- **i18n** : système maison basé sur React Context (`lib/i18n.tsx`), 2 langues (fr/en), détection auto via `navigator.language` puis override via `localStorage`

---

## Pages

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `app/page.tsx` | Homepage marketing (Hero, "L'alternative aux formations", Comment ça marche, Features, Pour qui, **Pricing 3 plans**, CTA, Footer). Sélecteur FR/EN + bouton **S'abonner** (scroll vers `#pricing`) + bouton Connexion dans la navbar. |
| `/login` | `app/login/page.tsx` | Connexion + inscription email/password. Suspense + `?next=` pour retour après login. |
| `/quiz` | `app/quiz/page.tsx` | Diagnostic business en 6 étapes. Réponses sauvées dans `localStorage` + DB après génération. Pré-rempli si l'utilisateur en a déjà fait un. |
| `/roadmap` | `app/roadmap/page.tsx` | Page principale post-auth. Roadmap streamée + chat coach à droite. Header : chip de plan, bouton **Export PDF** (gaté Pro/Premium), Régénérer / Refaire diagnostic / Accueil + **avatar rond** (initiale) → /account. |
| `/roadmap/print` | `app/roadmap/print/page.tsx` | Vue imprimable de la roadmap (fond blanc, layout A4). Fetch la roadmap depuis Supabase, déclenche `window.print()` automatiquement après 400ms. CSS `@page A4 1.5cm` + `page-break-inside: avoid` sur chaque phase. L'utilisateur sauvegarde en PDF via la boîte de dialogue d'impression du navigateur. |
| `/account` | `app/account/page.tsx` | Page profil : avatar, email, plan actuel + date de renouvellement/expiration, barres d'usage (messages + roadmaps), boutons "Gérer mon abonnement" (placeholder) + "Déconnexion". |
| `/legal/mentions` | `app/legal/mentions/page.tsx` | Mentions légales (LCEN). Placeholders `[À COMPLÉTER]` pour nom légal, SIRET, adresse, TVA. |
| `/legal/cgu` | `app/legal/cgu/page.tsx` | CGU + CGV : objet du Service, abonnements, paiements, droit de rétractation (renoncement explicite pour SaaS), résiliation, responsabilité IA, droit applicable. |
| `/legal/confidentialite` | `app/legal/confidentialite/page.tsx` | Politique de confidentialité RGPD : données collectées, finalités + bases légales, sous-traitants (Supabase EU, Anthropic US avec SCCs, Vercel), durées de conservation, droits art. 15-22, cookies, sécurité. |

**Composants** :
- `app/components/CoachAvatar.tsx` — avatar SVG inline du coach (homme d'affaires gradient indigo/purple, costume + cravate rouge).
- `app/components/UserAvatar.tsx` — rond gradient indigo/purple/pink avec la première lettre de l'email de l'utilisateur. Tailles `sm` / `md` / `lg`. Réutilisé dans header `/roadmap` et dans `/account`.

**Page `/account` — sections visibles par tier** :
- **Tous tiers** : avatar + email + plan actuel (badge + date renouvellement/expiration), barres d'usage messages/roadmaps, bouton "Gérer mon abonnement" (placeholder), bouton "Déconnexion".
- **Premium uniquement** : section "Notes du coach" (le profil client persistant — liste des notes catégorisées en goal/blocker/win/context, bouton supprimer par note), section "Support prioritaire" (lien mailto avec SLA 24h ouvrées).

**Gating PDF** : `canExportPdf = usage.tier === 'pro' || 'premium'`. Tier inférieur → click sur Export PDF ouvre une modal "PDF réservé au plan Pro" avec CTA → scroll vers `/#pricing`. Tier Pro/Premium → ouverture de `/roadmap/print` dans un nouvel onglet.

---

## API routes

| Route | Runtime | Description |
|---|---|---|
| `/api/generate` | Node, `maxDuration = 60` | Génère **une nouvelle** roadmap. Auth Supabase obligatoire. Prend `{answers, locale}`. **Insert** une ligne placeholder dans `roadmaps` avant le streaming, renvoie son id via le header `X-Roadmap-Id` (le client le lit pour activer le nouveau projet). Stream JSON, update la ligne après réception complète. Schéma JSON structuré côté Claude (output_config.format). **Vérifie le rate limit** via `incrementUsage(supabase, user.id, 'roadmap')` avant l'appel Claude ; renvoie 429 si dépassé. |
| `/api/roadmaps` | Node | **GET** : liste les roadmaps du user (`{roadmaps: [{id, name, created_at, updated_at}]}`). **DELETE** : supprime une roadmap (`?id=`), cascade sur chat_messages, task_completions, client_notes. RLS owner-only. |
| `/api/chat` | Node, `maxDuration = 60` | Chat avec le coach. Auth Supabase. Prend `{message, history, roadmap, roadmapId, locale}` — **`roadmapId` est obligatoire** (multi-roadmap). Vérifie que la roadmap appartient bien au user (defense in depth, RLS aussi). Toutes les ops DB sont scoped par `roadmap_id` (chat_messages, task_completions, client_notes pour Premium). Stream via `ReadableStream`. Tool-loop manuel : `web_search_20260209` + `mark_task_complete` (toujours actif) + `add_client_note` (Premium uniquement). Sentinel `\n__META__{json}` à la fin. Rate limit `incrementUsage` 'message' avant streaming. |
| `/api/usage` | Node | GET, auth Supabase. Renvoie `{tier, period, messages: {used, limit, unlimited}, roadmaps: {used, limit, unlimited}}`. Utilisé par le chip de header dans `/roadmap`. |
| `/api/notes` | Node | **GET** : liste les notes du coach pour l'utilisateur (`{notes: ClientNote[]}`). **DELETE** : supprime une note (`?id=<uuid>`). Auth Supabase + RLS, donc l'utilisateur ne voit / supprime que ses propres notes. |
| `/api/auth/signout` | Node | POST → signOut Supabase → redirect `/` |
| `/api/stripe/checkout` | Node | POST avec `{plan: 'starter'\|'pro'\|'premium'}`. Auth Supabase. Crée une Stripe Checkout Session (mode subscription) avec le bon `price_id`. Renvoie `{url}` à rediriger côté client. Réutilise l'éventuel `provider_customer_id` existant pour éviter de créer des doublons. |
| `/api/stripe/portal` | Node | POST. Auth Supabase + `provider_customer_id` requis. Crée une session Customer Portal Stripe et renvoie `{url}`. C'est la page Stripe où le user gère son abonnement (changement de plan, annulation, mise à jour CB, factures). |
| `/api/stripe/webhook` | Node | POST. **Pas d'auth user** — utilise la signature Stripe (`STRIPE_WEBHOOK_SECRET`). Gère les events : `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`. Utilise `getSupabaseAdmin()` (service role) pour upsert dans `user_subscriptions`. Idempotent : chaque handler refait un upsert complet, donc rejouer un event est safe. |

**Note Edge runtime** : on a essayé Edge pour avoir le timeout 25s sur Vercel Hobby, mais le SDK Anthropic importe `node:fs` et `node:path` qui ne sont pas autorisés en Edge. Solution actuelle : Node runtime + Vercel Pro (60s).

---

## Base de données (Supabase)

Tout est protégé par RLS — chaque user ne voit/modifie que ses propres lignes via `auth.uid() = user_id`.

### `chat_messages`
```sql
id uuid PK default gen_random_uuid()
user_id uuid FK auth.users.id ON DELETE CASCADE
roadmap_id uuid FK roadmaps.id ON DELETE CASCADE
role text CHECK (role IN ('user', 'assistant'))
content text
created_at timestamptz default now()
```
Politiques RLS : SELECT / INSERT / DELETE par owner. Chaque message est lié à une roadmap spécifique → quand l'utilisateur switche de projet, l'historique du chat change.

### `roadmaps` (plusieurs par user — multi-projet)
```sql
id uuid PK default gen_random_uuid()
user_id uuid FK auth.users.id ON DELETE CASCADE
name text                -- nom du projet (auto = businessType + niche, ou title de Claude)
data jsonb               -- {title, phases: [{phase, name, duration, tasks: [{title, duration}]}]}
quiz_answers jsonb       -- {businessType, stage, weeklyTime, budget, challenge, niche}
created_at timestamptz default now()
updated_at timestamptz default now()
```
Un user peut avoir N roadmaps. Chaque appel `/api/generate` **insère une nouvelle ligne** (ne remplace plus l'existante). Index sur `(user_id, created_at desc)` pour le listing. RLS : SELECT / INSERT / UPDATE / DELETE par owner.

### `normalized_emails` *(anti-abuse 1 compte = 1 personne)*
```sql
email_normalized text PK
user_id uuid FK auth.users.id ON DELETE CASCADE
created_at timestamptz
```
Stocke la forme normalisée de l'email de chaque user (lowercase + strip alias `+xxx` + strip points sur Gmail). Unicité au niveau DB → empêche `ldrilhol@gmail.com`, `l.drilhol@gmail.com` et `ldrilhol+test@gmail.com` d'être 3 comptes différents.

### `blocked_email_domains` *(blocklist disposable mails)*
```sql
domain text PK
reason text
added_at timestamptz
```
~30 domaines disposable préchargés (mailinator, yopmail, 10minutemail, etc.). Pour en ajouter : `insert into blocked_email_domains (domain, reason) values ('mauvais-domaine.com', 'disposable');`.

### Fonction `normalize_email(email_input text) → text`
Lowercase + trim + strip `+alias` + strip dots pour Gmail/Googlemail. Utilisée par le trigger ci-dessous.

### Trigger `on_auth_user_created_normalize` *(BEFORE INSERT sur auth.users)*
1. Rejette si le domaine est dans `blocked_email_domains` → erreur `disposable_email_not_allowed`
2. Insert la forme normalisée dans `normalized_emails` → conflit unique = erreur `email_already_registered`

Les codes d'erreur sont catchés côté UI (`app/login/page.tsx`) et traduits en français/anglais via `t.login.errorEmailAlreadyRegistered` / `t.login.errorDisposableEmail`.

**Limite connue** : le trigger ne se déclenche que sur INSERT. Si un user change son email via Supabase Admin (manuel), `normalized_emails` ne sera pas mis à jour. À couvrir si tu ouvres un endpoint "change email".

### `client_notes` *(Premium uniquement)*
```sql
id uuid PK default gen_random_uuid()
user_id uuid FK auth.users.id ON DELETE CASCADE
roadmap_id uuid FK roadmaps.id ON DELETE CASCADE
content text
category text CHECK (category IN ('goal', 'blocker', 'win', 'context'))
created_at timestamptz default now()
```
RLS : SELECT / INSERT / DELETE par owner. Les notes sont scoped par roadmap → un user Premium qui gère 3 projets a 3 jeux de notes distincts.

**Mécanisme** : le coach IA (Claude Opus 4.7 sur Premium) dispose du tool `add_client_note` qui s'exécute côté serveur dans `/api/chat`. Le tool n'est exposé QU'aux users `premium` (filtrage `isPremium` dans la liste `tools`). Quand l'IA appelle le tool, l'API insert dans `client_notes` (RLS check via user session). Au début de chaque appel `/api/chat` pour un user premium, les notes (limite 40 dernières) sont chargées et injectées dans le bloc dynamique du system prompt — l'IA "se souvient" donc entre les sessions, au-delà de l'historique brut du chat.

L'utilisateur peut consulter et supprimer ses notes depuis `/account` (section visible uniquement en tier premium).

### `task_completions`
```sql
roadmap_id uuid FK roadmaps.id ON DELETE CASCADE
user_id uuid FK auth.users.id ON DELETE CASCADE
phase_idx int
task_idx int
completed_at timestamptz default now()
PRIMARY KEY (roadmap_id, phase_idx, task_idx)
```
RLS : SELECT / INSERT / DELETE par owner. Une cascade sur `roadmaps.id` nettoie automatiquement les completions quand un projet est supprimé.

### `user_subscriptions`
```sql
user_id uuid PK FK auth.users.id ON DELETE CASCADE
tier text DEFAULT 'free' CHECK (tier IN ('free', 'pro'))
current_period_end timestamptz   -- si dépassé, le helper rebascule en 'free'
provider text                    -- 'lemonsqueezy' | 'stripe' | null
provider_customer_id text
provider_subscription_id text
created_at, updated_at timestamptz
```
RLS : SELECT par owner uniquement. **Pas de write policy client** — les écritures viennent d'un webhook serveur (à brancher quand Lemon Squeezy/Stripe sera setup) avec service role key.

### `usage_counters`
```sql
user_id uuid FK auth.users.id ON DELETE CASCADE
period_start date              -- premier jour du mois UTC
messages_count int DEFAULT 0
roadmaps_count int DEFAULT 0
updated_at timestamptz
PRIMARY KEY (user_id, period_start)
```
RLS : SELECT par owner uniquement. Pas de write policy client — l'écriture passe par la fonction RPC `increment_usage` en SECURITY DEFINER.
Reset implicite : un nouveau mois = une nouvelle ligne. Pas de cron de purge nécessaire.

### Fonction RPC `increment_usage(p_kind text, p_limit int)`
- `p_kind` : `'message'` ou `'roadmap'`
- Atomique (lock `FOR UPDATE` sur la ligne du mois courant)
- Retourne `{ new_count, period, allowed }`
- Si `allowed = false`, n'incrémente pas. Appelée par `lib/rate-limit.ts`.

Le SQL complet de création est dans `schema.sql` à la racine.

---

## Variables d'environnement

`.env.local` (à la **racine du projet**, jamais dans `app/`) :

```
NEXT_PUBLIC_SUPABASE_URL=https://ifnksbvgzzcebzlvrmzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
CLAUDE_API_KEY=sk-ant-api03-...
```

**Sur Vercel** : ces 3 vars sont configurées pour **Production + Preview** (pas Development, car Claude API key est "sensitive" et Vercel refuse Development pour les vars sensibles). Le nom EXACT compte : `NEXT_PUBLIC_SUPABASE_ANON_KEY` doit avoir le préfixe `NEXT_PUBLIC_` pour être bundlé côté browser.

---

## i18n

- `lib/i18n.tsx` contient : `LanguageProvider`, hook `useLang()`, composant `<LanguageSwitcher />`, dictionnaires complets FR/EN
- `app/layout.tsx` wrap toute l'app dans `<LanguageProvider>`
- Détection : `navigator.language` au premier visit → fallback `fr`. Override persistant via `localStorage('locale')`
- Claude reçoit la `locale` dans le body des appels `/api/generate` et `/api/chat`, et ses system prompts ont deux versions (FR/EN) sélectionnées dynamiquement

---

## Multi-roadmap (multi-projets)

Un user peut gérer **plusieurs projets** dans la même app — chacun a sa propre roadmap, son chat, ses tâches, et (pour Premium) ses notes coach.

### Architecture
- **`roadmaps`** : `id` PK + `user_id` FK + `name`. Plusieurs lignes par user.
- **`chat_messages` / `task_completions` / `client_notes`** : ajout d'une FK `roadmap_id` (cascade delete).
- **Concept de "projet actif"** : persisté dans `localStorage.activeRoadmapId` (per-device). Au mount de `/roadmap`, on lit cette clé ; si absente ou pointant vers une roadmap supprimée, fallback sur la plus récente.

### Flow utilisateur
- Header `/roadmap` : à gauche du titre, un dropdown "🗂️ Nom du projet ▼" avec la liste de tous les projets + bouton "+ Nouveau projet".
- Click sur un projet → switch (reload chat + completions pour ce projet).
- Click sur l'icône poubelle d'un projet → confirmation, puis DELETE (cascade sur tout).
- "+ Nouveau projet" → redirige vers `/quiz` pour créer un nouveau projet avec ses propres réponses.
- "Régénérer" → crée un NOUVEAU projet avec les mêmes réponses que l'actif (l'ancien reste accessible).
- "Refaire le diagnostic" → idem, mais l'utilisateur va passer le quiz à nouveau.

### Naming des projets
- Auto-name à la création : `${businessType} – ${niche}` (tronqué à 60 chars). Si vide, fallback `"Mon projet"`.
- Une fois le streaming Claude terminé, le nom est remplacé par le `title` de la roadmap si Claude en a produit un meilleur (max 100 chars).
- Pas de rename UI pour l'instant (à ajouter si besoin user, simple `update roadmaps set name = ?`).

### Quotas
- Quota mensuel `roadmapsPerMonth` (dans `TIER_LIMITS`) = nombre de **générations** autorisées par mois. Pas de cap sur le **nombre actif total** — un user qui accumule peut avoir plus de projets, il les supprime manuellement s'il veut.
- Trial : 1/mois · Starter : 3/mois · Pro : 10/mois · Premium : 20/mois.

---

## Optimisation des coûts API Claude

### Prompt caching dans `/api/chat`

Le system prompt est splitté en **2 blocs** passés à `client.messages.stream({ system: [...] })` :

1. **Bloc statique** (avec `cache_control: { type: 'ephemeral' }`)
   - Instructions du coach (FR/EN)
   - Méthode + contraintes de forme
   - ROADMAP JSON complète (semi-statique : ne change qu'à la régénération)

2. **Bloc dynamique** (pas de cache)
   - Progression actuelle (X/Y tâches, %)
   - Liste des tâches complétées
   - Phase en cours + prochaines tâches non faites

**Effet** : le 1er message d'une conversation paie le cache write (~1,25× le prix normal sur ces tokens). Les messages suivants paient le cache read (**1/10 du prix**) sur tout le bloc statique tant que le cache est chaud (TTL 5 min).

**Gain mesuré attendu** : ~60-70 % de réduction du coût moyen par message d'une conversation active.

**Important** : si tu changes l'ordre des blocs, garde le bloc dynamique APRÈS le bloc cache. Le cache marche en préfixe — toute modif dans le bloc cache invalide les messages suivants.

### Autres leviers d'économie (pas encore implémentés)

- **Cap d'historique** : actuellement on renvoie tous les messages précédents. Cap à 20 derniers tours = ~50 % d'économie input sur les conversations longues.
- **Switch vers Sonnet 4.6 pour le chat** : Sonnet est 5× moins cher qu'Opus ($3+$15 vs $15+$75 par M tokens). Tradeoff qualité à tester. Variable d'env `CLAUDE_CHAT_MODEL` recommandée.
- **Désactiver `web_search` sur les tiers les moins chers** : chaque recherche coûte ~$0.01.

---

## Rate limiting & tiers d'abonnement

Le scaffolding est en place — il manque seulement le branchement billing (Lemon Squeezy / Stripe).

### Limites par tier (dans `lib/rate-limit.ts`)
| Tier | Prix | Modèle Claude | Messages / mois | Roadmaps / mois |
|---|---|---|---|---|
| `trial` (défaut) | 0 € (7 j) | **Sonnet 4.6** | 10 | 1 |
| `starter` | 29 €/mois | **Sonnet 4.6** | 60 | 3 |
| `pro` | 49 €/mois | **Opus 4.7** | 300 | 10 |
| `premium` | 69 €/mois | **Opus 4.7** | 800 | 20 |

**Stratégie modèle** : Sonnet sur Trial/Starter (acquisition + volume, coût bas), Opus sur Pro/Premium (modèle premium pour justifier l'upgrade). Narratif marketing : *"Pro débloque Claude Opus, le modèle le plus avancé d'Anthropic."*

Pour changer les limites ou les modèles : éditer `TIER_LIMITS` et `TIER_MODEL` dans [lib/rate-limit.ts](lib/rate-limit.ts).

### Auto-trial à l'inscription
Un trigger SQL `on_auth_user_created_subscription` insère automatiquement une ligne `user_subscriptions` avec `tier='trial'` et `current_period_end = now() + 7 days` à chaque signup.

### Expiration
- Un trial dont `current_period_end < now()` est marqué **isExpired**.
- Un tier payant sans `current_period_end` (ou expiré) est aussi marqué isExpired → toutes les API renvoient 429 avec `isExpired: true`.
- La modal UI affiche un message dédié "Ton essai gratuit est terminé" / "Your free trial has ended".

### Flow
1. Avant chaque appel coûteux Claude, l'API route appelle `incrementUsage(supabase, userId, 'message' | 'roadmap')`.
2. Le helper lit le tier dans `user_subscriptions` (fallback `free`), passe la cap au RPC `increment_usage`.
3. Le RPC verrouille la ligne du mois courant (`FOR UPDATE`), compare au plafond, incrémente si OK.
4. Si `allowed = false`, l'API renvoie **429** avec `{error: 'limit_reached', kind, tier, limit, used, period}`.
5. Le client `/roadmap` attrape le 429 → ouvre une modal "limite atteinte" + CTA `Passer en Pro` (placeholder, à brancher).

### Upgrader un user manuellement (avant que le billing soit branché)

Tous les plans payants sont **mensuels** (renouvellement chaque mois). Pour tester : `now() + interval '1 month'`.

Dans le SQL editor Supabase, remplace `'pro'` par le tier voulu (`starter`, `pro`, `premium`) et l'email :
```sql
with me as (
  select id from auth.users where email = 'TON_EMAIL'
)
insert into public.user_subscriptions (user_id, tier, current_period_end)
select id, 'pro', now() + interval '1 month' from me
on conflict (user_id) do update
  set tier = 'pro', current_period_end = excluded.current_period_end, updated_at = now();
```
Pour rétrograder en trial expiré (lockout) : `update user_subscriptions set tier = 'trial', current_period_end = now() where user_id = '...'`.

**Note billing futur** : quand Lemon Squeezy / Stripe sera branché, le webhook reçoit la `period_end` de la prochaine échéance (typiquement now + 1 mois) et l'upsert dans cette même colonne. La logique `getEffectiveTier` traitera automatiquement le user comme `expired` si le renouvellement échoue et que le webhook ne pousse pas de nouvelle date.

### Recalculer les coûts par tier
Pour suivre la rentabilité réelle, mesurer sur Anthropic Console → Usage le coût moyen par message **par modèle** :
- Sonnet → coût moyen attendu : ~0,008 €/msg (avec cache)
- Opus → coût moyen attendu : ~0,03 €/msg (avec cache)

Marge mensuelle worst-case (quota max atteint) :
- Starter (Sonnet × 60 msg) : 29 € − ~0,5 € = **+28,5 €** (~98 % marge)
- Pro (Opus × 300 msg) : 49 € − ~9 € = **+40 €** (~82 % marge)
- Premium (Opus × 800 msg) : 69 € − ~24 € = **+45 €** (~65 % marge)

Si après quelques semaines de prod la marge réelle diffère significativement, ajuster les quotas dans [lib/rate-limit.ts](lib/rate-limit.ts).

### Branchement Stripe — état actuel

**Côté code** : tout est implémenté.
- `lib/stripe/client.ts` — SDK Stripe (lazy)
- `lib/stripe/plans.ts` — mapping `tier ↔ STRIPE_PRICE_ID_*`
- `lib/supabase/admin.ts` — client Supabase service role pour les writes du webhook
- `/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`
- Boutons pricing cards (landing) → POST `/api/stripe/checkout`
- Bouton "Gérer mon abonnement" (`/account`) → POST `/api/stripe/portal`

**Côté Stripe Dashboard** : à faire (cf section "Setup Stripe" plus bas).

### Variables d'environnement Stripe
À ajouter dans `.env.local` ET dans Vercel (Production + Preview) :
```
STRIPE_SECRET_KEY=sk_test_...        # passer en sk_live_ pour la prod
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # PAS de préfixe NEXT_PUBLIC_, server-only
```

Le `SUPABASE_SERVICE_ROLE_KEY` est trouvable dans Supabase → Project Settings → API → Project API keys → `service_role` (cliquer Reveal). Cette clé **bypasse RLS** — uniquement utilisée côté serveur, jamais loggée, jamais bundlée dans le client.

---

## Configuration Supabase faite

1. **Tables** : `chat_messages`, `roadmaps`, `task_completions` créées avec RLS (cf `schema.sql`)
2. **Email confirmation** : **désactivé** (Authentication → Providers → Email → Confirm email OFF) — pour permettre signup direct sans configurer SMTP
3. **URL Configuration** : Site URL = `https://buisness-ia-coach.vercel.app`, Redirect URLs inclut `https://buisness-ia-coach.vercel.app/**`

**Avant de passer en prod publique réelle**, il faudra :
- Réactiver "Confirm email"
- Configurer un SMTP (Resend gratuit recommandé) dans Supabase → Settings → Auth → SMTP
- Sinon les inscriptions hors localhost sont vulnérables aux fake emails

---

## Features livrées (ordre approximatif)

1. **Fix env vars** : `.env.local` était dans `app/`, déplacé à la racine. URL Supabase corrigée (l'originale était `lnksbgyzc0b1hmuf...` qui n'existe pas).
2. **Chat fonctionnel** avec SDK Anthropic, version `anthropic-version: 2023-06-01` (l'originale `2024-06-01` n'existe pas).
3. **Roadmap personnalisée** : `/api/generate` appelle Claude avec les réponses du quiz et structured outputs (`output_config.format` avec JSON schema).
4. **Streaming phase-par-phase** : la roadmap apparaît au fur et à mesure via `partial-json` côté client. TTFB ~1s.
5. **Mémoire du chat** : l'historique est passé à Claude à chaque tour. Persisté dans `chat_messages` côté serveur après chaque message.
6. **Auth Supabase** : signup/signin email+password, session via cookies (@supabase/ssr), proxy.ts refresh la session sur chaque requête.
7. **Persistance multi-appareil** : chat_messages et roadmap stockés en DB, rechargés au mount.
8. **Système de progression** : table `task_completions`, cases qui persistent, barre de progression globale + compteur par phase. Phases complétées passent en vert.
9. **Auto-coche des tâches par l'IA** : outil custom `mark_task_complete` que Claude appelle quand l'utilisateur dit avoir fini une tâche. UI met à jour les cases en temps réel via metadata streamée.
10. **Web search dans le chat** : tool `web_search_20260209` activé (max 3 recherches par message). Claude cherche les prix actuels, outils, tendances.
11. **Refaire le quiz** : bouton qui efface roadmap + progression + chat, redirige `/quiz?regenerate=1`. Le quiz est pré-rempli avec les anciennes réponses.
12. **6ème question "temps disponible/semaine"** intégrée au prompt pour calibrer les durées des tâches.
13. **Refonte design complète** : palette indigo/purple/pink avec gradient blobs, cards glass-morphism avec contour néon violet, boutons pill arrondis, avatar SVG du coach "Marc".
14. **Section "L'alternative aux formations 2000€"** positionnée après le hero pour adresser l'objection.
15. **i18n FR/EN** : système maison, détection navigateur + switcher manuel, Claude répond dans la bonne langue.
16. **Déploiement Vercel Pro** : runtime Node, maxDuration 60s, 3 env vars en Production+Preview, Supabase URL Configuration mise à jour.

---

## Limitations / gotchas connues

- **Vercel Hobby ne marche pas** : timeout 10s, génération roadmap fait 13-15s, chat avec web search peut faire 15-25s. **Vercel Pro requis** (60s).
- **Edge runtime impossible** : `@anthropic-ai/sdk` importe `node:fs`/`node:path`, donc Node runtime obligé. Si besoin de descendre sur Hobby plus tard : raw `fetch()` vers l'API Anthropic au lieu du SDK.
- **Email confirmation OFF en prod** : c'est un trou de sécurité, à fixer avant tout marketing payant.
- ~~**Pas de gestion des limites par utilisateur**~~ : ✅ rate limiting branché (cf section "Rate limiting & tiers"). Compteur mensuel par user via `usage_counters` + RPC atomique `increment_usage`.
- **Pas de logout des autres devices** : si un compte est compromis, on ne peut pas invalider les sessions à distance facilement.
- **Le SDK Claude tool runner** dans `/api/chat` est une boucle manuelle (max 5 itérations) à cause du tool custom `mark_task_complete`. Si tu modifies la logique tool-use, fais attention au `stop_reason: 'tool_use'`.
- **Lockfile dupliqué** : warning au build car il y a aussi un `package-lock.json` dans `~/leodrilhol/`. Pas bloquant.

---

## Fichiers clés

```
~/Desktop/saas-ai-coach-master/
├── app/
│   ├── page.tsx                    # Homepage (Hero, sections, footer)
│   ├── layout.tsx                  # Root layout avec LanguageProvider
│   ├── globals.css                 # Tailwind v4 + keyframe fadeIn
│   ├── login/page.tsx              # Auth (signup/signin)
│   ├── quiz/page.tsx               # Diagnostic 6 questions
│   ├── roadmap/page.tsx            # Page principale post-auth
│   ├── components/CoachAvatar.tsx  # SVG avatar du coach
│   └── api/
│       ├── generate/route.ts       # Génération roadmap (stream)
│       ├── chat/route.ts           # Chat coach (stream + tools)
│       └── auth/signout/route.ts
├── lib/
│   ├── i18n.tsx                    # Système traductions FR/EN
│   └── supabase/
│       ├── client.ts               # Client browser
│       ├── server.ts               # Client server (cookies)
│       └── proxy.ts                # Helper pour proxy.ts
├── proxy.ts                        # Next.js 16 "middleware" — refresh session
├── schema.sql                      # SQL complet pour Supabase
├── SETUP.md                        # Instructions setup Supabase
├── HANDOFF.md                      # Ce document
├── .env.local                      # NEXT_PUBLIC_SUPABASE_* + CLAUDE_API_KEY
├── package.json
├── next.config.ts
├── tsconfig.json
└── vercel.json
```

---

## Prochaines étapes proposées (par priorité)

### Critique avant un vrai launch

1. **Système d'abonnement** — ✅ code Stripe complet (checkout + portal + webhook). **Reste à faire côté Stripe Dashboard** : créer le compte, créer les 3 Products + Prices récurrents, configurer le webhook endpoint, et renseigner les env vars (cf section "Branchement Stripe").
2. ~~**Rate limiting par user**~~ — ✅ fait. `free` = 10 msg + 1 roadmap / mois, `pro` = illimité. Limites configurables dans `lib/rate-limit.ts`.
3. **SMTP + email confirmation** — Resend gratuit + réactiver Confirm email sur Supabase
4. ~~**Pages légales**~~ — ✅ scaffolding fait (Mentions, CGU/CGV, Confidentialité). Reste à **compléter les placeholders** `[À COMPLÉTER]` (nom légal, adresse, SIRET, TVA, email de contact réel) et à les faire **relire par un avocat/juriste** avant de prendre le premier paiement.

### Améliorations produit

5. **Profil client persistant côté IA** — au-delà de l'historique de chat, l'IA tient des "notes" sur le user qu'elle référence (revenu actuel, blocages récurrents, victoires)
6. **Export PDF de la roadmap** — feature "wow" simple
7. **Check-ins proactifs** — emails programmés "où en es-tu sur cette tâche ?"
8. **Multi-roadmaps** — si l'utilisateur a plusieurs projets

### Tech debt

9. **Initialiser git** dans le dossier local et le sync avec GitHub
10. **Tests E2E** (Playwright) sur les flows critiques
11. **Monitoring** (Sentry, Vercel Analytics) pour voir les erreurs en prod
12. **Migration vers Stripe** si Lemon Squeezy devient trop cher au volume

---

## Décisions en attente (à discuter avec l'utilisateur)

- Modèle de pricing exact (freemium vs trial)
- Niveaux de tier (2 ou 3)
- Provider de paiement (Lemon Squeezy vs Stripe)
- Refonte plus poussée du design ou ship en l'état
- Quand activer "Confirm email" + setup SMTP

---

## Comptes / clés à avoir sous la main

- Compte **Anthropic Console** : pour rotation de la clé API si compromise
- Compte **Supabase** : projet `ifnksbvgzzcebzlvrmzf`, dashboard pour gérer auth, tables, RLS
- Compte **Vercel** : projet `buisness-ia-coach` sous `ldrilhol-creates-projects`, plan Pro actif

---

**Date de cet handoff** : 2026-05-12 (mis à jour : rate limiting + tiers d'abonnement scaffold)
