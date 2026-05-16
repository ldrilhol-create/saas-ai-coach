'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n';

// Map our app locale to a BCP-47 tag for date formatting.
// Using `undefined` falls back to the runtime's default locale, which differs
// between Node.js (en-US) and the user's browser → causes hydration mismatch.
const dateLocale = (l: 'fr' | 'en') => (l === 'en' ? 'en-US' : 'fr-FR');

type Task = { title?: string; duration?: string };
type Phase = { phase?: number; name?: string; duration?: string; tasks?: Task[] };
type Roadmap = { title?: string; phases?: Phase[] };
type QuizAnswers = {
  businessType?: string;
  stage?: string;
  weeklyTime?: string;
  budget?: string;
  challenge?: string;
  niche?: string;
};

function PrintPageInner() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { t, locale } = useLang();
  const searchParams = useSearchParams();
  const idFromQuery = searchParams.get('id');

  const [loaded, setLoaded] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [quiz, setQuiz] = useState<QuizAnswers | null>(null);
  const [completions, setCompletions] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace('/login?next=/roadmap/print');
        return;
      }

      // Determine which roadmap to print: explicit ?id= wins, otherwise fall
      // back to the user's most recent roadmap (graceful default).
      let roadmapId = idFromQuery;
      if (!roadmapId) {
        const { data: latest } = await supabase
          .from('roadmaps')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        roadmapId = latest?.id ?? null;
      }

      if (!roadmapId) {
        setLoaded(true);
        return;
      }

      const [roadmapRes, completionsRes] = await Promise.all([
        supabase
          .from('roadmaps')
          .select('data, quiz_answers')
          .eq('id', roadmapId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('task_completions')
          .select('phase_idx, task_idx')
          .eq('roadmap_id', roadmapId),
      ]);

      if (cancelled) return;

      if (roadmapRes.data?.data) setRoadmap(roadmapRes.data.data as Roadmap);
      if (roadmapRes.data?.quiz_answers) setQuiz(roadmapRes.data.quiz_answers as QuizAnswers);
      if (completionsRes.data) {
        setCompletions(
          new Set(completionsRes.data.map((c) => `${c.phase_idx}-${c.task_idx}`))
        );
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router, supabase, idFromQuery]);

  // Auto-trigger the browser's print dialog once data is rendered.
  useEffect(() => {
    if (!loaded || !roadmap) return;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [loaded, roadmap]);

  const phases = roadmap?.phases ?? [];
  const generatedAt = new Date().toLocaleDateString(dateLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalTasks = phases.reduce((sum, p) => sum + (p.tasks?.length ?? 0), 0);
  const doneTasks = completions.size;

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 1.5cm;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .phase-block {
            page-break-inside: avoid;
          }
          body {
            background: white !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-amber-50 border-b border-amber-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{t.pdfExport.printingTitle}</p>
          <p className="text-sm text-gray-600">{t.pdfExport.printingHint}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
          >
            {t.pdfExport.printNow}
          </button>
          <button
            onClick={() => router.push('/roadmap')}
            className="px-5 py-2.5 rounded-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-4 pb-6 border-b-2 border-gray-200 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-white text-sm">
              AI
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">AI Business Coach</p>
              <p className="text-xs text-gray-500">{t.footer.poweredBy}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-right">
            {t.pdfExport.generatedOn}<br />
            <span className="text-gray-700 font-medium">{generatedAt}</span>
          </p>
        </header>

        <h1 className="text-3xl font-bold mb-2 leading-tight text-gray-900">
          {roadmap?.title || '—'}
        </h1>
        {totalTasks > 0 && (
          <p className="text-sm text-gray-600 mb-8">
            {doneTasks} / {totalTasks} {t.roadmap.tasks} ·{' '}
            {Math.round((doneTasks / totalTasks) * 100)}%
          </p>
        )}

        {quiz && (
          <section className="phase-block mb-10 bg-gray-50 border border-gray-200 rounded-lg p-5">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
              {t.pdfExport.diagnosticTitle}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DiagItem label={t.pdfExport.diagBusinessType} value={quiz.businessType} />
              <DiagItem label={t.pdfExport.diagStage} value={quiz.stage} />
              <DiagItem label={t.pdfExport.diagWeeklyTime} value={quiz.weeklyTime} />
              <DiagItem label={t.pdfExport.diagBudget} value={quiz.budget} />
              <DiagItem label={t.pdfExport.diagChallenge} value={quiz.challenge} />
              <DiagItem label={t.pdfExport.diagNiche} value={quiz.niche} />
            </dl>
          </section>
        )}

        <div className="space-y-7">
          {phases.map((phase, phaseIdx) => {
            const tasks = phase.tasks ?? [];
            return (
              <section key={phaseIdx} className="phase-block">
                <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900">
                    {t.pdfExport.phaseLabel} {phase.phase ?? phaseIdx + 1}
                    {phase.name ? ` — ${phase.name}` : ''}
                  </h2>
                  {phase.duration && (
                    <span className="text-xs text-gray-500">
                      {t.pdfExport.duration}: {phase.duration}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mt-3">
                  {tasks.map((task, taskIdx) => {
                    const isDone = completions.has(`${phaseIdx}-${taskIdx}`);
                    return (
                      <li key={taskIdx} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded border ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-400 bg-white'
                          }`}
                          aria-hidden
                        >
                          {isDone ? '✓' : ''}
                        </span>
                        <span className={isDone ? 'text-gray-500 line-through' : 'text-gray-800'}>
                          <span className="font-medium">{task.title || '—'}</span>
                          {task.duration && (
                            <span className="text-gray-500 ml-2">· {task.duration}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          {t.pdfExport.footerNote}
        </footer>
      </main>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-400 border-t-transparent" />
      </div>
    }>
      <PrintPageInner />
    </Suspense>
  );
}

function DiagItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium">{value}</dd>
    </div>
  );
}
