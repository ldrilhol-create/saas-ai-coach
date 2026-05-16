'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang, LanguageSwitcher } from '@/lib/i18n';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLang();

  const [authChecked, setAuthChecked] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When the user clicks the reset link in their email, Supabase exchanges the
  // token in the URL for a session automatically. We just verify it's there.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setHasValidSession(!!user);
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError(t.resetPassword.errorTooShort);
      return;
    }
    if (password !== passwordConfirm) {
      setError(t.resetPassword.errorMismatch);
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }
    setInfo(t.resetPassword.success);
    setLoading(false);
    // Redirect to roadmap after 2s to let the user read the success message
    setTimeout(() => {
      router.push('/roadmap');
      router.refresh();
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white flex items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-br from-indigo-500/25 via-blue-600/20 to-blue-800/20 blur-3xl" />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_horizontal_compact.svg"
            alt="Business Coach AI"
            width={220}
            height={55}
            priority
            className="h-12 w-auto"
          />
        </div>

        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-sm shadow-2xl shadow-blue-600/5">
          {!authChecked ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
            </div>
          ) : !hasValidSession ? (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">{t.resetPassword.invalidLinkTitle}</h1>
              <p className="text-gray-400 text-sm mb-6">{t.resetPassword.invalidLinkBody}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
              >
                {t.resetPassword.backToLogin}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2 tracking-tight">{t.resetPassword.title}</h1>
              <p className="text-gray-400 text-sm mb-6">{t.resetPassword.subtitle}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5 font-medium">
                    {t.resetPassword.newPasswordLabel}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder={t.resetPassword.passwordPlaceholder}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm text-gray-300 mb-1.5 font-medium">
                    {t.resetPassword.confirmPasswordLabel}
                  </label>
                  <input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder={t.resetPassword.passwordPlaceholder}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? t.login.loading : t.resetPassword.submitBtn}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
