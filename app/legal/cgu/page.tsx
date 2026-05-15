'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher, useLang } from '@/lib/i18n';

export default function CGUPage() {
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

      <h1 className="text-3xl md:text-4xl font-bold mb-3">
        Conditions Générales d&apos;Utilisation et de Vente
      </h1>
      <p className="text-sm text-gray-400 mb-10">
        Dernière mise à jour : 12 mai 2026 · Service exploité depuis la Suisse · Droit suisse
      </p>

      <div className="space-y-8 text-gray-200 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 1 — Objet</h2>
          <p>
            Les présentes Conditions Générales d&apos;Utilisation et de Vente (ci-après « CGU/CGV »)
            régissent l&apos;accès et l&apos;utilisation du service{' '}
            <strong>AI Business Coach</strong> (ci-après « le Service »), édité par{' '}
            <strong>Léo Drilhol</strong>, personne physique exerçant en activité indépendante,
            domicilié à Route de Provence 20, canton de Vaud, Suisse (ci-après « l&apos;Éditeur »).
          </p>
          <p className="mt-3">
            Le Service est une application en ligne de coaching business propulsée par
            l&apos;intelligence artificielle Claude (Anthropic), proposant la génération de roadmaps
            personnalisées, un chat de coaching, le suivi de progression et l&apos;export PDF.
          </p>
          <p className="mt-3">
            Toute utilisation du Service implique l&apos;acceptation pleine et entière des présentes
            CGU/CGV par l&apos;Utilisateur (ci-après « l&apos;Utilisateur » ou « vous »), conformément
            aux articles 1 et suivants du Code suisse des obligations (CO, RS 220).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 2 — Création de compte</h2>
          <p>
            L&apos;accès au Service nécessite la création d&apos;un compte au moyen d&apos;une
            adresse e-mail valide et d&apos;un mot de passe d&apos;au moins 6 caractères.
          </p>
          <p className="mt-3">
            L&apos;Utilisateur s&apos;engage à&nbsp;:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>fournir une adresse e-mail réelle, personnelle et permanente&nbsp;;</li>
            <li>ne pas créer plusieurs comptes (un compte = une personne)&nbsp;;</li>
            <li>maintenir confidentielles ses informations de connexion&nbsp;;</li>
            <li>
              être âgé d&apos;au moins 18 ans, ou disposer de l&apos;accord d&apos;un représentant
              légal s&apos;il est mineur.
            </li>
          </ul>
          <p className="mt-3">
            L&apos;Éditeur se réserve le droit de refuser, suspendre ou résilier tout compte en cas
            de violation des présentes CGU/CGV, notamment en cas de tentative de contournement de
            l&apos;essai gratuit (création de plusieurs comptes, usage d&apos;adresses e-mail
            jetables, etc.).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 3 — Description du Service</h2>
          <p>Le Service propose les fonctionnalités suivantes&nbsp;:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Génération de roadmaps business personnalisées par IA, à partir d&apos;un diagnostic en 6 questions.</li>
            <li>Coach IA conversationnel avec historique persistant, capable de cocher automatiquement les tâches accomplies.</li>
            <li>Recherche web intégrée pour fournir des informations à jour (outils, prix, tendances).</li>
            <li>Suivi de progression visuel (cases à cocher, pourcentage par phase et global).</li>
            <li>Selon le plan d&apos;abonnement&nbsp;: export PDF, multi-projets, mémoire durable du coach, support prioritaire.</li>
          </ul>
          <p className="mt-3">
            L&apos;Éditeur se réserve le droit de modifier, suspendre ou interrompre tout ou partie
            du Service à tout moment, avec un préavis raisonnable lorsque cela est possible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 4 — Plans et tarifs</h2>
          <p>
            Le Service est proposé selon les plans suivants. Les tarifs sont indiqués hors TVA. Si
            l&apos;Éditeur est assujetti à la TVA suisse (chiffre d&apos;affaires annuel supérieur à
            CHF 100 000), la TVA de 8.1&nbsp;% est ajoutée pour les clients résidant en Suisse.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              🎁 <strong>Essai gratuit</strong> — 0 €, durée 7 jours, 5 messages, 1 roadmap. Aucune
              carte bancaire requise. Conversion automatique en compte expiré au terme des 7 jours
              ou à épuisement du quota (premier des deux).
            </p>
            <p>
              🚀 <strong>Plan Starter</strong> — 29 € / mois, 60 messages, 3 roadmaps / mois.
            </p>
            <p>
              ⭐ <strong>Plan Pro</strong> — 49 € / mois, 300 messages, 10 roadmaps / mois, export
              PDF, multi-projets.
            </p>
            <p>
              👑 <strong>Plan Premium</strong> — 69 € / mois, 600 messages, 20 roadmaps / mois,
              mémoire durable du coach, support prioritaire.
            </p>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            Le service est facturé en euros (EUR) pour permettre l&apos;ouverture du Service à la
            clientèle européenne. Les paiements sont convertis le cas échéant en CHF par le
            prestataire bancaire selon le taux de change en vigueur.
          </p>
          <p className="mt-3">
            Les tarifs peuvent évoluer. Toute modification sera notifiée à l&apos;Utilisateur au
            moins 30 jours avant son entrée en vigueur. L&apos;Utilisateur peut résilier son
            abonnement avant cette date s&apos;il refuse les nouveaux tarifs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 5 — Modalités de paiement</h2>
          <p>
            Les abonnements payants sont facturés mensuellement, par avance, à compter de la date de
            souscription, et renouvelés automatiquement chaque mois jusqu&apos;à résiliation.
            L&apos;Utilisateur reconnaît avoir été clairement informé de ce mécanisme de
            reconduction tacite.
          </p>
          <p className="mt-3">
            Le paiement est effectué par carte bancaire via notre prestataire de paiement{' '}
            <strong>Stripe</strong>, qui assure la sécurité des transactions conformément aux
            standards PCI-DSS. L&apos;Éditeur ne stocke aucune donnée de carte
            bancaire sur ses serveurs.
          </p>
          <p className="mt-3">
            En cas d&apos;échec de paiement (carte expirée, fonds insuffisants), l&apos;accès aux
            fonctionnalités payantes est suspendu jusqu&apos;à régularisation. Une période de grâce
            de 7 jours est accordée avant le déclassement définitif.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 6 — Essai gratuit et exécution immédiate</h2>
          <p>
            Le droit suisse ne prévoit pas de droit de rétractation général pour les contrats à
            distance portant sur des services numériques. Toutefois, l&apos;Éditeur offre une période
            d&apos;<strong>essai gratuit de 7 jours</strong> qui permet à l&apos;Utilisateur de
            tester le Service sans engagement et sans paiement.
          </p>
          <p className="mt-3">
            En souscrivant à un abonnement payant après l&apos;essai (ou directement), l&apos;Utilisateur
            obtient un accès immédiat au Service et accepte expressément l&apos;exécution immédiate
            de la prestation. Aucun remboursement pro-rata n&apos;est dû pour la période entamée
            après le passage au plan payant, sauf disposition légale impérative contraire.
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Pour les Utilisateurs résidant dans l&apos;Union européenne, l&apos;article L.221-28 du
            Code de la consommation français (et les équivalents nationaux) prévoient également la
            possibilité de renoncer expressément au droit de rétractation de 14 jours pour les
            services numériques exécutés immédiatement. En souscrivant et accédant au Service
            immédiatement, l&apos;Utilisateur européen est réputé avoir donné cet accord.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 7 — Résiliation</h2>
          <p>
            L&apos;Utilisateur peut résilier son abonnement à tout moment, sans préavis ni frais,
            depuis la page « Mon compte » ou en écrivant à{' '}
            <a href="mailto:buisnesscoachia@gmail.com" className="text-indigo-300 underline">
              buisnesscoachia@gmail.com
            </a>
            . La résiliation prend effet à la fin de la période de facturation en cours&nbsp;:
            aucun remboursement pro-rata n&apos;est effectué.
          </p>
          <p className="mt-3">
            L&apos;Éditeur peut résilier le compte d&apos;un Utilisateur en cas de violation grave
            des CGU/CGV (création de comptes multiples, abus, fraude au paiement, contenu illicite),
            conformément à l&apos;art. 107 CO, avec ou sans préavis selon la gravité.
          </p>
          <p className="mt-3">
            En cas de résiliation, l&apos;Utilisateur peut demander la suppression de ses données
            personnelles dans les conditions prévues par la{' '}
            <Link href="/legal/confidentialite" className="text-indigo-300 underline">
              Politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 8 — Propriété intellectuelle</h2>
          <p>
            Le Service, son interface, son code source, ses textes et son design sont la propriété
            exclusive de l&apos;Éditeur et sont protégés par la Loi fédérale sur le droit
            d&apos;auteur et les droits voisins (LDA, RS 231.1). L&apos;Utilisateur reçoit une
            licence d&apos;usage personnelle, non exclusive et non transférable, limitée à la durée
            de son abonnement.
          </p>
          <p className="mt-3">
            Les contenus générés par l&apos;IA (roadmaps, réponses du coach) appartiennent à
            l&apos;Utilisateur, qui peut les utiliser librement à des fins personnelles ou
            professionnelles. L&apos;Éditeur conserve toutefois le droit de stocker ces contenus
            dans le cadre du fonctionnement du Service.
          </p>
          <p className="mt-3">
            L&apos;Utilisateur s&apos;interdit de revendre, redistribuer, ou utiliser le Service ou
            ses sorties pour entraîner un modèle d&apos;intelligence artificielle concurrent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 9 — Responsabilité et limitations</h2>
          <p>
            Le Service utilise une intelligence artificielle générative (Claude d&apos;Anthropic).
            Les conseils, roadmaps et réponses produits sont des <strong>suggestions
            automatisées</strong> et non des conseils professionnels (juridiques, fiscaux,
            comptables, médicaux, etc.).
          </p>
          <p className="mt-3">
            L&apos;Utilisateur est seul responsable de l&apos;usage qu&apos;il fait des contenus
            générés et des décisions business qu&apos;il prend sur leur base. Dans les limites
            permises par le droit suisse (art. 100 al. 2 CO), la responsabilité de l&apos;Éditeur
            est limitée aux dommages directs prouvés résultant d&apos;une faute intentionnelle ou
            d&apos;une négligence grave de sa part. Les dommages indirects, pertes de profit, perte
            de chance ou dommages immatériels sont expressément exclus.
          </p>
          <p className="mt-3">
            L&apos;Éditeur s&apos;engage à mettre en œuvre les moyens raisonnables pour assurer la
            disponibilité du Service, sans toutefois garantir un service ininterrompu. En cas
            d&apos;indisponibilité majeure (&gt; 24h consécutives), un avoir équivalent à la période
            d&apos;interruption sera crédité sur la prochaine facture.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 10 — Données personnelles</h2>
          <p>
            Le traitement des données personnelles est régi par la Loi fédérale suisse sur la
            protection des données (nLPD) et, lorsque l&apos;Utilisateur réside dans l&apos;Union
            européenne, par le Règlement général sur la protection des données (RGPD). Voir la{' '}
            <Link href="/legal/confidentialite" className="text-indigo-300 underline">
              Politique de confidentialité
            </Link>{' '}
            pour le détail.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 11 — Modification des CGU/CGV</h2>
          <p>
            L&apos;Éditeur peut modifier les présentes CGU/CGV à tout moment. Toute modification
            substantielle sera notifiée par e-mail au moins 15 jours avant son entrée en vigueur.
            L&apos;Utilisateur peut résilier sans frais s&apos;il refuse les nouvelles conditions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-white">Article 12 — Droit applicable et for</h2>
          <p>
            Les présentes CGU/CGV sont régies par le droit suisse, à l&apos;exclusion de toute règle
            de conflit de lois. Le for exclusif est fixé au siège de l&apos;Éditeur, dans le canton
            de Vaud, sous réserve des dispositions impératives de protection des consommateurs en
            faveur de l&apos;Utilisateur (art. 32 CPC, art. 17 Convention de Lugano).
          </p>
          <p className="mt-3 text-sm text-gray-400">
            Pour les Utilisateurs résidant dans l&apos;Union européenne, les règles de protection
            des consommateurs de leur pays de résidence peuvent prévoir un for ou une loi
            applicable différente. Les Utilisateurs européens peuvent également recourir à la
            plateforme européenne de règlement en ligne des litiges (RLL) accessible à
            l&apos;adresse{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              className="text-indigo-300 underline"
              target="_blank"
              rel="noreferrer"
            >
              https://ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </section>

        <section className="border-t border-white/10 pt-6 mt-10">
          <p className="text-xs text-gray-500 leading-relaxed">
            ⚠️ Ces conditions constituent un point de départ rédigé selon les principes du droit
            suisse et adapté au Service. Il est fortement recommandé de les faire relire et valider
            par un avocat ou une fiduciaire suisse spécialisée en droit du numérique avant la mise
            en ligne publique avec facturation réelle, et de s&apos;assurer notamment de leur
            compatibilité avec les règles applicables aux clients européens (RGPD, conventions de
            consommation).
          </p>
        </section>
      </div>
    </>
  );
}
