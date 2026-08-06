/**
 * "When it might help to talk to someone" content for the Help tab
 * (spec v1.2 §8.4) — general, non-diagnostic signals, not medical advice.
 * Flagged in the spec as needing review by a qualified addictologist or
 * physician before any public release; this is still a test-mode build, so
 * that review is tracked as an open item rather than something this pass
 * can complete on its own.
 */

export type SeekHelp = { intro: string; signals: string[] };

type Locale = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'zh' | 'ar';

const LOCALES: Locale[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ar'];

function resolveLocale(locale: string): Locale {
  return (LOCALES as string[]).includes(locale) ? (locale as Locale) : 'en';
}

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
  es: {
    intro:
      'Nada de esto es un diagnóstico — solo señales que algunas personas consideran útil comentar con un profesional.',
    signals: [
      'Malestar físico — temblores, sudoración, náuseas — al pasar un tiempo sin beber.',
      'Querer reducir el consumo y que resulte sistemáticamente más difícil de lo esperado.',
      'El alcohol afectando la salud, el sueño, el trabajo o las relaciones de forma recurrente.',
      'Necesitar más cantidad que antes para sentir el mismo efecto.',
    ],
  },
  de: {
    intro:
      'Nichts davon ist eine Diagnose — nur Signale, die manche Menschen als Anlass für ein Gespräch mit einer Fachperson sehen.',
    signals: [
      'Körperliches Unwohlsein — Zittern, Schwitzen, Übelkeit — wenn eine Weile nicht getrunken wird.',
      'Der Wunsch, weniger zu trinken, und das durchgehend schwerer als erwartet.',
      'Alkohol, der Gesundheit, Schlaf, Arbeit oder Beziehungen wiederkehrend beeinträchtigt.',
      'Mehr als früher zu brauchen, um dieselbe Wirkung zu spüren.',
    ],
  },
  it: {
    intro:
      'Nulla di tutto ciò è una diagnosi — solo segnali che alcune persone trovano utile discutere con un professionista.',
    signals: [
      'Disagio fisico — tremori, sudorazione, nausea — quando si sta un po\' senza bere.',
      'Voler ridurre il consumo e trovarlo sistematicamente più difficile del previsto.',
      "L'alcol che influisce su salute, sonno, lavoro o relazioni in modo ricorrente.",
      'Aver bisogno di più di prima per sentire lo stesso effetto.',
    ],
  },
  pt: {
    intro:
      'Nada disto é um diagnóstico — apenas sinais que algumas pessoas consideram úteis discutir com um profissional.',
    signals: [
      'Desconforto físico — tremores, suores, náuseas — ao passar um tempo sem beber.',
      'Querer reduzir o consumo e achar isso sistematicamente mais difícil do que esperado.',
      'O álcool a afetar a saúde, o sono, o trabalho ou as relações de forma recorrente.',
      'Precisar de mais do que antes para sentir o mesmo efeito.',
    ],
  },
  zh: {
    intro: '以下都不是诊断——只是一些人认为值得与专业人士聊一聊的信号。',
    signals: [
      '一段时间不喝酒时出现身体不适——手抖、出汗、恶心。',
      '想要减少饮酒，却发现这比预想的持续更困难。',
      '酒精反复影响健康、睡眠、工作或人际关系。',
      '需要比以前更多的量才能感受到同样的效果。',
    ],
  },
  ar: {
    intro: 'لا شيء من هذا يُعد تشخيصًا — إنها فقط إشارات يجدها بعض الأشخاص جديرة بالنقاش مع مختص.',
    signals: [
      'انزعاج جسدي — رعشة، تعرّق، غثيان — عند الامتناع عن الشرب لفترة.',
      'الرغبة في التقليل ووجدان ذلك أصعب بشكل مستمر مما كان متوقعًا.',
      'الكحول يؤثر على الصحة أو النوم أو العمل أو العلاقات بشكل متكرر.',
      'الحاجة إلى كمية أكبر من ذي قبل للشعور بنفس التأثير.',
    ],
  },
};

export function seekHelpFor(locale: string): SeekHelp {
  return SEEK_HELP[resolveLocale(locale)];
}
