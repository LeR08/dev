/**
 * Legal document content (spec v1.2 §10).
 *
 * Editable templates, not legal advice — the spec is explicit that a legal
 * professional should review them before the app leaves test mode or reaches
 * a public store listing. The identity/contact fields (publisher, SIRET,
 * address, director of publication) are filled in with the site owner's own
 * details; update them directly here if that information ever changes.
 *
 * Written out in all 8 UI languages so these documents follow whichever
 * language the reader has chosen, same as the rest of the app.
 */

export type LegalDocId = 'terms' | 'notice' | 'privacy';
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
      intro: 'Placeholder legal notice. Fill in the bracketed fields with your own details before this app leaves test mode.',
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
            'Not applicable yet — the app has no server and stores everything locally on your device. Add a hosting provider here if that changes.',
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
      intro: 'Mentions légales type. Complétez les champs entre crochets avec vos propres informations avant que l\'application ne sorte du mode test.',
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
            "Non applicable pour l'instant — l'application n'a pas de serveur et stocke tout localement sur votre appareil. Ajoutez un hébergeur ici si cela change.",
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
        'Esta aplicación es actualmente una versión de prueba personal (spec v1.2, «MODO PRUEBA»): no se distribuye públicamente, no está vinculada a ninguna cuenta ni servidor. Estas condiciones describen su funcionamiento actual y están destinadas a ser sustituidas por condiciones revisadas y adaptadas a tu jurisdicción antes de cualquier publicación.',
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
            'Se trata de una versión de prueba / beta. Las funciones pueden cambiar o eliminarse sin previo aviso. No se garantiza disponibilidad, exactitud ni idoneidad para un fin particular.',
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
            'Todos los datos —tu historial, tu perfil, tus ajustes— se almacenan únicamente en tu dispositivo. Consulta la Política de Privacidad para más detalles.',
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
      intro: 'Aviso legal de ejemplo. Completa los campos entre corchetes con tus propios datos antes de que esta aplicación salga del modo de prueba.',
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
            'No aplicable por ahora — la aplicación no tiene servidor y almacena todo localmente en tu dispositivo. Añade aquí un proveedor de alojamiento si eso cambia.',
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
    privacy: {
      title: 'Política de Privacidad',
      intro:
        'No solicitada explícitamente en la spec original, pero añadida aquí porque el perfil introducido en la v1.2 recopila información personal sensible (§4) — merece una declaración clara propia, junto con las Condiciones y el Aviso Legal.',
      sections: [
        {
          heading: 'Qué se recopila',
          body: [
            'Tu historial de consumo (qué, cuándo, cuánto, opcionalmente dónde y una nota); opcionalmente, tu sexo, edad, peso, altura, gasto de referencia y los motivos por los que usas la aplicación; tus ajustes.',
          ],
        },
        {
          heading: 'Dónde se almacena',
          body: [
            'Solo en este dispositivo — en una base de datos SQLite en iOS/Android, o en el almacenamiento local de tu navegador en la versión web. No hay servidor ni cuenta.',
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
          body: ['Nada se envía automáticamente a ningún sitio. Los datos solo salen del dispositivo si tú los exportas explícitamente.'],
        },
        {
          heading: 'Tus derechos',
          body: [
            'Puedes consultar, editar o eliminar cualquier registro en cualquier momento. Ajustes → Datos y privacidad incluye una opción «eliminar todos mis datos» que borra todo, incluido tu perfil, y te devuelve a la pantalla de inicio.',
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
        'Diese App ist derzeit eine persönliche Testversion (Spezifikation v1.2, „TESTMODUS“): nicht öffentlich verbreitet, nicht mit einem Konto oder Server verbunden. Diese Bedingungen beschreiben die aktuelle Funktionsweise und sollen vor jeder öffentlichen Veröffentlichung durch geprüfte, an deine Rechtsordnung angepasste Bedingungen ersetzt werden.',
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
            'Dies ist eine Test-/Beta-Version. Funktionen können sich ohne Vorankündigung ändern oder entfernt werden. Es besteht keine Gewähr für Verfügbarkeit, Richtigkeit oder Eignung für einen bestimmten Zweck.',
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
            'Alle Daten — dein Protokoll, dein Profil, deine Einstellungen — werden ausschließlich lokal auf deinem Gerät gespeichert. Details siehe Datenschutzerklärung.',
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
      intro: 'Muster-Impressum. Fülle die eckigen Klammern mit deinen eigenen Angaben aus, bevor diese App den Testmodus verlässt.',
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
            'Derzeit nicht zutreffend — die App hat keinen Server und speichert alles lokal auf deinem Gerät. Trage hier einen Hosting-Anbieter ein, falls sich das ändert.',
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
    privacy: {
      title: 'Datenschutzerklärung',
      intro:
        'In der ursprünglichen Spezifikation nicht ausdrücklich gefordert, aber hier hinzugefügt, weil das in v1.2 eingeführte Profil sensible personenbezogene Daten erfasst (§4) — das verdient eine eigene klare Erklärung neben den AGB und dem Impressum.',
      sections: [
        {
          heading: 'Was erhoben wird',
          body: [
            'Dein Trink-Protokoll (was, wann, wie viel, optional wo und eine Notiz); optional dein Geschlecht, Alter, Gewicht, Größe, Ausgaben-Referenzwert und die Gründe für die Nutzung der App; deine Einstellungen.',
          ],
        },
        {
          heading: 'Wo es gespeichert wird',
          body: [
            'Nur auf diesem Gerät — in einer SQLite-Datenbank auf iOS/Android oder im lokalen Speicher deines Browsers bei der Web-Version. Es gibt weder Server noch Konto.',
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
          body: ['Nichts wird automatisch irgendwohin gesendet. Daten verlassen das Gerät nur, wenn du sie ausdrücklich exportierst.'],
        },
        {
          heading: 'Deine Rechte',
          body: [
            'Du kannst jeden Eintrag jederzeit einsehen, bearbeiten oder löschen. Einstellungen → Daten & Datenschutz bietet eine Option „Alle meine Daten löschen", die alles entfernt, einschließlich deines Profils, und dich zurück zum Einrichtungsbildschirm bringt.',
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
        'Questa app è attualmente una versione di test personale (spec v1.2, «MODALITÀ TEST»): non distribuita pubblicamente, non collegata ad alcun account o server. Questi termini descrivono il suo funzionamento attuale e sono destinati a essere sostituiti da termini revisionati e adattati alla propria giurisdizione prima di qualsiasi pubblicazione.',
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
            "Si tratta di una versione di test / beta. Le funzionalità possono cambiare o essere rimosse senza preavviso. Non è fornita alcuna garanzia di disponibilità, accuratezza o idoneità a un uso particolare.",
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
            "Tutti i dati — il tuo storico, il tuo profilo, le tue impostazioni — sono archiviati esclusivamente sul tuo dispositivo. Vedi l'Informativa sulla privacy per i dettagli.",
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
      intro: 'Note legali di esempio. Compila i campi tra parentesi con i tuoi dati prima che questa app esca dalla modalità test.',
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
            "Non applicabile per ora — l'app non ha un server e memorizza tutto localmente sul tuo dispositivo. Aggiungi qui un fornitore di hosting se ciò dovesse cambiare.",
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
    privacy: {
      title: 'Informativa sulla Privacy',
      intro:
        "Non esplicitamente richiesta dalla spec originale, ma aggiunta qui perché il profilo introdotto nella v1.2 raccoglie informazioni personali sensibili (§4) — merita una dichiarazione chiara a parte, accanto ai Termini e alle Note legali.",
      sections: [
        {
          heading: 'Cosa viene raccolto',
          body: [
            'Il tuo storico dei consumi (cosa, quando, quanto, eventualmente dove e una nota); facoltativamente il tuo sesso, età, peso, altezza, spesa di riferimento e i motivi per cui usi l\'app; le tue impostazioni.',
          ],
        },
        {
          heading: 'Dove viene archiviato',
          body: [
            "Solo su questo dispositivo — in un database SQLite su iOS/Android, oppure nell'archiviazione locale del browser per la versione web. Non c'è alcun server né account.",
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
          body: ['Nulla viene inviato automaticamente da nessuna parte. I dati lasciano il dispositivo solo se li esporti esplicitamente.'],
        },
        {
          heading: 'I tuoi diritti',
          body: [
            "Puoi visualizzare, modificare o eliminare qualsiasi voce in qualsiasi momento. Impostazioni → Dati e privacy include un'opzione «elimina tutti i miei dati» che cancella tutto, incluso il tuo profilo, e ti riporta alla schermata iniziale.",
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
        'Esta aplicação é atualmente uma versão de teste pessoal (spec v1.2, «MODO DE TESTE»): não distribuída publicamente, não associada a nenhuma conta ou servidor. Estes termos descrevem o funcionamento atual e destinam-se a ser substituídos por termos revistos e adaptados à tua jurisdição antes de qualquer publicação.',
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
            'Trata-se de uma versão de teste / beta. As funcionalidades podem mudar ou ser removidas sem aviso prévio. Não existe qualquer garantia de disponibilidade, exatidão ou adequação a um propósito específico.',
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
            'Todos os dados — o teu histórico, o teu perfil, as tuas definições — são armazenados apenas no teu dispositivo. Consulta a Política de Privacidade para mais detalhes.',
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
      intro: 'Aviso legal de exemplo. Preenche os campos entre parênteses retos com os teus próprios dados antes de esta aplicação sair do modo de teste.',
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
            'Não aplicável por agora — a aplicação não tem servidor e guarda tudo localmente no teu dispositivo. Adiciona aqui um fornecedor de alojamento se isso mudar.',
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
    privacy: {
      title: 'Política de Privacidade',
      intro:
        'Não solicitada explicitamente pela spec original, mas adicionada aqui porque o perfil introduzido na v1.2 recolhe informação pessoal sensível (§4) — merece uma declaração clara própria, a par dos Termos e do Aviso Legal.',
      sections: [
        {
          heading: 'O que é recolhido',
          body: [
            'O teu histórico de consumo (o quê, quando, quanto, opcionalmente onde e uma nota); opcionalmente, o teu sexo, idade, peso, altura, referência de despesa e as razões para usares a aplicação; as tuas definições.',
          ],
        },
        {
          heading: 'Onde é armazenado',
          body: [
            'Apenas neste dispositivo — numa base de dados SQLite em iOS/Android, ou no armazenamento local do teu navegador na versão web. Não existe servidor nem conta.',
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
          body: ['Nada é enviado automaticamente para lado nenhum. Os dados só saem do dispositivo se os exportares explicitamente.'],
        },
        {
          heading: 'Os teus direitos',
          body: [
            'Podes consultar, editar ou eliminar qualquer registo a qualquer momento. Definições → Dados e privacidade tem uma opção «eliminar todos os meus dados» que remove tudo, incluindo o teu perfil, e leva-te de volta ao início.',
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
        '本应用目前是个人测试版本（规范 v1.2，"测试模式"）：不对外公开发布，不与任何账户或服务器关联。本条款描述了应用目前的运行方式，在正式公开发布前将替换为经过审核、适用于具体司法辖区的条款。',
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
            '这是一个测试版/测试内测版本。功能可能会随时变更或移除，恕不另行通知。本应用不对可用性、准确性或适用于特定用途作任何保证。',
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
          body: ['所有数据——你的记录、个人资料、设置——仅存储在你的设备上。详情请参阅隐私政策。'],
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
      intro: '法律声明示例。请在本应用退出测试模式之前，用你自己的信息填写方括号中的内容。',
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
          body: ['目前不适用——本应用没有服务器，所有内容都存储在你的设备本地。如有变化，请在此处添加托管服务商信息。'],
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
    privacy: {
      title: '隐私政策',
      intro:
        '原始规范中并未明确要求，但由于 v1.2 中新增的个人资料收集了敏感个人信息（§4），因此这里单独添加了一份清晰的声明，与服务条款和法律声明并列。',
      sections: [
        {
          heading: '收集的信息',
          body: [
            '你的饮酒记录（内容、时间、数量，可选的地点和备注）；可选的性别、年龄、体重、身高、消费基准以及使用本应用的原因；你的应用设置。',
          ],
        },
        {
          heading: '存储位置',
          body: ['仅存储在本设备上——在 iOS/Android 上为 SQLite 数据库，网页版则为浏览器本地存储。没有服务器，也没有账户。'],
        },
        {
          heading: '使用目的',
          body: ['用于向你展示你自己的记录、图表和估算值。除你在应用中看到的内容外，不作任何其他用途。'],
        },
        {
          heading: '数据共享',
          body: ['不会自动向任何地方发送任何数据。只有在你主动导出数据时，数据才会离开设备。'],
        },
        {
          heading: '你的权利',
          body: [
            '你可以随时查看、编辑或删除任何记录。设置 → 数据与隐私 中有"删除我的所有数据"选项，可清除包括个人资料在内的所有内容，并让你回到初始设置流程。',
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
        'هذا التطبيق هو حاليًا نسخة اختبار شخصية (المواصفة v1.2، «وضع الاختبار»): غير موزّع للعامة، وغير مرتبط بأي حساب أو خادم. تصف هذه الشروط طريقة عمله حاليًا، والمقصود استبدالها بشروط مُراجَعة تتوافق مع الولاية القضائية الخاصة بك قبل أي إصدار عام.',
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
            'هذه نسخة اختبار / تجريبية. قد تتغير الميزات أو تُزال دون إشعار مسبق. لا يوجد أي ضمان للتوافر أو الدقة أو الملاءمة لغرض معين.',
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
          body: ['جميع البيانات — سجلك، ملفك الشخصي، إعداداتك — تُخزَّن فقط على جهازك. راجع سياسة الخصوصية لمزيد من التفاصيل.'],
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
      intro: 'إشعار قانوني نموذجي. أكمل الحقول الموجودة بين قوسين ببياناتك الخاصة قبل أن يخرج هذا التطبيق من وضع الاختبار.',
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
          body: ['غير مطبَّق حاليًا — لا يملك التطبيق خادمًا ويخزّن كل شيء محليًا على جهازك. أضف مزوّد استضافة هنا إذا تغيّر ذلك.'],
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
    privacy: {
      title: 'سياسة الخصوصية',
      intro:
        'لم تُطلب صراحةً في المواصفة الأصلية، لكنها أُضيفت هنا لأن الملف الشخصي المُدخل في الإصدار v1.2 يجمع معلومات شخصية حساسة (§4) — وهذا يستحق بيانًا واضحًا منفصلاً إلى جانب شروط الخدمة والإشعار القانوني.',
      sections: [
        {
          heading: 'ما يتم جمعه',
          body: [
            'سجل استهلاكك (ماذا، متى، كم، واختياريًا أين مع ملاحظة)؛ واختياريًا جنسك، عمرك، وزنك، طولك، مرجع الإنفاق وأسباب استخدامك للتطبيق؛ إعداداتك.',
          ],
        },
        {
          heading: 'أين يُخزَّن',
          body: ['فقط على هذا الجهاز — في قاعدة بيانات SQLite على iOS/Android، أو في التخزين المحلي لمتصفحك في نسخة الويب. لا يوجد خادم ولا حساب.'],
        },
        {
          heading: 'الغرض من استخدامه',
          body: ['لعرض سجلك ورسومك البيانية وتقديراتك الخاصة. لا يُستخدم أي شيء لأي غرض يتجاوز ما تراه في التطبيق.'],
        },
        {
          heading: 'المشاركة',
          body: ['لا يُرسَل أي شيء تلقائيًا إلى أي جهة. لا تغادر البيانات الجهاز إلا عند تصديرها صراحةً من قِبلك.'],
        },
        {
          heading: 'حقوقك',
          body: [
            'يمكنك عرض أو تعديل أو حذف أي إدخال في أي وقت. تتضمن الإعدادات ← البيانات والخصوصية خيار «حذف جميع بياناتي» الذي يمسح كل شيء، بما في ذلك ملفك الشخصي، ويعيدك إلى شاشة الإعداد الأولي.',
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
