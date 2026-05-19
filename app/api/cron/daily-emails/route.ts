import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendAndLog, type EmailType } from '@/lib/emails/send';
import { renderInactivity, renderTrialEnding, renderDailyTask, renderWeeklyRecap } from '@/lib/emails/templates';
import { getStreakForUser, getNextTaskForUser, getWeeklyTaskCount } from '@/lib/streak';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Give Vercel time to scan a few hundred users on a single execution.
// Default is 10s on hobby tier; 60s is the cap on Pro.
export const maxDuration = 60;

// Inactivity windows (in days). We send a reminder when last activity falls
// inside a tight window, NOT just "older than N days" — otherwise the second
// reminder would fire for everyone forever once they crossed J+10.
const INACTIVITY_DAYS_1 = 5;
const INACTIVITY_DAYS_2 = 10;
const WINDOW_HOURS = 36; // tolerate cron drift / missed days

type LastActivityRow = {
  user_id: string;
  email: string;
  last_activity_at: string;        // ISO
  account_created_at: string;      // ISO
};

type RoadmapRow = {
  id: string;
  data: { phases?: Array<{ name?: string; tasks?: Array<{ title?: string }> }> } | null;
  updated_at: string;
};

type SubRow = {
  user_id: string;
  tier: string;
  current_period_end: string | null;
  email_optout: boolean;
};

type LogRow = {
  user_id: string;
  email_type: EmailType;
  sent_at: string;
};

/**
 * GET /api/cron/daily-emails
 * Secured by Bearer token (CRON_SECRET env var). Vercel cron sends the
 * Authorization: Bearer <CRON_SECRET> header automatically.
 *
 * Idempotent: re-running on the same day is safe — sendAndLog has a 24h
 * anti-duplicate guard on (user_id, email_type).
 */
export async function GET(request: Request) {
  // Auth: Vercel cron + manual triggers via curl with the secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const admin = getSupabaseAdmin();
  const results = {
    inactivity_1: { attempted: 0, sent: 0, skipped: 0 },
    inactivity_2: { attempted: 0, sent: 0, skipped: 0 },
    trial_d2: { attempted: 0, sent: 0, skipped: 0 },
    trial_d1: { attempted: 0, sent: 0, skipped: 0 },
    daily_task: { attempted: 0, sent: 0, skipped: 0 },
    weekly_recap: { attempted: 0, sent: 0, skipped: 0 },
    errors: [] as string[],
  };

  // -------- 1) Trial ending (most time-sensitive) --------
  await runTrialEnding(admin, 2, results);
  await runTrialEnding(admin, 1, results);

  // -------- 2) Inactivity reminders --------
  await runInactivity(admin, INACTIVITY_DAYS_1, false, results);
  await runInactivity(admin, INACTIVITY_DAYS_2, true, results);

  // -------- 3) Daily-habit emails (run every day) --------
  await runDailyTask(admin, results);

  // -------- 4) Weekly recap (Sundays only — UTC) --------
  if (new Date().getUTCDay() === 0) {
    await runWeeklyRecap(admin, results);
  }

  return Response.json({ ok: true, ranAt: new Date().toISOString(), results });
}

// ============================================================
// Trial ending
// ============================================================

async function runTrialEnding(
  admin: ReturnType<typeof getSupabaseAdmin>,
  daysLeft: 1 | 2,
  results: ReturnType<typeof emptyResults>['_inferred']
): Promise<void> {
  const emailType: EmailType = daysLeft === 2 ? 'trial_d2' : 'trial_d1';
  const bucket = results[emailType];

  // Window: current_period_end falls in [now + (daysLeft - 0.5)*24h, now + (daysLeft + 0.5)*24h]
  // i.e. ~12h around the target.
  const now = Date.now();
  const halfDay = 12 * 60 * 60 * 1000;
  const start = new Date(now + daysLeft * 24 * 60 * 60 * 1000 - halfDay).toISOString();
  const end = new Date(now + daysLeft * 24 * 60 * 60 * 1000 + halfDay).toISOString();

  // Get all trial users whose trial ends in the window AND who haven't opted out.
  const { data: subs, error } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, current_period_end, email_optout')
    .eq('tier', 'trial')
    .eq('email_optout', false)
    .gte('current_period_end', start)
    .lte('current_period_end', end)
    .returns<SubRow[]>();

  if (error) {
    results.errors.push(`trial_d${daysLeft}_query:${error.message}`);
    return;
  }
  if (!subs || subs.length === 0) return;

  // Fetch emails in one query
  const userIds = subs.map((s) => s.user_id);
  const emailsByUser = await fetchEmails(admin, userIds);

  for (const sub of subs) {
    bucket.attempted += 1;
    const email = emailsByUser.get(sub.user_id);
    if (!email) {
      bucket.skipped += 1;
      continue;
    }

    const { subject, html, text } = renderTrialEnding({
      userId: sub.user_id,
      locale: 'fr', // TODO: store user locale; default fr for now (matches site default)
      daysLeft,
    });

    const r = await sendAndLog({
      to: email,
      userId: sub.user_id,
      type: emailType,
      subject,
      html,
      text,
    });
    if (r.sent) bucket.sent += 1;
    else bucket.skipped += 1;
  }
}

// ============================================================
// Inactivity reminders
// ============================================================

async function runInactivity(
  admin: ReturnType<typeof getSupabaseAdmin>,
  days: number,
  isSecondReminder: boolean,
  results: ReturnType<typeof emptyResults>['_inferred']
): Promise<void> {
  const emailType: EmailType = isSecondReminder ? 'inactivity_2' : 'inactivity_1';
  const bucket = results[emailType];

  // Window: last_activity_at in [now - (days + window/24)d, now - (days - window/24)d]
  // i.e. a tight ~36h band around exactly N days ago.
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const halfWindow = (WINDOW_HOURS / 2) * 60 * 60 * 1000;
  const start = new Date(now - days * dayMs - halfWindow).toISOString();
  const end = new Date(now - days * dayMs + halfWindow).toISOString();

  // Pull candidates from the user_last_activity view (filter on the window).
  const { data: activeRows, error } = await admin
    .from('user_last_activity')
    .select('user_id, email, last_activity_at, account_created_at')
    .gte('last_activity_at', start)
    .lte('last_activity_at', end)
    .returns<LastActivityRow[]>();
  if (error) {
    results.errors.push(`inactivity_${days}d_query:${error.message}`);
    return;
  }
  if (!activeRows || activeRows.length === 0) return;

  // Only target users who are still in trial OR on a paid plan (skip expired).
  const userIds = activeRows.map((r) => r.user_id);
  const subsByUser = await fetchSubsByUser(admin, userIds);

  // For the second reminder, also check that the FIRST reminder went out for
  // this user (else we don't escalate).
  let firstRemindersByUser = new Map<string, boolean>();
  if (isSecondReminder) {
    const { data: logs } = await admin
      .from('email_log')
      .select('user_id, email_type, sent_at')
      .in('user_id', userIds)
      .eq('email_type', 'inactivity_1')
      .returns<LogRow[]>();
    firstRemindersByUser = new Map((logs ?? []).map((l) => [l.user_id, true]));
  }

  for (const row of activeRows) {
    bucket.attempted += 1;
    const sub = subsByUser.get(row.user_id);
    if (!sub) { bucket.skipped += 1; continue; }
    if (sub.email_optout) { bucket.skipped += 1; continue; }

    // Skip users whose subscription has fully expired (trial expired + no paid plan):
    // current_period_end < now AND tier === 'trial' → there's nothing for them
    // to come back to until they upgrade. The trial_d2/d1 emails handle that case.
    if (sub.tier === 'trial' && sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
      bucket.skipped += 1;
      continue;
    }

    if (isSecondReminder && !firstRemindersByUser.get(row.user_id)) {
      // Don't escalate to reminder #2 if reminder #1 was never sent.
      bucket.skipped += 1;
      continue;
    }

    // Look up the user's active roadmap and find the next uncompleted task.
    // renderInactivity only needs the task title, so extract it from the
    // richer struct returned by getNextTaskForUser.
    const nextTaskInfo = await getNextTaskForUser(admin, row.user_id);
    const nextTask = nextTaskInfo?.title ?? null;

    const daysSince = Math.round((now - new Date(row.last_activity_at).getTime()) / dayMs);
    const { subject, html, text } = renderInactivity({
      userId: row.user_id,
      locale: 'fr',
      nextTask,
      daysSinceActivity: daysSince,
      isSecondReminder,
    });

    const r = await sendAndLog({
      to: row.email,
      userId: row.user_id,
      type: emailType,
      subject,
      html,
      text,
    });
    if (r.sent) bucket.sent += 1;
    else bucket.skipped += 1;
  }
}

// ============================================================
// Daily-task email — sent every morning to active users who have a
// roadmap with at least one uncompleted task AND haven't already
// completed a task today (no point pinging users who are already on it).
// ============================================================

async function runDailyTask(
  admin: ReturnType<typeof getSupabaseAdmin>,
  results: ReturnType<typeof emptyResults>['_inferred']
): Promise<void> {
  const bucket = results.daily_task;

  // Eligible users: non-expired subscription, not opted out. We start from
  // user_subscriptions because that's already filtered to "real users".
  const { data: subs, error } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, current_period_end, email_optout')
    .eq('email_optout', false)
    .returns<SubRow[]>();
  if (error) {
    results.errors.push(`daily_task_query:${error.message}`);
    return;
  }
  if (!subs || subs.length === 0) return;

  const now = Date.now();
  const userIds: string[] = [];
  for (const sub of subs) {
    // Skip expired trials — those get the trial-ending emails instead.
    if (sub.tier === 'trial' && sub.current_period_end && new Date(sub.current_period_end).getTime() < now) continue;
    userIds.push(sub.user_id);
  }
  if (userIds.length === 0) return;

  const emailsByUser = await fetchEmails(admin, userIds);

  for (const userId of userIds) {
    bucket.attempted += 1;
    const email = emailsByUser.get(userId);
    if (!email) { bucket.skipped += 1; continue; }

    // Find their next task. If none → skip (welcome email handles users
    // who haven't generated a roadmap yet).
    const nextTask = await getNextTaskForUser(admin, userId);
    if (!nextTask) { bucket.skipped += 1; continue; }

    // Skip if user already completed a task today — they're already
    // engaged, no need to nudge.
    const streak = await getStreakForUser(admin, userId);
    if (streak.todayDone) { bucket.skipped += 1; continue; }

    const { subject, html, text } = renderDailyTask({
      userId,
      locale: 'fr',
      taskTitle: nextTask.title,
      phaseName: nextTask.phaseName,
      currentStreak: streak.currentStreak,
    });

    const r = await sendAndLog({
      to: email,
      userId,
      type: 'daily_task',
      subject,
      html,
      text,
    });
    if (r.sent) bucket.sent += 1;
    else bucket.skipped += 1;
  }
}

// ============================================================
// Weekly recap — Sunday only. Personalized stats + next focus.
// ============================================================

async function runWeeklyRecap(
  admin: ReturnType<typeof getSupabaseAdmin>,
  results: ReturnType<typeof emptyResults>['_inferred']
): Promise<void> {
  const bucket = results.weekly_recap;

  const { data: subs, error } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, current_period_end, email_optout')
    .eq('email_optout', false)
    .returns<SubRow[]>();
  if (error) {
    results.errors.push(`weekly_recap_query:${error.message}`);
    return;
  }
  if (!subs || subs.length === 0) return;

  const now = Date.now();
  const userIds: string[] = [];
  for (const sub of subs) {
    if (sub.tier === 'trial' && sub.current_period_end && new Date(sub.current_period_end).getTime() < now) continue;
    userIds.push(sub.user_id);
  }
  if (userIds.length === 0) return;

  const emailsByUser = await fetchEmails(admin, userIds);

  for (const userId of userIds) {
    bucket.attempted += 1;
    const email = emailsByUser.get(userId);
    if (!email) { bucket.skipped += 1; continue; }

    const [tasksDone, streak, nextTask] = await Promise.all([
      getWeeklyTaskCount(admin, userId),
      getStreakForUser(admin, userId),
      getNextTaskForUser(admin, userId),
    ]);

    // If the user has done zero tasks AND has no roadmap yet, skip
    // (welcome / inactivity emails are more appropriate for that state).
    if (tasksDone === 0 && !nextTask) { bucket.skipped += 1; continue; }

    const { subject, html, text } = renderWeeklyRecap({
      userId,
      locale: 'fr',
      tasksDoneThisWeek: tasksDone,
      currentStreak: streak.currentStreak,
      nextTaskTitle: nextTask?.title ?? null,
    });

    const r = await sendAndLog({
      to: email,
      userId,
      type: 'weekly_recap',
      subject,
      html,
      text,
    });
    if (r.sent) bucket.sent += 1;
    else bucket.skipped += 1;
  }
}

// ============================================================
// Helpers
// ============================================================

async function fetchEmails(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  // The auth admin API is the only way to read user emails server-side.
  // We page through them with a single listUsers call (default 50/page);
  // for now we assume daily-emails handles < 1000 users per run.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data?.users) return new Map();
  const wanted = new Set(userIds);
  const map = new Map<string, string>();
  for (const u of data.users) {
    if (u.email && wanted.has(u.id)) map.set(u.id, u.email);
  }
  return map;
}

async function fetchSubsByUser(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[]
): Promise<Map<string, SubRow>> {
  if (userIds.length === 0) return new Map();
  const { data } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, current_period_end, email_optout')
    .in('user_id', userIds)
    .returns<SubRow[]>();
  return new Map((data ?? []).map((s) => [s.user_id, s]));
}

// Helper to keep TS happy on the results object (we want the per-bucket type).
function emptyResults() {
  return {
    _inferred: {
      inactivity_1: { attempted: 0, sent: 0, skipped: 0 },
      inactivity_2: { attempted: 0, sent: 0, skipped: 0 },
      trial_d2: { attempted: 0, sent: 0, skipped: 0 },
      trial_d1: { attempted: 0, sent: 0, skipped: 0 },
      daily_task: { attempted: 0, sent: 0, skipped: 0 },
      weekly_recap: { attempted: 0, sent: 0, skipped: 0 },
      errors: [] as string[],
    },
  };
}
