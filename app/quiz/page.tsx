'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang, LanguageSwitcher } from '@/lib/i18n';

const TOTAL_STEPS = 6;

export default function Quiz() {
  const router = useRouter();
  const { t } = useLang();
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    businessType: '',
    stage: '',
    budget: '',
    challenge: '',
    niche: '',
    weeklyTime: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/login?next=/quiz');
        return;
      }
      try {
        const saved = localStorage.getItem('quizAnswers');
        if (saved && saved !== '{}') {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setAnswers((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {
        // ignore
      }
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    localStorage.setItem('quizAnswers', JSON.stringify(answers));
    router.push('/roadmap?regenerate=1');
  };

  const optionButtonClass = (selected: boolean) =>
    `w-full p-4 rounded-2xl text-left transition-all ${
      selected
        ? 'bg-gradient-to-r from-indigo-500/30 to-blue-600/30 border border-indigo-400/60 shadow-lg shadow-blue-600/20'
        : 'bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20'
    }`;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0118] text-white flex items-center justify-center px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-600/15 to-blue-800/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-blue-800/10 blur-3xl" />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-2xl z-10">
        <div className="mb-8">
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">{t.quiz.eyebrow}</span>
            <h1 className="text-3xl md:text-4xl font-bold mt-2 tracking-tight">{t.quiz.title}</h1>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-400">{t.quiz.step} {step} {t.quiz.of} {TOTAL_STEPS}</span>
            <span className="text-sm font-medium text-indigo-300">{progress}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-600 to-blue-800 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8 mb-6 backdrop-blur-sm shadow-2xl shadow-blue-600/5">
          {step === 1 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q1Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q1Subtitle}</p>
              <div className="space-y-3">
                {t.quiz.q1Options.map((type) => (
                  <button
                    key={type}
                    onClick={() => setAnswers({ ...answers, businessType: type })}
                    className={optionButtonClass(answers.businessType === type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q2Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q2Subtitle}</p>
              <div className="space-y-3">
                {t.quiz.q2Options.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAnswers({ ...answers, stage: s })}
                    className={optionButtonClass(answers.stage === s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q3Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q3Subtitle}</p>
              <div className="space-y-3">
                {t.quiz.q3Options.map((time) => (
                  <button
                    key={time}
                    onClick={() => setAnswers({ ...answers, weeklyTime: time })}
                    className={optionButtonClass(answers.weeklyTime === time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q4Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q4Subtitle}</p>
              <div className="space-y-3">
                {t.quiz.q4Options.map((budget) => (
                  <button
                    key={budget}
                    onClick={() => setAnswers({ ...answers, budget })}
                    className={optionButtonClass(answers.budget === budget)}
                  >
                    {budget}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q5Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q5Subtitle}</p>
              <textarea
                value={answers.challenge}
                onChange={(e) => setAnswers({ ...answers, challenge: e.target.value })}
                placeholder={t.quiz.q5Placeholder}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all min-h-36 resize-none"
              />
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">{t.quiz.q6Title}</h2>
              <p className="text-gray-400 text-sm mb-6">{t.quiz.q6Subtitle}</p>
              <textarea
                value={answers.niche}
                onChange={(e) => setAnswers({ ...answers, niche: e.target.value })}
                placeholder={t.quiz.q6Placeholder}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:bg-white/[0.07] transition-all min-h-36 resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.quiz.previous}
          </button>
          {step < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-400 hover:to-blue-600 font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-100"
            >
              {t.quiz.next}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-blue-800 hover:from-emerald-400 hover:to-blue-700 font-bold shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-100"
            >
              {t.quiz.generate}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
