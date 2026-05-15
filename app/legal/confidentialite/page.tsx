'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher, useLang } from '@/lib/i18n';

export default function ConfidentialitePage() {
  const router = useRouter();
  const { t } = useLang();

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-10">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t.pricing.legalBackHome}
        </button>
        <LanguageSwitcher />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-3">Politique de confidentialité</h1>
      <p className="text-sm text-gray-400 mb-10">
        Dernière mise à jour : 12 mai 2026 · Conforme à la nLPD suisse et au RGPD européen
      </p>

      <div className="space-y-8 text-gray-200 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-3 text-white">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement de vos données personnelles dans le cadre du service{' '}
            <strong>AI Business Coach</strong> est&nbsp;:
          </p>
          <p className="mt-3">
            • <strong>Léo Drilhol</strong>, personne physique exerçant en activité indépendante
            <br />
            • Route de Provence 20, canton de Vaud, Suisse
            <br />
            • Contact protection des données :{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>
          </p>
          <p className="mt-3 text-sm text-gray-400">
            La présente politique est rédigée selon la Loi fédérale suisse sur la protection des
            données (nLPD, en vigueur depuis le 1<sup>er</sup> septembre 2023). Elle s&apos;applique
            également aux Utilisateurs résidant dans l&apos;Espace économique européen, auxquels
            s&apos;applique en parallèle le Règlement général sur la protection des données (RGPD).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">2. Données collectées</h2>

          <h3 className="font-bold mt-4 mb-2 text-white">2.1 Données d&apos;identification</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Adresse e-mail (fournie à l&apos;inscription)</li>
            <li>
              Mot de passe (stocké sous forme hachée et salée — nous n&apos;avons jamais accès au
              mot de passe en clair)
            </li>
            <li>Date d&apos;inscription et de dernière connexion</li>
          </ul>

          <h3 className="font-bold mt-4 mb-2 text-white">2.2 Données générées par l&apos;usage</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Réponses au diagnostic business (type de business, stade, budget, temps disponible,
              challenge, niche)
            </li>
            <li>Roadmaps générées par l&apos;IA et tâches cochées (suivi de progression)</li>
            <li>
              Historique de chat avec le coach IA (messages envoyés et réponses reçues, stockés pour
              maintenir la mémoire de conversation)
            </li>
            <li>
              <strong>Plan Premium uniquement</strong> : notes durables prises par le coach IA sur
              vos objectifs, blocages, victoires et contexte business
            </li>
            <li>
              Compteurs d&apos;usage mensuel (nombre de messages envoyés, nombre de roadmaps générées
              — pour appliquer les quotas par plan)
            </li>
          </ul>

          <h3 className="font-bold mt-4 mb-2 text-white">2.3 Données d&apos;abonnement</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Plan en cours (essai, Starter, Pro, Premium)</li>
            <li>Date de début et de fin de période d&apos;abonnement</li>
            <li>
              Pour les abonnements payants&nbsp;: identifiant client chez notre prestataire de
              paiement (Stripe / Lemon Squeezy) — <strong>nous ne stockons aucune donnée de carte
              bancaire</strong>
            </li>
          </ul>

          <h3 className="font-bold mt-4 mb-2 text-white">2.4 Données techniques</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Cookies fonctionnels strictement nécessaires (session d&apos;authentification, langue
              préférée, projet actif)
            </li>
            <li>
              Logs serveur anonymisés (adresse IP, navigateur, horodatage) — conservés 30 jours
              pour des raisons de sécurité et de débogage
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">3. Finalités et bases légales</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2 border border-white/10 rounded-lg">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3 font-semibold">Finalité</th>
                  <th className="text-left p-3 font-semibold">Justification (nLPD / RGPD art. 6)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="p-3">Création et gestion du compte</td>
                  <td className="p-3 text-gray-300">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="p-3">Génération et persistance des roadmaps et du chat IA</td>
                  <td className="p-3 text-gray-300">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="p-3">Facturation et gestion des abonnements</td>
                  <td className="p-3 text-gray-300">
                    Exécution du contrat + obligation légale (comptabilité, art. 957 ss. CO)
                  </td>
                </tr>
                <tr>
                  <td className="p-3">Prévention de la fraude (1 compte par personne)</td>
                  <td className="p-3 text-gray-300">Intérêt légitime de l&apos;Éditeur</td>
                </tr>
                <tr>
                  <td className="p-3">Notes durables prises par l&apos;IA (Premium)</td>
                  <td className="p-3 text-gray-300">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="p-3">Statistiques d&apos;usage anonymisées</td>
                  <td className="p-3 text-gray-300">Intérêt légitime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">4. Sous-traitants et destinataires</h2>
          <p>
            Vos données sont accessibles uniquement par les sous-traitants techniques suivants,
            chacun lié par un accord de traitement des données conforme à la nLPD et au RGPD&nbsp;:
          </p>

          <div className="space-y-4 mt-4">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p>
                <strong>Supabase Pte. Ltd.</strong> — Hébergement de la base de données, de
                l&apos;authentification et des fichiers.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Localisation des données&nbsp;: serveurs dans l&apos;Union européenne (Irlande).
                L&apos;UE est reconnue par la Suisse comme offrant un niveau de protection des
                données équivalent (décision du Conseil fédéral du 6 juillet 2022). Politique :{' '}
                <a
                  href="https://supabase.com/privacy"
                  className="text-indigo-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  supabase.com/privacy
                </a>
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p>
                <strong>Anthropic, PBC</strong> — Modèles d&apos;intelligence artificielle Claude
                (Sonnet 4.6 et Opus 4.7) qui traitent vos messages et génèrent les roadmaps.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Localisation&nbsp;: États-Unis. Le transfert est encadré par le{' '}
                <strong>Swiss-U.S. Data Privacy Framework</strong> (DPF, reconnu par le Conseil
                fédéral suisse) et/ou par des clauses contractuelles standard. Anthropic
                s&apos;engage à ne pas utiliser vos contenus pour entraîner ses modèles
                (
                <a
                  href="https://www.anthropic.com/legal/commercial-terms"
                  className="text-indigo-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  conditions commerciales
                </a>
                ).
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p>
                <strong>Vercel Inc.</strong> — Hébergement de l&apos;application web.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Localisation&nbsp;: serveurs aux États-Unis et en Europe. Transfert encadré par le
                Swiss-U.S. DPF et SCCs européennes. Politique :{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  className="text-indigo-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  vercel.com/legal/privacy-policy
                </a>
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <p>
                <strong>Stripe, Inc.</strong> — Traitement des paiements et facturation.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Les données de paiement (carte bancaire) sont collectées directement par ce
                prestataire et ne transitent jamais par nos serveurs. Conformité PCI-DSS niveau 1.
              </p>
            </div>
          </div>

          <p className="mt-4">
            Vos données ne sont <strong>jamais vendues ni partagées à des fins commerciales</strong>
            {' '}avec des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">5. Durée de conservation</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Données du compte et contenus</strong>&nbsp;: conservés tant que le compte est
              actif, puis supprimés dans un délai de 30 jours après suppression du compte (sauf
              demande contraire de l&apos;Utilisateur).
            </li>
            <li>
              <strong>Données de facturation</strong>&nbsp;: conservées 10 ans à compter de la
              clôture de l&apos;exercice comptable, conformément à l&apos;art. 958f al. 1 CO et à
              l&apos;Ordonnance sur la TVA.
            </li>
            <li>
              <strong>Logs techniques</strong>&nbsp;: 30 jours maximum.
            </li>
            <li>
              <strong>E-mail normalisé (anti-fraude)</strong>&nbsp;: conservé tant que le compte
              existe, supprimé en même temps que le compte.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">6. Vos droits</h2>
          <p>
            En vertu de la nLPD (art. 25 ss.) et, pour les Utilisateurs européens, du RGPD (art. 15
            à 22), vous disposez à tout moment des droits suivants&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Droit d&apos;accès</strong>&nbsp;: obtenir la confirmation que vos données sont
              traitées et en recevoir une copie.
            </li>
            <li>
              <strong>Droit de rectification</strong>&nbsp;: corriger des données inexactes ou
              incomplètes.
            </li>
            <li>
              <strong>Droit à l&apos;effacement</strong> («&nbsp;droit à l&apos;oubli&nbsp;»)&nbsp;:
              demander la suppression de vos données, sauf obligation légale de conservation
              (notamment comptable).
            </li>
            <li>
              <strong>Droit à la portabilité</strong> (Utilisateurs UE uniquement)&nbsp;: recevoir
              vos données dans un format structuré, couramment utilisé et lisible par machine.
            </li>
            <li>
              <strong>Droit d&apos;opposition</strong>&nbsp;: vous opposer au traitement de vos
              données pour des motifs tenant à votre situation particulière.
            </li>
            <li>
              <strong>Droit à la limitation du traitement</strong>.
            </li>
            <li>
              <strong>Droit de retirer votre consentement</strong> à tout moment, lorsque le
              traitement est fondé sur celui-ci.
            </li>
          </ul>
          <p className="mt-3">
            Pour exercer ces droits, écrivez à{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>{' '}
            avec une copie d&apos;une pièce d&apos;identité si nécessaire. Nous répondons dans un
            délai maximum de 30 jours.
          </p>

          <h3 className="font-bold mt-5 mb-2 text-white">6.1 Réclamation auprès d&apos;une autorité</h3>
          <p>
            En cas de désaccord persistant, vous pouvez introduire une réclamation auprès&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              du{' '}
              <a
                href="https://www.edoeb.admin.ch/edoeb/fr/home.html"
                className="text-indigo-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                Préposé fédéral à la protection des données et à la transparence (PFPDT)
              </a>
              , autorité suisse de contrôle&nbsp;;
            </li>
            <li>
              ou, pour les Utilisateurs résidant dans l&apos;UE, de l&apos;autorité nationale de
              protection des données de leur pays (par ex. la{' '}
              <a
                href="https://www.cnil.fr/fr/plaintes"
                className="text-indigo-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                CNIL
              </a>
              {' '}en France).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">7. Sécurité</h2>
          <p>Nous mettons en œuvre les mesures techniques et organisationnelles suivantes&nbsp;:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Chiffrement TLS 1.3 pour toutes les communications avec nos serveurs (HTTPS).</li>
            <li>Mots de passe hachés (algorithme bcrypt ou équivalent) et salés.</li>
            <li>
              Row-Level Security (RLS) sur l&apos;ensemble de la base de données&nbsp;: chaque
              utilisateur ne peut techniquement accéder qu&apos;à ses propres données.
            </li>
            <li>Sauvegardes automatiques quotidiennes (Supabase) et restauration point-in-time.</li>
            <li>Surveillance des tentatives d&apos;intrusion et limitation du taux de requêtes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">8. Cookies</h2>
          <p>
            Nous utilisons uniquement des cookies fonctionnels strictement nécessaires au
            fonctionnement du Service. Ces cookies ne nécessitent pas de consentement préalable
            selon la nLPD et l&apos;art. 45c LTC&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Cookie de session Supabase (authentification)</li>
            <li>Préférence de langue (FR/EN)</li>
            <li>Identifiant du projet actif (multi-projet)</li>
          </ul>
          <p className="mt-3">
            Aucun cookie de tracking publicitaire ou d&apos;analytique tiers n&apos;est utilisé à ce
            jour.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">9. Modifications de la politique</h2>
          <p>
            Toute modification substantielle de la présente politique vous sera notifiée par e-mail
            au moins 15 jours avant son entrée en vigueur. La date de dernière mise à jour figure
            en haut du document.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">10. Contact</h2>
          <p>
            Pour toute question relative à la présente politique ou au traitement de vos données,
            contactez-nous à&nbsp;:{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Voir aussi&nbsp;:{' '}
            <Link href="/legal/cgu" className="text-indigo-300 underline">
              CGU/CGV
            </Link>
            {' • '}
            <Link href="/legal/mentions" className="text-indigo-300 underline">
              Mentions légales
            </Link>
          </p>
        </section>

        <section className="border-t border-white/10 pt-6 mt-10">
          <p className="text-xs text-gray-500 leading-relaxed">
            ⚠️ Cette politique est un modèle adapté à la nLPD suisse et au RGPD européen pour le
            stack technique du Service à la date de dernière mise à jour. Il est fortement
            recommandé de la faire relire par un avocat ou un Data Protection Officer (DPO)
            spécialisé en protection des données avant la mise en ligne publique.
          </p>
        </section>
      </div>
    </>
  );
}
