/**
 * Legal document content (spec v1.2 §10).
 *
 * These are editable placeholder templates, not legal advice — the spec is
 * explicit that a legal professional should review them before the app
 * leaves test mode or reaches a public store listing. Bracketed text like
 * "[Your name]" is exactly what it looks like: fill in your own details.
 *
 * Only English and French are written out. Other UI languages fall back to
 * English here (unlike the short UI phrases in src/i18n, which fall back
 * silently for any missing key) — legal text is exactly the kind of content
 * that should never be shown in a half-machine-translated form.
 */

export type LegalDocId = 'terms' | 'notice' | 'privacy';
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

type LegalContentLocale = 'en' | 'fr';

export const LEGAL_CONTENT: Record<LegalContentLocale, Record<LegalDocId, LegalDoc>> = {
  en: {
    terms: {
      title: 'Terms of Service',
      intro:
        'This app is currently a personal test build (spec v1.2, "TEST MODE"): not distributed publicly, not linked to any account or server. These terms describe how it works today and are meant to be replaced with reviewed, jurisdiction-specific terms before any public release.',
      sections: [
        {
          heading: 'Purpose',
          body: [
            'The app lets you record your own alcohol consumption and view charts, streaks and summaries built from that record, entirely on your own device.',
          ],
        },
        {
          heading: 'Acceptance of these terms',
          body: ['By using the app you accept these terms as they stand at the time of use.'],
        },
        {
          heading: 'Description of the service',
          body: [
            'This is a test / beta build. Features may change or be removed without notice. There is no guarantee of availability, accuracy, or fitness for any particular purpose.',
          ],
        },
        {
          heading: 'Your obligations',
          body: ['You are responsible for the accuracy of what you log and for how you use any estimate the app shows you.'],
        },
        {
          heading: 'Not medical advice',
          body: [
            'Nothing in this app — including the blood alcohol estimate, savings figures, or the Help & Resources content — is medical advice, a diagnosis, or a substitute for professional care. See the disclaimer on the Help screen.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: ['[Your name/company] retains rights to the app\'s design and code, except for open-source components used under their own licenses.'],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'The app is provided "as is". To the extent permitted by law, [your name/company] is not liable for decisions made based on figures or estimates shown in the app.',
          ],
        },
        {
          heading: 'Data & privacy',
          body: [
            'All data — your log, your profile, your settings — is stored locally on your device only. See the Privacy Policy for details.',
          ],
        },
        {
          heading: 'Changes to these terms',
          body: ['These terms may change as the app develops. Continued use after a change means you accept the new terms.'],
        },
        {
          heading: 'Governing law',
          body: ['These terms are governed by French law, unless you set this to a different jurisdiction before publishing.'],
        },
        {
          heading: 'Contact',
          body: ['[Your contact email or address]'],
        },
      ],
    },
    notice: {
      title: 'Legal Notice',
      intro: 'Placeholder legal notice. Fill in the bracketed fields with your own details before this app leaves test mode.',
      sections: [
        { heading: 'Publisher', body: ['[Your name or company name]', '[Address]', '[Contact email]'] },
        {
          heading: 'Hosting provider',
          body: [
            'Not applicable yet — the app has no server and stores everything locally on your device. Add a hosting provider here if that changes.',
          ],
        },
        { heading: 'Director of publication', body: ['[Your name]'] },
        {
          heading: 'Intellectual property',
          body: ['The app\'s content, design and code are the property of [your name/company] except where otherwise licensed.'],
        },
        {
          heading: 'Personal data',
          body: ['See the Privacy Policy for what is collected and how it is stored.'],
        },
        {
          heading: 'Cookies & local storage (web build only)',
          body: [
            'The web build stores your log, profile and settings in your browser\'s local storage so the app works without a server. No tracking or advertising cookies are used.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro:
        'Not explicitly requested by the original spec, but added here because the profile added in v1.2 collects sensitive personal information (§4) — it deserves its own clear statement alongside the Terms and Legal Notice.',
      sections: [
        {
          heading: 'What is collected',
          body: [
            'Your drink log (what, when, how much, optionally where and a note); optionally, your sex, age, weight, height, spending baseline and reasons for using the app; your app settings.',
          ],
        },
        {
          heading: 'Where it is stored',
          body: [
            'Only on this device — in an SQLite database on iOS/Android, or your browser\'s local storage on the web build. There is no server and no account.',
          ],
        },
        {
          heading: 'What it is used for',
          body: [
            'Showing you your own history, charts and estimates. Nothing is used for any purpose beyond what you see in the app.',
          ],
        },
        {
          heading: 'Sharing',
          body: ['Nothing is sent anywhere automatically. Data leaves the device only when you explicitly export it.'],
        },
        {
          heading: 'Your rights',
          body: [
            'You can view, edit, or delete any entry at any time. Settings → Data & privacy has a "delete all my data" option that removes everything, including your profile, and starts you back at onboarding.',
          ],
        },
        {
          heading: 'Contact',
          body: ['[Your contact email]'],
        },
      ],
    },
  },
  fr: {
    terms: {
      title: "Conditions générales d'utilisation",
      intro:
        "Cette application est actuellement une version de test personnelle (spec v1.2, « TEST MODE ») : non distribuée publiquement, non liée à un compte ou un serveur. Ces conditions décrivent son fonctionnement actuel et sont destinées à être remplacées par des conditions relues et adaptées à votre juridiction avant toute publication.",
      sections: [
        {
          heading: 'Objet',
          body: [
            "L'application vous permet d'enregistrer votre propre consommation d'alcool et de consulter des graphiques, séries et résumés construits à partir de cet historique, entièrement sur votre appareil.",
          ],
        },
        {
          heading: 'Acceptation des conditions',
          body: ["En utilisant l'application, vous acceptez ces conditions telles qu'elles sont au moment de l'utilisation."],
        },
        {
          heading: 'Description du service',
          body: [
            "Il s'agit d'une version de test / bêta. Les fonctionnalités peuvent changer ou disparaître sans préavis. Aucune garantie de disponibilité, d'exactitude ou d'adéquation à un usage particulier n'est fournie.",
          ],
        },
        {
          heading: 'Vos obligations',
          body: ["Vous êtes responsable de l'exactitude de ce que vous enregistrez et de l'usage que vous faites des estimations affichées."],
        },
        {
          heading: "Absence de conseil médical",
          body: [
            "Rien dans cette application — y compris l'estimation d'alcoolémie, les chiffres d'économies ou le contenu d'Aide & ressources — ne constitue un avis médical, un diagnostic ou un substitut à un suivi professionnel. Voir l'avertissement sur l'écran Aide.",
          ],
        },
        {
          heading: 'Propriété intellectuelle',
          body: ["[Votre nom / société] conserve les droits sur la conception et le code de l'application, à l'exception des composants open source utilisés sous leurs propres licences."],
        },
        {
          heading: 'Limitation de responsabilité',
          body: [
            "L'application est fournie « en l'état ». Dans la limite permise par la loi, [votre nom / société] ne peut être tenu responsable des décisions prises sur la base des chiffres ou estimations affichés.",
          ],
        },
        {
          heading: 'Données & confidentialité',
          body: [
            'Toutes les données — votre historique, votre profil, vos réglages — sont stockées uniquement sur votre appareil. Voir la Politique de confidentialité pour le détail.',
          ],
        },
        {
          heading: 'Modification des conditions',
          body: ["Ces conditions peuvent évoluer avec l'application. Continuer à utiliser l'application après une modification vaut acceptation des nouvelles conditions."],
        },
        {
          heading: 'Droit applicable',
          body: ['Ces conditions sont régies par le droit français, sauf si vous choisissez une autre juridiction avant publication.'],
        },
        {
          heading: 'Contact',
          body: ['[Votre e-mail ou adresse de contact]'],
        },
      ],
    },
    notice: {
      title: 'Mentions légales',
      intro: 'Mentions légales type. Complétez les champs entre crochets avec vos propres informations avant que l\'application ne sorte du mode test.',
      sections: [
        { heading: 'Éditeur', body: ['[Votre nom ou raison sociale]', '[Adresse]', '[E-mail de contact]'] },
        {
          heading: 'Hébergeur',
          body: [
            "Non applicable pour l'instant — l'application n'a pas de serveur et stocke tout localement sur votre appareil. Ajoutez un hébergeur ici si cela change.",
          ],
        },
        { heading: 'Directeur de la publication', body: ['[Votre nom]'] },
        {
          heading: 'Propriété intellectuelle',
          body: ["Le contenu, la conception et le code de l'application sont la propriété de [votre nom / société], sauf mention contraire."],
        },
        {
          heading: 'Données personnelles',
          body: ['Voir la Politique de confidentialité pour savoir ce qui est collecté et comment cela est stocké.'],
        },
        {
          heading: 'Cookies & stockage local (version web uniquement)',
          body: [
            "La version web stocke votre historique, votre profil et vos réglages dans le stockage local de votre navigateur afin que l'application fonctionne sans serveur. Aucun cookie de suivi ou publicitaire n'est utilisé.",
          ],
        },
      ],
    },
    privacy: {
      title: 'Politique de confidentialité',
      intro:
        "Non explicitement demandée dans la spec d'origine, mais ajoutée ici car le profil introduit en v1.2 collecte des informations personnelles sensibles (§4) — cela mérite une déclaration claire à part, aux côtés des CGU et des mentions légales.",
      sections: [
        {
          heading: 'Ce qui est collecté',
          body: [
            "Votre historique de consommation (quoi, quand, combien, éventuellement où et une note) ; éventuellement votre sexe, âge, poids, taille, référence de dépense et les raisons de votre utilisation de l'application ; vos réglages.",
          ],
        },
        {
          heading: 'Où c\'est stocké',
          body: [
            "Uniquement sur cet appareil — dans une base SQLite sur iOS/Android, ou le stockage local de votre navigateur pour la version web. Il n'y a ni serveur ni compte.",
          ],
        },
        {
          heading: "Utilisation",
          body: [
            "Pour vous montrer votre propre historique, vos graphiques et vos estimations. Rien n'est utilisé à d'autres fins que ce que vous voyez dans l'application.",
          ],
        },
        {
          heading: 'Partage',
          body: ["Rien n'est envoyé automatiquement où que ce soit. Les données ne quittent l'appareil que si vous les exportez vous-même."],
        },
        {
          heading: 'Vos droits',
          body: [
            "Vous pouvez consulter, modifier ou supprimer toute entrée à tout moment. Réglages → Données & confidentialité propose une option « tout supprimer » qui efface tout, y compris votre profil, et vous ramène à l'accueil initial.",
          ],
        },
        {
          heading: 'Contact',
          body: ['[Votre e-mail de contact]'],
        },
      ],
    },
  },
};

export function legalDoc(locale: string, doc: LegalDocId): LegalDoc {
  const resolved: LegalContentLocale = locale === 'fr' ? 'fr' : 'en';
  return LEGAL_CONTENT[resolved][doc];
}
