'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang, LanguageSwitcher } from '@/lib/i18n';
import { UserAvatar } from '@/app/components/UserAvatar';

type Tier = 'trial' | 'starter' | 'pro' | 'premium';
type Usage = {
  tier: Tier;
  isExpired: boolean;
  period: string;
  messages: { used: number; limit: number };
  roadmaps: { used: number; limit: number };
};
type ClientNote = {
  id: string;
  content: string;
  category: 'goal' | 'blocker' | 'win' | 'context';
  created_at: string;
  roadmap_id: string | null;
  roadmap_name: string | null;
};

// Map our app locale to a BCP-47 tag for date formatting.
// Avoid `undefined` (system locale) — differs between Node SSR and the browser
// → hydration mismatch.
const dateLocale = (l: 'fr' | 'en') => (l === 'en' ? 'en-US' : 'fr-FR');

export default function AccountPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { t, locale } = useLang();

  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);

  const [portalLoading, setPortalLoading] = useState(false);

  const openBillingPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Erreur ${res.status}`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { notes: ClientNote[] };
        setNotes(data.notes ?? []);
      }
    } catch {
      // non-fatal
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm(t.account.notesConfirmDelete)) return;
    const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/login?next=/account');
        return;
      }
      setEmail(user.email ?? null);
      setAuthChecked(true);

      const [usageRes, subRes] = await Promise.all([
        fetch('/api/usage', { cache: 'no-store' }),
        supabase
          .from('user_subscriptions')
          .select('current_period_end')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      let loadedUsage: Usage | null = null;
      if (usageRes.ok) {
        loadedUsage = (await usageRes.json()) as Usage;
        setUsage(loadedUsage);
      }
      if (!subRes.error && subRes.data?.current_period_end) {
        setPeriodEnd(subRes.data.current_period_end as string);
      }

      if (loadedUsage?.tier === 'premium') {
        fetchNotes();
      }
    })();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  const tierLabel = (() => {
    if (!usage) return '';
    if (usage.tier === 'premium') return t.roadmap.tierPremium;
    if (usage.tier === 'pro') return t.roadmap.tierPro;
    if (usage.tier === 'starter') return t.roadmap.tierStarter;
    return t.roadmap.tierTrial;
  })();

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(dateLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-600/10 to-blue-800/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center gap-3 flex-wrap">
          <button
            onClick={() => router.push('/roadmap')}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t.account.back}
          </button>
          <h1 className="text-base font-bold tracking-tight">{t.account.title}</h1>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto p-6 space-y-6">
        <section className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-2xl shadow-blue-600/5">
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar email={email} size="lg" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{t.account.emailLabel}</p>
              <p className="font-semibold truncate text-base md:text-lg">{email ?? '—'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{t.account.planLabel}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-blue-600/20 border border-blue-500/30 text-sm font-bold">
                  {tierLabel}
                </span>
                {usage?.isExpired && (
                  <span className="text-xs text-amber-300">{t.account.planExpired}</span>
                )}
              </div>
              {periodEnd && (
                <p className="text-xs text-gray-400 mt-2">
                  {usage?.isExpired ? t.account.planExpiresAt : t.account.planRenewsAt} {formatDate(periodEnd)}
                </p>
              )}
            </div>
          </div>
        </section>

        {usage && (
          <section className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">{t.account.usageTitle}</p>
            <div className="space-y-4">
              <UsageBar
                label={t.account.usageMessages}
                used={usage.messages.used}
                limit={usage.messages.limit}
              />
              <UsageBar
                label={t.account.usageRoadmaps}
                used={usage.roadmaps.used}
                limit={usage.roadmaps.limit}
              />
            </div>
          </section>
        )}

        {usage?.tier === 'premium' && (
          <section className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
              <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">{t.account.notesTitle}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-blue-800 text-white">
                PREMIUM
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-5">{t.account.notesSubtitle}</p>
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">{t.account.notesEmpty}</p>
            ) : (
              <ul className="space-y-2.5">
                {notes.map((n) => {
                  const catLabel =
                    n.category === 'goal' ? t.account.noteCategoryGoal
                    : n.category === 'blocker' ? t.account.noteCategoryBlocker
                    : n.category === 'win' ? t.account.noteCategoryWin
                    : t.account.noteCategoryContext;
                  const catColor =
                    n.category === 'goal' ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                    : n.category === 'blocker' ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                    : n.category === 'win' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-white/5 text-gray-300 border-white/10';
                  return (
                    <li key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${catColor}`}>
                        {catLabel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-relaxed">{n.content}</p>
                        {n.roadmap_name && (
                          <p className="text-[10px] text-gray-500 mt-1 truncate">
                            {t.account.notesProjectPrefix} · {n.roadmap_name}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteNote(n.id)}
                        title={t.account.notesDelete}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {usage?.tier === 'premium' && (
          <section className="bg-gradient-to-br from-amber-500/[0.06] to-blue-800/[0.06] border border-amber-400/30 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold">{t.account.prioritySupportTitle}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-blue-800 text-white">
                PREMIUM
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {t.account.prioritySupportBody}{' '}
              <a
                href={`mailto:${t.account.prioritySupportEmail}?subject=${encodeURIComponent('[Premium] Support request')}`}
                className="font-semibold text-amber-200 underline hover:text-amber-100"
              >
                {t.account.prioritySupportEmail}
              </a>
              .
            </p>
            <p className="text-xs text-gray-400 mt-2">{t.account.prioritySupportSla}</p>
          </section>
        )}

        <section className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm flex flex-col sm:flex-row gap-3">
          <button
            onClick={openBillingPortal}
            disabled={portalLoading || !usage || usage.tier === 'trial'}
            title={
              usage?.tier === 'trial'
                ? 'Disponible après ta première souscription'
                : t.account.managePlan
            }
            className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {portalLoading ? '…' : t.account.managePlan}
          </button>
          <form action="/api/auth/signout" method="post" className="contents">
            <button
              type="submit"
              className="flex-1 px-5 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 font-medium text-sm transition-all"
            >
              {t.account.signout}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-baseline text-sm mb-2">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-white font-semibold">
          {used} / {limit}
        </span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            pct >= 90
              ? 'bg-gradient-to-r from-amber-400 to-red-500'
              : 'bg-gradient-to-r from-indigo-500 via-blue-600 to-blue-800'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
