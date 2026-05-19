'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang, LanguageSwitcher } from '@/lib/i18n';
import { UserAvatar } from '@/app/components/UserAvatar';

type PaidPlan = 'starter' | 'pro' | 'premium';
type BillingCycle = 'monthly' | 'yearly';

export default function UpgradePage() {
  const router = useRouter();
  const { t } = useLang();
  const supabase = createSupabaseBrowserClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlan | null>(null);
  // Default to yearly on /upgrade — these are returning users for whom the
  // yearly discount is a stronger pitch ("you've already validated us, save 17%").
  const [cycle, setCycle] = useState<BillingCycle>('yearly');

  const yearlyTotal = (monthly: string) => String(Number(monthly) * 10);
  const yearlyPerMonth = (monthly: string) => {
    const total = Number(monthly) * 10;
    return String(Math.round((total / 12) * 10) / 10).replace(/\.0$/, '');
  };

  // Auth gate — this page is only for logged-in users (the "reprends ton
  // abonnement" flow). Visitors hitting it unauthenticated are sent to the
  // marketing /#pricing instead.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/login?next=/upgrade');
        return;
      }
      setEmail(user.email ?? null);
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [router, supabase]);

  const subscribe = async (plan: PaidPlan) => {
    if (checkoutLoading) return;
    setCheckoutLoading(plan);
    posthog.capture('checkout_started', { plan, cycle, source: 'upgrade_page' });
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Erreur ${res.status}`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0118] text-white flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-600/10 to-blue-800/10 blur-3xl" />
      </div>

      {/* Header avec nav */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          {/* Logo */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 group"
            aria-label="Accueil"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/30">
              AI
            </div>
            <span className="font-bold tracking-tight text-base hidden sm:inline group-hover:text-blue-300 transition-colors">
              Business Coach
            </span>
          </button>

          {/* Nav buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              {t.pricing.upgradeBackToHome}
            </button>
            <button
              onClick={() => router.push('/roadmap')}
              className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-lg transition-all"
            >
              {t.pricing.upgradeBackToProjects}
            </button>
            <LanguageSwitcher />
            <button
              onClick={() => router.push('/account')}
              className="ml-1 hidden sm:block"
              aria-label="Mon compte"
            >
              <UserAvatar email={email} size="sm" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-6 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-[0.2em]">
              {t.pricing.upgradeEyebrow}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mt-4 mb-5 tracking-tight">
              {t.pricing.upgradeTitle}
            </h1>
            <p className="text-gray-400 text-base md:text-lg">
              {t.pricing.upgradeSubtitle}
            </p>
          </div>

          {/* Monthly / Yearly toggle — defaults to yearly on /upgrade */}
          <div className="flex justify-center mb-12 md:mb-14">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  cycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {t.pricing.cycleMonthly}
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  cycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {t.pricing.cycleYearly}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  cycle === 'yearly'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {t.pricing.cycleYearlyBadge}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing cards (style aligné avec la home) */}
          <div className="grid md:grid-cols-3 gap-5 md:gap-6 lg:gap-7 items-stretch">
            {/* Starter */}
            <div className="group relative p-8 md:p-9 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col">
              <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-[0.15em]">{t.pricing.starterName}</div>
              <p className="text-gray-500 text-sm mb-8 min-h-[2.5rem]">{t.pricing.starterTagline}</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-6xl font-bold tracking-tight">
                  {cycle === 'yearly' ? yearlyTotal(t.pricing.starterPrice) : t.pricing.starterPrice}€
                </span>
                <span className="text-gray-500 text-sm">
                  {cycle === 'yearly' ? t.pricing.perYear : t.pricing.perMonth}
                </span>
              </div>
              {cycle === 'yearly' && (
                <p className="text-xs text-emerald-300/90 mt-1">
                  {t.pricing.cycleYearlySubtitle.replace('{effective}', yearlyPerMonth(t.pricing.starterPrice))}
                </p>
              )}
              <div className="h-px bg-white/10 my-7" />
              <ul className="space-y-3.5 mb-8 flex-1">
                {[t.pricing.starterF1, t.pricing.starterF2, t.pricing.starterF3, t.pricing.starterF4, t.pricing.starterF5, t.pricing.starterF6].map((f, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-gray-300 leading-relaxed">
                    <svg className="w-4 h-4 mt-1 flex-shrink-0 text-gray-500" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('starter')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 font-medium text-sm transition-all disabled:opacity-50"
              >
                {checkoutLoading === 'starter' ? '…' : t.pricing.ctaStarter}
              </button>
            </div>

            {/* Pro (mis en avant) */}
            <div className="group relative p-8 md:p-9 rounded-2xl bg-gradient-to-b from-blue-500/[0.04] to-transparent border border-blue-500/40 transition-all duration-300 flex flex-col shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_20px_60px_-15px_rgba(59,130,246,0.25)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-500 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                {t.pricing.mostPopular}
              </div>
              <div className="mb-2 text-xs font-semibold text-blue-400 uppercase tracking-[0.15em]">{t.pricing.proName}</div>
              <p className="text-gray-400 text-sm mb-8 min-h-[2.5rem]">{t.pricing.proTagline}</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-6xl font-bold tracking-tight text-white">
                  {cycle === 'yearly' ? yearlyTotal(t.pricing.proPrice) : t.pricing.proPrice}€
                </span>
                <span className="text-gray-400 text-sm">
                  {cycle === 'yearly' ? t.pricing.perYear : t.pricing.perMonth}
                </span>
              </div>
              {cycle === 'yearly' && (
                <p className="text-xs text-emerald-300/90 mt-1">
                  {t.pricing.cycleYearlySubtitle.replace('{effective}', yearlyPerMonth(t.pricing.proPrice))}
                </p>
              )}
              <div className="h-px bg-blue-500/20 my-7" />
              <ul className="space-y-3.5 mb-8 flex-1">
                {[t.pricing.proF1, t.pricing.proF2, t.pricing.proF3, t.pricing.proF4, t.pricing.proF5, t.pricing.proF6].map((f, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-gray-200 leading-relaxed">
                    <svg className="w-4 h-4 mt-1 flex-shrink-0 text-blue-400" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('pro')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 font-semibold text-sm text-white transition-all disabled:opacity-50"
              >
                {checkoutLoading === 'pro' ? '…' : t.pricing.ctaPro}
              </button>
            </div>

            {/* Premium */}
            <div className="group relative p-8 md:p-9 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-400/30 transition-all duration-300 flex flex-col">
              <div className="mb-2 text-xs font-semibold text-amber-300 uppercase tracking-[0.15em]">{t.pricing.premiumName}</div>
              <p className="text-gray-500 text-sm mb-8 min-h-[2.5rem]">{t.pricing.premiumTagline}</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-6xl font-bold tracking-tight">
                  {cycle === 'yearly' ? yearlyTotal(t.pricing.premiumPrice) : t.pricing.premiumPrice}€
                </span>
                <span className="text-gray-500 text-sm">
                  {cycle === 'yearly' ? t.pricing.perYear : t.pricing.perMonth}
                </span>
              </div>
              {cycle === 'yearly' && (
                <p className="text-xs text-emerald-300/90 mt-1">
                  {t.pricing.cycleYearlySubtitle.replace('{effective}', yearlyPerMonth(t.pricing.premiumPrice))}
                </p>
              )}
              <div className="h-px bg-white/10 my-7" />
              <ul className="space-y-3.5 mb-8 flex-1">
                {[t.pricing.premiumF1, t.pricing.premiumF2, t.pricing.premiumF3, t.pricing.premiumF4, t.pricing.premiumF5, t.pricing.premiumF6, t.pricing.premiumF7, t.pricing.premiumF8].map((f, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-gray-300 leading-relaxed">
                    <svg className="w-4 h-4 mt-1 flex-shrink-0 text-amber-300/80" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('premium')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-xl bg-white/5 border border-amber-400/40 hover:bg-amber-500/10 hover:border-amber-300 font-medium text-sm transition-all disabled:opacity-50"
              >
                {checkoutLoading === 'premium' ? '…' : t.pricing.ctaPremium}
              </button>
            </div>
          </div>

          {/* Trial note */}
          <p className="text-center text-sm text-gray-500 mt-12">{t.pricing.trialNote}</p>

          {/* Trust signals */}
          <div className="mt-16 pt-12 border-t border-white/5">
            <div className="text-center mb-7">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">{t.pricing.includesTitle}</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-sm text-gray-400">
              {[t.pricing.trustCancel, t.pricing.trustNoCommit, t.pricing.trustData, t.pricing.trustSupport].map((trust, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400/80" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{trust}</span>
                </div>
              ))}
            </div>
          </div>

          {/* "Pas maintenant" — escape hatch */}
          <div className="mt-12 text-center">
            <button
              onClick={() => router.push('/roadmap')}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline-offset-4 hover:underline"
            >
              {t.pricing.upgradeNotNow}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
