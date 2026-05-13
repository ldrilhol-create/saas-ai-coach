# Setup — Auth + chat persistence

Before the auth flow works, you need to set up two things in your Supabase project.

## 1. Create the tables + RPC

In the Supabase dashboard:

1. Open your project.
2. Go to **SQL Editor → New query**.
3. Paste the entire contents of `schema.sql` and click **Run**.

This creates `chat_messages`, `roadmaps`, `task_completions`, `user_subscriptions`, `usage_counters` with Row Level Security, plus the `increment_usage(text, int)` RPC used by the rate limiter.

**Re-run `schema.sql` if you pull updates** — it uses `create table if not exists`, `drop policy if exists`, and `create or replace function`, so it's idempotent and safe to re-apply.

## 2. Disable email confirmation (dev only)

For testing in dev, turn off the email confirmation step so signup logs the user in immediately:

1. Supabase dashboard → **Authentication → Providers → Email**.
2. Toggle **Confirm email** to **off**.
3. Save.

For production, re-enable this and configure your own SMTP under **Authentication → Settings** (or use the built-in service with low limits).

## 3. Verify env vars

`.env.local` (at the project root) must contain:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CLAUDE_API_KEY=...
```

Restart `npm run dev` after any change.

## Test flow

1. `http://localhost:3001/quiz` → answer the 5 questions.
2. Click **Generate Roadmap** → if not logged in, you'll land on `/login`.
3. Sign up with any email + a password (≥6 chars).
4. You land back on `/roadmap` — roadmap streams in.
5. Send a few chat messages, then reload the page. Messages persist.
6. Sign out, open another browser/incognito, sign in with the same email — chat is still there.
