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

export function approachesFor(locale: string): Approach[] {
  return APPROACHES[locale === 'fr' ? 'fr' : 'en'];
}

export function seekHelpFor(locale: string): SeekHelp {
  return SEEK_HELP[locale === 'fr' ? 'fr' : 'en'];
}
