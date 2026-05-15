'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang, LanguageSwitcher } from '@/lib/i18n';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/roadmap';
  const { t } = useLang();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode !== 'reset' && !password) return;
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === 'signup') {
        const { error: signUpError, data } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        // Track signup completion in PostHog (identifies the user so we can
        // tie future events back to this account across sessions).
        if (data.user) {
          posthog.identify(data.user.id, { email });
          posthog.capture('signup_completed');
        }
        if (!data.session) {
          setInfo(t.login.confirmEmail);
          setLoading(false);
          return;
        }
      } else if (mode === 'reset') {
        // Send reset password email. The redirectTo lands the user on
        // /reset-password where they choose a new password (session is
        // attached to the link).
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setInfo(t.login.resetEmailSent);
        setLoading(false);
        return;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // Identify the user in PostHog so subsequent events tie back to them.
        if (data.user) {
          posthog.identify(data.user.id, { email });
        }
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unknown error';
      // Map signup trigger errors to friendly translated messages.
      let friendly = raw;
      if (raw.includes('email_already_registered') || raw.includes('User already registered')) {
        friendly = t.login.errorEmailAlreadyRegistered;
      } else if (raw.includes('disposable_email_not_allowed')) {
        friendly = t.login.errorDisposableEmail;
      }
      setError(friendly);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white flex items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-br from-indigo-500/25 via-blue-600/20 to-blue-800/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/15 to-blue-800/10 blur-3xl" />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t.login.backHome}
        </button>
      </div>

      <div className="absolute top-6 right-6 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-600/30">
              AI
            </div>
            <span className="font-bold text-xl tracking-tight">Business Coach</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl shadow-blue-600/5">
          <h1 className="text-2xl font-bold mb-2 tracking-tight">
            {mode === 'signin'
              ? t.login.signinTitle
              : mode === 'signup'
                ? t.login.signupTitle
                : t.login.resetTitle}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {mode === 'signin'
              ? t.login.signinSubtitle
              : mode === 'signup'
                ? t.login.signupSubtitle
                : t.login.resetSubtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5 font-medium">{t.login.emailLabel}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={t.login.emailPlaceholder}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm text-gray-300 font-medium">{t.login.passwordLabel}</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(null); setInfo(null); setPassword(''); }}
                      className="text-xs text-indigo-300 hover:text-indigo-200 font-medium transition-colors"
                    >
                      {t.login.forgotPassword}
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={t.login.passwordPlaceholder}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-sm">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading
                ? t.login.loading
                : mode === 'signin'
                  ? t.login.signinBtn
                  : mode === 'signup'
                    ? t.login.signupBtn
                    : t.login.resetBtn}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-gray-400">
            {mode === 'signin' && (
              <>
                {t.login.switchToSignup}{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
                  className="text-indigo-300 hover:text-indigo-200 font-medium transition-colors"
                >
                  {t.login.switchToSignupLink}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                {t.login.switchToSignin}{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
                  className="text-indigo-300 hover:text-indigo-200 font-medium transition-colors"
                >
                  {t.login.switchToSigninLink}
                </button>
              </>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
                className="text-indigo-300 hover:text-indigo-200 font-medium transition-colors"
              >
                ← {t.login.backToSignin}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          {t.footer.poweredBy}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    }>
      <LoginInner />
    </Suspense>
  );
}
