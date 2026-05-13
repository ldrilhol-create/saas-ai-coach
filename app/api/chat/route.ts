import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { incrementUsage, limitExceededPayload, getModelForTier } from '@/lib/rate-limit';

export const maxDuration = 60;

type Task = { title?: string; duration?: string };
type Phase = { phase?: number; name?: string; duration?: string; tasks?: Task[] };
type Roadmap = { title?: string; phases?: Phase[] };

const MAX_TOOL_ITERATIONS = 5;
const META_SENTINEL = '\n__META__';
const ERROR_SENTINEL = '\n__ERROR__';

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

  let parsedBody: {
    message?: unknown;
    history?: unknown;
    roadmap?: Roadmap;
    locale?: unknown;
    roadmapId?: unknown;
  };
  try {
    parsedBody = (await request.json()) as typeof parsedBody;
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const { message, history, roadmap } = parsedBody;
  const locale: 'fr' | 'en' = parsedBody.locale === 'en' ? 'en' : 'fr';
  if (typeof message !== 'string' || !message.trim()) {
    return Response.json({ error: 'Message vide.' }, { status: 400 });
  }

  // Multi-roadmap: every chat message is scoped to a specific roadmap.
  const roadmapId = typeof parsedBody.roadmapId === 'string' ? parsedBody.roadmapId : null;
  if (!roadmapId) {
    return Response.json({ error: 'roadmapId requis' }, { status: 400 });
  }
  // Verify ownership (defense in depth — RLS would block anyway).
  const { data: ownedRoadmap } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('id', roadmapId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedRoadmap) {
    return Response.json({ error: 'Roadmap introuvable' }, { status: 404 });
  }

  const usage = await incrementUsage(supabase, user.id, 'message');
  if (!usage.allowed) {
    return Response.json(limitExceededPayload(usage, 'message'), { status: 429 });
  }

  // Strategy B: Starter → Sonnet (volume tier, cheap), other tiers → Opus.
  const chatModel = getModelForTier(usage.tier);

  // Premium feature: durable client notes. Loaded into the system prompt so the
  // coach "remembers" the user across sessions, beyond chat history.
  const isPremium = usage.tier === 'premium';
  type ClientNote = { id: string; content: string; category: string };
  let clientNotes: ClientNote[] = [];
  if (isPremium) {
    const { data: notesData } = await supabase
      .from('client_notes')
      .select('id, content, category')
      .eq('user_id', user.id)
      .eq('roadmap_id', roadmapId)
      .order('created_at', { ascending: false })
      .limit(40);
    if (notesData) clientNotes = notesData as ClientNote[];
  }

  const { data: completionsData } = await supabase
    .from('task_completions')
    .select('phase_idx, task_idx')
    .eq('user_id', user.id)
    .eq('roadmap_id', roadmapId);

  const completedKeys = new Set<string>();
  const completedTaskLabels: string[] = [];
  if (completionsData && roadmap?.phases) {
    for (const c of completionsData) {
      completedKeys.add(`${c.phase_idx}-${c.task_idx}`);
      const phase = roadmap.phases[c.phase_idx];
      const task = phase?.tasks?.[c.task_idx];
      if (task?.title) {
        completedTaskLabels.push(
          `Phase ${phase?.phase ?? c.phase_idx + 1} (${phase?.name ?? '?'}) — ${task.title}`
        );
      }
    }
  }

  const totalTasks = (roadmap?.phases ?? []).reduce(
    (sum, p) => sum + (p.tasks?.length ?? 0),
    0
  );
  const completedCount = completedTaskLabels.length;
  const progressionLine =
    totalTasks > 0
      ? `${completedCount}/${totalTasks} tâches complétées (${Math.round((completedCount / totalTasks) * 100)}%)`
      : 'progression non mesurable (roadmap vide)';

  const inProgressPhaseIdx = (roadmap?.phases ?? []).findIndex((phase, phaseIdx) => {
    const tasks = phase.tasks ?? [];
    if (tasks.length === 0) return false;
    const allDone = tasks.every((_, taskIdx) => completedKeys.has(`${phaseIdx}-${taskIdx}`));
    return !allDone;
  });
  const currentPhase =
    inProgressPhaseIdx >= 0 ? roadmap?.phases?.[inProgressPhaseIdx] : undefined;

  const nextTasksList: string[] = [];
  if (currentPhase && inProgressPhaseIdx >= 0) {
    (currentPhase.tasks ?? []).forEach((t, taskIdx) => {
      if (!completedKeys.has(`${inProgressPhaseIdx}-${taskIdx}`) && t.title) {
        nextTasksList.push(`Phase ${inProgressPhaseIdx} / Tâche ${taskIdx} — ${t.title}`);
      }
    });
  }

  const completedSection =
    completedTaskLabels.length > 0
      ? `TÂCHES DÉJÀ COMPLÉTÉES (${completedCount}) :\n${completedTaskLabels.map((t) => `- ${t}`).join('\n')}`
      : 'TÂCHES DÉJÀ COMPLÉTÉES : aucune.';

  const phaseInProgressSection =
    currentPhase && inProgressPhaseIdx >= 0
      ? `PHASE EN COURS : indice ${inProgressPhaseIdx} — Phase ${currentPhase.phase ?? inProgressPhaseIdx + 1} (${currentPhase.name ?? ''}).
PROCHAINES TÂCHES NON FAITES (avec leurs indices) :
${nextTasksList.map((t) => `- ${t}`).join('\n')}`
      : 'PHASE EN COURS : toutes les phases sont terminées, l\'utilisateur est en mode optimisation.';

  // System prompt is split into two blocks for prompt caching:
  // - staticPrompt: coach instructions + roadmap JSON (rarely changes → cache hit)
  // - dynamicPrompt: progress + completed tasks + current phase (changes every msg)
  // The cache_control on staticPrompt covers the cumulative prefix (system + tools).
  const staticPrompt = locale === 'en'
    ? `You are an experienced digital business coach helping entrepreneurs. You are direct, demanding, supportive, and you refuse generic answers.

COACHING METHOD
---------------
1. If the user indicates they completed one or several tasks (e.g. "I did the interviews", "the landing page is done"), IMMEDIATELY use the mark_task_complete tool with the correct indices to check the box automatically. Identify the right task in the roadmap. If several tasks: call the tool multiple times. If you are unsure WHICH ONE they mean, ask for confirmation before marking.
2. If the question is vague, ASK 1 or 2 targeted diagnostic questions before giving your advice. Don't guess.
3. Reference their real progress. Acknowledge what's done, point to the next concrete action based on the current phase.
4. Give advice SPECIFIC to their business (type / stage / budget / niche), never universal platitudes.
5. If the question involves up-to-date information (current tools and prices, recent statistics, marketing trends, product comparisons, competitive data), USE the web_search tool to fetch fresh info before answering.
6. Don't repeat advice already given in history.
7. End with a clear question or call to action.

FORM CONSTRAINTS
----------------
- Reply in ENGLISH.
- 100-250 words normally, longer only if the question really needs more detail.
- Start directly with the substance. FORBIDDEN: "Great!", "Awesome question!", "Of course!".
- Warm but professional tone. Use casual "you".

USER CONTEXT — FULL ROADMAP
---------------------------
(Indices start at 0 — first phase = 0, first task of that phase = 0.)
${JSON.stringify(roadmap, null, 2)}`
    : `Tu es un coach business digital expérimenté qui accompagne des entrepreneurs francophones. Tu es direct, exigeant, bienveillant, et tu refuses les réponses génériques.

MÉTHODE DE COACH
----------------
1. Si l'utilisateur indique avoir terminé une ou plusieurs tâches (par exemple "j'ai fait les interviews", "c'est fait pour la landing page"), utilise IMMÉDIATEMENT l'outil mark_task_complete avec les bons indices pour cocher la case automatiquement. Identifie la bonne tâche dans la roadmap. Si plusieurs tâches : appelle l'outil plusieurs fois. Si tu n'es pas sûr DE LAQUELLE il parle, demande confirmation avant de marquer.
2. Si la question est vague, POSE 1 ou 2 questions diagnostiques ciblées avant de donner ton conseil. Ne devine pas.
3. Référence sa progression réelle. Valorise ce qui est fait, oriente vers la prochaine action concrète selon la phase en cours.
4. Donne des conseils SPÉCIFIQUES à son business (type / stage / budget / niche), jamais des platitudes universelles.
5. Si la question implique des informations à jour (outils actuels et prix, statistiques récentes, tendances marketing, comparaison de produits, données concurrentielles), UTILISE l'outil web_search pour récupérer des infos fraîches avant de répondre.
6. Ne répète pas un conseil déjà donné dans l'historique.
7. Termine par une question ou un appel à l'action clair.

CONTRAINTES DE FORME
--------------------
- Réponds en FRANÇAIS.
- 100-250 mots normalement, plus long uniquement si la question demande vraiment plus de détail.
- Démarre direct sur le fond. INTERDIT : "Génial !", "Super initiative", "C'est une excellente question", "Bien sûr !".
- Ton chaleureux mais professionnel. Tutoiement.

CONTEXTE UTILISATEUR — ROADMAP COMPLÈTE
---------------------------------------
(Les indices commencent à 0 — première phase = 0, première tâche de cette phase = 0.)
${JSON.stringify(roadmap, null, 2)}`;

  const notesSection = (() => {
    if (!isPremium) return '';
    if (clientNotes.length === 0) {
      return locale === 'en'
        ? `\n\nDURABLE NOTES ABOUT THIS USER: none yet. As you learn meaningful things (goals, recurring blockers, wins, business context), call the add_client_note tool so future you remembers.`
        : `\n\nNOTES DURABLES SUR CE USER : aucune pour l'instant. Quand tu apprends des choses importantes (objectifs, blocages récurrents, victoires, contexte business), utilise l'outil add_client_note pour que ton "toi futur" s'en souvienne.`;
    }
    const lines = clientNotes.map((n) => `- [${n.category.toUpperCase()}] ${n.content}`).join('\n');
    return locale === 'en'
      ? `\n\nDURABLE NOTES ABOUT THIS USER (kept across sessions — reference them naturally):
${lines}

When you learn something new and durable about the user, call add_client_note. Don't duplicate existing notes.`
      : `\n\nNOTES DURABLES SUR CE USER (conservées entre sessions — réfère-toi à elles naturellement) :
${lines}

Quand tu apprends quelque chose de nouveau et durable sur le user, appelle add_client_note. Ne duplique pas les notes existantes.`;
  })();

  const dynamicPrompt = locale === 'en'
    ? `CURRENT STATE (updates each message)
-----------------------------------
PROGRESS: ${progressionLine}

${completedSection}

${phaseInProgressSection}${notesSection}`
    : `ÉTAT ACTUEL (mis à jour à chaque message)
-----------------------------------------
PROGRESSION : ${progressionLine}

${completedSection}

${phaseInProgressSection}${notesSection}`;

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: staticPrompt,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: dynamicPrompt,
    },
  ];

  const previousMessages: Anthropic.MessageParam[] = Array.isArray(history)
    ? (history as Array<{ role?: string; content?: string }>)
        .filter(
          (m): m is { role: 'user' | 'assistant'; content: string } =>
            !!m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const { error: insertUserErr } = await supabase
    .from('chat_messages')
    .insert({ user_id: user.id, roadmap_id: roadmapId, role: 'user', content: message });
  if (insertUserErr) {
    console.error('Failed to persist user message:', insertUserErr);
  }

  const tools = [
    { type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 3 },
    {
      name: 'mark_task_complete',
      description:
        'Marque une tâche de la roadmap comme complétée. Utilise cet outil UNIQUEMENT quand l\'utilisateur indique clairement avoir terminé une tâche spécifique. Les indices sont 0-based (première phase = 0, première tâche de cette phase = 0). Si plusieurs tâches sont annoncées, appelle l\'outil plusieurs fois (une fois par tâche). Ne pas utiliser pour des progrès partiels.',
      input_schema: {
        type: 'object' as const,
        properties: {
          phase_idx: {
            type: 'integer',
            description: 'Indice 0-based de la phase contenant la tâche',
          },
          task_idx: {
            type: 'integer',
            description: 'Indice 0-based de la tâche dans cette phase',
          },
        },
        required: ['phase_idx', 'task_idx'],
      },
    },
    ...(isPremium
      ? [{
          name: 'add_client_note',
          description:
            'Save a durable note about this user that should persist beyond the current chat session. Use this when you learn something meaningful: their long-term goals, recurring blockers, notable wins, business context, personal preferences for coaching style. Keep notes concise (1-2 sentences max). Do NOT use for short-lived info or things already obvious from the roadmap. Do not duplicate existing notes.',
          input_schema: {
            type: 'object' as const,
            properties: {
              content: {
                type: 'string',
                description: 'The note content. Concise, factual, useful for future sessions.',
              },
              category: {
                type: 'string',
                enum: ['goal', 'blocker', 'win', 'context'],
                description: 'Type of note: goal=long-term objective, blocker=recurring obstacle, win=notable success, context=business/personal background.',
              },
            },
            required: ['content', 'category'],
          },
        }]
      : []),
  ];

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const conversation: Anthropic.MessageParam[] = [
        ...previousMessages,
        { role: 'user', content: message },
      ];
      const newlyCompleted: Array<{ phase_idx: number; task_idx: number }> = [];
      const newlyCompletedKeys = new Set<string>();
      let fullText = '';

      try {
        let iterations = 0;
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const stream = client.messages.stream({
            model: chatModel,
            max_tokens: 2048,
            system: systemBlocks,
            messages: conversation,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: tools as any,
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
              fullText += event.delta.text;
            }
          }

          const finalMessage = await stream.finalMessage();

          if (finalMessage.stop_reason !== 'tool_use') break;

          conversation.push({ role: 'assistant', content: finalMessage.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMessage.content) {
            if (block.type !== 'tool_use') continue;

            let resultContent: string;

            if (block.name === 'mark_task_complete') {
              const input = block.input as { phase_idx?: unknown; task_idx?: unknown };
              const phase_idx = Number(input?.phase_idx);
              const task_idx = Number(input?.task_idx);
              const key = `${phase_idx}-${task_idx}`;

              const phase = roadmap?.phases?.[phase_idx];
              const task = phase?.tasks?.[task_idx];

              if (!Number.isInteger(phase_idx) || !Number.isInteger(task_idx) || !task) {
                resultContent = `Erreur : la tâche (phase_idx=${phase_idx}, task_idx=${task_idx}) n'existe pas dans la roadmap.`;
              } else if (completedKeys.has(key)) {
                resultContent = `La tâche "${task.title}" est déjà marquée comme complétée.`;
              } else {
                const { error: upsertErr } = await supabase
                  .from('task_completions')
                  .upsert(
                    { user_id: user.id, roadmap_id: roadmapId, phase_idx, task_idx },
                    { onConflict: 'roadmap_id,phase_idx,task_idx' }
                  );
                if (upsertErr) {
                  console.error('Failed to mark task complete:', upsertErr);
                  resultContent = `Erreur lors de l'enregistrement : ${upsertErr.message}`;
                } else {
                  completedKeys.add(key);
                  if (!newlyCompletedKeys.has(key)) {
                    newlyCompletedKeys.add(key);
                    newlyCompleted.push({ phase_idx, task_idx });
                  }
                  resultContent = `Tâche "${task.title}" marquée comme complétée.`;
                }
              }
            } else if (block.name === 'add_client_note' && isPremium) {
              const input = block.input as { content?: unknown; category?: unknown };
              const content = typeof input?.content === 'string' ? input.content.trim() : '';
              const category = typeof input?.category === 'string' ? input.category : '';
              const validCategories = ['goal', 'blocker', 'win', 'context'];

              if (!content || !validCategories.includes(category)) {
                resultContent = `Error: invalid note (content empty or category not in ${validCategories.join(', ')}).`;
              } else {
                const { error: insertNoteErr } = await supabase
                  .from('client_notes')
                  .insert({ user_id: user.id, roadmap_id: roadmapId, content, category });
                if (insertNoteErr) {
                  console.error('Failed to save client note:', insertNoteErr);
                  resultContent = `Error saving note: ${insertNoteErr.message}`;
                } else {
                  resultContent = `Note saved: [${category}] ${content}`;
                }
              }
            } else {
              // Unknown tool or premium tool called by non-premium user (shouldn't happen,
              // tool isn't exposed). Acknowledge to keep the loop alive.
              resultContent = `Tool "${block.name}" not handled.`;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: resultContent,
            });
          }

          if (toolResults.length === 0) break;
          conversation.push({ role: 'user', content: toolResults });
        }

        const assistantText = fullText.trim() || 'Pas de réponse.';

        const { error: insertAsstErr } = await supabase
          .from('chat_messages')
          .insert({ user_id: user.id, roadmap_id: roadmapId, role: 'assistant', content: assistantText });
        if (insertAsstErr) {
          console.error('Failed to persist assistant message:', insertAsstErr);
        }

        controller.enqueue(
          encoder.encode(`${META_SENTINEL}${JSON.stringify({ completed: newlyCompleted })}`)
        );
        controller.close();
      } catch (err) {
        const msg = err instanceof Anthropic.APIError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Erreur streaming';
        controller.enqueue(encoder.encode(`${ERROR_SENTINEL}${msg}`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
