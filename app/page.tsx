'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang, LanguageSwitcher } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type PaidPlan = 'starter' | 'pro' | 'premium';

export default function Home() {
  const router = useRouter();
  const { t } = useLang();
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlan | null>(null);

  const goToApp = () => router.push('/roadmap');

  // Pricing card CTA. If the visitor isn't logged in, send them to /login with
  // a `next` param so they land back on /pricing after auth (we use the hash
  // to scroll). Once authenticated, POST to /api/stripe/checkout and redirect
  // to the Stripe-hosted checkout URL.
  const subscribe = async (plan: PaidPlan) => {
    if (checkoutLoading) return;
    setCheckoutLoading(plan);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/?plan=${plan}#pricing`)}`);
        return;
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-indigo-500/30 via-blue-600/25 to-blue-800/25 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-[500px] w-[600px] rounded-full bg-gradient-to-tr from-emerald-500/20 to-blue-800/15 blur-3xl" />
        <div className="absolute bottom-0 -left-32 h-[400px] w-[600px] rounded-full bg-gradient-to-br from-blue-600/15 to-indigo-500/20 blur-3xl" />
      </div>

      <nav className="relative z-10 px-6 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/30">
              AI
            </div>
            <span className="font-bold text-lg tracking-tight">Business Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a
              href="#pricing"
              className="text-sm font-medium text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/45 transition-all"
            >
              {t.nav.subscribe}
            </a>
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-medium text-white px-5 py-2.5 rounded-full bg-white/[0.06] border border-blue-500/50 shadow-[0_0_15px_-3px_rgba(37,99,235,0.3)] hover:bg-blue-600/15 hover:border-blue-400 hover:shadow-[0_0_25px_-3px_rgba(37,99,235,0.6)] transition-all"
            >
              {t.nav.login}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative z-10 px-6 pt-16 pb-28 md:pt-24 md:pb-36">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-sm text-gray-200">{t.hero.badge}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
            {t.hero.title1}{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">
              {t.hero.titleAccent}
            </span>
            <br />
            {t.hero.title2}
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="flex justify-center mb-8">
            <button
              onClick={goToApp}
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold text-base md:text-lg shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.03] hover:shadow-2xl hover:shadow-blue-600/40 active:scale-100"
            >
              <span className="flex items-center gap-2">
                {t.hero.cta}
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> {t.hero.badge1}</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> {t.hero.badge2}</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> {t.hero.badge3}</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 md:py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">{t.alternative.eyebrow}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-6 tracking-tight leading-tight">
            {t.alternative.title1}{' '}
            <span className="bg-gradient-to-r from-blue-700 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              {t.alternative.price}
            </span>
            {' '}{t.alternative.title2}
          </h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-6 max-w-3xl mx-auto">
            {t.alternative.body1} <span className="text-white font-semibold">{t.alternative.generic}</span>{t.alternative.body2} <span className="text-white font-semibold">{t.alternative.yours}</span> {t.alternative.body3} <span className="text-white font-semibold">{t.alternative.yours}</span> {t.alternative.body4} <span className="text-white font-semibold">{t.alternative.yours}</span> {t.alternative.body5}
          </p>
          <p className="text-base md:text-lg text-gray-400 leading-relaxed mb-8 max-w-3xl mx-auto">
            {t.alternative.body6}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
            <span>✨</span>
            <span>{t.alternative.tagline}</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 md:py-28 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">{t.how.eyebrow}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">{t.how.title}</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.how.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', title: t.how.step1Title, desc: t.how.step1Desc, color: 'from-indigo-500 to-blue-600' },
              { num: '02', title: t.how.step2Title, desc: t.how.step2Desc, color: 'from-blue-600 to-blue-800' },
              { num: '03', title: t.how.step3Title, desc: t.how.step3Desc, color: 'from-emerald-500 to-blue-800' },
            ].map((step) => (
              <div
                key={step.num}
                className="relative p-7 rounded-3xl bg-white/[0.03] border-2 border-blue-600/50 shadow-[0_0_30px_-5px_rgba(37,99,235,0.35)] backdrop-blur-sm hover:border-blue-500 hover:shadow-[0_0_45px_-5px_rgba(37,99,235,0.6)] hover:-translate-y-1 transition-all"
              >
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br ${step.color} font-bold mb-5 shadow-lg`}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 md:py-28 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">{t.features.eyebrow}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">{t.features.title}</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.features.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { emoji: '🎯', title: t.features.f1Title, desc: t.features.f1Desc },
              { emoji: '🤖', title: t.features.f2Title, desc: t.features.f2Desc },
              { emoji: '📊', title: t.features.f3Title, desc: t.features.f3Desc },
              { emoji: '🌐', title: t.features.f4Title, desc: t.features.f4Desc },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-white/[0.03] border-2 border-blue-600/45 shadow-[0_0_25px_-5px_rgba(37,99,235,0.3)] hover:border-blue-500 hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.55)] hover:bg-white/[0.05] transition-all"
              >
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 md:py-28 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">{t.forWho.eyebrow}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-6 tracking-tight">{t.forWho.title}</h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
            {t.forWho.body1} <span className="text-white font-semibold">{t.forWho.bodyHighlight}</span> {t.forWho.body2}
          </p>
        </div>
      </section>

      <section id="pricing" className="relative z-10 px-6 py-20 md:py-28 border-t border-white/5 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">{t.pricing.eyebrow}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4 tracking-tight">{t.pricing.title}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.pricing.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {/* Starter */}
            <div className="relative p-7 rounded-3xl bg-white/[0.03] border-2 border-white/10 backdrop-blur-sm hover:border-white/20 transition-all flex flex-col">
              <div className="mb-1 text-sm font-semibold text-indigo-300 uppercase tracking-wider">{t.pricing.starterName}</div>
              <p className="text-gray-400 text-sm mb-5">{t.pricing.starterTagline}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">{t.pricing.starterPrice}€</span>
                <span className="text-gray-400 text-sm">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {[t.pricing.starterF1, t.pricing.starterF2, t.pricing.starterF3, t.pricing.starterF4, t.pricing.starterF5, t.pricing.starterF6].map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-300">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('starter')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 font-medium text-sm transition-all disabled:opacity-50"
              >
                {checkoutLoading === 'starter' ? '…' : t.pricing.ctaStarter}
              </button>
            </div>

            {/* Pro (mis en avant) */}
            <div className="relative p-7 rounded-3xl bg-gradient-to-br from-indigo-500/[0.08] to-blue-600/[0.08] border-2 border-blue-500 shadow-[0_0_50px_-5px_rgba(37,99,235,0.5)] backdrop-blur-sm flex flex-col md:scale-[1.03]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 text-xs font-bold shadow-lg shadow-blue-600/40">
                {t.pricing.mostPopular}
              </div>
              <div className="mb-1 text-sm font-semibold text-blue-400 uppercase tracking-wider">{t.pricing.proName}</div>
              <p className="text-gray-400 text-sm mb-5">{t.pricing.proTagline}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">{t.pricing.proPrice}€</span>
                <span className="text-gray-400 text-sm">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {[t.pricing.proF1, t.pricing.proF2, t.pricing.proF3, t.pricing.proF4, t.pricing.proF5, t.pricing.proF6].map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-200">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('pro')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {checkoutLoading === 'pro' ? '…' : t.pricing.ctaPro}
              </button>
            </div>

            {/* Premium */}
            <div className="relative p-7 rounded-3xl bg-white/[0.03] border-2 border-white/10 backdrop-blur-sm hover:border-white/20 transition-all flex flex-col">
              <div className="mb-1 text-sm font-semibold text-amber-300 uppercase tracking-wider">{t.pricing.premiumName}</div>
              <p className="text-gray-400 text-sm mb-5">{t.pricing.premiumTagline}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">{t.pricing.premiumPrice}€</span>
                <span className="text-gray-400 text-sm">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {[t.pricing.premiumF1, t.pricing.premiumF2, t.pricing.premiumF3, t.pricing.premiumF4, t.pricing.premiumF5, t.pricing.premiumF6, t.pricing.premiumF7, t.pricing.premiumF8].map((f, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-300">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe('premium')}
                disabled={checkoutLoading !== null}
                className="w-full px-5 py-3 rounded-full bg-white/5 border border-amber-400/50 hover:bg-amber-500/10 hover:border-amber-300 font-medium text-sm transition-all disabled:opacity-50"
              >
                {checkoutLoading === 'premium' ? '…' : t.pricing.ctaPremium}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">{t.pricing.trialNote}</p>
        </div>
      </section>

      <section className="relative z-10 px-6 py-24 md:py-32 border-t border-white/5">
        <div className="relative max-w-3xl mx-auto text-center">
          <div aria-hidden className="absolute inset-0 -z-10 mx-auto h-72 w-72 md:h-96 md:w-96 rounded-full bg-gradient-to-r from-indigo-500/30 via-blue-600/30 to-blue-800/30 blur-3xl" />
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">{t.finalCta.title1}<br />{t.finalCta.title2}</h2>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto">
            {t.finalCta.subtitle}
          </p>
          <button
            onClick={goToApp}
            className="group px-10 py-5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold text-lg shadow-2xl shadow-blue-600/40 transition-all hover:scale-[1.03] active:scale-100"
          >
            <span className="flex items-center gap-2">
              {t.finalCta.cta}
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <span>{t.footer.copy}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <a href="/legal/mentions" className="hover:text-gray-300 transition-colors">
                {t.footer.mentions}
              </a>
              <a href="/legal/cgu" className="hover:text-gray-300 transition-colors">
                {t.footer.cgu}
              </a>
              <a href="/legal/confidentialite" className="hover:text-gray-300 transition-colors">
                {t.footer.privacy}
              </a>
            </div>
            <p>{t.footer.poweredBy}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
