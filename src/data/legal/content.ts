/**
 * Legal document content (spec v1.2 §10).
 *
 * Editable templates, not legal advice — a legal professional should review
 * them before a public store listing. The identity/contact fields (publisher, SIRET,
 * address, director of publication) are filled in with the site owner's own
 * details; update them directly here if that information ever changes.
 *
 * These documents describe the app as it ships: an account is REQUIRED, and
 * cloud sync therefore applies to every user. That follows app/_layout.tsx,
 * which gates the app behind sign-in whenever a Firebase project is
 * configured. The local-only fallback for an unconfigured build is a
 * development convenience and is deliberately not described here — if that
 * ever becomes a shipping mode, these texts have to change with it.
 *
 * Written out in all 8 UI languages so these documents follow whichever
 * language the reader has chosen, same as the rest of the app.
 */

export type LegalDocId = 'terms' | 'notice' | 'privacy' | 'deleteAccount';
export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

type LegalContentLocale = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'zh' | 'ar';

const LOCALES: LegalContentLocale[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ar'];

function resolveLocale(locale: string): LegalContentLocale {
  return (LOCALES as string[]).includes(locale) ? (locale as LegalContentLocale) : 'en';
}

export const LEGAL_CONTENT: Record<LegalContentLocale, Record<LegalDocId, LegalDoc>> = {
  en: {
    terms: {
      title: 'Terms of Service',
      intro:
        'These terms govern your use of the app. By using it, you accept them as they stand at the time of use.',
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
            'The app is under active development. Features may change or be removed without notice, and there is no guarantee of availability, accuracy, or fitness for any particular purpose.',
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
          body: ['LaSolutionDigital retains rights to the app\'s design and code, except for open-source components used under their own licenses.'],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'The app is provided "as is". To the extent permitted by law, LaSolutionDigital is not liable for decisions made based on figures or estimates shown in the app.',
          ],
        },
        {
          heading: 'Data & privacy',
          body: [
            'An account is required to use the app. Your log, your profile and your settings are stored on this device; your log, your custom drinks and your profile are also copied to our Firebase project for cloud sync — see the "Cloud sync" section of the Privacy Policy. Your settings stay on this device only.',
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
          body: [
            'Name or company name: LaSolutionDigital',
            'Business registration number — SIRET: 93866525400018',
            'Address: 6 rue du Fort, 08260 Eteignières, France',
            'Contact email: romainlambert@lasolutiondigital.com',
            'Phone: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Legal Notice',
      intro: 'Legal notice and publisher identification for this app, as required under French law.',
      sections: [
        {
          heading: 'Publisher',
          body: [
            'Name or company name: LaSolutionDigital',
            'Legal form: micro-entreprise (French sole-trader status)',
            'Business registration number — SIRET: 93866525400018',
            'Registered / postal address: 6 rue du Fort, 08260 Eteignières, France',
            'Contact email: romainlambert@lasolutiondigital.com',
            'Phone: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Hosting provider',
          body: [
            'The app stores your data on your device and, because an account is required to use it, also in our Firebase project — Firebase Authentication for sign-in and Cloud Firestore for storage, both Google Cloud services acting as data processors on our behalf. Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland.',
          ],
        },
        { heading: 'Director of publication', body: ['Romain Lambert'] },
        {
          heading: 'Intellectual property',
          body: ['The app\'s content, design and code are the property of LaSolutionDigital except where otherwise licensed.'],
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
    deleteAccount: {
      title: 'Deleting Your Account',
      intro:
        'How to delete your TYA account and the data attached to it. TYA is published by LaSolutionDigital.',
      sections: [
        {
          heading: 'From inside the app',
          body: [
            'Open TYA, go to Settings → Account & cloud sync, and choose "Delete my account". You will be asked to confirm with your password. The account and everything stored in the cloud under it are removed immediately and permanently.',
          ],
        },
        {
          heading: 'By email',
          body: [
            'If you cannot sign in — or you signed in with Google and the in-app option asks for a password you never set — write to romainlambert@lasolutiondigital.com from the address the account uses, and ask for it to be deleted. Requests are handled within 30 days.',
          ],
        },
        {
          heading: 'What is deleted',
          body: [
            'The sign-in account itself, your drink log, your custom drinks and your profile — that is your name, your email address, and whichever of sex, age, weight, height, spending baseline and reasons for using the app you chose to fill in.',
          ],
        },
        {
          heading: 'What is kept, and for how long',
          body: [
            'Nothing is kept once the deletion runs: the account and its documents are removed outright, not flagged as inactive.',
            'Deleting the account does not touch the copy still on your phone. To erase that as well, use Settings → Data & privacy → "Delete all my data", which clears the device and the cloud together.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro:
        'This policy explains what the app records, where it is stored, who can reach it, and how to erase it.',
      sections: [
        {
          heading: 'What is collected',
          body: [
            'Your drink log (what, when, how much, optionally where and a note); your account email address; optionally your name, sex, age, weight, height, spending baseline and reasons for using the app; your app settings.',
          ],
        },
        {
          heading: 'Where it is stored',
          body: [
            'On this device — in an SQLite database on iOS/Android, or your browser local storage on the web build. Because an account is required, the same data (your log, custom drinks and profile) is also stored in Cloud Firestore, part of Google Firebase platform, scoped to your account and never shared with other users — see "Cloud sync" below. Your app settings stay on this device only.',
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
          body: ['Your drink log and profile are never shared with other users, sold, or used for advertising. They leave this device in two ways: cloud sync, which is part of using the app, and any export you start yourself. Advertising is a separate matter, described below.'],
        },
        {
          heading: 'Advertising',
          body: [
            'The free version shows one banner, on the supporter screen only. It is served by Google AdMob. Opening that screen is what starts the ads SDK — it runs nowhere else in the app, and it does not run at all for supporters, who see no banner.',
            "AdMob receives what it needs to select and measure an ad: your device's advertising identifier, technical details about the device, and an approximate location derived from your IP address. It does not receive your drink log, your profile, or anything else this app records.",
            "Where consent is required — the EEA and the UK — Google's consent form is shown before the first ad request, and no ad is requested if you decline. You can reopen that form at any time from Settings, and you can reset or delete the advertising identifier in your device's Android settings.",
          ],
        },
        {
          heading: 'Cloud sync',
          body: [
            'Because the app requires an account, the same data already described above — your drink log, custom drinks and profile — is copied to our Firebase project (Firebase Authentication for sign-in, Cloud Firestore for storage), operated by Google as a data processor on our behalf. No additional data is collected just because sync exists.',
            'You can erase all of it at any time: Settings → Account & cloud sync has a "delete my account" option that removes your account and its cloud data outright. Data residency depends on which Firebase project region is configured for this deployment.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You can view, edit, or delete any entry at any time. Settings → Data & privacy has a "delete all my data" option that removes everything, including your profile, and starts you back at onboarding.',
            'If you have an account, Settings → Account & cloud sync has a "delete my account" option that permanently deletes your account and all associated cloud data — a complete erasure, not just a sign-out.',
          ],
        },
        {
          heading: 'Data controller & contact',
          body: [
            'Name or company name (data controller): LaSolutionDigital',
            'Business registration number — SIRET: 93866525400018',
            'Address: 6 rue du Fort, 08260 Eteignières, France',
            'Contact email: romainlambert@lasolutiondigital.com',
            'Phone: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  fr: {
    terms: {
      title: "Conditions générales d'utilisation",
      intro:
        "Ces conditions régissent votre utilisation de l'application. En l'utilisant, vous les acceptez telles qu'elles sont au moment de votre utilisation.",
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
            "L'application évolue en permanence. Les fonctionnalités peuvent changer ou disparaître sans préavis, et aucune garantie de disponibilité, d'exactitude ou d'adéquation à un usage particulier n'est fournie.",
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
          body: ["LaSolutionDigital conserve les droits sur la conception et le code de l'application, à l'exception des composants open source utilisés sous leurs propres licences."],
        },
        {
          heading: 'Limitation de responsabilité',
          body: [
            "L'application est fournie « en l'état ». Dans la limite permise par la loi, LaSolutionDigital ne peut être tenu responsable des décisions prises sur la base des chiffres ou estimations affichés.",
          ],
        },
        {
          heading: 'Données & confidentialité',
          body: [
            "Un compte est nécessaire pour utiliser l'application. Votre historique, votre profil et vos réglages sont stockés sur cet appareil ; votre historique, vos boissons personnalisées et votre profil sont également copiés dans notre projet Firebase pour la synchronisation cloud — voir la section « Synchronisation cloud » de la Politique de confidentialité. Vos réglages, eux, ne quittent pas l'appareil.",
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
          body: [
            'Nom ou raison sociale : LaSolutionDigital',
            'SIRET : 93866525400018',
            'Adresse : 6 rue du Fort, 08260 Eteignières',
            'E-mail de contact : romainlambert@lasolutiondigital.com',
            'Téléphone : +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Mentions légales',
      intro: "Mentions légales et identification de l'éditeur de l'application, conformément au droit français.",
      sections: [
        {
          heading: 'Éditeur',
          body: [
            'Nom ou raison sociale : LaSolutionDigital',
            'Forme juridique : micro-entreprise',
            'SIRET : 93866525400018',
            'Adresse du siège / adresse postale : 6 rue du Fort, 08260 Eteignières',
            'E-mail de contact : romainlambert@lasolutiondigital.com',
            'Téléphone : +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Hébergeur',
          body: [
            "L'application stocke vos données sur votre appareil et, un compte étant nécessaire pour l'utiliser, également dans notre projet Firebase — Firebase Authentication pour la connexion et Cloud Firestore pour le stockage, deux services Google Cloud agissant comme sous-traitants pour notre compte. Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande.",
          ],
        },
        { heading: 'Directeur de la publication', body: ['Romain Lambert'] },
        {
          heading: 'Propriété intellectuelle',
          body: ["Le contenu, la conception et le code de l'application sont la propriété de LaSolutionDigital, sauf mention contraire."],
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
    deleteAccount: {
      title: 'Supprimer votre compte',
      intro:
        'Comment supprimer votre compte TYA et les données qui y sont rattachées. TYA est édité par LaSolutionDigital.',
      sections: [
        {
          heading: "Depuis l'application",
          body: [
            'Ouvrez TYA, allez dans Réglages → Compte et synchronisation, puis choisissez « Supprimer mon compte ». Une confirmation par mot de passe vous sera demandée. Le compte et tout ce qui est stocké dans le cloud sous ce compte sont supprimés immédiatement et définitivement.',
          ],
        },
        {
          heading: 'Par e-mail',
          body: [
            "Si vous ne parvenez plus à vous connecter — ou si vous vous êtes connecté avec Google et que l'option dans l'application réclame un mot de passe que vous n'avez jamais défini — écrivez à romainlambert@lasolutiondigital.com depuis l'adresse du compte, en demandant sa suppression. Les demandes sont traitées sous 30 jours.",
          ],
        },
        {
          heading: 'Ce qui est supprimé',
          body: [
            "Le compte de connexion lui-même, votre historique de consommations, vos boissons personnalisées et votre profil — c'est-à-dire votre nom, votre adresse e-mail, ainsi que ceux du sexe, de l'âge, du poids, de la taille, du budget de référence et des raisons d'utiliser l'application que vous avez choisi de renseigner.",
          ],
        },
        {
          heading: 'Ce qui est conservé, et combien de temps',
          body: [
            "Rien n'est conservé une fois la suppression effectuée : le compte et ses documents sont supprimés purement et simplement, et non marqués comme inactifs.",
            "La suppression du compte ne touche pas à la copie encore présente sur votre téléphone. Pour l'effacer aussi, utilisez Réglages → Données & confidentialité → « Supprimer toutes mes données », qui efface l'appareil et le cloud ensemble.",
          ],
        },
      ],
    },
    privacy: {
      title: 'Politique de confidentialité',
      intro:
        "Cette politique explique ce que l'application enregistre, où ces données sont stockées, qui peut y accéder et comment les effacer.",
      sections: [
        {
          heading: 'Ce qui est collecté',
          body: [
            "Votre historique de consommation (quoi, quand, combien, éventuellement où et une note) ; l'adresse e-mail de votre compte ; éventuellement votre nom, sexe, âge, poids, taille, référence de dépense et les raisons de votre utilisation de l'application ; vos réglages.",
          ],
        },
        {
          heading: 'Où c\'est stocké',
          body: [
            "Sur cet appareil — dans une base SQLite sur iOS/Android, ou le stockage local de votre navigateur pour la version web. Comme un compte est nécessaire, ces mêmes données (historique, boissons personnalisées et profil) sont aussi stockées dans Cloud Firestore, la plateforme Firebase de Google, réservées à votre compte et jamais partagées avec d'autres utilisateurs — voir « Synchronisation cloud » ci-dessous. Vos réglages, eux, restent uniquement sur cet appareil.",
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
          body: ["Votre historique et votre profil ne sont jamais partagés avec d'autres utilisateurs, ni vendus, ni utilisés à des fins publicitaires. Ils quittent cet appareil de deux façons : la synchronisation cloud, qui fait partie du fonctionnement de l'application, et les exports que vous déclenchez vous-même. La publicité est un sujet distinct, décrit ci-dessous."],
        },
        {
          heading: 'Publicité',
          body: [
            "La version gratuite affiche une bannière, uniquement sur l'écran de soutien. Elle est diffusée par Google AdMob. C'est l'ouverture de cet écran qui démarre le SDK publicitaire : il ne s'exécute nulle part ailleurs dans l'application, et pas du tout pour les abonnés, qui ne voient aucune bannière.",
            "AdMob reçoit ce qui lui est nécessaire pour choisir et mesurer une annonce : l'identifiant publicitaire de votre appareil, des informations techniques sur celui-ci, et une localisation approximative déduite de votre adresse IP. Il ne reçoit ni votre historique de consommation, ni votre profil, ni quoi que ce soit d'autre enregistré par l'application.",
            "Là où le consentement est requis — l'EEE et le Royaume-Uni — le formulaire de consentement de Google est affiché avant la première demande d'annonce, et aucune annonce n'est demandée si vous refusez. Vous pouvez rouvrir ce formulaire à tout moment depuis les Réglages, et vous pouvez réinitialiser ou supprimer l'identifiant publicitaire dans les réglages Android de votre appareil.",
          ],
        },
        {
          heading: 'Synchronisation cloud',
          body: [
            "L'application nécessitant un compte, les mêmes données décrites ci-dessus — votre historique, vos boissons personnalisées et votre profil — sont copiées dans notre projet Firebase (Firebase Authentication pour la connexion, Cloud Firestore pour le stockage), exploité par Google en tant que sous-traitant pour notre compte. Aucune donnée supplémentaire n'est collectée du seul fait que la synchronisation existe.",
            'Vous pouvez tout effacer à tout moment : Réglages → Compte et synchronisation propose une option « supprimer mon compte » qui efface le compte et ses données cloud purement et simplement. La localisation des données dépend de la région du projet Firebase configurée pour ce déploiement.',
          ],
        },
        {
          heading: 'Vos droits',
          body: [
            "Vous pouvez consulter, modifier ou supprimer toute entrée à tout moment. Réglages → Données & confidentialité propose une option « tout supprimer » qui efface tout, y compris votre profil, et vous ramène à l'accueil initial.",
            "Si vous avez un compte, Réglages → Compte et synchronisation propose une option « supprimer mon compte » qui supprime définitivement votre compte et toutes les données associées dans le cloud — une suppression complète, pas seulement une déconnexion.",
          ],
        },
        {
          heading: 'Responsable du traitement & contact',
          body: [
            'Nom ou raison sociale (responsable du traitement) : LaSolutionDigital',
            'SIRET : 93866525400018',
            'Adresse : 6 rue du Fort, 08260 Eteignières',
            'E-mail de contact : romainlambert@lasolutiondigital.com',
            'Téléphone : +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  es: {
    terms: {
      title: 'Condiciones Generales de Uso',
      intro:
        'Estas condiciones rigen tu uso de la aplicación. Al usarla, las aceptas tal y como están en el momento de su uso.',
      sections: [
        {
          heading: 'Objeto',
          body: [
            'La aplicación te permite registrar tu propio consumo de alcohol y consultar gráficos, rachas y resúmenes generados a partir de ese historial, íntegramente en tu propio dispositivo.',
          ],
        },
        {
          heading: 'Aceptación de estas condiciones',
          body: ['Al utilizar la aplicación, aceptas estas condiciones tal como están vigentes en el momento del uso.'],
        },
        {
          heading: 'Descripción del servicio',
          body: [
            'La aplicación está en desarrollo activo. Las funciones pueden cambiar o eliminarse sin previo aviso, y no se garantiza disponibilidad, exactitud ni idoneidad para un fin particular.',
          ],
        },
        {
          heading: 'Tus obligaciones',
          body: ['Eres responsable de la exactitud de lo que registras y del uso que hagas de cualquier estimación que te muestre la aplicación.'],
        },
        {
          heading: 'No es un consejo médico',
          body: [
            'Nada en esta aplicación —incluida la estimación de alcoholemia, las cifras de ahorro o el contenido de Ayuda y recursos— constituye un consejo médico, un diagnóstico o un sustituto de la atención profesional. Consulta el aviso en la pantalla de Ayuda.',
          ],
        },
        {
          heading: 'Propiedad intelectual',
          body: ['LaSolutionDigital conserva los derechos sobre el diseño y el código de la aplicación, salvo los componentes de código abierto utilizados bajo sus propias licencias.'],
        },
        {
          heading: 'Limitación de responsabilidad',
          body: [
            'La aplicación se ofrece «tal cual». En la medida en que lo permita la ley, LaSolutionDigital no será responsable de las decisiones tomadas a partir de las cifras o estimaciones mostradas en la aplicación.',
          ],
        },
        {
          heading: 'Datos y privacidad',
          body: [
            'Se necesita una cuenta para usar la aplicación. Tu historial, tu perfil y tus ajustes se almacenan en este dispositivo; tu historial, tus bebidas personalizadas y tu perfil también se copian a nuestro proyecto de Firebase para la sincronización en la nube — consulta el apartado «Sincronización en la nube» de la Política de Privacidad. Tus ajustes no salen del dispositivo.',
          ],
        },
        {
          heading: 'Modificación de estas condiciones',
          body: ['Estas condiciones pueden cambiar a medida que evolucione la aplicación. Seguir utilizándola después de un cambio implica aceptar las nuevas condiciones.'],
        },
        {
          heading: 'Ley aplicable',
          body: ['Estas condiciones se rigen por la legislación francesa, salvo que elijas otra jurisdicción antes de la publicación.'],
        },
        {
          heading: 'Contacto',
          body: [
            'Nombre o razón social: LaSolutionDigital',
            'Número de identificación fiscal / registro mercantil — SIRET: 93866525400018',
            'Dirección: 6 rue du Fort, 08260 Eteignières, Francia',
            'Correo de contacto: romainlambert@lasolutiondigital.com',
            'Teléfono: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Aviso Legal',
      intro: 'Aviso legal e identificación del editor de esta aplicación, conforme a la legislación francesa.',
      sections: [
        {
          heading: 'Editor',
          body: [
            'Nombre o razón social: LaSolutionDigital',
            'Forma jurídica: micro-entreprise (régimen francés de autónomo)',
            'Número de identificación fiscal / registro mercantil — SIRET: 93866525400018',
            'Domicilio social / dirección postal: 6 rue du Fort, 08260 Eteignières, Francia',
            'Correo de contacto: romainlambert@lasolutiondigital.com',
            'Teléfono: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Proveedor de alojamiento',
          body: [
            'La aplicación almacena tus datos en tu dispositivo y, dado que se necesita una cuenta para usarla, también en nuestro proyecto de Firebase: Firebase Authentication para el inicio de sesión y Cloud Firestore para el almacenamiento, ambos servicios de Google Cloud que actúan como encargados del tratamiento por cuenta nuestra. Google Ireland Limited, Gordon House, Barrow Street, Dublín 4, Irlanda.',
          ],
        },
        { heading: 'Director de publicación', body: ['Romain Lambert'] },
        {
          heading: 'Propiedad intelectual',
          body: ['El contenido, el diseño y el código de la aplicación son propiedad de LaSolutionDigital, salvo que se indique lo contrario.'],
        },
        {
          heading: 'Datos personales',
          body: ['Consulta la Política de Privacidad para saber qué se recopila y cómo se almacena.'],
        },
        {
          heading: 'Cookies y almacenamiento local (solo versión web)',
          body: [
            'La versión web almacena tu historial, tu perfil y tus ajustes en el almacenamiento local de tu navegador para que la aplicación funcione sin servidor. No se utilizan cookies de seguimiento ni publicitarias.',
          ],
        },
      ],
    },
    deleteAccount: {
      title: 'Eliminar tu cuenta',
      intro:
        'Cómo eliminar tu cuenta de TYA y los datos asociados. TYA está publicada por LaSolutionDigital.',
      sections: [
        {
          heading: 'Desde la aplicación',
          body: [
            'Abre TYA, ve a Ajustes → Cuenta y sincronización, y elige «Eliminar mi cuenta». Se te pedirá confirmar con tu contraseña. La cuenta y todo lo almacenado en la nube bajo ella se eliminan de inmediato y de forma permanente.',
          ],
        },
        {
          heading: 'Por correo electrónico',
          body: [
            'Si ya no puedes iniciar sesión —o si entraste con Google y la opción de la aplicación te pide una contraseña que nunca creaste— escribe a romainlambert@lasolutiondigital.com desde la dirección de la cuenta, solicitando su eliminación. Las solicitudes se atienden en un plazo de 30 días.',
          ],
        },
        {
          heading: 'Qué se elimina',
          body: [
            'La propia cuenta de acceso, tu registro de consumiciones, tus bebidas personalizadas y tu perfil: tu nombre, tu dirección de correo y los datos de sexo, edad, peso, altura, gasto de referencia y motivos de uso que hayas decidido rellenar.',
          ],
        },
        {
          heading: 'Qué se conserva, y durante cuánto tiempo',
          body: [
            'No se conserva nada una vez ejecutada la eliminación: la cuenta y sus documentos se borran por completo, no se marcan como inactivos.',
            'Eliminar la cuenta no afecta a la copia que sigue en tu teléfono. Para borrarla también, usa Ajustes → Datos y privacidad → «Eliminar todos mis datos», que limpia el dispositivo y la nube a la vez.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de Privacidad',
      intro:
        'Esta política explica qué registra la aplicación, dónde se almacena, quién puede acceder a ello y cómo borrarlo.',
      sections: [
        {
          heading: 'Qué se recopila',
          body: [
            'Tu historial de consumo (qué, cuándo, cuánto, opcionalmente dónde y una nota); la dirección de correo electrónico de tu cuenta; opcionalmente tu nombre, sexo, edad, peso, altura, gasto de referencia y los motivos por los que usas la aplicación; tus ajustes.',
          ],
        },
        {
          heading: 'Dónde se almacena',
          body: [
            'En este dispositivo — en una base de datos SQLite en iOS/Android, o en el almacenamiento local de tu navegador en la versión web. Como se necesita una cuenta, esos mismos datos (historial, bebidas personalizadas y perfil) también se guardan en Cloud Firestore, la plataforma Firebase de Google, reservados a tu cuenta y nunca compartidos con otros usuarios — consulta «Sincronización en la nube» más abajo. Tus ajustes permanecen solo en este dispositivo.',
          ],
        },
        {
          heading: 'Para qué se usa',
          body: [
            'Para mostrarte tu propio historial, gráficos y estimaciones. Nada se utiliza para ningún fin más allá de lo que ves en la aplicación.',
          ],
        },
        {
          heading: 'Compartición',
          body: ['Tu historial y tu perfil nunca se comparten con otros usuarios, ni se venden, ni se usan con fines publicitarios. Salen de este dispositivo de dos maneras: la sincronización en la nube, que forma parte del funcionamiento de la aplicación, y las exportaciones que inicias tú. La publicidad es un asunto aparte y se describe más abajo.'],
        },
        {
          heading: 'Publicidad',
          body: [
            'La versión gratuita muestra un banner, solo en la pantalla de apoyo. Lo sirve Google AdMob. Abrir esa pantalla es lo que arranca el SDK de anuncios: no se ejecuta en ninguna otra parte de la aplicación, y no se ejecuta en absoluto para quienes tienen la suscripción, que no ven ningún banner.',
            'AdMob recibe lo necesario para seleccionar y medir un anuncio: el identificador publicitario de tu dispositivo, datos técnicos sobre él y una ubicación aproximada deducida de tu dirección IP. No recibe tu registro de consumiciones, ni tu perfil, ni nada más de lo que guarda esta aplicación.',
            'Donde se requiere consentimiento —el EEE y el Reino Unido— el formulario de consentimiento de Google se muestra antes de la primera solicitud de anuncio, y no se solicita ningún anuncio si lo rechazas. Puedes volver a abrir ese formulario en cualquier momento desde Ajustes, y puedes restablecer o eliminar el identificador publicitario en los ajustes de Android de tu dispositivo.',
          ],
        },
        {
          heading: 'Sincronización en la nube',
          body: [
            'Como la aplicación requiere una cuenta, los mismos datos descritos arriba —tu historial, tus bebidas personalizadas y tu perfil— se copian a nuestro proyecto de Firebase (Firebase Authentication para el inicio de sesión, Cloud Firestore para el almacenamiento), operado por Google como encargado del tratamiento en nuestro nombre. No se recopila ningún dato adicional por el mero hecho de que exista la sincronización.',
            'Puedes borrarlo todo cuando quieras: en Ajustes → Cuenta y sincronización hay una opción «eliminar mi cuenta» que borra la cuenta y sus datos en la nube por completo. La ubicación de los datos depende de la región del proyecto de Firebase configurada para este despliegue.',
          ],
        },
        {
          heading: 'Tus derechos',
          body: [
            'Puedes consultar, editar o eliminar cualquier registro en cualquier momento. Ajustes → Datos y privacidad incluye una opción «eliminar todos mis datos» que borra todo, incluido tu perfil, y te devuelve a la pantalla de inicio.',
            'Si tienes una cuenta, Ajustes → Cuenta y sincronización incluye una opción «eliminar mi cuenta» que borra permanentemente tu cuenta y todos los datos asociados en la nube — una eliminación completa, no solo un cierre de sesión.',
          ],
        },
        {
          heading: 'Responsable del tratamiento y contacto',
          body: [
            'Nombre o razón social (responsable del tratamiento): LaSolutionDigital',
            'Número de identificación fiscal / registro mercantil — SIRET: 93866525400018',
            'Dirección: 6 rue du Fort, 08260 Eteignières, Francia',
            'Correo de contacto: romainlambert@lasolutiondigital.com',
            'Teléfono: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  de: {
    terms: {
      title: 'Allgemeine Geschäftsbedingungen',
      intro:
        'Diese Bedingungen regeln deine Nutzung der App. Mit der Nutzung akzeptierst du sie in ihrer jeweils geltenden Fassung.',
      sections: [
        {
          heading: 'Zweck',
          body: [
            'Die App ermöglicht es dir, deinen eigenen Alkoholkonsum zu erfassen und Diagramme, Serien und Zusammenfassungen aus diesem Verlauf einzusehen — vollständig auf deinem eigenen Gerät.',
          ],
        },
        {
          heading: 'Annahme dieser Bedingungen',
          body: ['Durch die Nutzung der App akzeptierst du diese Bedingungen in der zum Zeitpunkt der Nutzung geltenden Fassung.'],
        },
        {
          heading: 'Beschreibung des Dienstes',
          body: [
            'Die App wird laufend weiterentwickelt. Funktionen können sich ohne Vorankündigung ändern oder entfernt werden, und es besteht keine Gewähr für Verfügbarkeit, Richtigkeit oder Eignung für einen bestimmten Zweck.',
          ],
        },
        {
          heading: 'Deine Pflichten',
          body: ['Du bist verantwortlich für die Richtigkeit dessen, was du protokollierst, und für den Umgang mit jeder von der App angezeigten Schätzung.'],
        },
        {
          heading: 'Kein medizinischer Rat',
          body: [
            'Nichts in dieser App — einschließlich der Blutalkohol-Schätzung, der Ersparnis-Zahlen oder der Inhalte unter Hilfe & Ressourcen — stellt einen medizinischen Rat, eine Diagnose oder einen Ersatz für professionelle Betreuung dar. Siehe den Hinweis auf dem Hilfe-Bildschirm.',
          ],
        },
        {
          heading: 'Geistiges Eigentum',
          body: ['LaSolutionDigital behält die Rechte am Design und Code der App, mit Ausnahme von Open-Source-Komponenten, die unter ihren eigenen Lizenzen verwendet werden.'],
        },
        {
          heading: 'Haftungsbeschränkung',
          body: [
            'Die App wird „wie besehen" bereitgestellt. Soweit gesetzlich zulässig, haftet LaSolutionDigital nicht für Entscheidungen, die auf Grundlage der in der App angezeigten Zahlen oder Schätzungen getroffen werden.',
          ],
        },
        {
          heading: 'Daten & Datenschutz',
          body: [
            'Für die Nutzung der App ist ein Konto erforderlich. Dein Protokoll, dein Profil und deine Einstellungen werden auf diesem Gerät gespeichert; dein Protokoll, deine eigenen Getränke und dein Profil werden zusätzlich in unser Firebase-Projekt für die Cloud-Synchronisierung kopiert — siehe den Abschnitt „Cloud-Synchronisierung“ in der Datenschutzerklärung. Deine Einstellungen verlassen das Gerät nicht.',
          ],
        },
        {
          heading: 'Änderungen dieser Bedingungen',
          body: ['Diese Bedingungen können sich mit der Weiterentwicklung der App ändern. Die weitere Nutzung nach einer Änderung gilt als Zustimmung zu den neuen Bedingungen.'],
        },
        {
          heading: 'Anwendbares Recht',
          body: ['Diese Bedingungen unterliegen französischem Recht, sofern du vor der Veröffentlichung keine andere Rechtsordnung festlegst.'],
        },
        {
          heading: 'Kontakt',
          body: [
            'Name oder Firmenname: LaSolutionDigital',
            'Handelsregisternummer — SIRET: 93866525400018',
            'Adresse: 6 rue du Fort, 08260 Eteignières, Frankreich',
            'Kontakt-E-Mail: romainlambert@lasolutiondigital.com',
            'Telefon: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Impressum',
      intro: 'Impressum und Angaben zum Anbieter dieser App gemäß französischem Recht.',
      sections: [
        {
          heading: 'Herausgeber',
          body: [
            'Name oder Firmenname: LaSolutionDigital',
            'Rechtsform: micro-entreprise (französischer Einzelunternehmer-Status)',
            'Handelsregisternummer — SIRET: 93866525400018',
            'Sitz / Postanschrift: 6 rue du Fort, 08260 Eteignières, Frankreich',
            'Kontakt-E-Mail: romainlambert@lasolutiondigital.com',
            'Telefon: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Hosting-Anbieter',
          body: [
            'Die App speichert deine Daten auf deinem Gerät und — da für die Nutzung ein Konto erforderlich ist — zusätzlich in unserem Firebase-Projekt: Firebase Authentication für die Anmeldung und Cloud Firestore für die Speicherung, beides Google-Cloud-Dienste, die in unserem Auftrag als Auftragsverarbeiter tätig sind. Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.',
          ],
        },
        { heading: 'Verantwortlich für den Inhalt (Direktor der Veröffentlichung)', body: ['Romain Lambert'] },
        {
          heading: 'Geistiges Eigentum',
          body: ['Inhalt, Design und Code der App sind Eigentum von LaSolutionDigital, sofern nicht anders lizenziert.'],
        },
        {
          heading: 'Personenbezogene Daten',
          body: ['Siehe Datenschutzerklärung für Details zu erhobenen Daten und deren Speicherung.'],
        },
        {
          heading: 'Cookies & lokaler Speicher (nur Web-Version)',
          body: [
            'Die Web-Version speichert dein Protokoll, dein Profil und deine Einstellungen im lokalen Speicher deines Browsers, damit die App ohne Server funktioniert. Es werden keine Tracking- oder Werbe-Cookies verwendet.',
          ],
        },
      ],
    },
    deleteAccount: {
      title: 'Konto löschen',
      intro:
        'Wie du dein TYA-Konto und die damit verbundenen Daten löschst. TYA wird von LaSolutionDigital herausgegeben.',
      sections: [
        {
          heading: 'In der App',
          body: [
            'Öffne TYA, gehe zu Einstellungen → Konto und Cloud-Synchronisierung und wähle „Konto löschen“. Du bestätigst mit deinem Passwort. Das Konto und alles, was in der Cloud darunter liegt, werden sofort und endgültig entfernt.',
          ],
        },
        {
          heading: 'Per E-Mail',
          body: [
            'Wenn du dich nicht mehr anmelden kannst — oder du dich mit Google angemeldet hast und die Option in der App nach einem Passwort fragt, das du nie vergeben hast — schreib an romainlambert@lasolutiondigital.com von der Adresse des Kontos aus und bitte um Löschung. Anfragen werden innerhalb von 30 Tagen bearbeitet.',
          ],
        },
        {
          heading: 'Was gelöscht wird',
          body: [
            'Das Anmeldekonto selbst, dein Trinkprotokoll, deine eigenen Getränke und dein Profil — also dein Name, deine E-Mail-Adresse sowie die Angaben zu Geschlecht, Alter, Gewicht, Größe, Ausgabenbasis und Gründen für die Nutzung, die du ausgefüllt hast.',
          ],
        },
        {
          heading: 'Was bleibt, und wie lange',
          body: [
            'Nach der Löschung bleibt nichts: Konto und Dokumente werden vollständig entfernt und nicht bloß als inaktiv markiert.',
            'Die Kontolöschung berührt die Kopie auf deinem Telefon nicht. Um auch die zu löschen, nutze Einstellungen → Daten und Datenschutz → „Alle meine Daten löschen“, das Gerät und Cloud gemeinsam leert.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Datenschutzerklärung',
      intro:
        'Diese Erklärung beschreibt, was die App aufzeichnet, wo es gespeichert wird, wer darauf zugreifen kann und wie du es löschst.',
      sections: [
        {
          heading: 'Was erhoben wird',
          body: [
            'Dein Trink-Protokoll (was, wann, wie viel, optional wo und eine Notiz); die E-Mail-Adresse deines Kontos; optional dein Name, Geschlecht, Alter, Gewicht, Größe, Ausgaben-Referenzwert und die Gründe für die Nutzung der App; deine Einstellungen.',
          ],
        },
        {
          heading: 'Wo es gespeichert wird',
          body: [
            'Auf diesem Gerät — in einer SQLite-Datenbank auf iOS/Android oder im lokalen Speicher deines Browsers bei der Web-Version. Da ein Konto erforderlich ist, werden dieselben Daten (Protokoll, eigene Getränke und Profil) zusätzlich in Cloud Firestore gespeichert, Teil von Googles Firebase-Plattform, ausschließlich deinem Konto zugeordnet und nie mit anderen Nutzer:innen geteilt — siehe „Cloud-Synchronisierung“ weiter unten. Deine Einstellungen bleiben ausschließlich auf diesem Gerät.',
          ],
        },
        {
          heading: 'Wofür es verwendet wird',
          body: [
            'Um dir deinen eigenen Verlauf, Diagramme und Schätzungen anzuzeigen. Nichts wird für einen Zweck verwendet, der über das hinausgeht, was du in der App siehst.',
          ],
        },
        {
          heading: 'Weitergabe',
          body: ['Dein Trinkprotokoll und dein Profil werden nie mit anderen Nutzer:innen geteilt, verkauft oder für Werbung verwendet. Sie verlassen dieses Gerät auf zwei Wegen: über die Cloud-Synchronisierung, die zur Nutzung der App gehört, und über Exporte, die du selbst startest. Werbung ist eine eigene Sache und wird weiter unten beschrieben.'],
        },
        {
          heading: 'Werbung',
          body: [
            'Die kostenlose Version zeigt ein Banner, und zwar nur auf dem Unterstützungs-Bildschirm. Ausgeliefert wird es von Google AdMob. Erst das Öffnen dieses Bildschirms startet das Werbe-SDK: An keiner anderen Stelle der App läuft es, und für Unterstützer:innen, die kein Banner sehen, läuft es überhaupt nicht.',
            'AdMob erhält, was zur Auswahl und Messung einer Anzeige nötig ist: die Werbe-ID deines Geräts, technische Angaben zum Gerät und einen ungefähren Standort, der aus deiner IP-Adresse abgeleitet wird. Dein Trinkprotokoll, dein Profil und alles andere, was diese App aufzeichnet, erhält AdMob nicht.',
            'Wo eine Einwilligung erforderlich ist — im EWR und im Vereinigten Königreich — wird Googles Einwilligungsformular vor der ersten Anzeigenanfrage angezeigt, und bei Ablehnung wird keine Anzeige angefordert. Du kannst dieses Formular jederzeit in den Einstellungen erneut öffnen und die Werbe-ID in den Android-Einstellungen deines Geräts zurücksetzen oder löschen.',
          ],
        },
        {
          heading: 'Cloud-Synchronisierung',
          body: [
            'Da die App ein Konto voraussetzt, werden dieselben oben beschriebenen Daten — dein Protokoll, deine eigenen Getränke und dein Profil — in unser Firebase-Projekt kopiert (Firebase Authentication für die Anmeldung, Cloud Firestore für die Speicherung), das Google in unserem Auftrag als Auftragsverarbeiter betreibt. Allein durch die Existenz der Synchronisierung werden keine zusätzlichen Daten erhoben.',
            'Du kannst alles jederzeit löschen: Unter Einstellungen → Konto & Cloud-Synchronisierung gibt es die Option „Konto löschen“, die dein Konto samt Cloud-Daten vollständig entfernt. Wo die Daten liegen, hängt davon ab, welche Firebase-Projektregion für diese Bereitstellung konfiguriert ist.',
          ],
        },
        {
          heading: 'Deine Rechte',
          body: [
            'Du kannst jeden Eintrag jederzeit einsehen, bearbeiten oder löschen. Einstellungen → Daten & Datenschutz bietet eine Option „Alle meine Daten löschen", die alles entfernt, einschließlich deines Profils, und dich zurück zum Einrichtungsbildschirm bringt.',
            'Wenn du ein Konto hast, bietet Einstellungen → Konto & Cloud-Synchronisierung die Option „Konto löschen", die dein Konto und alle zugehörigen Cloud-Daten dauerhaft löscht — eine vollständige Löschung, nicht nur eine Abmeldung.',
          ],
        },
        {
          heading: 'Verantwortlicher & Kontakt',
          body: [
            'Name oder Firmenname (Verantwortlicher): LaSolutionDigital',
            'Handelsregisternummer — SIRET: 93866525400018',
            'Adresse: 6 rue du Fort, 08260 Eteignières, Frankreich',
            'Kontakt-E-Mail: romainlambert@lasolutiondigital.com',
            'Telefon: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  it: {
    terms: {
      title: 'Termini di Servizio',
      intro:
        "Queste condizioni disciplinano il tuo utilizzo dell'app. Utilizzandola, le accetti nella versione in vigore al momento dell'uso.",
      sections: [
        {
          heading: 'Finalità',
          body: [
            "L'app ti permette di registrare il tuo consumo di alcol e di consultare grafici, serie e riepiloghi costruiti a partire da questo storico, interamente sul tuo dispositivo.",
          ],
        },
        {
          heading: 'Accettazione dei presenti termini',
          body: ["Utilizzando l'app accetti questi termini così come sono al momento dell'uso."],
        },
        {
          heading: 'Descrizione del servizio',
          body: [
            'App in continuo sviluppo. Le funzionalità possono cambiare o essere rimosse senza preavviso e non è fornita alcuna garanzia di disponibilità, accuratezza o idoneità a un uso particolare.',
          ],
        },
        {
          heading: 'I tuoi obblighi',
          body: ["Sei responsabile dell'accuratezza di ciò che registri e dell'uso che fai di qualsiasi stima mostrata dall'app."],
        },
        {
          heading: 'Non è un consiglio medico',
          body: [
            "Nulla in questa app — inclusa la stima del tasso alcolemico, i valori di risparmio o i contenuti di Aiuto e risorse — costituisce un consiglio medico, una diagnosi o un sostituto dell'assistenza professionale. Vedi l'avviso nella schermata Aiuto.",
          ],
        },
        {
          heading: 'Proprietà intellettuale',
          body: ["LaSolutionDigital conserva i diritti sul design e sul codice dell'app, ad eccezione dei componenti open source utilizzati secondo le proprie licenze."],
        },
        {
          heading: 'Limitazione di responsabilità',
          body: [
            "L'app è fornita «così com'è». Nei limiti consentiti dalla legge, LaSolutionDigital non è responsabile delle decisioni prese sulla base dei valori o delle stime mostrati nell'app.",
          ],
        },
        {
          heading: 'Dati e privacy',
          body: [
            "Per usare l'app è necessario un account. Il tuo storico, il tuo profilo e le tue impostazioni sono archiviati su questo dispositivo; il tuo storico, le tue bevande personalizzate e il tuo profilo vengono inoltre copiati nel nostro progetto Firebase per la sincronizzazione cloud — vedi la sezione «Sincronizzazione cloud» dell'Informativa sulla privacy. Le tue impostazioni non lasciano il dispositivo.",
          ],
        },
        {
          heading: 'Modifiche ai presenti termini',
          body: ["Questi termini possono cambiare con l'evoluzione dell'app. Continuare a utilizzare l'app dopo una modifica implica l'accettazione dei nuovi termini."],
        },
        {
          heading: 'Legge applicabile',
          body: ["Questi termini sono disciplinati dalla legge francese, salvo tu scelga un'altra giurisdizione prima della pubblicazione."],
        },
        {
          heading: 'Contatto',
          body: [
            "Nome o ragione sociale: LaSolutionDigital",
            "Numero di registrazione dell'attività — SIRET: 93866525400018",
            'Indirizzo: 6 rue du Fort, 08260 Eteignières, Francia',
            'E-mail di contatto: romainlambert@lasolutiondigital.com',
            'Telefono: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Note Legali',
      intro: "Note legali e identificazione dell'editore dell'app, ai sensi del diritto francese.",
      sections: [
        {
          heading: 'Editore',
          body: [
            'Nome o ragione sociale: LaSolutionDigital',
            'Forma giuridica: micro-entreprise (regime francese per ditta individuale)',
            "Numero di registrazione dell'attività — SIRET: 93866525400018",
            'Sede legale / indirizzo postale: 6 rue du Fort, 08260 Eteignières, Francia',
            'E-mail di contatto: romainlambert@lasolutiondigital.com',
            'Telefono: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Fornitore di hosting',
          body: [
            "L'app memorizza i tuoi dati sul tuo dispositivo e, poiché per usarla serve un account, anche nel nostro progetto Firebase: Firebase Authentication per l'accesso e Cloud Firestore per l'archiviazione, entrambi servizi Google Cloud che agiscono come responsabili del trattamento per nostro conto. Google Ireland Limited, Gordon House, Barrow Street, Dublino 4, Irlanda.",
          ],
        },
        { heading: 'Direttore della pubblicazione', body: ['Romain Lambert'] },
        {
          heading: 'Proprietà intellettuale',
          body: ["Il contenuto, il design e il codice dell'app sono di proprietà di LaSolutionDigital, salvo diversa indicazione."],
        },
        {
          heading: 'Dati personali',
          body: ["Vedi l'Informativa sulla privacy per sapere cosa viene raccolto e come viene archiviato."],
        },
        {
          heading: 'Cookie e archiviazione locale (solo versione web)',
          body: [
            "La versione web archivia il tuo storico, il tuo profilo e le tue impostazioni nell'archiviazione locale del tuo browser, così l'app funziona senza server. Non vengono utilizzati cookie di tracciamento o pubblicitari.",
          ],
        },
      ],
    },
    deleteAccount: {
      title: 'Eliminare il tuo account',
      intro:
        'Come eliminare il tuo account TYA e i dati collegati. TYA è pubblicata da LaSolutionDigital.',
      sections: [
        {
          heading: "Dall'app",
          body: [
            "Apri TYA, vai in Impostazioni → Account e sincronizzazione cloud e scegli «Elimina il mio account». Ti verrà chiesta una conferma con la password. L'account e tutto ciò che è archiviato nel cloud sotto di esso vengono rimossi subito e in modo definitivo.",
          ],
        },
        {
          heading: 'Via e-mail',
          body: [
            "Se non riesci più ad accedere — o se hai effettuato l'accesso con Google e l'opzione nell'app chiede una password che non hai mai impostato — scrivi a romainlambert@lasolutiondigital.com dall'indirizzo dell'account, chiedendone l'eliminazione. Le richieste vengono gestite entro 30 giorni.",
          ],
        },
        {
          heading: 'Cosa viene eliminato',
          body: [
            "L'account di accesso stesso, il tuo storico dei consumi, le tue bevande personalizzate e il tuo profilo: nome, indirizzo e-mail e i dati di sesso, età, peso, altezza, spesa di riferimento e motivi d'uso che hai scelto di compilare.",
          ],
        },
        {
          heading: 'Cosa resta, e per quanto',
          body: [
            "Dopo l'eliminazione non resta nulla: account e documenti vengono rimossi del tutto, non contrassegnati come inattivi.",
            "Eliminare l'account non tocca la copia ancora presente sul telefono. Per cancellare anche quella, usa Impostazioni → Dati e privacy → «Elimina tutti i miei dati», che svuota dispositivo e cloud insieme.",
          ],
        },
      ],
    },
    privacy: {
      title: 'Informativa sulla Privacy',
      intro:
        "Questa informativa spiega che cosa registra l'app, dove vengono archiviati i dati, chi può accedervi e come cancellarli.",
      sections: [
        {
          heading: 'Cosa viene raccolto',
          body: [
            "Il tuo storico dei consumi (cosa, quando, quanto, eventualmente dove e una nota); l'indirizzo e-mail del tuo account; facoltativamente il tuo nome, sesso, età, peso, altezza, spesa di riferimento e i motivi per cui usi l'app; le tue impostazioni.",
          ],
        },
        {
          heading: 'Dove viene archiviato',
          body: [
            "Su questo dispositivo — in un database SQLite su iOS/Android, oppure nell'archiviazione locale del browser per la versione web. Poiché è necessario un account, questi stessi dati (storico, bevande personalizzate e profilo) vengono archiviati anche in Cloud Firestore, la piattaforma Firebase di Google, riservati al tuo account e mai condivisi con altri utenti — vedi «Sincronizzazione cloud» qui sotto. Le tue impostazioni restano solo su questo dispositivo.",
          ],
        },
        {
          heading: 'A cosa viene usato',
          body: [
            "Per mostrarti il tuo storico, i tuoi grafici e le tue stime. Nulla viene utilizzato per scopi diversi da quelli che vedi nell'app.",
          ],
        },
        {
          heading: 'Condivisione',
          body: ["Il tuo storico e il tuo profilo non vengono mai condivisi con altri utenti, venduti o usati a fini pubblicitari. Lasciano questo dispositivo in due modi: la sincronizzazione cloud, che fa parte del funzionamento dell'app, e le esportazioni che avvii tu. La pubblicità è una questione a parte, descritta qui sotto."],
        },
        {
          heading: 'Pubblicità',
          body: [
            "La versione gratuita mostra un banner, solo nella schermata di sostegno. È servito da Google AdMob. È l'apertura di quella schermata ad avviare l'SDK pubblicitario: non viene eseguito da nessun'altra parte nell'app, e non viene eseguito affatto per chi ha l'abbonamento, che non vede alcun banner.",
            "AdMob riceve ciò che serve a selezionare e misurare un annuncio: l'identificatore pubblicitario del tuo dispositivo, dettagli tecnici sul dispositivo e una posizione approssimativa dedotta dal tuo indirizzo IP. Non riceve il tuo storico dei consumi, il tuo profilo o altro di quanto questa app registra.",
            "Dove il consenso è richiesto — SEE e Regno Unito — il modulo di consenso di Google viene mostrato prima della prima richiesta di annuncio, e se rifiuti non viene richiesto alcun annuncio. Puoi riaprire quel modulo in qualsiasi momento dalle Impostazioni, e puoi reimpostare o eliminare l'identificatore pubblicitario nelle impostazioni Android del tuo dispositivo.",
          ],
        },
        {
          heading: 'Sincronizzazione cloud',
          body: [
            "Poiché l'app richiede un account, gli stessi dati descritti sopra — il tuo storico, le tue bevande personalizzate e il tuo profilo — vengono copiati nel nostro progetto Firebase (Firebase Authentication per l'accesso, Cloud Firestore per l'archiviazione), gestito da Google come responsabile del trattamento per nostro conto. Nessun dato aggiuntivo viene raccolto per il solo fatto che la sincronizzazione esista.",
            "Puoi cancellare tutto in qualsiasi momento: in Impostazioni → Account e sincronizzazione trovi l'opzione «elimina il mio account», che rimuove del tutto l'account e i suoi dati cloud. La residenza dei dati dipende dalla regione del progetto Firebase configurata per questa distribuzione.",
          ],
        },
        {
          heading: 'I tuoi diritti',
          body: [
            "Puoi visualizzare, modificare o eliminare qualsiasi voce in qualsiasi momento. Impostazioni → Dati e privacy include un'opzione «elimina tutti i miei dati» che cancella tutto, incluso il tuo profilo, e ti riporta alla schermata iniziale.",
            "Se hai un account, Impostazioni → Account e sincronizzazione include un'opzione «elimina il mio account» che elimina definitivamente il tuo account e tutti i dati cloud associati — una cancellazione completa, non solo una disconnessione.",
          ],
        },
        {
          heading: 'Titolare del trattamento e contatto',
          body: [
            'Nome o ragione sociale (titolare del trattamento): LaSolutionDigital',
            "Numero di registrazione dell'attività — SIRET: 93866525400018",
            'Indirizzo: 6 rue du Fort, 08260 Eteignières, Francia',
            'E-mail di contatto: romainlambert@lasolutiondigital.com',
            'Telefono: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  pt: {
    terms: {
      title: 'Termos de Utilização',
      intro:
        'Estes termos regem a tua utilização da aplicação. Ao usá-la, aceitas os termos tal como se encontram no momento da utilização.',
      sections: [
        {
          heading: 'Objetivo',
          body: [
            'A aplicação permite-te registar o teu próprio consumo de álcool e consultar gráficos, sequências e resumos criados a partir desse histórico, inteiramente no teu próprio dispositivo.',
          ],
        },
        {
          heading: 'Aceitação destes termos',
          body: ['Ao utilizares a aplicação, aceitas estes termos tal como se encontram no momento da utilização.'],
        },
        {
          heading: 'Descrição do serviço',
          body: [
            'A aplicação está em desenvolvimento contínuo. As funcionalidades podem mudar ou ser removidas sem aviso prévio e não existe qualquer garantia de disponibilidade, exatidão ou adequação a um propósito específico.',
          ],
        },
        {
          heading: 'As tuas obrigações',
          body: ['És responsável pela exatidão do que registas e pela forma como utilizas qualquer estimativa apresentada pela aplicação.'],
        },
        {
          heading: 'Não é aconselhamento médico',
          body: [
            'Nada nesta aplicação — incluindo a estimativa de alcoolemia, os valores de poupança ou o conteúdo de Ajuda e recursos — constitui um conselho médico, um diagnóstico ou um substituto de acompanhamento profissional. Consulta o aviso no ecrã Ajuda.',
          ],
        },
        {
          heading: 'Propriedade intelectual',
          body: ['LaSolutionDigital mantém os direitos sobre o design e o código da aplicação, com exceção dos componentes de código aberto utilizados ao abrigo das respetivas licenças.'],
        },
        {
          heading: 'Limitação de responsabilidade',
          body: [
            'A aplicação é fornecida «tal como está». Na medida permitida por lei, LaSolutionDigital não é responsável por decisões tomadas com base nos valores ou estimativas apresentados na aplicação.',
          ],
        },
        {
          heading: 'Dados e privacidade',
          body: [
            'É necessária uma conta para usar a aplicação. O teu histórico, o teu perfil e as tuas definições são armazenados neste dispositivo; o teu histórico, as tuas bebidas personalizadas e o teu perfil são também copiados para o nosso projeto Firebase para sincronização na nuvem — consulta a secção «Sincronização na nuvem» da Política de Privacidade. As tuas definições não saem do dispositivo.',
          ],
        },
        {
          heading: 'Alterações a estes termos',
          body: ['Estes termos podem mudar à medida que a aplicação evolui. Continuar a utilizar a aplicação após uma alteração significa que aceitas os novos termos.'],
        },
        {
          heading: 'Lei aplicável',
          body: ['Estes termos regem-se pela lei francesa, exceto se escolheres outra jurisdição antes da publicação.'],
        },
        {
          heading: 'Contacto',
          body: [
            'Nome ou firma: LaSolutionDigital',
            'Número de registo comercial — SIRET: 93866525400018',
            'Morada: 6 rue du Fort, 08260 Eteignières, França',
            'E-mail de contacto: romainlambert@lasolutiondigital.com',
            'Telefone: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'Aviso Legal',
      intro: 'Informações legais e identificação do editor desta aplicação, nos termos da legislação francesa.',
      sections: [
        {
          heading: 'Editor',
          body: [
            'Nome ou firma: LaSolutionDigital',
            'Forma jurídica: micro-entreprise (regime francês de empresário em nome individual)',
            'Número de registo comercial — SIRET: 93866525400018',
            'Sede / morada postal: 6 rue du Fort, 08260 Eteignières, França',
            'E-mail de contacto: romainlambert@lasolutiondigital.com',
            'Telefone: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'Fornecedor de alojamento',
          body: [
            'A aplicação guarda os teus dados no teu dispositivo e, uma vez que é necessária uma conta para a usar, também no nosso projeto Firebase: Firebase Authentication para o início de sessão e Cloud Firestore para o armazenamento, ambos serviços da Google Cloud que atuam como subcontratantes por nossa conta. Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlanda.',
          ],
        },
        { heading: 'Diretor de publicação', body: ['Romain Lambert'] },
        {
          heading: 'Propriedade intelectual',
          body: ['O conteúdo, o design e o código da aplicação são propriedade de LaSolutionDigital, salvo indicação em contrário.'],
        },
        {
          heading: 'Dados pessoais',
          body: ['Consulta a Política de Privacidade para saber o que é recolhido e como é armazenado.'],
        },
        {
          heading: 'Cookies e armazenamento local (apenas versão web)',
          body: [
            'A versão web guarda o teu histórico, perfil e definições no armazenamento local do teu navegador, para que a aplicação funcione sem servidor. Não são utilizados cookies de rastreio ou publicitários.',
          ],
        },
      ],
    },
    deleteAccount: {
      title: 'Eliminar a tua conta',
      intro:
        'Como eliminar a tua conta TYA e os dados associados. A TYA é publicada pela LaSolutionDigital.',
      sections: [
        {
          heading: 'A partir da aplicação',
          body: [
            'Abre a TYA, vai a Definições → Conta e sincronização na nuvem e escolhe «Eliminar a minha conta». Ser-te-á pedida uma confirmação com a palavra-passe. A conta e tudo o que está guardado na nuvem sob ela são removidos de imediato e de forma permanente.',
          ],
        },
        {
          heading: 'Por e-mail',
          body: [
            'Se já não conseguires iniciar sessão — ou se entraste com o Google e a opção na aplicação pede uma palavra-passe que nunca definiste — escreve para romainlambert@lasolutiondigital.com a partir do endereço da conta, a pedir a eliminação. Os pedidos são tratados no prazo de 30 dias.',
          ],
        },
        {
          heading: 'O que é eliminado',
          body: [
            'A própria conta de acesso, o teu registo de consumos, as tuas bebidas personalizadas e o teu perfil — ou seja, o teu nome, o teu endereço de e-mail e os dados de sexo, idade, peso, altura, orçamento de referência e motivos de utilização que tenhas preenchido.',
          ],
        },
        {
          heading: 'O que é mantido, e por quanto tempo',
          body: [
            'Nada é mantido depois da eliminação: a conta e os seus documentos são removidos por completo, não marcados como inativos.',
            'Eliminar a conta não afeta a cópia que continua no teu telemóvel. Para apagar também essa, usa Definições → Dados e privacidade → «Eliminar todos os meus dados», que limpa o dispositivo e a nuvem em conjunto.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de Privacidade',
      intro:
        'Esta política explica o que a aplicação regista, onde fica armazenado, quem lhe pode aceder e como apagá-lo.',
      sections: [
        {
          heading: 'O que é recolhido',
          body: [
            'O teu histórico de consumo (o quê, quando, quanto, opcionalmente onde e uma nota); o endereço de e-mail da tua conta; opcionalmente o teu nome, sexo, idade, peso, altura, referência de despesa e as razões para usares a aplicação; as tuas definições.',
          ],
        },
        {
          heading: 'Onde é armazenado',
          body: [
            'Neste dispositivo — numa base de dados SQLite em iOS/Android, ou no armazenamento local do teu navegador na versão web. Uma vez que é necessária uma conta, esses mesmos dados (histórico, bebidas personalizadas e perfil) são também guardados no Cloud Firestore, a plataforma Firebase da Google, reservados à tua conta e nunca partilhados com outros utilizadores — consulta «Sincronização na nuvem» abaixo. As tuas definições ficam apenas neste dispositivo.',
          ],
        },
        {
          heading: 'Para que é utilizado',
          body: [
            'Para te mostrar o teu próprio histórico, gráficos e estimativas. Nada é utilizado para qualquer outro fim além do que vês na aplicação.',
          ],
        },
        {
          heading: 'Partilha',
          body: ['O teu histórico e o teu perfil nunca são partilhados com outros utilizadores, vendidos ou usados para publicidade. Saem deste dispositivo de duas formas: a sincronização na nuvem, que faz parte do funcionamento da aplicação, e as exportações que inicias tu. A publicidade é um assunto à parte e está descrita abaixo.'],
        },
        {
          heading: 'Publicidade',
          body: [
            'A versão gratuita mostra um banner, apenas no ecrã de apoio. É servido pelo Google AdMob. É a abertura desse ecrã que arranca o SDK de publicidade: não corre em mais lado nenhum da aplicação, e não corre de todo para quem tem a subscrição, que não vê qualquer banner.',
            'O AdMob recebe o que precisa para escolher e medir um anúncio: o identificador de publicidade do teu dispositivo, detalhes técnicos sobre o mesmo e uma localização aproximada deduzida do teu endereço IP. Não recebe o teu registo de consumos, o teu perfil, nem mais nada do que esta aplicação guarda.',
            'Onde o consentimento é obrigatório — o EEE e o Reino Unido — o formulário de consentimento da Google é mostrado antes do primeiro pedido de anúncio, e nenhum anúncio é pedido se recusares. Podes reabrir esse formulário a qualquer momento nas Definições, e podes repor ou eliminar o identificador de publicidade nas definições Android do teu dispositivo.',
          ],
        },
        {
          heading: 'Sincronização na nuvem',
          body: [
            'Uma vez que a aplicação exige uma conta, os mesmos dados descritos acima — o teu histórico, as tuas bebidas personalizadas e o teu perfil — são copiados para o nosso projeto Firebase (Firebase Authentication para o início de sessão, Cloud Firestore para o armazenamento), operado pela Google como subcontratante em nosso nome. Não é recolhido nenhum dado adicional apenas por a sincronização existir.',
            'Podes apagar tudo a qualquer momento: em Definições → Conta e sincronização existe a opção «eliminar a minha conta», que remove por completo a conta e os respetivos dados na nuvem. A localização dos dados depende da região do projeto Firebase configurada para esta implementação.',
          ],
        },
        {
          heading: 'Os teus direitos',
          body: [
            'Podes consultar, editar ou eliminar qualquer registo a qualquer momento. Definições → Dados e privacidade tem uma opção «eliminar todos os meus dados» que remove tudo, incluindo o teu perfil, e leva-te de volta ao início.',
            'Se tiveres uma conta, Definições → Conta e sincronização tem uma opção «eliminar a minha conta» que apaga permanentemente a tua conta e todos os dados associados na nuvem — uma eliminação completa, não apenas um términus de sessão.',
          ],
        },
        {
          heading: 'Responsável pelo tratamento e contacto',
          body: [
            'Nome ou firma (responsável pelo tratamento): LaSolutionDigital',
            'Número de registo comercial — SIRET: 93866525400018',
            'Morada: 6 rue du Fort, 08260 Eteignières, França',
            'E-mail de contacto: romainlambert@lasolutiondigital.com',
            'Telefone: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  zh: {
    terms: {
      title: '服务条款',
      intro:
        '本条款约束你对本应用的使用。使用本应用即表示你接受使用时有效的条款。',
      sections: [
        {
          heading: '用途',
          body: [
            '本应用让你记录自己的酒精摄入情况，并查看基于该记录生成的图表、连续记录和汇总——所有内容均完全保存在你自己的设备上。',
          ],
        },
        {
          heading: '条款接受',
          body: ['使用本应用即表示你接受使用时有效的本条款。'],
        },
        {
          heading: '服务说明',
          body: [
            '本应用仍在持续开发中。功能可能会随时变更或移除，恕不另行通知，且不对可用性、准确性或适用于特定用途作任何保证。',
          ],
        },
        {
          heading: '你的义务',
          body: ['你需自行对所记录内容的准确性负责，并自行承担使用应用所显示估算值的后果。'],
        },
        {
          heading: '非医疗建议',
          body: [
            '本应用中的任何内容——包括血液酒精含量估算、节省金额，或"帮助与资源"中的内容——均不构成医疗建议、诊断或专业护理的替代品。详见"帮助"页面上的免责声明。',
          ],
        },
        {
          heading: '知识产权',
          body: ['LaSolutionDigital 保留对本应用设计与代码的权利，依据各自许可证使用的开源组件除外。'],
        },
        {
          heading: '责任限制',
          body: [
            '本应用按"现状"提供。在法律允许的范围内，LaSolutionDigital 不对基于应用中显示的数值或估算所作出的决定承担责任。',
          ],
        },
        {
          heading: '数据与隐私',
          body: ['使用本应用需要账户。你的记录、个人资料和设置存储在本设备上；你的记录、自定义饮品和个人资料还会复制到我们的 Firebase 项目以实现云同步——详见隐私政策中的「云同步」部分。你的设置不会离开本设备。'],
        },
        {
          heading: '条款变更',
          body: ['本条款可能随应用发展而变化。在条款变更后继续使用本应用即表示你接受新条款。'],
        },
        {
          heading: '适用法律',
          body: ['本条款适用法国法律，除非你在发布前另行选择其他司法辖区。'],
        },
        {
          heading: '联系方式',
          body: [
            '姓名或公司名称：LaSolutionDigital',
            '工商注册号——SIRET：93866525400018',
            '地址：6 rue du Fort, 08260 Eteignières, 法国',
            '联系邮箱：romainlambert@lasolutiondigital.com',
            '电话：+33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: '法律声明',
      intro: '本应用的法律声明与发行方信息，依据法国法律提供。',
      sections: [
        {
          heading: '发布者',
          body: [
            '姓名或公司名称：LaSolutionDigital',
            '法律形式：micro-entreprise（法国个体经营者制度）',
            '工商注册号——SIRET：93866525400018',
            '注册地址/通讯地址：6 rue du Fort, 08260 Eteignières, 法国',
            '联系邮箱：romainlambert@lasolutiondigital.com',
            '电话：+33 6 43 50 16 37',
          ],
        },
        {
          heading: '托管服务商',
          body: ['本应用将你的数据保存在你的设备上；由于使用本应用必须登录账户，数据同时保存在我们的 Firebase 项目中——登录使用 Firebase Authentication，存储使用 Cloud Firestore，两者均为 Google Cloud 服务，代表我们作为数据处理者。Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland。'],
        },
        { heading: '出版负责人', body: ['Romain Lambert'] },
        {
          heading: '知识产权',
          body: ['本应用的内容、设计和代码归 LaSolutionDigital 所有，另有授权说明的除外。'],
        },
        {
          heading: '个人数据',
          body: ['有关收集的信息及其存储方式，请参阅隐私政策。'],
        },
        {
          heading: 'Cookie 与本地存储（仅限网页版）',
          body: [
            '网页版会将你的记录、个人资料和设置保存在浏览器的本地存储中，以便应用在没有服务器的情况下运行。不使用任何跟踪或广告类 Cookie。',
          ],
        },
      ],
    },
    deleteAccount: {
      title: '删除你的账户',
      intro:
        '如何删除你的 TYA 账户及与之关联的数据。TYA 由 LaSolutionDigital 发行。',
      sections: [
        {
          heading: '在应用内操作',
          body: [
            '打开 TYA，进入「设置 → 账户与云同步」，选择“删除我的账户”。系统会要求你输入密码确认。账户及其在云端保存的全部内容会被立即永久删除。',
          ],
        },
        {
          heading: '通过电子邮件',
          body: [
            '如果你已无法登录，或你使用 Google 登录而应用内选项要求一个你从未设置过的密码，请用该账户的邮箱地址写信至 romainlambert@lasolutiondigital.com 申请删除。我们会在 30 天内处理。',
          ],
        },
        {
          heading: '哪些内容会被删除',
          body: [
            '登录账户本身、你的饮酒记录、自定义饮品，以及你的个人资料——即姓名、电子邮件地址，以及你自愿填写的性别、年龄、体重、身高、参考支出和使用原因。',
          ],
        },
        {
          heading: '哪些内容会保留，保留多久',
          body: [
            '删除执行后不保留任何内容：账户及其文档会被彻底移除，而不是标记为停用。',
            '删除账户不会影响仍留在手机上的副本。若要一并清除，请使用「设置 → 数据与隐私 → 删除我的所有数据」，它会同时清空本设备和云端。',
          ],
        },
      ],
    },
    privacy: {
      title: '隐私政策',
      intro:
        '本政策说明本应用记录哪些内容、数据存储在何处、谁可以访问，以及如何删除。',
      sections: [
        {
          heading: '收集的信息',
          body: [
            '你的饮酒记录（内容、时间、数量，可选的地点和备注）；你的账户电子邮件地址；可选的姓名、性别、年龄、体重、身高、消费基准以及使用本应用的原因；你的应用设置。',
          ],
        },
        {
          heading: '存储位置',
          body: ['存储在本设备上——在 iOS/Android 上为 SQLite 数据库，网页版则为浏览器本地存储。由于需要账户，相同的数据（记录、自定义饮品和个人资料）也会存储在 Cloud Firestore 中——Google Firebase 平台的一部分，仅归属于你的账户，绝不会与其他用户共享——详见下方「云同步」。你的设置仅保留在本设备上。'],
        },
        {
          heading: '使用目的',
          body: ['用于向你展示你自己的记录、图表和估算值。除你在应用中看到的内容外，不作任何其他用途。'],
        },
        {
          heading: '数据共享',
          body: ['你的饮酒记录和个人资料绝不会与其他用户共享、出售或用于广告。它们以两种方式离开本设备：云同步（属于应用的正常运行），以及你自己发起的导出。广告是另一回事，说明见下文。'],
        },
        {
          heading: '广告',
          body: [
            '免费版只在支持页面显示一条横幅广告，由 Google AdMob 提供。打开该页面才会启动广告 SDK：应用的其他任何位置都不会运行它；对订阅用户则完全不会运行，他们看不到任何横幅。',
            'AdMob 会获取投放和衡量广告所需的信息：你设备的广告标识符、设备的技术信息，以及根据 IP 地址推断的大致位置。它不会获取你的饮酒记录、个人资料，或本应用记录的任何其他内容。',
            '在需要征得同意的地区——欧洲经济区和英国——Google 的同意表单会在首次请求广告之前显示；如果你拒绝，则不会请求任何广告。你可以随时在设置中重新打开该表单，也可以在设备的 Android 设置中重置或删除广告标识符。',
          ],
        },
        {
          heading: '云同步',
          body: [
            '由于本应用需要账户，上述相同数据——你的记录、自定义饮品和个人资料——会被复制到我们的 Firebase 项目中（使用 Firebase Authentication 进行登录，使用 Cloud Firestore 进行存储），该项目由 Google 作为我们的数据处理者运营。仅仅因为同步功能存在，并不会额外收集任何数据。',
            '你可以随时删除全部数据：在设置 → 账户与云同步中有「删除我的账户」选项，可彻底删除账户及其云端数据。数据存储的地理位置取决于此部署所配置的 Firebase 项目区域。',
          ],
        },
        {
          heading: '你的权利',
          body: [
            '你可以随时查看、编辑或删除任何记录。设置 → 数据与隐私 中有"删除我的所有数据"选项，可清除包括个人资料在内的所有内容，并让你回到初始设置流程。',
            '如果你拥有账户，设置 → 账户与云同步中的"删除我的账户"选项会永久删除你的账户及其在云端的所有相关数据——这是彻底删除，而不仅仅是退出登录。',
          ],
        },
        {
          heading: '数据控制者与联系方式',
          body: [
            '姓名或公司名称（数据控制者）：LaSolutionDigital',
            '工商注册号——SIRET：93866525400018',
            '地址：6 rue du Fort, 08260 Eteignières, 法国',
            '联系邮箱：romainlambert@lasolutiondigital.com',
            '电话：+33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
  ar: {
    terms: {
      title: 'شروط الخدمة',
      intro:
        'تحكم هذه الشروط استخدامك للتطبيق. وباستخدامك له، فإنك تقبل هذه الشروط بصيغتها السارية وقت الاستخدام.',
      sections: [
        {
          heading: 'الغرض',
          body: [
            'يتيح لك التطبيق تسجيل استهلاكك الخاص للكحول ومشاهدة الرسوم البيانية والسلاسل والملخصات المبنية على هذا السجل، بالكامل على جهازك الخاص.',
          ],
        },
        {
          heading: 'قبول هذه الشروط',
          body: ['باستخدامك للتطبيق، فإنك تقبل هذه الشروط كما هي في وقت الاستخدام.'],
        },
        {
          heading: 'وصف الخدمة',
          body: [
            'التطبيق قيد التطوير المستمر. قد تتغير الميزات أو تُزال دون إشعار مسبق، ولا يوجد أي ضمان للتوافر أو الدقة أو الملاءمة لغرض معين.',
          ],
        },
        {
          heading: 'التزاماتك',
          body: ['أنت مسؤول عن دقة ما تسجله وعن كيفية استخدامك لأي تقدير يعرضه التطبيق.'],
        },
        {
          heading: 'ليست نصيحة طبية',
          body: [
            'لا شيء في هذا التطبيق — بما في ذلك تقدير نسبة الكحول في الدم، أو أرقام التوفير، أو محتوى المساعدة والموارد — يُعد نصيحة طبية أو تشخيصًا أو بديلاً عن الرعاية المتخصصة. راجع إخلاء المسؤولية في شاشة المساعدة.',
          ],
        },
        {
          heading: 'الملكية الفكرية',
          body: ['يحتفظ LaSolutionDigital بحقوق تصميم التطبيق وشيفرته البرمجية، باستثناء مكونات المصادر المفتوحة المستخدمة بموجب تراخيصها الخاصة.'],
        },
        {
          heading: 'تحديد المسؤولية',
          body: [
            'يُقدَّم التطبيق «كما هو». وفي الحدود التي يسمح بها القانون، لا يتحمل LaSolutionDigital المسؤولية عن القرارات المتخذة استنادًا إلى الأرقام أو التقديرات المعروضة في التطبيق.',
          ],
        },
        {
          heading: 'البيانات والخصوصية',
          body: ['يتطلّب استخدام التطبيق إنشاء حساب. تُخزَّن سجلك وملفك الشخصي وإعداداتك على هذا الجهاز؛ كما تُنسخ سجلك ومشروباتك المخصصة وملفك الشخصي إلى مشروع Firebase الخاص بنا للمزامنة السحابية — راجع قسم «المزامنة السحابية» في سياسة الخصوصية. أما إعداداتك فلا تغادر الجهاز.'],
        },
        {
          heading: 'تعديلات على هذه الشروط',
          body: ['قد تتغير هذه الشروط مع تطور التطبيق. الاستمرار في استخدام التطبيق بعد أي تعديل يعني قبولك للشروط الجديدة.'],
        },
        {
          heading: 'القانون المعمول به',
          body: ['تخضع هذه الشروط للقانون الفرنسي، ما لم تحدد ولاية قضائية أخرى قبل النشر.'],
        },
        {
          heading: 'التواصل',
          body: [
            'الاسم أو اسم الشركة: LaSolutionDigital',
            'رقم السجل التجاري — SIRET: 93866525400018',
            'العنوان: 6 rue du Fort, 08260 Eteignières, فرنسا',
            'البريد الإلكتروني للتواصل: romainlambert@lasolutiondigital.com',
            'الهاتف: +33 6 43 50 16 37',
          ],
        },
      ],
    },
    notice: {
      title: 'الإشعار القانوني',
      intro: 'البيانات القانونية وتعريف ناشر التطبيق، وفقًا للقانون الفرنسي.',
      sections: [
        {
          heading: 'الناشر',
          body: [
            'الاسم أو اسم الشركة: LaSolutionDigital',
            'الشكل القانوني: micro-entreprise (نظام فرنسي للمشروع الفردي الصغير)',
            'رقم السجل التجاري — SIRET: 93866525400018',
            'العنوان المسجَّل / العنوان البريدي: 6 rue du Fort, 08260 Eteignières, فرنسا',
            'البريد الإلكتروني للتواصل: romainlambert@lasolutiondigital.com',
            'الهاتف: +33 6 43 50 16 37',
          ],
        },
        {
          heading: 'مزوّد الاستضافة',
          body: ['يخزّن التطبيق بياناتك على جهازك، ولأن استخدامه يتطلب حسابًا فهو يخزّنها أيضًا في مشروع Firebase الخاص بنا — Firebase Authentication لتسجيل الدخول وCloud Firestore للتخزين، وكلاهما خدمتان من Google Cloud تعملان بصفتهما معالِجَي بيانات نيابةً عنا. Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland.'],
        },
        { heading: 'مدير النشر', body: ['Romain Lambert'] },
        {
          heading: 'الملكية الفكرية',
          body: ['محتوى التطبيق وتصميمه وشيفرته البرمجية ملك لـ LaSolutionDigital، ما لم يُذكر خلاف ذلك.'],
        },
        {
          heading: 'البيانات الشخصية',
          body: ['راجع سياسة الخصوصية لمعرفة ما يتم جمعه وكيفية تخزينه.'],
        },
        {
          heading: 'ملفات تعريف الارتباط والتخزين المحلي (نسخة الويب فقط)',
          body: [
            'تُخزِّن نسخة الويب سجلك وملفك الشخصي وإعداداتك في التخزين المحلي لمتصفحك حتى يعمل التطبيق دون خادم. لا يُستخدم أي ملف تعريف ارتباط للتتبع أو الإعلانات.',
          ],
        },
      ],
    },
    deleteAccount: {
      title: 'حذف حسابك',
      intro:
        'كيفية حذف حساب TYA والبيانات المرتبطة به. تصدر TYA عن LaSolutionDigital.',
      sections: [
        {
          heading: 'من داخل التطبيق',
          body: [
            'افتح TYA، وانتقل إلى الإعدادات ← الحساب والمزامنة السحابية، ثم اختر «حذف حسابي». سيُطلب منك التأكيد بكلمة المرور. يُحذف الحساب وكل ما هو مخزَّن في السحابة تحته فورًا وبصفة نهائية.',
          ],
        },
        {
          heading: 'عبر البريد الإلكتروني',
          body: [
            'إذا لم تعد تستطيع تسجيل الدخول — أو كنت قد سجّلت الدخول عبر Google ويطلب منك الخيار داخل التطبيق كلمة مرور لم تنشئها قط — فراسل romainlambert@lasolutiondigital.com من عنوان البريد الخاص بالحساب طالبًا حذفه. تُعالَج الطلبات خلال 30 يومًا.',
          ],
        },
        {
          heading: 'ما الذي يُحذف',
          body: [
            'حساب تسجيل الدخول نفسه، وسجل مشروباتك، ومشروباتك المخصّصة، وملفك الشخصي — أي اسمك وعنوان بريدك الإلكتروني، وما اخترت ملأه من الجنس والعمر والوزن والطول والإنفاق المرجعي وأسباب استخدام التطبيق.',
          ],
        },
        {
          heading: 'ما الذي يبقى، ولأي مدة',
          body: [
            'لا يبقى شيء بعد تنفيذ الحذف: يُزال الحساب ومستنداته إزالةً كاملة، ولا يُكتفى بوسمه غير نشط.',
            'لا يمسّ حذف الحساب النسخة التي ما زالت على هاتفك. ولمحوها أيضًا، استخدم الإعدادات ← البيانات والخصوصية ← «حذف كل بياناتي»، وهو يُفرغ الجهاز والسحابة معًا.',
          ],
        },
      ],
    },
    privacy: {
      title: 'سياسة الخصوصية',
      intro:
        'توضّح هذه السياسة ما يسجّله التطبيق، وأين تُخزَّن البيانات، ومن يمكنه الوصول إليها، وكيفية حذفها.',
      sections: [
        {
          heading: 'ما يتم جمعه',
          body: [
            'سجل استهلاكك (ماذا، متى، كم، واختياريًا أين مع ملاحظة)؛ عنوان البريد الإلكتروني لحسابك؛ واختياريًا اسمك، جنسك، عمرك، وزنك، طولك، مرجع الإنفاق وأسباب استخدامك للتطبيق؛ إعداداتك.',
          ],
        },
        {
          heading: 'أين يُخزَّن',
          body: ['على هذا الجهاز — في قاعدة بيانات SQLite على iOS/Android، أو في التخزين المحلي لمتصفحك في نسخة الويب. وبما أنّ الحساب مطلوب، تُخزَّن هذه البيانات نفسها (السجل، المشروبات المخصصة، والملف الشخصي) أيضًا في Cloud Firestore، وهي جزء من منصة Firebase التابعة لـ Google، مقتصرة على حسابك ولا تُشارَك أبدًا مع مستخدمين آخرين — راجع «المزامنة السحابية» أدناه. أما إعداداتك فتبقى على هذا الجهاز فقط.'],
        },
        {
          heading: 'الغرض من استخدامه',
          body: ['لعرض سجلك ورسومك البيانية وتقديراتك الخاصة. لا يُستخدم أي شيء لأي غرض يتجاوز ما تراه في التطبيق.'],
        },
        {
          heading: 'المشاركة',
          body: ['لا يُشارَك سجل مشروباتك ولا ملفك الشخصي أبدًا مع مستخدمين آخرين، ولا يُباعان، ولا يُستخدَمان لأغراض إعلانية. وهما يغادران هذا الجهاز بطريقتين: المزامنة السحابية، وهي جزء من عمل التطبيق، وأي تصدير تبدأه بنفسك. أما الإعلانات فهي مسألة منفصلة موضّحة أدناه.'],
        },
        {
          heading: 'الإعلانات',
          body: [
            'تعرض النسخة المجانية شريطًا إعلانيًا واحدًا، في شاشة الدعم فقط، تقدّمه خدمة Google AdMob. فتح تلك الشاشة هو ما يشغّل حزمة الإعلانات: فهي لا تعمل في أي مكان آخر من التطبيق، ولا تعمل إطلاقًا للمشتركين الذين لا يرون أي شريط إعلاني.',
            'يتلقّى AdMob ما يلزمه لاختيار الإعلان وقياسه: المُعرِّف الإعلاني لجهازك، وتفاصيل تقنية عن الجهاز، وموقعًا تقريبيًا مستنتَجًا من عنوان IP الخاص بك. ولا يتلقّى سجل مشروباتك ولا ملفك الشخصي ولا أي شيء آخر يسجّله هذا التطبيق.',
            'وحيث تكون الموافقة مطلوبة — المنطقة الاقتصادية الأوروبية والمملكة المتحدة — يُعرض نموذج الموافقة من Google قبل أول طلب إعلان، ولا يُطلب أي إعلان إذا رفضت. ويمكنك إعادة فتح ذلك النموذج في أي وقت من الإعدادات، كما يمكنك إعادة تعيين المُعرِّف الإعلاني أو حذفه من إعدادات أندرويد في جهازك.',
          ],
        },
        {
          heading: 'المزامنة السحابية',
          body: [
            'بما أنّ التطبيق يتطلّب حسابًا، تُنسخ نفس البيانات الموضحة أعلاه — سجلك، ومشروباتك المخصصة، وملفك الشخصي — إلى مشروع Firebase الخاص بنا (Firebase Authentication لتسجيل الدخول، وCloud Firestore للتخزين)، الذي تُشغّله Google بصفتها معالِج بيانات نيابة عنا. لا يُجمَع أي بيانات إضافية لمجرد وجود ميزة المزامنة.',
            'يمكنك حذف كل ذلك في أي وقت: في الإعدادات ← الحساب والمزامنة السحابية يوجد خيار «حذف حسابي» الذي يزيل حسابك وبياناتك السحابية نهائيًا. يعتمد موقع تخزين البيانات على منطقة مشروع Firebase المُهيَّأة لهذا النشر.',
          ],
        },
        {
          heading: 'حقوقك',
          body: [
            'يمكنك عرض أو تعديل أو حذف أي إدخال في أي وقت. تتضمن الإعدادات ← البيانات والخصوصية خيار «حذف جميع بياناتي» الذي يمسح كل شيء، بما في ذلك ملفك الشخصي، ويعيدك إلى شاشة الإعداد الأولي.',
            'إذا كان لديك حساب، يتضمن الإعدادات ← الحساب والمزامنة السحابية خيار «حذف حسابي» الذي يحذف حسابك نهائيًا وجميع البيانات السحابية المرتبطة به — حذف كامل، وليس مجرد تسجيل خروج.',
          ],
        },
        {
          heading: 'المتحكم بالبيانات والتواصل',
          body: [
            'الاسم أو اسم الشركة (المتحكم بالبيانات): LaSolutionDigital',
            'رقم السجل التجاري — SIRET: 93866525400018',
            'العنوان: 6 rue du Fort, 08260 Eteignières, فرنسا',
            'البريد الإلكتروني للتواصل: romainlambert@lasolutiondigital.com',
            'الهاتف: +33 6 43 50 16 37',
          ],
        },
      ],
    },
  },
};

export function legalDoc(locale: string, doc: LegalDocId): LegalDoc {
  return LEGAL_CONTENT[resolveLocale(locale)][doc];
}
