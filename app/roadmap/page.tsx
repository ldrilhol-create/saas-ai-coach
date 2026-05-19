'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parse, Allow } from 'partial-json';
import posthog from 'posthog-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CoachAvatar } from '@/app/components/CoachAvatar';
import { UserAvatar } from '@/app/components/UserAvatar';
import { StreakBadge } from '@/app/components/StreakBadge';
import { DailyTaskBanner } from '@/app/components/DailyTaskBanner';
import { useLang, LanguageSwitcher } from '@/lib/i18n';

type Task = { title?: string; duration?: string };
type Phase = { phase?: number; name?: string; duration?: string; tasks?: Task[] };
type Roadmap = { title?: string; phases?: Phase[] };
type RoadmapMeta = { id: string; name: string; created_at: string };
type ChatMsg = { role: 'user' | 'assistant'; content: string };

const ACTIVE_ROADMAP_STORAGE_KEY = 'activeRoadmapId';

type Tier = 'trial' | 'starter' | 'pro' | 'premium';
type UsageCounter = { used: number; limit: number };
type Usage = {
  tier: Tier;
  isExpired: boolean;
  period: string;
  messages: UsageCounter;
  roadmaps: UsageCounter;
};

type LimitHit = {
  kind: 'message' | 'roadmap' | 'refine';
  limit: number;
  tier: Tier;
  isExpired: boolean;
};

const ERROR_SENTINEL = '\n__ERROR__';
const LAST_USER_STORAGE_KEY = 'lastSeenUserId';
const taskKey = (phaseIdx: number, taskIdx: number) => `${phaseIdx}-${taskIdx}`;

export default function RoadmapPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { locale, t } = useLang();

  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completions, setCompletions] = useState<Set<string>>(new Set());

  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sending, setSending] = useState(false);

  const [usage, setUsage] = useState<Usage | null>(null);
  const [limitHit, setLimitHit] = useState<LimitHit | null>(null);
  const [pdfLocked, setPdfLocked] = useState(false);

  // "Refine my roadmap" modal — lets a user evolve their roadmap based on
  // what they've learned since the original quiz, without burning a quota
  // slot. The 3 fields mirror /api/roadmap/refine.
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineQ1, setRefineQ1] = useState('');
  const [refineQ2, setRefineQ2] = useState('');
  const [refineQ3, setRefineQ3] = useState('');
  const [refineSubmitting, setRefineSubmitting] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const [roadmaps, setRoadmaps] = useState<RoadmapMeta[]>([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canExportPdf = usage?.tier === 'pro' || usage?.tier === 'premium';

  const handleExportPdf = () => {
    // Track every click (with whether the user has access) — this gives us
    // both a "PDF feature interest" signal AND a "paywall hit" signal.
    if (posthog.__loaded) {
      posthog.capture('pdf_export_clicked', {
        tier: usage?.tier ?? 'unknown',
        has_access: canExportPdf,
      });
    }
    if (!canExportPdf) {
      setPdfLocked(true);
      return;
    }
    if (!activeRoadmapId) return;
    window.open(`/roadmap/print?id=${encodeURIComponent(activeRoadmapId)}`, '_blank');
  };

  // Loads the roadmap data + chat history + completions for a specific roadmap.
  // Used both on initial mount and when the user switches between roadmaps.
  const loadRoadmapData = useCallback(
    async (roadmapId: string) => {
      const [roadmapResult, historyResult, completionsResult] = await Promise.all([
        supabase
          .from('roadmaps')
          .select('data, quiz_answers')
          .eq('id', roadmapId)
          .maybeSingle(),
        supabase
          .from('chat_messages')
          .select('role, content')
          .eq('roadmap_id', roadmapId)
          .order('created_at', { ascending: true }),
        supabase
          .from('task_completions')
          .select('phase_idx, task_idx')
          .eq('roadmap_id', roadmapId),
      ]);

      if (roadmapResult.data?.data) {
        setRoadmap(roadmapResult.data.data as Roadmap);
        if (roadmapResult.data.quiz_answers) {
          try {
            localStorage.setItem(
              'quizAnswers',
              JSON.stringify(roadmapResult.data.quiz_answers)
            );
          } catch {
            // ignore
          }
        }
      } else {
        setRoadmap(null);
      }

      if (!historyResult.error && historyResult.data) {
        setChat(historyResult.data as ChatMsg[]);
      } else {
        setChat([]);
      }
      setHistoryLoaded(true);

      if (!completionsResult.error && completionsResult.data) {
        setCompletions(
          new Set(completionsResult.data.map((c) => taskKey(c.phase_idx, c.task_idx)))
        );
      } else {
        setCompletions(new Set());
      }
    },
    [supabase]
  );

  const refreshRoadmapsList = useCallback(async (): Promise<RoadmapMeta[]> => {
    try {
      const res = await fetch('/api/roadmaps', { cache: 'no-store' });
      if (!res.ok) return [];
      const data = (await res.json()) as { roadmaps: RoadmapMeta[] };
      setRoadmaps(data.roadmaps ?? []);
      return data.roadmaps ?? [];
    } catch {
      return [];
    }
  }, []);

  const persistActiveRoadmap = (id: string | null) => {
    setActiveRoadmapId(id);
    try {
      if (id) localStorage.setItem(ACTIVE_ROADMAP_STORAGE_KEY, id);
      else localStorage.removeItem(ACTIVE_ROADMAP_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const switchRoadmap = async (id: string) => {
    if (id === activeRoadmapId) {
      setSwitcherOpen(false);
      return;
    }
    persistActiveRoadmap(id);
    setSwitcherOpen(false);
    setRoadmap(null);
    setChat([]);
    setCompletions(new Set());
    setHistoryLoaded(false);
    await loadRoadmapData(id);
  };

  const deleteRoadmap = async (id: string) => {
    if (!confirm(t.roadmap.projectSwitcherConfirmDelete)) return;
    const res = await fetch(`/api/roadmaps?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return;
    const remaining = await refreshRoadmapsList();
    if (id === activeRoadmapId) {
      if (remaining.length > 0) {
        await switchRoadmap(remaining[0].id);
      } else {
        persistActiveRoadmap(null);
        router.replace('/quiz');
      }
    }
  };

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Usage;
        setUsage(data);
        // Keep PostHog in sync with the user's current tier so all
        // events/recordings can be segmented by tier and group analytics work.
        if (posthog.__loaded && data.tier) {
          posthog.group('subscription_tier', data.tier);
          // Update the user property too (lighter than full identify call)
          posthog.setPersonProperties({ tier: data.tier });
        }
      }
    } catch {
      // non-fatal — UI just won't show counters
    }
  }, []);

  const fetchRoadmap = useCallback(async () => {
    setStreaming(true);
    setError(null);
    setRoadmap(null);
    setCompletions(new Set());
    setChat([]);

    try {
      const answers = JSON.parse(localStorage.getItem('quizAnswers') || '{}');
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, locale }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setLimitHit({
          kind: 'roadmap',
          limit: typeof data?.limit === 'number' ? data.limit : 1,
          tier: (['trial', 'starter', 'pro', 'premium'] as const).includes(data?.tier)
            ? (data.tier as Tier)
            : 'trial',
          isExpired: data?.isExpired === true,
        });
        refreshUsage();
        return;
      }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      // The new roadmap's id is sent in a custom header — track it as active
      // so chat/completions persisted during streaming attach to the right row.
      const newRoadmapId = res.headers.get('X-Roadmap-Id');
      if (newRoadmapId) {
        persistActiveRoadmap(newRoadmapId);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const errIdx = buffer.indexOf(ERROR_SENTINEL);
        if (errIdx >= 0) {
          throw new Error(buffer.slice(errIdx + ERROR_SENTINEL.length).trim() || 'Stream error');
        }

        try {
          const partial = parse(buffer, Allow.ALL) as Roadmap;
          if (partial && typeof partial === 'object') {
            setRoadmap(partial);
          }
        } catch {
          // not enough tokens yet
        }
      }

      // Refresh the list so the new roadmap shows up in the switcher with its
      // final (Claude-generated) title.
      await refreshRoadmapsList();
      // Funnel milestone — user reached their first "aha" moment.
      posthog.capture('roadmap_generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStreaming(false);
      refreshUsage();
    }
  }, [locale, refreshUsage, refreshRoadmapsList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/login?next=/roadmap');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setAuthChecked(true);
      refreshUsage();

      // If a different user signed in (account switch in the same browser),
      // wipe localStorage so the new user doesn't inherit the previous user's
      // quiz answers (which would auto-trigger a roadmap generation with the
      // wrong data) or active project id.
      try {
        const lastUserId = localStorage.getItem(LAST_USER_STORAGE_KEY);
        if (lastUserId && lastUserId !== user.id) {
          localStorage.removeItem('quizAnswers');
          localStorage.removeItem(ACTIVE_ROADMAP_STORAGE_KEY);
        }
        localStorage.setItem(LAST_USER_STORAGE_KEY, user.id);
      } catch {
        // ignore — localStorage might be unavailable in private mode
      }

      const shouldRegenerate =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('regenerate') === '1';

      if (shouldRegenerate) {
        window.history.replaceState({}, '', '/roadmap');
        setHistoryLoaded(true);
        fetchRoadmap();
        return;
      }

      // Multi-roadmap: list user's roadmaps, then activate one (saved choice
      // first, otherwise the most recent). Empty list → push to /quiz.
      const list = await refreshRoadmapsList();
      if (cancelled) return;

      if (list.length === 0) {
        let hasLocalAnswers = false;
        try {
          const raw = localStorage.getItem('quizAnswers');
          hasLocalAnswers = !!raw && raw !== '{}' && Object.keys(JSON.parse(raw)).length > 0;
        } catch {
          hasLocalAnswers = false;
        }
        if (!hasLocalAnswers) {
          router.replace('/quiz');
          return;
        }
        fetchRoadmap();
        return;
      }

      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem(ACTIVE_ROADMAP_STORAGE_KEY);
      } catch {
        savedId = null;
      }
      const activeId = (savedId && list.some((r) => r.id === savedId)) ? savedId : list[0].id;
      persistActiveRoadmap(activeId);
      await loadRoadmapData(activeId);
    })();
    return () => { cancelled = true; };
  }, [router, supabase, fetchRoadmap, refreshUsage, refreshRoadmapsList, loadRoadmapData]);

  const toggleTask = async (phaseIdx: number, taskIdx: number) => {
    if (!userId || !activeRoadmapId) return;
    const key = taskKey(phaseIdx, taskIdx);
    const wasCompleted = completions.has(key);

    setCompletions((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(key);
      else next.add(key);
      return next;
    });

    if (wasCompleted) {
      const { error: delErr } = await supabase
        .from('task_completions')
        .delete()
        .eq('roadmap_id', activeRoadmapId)
        .eq('phase_idx', phaseIdx)
        .eq('task_idx', taskIdx);
      if (delErr) console.error('Toggle off failed:', delErr);
    } else {
      const { error: insErr } = await supabase
        .from('task_completions')
        .insert({
          user_id: userId,
          roadmap_id: activeRoadmapId,
          phase_idx: phaseIdx,
          task_idx: taskIdx,
        });
      if (insErr) console.error('Toggle on failed:', insErr);

      // ---- PostHog: granular engagement tracking ----
      // task_completed → fires every time the user checks something off,
      // enriched with context to allow segmentation (which phase, which
      // task, how long since signup).
      if (posthog.__loaded) {
        const phase = roadmap?.phases?.[phaseIdx];
        const task = phase?.tasks?.[taskIdx];
        posthog.capture('task_completed', {
          phase_idx: phaseIdx,
          task_idx: taskIdx,
          phase_name: phase?.name ?? null,
          task_title: task?.title ?? null,
        });

        // phase_completed → fires only when this completion closes out the
        // entire phase. Big retention milestone (the "wow, I finished a chunk"
        // moment). Use the next snapshot of completions to detect.
        const totalTasksInPhase = phase?.tasks?.length ?? 0;
        if (totalTasksInPhase > 0) {
          // Count completions in this phase including the one we just added.
          let doneInPhase = 1; // +1 for the toggle we just performed
          for (let i = 0; i < totalTasksInPhase; i++) {
            if (i !== taskIdx && completions.has(taskKey(phaseIdx, i))) doneInPhase += 1;
          }
          if (doneInPhase === totalTasksInPhase) {
            posthog.capture('phase_completed', {
              phase_idx: phaseIdx,
              phase_name: phase?.name ?? null,
              tasks_in_phase: totalTasksInPhase,
            });
          }
        }

        // streak_milestone → fire when the streak hits 3, 7, 14, 30, 60, 100.
        // We re-fetch /api/streak to get the current value (cheap, server reads
        // it fast from task_completions). Async/fire-and-forget.
        const MILESTONES = [3, 7, 14, 30, 60, 100];
        fetch('/api/streak', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const streak = data?.streak?.currentStreak as number | undefined;
            if (streak && MILESTONES.includes(streak)) {
              posthog.capture('streak_milestone', { streak });
            }
          })
          .catch(() => { /* non-fatal */ });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;
    const userMessage = message;
    const historyBeforeNew = chat;
    // Track the first message of a fresh chat as a separate event — this
    // is the activation moment in the funnel.
    if (chat.length === 0) {
      posthog.capture('chat_first_message');
    }
    posthog.capture('chat_message_sent', { history_length: chat.length });
    setMessage('');
    setChat((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ]);
    setSending(true);

    const updateLastAssistant = (content: string) => {
      setChat((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content };
        return next;
      });
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: historyBeforeNew,
          roadmap,
          roadmapId: activeRoadmapId,
          locale,
        }),
      });
      if (response.status === 401) {
        router.replace('/login?next=/roadmap');
        return;
      }
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setChat((prev) => prev.slice(0, -2));
        setMessage(userMessage);
        setLimitHit({
          kind: 'message',
          limit: typeof data?.limit === 'number' ? data.limit : 10,
          tier: (['trial', 'starter', 'pro', 'premium'] as const).includes(data?.tier)
            ? (data.tier as Tier)
            : 'trial',
          isExpired: data?.isExpired === true,
        });
        refreshUsage();
        return;
      }
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let visibleText = '';
      let metaApplied = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const errIdx = buffer.indexOf('\n__ERROR__');
        if (errIdx >= 0) {
          throw new Error(buffer.slice(errIdx + '\n__ERROR__'.length).trim() || 'Stream error');
        }

        const metaIdx = buffer.indexOf('\n__META__');
        if (metaIdx >= 0) {
          visibleText = buffer.slice(0, metaIdx);
          if (!metaApplied) {
            metaApplied = true;
            try {
              const meta = JSON.parse(buffer.slice(metaIdx + '\n__META__'.length)) as {
                completed?: Array<{ phase_idx: number; task_idx: number }>;
              };
              if (Array.isArray(meta.completed) && meta.completed.length > 0) {
                setCompletions((prev) => {
                  const next = new Set(prev);
                  for (const c of meta.completed!) {
                    next.add(taskKey(c.phase_idx, c.task_idx));
                  }
                  return next;
                });
              }
            } catch {
              // ignore
            }
          }
        } else {
          visibleText = buffer;
        }

        updateLastAssistant(visibleText);
      }
    } catch (err) {
      updateLastAssistant(
        err instanceof Error
          ? `${t.roadmap.errorChatPrefix} ${err.message}`
          : t.roadmap.errorChat
      );
    } finally {
      setSending(false);
      refreshUsage();
    }
  };

  const handleClearChat = async () => {
    if (!activeRoadmapId) return;
    if (!confirm(t.roadmap.confirmClearChat)) return;
    const { error: delErr } = await supabase
      .from('chat_messages')
      .delete()
      .eq('roadmap_id', activeRoadmapId);
    if (!delErr) setChat([]);
  };

  const handleRegenerate = () => {
    if (!confirm(t.roadmap.confirmRegenerate)) return;
    fetchRoadmap();
  };

  const handleRetakeQuiz = () => {
    if (!confirm(t.roadmap.confirmRetake)) return;
    router.push('/quiz');
  };

  // Refine the current roadmap based on the user's evolution. Streams the new
  // version into the existing roadmap row (no new project, no quota cost).
  const handleRefineSubmit = async () => {
    if (refineSubmitting) return;
    const changes = refineQ1.trim();
    const currentIdea = refineQ2.trim();
    const blocker = refineQ3.trim();
    if (!changes && !currentIdea && !blocker) {
      setRefineError(t.roadmap.refineErrorEmpty);
      return;
    }
    if (!activeRoadmapId) {
      setRefineError('No active roadmap');
      return;
    }

    setRefineError(null);
    setRefineSubmitting(true);
    // Close the modal early so the user sees the streaming roadmap appear
    // in real time underneath (better UX than a long modal spinner).
    setRefineOpen(false);
    setStreaming(true);
    setRoadmap(null);
    setCompletions(new Set());

    try {
      if (posthog.__loaded) {
        posthog.capture('roadmap_refined', {
          has_changes: !!changes,
          has_idea: !!currentIdea,
          has_blocker: !!blocker,
        });
      }

      const res = await fetch('/api/roadmap/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId: activeRoadmapId,
          changes,
          currentIdea,
          blocker,
          locale,
        }),
      });

      // Refine quota hit — show the same upgrade modal as messages/roadmaps,
      // with a "refine" kind so the copy can be tailored.
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setLimitHit({
          kind: 'refine',
          limit: typeof data?.limit === 'number' ? data.limit : 3,
          tier: (['trial', 'starter', 'pro', 'premium'] as const).includes(data?.tier)
            ? (data.tier as Tier)
            : 'trial',
          isExpired: data?.isExpired === true,
        });
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const errIdx = buffer.indexOf(ERROR_SENTINEL);
        if (errIdx >= 0) {
          throw new Error(buffer.slice(errIdx + ERROR_SENTINEL.length).trim() || 'Stream error');
        }

        try {
          const partial = parse(buffer, Allow.ALL) as Roadmap;
          if (partial && typeof partial === 'object') {
            setRoadmap(partial);
          }
        } catch {
          // not enough tokens yet
        }
      }

      // Reset local form fields for next time + refresh the projects list
      // so the (possibly renamed) roadmap shows the new title in the switcher.
      setRefineQ1('');
      setRefineQ2('');
      setRefineQ3('');
      await refreshRoadmapsList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStreaming(false);
      setRefineSubmitting(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  const phases = roadmap?.phases ?? [];
  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length ?? 0), 0);
  const completedTasks = completions.size;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const phaseCompletedCount = (phaseIdx: number) => {
    const tasks = phases[phaseIdx]?.tasks ?? [];
    return tasks.reduce(
      (n, _, idx) => (completions.has(taskKey(phaseIdx, idx)) ? n + 1 : n),
      0
    );
  };
  const isPhaseDone = (phaseIdx: number) => {
    const tasks = phases[phaseIdx]?.tasks ?? [];
    return tasks.length > 0 && phaseCompletedCount(phaseIdx) === tasks.length;
  };

  const showInitialLoading = streaming && !roadmap?.title;
  const showError = error && !roadmap?.phases?.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-600/10 to-blue-800/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-blue-800/5 blur-3xl" />
      </div>

      <header className="relative z-30 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/30 flex-shrink-0">
              AI
            </div>
            <span className="font-bold text-lg tracking-tight hidden md:inline">{t.roadmap.headerTitle}</span>
            {/* Streak chip — only visible when streak > 0, compact in header */}
            <StreakBadge size="sm" />

            {roadmaps.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-400 transition-all text-sm font-medium max-w-[240px]"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="truncate">
                    {roadmaps.find((r) => r.id === activeRoadmapId)?.name ?? t.roadmap.projectSwitcherAllProjects}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {switcherOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setSwitcherOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 z-30 w-72 max-h-96 overflow-y-auto bg-gradient-to-br from-[#1a0b2e] to-[#0a0118] border border-white/10 rounded-2xl shadow-2xl shadow-blue-600/20 backdrop-blur-sm">
                      <div className="p-1.5">
                        {roadmaps.map((r) => {
                          const isActive = r.id === activeRoadmapId;
                          return (
                            <div
                              key={r.id}
                              className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                                isActive ? 'bg-blue-600/15' : 'hover:bg-white/5'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => switchRoadmap(r.id)}
                                className="flex-1 text-left text-sm truncate"
                                title={r.name}
                              >
                                {isActive && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 align-middle" />
                                )}
                                {r.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRoadmap(r.id)}
                                title={t.roadmap.projectSwitcherDelete}
                                aria-label={t.roadmap.projectSwitcherDelete}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-white/5 p-1.5">
                        <button
                          type="button"
                          onClick={() => { setSwitcherOpen(false); router.push('/quiz'); }}
                          className="w-full text-left text-sm px-2.5 py-2 rounded-xl hover:bg-blue-600/15 text-blue-300 font-medium"
                        >
                          {t.roadmap.projectSwitcherNew}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {usage && (() => {
              const tierLabel =
                usage.tier === 'premium' ? t.roadmap.tierPremium
                : usage.tier === 'pro' ? t.roadmap.tierPro
                : usage.tier === 'starter' ? t.roadmap.tierStarter
                : t.roadmap.tierTrial;
              return (
                <span
                  className="hidden md:inline px-3 py-2 rounded-full bg-white/[0.03] border border-white/10 text-xs text-gray-300"
                  title={tierLabel}
                >
                  <span className="text-gray-500 mr-1.5">{tierLabel} ·</span>
                  {usage.messages.used}/{usage.messages.limit} msg
                </span>
              );
            })()}
            <LanguageSwitcher />
            <button
              onClick={handleExportPdf}
              disabled={streaming || !roadmap?.phases?.length}
              title={canExportPdf ? t.pdfExport.tooltipAvailable : t.pdfExport.tooltipLocked}
              className="relative px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden lg:inline">{t.pdfExport.buttonLabel}</span>
              {!canExportPdf && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-500 to-blue-700 text-white">
                  PRO
                </span>
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={streaming}
                aria-label="Menu"
                title="Menu"
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="5" cy="12" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-30 w-60 bg-gradient-to-br from-[#1a0b2e] to-[#0a0118] border border-white/10 rounded-2xl shadow-2xl shadow-blue-600/20 backdrop-blur-sm p-1.5">
                    {/* Primary action — refine. Most users will pick this rather
                        than fully regenerating. Highlighted with a blue accent. */}
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setRefineOpen(true); }}
                      disabled={streaming || !activeRoadmapId}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed mb-1"
                    >
                      <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="font-semibold">{t.roadmap.refineButton}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); handleRegenerate(); }}
                      disabled={streaming}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t.roadmap.regenerate}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); handleRetakeQuiz(); }}
                      disabled={streaming}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5 disabled:opacity-40"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t.roadmap.retakeDiagnostic}
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); router.push('/'); }}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {t.roadmap.home}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => router.push('/account')}
              title={t.account.avatarTitle}
              aria-label={t.account.avatarTitle}
              className="rounded-full ring-1 ring-white/10 hover:ring-blue-500 transition-all hover:scale-105"
            >
              <UserAvatar email={userEmail} size="sm" />
            </button>
          </div>
        </div>
      </header>

      {/* Daily task banner — appears once per day with the user's next
          uncompleted task. Dismissible. Hidden during initial load / errors
          to avoid layout flash. */}
      {!showInitialLoading && !showError && roadmap && (
        <DailyTaskBanner />
      )}

      {showInitialLoading ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 px-4 py-32">
          <div className="animate-spin rounded-full h-14 w-14 border-2 border-indigo-400 border-t-transparent" />
          <p className="text-xl font-bold">{t.roadmap.loadingTitle}</p>
          <p className="text-gray-400 text-sm">{t.roadmap.loadingSub}</p>
        </div>
      ) : showError ? (
        <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-4 py-32 text-center">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 max-w-md">
            <p className="text-red-300 text-sm">{t.roadmap.errorPrefix} {error}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={fetchRoadmap}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.03]"
            >
              {t.roadmap.retry}
            </button>
            <button
              onClick={() => router.push('/quiz')}
              className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {t.roadmap.redoQuiz}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-2xl shadow-blue-600/5">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{roadmap?.title || ''}</h2>
                {streaming && (
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-400" />
                  </div>
                )}
              </div>

              {totalTasks > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-baseline text-sm mb-2">
                    <span className="text-gray-300 font-medium">
                      {t.roadmap.progress} <span className="text-white">{completedTasks}</span> / {totalTasks} {t.roadmap.tasks}
                    </span>
                    <span className="text-indigo-300 font-bold text-base">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-blue-600 to-blue-800 transition-all duration-500 ease-out shadow-lg shadow-blue-600/30"
                      style={{ width: `${progressPct}%` }}
                      aria-label={`${progressPct}%`}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {phases.map((phase, phaseIdx) => {
                  const taskCount = phase.tasks?.length ?? 0;
                  const done = phaseCompletedCount(phaseIdx);
                  const phaseDone = isPhaseDone(phaseIdx);
                  return (
                    <div
                      key={phaseIdx}
                      className={`relative pl-5 animate-fadeIn rounded-2xl py-2 ${
                        phaseDone ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${
                          phaseDone
                            ? 'bg-gradient-to-b from-emerald-400 to-blue-700'
                            : 'bg-gradient-to-b from-indigo-400 via-blue-500 to-blue-700'
                        }`}
                      />
                      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                        <h3 className={`font-bold text-lg ${phaseDone ? 'text-emerald-300' : ''}`}>
                          {phaseDone && <span aria-hidden className="mr-1">✓</span>}
                          {t.roadmap.phase} {phase.phase ?? phaseIdx + 1}
                          {phase.name ? ` — ${phase.name}` : ''}
                        </h3>
                        {taskCount > 0 && (
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              phaseDone
                                ? 'bg-emerald-500/20 text-emerald-200'
                                : 'bg-white/[0.07] text-gray-300 border border-white/10'
                            }`}
                          >
                            {done}/{taskCount}
                          </span>
                        )}
                      </div>
                      {phase.duration && (
                        <p className="text-gray-400 text-sm mb-3">{phase.duration}</p>
                      )}
                      <div className="space-y-1">
                        {phase.tasks?.map((task, idx) => {
                          const checked = completions.has(taskKey(phaseIdx, idx));
                          const taskAvailable = !!task.title;
                          return (
                            <label
                              key={idx}
                              className={`flex gap-3 p-2 rounded-xl animate-fadeIn select-none transition-all ${
                                taskAvailable ? 'cursor-pointer hover:bg-white/[0.03]' : 'opacity-60 cursor-default'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => taskAvailable && toggleTask(phaseIdx, idx)}
                                disabled={!taskAvailable || streaming}
                                className="mt-1 accent-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <div className={checked ? 'opacity-50' : ''}>
                                <p className={`font-medium text-sm md:text-base ${checked ? 'line-through' : ''}`}>
                                  {task.title || ''}
                                </p>
                                {task.duration && (
                                  <p className="text-xs text-gray-500 mt-0.5">{task.duration}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {streaming && phases.length === 0 && (
                  <p className="text-gray-400 text-sm">{t.roadmap.preparing}</p>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-7 backdrop-blur-sm shadow-2xl shadow-blue-600/5 md:sticky md:top-6 self-start flex flex-col" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <CoachAvatar size={44} />
                <div>
                  <h3 className="font-bold text-base leading-tight">{t.roadmap.coachName}</h3>
                  <p className="text-xs text-gray-400">{t.roadmap.coachTagline}</p>
                </div>
              </div>
              {chat.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                  {t.roadmap.clearChat}
                </button>
              )}
            </div>

            <div className="space-y-4 mb-4 flex-1 overflow-y-auto pr-1.5 min-h-[400px]">
              {!historyLoaded && (
                <p className="text-gray-500 text-base">{t.roadmap.loadingHistory}</p>
              )}
              {historyLoaded && chat.length === 0 && (
                <div className="text-gray-400 text-center py-10 px-4">
                  <p className="text-base mb-2">{t.roadmap.emptyChat1}</p>
                  <p className="text-sm text-gray-500">
                    Ex : <em className="text-gray-300">«&nbsp;{t.roadmap.emptyChat2}&nbsp;»</em>
                  </p>
                </div>
              )}
              {chat.map((msg, idx) => (
                // data-private masque le contenu dans les session recordings
                // PostHog. Les messages coach et user peuvent contenir des
                // infos business sensibles — on les blur pour préserver la
                // confidentialité tout en gardant le funnel observable.
                <div key={idx} data-private className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <span
                    className={`inline-block px-4 py-3 rounded-2xl text-[15px] leading-relaxed max-w-[88%] whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-700 text-white rounded-br-md shadow-lg shadow-blue-600/20'
                        : 'bg-white/[0.06] border border-white/10 rounded-bl-md text-gray-100'
                    }`}
                  >
                    {msg.content || (msg.role === 'assistant' && sending ? <span className="text-gray-400">…</span> : '')}
                  </span>
                </div>
              ))}
              {sending && chat[chat.length - 1]?.role !== 'assistant' && (
                <p className="text-gray-500 text-sm italic">{t.roadmap.thinking}</p>
              )}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t.roadmap.askPlaceholder}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-full text-[15px] placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all disabled:opacity-50"
                disabled={sending || streaming}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || streaming || !message.trim()}
                className="px-5 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-medium text-[15px] shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100"
              >
                {t.roadmap.send}
              </button>
            </div>
          </div>
        </div>
      )}

      {limitHit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a0b2e] to-[#0a0118] border border-blue-600/30 rounded-3xl p-7 shadow-2xl shadow-blue-600/20">
            <button
              onClick={() => setLimitHit(null)}
              aria-label="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="h-12 w-12 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center text-2xl shadow-lg shadow-blue-600/30">
              ⚡
            </div>
            <h2 className="text-xl font-bold mb-2">
              {limitHit.isExpired
                ? t.roadmap.trialExpiredTitle
                : limitHit.kind === 'message'
                  ? t.roadmap.limitReachedMessagesTitle
                  : limitHit.kind === 'refine'
                    ? t.roadmap.refineLimitTitle
                    : t.roadmap.limitReachedRoadmapsTitle}
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-5">
              {limitHit.isExpired
                ? t.roadmap.trialExpiredBody
                : limitHit.kind === 'refine'
                  ? t.roadmap.refineLimitBody
                      .replace('{limit}', String(limitHit.limit))
                      .replace('{tier}', limitHit.tier)
                  : (limitHit.kind === 'message'
                      ? t.roadmap.limitReachedMessagesBody
                      : t.roadmap.limitReachedRoadmapsBody
                    ).replace('{limit}', String(limitHit.limit))}
            </p>
            <button
              type="button"
              onClick={() => {
                setLimitHit(null);
                router.push('/upgrade');
              }}
              className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold text-[15px] shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              {t.roadmap.upgradeCta}
            </button>
          </div>
        </div>
      )}

      {pdfLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-[#1a0b2e] to-[#0a0118] border border-blue-600/30 rounded-3xl p-7 shadow-2xl shadow-blue-600/20">
            <button
              onClick={() => setPdfLocked(false)}
              aria-label="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="h-12 w-12 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center text-2xl shadow-lg shadow-blue-600/30">
              📄
            </div>
            <h2 className="text-xl font-bold mb-2">{t.pdfExport.lockedTitle}</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-5">{t.pdfExport.lockedBody}</p>
            <button
              type="button"
              onClick={() => {
                setPdfLocked(false);
                router.push('/upgrade');
              }}
              className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold text-[15px] shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              {t.roadmap.upgradeCta}
            </button>
          </div>
        </div>
      )}

      {/* "Mettre à jour ma roadmap" modal — user evolves their roadmap based
          on what they've learned. Submits to /api/roadmap/refine which
          streams a refreshed roadmap into the same row (no quota cost). */}
      {refineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-gradient-to-br from-[#1a0b2e] to-[#0a0118] border border-blue-500/30 rounded-3xl p-7 shadow-2xl shadow-blue-600/20 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                if (refineSubmitting) return;
                setRefineOpen(false);
                setRefineError(null);
              }}
              aria-label="Close"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="h-12 w-12 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center text-2xl shadow-lg shadow-blue-600/30">
              ✨
            </div>
            <h2 className="text-xl font-bold mb-2">{t.roadmap.refineModalTitle}</h2>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">{t.roadmap.refineModalSubtitle}</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="refine-q1" className="block text-sm font-medium text-gray-200 mb-1.5">
                  {t.roadmap.refineQ1Label}
                </label>
                <textarea
                  id="refine-q1"
                  value={refineQ1}
                  onChange={(e) => setRefineQ1(e.target.value)}
                  placeholder={t.roadmap.refineQ1Placeholder}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/[0.07] transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="refine-q2" className="block text-sm font-medium text-gray-200 mb-1.5">
                  {t.roadmap.refineQ2Label}
                </label>
                <input
                  id="refine-q2"
                  type="text"
                  value={refineQ2}
                  onChange={(e) => setRefineQ2(e.target.value)}
                  placeholder={t.roadmap.refineQ2Placeholder}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/[0.07] transition-all"
                />
              </div>
              <div>
                <label htmlFor="refine-q3" className="block text-sm font-medium text-gray-200 mb-1.5">
                  {t.roadmap.refineQ3Label}
                </label>
                <textarea
                  id="refine-q3"
                  value={refineQ3}
                  onChange={(e) => setRefineQ3(e.target.value)}
                  placeholder={t.roadmap.refineQ3Placeholder}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/[0.07] transition-all resize-none"
                />
              </div>
            </div>

            <div className="mt-5 p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 text-amber-100 text-xs leading-relaxed">
              {t.roadmap.refineWarning}
            </div>

            {refineError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                {refineError}
              </div>
            )}

            <div className="mt-6 flex gap-3 flex-col-reverse sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (refineSubmitting) return;
                  setRefineOpen(false);
                  setRefineError(null);
                }}
                disabled={refineSubmitting}
                className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 font-medium text-sm transition-all disabled:opacity-40"
              >
                {t.roadmap.refineCancel}
              </button>
              <button
                type="button"
                onClick={handleRefineSubmit}
                disabled={refineSubmitting}
                className="flex-1 px-5 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 font-bold text-sm text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {refineSubmitting ? t.roadmap.refineSubmitLoading : t.roadmap.refineSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
