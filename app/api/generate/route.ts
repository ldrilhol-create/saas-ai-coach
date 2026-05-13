import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { incrementUsage, limitExceededPayload } from '@/lib/rate-limit';

export const maxDuration = 60;

type QuizAnswers = {
  businessType?: string;
  stage?: string;
  budget?: string;
  challenge?: string;
  niche?: string;
  weeklyTime?: string;
};

type Locale = 'fr' | 'en';

export async function POST(request: Request) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'CLAUDE_API_KEY missing.' },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let answers: QuizAnswers;
  let locale: Locale = 'fr';
  try {
    const body = await request.json();
    answers = body?.answers ?? {};
    if (body?.locale === 'en') locale = 'en';
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!answers || Object.keys(answers).length === 0) {
    const { data: existing } = await supabase
      .from('roadmaps')
      .select('quiz_answers')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.quiz_answers) {
      answers = existing.quiz_answers as QuizAnswers;
    }
  }

  const usage = await incrementUsage(supabase, user.id, 'roadmap');
  if (!usage.allowed) {
    return Response.json(limitExceededPayload(usage, 'roadmap'), { status: 429 });
  }

  // Multi-roadmap support: insert a placeholder row up front so we can stream
  // and reference it by id. Auto-name from quiz answers (truncated).
  const baseName = [answers.businessType, answers.niche].filter(Boolean).join(' – ') || 'Mon projet';
  const roadmapName = baseName.length > 60 ? baseName.slice(0, 57) + '...' : baseName;

  const { data: newRoadmap, error: insertErr } = await supabase
    .from('roadmaps')
    .insert({
      user_id: user.id,
      name: roadmapName,
      data: { title: roadmapName, phases: [] },
      quiz_answers: answers,
    })
    .select('id')
    .single();

  if (insertErr || !newRoadmap) {
    return Response.json(
      { error: `Failed to create roadmap: ${insertErr?.message ?? 'unknown'}` },
      { status: 500 }
    );
  }
  const roadmapId = newRoadmap.id as string;

  const client = new Anthropic({ apiKey });

  const systemPrompt = locale === 'en'
    ? `You are an expert business coach generating personalized and actionable roadmaps.

From the diagnostic answers, generate a concrete roadmap in 3 to 5 phases.

STRICT RULES:
- Adapt the phases to the current stage. Someone at "$10k/month" or "Scaling" must NOT start with "Validate the idea" — start with optimization/scaling.
- Respect the budget. No "$500/day Google Ads" for someone at $0. Prioritize organic, word-of-mouth, communities.
- Personalize around the business type (Ecommerce ≠ SaaS ≠ Service-based).
- Address the mentioned challenge EXPLICITLY — at least one task must respond to it directly.
- Mention the target niche in at least 2 tasks.
- Each phase: 3 to 5 concrete tasks with realistic durations (days/weeks).
- CALIBRATE task durations based on the weekly time available. Someone with <5h/week takes 3-4× longer than someone full-time. A task "Interview 15 people": 1 week full-time, 3-4 weeks at 5h/week. Be REALISTIC — underestimating demotivates.
- Everything in ENGLISH. Task format: "Action verb + specific object" (ex: "Interview 10 freelance graphic designers on LinkedIn").
- Generate the "title" field FIRST, then "phases" in order 1, 2, 3...`
    : `Tu es un coach business francophone expert qui génère des roadmaps personnalisées et actionnables.

À partir des réponses au quiz, génère une roadmap concrète en 3 à 5 phases.

RÈGLES STRICTES :
- Adapte les phases au stage actuel. Quelqu'un à "10k/month" ou "Scaling" ne doit PAS démarrer par "Valider l'idée" — commence par optimiser/scaler.
- Respecte le budget. Pas de "Google Ads $500/jour" pour quelqu'un à $0. Privilégie l'organique, le bouche-à-oreille, les communautés.
- Personnalise autour du type de business (Ecommerce ≠ SaaS ≠ Service-based).
- Adresse EXPLICITEMENT le challenge mentionné — au moins une tâche doit y répondre directement.
- Mentionne la niche cible dans au moins 2 tâches.
- Chaque phase : 3 à 5 tâches concrètes avec durées réalistes (jours/semaines).
- CALIBRE les durées des tâches selon le temps hebdomadaire disponible. Quelqu'un à <5h/semaine met 3-4× plus de temps que quelqu'un à temps plein. Une tâche "Interviewer 15 personnes" : 1 semaine en temps plein, 3-4 semaines à 5h/semaine. Sois RÉALISTE — sous-estimer démotive.
- Tout en français. Tâches au format "Action verbe + objet précis" (ex : "Interviewer 10 freelances graphistes sur LinkedIn").
- Génère le champ "title" en PREMIER, puis "phases" dans l'ordre 1, 2, 3...`;

  const noneLabel = locale === 'en' ? 'Not provided' : 'Non renseigné';
  const userPrompt = locale === 'en'
    ? `Diagnostic answers:

- Business type: ${answers.businessType || noneLabel}
- Current stage: ${answers.stage || noneLabel}
- Budget: ${answers.budget || noneLabel}
- Biggest challenge: ${answers.challenge || noneLabel}
- Target niche: ${answers.niche || noneLabel}
- Time available per week: ${answers.weeklyTime || noneLabel}

Generate the personalized roadmap now, with REALISTIC durations calibrated to the user's weekly time.`
    : `Réponses du diagnostic :

- Type de business : ${answers.businessType || noneLabel}
- Stage actuel : ${answers.stage || noneLabel}
- Budget : ${answers.budget || noneLabel}
- Plus gros challenge : ${answers.challenge || noneLabel}
- Niche cible : ${answers.niche || noneLabel}
- Temps disponible par semaine : ${answers.weeklyTime || noneLabel}

Génère la roadmap personnalisée maintenant, avec des durées RÉALISTES calibrées sur le temps hebdomadaire de l'utilisateur.`;

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let accumulatedText = '';
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          thinking: { type: 'disabled' },
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          output_config: {
            effort: 'low',
            format: {
              type: 'json_schema',
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  phases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        phase: { type: 'integer' },
                        name: { type: 'string' },
                        duration: { type: 'string' },
                        tasks: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              title: { type: 'string' },
                              duration: { type: 'string' },
                            },
                            required: ['title', 'duration'],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ['phase', 'name', 'duration', 'tasks'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['title', 'phases'],
                additionalProperties: false,
              },
            },
          },
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulatedText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        try {
          const roadmapData = JSON.parse(accumulatedText) as { title?: string };
          // Update the placeholder row with the real generated data + a better
          // name if Claude produced a more descriptive title.
          const finalName =
            (typeof roadmapData.title === 'string' && roadmapData.title.trim())
              ? roadmapData.title.trim().slice(0, 100)
              : roadmapName;
          const { error: updateErr } = await supabase
            .from('roadmaps')
            .update({
              data: roadmapData,
              name: finalName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', roadmapId)
            .eq('user_id', user.id);
          if (updateErr) {
            console.error('Failed to persist roadmap:', updateErr);
          }
          // No need to clear task_completions: this is a NEW roadmap (new id),
          // so it has zero completions by construction.
        } catch (parseErr) {
          console.error('Failed to parse roadmap JSON for persistence:', parseErr);
        }

        controller.close();
      } catch (err) {
        const msg = err instanceof Anthropic.APIError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Erreur streaming';
        controller.enqueue(encoder.encode(`\n__ERROR__${msg}`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      // Client reads this and stores it as the active roadmap id.
      'X-Roadmap-Id': roadmapId,
      'Access-Control-Expose-Headers': 'X-Roadmap-Id',
    },
  });
}
