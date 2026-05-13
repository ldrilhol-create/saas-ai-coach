'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Locale = 'fr' | 'en';

const translations = {
  fr: {
    nav: {
      login: 'Connexion',
      subscribe: "S'abonner",
    },
    account: {
      title: 'Mon compte',
      back: 'Retour à la roadmap',
      emailLabel: 'Adresse e-mail',
      planLabel: 'Plan actuel',
      planExpired: '(essai expiré)',
      planRenewsAt: 'Renouvellement le',
      planExpiresAt: 'Expire le',
      usageTitle: 'Utilisation ce mois',
      usageMessages: 'Messages',
      usageRoadmaps: 'Roadmaps',
      managePlan: 'Gérer mon abonnement',
      managePlanSoon: 'Disponible bientôt',
      signout: 'Déconnexion',
      avatarTitle: 'Mon compte',
      langLabel: 'Langue',
      notesTitle: 'Notes du coach',
      notesSubtitle: 'Ton coach IA garde ces notes en mémoire entre les sessions pour personnaliser son accompagnement.',
      notesEmpty: 'Pas encore de notes. Ton coach commencera à en prendre dès que tu lui partages des objectifs, blocages ou victoires.',
      notesProjectPrefix: 'Projet',
      notesDelete: 'Supprimer',
      notesConfirmDelete: 'Supprimer cette note ?',
      noteCategoryGoal: 'Objectif',
      noteCategoryBlocker: 'Blocage',
      noteCategoryWin: 'Victoire',
      noteCategoryContext: 'Contexte',
      prioritySupportTitle: 'Support prioritaire',
      prioritySupportBody: 'En tant que membre Premium, tes demandes passent en priorité. Écris-nous à',
      prioritySupportEmail: 'buisnesscoach@gmail.com',
      prioritySupportSla: 'Réponse sous 24h ouvrées garantie.',
    },
    pdfExport: {
      buttonLabel: 'Exporter en PDF',
      tooltipAvailable: 'Télécharger ta roadmap au format PDF',
      tooltipLocked: 'Disponible avec le plan Pro et Premium',
      lockedTitle: 'Export PDF réservé au plan Pro',
      lockedBody:
        'L\'export PDF de ta roadmap est inclus dans les plans Pro et Premium. Passe sur Pro pour télécharger ta roadmap quand tu veux.',
      printingTitle: 'Préparation du PDF...',
      printingHint:
        'La fenêtre d\'impression de ton navigateur va s\'ouvrir. Choisis "Enregistrer au format PDF" comme destination.',
      printNow: 'Lancer l\'impression',
      generatedOn: 'Généré le',
      diagnosticTitle: 'Diagnostic',
      diagBusinessType: 'Type de business',
      diagStage: 'Stade actuel',
      diagWeeklyTime: 'Temps / semaine',
      diagBudget: 'Budget',
      diagChallenge: 'Challenge',
      diagNiche: 'Niche cible',
      phaseLabel: 'Phase',
      duration: 'Durée',
      completed: 'Terminée',
      footerNote: 'Roadmap générée par AI Business Coach',
    },
    pricing: {
      eyebrow: 'Tarifs',
      title: 'Choisis ton plan',
      subtitle: 'Sans engagement, change ou annule quand tu veux. Essai gratuit de 7 jours sur tous les nouveaux comptes.',
      perMonth: '/mois',
      mostPopular: 'Le plus choisi',
      ctaStarter: 'Commencer avec Starter',
      ctaPro: 'Passer en Pro',
      ctaPremium: 'Choisir Premium',
      trialNote: '7 jours d\'essai gratuit · pas de carte requise',
      starterName: 'Starter',
      starterTagline: 'Pour démarrer sereinement',
      starterPrice: '29',
      starterF1: 'Coach IA Claude Sonnet 4.6',
      starterF2: '60 messages / mois',
      starterF3: '3 roadmaps / mois',
      starterF4: 'Recherche web intégrée',
      starterF5: 'Auto-coche des tâches par l\'IA',
      starterF6: 'Mémoire complète des conversations',
      proName: 'Pro',
      proTagline: 'Le coach des entrepreneurs sérieux',
      proPrice: '49',
      proF1: 'Coach IA Claude Opus 4.7 (modèle premium)',
      proF2: '300 messages / mois',
      proF3: '10 roadmaps / mois',
      proF4: 'Tout du Starter',
      proF5: 'Multi-projets / multi-roadmaps',
      proF6: 'Export PDF de la roadmap',
      premiumName: 'Premium',
      premiumTagline: 'Le coach qui t\'accompagne de A à Z',
      premiumPrice: '69',
      premiumF1: 'Coach IA Claude Opus 4.7',
      premiumF2: '800 messages / mois',
      premiumF3: '20 roadmaps / mois',
      premiumF4: 'Tout du Pro',
      premiumF5: 'Profil client persistant (l\'IA prend des notes durables)',
      premiumF6: 'Check-ins email proactifs',
      premiumF7: 'Support prioritaire',
      premiumF8: 'Accès anticipé aux nouvelles features',
    },
    hero: {
      badge: 'Propulsé par Claude IA',
      title1: 'Lance ton business avec un',
      titleAccent: 'coach IA',
      title2: 'qui te suit pas à pas',
      subtitle:
        "Roadmap personnalisée selon ton business, ton budget et ton temps. Tu poses tes questions, l'IA répond. Tu coches tes tâches, elle ajuste.",
      cta: 'Créer ma roadmap',
      badge1: 'Résultat en 90 secondes',
      badge2: 'Coach IA disponible 24/7',
      badge3: '100% personnalisé',
    },
    alternative: {
      eyebrow: "L'alternative aux formations",
      title1: 'Pourquoi payer',
      price: '2 000 €',
      title2: 'pour une formation business ?',
      body1:
        "Les masterclasses et coachs à plusieurs milliers d'euros vendent des conseils",
      generic: 'génériques',
      body2:
        ", applicables à n'importe quel projet. Ton coach IA, lui, calibre tout sur",
      yours: 'ton',
      body3: 'business,',
      body4: 'stade et',
      body5: 'budget.',
      body6:
        'Et il répond à tes questions à 3h du matin, pas au prochain live Zoom dans 2 semaines.',
      tagline: 'Le même résultat. Sans te ruiner.',
    },
    how: {
      eyebrow: 'Comment ça marche',
      title: '3 étapes, et tu sais quoi faire',
      subtitle: "Pas de friction, pas de bavardage. Tu réponds, l'IA bosse, tu agis.",
      step1Title: 'Réponds au diagnostic',
      step1Desc:
        'En 90 secondes : type de business, stade actuel, budget, temps disponible et challenge.',
      step2Title: 'Reçois ta roadmap',
      step2Desc:
        'Une roadmap personnalisée en 3-5 phases avec des tâches concrètes, calibrée à ton rythme réel.',
      step3Title: 'Avance avec ton coach',
      step3Desc:
        "Pose tes questions, coche tes tâches. L'IA suit ta progression et te pousse vers tes objectifs.",
    },
    features: {
      eyebrow: 'Fonctionnalités',
      title: 'Un coach disponible 24/7',
      subtitle: "Tout ce qu'il te faut pour passer de l'idée au business.",
      f1Title: 'Roadmap sur mesure',
      f1Desc: 'Adaptée à ton type de business, ton budget et ton temps. Pas de conseil générique.',
      f2Title: 'IA experte',
      f2Desc: 'Pose tes questions, reçois des conseils actionnables et spécifiques à ton stage.',
      f3Title: 'Suivi visuel',
      f3Desc: 'Coche tes tâches au fur et à mesure, vois ta progression en temps réel.',
      f4Title: 'Recherche web',
      f4Desc: "L'IA cherche les outils, prix et tendances actuels pour des conseils toujours à jour.",
    },
    forWho: {
      eyebrow: 'Pour qui',
      title: "Conçu pour les entrepreneurs qui passent à l'action",
      body1: 'Solopreneurs, freelances, créateurs de SaaS, e-commerçants, créateurs de produits digitaux.',
      bodyHighlight: 'Toute personne qui veut lancer un business sans perdre des mois',
      body2: 'à se demander par où commencer.',
    },
    finalCta: {
      title1: 'Prêt à passer',
      title2: "à l'action ?",
      subtitle: "Ta roadmap personnalisée t'attend. 90 secondes pour la créer.",
      cta: 'Commencer maintenant',
    },
    footer: {
      copy: '© 2026 AI Business Coach',
      poweredBy: 'Propulsé par Claude IA',
      mentions: 'Mentions légales',
      cgu: 'CGU/CGV',
      privacy: 'Confidentialité',
    },
    login: {
      backHome: 'Accueil',
      signinTitle: 'Bon retour parmi nous',
      signupTitle: 'Crée ton compte',
      signinSubtitle: 'Reprends ta roadmap et ton chat où tu les avais laissés.',
      signupSubtitle: 'Lance-toi avec ton coach IA en quelques secondes.',
      emailLabel: 'Email',
      emailPlaceholder: 'tu@example.com',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: 'Au moins 6 caractères',
      signinBtn: 'Se connecter',
      signupBtn: 'Créer mon compte',
      loading: 'Patience...',
      switchToSignup: 'Pas encore de compte ?',
      switchToSignupLink: 'Crée-en un',
      switchToSignin: 'Déjà un compte ?',
      switchToSigninLink: 'Connecte-toi',
      confirmEmail: 'Compte créé. Vérifie ta boîte mail pour confirmer.',
      errorEmailAlreadyRegistered:
        'Un compte existe déjà avec cette adresse e-mail (ou une variante : alias avec +, points sur Gmail, etc.). Connecte-toi plutôt.',
      errorDisposableEmail:
        'Les adresses e-mail jetables ne sont pas acceptées. Utilise une adresse permanente (Gmail, Outlook, ProtonMail, etc.).',
    },
    quiz: {
      eyebrow: 'Diagnostic business',
      title: 'Construisons ta roadmap',
      step: 'Étape',
      of: 'sur',
      previous: 'Précédent',
      next: 'Suivant',
      generate: 'Générer ma roadmap',
      q1Title: 'Quel type de business ?',
      q1Subtitle: 'Choisis ce qui te correspond le mieux.',
      q1Options: ['Ecommerce', 'Produits digitaux', 'Service / Freelance', 'SaaS', 'Autre'],
      q2Title: 'À quel stade tu en es ?',
      q2Subtitle: 'Sois honnête, ça permet de calibrer la roadmap.',
      q2Options: ['Idée', 'MVP en construction', 'Premiers clients', '10k/mois', 'Scaling'],
      q3Title: 'Combien de temps par semaine ?',
      q3Subtitle: 'Important : la roadmap calibrera les durées sur ton rythme.',
      q3Options: ['Moins de 5h/semaine', '5 à 10h/semaine', '10 à 20h/semaine', '20 à 40h/semaine', 'Plus de 40h/semaine (temps plein)'],
      q4Title: 'Quel est ton budget ?',
      q4Subtitle: 'Mensuel, à dépenser sur les outils / pub / etc.',
      q4Options: ['0 €', '1 à 100 €', '100 à 500 €', '500 à 2 000 €', '2 000 € et plus'],
      q5Title: 'Ton plus gros challenge ?',
      q5Subtitle: 'Décris en quelques mots ce qui te bloque vraiment.',
      q5Placeholder: 'Ex : Je ne sais pas comment trouver mes premiers clients...',
      q6Title: 'Ta niche cible ?',
      q6Subtitle: "Plus c'est précis, plus la roadmap sera utile.",
      q6Placeholder: 'Ex : Freelances graphistes débordés par leur facturation',
    },
    roadmap: {
      headerTitle: 'Ta Roadmap',
      projectSwitcherLabel: 'Projet',
      projectSwitcherAllProjects: 'Mes projets',
      projectSwitcherNew: '+ Nouveau projet',
      projectSwitcherDelete: 'Supprimer ce projet',
      projectSwitcherConfirmDelete:
        'Supprimer ce projet définitivement ? La roadmap, le chat et les tâches associés seront effacés.',
      noProjects: 'Tu n\'as pas encore de projet. Crée-en un en passant le diagnostic.',
      regenerate: 'Régénérer',
      retakeDiagnostic: 'Refaire le diagnostic',
      home: 'Accueil',
      signout: 'Déconnexion',
      tooltipRegenerate: 'Garder les mêmes réponses, juste relancer Claude',
      tooltipRetake: 'Changer tes réponses et regénérer une nouvelle roadmap',
      loadingTitle: 'Génération de ta roadmap...',
      loadingSub: 'Claude écrit phase par phase. Encore quelques secondes.',
      errorPrefix: 'Erreur :',
      retry: 'Réessayer',
      redoQuiz: 'Refaire le diagnostic',
      preparing: 'Préparation des phases...',
      progress: 'Progression :',
      tasks: 'tâches',
      phase: 'Phase',
      coachName: 'Marc, ton Coach',
      coachTagline: 'Expert business · Disponible 24/7',
      clearChat: 'Effacer',
      loadingHistory: "Chargement de l'historique...",
      emptyChat1: 'Pose ta première question à ton coach.',
      emptyChat2: 'Par où commencer cette semaine ?',
      thinking: 'Coach réfléchit...',
      askPlaceholder: 'Pose une question...',
      send: 'Envoyer',
      confirmRegenerate: 'Régénérer va créer un NOUVEAU projet avec tes mêmes réponses. L\'ancien restera accessible dans le sélecteur de projet. Continuer ?',
      confirmRetake: 'Refaire le diagnostic va créer un nouveau projet avec de nouvelles réponses. L\'actuel restera disponible. Continuer ?',
      confirmClearChat: "Effacer tout l'historique du chat ?",
      errorChat: 'Désolé, une erreur est survenue. Réessaye !',
      errorChatPrefix: 'Désolé, une erreur est survenue :',
      usageMessagesLabel: 'Messages ce mois',
      usageRoadmapsLabel: 'Roadmaps ce mois',
      tierTrial: 'Essai gratuit',
      tierStarter: 'Plan Starter',
      tierPro: 'Plan Pro',
      tierPremium: 'Plan Premium',
      limitReachedMessagesTitle: 'Limite mensuelle atteinte',
      limitReachedMessagesBody:
        'Tu as utilisé tes {limit} messages ce mois. Passe au plan supérieur pour continuer à échanger avec ton coach.',
      limitReachedRoadmapsTitle: 'Limite de roadmaps atteinte',
      limitReachedRoadmapsBody:
        'Ton plan actuel inclut {limit} roadmap(s) par mois. Passe au plan supérieur pour en régénérer plus.',
      trialExpiredTitle: 'Ton essai gratuit est terminé',
      trialExpiredBody:
        'Tu as profité de tes 7 jours d\'essai. Choisis un plan pour continuer à utiliser ton coach IA.',
      upgradeCta: 'Voir les abonnements',
    },
  },
  en: {
    nav: {
      login: 'Sign in',
      subscribe: 'Subscribe',
    },
    account: {
      title: 'My account',
      back: 'Back to roadmap',
      emailLabel: 'Email address',
      planLabel: 'Current plan',
      planExpired: '(trial expired)',
      planRenewsAt: 'Renews on',
      planExpiresAt: 'Expires on',
      usageTitle: 'Usage this month',
      usageMessages: 'Messages',
      usageRoadmaps: 'Roadmaps',
      managePlan: 'Manage subscription',
      managePlanSoon: 'Coming soon',
      signout: 'Sign out',
      avatarTitle: 'My account',
      langLabel: 'Language',
      notesTitle: 'Coach memory',
      notesSubtitle: "Your AI coach keeps these notes across sessions to personalize its guidance.",
      notesEmpty: "No notes yet. Your coach will start collecting them once you share goals, blockers, or wins.",
      notesProjectPrefix: 'Project',
      notesDelete: 'Delete',
      notesConfirmDelete: 'Delete this note?',
      noteCategoryGoal: 'Goal',
      noteCategoryBlocker: 'Blocker',
      noteCategoryWin: 'Win',
      noteCategoryContext: 'Context',
      prioritySupportTitle: 'Priority support',
      prioritySupportBody: 'As a Premium member, your requests get prioritized. Email us at',
      prioritySupportEmail: 'buisnesscoach@gmail.com',
      prioritySupportSla: 'Guaranteed response within 24 business hours.',
    },
    pdfExport: {
      buttonLabel: 'Export to PDF',
      tooltipAvailable: 'Download your roadmap as a PDF',
      tooltipLocked: 'Available on Pro and Premium plans',
      lockedTitle: 'PDF export is a Pro feature',
      lockedBody:
        'Exporting your roadmap as PDF is included in the Pro and Premium plans. Upgrade to download your roadmap anytime.',
      printingTitle: 'Preparing your PDF...',
      printingHint:
        "Your browser's print dialog will appear. Pick \"Save as PDF\" as the destination.",
      printNow: 'Open print dialog',
      generatedOn: 'Generated on',
      diagnosticTitle: 'Diagnostic',
      diagBusinessType: 'Business type',
      diagStage: 'Current stage',
      diagWeeklyTime: 'Time / week',
      diagBudget: 'Budget',
      diagChallenge: 'Challenge',
      diagNiche: 'Target niche',
      phaseLabel: 'Phase',
      duration: 'Duration',
      completed: 'Done',
      footerNote: 'Roadmap generated by AI Business Coach',
    },
    pricing: {
      eyebrow: 'Pricing',
      title: 'Pick your plan',
      subtitle: 'No commitment, change or cancel anytime. 7-day free trial on every new account.',
      perMonth: '/month',
      mostPopular: 'Most popular',
      ctaStarter: 'Start with Starter',
      ctaPro: 'Upgrade to Pro',
      ctaPremium: 'Choose Premium',
      trialNote: '7-day free trial · no credit card required',
      starterName: 'Starter',
      starterTagline: 'For a steady start',
      starterPrice: '29',
      starterF1: 'AI coach Claude Sonnet 4.6',
      starterF2: '60 messages / month',
      starterF3: '3 roadmaps / month',
      starterF4: 'Built-in web search',
      starterF5: 'AI auto-checks tasks',
      starterF6: 'Full conversation memory',
      proName: 'Pro',
      proTagline: 'For serious entrepreneurs',
      proPrice: '49',
      proF1: 'AI coach Claude Opus 4.7 (premium model)',
      proF2: '300 messages / month',
      proF3: '10 roadmaps / month',
      proF4: 'Everything in Starter',
      proF5: 'Multi-projects / multi-roadmaps',
      proF6: 'PDF roadmap export',
      premiumName: 'Premium',
      premiumTagline: 'Your end-to-end coach',
      premiumPrice: '69',
      premiumF1: 'AI coach Claude Opus 4.7',
      premiumF2: '800 messages / month',
      premiumF3: '20 roadmaps / month',
      premiumF4: 'Everything in Pro',
      premiumF5: 'Persistent client profile (the AI keeps notes)',
      premiumF6: 'Proactive email check-ins',
      premiumF7: 'Priority support',
      premiumF8: 'Early access to new features',
    },
    hero: {
      badge: 'Powered by Claude AI',
      title1: 'Launch your business with an',
      titleAccent: 'AI coach',
      title2: 'guiding you every step',
      subtitle:
        "Personalized roadmap matched to your business, budget, and time. Ask questions, your AI answers. Check off tasks, it adapts.",
      cta: 'Create my roadmap',
      badge1: 'Results in 90 seconds',
      badge2: 'AI coach available 24/7',
      badge3: '100% personalized',
    },
    alternative: {
      eyebrow: 'The alternative to courses',
      title1: 'Why pay',
      price: '$2,000',
      title2: 'for a business course?',
      body1: 'Masterclasses and coaches charging thousands sell',
      generic: 'generic',
      body2: " advice that applies to any project. Your AI coach calibrates everything to",
      yours: 'your',
      body3: 'business,',
      body4: 'stage, and',
      body5: 'budget.',
      body6: 'And it answers your questions at 3am, not at the next Zoom live in two weeks.',
      tagline: 'Same result. Without breaking the bank.',
    },
    how: {
      eyebrow: 'How it works',
      title: '3 steps, and you know exactly what to do',
      subtitle: 'No friction, no fluff. You answer, the AI works, you act.',
      step1Title: 'Answer the diagnostic',
      step1Desc: 'In 90 seconds: business type, current stage, budget, time available, and challenge.',
      step2Title: 'Get your roadmap',
      step2Desc: 'A personalized roadmap in 3-5 phases with concrete tasks, calibrated to your real pace.',
      step3Title: 'Move forward with your coach',
      step3Desc: 'Ask questions, check off tasks. The AI tracks your progress and pushes you toward your goals.',
    },
    features: {
      eyebrow: 'Features',
      title: 'A coach available 24/7',
      subtitle: 'Everything you need to go from idea to business.',
      f1Title: 'Tailor-made roadmap',
      f1Desc: 'Adapted to your business type, budget, and time. No generic advice.',
      f2Title: 'Expert AI',
      f2Desc: 'Ask questions, get actionable advice specific to your stage.',
      f3Title: 'Visual tracking',
      f3Desc: 'Check off tasks as you go, see your progress in real time.',
      f4Title: 'Web search',
      f4Desc: 'The AI looks up current tools, prices, and trends for always-fresh advice.',
    },
    forWho: {
      eyebrow: 'Who it’s for',
      title: 'Built for entrepreneurs who take action',
      body1: 'Solopreneurs, freelancers, SaaS founders, ecommerce sellers, digital product creators.',
      bodyHighlight: 'Anyone who wants to launch a business without spending months',
      body2: 'figuring out where to start.',
    },
    finalCta: {
      title1: 'Ready to take',
      title2: 'action?',
      subtitle: 'Your personalized roadmap is waiting. 90 seconds to create it.',
      cta: 'Start now',
    },
    footer: {
      copy: '© 2026 AI Business Coach',
      poweredBy: 'Powered by Claude AI',
      mentions: 'Legal notice',
      cgu: 'Terms',
      privacy: 'Privacy',
    },
    login: {
      backHome: 'Home',
      signinTitle: 'Welcome back',
      signupTitle: 'Create your account',
      signinSubtitle: 'Pick up your roadmap and chat right where you left off.',
      signupSubtitle: 'Get started with your AI coach in seconds.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      signinBtn: 'Sign in',
      signupBtn: 'Create account',
      loading: 'Hold on...',
      switchToSignup: "Don't have an account yet?",
      switchToSignupLink: 'Create one',
      switchToSignin: 'Already have an account?',
      switchToSigninLink: 'Sign in',
      confirmEmail: 'Account created. Check your inbox to confirm.',
      errorEmailAlreadyRegistered:
        'An account already exists with this email (or a variant: + aliases, Gmail dots, etc.). Sign in instead.',
      errorDisposableEmail:
        'Disposable email addresses are not accepted. Use a permanent address (Gmail, Outlook, ProtonMail, etc.).',
    },
    quiz: {
      eyebrow: 'Business diagnostic',
      title: "Let's build your roadmap",
      step: 'Step',
      of: 'of',
      previous: 'Previous',
      next: 'Next',
      generate: 'Generate my roadmap',
      q1Title: 'What type of business?',
      q1Subtitle: 'Pick what fits you best.',
      q1Options: ['Ecommerce', 'Digital products', 'Service / Freelance', 'SaaS', 'Other'],
      q2Title: 'What stage are you at?',
      q2Subtitle: 'Be honest, it helps calibrate the roadmap.',
      q2Options: ['Idea', 'Building MVP', 'First customers', '$10k/month', 'Scaling'],
      q3Title: 'How many hours per week?',
      q3Subtitle: 'Important: the roadmap calibrates durations to your pace.',
      q3Options: ['Less than 5h/week', '5 to 10h/week', '10 to 20h/week', '20 to 40h/week', 'More than 40h/week (full-time)'],
      q4Title: 'What is your budget?',
      q4Subtitle: 'Monthly, to spend on tools / ads / etc.',
      q4Options: ['$0', '$1 to $100', '$100 to $500', '$500 to $2,000', '$2,000 and up'],
      q5Title: 'Your biggest challenge?',
      q5Subtitle: 'Describe in a few words what really blocks you.',
      q5Placeholder: "Ex: I don't know how to find my first customers...",
      q6Title: 'Your target niche?',
      q6Subtitle: 'The more specific, the more useful the roadmap.',
      q6Placeholder: 'Ex: Freelance graphic designers overwhelmed by invoicing',
    },
    roadmap: {
      headerTitle: 'Your Roadmap',
      projectSwitcherLabel: 'Project',
      projectSwitcherAllProjects: 'My projects',
      projectSwitcherNew: '+ New project',
      projectSwitcherDelete: 'Delete this project',
      projectSwitcherConfirmDelete:
        'Permanently delete this project? Its roadmap, chat, and tasks will be wiped.',
      noProjects: "You don't have any project yet. Take the diagnostic to create one.",
      regenerate: 'Regenerate',
      retakeDiagnostic: 'Redo diagnostic',
      home: 'Home',
      signout: 'Sign out',
      tooltipRegenerate: 'Keep the same answers, just re-run Claude',
      tooltipRetake: 'Change your answers and generate a new roadmap',
      loadingTitle: 'Generating your roadmap...',
      loadingSub: 'Claude is writing phase by phase. Just a few more seconds.',
      errorPrefix: 'Error:',
      retry: 'Retry',
      redoQuiz: 'Redo diagnostic',
      preparing: 'Preparing phases...',
      progress: 'Progress:',
      tasks: 'tasks',
      phase: 'Phase',
      coachName: 'Marc, your Coach',
      coachTagline: 'Business expert · Available 24/7',
      clearChat: 'Clear',
      loadingHistory: 'Loading history...',
      emptyChat1: 'Ask your first question to your coach.',
      emptyChat2: 'Where should I start this week?',
      thinking: 'Coach thinking...',
      askPlaceholder: 'Ask a question...',
      send: 'Send',
      confirmRegenerate: "Regenerating will create a NEW project from your same answers. Your current project stays available in the project switcher. Continue?",
      confirmRetake: 'Redoing the diagnostic will create a new project with new answers. Your current one stays available. Continue?',
      confirmClearChat: 'Clear all chat history?',
      errorChat: 'Sorry, an error occurred. Try again!',
      errorChatPrefix: 'Sorry, an error occurred:',
      usageMessagesLabel: 'Messages this month',
      usageRoadmapsLabel: 'Roadmaps this month',
      tierTrial: 'Free trial',
      tierStarter: 'Starter plan',
      tierPro: 'Pro plan',
      tierPremium: 'Premium plan',
      limitReachedMessagesTitle: 'Monthly limit reached',
      limitReachedMessagesBody:
        "You've used your {limit} messages this month. Upgrade to keep chatting with your coach.",
      limitReachedRoadmapsTitle: 'Roadmap limit reached',
      limitReachedRoadmapsBody:
        'Your current plan includes {limit} roadmap(s) per month. Upgrade to regenerate more.',
      trialExpiredTitle: 'Your free trial has ended',
      trialExpiredBody:
        "Your 7-day trial is over. Pick a plan to keep using your AI coach.",
      upgradeCta: 'See plans',
    },
  },
};

type Translations = typeof translations.fr;

const LanguageContext = createContext<{
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}>({
  locale: 'fr',
  t: translations.fr,
  setLocale: () => {},
});

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'fr';
  const lang = (navigator.language || 'fr').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  return 'fr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  // Intentional setState in effect: we can only read localStorage after
  // hydration, otherwise SSR/client mismatch. Initial render is always 'fr',
  // then we sync to the user's saved/detected locale on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale');
      const next: Locale = saved === 'fr' || saved === 'en' ? saved : detectBrowserLocale();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(next);
      document.documentElement.lang = next;
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('locale', l);
      document.documentElement.lang = l;
    } catch {
      // ignore
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLang();
  return (
    <div
      className={`inline-flex items-center gap-0.5 px-1 py-1 rounded-full bg-white/[0.05] border border-white/10 ${className}`}
      role="group"
      aria-label="Language switcher"
    >
      <button
        onClick={() => setLocale('fr')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          locale === 'fr'
            ? 'bg-gradient-to-r from-indigo-500 to-blue-700 text-white shadow-md shadow-blue-600/30'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={locale === 'fr'}
      >
        FR
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
          locale === 'en'
            ? 'bg-gradient-to-r from-indigo-500 to-blue-700 text-white shadow-md shadow-blue-600/30'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
