'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';

type StreakInfo = {
  currentStreak: number;
  todayDone: boolean;
  lastTaskAt: string | null;
  longestStreak: number;
};

type Props = {
  // Optional: a streak passed in if the parent already has it (avoids a refetch)
  streak?: StreakInfo | null;
  // Visual size — 'sm' for header chips, 'lg' for big widgets
  size?: 'sm' | 'lg';
};

/**
 * Visualises the user's consecutive-days streak. Fetches /api/streak on mount
 * if no streak prop is provided. The 🔥 emoji animates subtly on streaks ≥3.
 */
export function StreakBadge({ streak: streakProp, size = 'sm' }: Props) {
  const { t } = useLang();
  const [streak, setStreak] = useState<StreakInfo | null>(streakProp ?? null);
  const [loading, setLoading] = useState(streakProp === undefined);

  useEffect(() => {
    if (streakProp !== undefined) {
      setStreak(streakProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/streak', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.streak) setStreak(data.streak as StreakInfo);
      } catch {
        // non-fatal — just don't show the badge
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [streakProp]);

  if (loading || !streak) return null;

  const days = streak.currentStreak;
  const isAlive = days > 0;
  const dayLabel = days === 1 ? t.roadmap.streakDay : t.roadmap.streakDays;

  if (size === 'lg') {
    // Big widget for /account page
    return (
      <div className={`relative overflow-hidden rounded-3xl p-6 md:p-7 border ${
        isAlive
          ? 'bg-gradient-to-br from-orange-500/[0.12] to-amber-500/[0.06] border-orange-400/30'
          : 'bg-white/[0.03] border-white/10'
      }`}>
        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">
          {t.roadmap.streakLabel}
        </p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-5xl ${isAlive ? 'animate-pulse' : 'grayscale opacity-40'}`}>🔥</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tracking-tight text-white">{days}</span>
            <span className="text-base text-gray-300 font-medium">{dayLabel}</span>
          </div>
        </div>
        {!isAlive && (
          <p className="text-sm text-gray-400 mt-1">{t.roadmap.streakStart}</p>
        )}
        {streak.longestStreak > days && streak.longestStreak >= 3 && (
          <p className="text-xs text-gray-500 mt-2">
            {t.roadmap.streakBestSuffix.replace('{best}', String(streak.longestStreak))}
          </p>
        )}
      </div>
    );
  }

  // Compact chip for roadmap header
  if (!isAlive) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-200 text-xs font-semibold whitespace-nowrap">
      <span className={days >= 3 ? 'animate-pulse' : ''}>🔥</span>
      <span>{days} {dayLabel}</span>
    </div>
  );
}
