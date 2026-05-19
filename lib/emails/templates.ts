// HTML email templates. All inline CSS for max email-client compatibility.
// Each template returns { subject, html, text } — both HTML and plain-text
// for clients that don't render HTML and for spam-filter scoring.

import { buildUnsubscribeUrl } from './unsubscribe-token';

type Locale = 'fr' | 'en';

type RenderedEmail = { subject: string; html: string; text: string };

// ---------------- Shared layout ----------------

const BRAND_COLOR = '#3b82f6'; // blue-500 — matches the app

function layout(opts: {
  preheader: string;       // Hidden preview text shown in inbox previews
  bodyHtml: string;        // The actual content
  cta: { label: string; href: string };
  unsubscribeUrl: string;
  locale: Locale;
}): string {
  const { preheader, bodyHtml, cta, unsubscribeUrl, locale } = opts;
  const footerLabels = locale === 'fr'
    ? {
        unsub: 'Se désabonner de ces emails',
        site: 'businesscoachai.app',
        legal: 'Tu reçois cet email parce que tu as un compte sur Business Coach AI.',
      }
    : {
        unsub: 'Unsubscribe from these emails',
        site: 'businesscoachai.app',
        legal: 'You receive this email because you have a Business Coach AI account.',
      };

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Business Coach AI</title>
</head>
<body style="margin:0;padding:0;background:#0a0118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <!-- Preheader (hidden) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0118;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#2563eb,#1e40af);width:36px;height:36px;border-radius:10px;text-align:center;color:#fff;font-weight:700;font-size:13px;line-height:36px;">AI</div>
              <span style="margin-left:10px;font-weight:700;font-size:16px;color:#fff;vertical-align:middle;">Business Coach AI</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px 32px;">
              ${bodyHtml}
              <div style="margin-top:28px;">
                <a href="${escapeHtml(cta.href)}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:9999px;">${escapeHtml(cta.label)}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#6b7280;line-height:1.6;">
              <p style="margin:0 0 6px 0;">${escapeHtml(footerLabels.legal)}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(footerLabels.unsub)}</a>
                &nbsp;·&nbsp;
                <a href="https://businesscoachai.app" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(footerLabels.site)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip HTML to produce a plain-text fallback. Crude but enough for our
// short emails — major spam filters look at the text version too.
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------- Welcome (post-signup) ----------------

export function renderWelcome(opts: { userId: string; locale: Locale }): RenderedEmail {
  const { userId, locale } = opts;
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  if (locale === 'fr') {
    const body = `
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#fff;line-height:1.3;">Bienvenue 👋</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        Ton compte Business Coach AI est créé. Tu as <strong style="color:#fff;">7 jours d'essai gratuit</strong> pour tester ton coach IA et générer ta première roadmap.
      </p>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        Pour bien démarrer, une seule chose à faire&nbsp;: répondre au quiz de 6 questions. En 90 secondes tu auras ta roadmap personnalisée et tu pourras commencer à avancer.
      </p>`;
    const html = layout({
      preheader: 'Ton compte est créé. Ta prochaine étape : générer ta roadmap.',
      bodyHtml: body,
      cta: { label: 'Faire mon quiz maintenant', href: 'https://businesscoachai.app/quiz' },
      unsubscribeUrl,
      locale: 'fr',
    });
    return {
      subject: 'Bienvenue sur Business Coach AI — ta prochaine étape',
      html,
      text: htmlToText(body) + '\n\nFaire mon quiz : https://businesscoachai.app/quiz',
    };
  }

  const body = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#fff;line-height:1.3;">Welcome 👋</h1>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      Your Business Coach AI account is ready. You have a <strong style="color:#fff;">7-day free trial</strong> to test the AI coach and generate your first roadmap.
    </p>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      To get going, just one thing to do&nbsp;: answer the 6-question quiz. In 90 seconds you'll have your personalised roadmap and you can start moving.
    </p>`;
  const html = layout({
    preheader: "Your account is live. Next step: generate your roadmap.",
    bodyHtml: body,
    cta: { label: 'Take the quiz now', href: 'https://businesscoachai.app/quiz' },
    unsubscribeUrl,
    locale: 'en',
  });
  return {
    subject: 'Welcome to Business Coach AI — your next step',
    html,
    text: htmlToText(body) + '\n\nTake the quiz: https://businesscoachai.app/quiz',
  };
}

// ---------------- Inactivity (J+5 or J+10) ----------------

export function renderInactivity(opts: {
  userId: string;
  locale: Locale;
  nextTask: string | null;     // null if no roadmap yet
  daysSinceActivity: number;
  isSecondReminder: boolean;
}): RenderedEmail {
  const { userId, locale, nextTask, daysSinceActivity, isSecondReminder } = opts;
  const unsubscribeUrl = buildUnsubscribeUrl(userId);

  // CTA destination depends on whether the user has a roadmap
  const ctaHref = nextTask
    ? 'https://businesscoachai.app/roadmap'
    : 'https://businesscoachai.app/quiz';

  if (locale === 'fr') {
    const ctaLabel = nextTask ? 'Reprendre ma roadmap' : 'Lancer mon quiz';
    const hook = isSecondReminder
      ? `Toujours là ? Ta roadmap aussi.`
      : (nextTask
          ? `Ta prochaine étape t'attend : ${nextTask}`
          : `Ton quiz t'attend toujours`);

    const body = nextTask
      ? `
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
          Ça fait ${daysSinceActivity} jours qu'on ne s'est pas vus. Ton coach IA garde tout en mémoire : ta roadmap, tes objectifs, les tâches que tu avais cochées.
        </p>
        <div style="margin:18px 0;padding:16px 18px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:10px;">
          <p style="margin:0 0 4px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#93c5fd;">Ta prochaine tâche</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(nextTask)}</p>
        </div>
        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
          Reprends où tu en étais. 10 minutes par jour, et ton business avance pour de bon.
        </p>`
      : `
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
          Tu as créé ton compte il y a ${daysSinceActivity} jours, mais le quiz est toujours là à t'attendre.
        </p>
        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
          90 secondes pour répondre à 6 questions, et tu auras ta roadmap personnalisée. Pas de pression — juste la prochaine étape claire.
        </p>`;

    const html = layout({
      preheader: nextTask ? `Ta prochaine tâche : ${nextTask}` : 'Ton quiz t\'attend toujours',
      bodyHtml: body,
      cta: { label: ctaLabel, href: ctaHref },
      unsubscribeUrl,
      locale: 'fr',
    });
    return {
      subject: nextTask
        ? `Ta prochaine étape t'attend : ${nextTask}`
        : 'Ton quiz t\'attend toujours sur Business Coach AI',
      html,
      text: htmlToText(body) + `\n\n${ctaLabel} : ${ctaHref}`,
    };
  }

  // EN
  const ctaLabel = nextTask ? 'Pick up my roadmap' : 'Take my quiz';
  const hook = isSecondReminder
    ? `Still around? Your roadmap is too.`
    : (nextTask
        ? `Your next step is waiting: ${nextTask}`
        : `Your quiz is still waiting`);

  const body = nextTask
    ? `
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        It's been ${daysSinceActivity} days. Your AI coach remembers everything: your roadmap, your goals, the tasks you'd checked off.
      </p>
      <div style="margin:18px 0;padding:16px 18px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:10px;">
        <p style="margin:0 0 4px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#93c5fd;">Your next task</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(nextTask)}</p>
      </div>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        Pick up where you left off. 10 minutes a day, and your business actually moves.
      </p>`
    : `
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        You created your account ${daysSinceActivity} days ago, but the quiz is still waiting.
      </p>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        90 seconds for 6 questions, and you'll have your personalised roadmap. No pressure — just the next step made clear.
      </p>`;

  const html = layout({
    preheader: nextTask ? `Your next task: ${nextTask}` : 'Your quiz is still waiting',
    bodyHtml: body,
    cta: { label: ctaLabel, href: ctaHref },
    unsubscribeUrl,
    locale: 'en',
  });
  return {
    subject: nextTask
      ? `Your next step: ${nextTask}`
      : 'Your quiz is still waiting on Business Coach AI',
    html,
    text: htmlToText(body) + `\n\n${ctaLabel}: ${ctaHref}`,
  };
}

// ---------------- Daily task (chaque matin) ----------------

export function renderDailyTask(opts: {
  userId: string;
  locale: Locale;
  taskTitle: string;
  phaseName: string;
  currentStreak: number;
}): RenderedEmail {
  const { userId, locale, taskTitle, phaseName, currentStreak } = opts;
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  const ctaUrl = 'https://businesscoachai.app/roadmap';
  const streakBadge = currentStreak > 0
    ? (locale === 'fr'
        ? `🔥 ${currentStreak} jours d'affilée — continue !`
        : `🔥 ${currentStreak}-day streak — keep it going!`)
    : (locale === 'fr'
        ? `Tu peux démarrer une série dès aujourd'hui 🌱`
        : `You can start a streak today 🌱`);

  if (locale === 'fr') {
    const body = `
      <h1 style="margin:0 0 14px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">Ta tâche du jour 🎯</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        Une seule chose à faire aujourd'hui pour avancer&nbsp;:
      </p>
      <div style="margin:18px 0;padding:18px 20px;background:rgba(59,130,246,0.1);border-left:4px solid #3b82f6;border-radius:8px;">
        ${phaseName ? `<p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#93c5fd;">${escapeHtml(phaseName)}</p>` : ''}
        <p style="margin:0;font-size:17px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(taskTitle)}</p>
      </div>
      <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#9ca3af;">
        ${escapeHtml(streakBadge)}
      </p>`;
    const html = layout({
      preheader: `Ta tâche du jour : ${taskTitle}`,
      bodyHtml: body,
      cta: { label: "Ouvrir ma roadmap", href: ctaUrl },
      unsubscribeUrl,
      locale: 'fr',
    });
    return {
      subject: `🎯 Ta tâche du jour : ${truncate(taskTitle, 60)}`,
      html,
      text: htmlToText(body) + `\n\nOuvrir ma roadmap : ${ctaUrl}`,
    };
  }

  const body = `
    <h1 style="margin:0 0 14px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">Today's task 🎯</h1>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      One thing to move forward today:
    </p>
    <div style="margin:18px 0;padding:18px 20px;background:rgba(59,130,246,0.1);border-left:4px solid #3b82f6;border-radius:8px;">
      ${phaseName ? `<p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#93c5fd;">${escapeHtml(phaseName)}</p>` : ''}
      <p style="margin:0;font-size:17px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(taskTitle)}</p>
    </div>
    <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#9ca3af;">
      ${escapeHtml(streakBadge)}
    </p>`;
  const html = layout({
    preheader: `Today's task: ${taskTitle}`,
    bodyHtml: body,
    cta: { label: 'Open my roadmap', href: ctaUrl },
    unsubscribeUrl,
    locale: 'en',
  });
  return {
    subject: `🎯 Today's task: ${truncate(taskTitle, 60)}`,
    html,
    text: htmlToText(body) + `\n\nOpen my roadmap: ${ctaUrl}`,
  };
}

// ---------------- Weekly recap (dimanche soir) ----------------

export function renderWeeklyRecap(opts: {
  userId: string;
  locale: Locale;
  tasksDoneThisWeek: number;
  currentStreak: number;
  nextTaskTitle: string | null;
}): RenderedEmail {
  const { userId, locale, tasksDoneThisWeek, currentStreak, nextTaskTitle } = opts;
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  const ctaUrl = 'https://businesscoachai.app/roadmap';

  if (locale === 'fr') {
    const headline = tasksDoneThisWeek === 0
      ? "Pas de tâches cochées cette semaine. On remet ça lundi ?"
      : tasksDoneThisWeek === 1
        ? `Tu as accompli 1 tâche cette semaine. Un pas, c'est mieux que zéro 👏`
        : `Tu as accompli ${tasksDoneThisWeek} tâches cette semaine 👏`;
    const body = `
      <h1 style="margin:0 0 14px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">Ta semaine en bref</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        ${escapeHtml(headline)}
      </p>
      <div style="margin:14px 0;padding:16px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Tâches cochées</td>
            <td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600;text-align:right;">${tasksDoneThisWeek}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Série en cours</td>
            <td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600;text-align:right;">${currentStreak > 0 ? `🔥 ${currentStreak} jours` : '—'}</td>
          </tr>
        </table>
      </div>
      ${nextTaskTitle ? `
      <p style="margin:14px 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#93c5fd;">Focus pour la semaine prochaine</p>
      <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(nextTaskTitle)}</p>
      ` : ''}`;
    const html = layout({
      preheader: headline,
      bodyHtml: body,
      cta: { label: 'Ouvrir ma roadmap', href: ctaUrl },
      unsubscribeUrl,
      locale: 'fr',
    });
    return {
      subject: tasksDoneThisWeek > 0
        ? `Bilan de la semaine : ${tasksDoneThisWeek} tâche${tasksDoneThisWeek > 1 ? 's' : ''} accomplie${tasksDoneThisWeek > 1 ? 's' : ''} 👏`
        : 'Ta semaine sur Business Coach AI',
      html,
      text: htmlToText(body) + `\n\nOuvrir ma roadmap : ${ctaUrl}`,
    };
  }

  const headline = tasksDoneThisWeek === 0
    ? "No tasks checked off this week. Let's bounce back Monday?"
    : tasksDoneThisWeek === 1
      ? `You completed 1 task this week. One step beats zero 👏`
      : `You completed ${tasksDoneThisWeek} tasks this week 👏`;
  const body = `
    <h1 style="margin:0 0 14px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">Your week, in short</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      ${escapeHtml(headline)}
    </p>
    <div style="margin:14px 0;padding:16px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Tasks checked off</td>
          <td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600;text-align:right;">${tasksDoneThisWeek}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Current streak</td>
          <td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600;text-align:right;">${currentStreak > 0 ? `🔥 ${currentStreak} days` : '—'}</td>
        </tr>
      </table>
    </div>
    ${nextTaskTitle ? `
    <p style="margin:14px 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#93c5fd;">Focus for next week</p>
    <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:#fff;line-height:1.4;">${escapeHtml(nextTaskTitle)}</p>
    ` : ''}`;
  const html = layout({
    preheader: headline,
    bodyHtml: body,
    cta: { label: 'Open my roadmap', href: ctaUrl },
    unsubscribeUrl,
    locale: 'en',
  });
  return {
    subject: tasksDoneThisWeek > 0
      ? `Week recap: ${tasksDoneThisWeek} task${tasksDoneThisWeek > 1 ? 's' : ''} completed 👏`
      : 'Your week on Business Coach AI',
    html,
    text: htmlToText(body) + `\n\nOpen my roadmap: ${ctaUrl}`,
  };
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '…';
}

// ---------------- Trial ending (J-2 / J-1) ----------------

export function renderTrialEnding(opts: {
  userId: string;
  locale: Locale;
  daysLeft: 1 | 2;
}): RenderedEmail {
  const { userId, locale, daysLeft } = opts;
  const unsubscribeUrl = buildUnsubscribeUrl(userId);
  const upgradeUrl = 'https://businesscoachai.app/upgrade';

  if (locale === 'fr') {
    const subject = daysLeft === 2
      ? 'Ton essai gratuit se termine dans 2 jours'
      : 'Ton essai gratuit se termine demain';

    const hook = daysLeft === 2
      ? 'Plus que 2 jours d\'essai gratuit'
      : 'Dernier jour de ton essai gratuit';

    const body = `
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        ${daysLeft === 2
          ? 'Ton accès Business Coach AI expire dans 48 heures.'
          : 'Ton accès Business Coach AI expire demain.'} Si tu veux continuer à utiliser ton coach et garder ta roadmap, c'est le moment de choisir un plan.
      </p>
      <div style="margin:18px 0;padding:16px 18px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;">
        <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#fbbf24;">Sans abonnement, tu perds :</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#d1d5db;">
          <li>L'accès à ton coach IA et à ton chat</li>
          <li>La progression de ta roadmap actuelle</li>
          <li>Tes 3 prochains mois pré-construits par l'IA</li>
        </ul>
      </div>
      <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
        Plans à partir de <strong style="color:#fff;">29€/mois</strong>. Annulation en 1 clic, sans engagement.
      </p>`;

    const html = layout({
      preheader: subject,
      bodyHtml: body,
      cta: { label: 'Choisir mon plan', href: upgradeUrl },
      unsubscribeUrl,
      locale: 'fr',
    });
    return {
      subject,
      html,
      text: htmlToText(body) + `\n\nChoisir mon plan : ${upgradeUrl}`,
    };
  }

  // EN
  const subject = daysLeft === 2
    ? 'Your free trial ends in 2 days'
    : 'Your free trial ends tomorrow';

  const hook = daysLeft === 2
    ? '2 days of free trial left'
    : 'Last day of your free trial';

  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${escapeHtml(hook)}</h1>
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      ${daysLeft === 2
        ? 'Your Business Coach AI access expires in 48 hours.'
        : 'Your Business Coach AI access expires tomorrow.'} If you want to keep your coach and your roadmap, now's the time to pick a plan.
    </p>
    <div style="margin:18px 0;padding:16px 18px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;">
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#fbbf24;">Without a plan, you'll lose:</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#d1d5db;">
        <li>Access to your AI coach and chat</li>
        <li>Your current roadmap progress</li>
        <li>Your next 3 months pre-built by the AI</li>
      </ul>
    </div>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#d1d5db;">
      Plans from <strong style="color:#fff;">€29/month</strong>. Cancel in one click, no commitment.
    </p>`;

  const html = layout({
    preheader: subject,
    bodyHtml: body,
    cta: { label: 'Pick my plan', href: upgradeUrl },
    unsubscribeUrl,
    locale: 'en',
  });
  return {
    subject,
    html,
    text: htmlToText(body) + `\n\nPick my plan: ${upgradeUrl}`,
  };
}
