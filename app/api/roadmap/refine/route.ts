import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getEffectiveTier, REFINE_LIMITS } from '@/lib/rate-limit';

export const maxDuration = 60;
export const runtime = 'nodejs';

type QuizAnswers = {
  businessType?: string;
  stage?: string;
  budget?: string;
  challenge?: string;
  niche?: string;
  weeklyTime?: string;
};

type Locale = 'fr' | 'en';

type RefineBody = {
  roadmapId?: string;
  changes?: string;       // "Qu'est-ce qui a changé depuis ta dernière roadmap ?"
  currentIdea?: string;   // "Ton idée business actuelle, en 1 phrase claire"
  blocker?: string;       // "Ton plus gros blocage maintenant"
  locale?: Locale;
};

/**
 * POST /api/roadmap/refine
 *
 * Regenerates an EXISTING roadmap based on the user's evolution:
 *   - original quiz answers
 *   - 30 most recent chat messages (context the AI already has)
 *   - 3 new short answers (what's changed, current idea, current blocker)
 *
 * Updates the same roadmap row (no new row, no quota consumption — refining
 * is free since the user already paid for that roadmap slot).
 * Resets task_completions because the phases/tasks change.
 */
export async function POST(request: Request) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'CLAUDE_API_KEY missing.' }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: RefineBody;
  try {
    body = (await request.json()) as RefineBody;
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const locale: Locale = body?.locale === 'en' ? 'en' : 'fr';
  const changes = (body.changes ?? '').trim().slice(0, 1000);
  const currentIdea = (body.currentIdea ?? '').trim().slice(0, 500);
  const blocker = (body.blocker ?? '').trim().slice(0, 1000);

  if (!changes && !currentIdea && !blocker) {
    return Response.json(
      { error: locale === 'en' ? 'Please describe what changed' : 'Décris ce qui a changé' },
      { status: 400 }
    );
  }

  // Resolve target roadmap: explicit id wins, otherwise the user's most recent.
  let roadmapId = (body.roadmapId ?? '').trim() || null;
  if (!roadmapId) {
    const { data: latest } = await supabase
      .from('roadmaps')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    roadmapId = latest?.id ?? null;
  }
  if (!roadmapId) {
    return Response.json(
      { error: locale === 'en' ? 'No roadmap to refine yet' : 'Aucune roadmap à mettre à jour' },
      { status: 404 }
    );
  }

  // Verify ownership AND fetch original quiz answers + current title.
  const { data: existing, error: loadErr } = await supabase
    .from('roadmaps')
    .select('id, name, data, quiz_answers')
    .eq('id', roadmapId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (loadErr || !existing) {
    return Response.json({ error: 'Roadmap not found' }, { status: 404 });
  }

  const originalAnswers = (existing.quiz_answers ?? {}) as QuizAnswers & {
    refined_history?: string[];
  };

  // ------------------------------------------------------------
  // Quota check — count refines across ALL the user's roadmaps in
  // the current calendar month. Stored as a jsonb array of ISO
  // timestamps in each roadmap's quiz_answers.refined_history.
  // ------------------------------------------------------------
  const { tier, isExpired } = await getEffectiveTier(supabase, user.id);
  const refineLimit = isExpired ? 0 : REFINE_LIMITS[tier];

  // Start of the current UTC month (consistent with /api/usage period).
  const now = new Date();
  const periodStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const periodStartIso = `${periodStart}T00:00:00.000Z`;

  const { data: allRoadmaps } = await supabase
    .from('roadmaps')
    .select('quiz_answers')
    .eq('user_id', user.id);

  let refinesThisPeriod = 0;
  for (const r of allRoadmaps ?? []) {
    const history = ((r.quiz_answers as { refined_history?: unknown })?.refined_history ?? []) as unknown[];
    for (const ts of history) {
      if (typeof ts === 'string' && ts >= periodStartIso) refinesThisPeriod += 1;
    }
  }

  if (refinesThisPeriod >= refineLimit) {
    return Response.json(
      {
        error: 'refine_limit_reached',
        kind: 'refine',
        tier,
        isExpired,
        limit: refineLimit,
        used: refinesThisPeriod,
        period: periodStart,
      },
      { status: 429 }
    );
  }

  // Pull the last 30 chat messages for this roadmap — gives the AI the
  // evolution context the user has shared over time.
  const { data: chatRows } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('roadmap_id', roadmapId)
    .order('created_at', { ascending: false })
    .limit(30);
  const recentChat = (chatRows ?? []).reverse(); // chronological order

  const client = new Anthropic({ apiKey });

  // ------------------------------------------------------------
  // Build the refine-specific prompt. Same JSON schema as /generate,
  // but the system prompt acknowledges this is an EVOLUTION of an
  // existing roadmap, not a fresh start.
  // ------------------------------------------------------------
  const systemPrompt = locale === 'en'
    ? `You are an expert business coach updating an EXISTING personalized roadmap based on the user's evolution.

The user already had a roadmap. Over time, things changed — their idea is clearer, their blockers shifted, they've learned things. You now have:
  1. Their original quiz answers
  2. The recent chat history with them
  3. Three new short answers describing what changed

Generate a REFRESHED roadmap in 3 to 5 phases that reflects this evolution.

STRICT RULES:
- DON'T start from scratch — acknowledge what they've already done. If their original roadmap had "Validate the idea" and they now have a clear idea, skip ahead.
- Use the chat history to understand what worked, what didn't, where they got stuck.
- The new answers ARE the ground truth for now — calibrate everything around them.
- Respect the original budget and weekly time unless they've explicitly mentioned a change.
- Each phase: 3 to 5 concrete tasks with realistic durations.
- Address the CURRENT blocker EXPLICITLY — at least one task must respond to it directly.
- Everything in ENGLISH. Tasks: "Action verb + specific object".
- Generate "title" field FIRST, then "phases" in order 1, 2, 3...`
    : `Tu es un coach business expert qui met à jour une roadmap personnalisée EXISTANTE en tenant compte de l'évolution de l'utilisateur.

L'utilisateur avait déjà une roadmap. Avec le temps, des choses ont changé — son idée s'est clarifiée, ses blocages ont évolué, il a appris des trucs. Tu as maintenant :
  1. Ses réponses originales au quiz
  2. L'historique récent de chat avec lui
  3. Trois nouvelles réponses courtes décrivant ce qui a changé

Génère une roadmap RAFRAÎCHIE en 3 à 5 phases qui reflète cette évolution.

RÈGLES STRICTES :
- NE repars PAS de zéro — reconnais ce qu'il a déjà fait. Si sa roadmap d'origine avait "Valider l'idée" et qu'il a maintenant une idée claire, passe à la suite.
- Utilise l'historique du chat pour comprendre ce qui a marché, ce qui n'a pas marché, où il s'est bloqué.
- Les nouvelles réponses sont la vérité actuelle — calibre tout autour d'elles.
- Respecte le budget et le temps hebdomadaire d'origine sauf s'il a mentionné explicitement un changement.
- Chaque phase : 3 à 5 tâches concrètes avec durées réalistes.
- Adresse EXPLICITEMENT le blocage actuel — au moins une tâche doit y répondre directement.
- Tout en français. Tâches : "Verbe d'action + objet précis".
- Génère le champ "title" en PREMIER, puis "phases" dans l'ordre 1, 2, 3...`;

  const noneLabel = locale === 'en' ? 'Not provided' : 'Non renseigné';
  const oldRoadmapTitle = (existing.data as { title?: string } | null)?.title ?? existing.name ?? noneLabel;

  // Compact chat summary for the prompt (keeps token count under control).
  const chatSummary = recentChat.length === 0
    ? (locale === 'en' ? '(no chat history yet)' : '(aucun historique de chat)')
    : recentChat
        .map((m) => `${m.role === 'user' ? 'USER' : 'COACH'}: ${(m.content || '').slice(0, 280)}`)
        .join('\n');

  const userPrompt = locale === 'en'
    ? `## Original quiz answers
- Business type: ${originalAnswers.businessType || noneLabel}
- Stage: ${originalAnswers.stage || noneLabel}
- Budget: ${originalAnswers.budget || noneLabel}
- Original challenge: ${originalAnswers.challenge || noneLabel}
- Niche: ${originalAnswers.niche || noneLabel}
- Time per week: ${originalAnswers.weeklyTime || noneLabel}

## Previous roadmap title
${oldRoadmapTitle}

## Recent chat history (last 30 messages)
${chatSummary}

## What the user just told us (the new ground truth)
- What changed since last roadmap: ${changes || noneLabel}
- Current business idea (one sentence): ${currentIdea || noneLabel}
- Biggest blocker right now: ${blocker || noneLabel}

Generate the refreshed roadmap now, reflecting the evolution.`
    : `## Réponses originales du quiz
- Type de business : ${originalAnswers.businessType || noneLabel}
- Stage : ${originalAnswers.stage || noneLabel}
- Budget : ${originalAnswers.budget || noneLabel}
- Challenge initial : ${originalAnswers.challenge || noneLabel}
- Niche : ${originalAnswers.niche || noneLabel}
- Temps par semaine : ${originalAnswers.weeklyTime || noneLabel}

## Titre de la roadmap précédente
${oldRoadmapTitle}

## Historique récent du chat (30 derniers messages)
${chatSummary}

## Ce que l'utilisateur vient de te dire (la nouvelle vérité)
- Ce qui a changé depuis la dernière roadmap : ${changes || noneLabel}
- Idée business actuelle (en 1 phrase) : ${currentIdea || noneLabel}
- Plus gros blocage maintenant : ${blocker || noneLabel}

Génère la roadmap rafraîchie maintenant, en tenant compte de cette évolution.`;

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

        // ------------------------------------------------------------
        // Persist the refreshed roadmap on the SAME row (no new id,
        // no quota burn). Clear task_completions because phases/tasks
        // are different now — keeping old completions would point at
        // tasks that no longer exist.
        // ------------------------------------------------------------
        try {
          const roadmapData = JSON.parse(accumulatedText) as { title?: string };
          const finalName =
            (typeof roadmapData.title === 'string' && roadmapData.title.trim())
              ? roadmapData.title.trim().slice(0, 100)
              : (existing.name ?? 'Mon projet');

          // Merge: keep original quiz_answers but overlay the new context as
          // a `refined_*` sub-object so we keep a trail of evolution for
          // future refines. `refined_history` is the source of truth for
          // the per-month quota check above (array of ISO timestamps).
          const refineTimestamp = new Date().toISOString();
          const previousHistory = Array.isArray(originalAnswers.refined_history)
            ? originalAnswers.refined_history.filter((x): x is string => typeof x === 'string')
            : [];
          const mergedAnswers = {
            ...originalAnswers,
            refined_at: refineTimestamp,
            refined_changes: changes,
            refined_currentIdea: currentIdea,
            refined_blocker: blocker,
            refined_history: [...previousHistory, refineTimestamp],
          };

          const { error: updateErr } = await supabase
            .from('roadmaps')
            .update({
              data: roadmapData,
              name: finalName,
              quiz_answers: mergedAnswers,
              updated_at: new Date().toISOString(),
            })
            .eq('id', roadmapId)
            .eq('user_id', user.id);
          if (updateErr) {
            console.error('Failed to persist refined roadmap:', updateErr);
          }

          // Reset completions — tasks have changed; old phase_idx/task_idx
          // would point to wrong tasks otherwise.
          const { error: delErr } = await supabase
            .from('task_completions')
            .delete()
            .eq('roadmap_id', roadmapId);
          if (delErr) {
            console.error('Failed to clear task_completions after refine:', delErr);
          }
        } catch (parseErr) {
          console.error('Failed to parse refined roadmap JSON:', parseErr);
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
      // Reuse the same id so the client knows which roadmap got refreshed.
      'X-Roadmap-Id': roadmapId,
      'Access-Control-Expose-Headers': 'X-Roadmap-Id',
    },
  });
}
