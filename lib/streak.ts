import type { SupabaseClient } from '@supabase/supabase-js';

export type StreakInfo = {
  currentStreak: number;
  todayDone: boolean;
  lastTaskAt: string | null; // ISO of the most recent completion
  longestStreak: number;     // best streak ever, for "personal best" display
};

/**
 * Compute the user's consecutive-days streak from task_completions.
 *
 * Rules:
 *   - A day counts if there's at least one task_completion for that UTC day
 *   - "currentStreak" = consecutive days ending today OR yesterday
 *     (we tolerate "yesterday" so the streak survives until the user logs
 *     in the next day — otherwise it would reset at midnight)
 *   - Returns 0 if the most recent completion is older than 2 days
 *
 * The query reads up to the last 90 days of completions, which is plenty
 * for a streak of any practical length while staying cheap.
 */
export async function getStreakForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakInfo> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('task_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .gte('completed_at', since)
    .order('completed_at', { ascending: false });

  if (error || !data || data.length === 0) {
    return { currentStreak: 0, todayDone: false, lastTaskAt: null, longestStreak: 0 };
  }

  // Group by UTC day (YYYY-MM-DD)
  const days = new Set<string>();
  for (const row of data) {
    const day = toUtcDay(row.completed_at as string);
    if (day) days.add(day);
  }

  const todayUtc = toUtcDay(new Date().toISOString())!;
  const yesterdayUtc = toUtcDay(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())!;

  const todayDone = days.has(todayUtc);
  const lastTaskAt = (data[0]?.completed_at as string) ?? null;

  // Start counting from the most-recent-anchor day. If today is done, anchor is
  // today. If only yesterday is done, anchor is yesterday (the streak is still
  // alive — user just hasn't logged in yet today). Otherwise streak is broken.
  let anchor: string | null = null;
  if (todayDone) anchor = todayUtc;
  else if (days.has(yesterdayUtc)) anchor = yesterdayUtc;

  let currentStreak = 0;
  if (anchor) {
    let cursor = new Date(`${anchor}T00:00:00.000Z`);
    while (days.has(toUtcDay(cursor.toISOString())!)) {
      currentStreak += 1;
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  // Longest streak ever (over the 90-day window — good enough heuristic)
  const sortedDays = Array.from(days).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDays) {
    if (prev && isNextDay(prev, d)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  return { currentStreak, todayDone, lastTaskAt, longestStreak };
}

function toUtcDay(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isNextDay(prevYmd: string, ymd: string): boolean {
  const prev = new Date(`${prevYmd}T00:00:00.000Z`);
  const next = new Date(prev.getTime() + 24 * 60 * 60 * 1000);
  return toUtcDay(next.toISOString()) === ymd;
}

/**
 * Find the next "today's task" for a user — the first uncompleted task in
 * the first incomplete phase of their most recent roadmap. Returns null if
 * the user has no roadmap, or has finished everything (good problem).
 */
export async function getNextTaskForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ roadmapId: string; phaseIdx: number; taskIdx: number; title: string; phaseName: string } | null> {
  const { data: roadmaps } = await supabase
    .from('roadmaps')
    .select('id, data, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);
  const rm = roadmaps?.[0];
  if (!rm) return null;
  const data = rm.data as {
    phases?: Array<{ name?: string; tasks?: Array<{ title?: string }> }>;
  } | null;
  if (!data?.phases) return null;

  const { data: completions } = await supabase
    .from('task_completions')
    .select('phase_idx, task_idx')
    .eq('roadmap_id', rm.id);
  const done = new Set((completions ?? []).map((c) => `${c.phase_idx}-${c.task_idx}`));

  for (let p = 0; p < data.phases.length; p++) {
    const phase = data.phases[p];
    const tasks = phase?.tasks ?? [];
    for (let t = 0; t < tasks.length; t++) {
      if (!done.has(`${p}-${t}`) && typeof tasks[t]?.title === 'string') {
        return {
          roadmapId: rm.id as string,
          phaseIdx: p,
          taskIdx: t,
          title: tasks[t]!.title!,
          phaseName: phase?.name ?? '',
        };
      }
    }
  }
  return null;
}

/**
 * Tally tasks completed in the last 7 days (UTC). Used by the weekly recap.
 */
export async function getWeeklyTaskCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('task_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', since);
  return count ?? 0;
}
