/**
 * Harm-reduction explainer content (spec v1.2 §8.4).
 *
 * Non-clinical, general-education material — not a substitute for a
 * professional — presented as a few approaches among several, not as advice
 * tailored to any individual. Flagged in the spec as needing review by a
 * qualified addictologist or physician before any public release; this is
 * still a test-mode build, so that review is tracked as an open item rather
 * than something this pass can complete on its own.
 */

export type Approach = { title: string; body: string };
export type SeekHelp = { intro: string; signals: string[] };
export type NonMedicalSection = { title: string; intro: string; items: Approach[]; caution: string };

type Locale = 'en' | 'fr';

export const APPROACHES: Record<Locale, Approach[]> = {
  en: [
    {
      title: 'Pacing',
      body: 'Alternating alcoholic drinks with alcohol-free ones — water, soda, a 0.0% beer — spreads the same evening over a longer time and slows how quickly intake adds up.',
    },
    {
      title: 'Diluting',
      body: 'Lower-strength mixes — a spritz, a shandy, a "panaché maison" — keep the ritual of a drink while lowering the alcohol in each one. The custom drinks feature exists partly for this: save your own diluted recipe as a preset.',
    },
    {
      title: 'Deciding before you start',
      body: 'Picking a number for the evening before the first drink tends to hold up better than deciding in the moment. A personal weekly goal (Settings → Personal goals) is one way to keep that number visible without it being anyone else\'s business.',
    },
    {
      title: 'Noticing context',
      body: 'The note and location fields on each entry are there for this — patterns often show up more in when and where than in how much.',
    },
  ],
  fr: [
    {
      title: 'Alterner',
      body: 'Alterner les verres d\'alcool avec des boissons sans alcool — eau, soda, bière 0.0% — étale la même soirée sur plus de temps et ralentit la vitesse à laquelle la consommation s\'accumule.',
    },
    {
      title: 'Diluer',
      body: 'Des mélanges moins forts — un spritz, un panaché, un « panaché maison » — gardent le rituel du verre tout en réduisant l\'alcool qu\'il contient. La fonction de boissons personnalisées existe en partie pour ça : enregistrez votre propre recette diluée comme préréglage.',
    },
    {
      title: 'Décider avant de commencer',
      body: 'Choisir un nombre pour la soirée avant le premier verre tient généralement mieux la route qu\'une décision prise sur le moment. Un objectif hebdomadaire personnel (Réglages → Objectifs personnels) est une façon de garder ce nombre visible sans qu\'il regarde qui que ce soit d\'autre.',
    },
    {
      title: 'Repérer le contexte',
      body: 'Les champs note et lieu de chaque entrée servent à ça — les tendances se voient souvent plus dans le quand et le où que dans le combien.',
    },
  ],
};

export const SEEK_HELP: Record<Locale, SeekHelp> = {
  en: {
    intro:
      'None of this is a diagnosis — just signals some people find worth a conversation with a professional.',
    signals: [
      'Physical discomfort — shaking, sweating, nausea — when you go without a drink for a while.',
      'Wanting to cut down and finding it consistently harder than expected.',
      'Alcohol affecting health, sleep, work or relationships in ways that keep coming up.',
      'Needing more than before to feel the same effect.',
    ],
  },
  fr: {
    intro:
      "Rien de tout cela n'est un diagnostic — seulement des signaux que certaines personnes trouvent utile de discuter avec un professionnel.",
    signals: [
      'Un inconfort physique — tremblements, sueurs, nausées — quand vous restez un moment sans boire.',
      'Vouloir réduire et trouver cela systématiquement plus difficile que prévu.',
      "L'alcool qui affecte la santé, le sommeil, le travail ou les relations, de façon récurrente.",
      "Avoir besoin de plus qu'avant pour ressentir le même effet.",
    ],
  },
};

/**
 * General relaxation / behavioural techniques some people use alongside —
 * not instead of — professional care. None are alcohol-specific medical
 * treatments; the intro and caution say so explicitly rather than implying
 * proven efficacy that isn't there (spec follow-up: "solutions non médicales,
 * sophrologie, hypnose et autres").
 */
export const NON_MEDICAL: Record<Locale, NonMedicalSection> = {
  en: {
    title: 'Non-medical, complementary approaches',
    intro:
      "None of these are medical treatments, and none are specific to alcohol — they're general relaxation or behavioural techniques some people use alongside, not instead of, professional care. Effectiveness varies by person, and evidence specifically for reducing alcohol use is limited or mixed for most of them.",
    items: [
      {
        title: 'Sophrology',
        body: 'A relaxation method (developed in Europe) combining breathing exercises, gentle body awareness and visualisation, usually taught over several sessions with a practitioner. Some people use it for general stress management; it is not a clinically proven addiction treatment.',
      },
      {
        title: 'Hypnotherapy',
        body: 'Guided relaxation and focused attention with a trained hypnotherapist, sometimes used to work on habits. Some people report it helpful; controlled evidence specific to alcohol use is limited, so treat it as one option to discuss with a professional rather than a proven fix.',
      },
      {
        title: 'Mindfulness / meditation',
        body: "Structured attention and breathing practices, often taught in group or app-based courses. There's more general research on mindfulness for stress and craving management than on the other two here, though results still vary by person.",
      },
    ],
    caution:
      "As with everything on this page, this list isn't a recommendation — just a starting point if you want to look into non-medical options. A doctor or addiction specialist is the right person to ask what fits your situation.",
  },
  fr: {
    title: 'Approches complémentaires, non médicales',
    intro:
      "Aucune de ces approches n'est un traitement médical, et aucune n'est spécifique à l'alcool — ce sont des techniques générales de relaxation ou comportementales que certaines personnes utilisent en complément, et non à la place, d'un suivi professionnel. Leur efficacité varie selon les personnes, et les preuves spécifiques à la réduction de la consommation d'alcool restent limitées ou mitigées pour la plupart d'entre elles.",
    items: [
      {
        title: 'Sophrologie',
        body: "Une méthode de relaxation (développée en Europe) combinant exercices respiratoires, prise de conscience corporelle douce et visualisation, généralement enseignée sur plusieurs séances avec un praticien. Certaines personnes l'utilisent pour la gestion générale du stress ; ce n'est pas un traitement de l'addiction cliniquement prouvé.",
      },
      {
        title: 'Hypnose / hypnothérapie',
        body: "Relaxation guidée et attention focalisée avec un hypnothérapeute formé, parfois utilisée pour travailler sur des habitudes. Certaines personnes trouvent cela utile ; les preuves contrôlées spécifiques à la consommation d'alcool restent limitées — à considérer comme une option à discuter avec un professionnel plutôt qu'une solution prouvée.",
      },
      {
        title: 'Pleine conscience / méditation',
        body: 'Pratiques structurées d\'attention et de respiration, souvent enseignées en groupe ou via une application. Il existe davantage de recherches générales sur la pleine conscience pour la gestion du stress et des envies que sur les deux approches précédentes, même si les résultats varient selon les personnes.',
      },
    ],
    caution:
      "Comme pour le reste de cette page, cette liste n'est pas une recommandation — juste un point de départ si vous souhaitez vous renseigner sur des options non médicales. Un médecin ou un spécialiste des addictions reste la bonne personne pour évaluer ce qui convient à votre situation.",
  },
};

export function approachesFor(locale: string): Approach[] {
  return APPROACHES[locale === 'fr' ? 'fr' : 'en'];
}

export function seekHelpFor(locale: string): SeekHelp {
  return SEEK_HELP[locale === 'fr' ? 'fr' : 'en'];
}

export function nonMedicalFor(locale: string): NonMedicalSection {
  return NON_MEDICAL[locale === 'fr' ? 'fr' : 'en'];
}
