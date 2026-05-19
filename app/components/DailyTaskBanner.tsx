'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';

type NextTask = {
  roadmapId: string;
  phaseIdx: number;
  taskIdx: number;
  title: string;
  phaseName: string;
};

type Props = {
  // Called when the user clicks the "show in roadmap" CTA. Parent scrolls
  // and highlights the task. We pass the phase/task indices so the parent
  // can find the right node.
  onLocate?: (info: { phaseIdx: number; taskIdx: number }) => void;
};

const STORAGE_KEY = 'dailyTaskBannerDismissedDate';

/**
 * Banner shown at the top of /roadmap once per UTC day, surfacing the user's
 * next uncompleted task. Dismissible — the dismiss is remembered for the
 * current day only (localStorage), so it reappears the next morning.
 */
export function DailyTaskBanner({ onLocate }: Props) {
  const { t } = useLang();
  const [task, setTask] = useState<NextTask | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Check if already dismissed today
      const today = toUtcDay(new Date());
      let dismissed: string | null = null;
      try {
        dismissed = localStorage.getItem(STORAGE_KEY);
      } catch {
        // private mode etc — show it anyway
      }
      if (dismissed === today) return;

      try {
        const res = await fetch('/api/streak', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.nextTask?.title) {
          setTask(data.nextTask as NextTask);
          setVisible(true);
        }
      } catch {
        // silent — banner is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, toUtcDay(new Date()));
    } catch {
      // ignore
    }
  };

  if (!visible || !task) return null;

  return (
    <div className="relative z-20 mx-auto max-w-5xl px-4 pt-3">
      <div className="rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-600/15 border border-blue-500/30 shadow-lg shadow-blue-600/10 px-4 py-3.5 flex items-center gap-3 flex-wrap">
        <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg">
          🎯
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-blue-300 font-semibold mb-0.5">
            {t.roadmap.dailyBannerEyebrow}
          </p>
          <p className="text-sm font-semibold text-white truncate">
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => {
              if (onLocate) onLocate({ phaseIdx: task.phaseIdx, taskIdx: task.taskIdx });
              dismiss();
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-colors"
          >
            {t.roadmap.dailyBannerCta}
          </button>
          <button
            onClick={dismiss}
            aria-label={t.roadmap.dailyBannerDismiss}
            className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function toUtcDay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
