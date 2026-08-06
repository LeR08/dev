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

type Locale = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'zh' | 'ar';

const LOCALES: Locale[] = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ar'];

function resolveLocale(locale: string): Locale {
  return (LOCALES as string[]).includes(locale) ? (locale as Locale) : 'en';
}

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
  es: [
    {
      title: 'Espaciar',
      body: 'Alternar copas con alcohol con bebidas sin alcohol — agua, refresco, una cerveza 0.0% — reparte la misma velada en más tiempo y ralentiza la rapidez con la que se acumula el consumo.',
    },
    {
      title: 'Diluir',
      body: 'Mezclas más suaves — un tinto de verano, una clara, tu propia versión diluida — mantienen el ritual de la copa mientras reducen el alcohol de cada una. La función de bebidas personalizadas existe en parte para esto: guarda tu propia receta diluida como preajuste.',
    },
    {
      title: 'Decidir antes de empezar',
      body: 'Elegir un número para la noche antes de la primera copa suele funcionar mejor que decidirlo en el momento. Un objetivo semanal personal (Ajustes → Objetivos personales) es una forma de mantener ese número presente sin que sea asunto de nadie más.',
    },
    {
      title: 'Fijarse en el contexto',
      body: 'Los campos de nota y lugar de cada registro están ahí para esto — los patrones suelen verse más en el cuándo y el dónde que en el cuánto.',
    },
  ],
  de: [
    {
      title: 'Tempo drosseln',
      body: 'Alkoholische Getränke mit alkoholfreien abzuwechseln — Wasser, Limonade, ein 0,0 %-Bier — streckt denselben Abend über mehr Zeit und verlangsamt, wie schnell sich der Konsum summiert.',
    },
    {
      title: 'Verdünnen',
      body: 'Schwächere Mischungen — eine Schorle, ein Radler, eine eigene verdünnte Version — bewahren das Ritual eines Drinks und senken gleichzeitig den Alkoholgehalt. Die Funktion für eigene Getränke existiert teils genau dafür: Speichere dein eigenes verdünntes Rezept als Vorlage.',
    },
    {
      title: 'Vorher entscheiden',
      body: 'Eine Zahl für den Abend vor dem ersten Drink festzulegen, hält sich meist besser als eine Entscheidung im Moment. Ein persönliches Wochenziel (Einstellungen → Persönliche Ziele) ist eine Möglichkeit, diese Zahl im Blick zu behalten, ohne dass es jemand anderen etwas angeht.',
    },
    {
      title: 'Kontext bemerken',
      body: 'Die Notiz- und Ortsfelder bei jedem Eintrag sind genau dafür da — Muster zeigen sich oft eher im Wann und Wo als im Wieviel.',
    },
  ],
  it: [
    {
      title: 'Alternare',
      body: 'Alternare bevande alcoliche a bevande analcoliche — acqua, bibita, una birra 0.0% — distribuisce la stessa serata su più tempo e rallenta la velocità con cui il consumo si accumula.',
    },
    {
      title: 'Diluire',
      body: 'Miscele più leggere — uno spritz annacquato, una radler, una propria versione diluita — mantengono il rituale del bicchiere riducendo l\'alcol in ciascuno. La funzione delle bevande personalizzate esiste in parte per questo: salva la tua ricetta diluita come preimpostazione.',
    },
    {
      title: 'Decidere prima di iniziare',
      body: 'Scegliere un numero per la serata prima del primo bicchiere tiene generalmente meglio rispetto a deciderlo sul momento. Un obiettivo settimanale personale (Impostazioni → Obiettivi personali) è un modo per tenere quel numero visibile senza che riguardi nessun altro.',
    },
    {
      title: 'Notare il contesto',
      body: 'I campi nota e luogo di ogni voce servono proprio a questo — gli schemi spesso si notano più nel quando e nel dove che nel quanto.',
    },
  ],
  pt: [
    {
      title: 'Espaçar',
      body: 'Alternar bebidas alcoólicas com bebidas sem álcool — água, refrigerante, uma cerveja 0,0% — estende a mesma noite por mais tempo e diminui a velocidade a que o consumo se acumula.',
    },
    {
      title: 'Diluir',
      body: 'Misturas mais suaves — um vinho com gasosa, uma clara, uma versão diluída tua — mantêm o ritual da bebida ao mesmo tempo que reduzem o álcool em cada uma. A função de bebidas personalizadas existe em parte para isto: guarda a tua própria receita diluída como predefinição.',
    },
    {
      title: 'Decidir antes de começar',
      body: 'Escolher um número para a noite antes da primeira bebida costuma resultar melhor do que decidir na hora. Um objetivo semanal pessoal (Definições → Objetivos pessoais) é uma forma de manter esse número visível sem que seja da conta de mais ninguém.',
    },
    {
      title: 'Reparar no contexto',
      body: 'Os campos de nota e local de cada registo existem para isto — os padrões aparecem muitas vezes mais no quando e no onde do que no quanto.',
    },
  ],
  zh: [
    {
      title: '交替饮用',
      body: '在含酒精饮品之间穿插无酒精饮品——水、汽水、0.0% 酒精啤酒——能把同一个晚上的时间拉长，减缓饮酒量累积的速度。',
    },
    {
      title: '稀释',
      body: '调制成较淡的饮品——加了更多苏打水的鸡尾酒，或者你自己稀释的版本——既保留了喝一杯的仪式感，又降低了每杯的酒精含量。自定义饮品功能的部分意义正在于此：把你自己稀释的配方保存为预设。',
    },
    {
      title: '提前决定',
      body: '在第一杯之前就为这个晚上定好一个数量，通常比临场决定更容易坚持。个人每周目标（设置 → 个人目标）是一种让这个数字保持在自己心里、不必对任何人交代的方式。',
    },
    {
      title: '留意情境',
      body: '每条记录里的备注和地点字段正是为此而设——规律往往更多体现在"什么时候"和"在哪里"，而不是"喝了多少"。',
    },
  ],
  ar: [
    {
      title: 'التناوب',
      body: 'التناوب بين المشروبات الكحولية والمشروبات الخالية من الكحول — الماء، المشروبات الغازية، جعة بنسبة 0.0% — يوزّع نفس السهرة على وقت أطول ويبطئ سرعة تراكم الاستهلاك.',
    },
    {
      title: 'التخفيف',
      body: 'المزيجات الأخف — مشروب مخفف بالصودا، نسخة مخففة خاصة بك — تحافظ على طقس تناول المشروب مع تقليل نسبة الكحول في كل كأس. ميزة المشروبات المخصصة موجودة جزئيًا لهذا السبب: احفظ وصفتك المخففة الخاصة كإعداد مسبق.',
    },
    {
      title: 'تحديد القرار مسبقًا',
      body: 'تحديد عدد لهذه السهرة قبل الكأس الأولى يصمد عادة أفضل من اتخاذ القرار في اللحظة. هدف أسبوعي شخصي (الإعدادات ← الأهداف الشخصية) هو وسيلة لإبقاء هذا الرقم أمام عينيك دون أن يكون شأن أي شخص آخر.',
    },
    {
      title: 'ملاحظة السياق',
      body: 'حقلا الملاحظة والمكان في كل تسجيل موجودان لهذا الغرض — غالبًا ما تظهر الأنماط في التوقيت والمكان أكثر مما تظهر في الكمية.',
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
  es: {
    title: 'Enfoques complementarios, no médicos',
    intro:
      'Ninguno de estos es un tratamiento médico, y ninguno es específico para el alcohol — son técnicas generales de relajación o conductuales que algunas personas usan junto con la atención profesional, no en su lugar. Su eficacia varía según la persona, y la evidencia específica sobre la reducción del consumo de alcohol es limitada o mixta para la mayoría de ellas.',
    items: [
      {
        title: 'Sofrología',
        body: 'Un método de relajación (desarrollado en Europa) que combina ejercicios de respiración, conciencia corporal suave y visualización, generalmente enseñado en varias sesiones con un profesional. Algunas personas lo usan para el manejo general del estrés; no es un tratamiento de adicción clínicamente probado.',
      },
      {
        title: 'Hipnoterapia',
        body: 'Relajación guiada y atención focalizada con un hipnoterapeuta formado, a veces usada para trabajar hábitos. Algunas personas la encuentran útil; la evidencia controlada específica sobre el consumo de alcohol es limitada, así que considérala una opción para hablar con un profesional, no una solución probada.',
      },
      {
        title: 'Mindfulness / meditación',
        body: 'Prácticas estructuradas de atención y respiración, a menudo enseñadas en cursos grupales o mediante aplicaciones. Existe más investigación general sobre el mindfulness para el manejo del estrés y los antojos que sobre las otras dos técnicas aquí, aunque los resultados también varían según la persona.',
      },
    ],
    caution:
      'Como con todo en esta página, esta lista no es una recomendación — solo un punto de partida si quieres informarte sobre opciones no médicas. Un médico o especialista en adicciones es la persona indicada para saber qué se ajusta a tu situación.',
  },
  de: {
    title: 'Nicht-medizinische, ergänzende Ansätze',
    intro:
      'Keiner davon ist eine medizinische Behandlung, und keiner ist alkoholspezifisch — es sind allgemeine Entspannungs- oder Verhaltenstechniken, die manche Menschen ergänzend zur professionellen Betreuung nutzen, nicht anstelle davon. Die Wirksamkeit ist individuell verschieden, und die Evidenz speziell zur Reduzierung des Alkoholkonsums ist für die meisten davon begrenzt oder uneinheitlich.',
    items: [
      {
        title: 'Sophrologie',
        body: 'Eine Entspannungsmethode (in Europa entwickelt), die Atemübungen, sanfte Körperwahrnehmung und Visualisierung kombiniert, meist über mehrere Sitzungen mit einer Fachperson vermittelt. Manche nutzen sie für allgemeines Stressmanagement; sie ist keine klinisch belegte Suchtbehandlung.',
      },
      {
        title: 'Hypnotherapie',
        body: 'Geführte Entspannung und fokussierte Aufmerksamkeit mit einer ausgebildeten Hypnotherapeutin oder einem Hypnotherapeuten, manchmal zur Arbeit an Gewohnheiten genutzt. Manche berichten von Nutzen; kontrollierte Evidenz speziell zum Alkoholkonsum ist begrenzt — eher als Option für ein Gespräch mit einer Fachperson zu sehen, nicht als bewiesene Lösung.',
      },
      {
        title: 'Achtsamkeit / Meditation',
        body: 'Strukturierte Aufmerksamkeits- und Atemübungen, oft in Gruppenkursen oder per App vermittelt. Zu Achtsamkeit bei Stress- und Suchtdruck-Management gibt es mehr allgemeine Forschung als zu den beiden anderen hier, auch wenn die Ergebnisse individuell variieren.',
      },
    ],
    caution:
      'Wie alles auf dieser Seite ist diese Liste keine Empfehlung — nur ein Ausgangspunkt, falls du dich über nicht-medizinische Optionen informieren möchtest. Eine Ärztin, ein Arzt oder eine Suchtfachperson ist die richtige Anlaufstelle, um zu klären, was zur eigenen Situation passt.',
  },
  it: {
    title: 'Approcci complementari, non medici',
    intro:
      "Nessuno di questi è un trattamento medico, e nessuno è specifico per l'alcol — sono tecniche generali di rilassamento o comportamentali che alcune persone usano insieme, non al posto, delle cure professionali. L'efficacia varia da persona a persona, e le prove specifiche sulla riduzione del consumo di alcol sono limitate o contrastanti per la maggior parte di esse.",
    items: [
      {
        title: 'Sofrologia',
        body: "Un metodo di rilassamento (sviluppato in Europa) che combina esercizi di respirazione, consapevolezza corporea leggera e visualizzazione, di solito insegnato in più sessioni con un professionista. Alcune persone la usano per la gestione generale dello stress; non è un trattamento per le dipendenze clinicamente provato.",
      },
      {
        title: 'Ipnoterapia',
        body: "Rilassamento guidato e attenzione focalizzata con un ipnoterapeuta formato, a volte usata per lavorare sulle abitudini. Alcune persone la trovano utile; le prove controllate specifiche sul consumo di alcol sono limitate, quindi va considerata come un'opzione da discutere con un professionista, non come una soluzione provata.",
      },
      {
        title: 'Mindfulness / meditazione',
        body: 'Pratiche strutturate di attenzione e respirazione, spesso insegnate in corsi di gruppo o tramite app. Esiste più ricerca generale sulla mindfulness per la gestione dello stress e del desiderio impellente rispetto alle altre due qui elencate, anche se i risultati variano da persona a persona.',
      },
    ],
    caution:
      "Come per tutto in questa pagina, questo elenco non è una raccomandazione — solo un punto di partenza se si desidera informarsi su opzioni non mediche. Un medico o uno specialista delle dipendenze è la persona giusta a cui chiedere cosa sia adatto alla propria situazione.",
  },
  pt: {
    title: 'Abordagens complementares, não médicas',
    intro:
      'Nenhuma destas é um tratamento médico, e nenhuma é específica para o álcool — são técnicas gerais de relaxamento ou comportamentais que algumas pessoas usam em conjunto com o acompanhamento profissional, não em vez dele. A eficácia varia de pessoa para pessoa, e a evidência específica sobre a redução do consumo de álcool é limitada ou mista para a maioria delas.',
    items: [
      {
        title: 'Sofrologia',
        body: 'Um método de relaxamento (desenvolvido na Europa) que combina exercícios respiratórios, consciência corporal suave e visualização, normalmente ensinado ao longo de várias sessões com um profissional. Algumas pessoas usam-no para a gestão geral do stress; não é um tratamento de dependências clinicamente comprovado.',
      },
      {
        title: 'Hipnoterapia',
        body: 'Relaxamento guiado e atenção focada com um hipnoterapeuta com formação, por vezes usada para trabalhar hábitos. Algumas pessoas consideram-na útil; a evidência controlada específica sobre o consumo de álcool é limitada, por isso trata-a como uma opção a discutir com um profissional, não como uma solução comprovada.',
      },
      {
        title: 'Mindfulness / meditação',
        body: 'Práticas estruturadas de atenção e respiração, muitas vezes ensinadas em cursos de grupo ou através de aplicações. Existe mais investigação geral sobre mindfulness para a gestão do stress e dos desejos do que sobre as outras duas aqui referidas, embora os resultados também variem de pessoa para pessoa.',
      },
    ],
    caution:
      'Tal como com tudo nesta página, esta lista não é uma recomendação — apenas um ponto de partida caso queiras informar-te sobre opções não médicas. Um médico ou especialista em dependências é a pessoa certa para perguntar o que se adequa à tua situação.',
  },
  zh: {
    title: '非医学的辅助方法',
    intro:
      '以下方法都不是医学治疗，也都不是针对酒精的专门方法——它们是一些人在专业照护之外（而非替代专业照护）使用的通用放松或行为技巧。效果因人而异，且针对减少饮酒这一方面的证据，对大多数方法而言都还有限或结论不一。',
    items: [
      {
        title: '身心放松法（Sophrology）',
        body: '一种源自欧洲的放松方法，结合呼吸练习、温和的身体觉察和意象引导，通常需要在专业人士指导下进行多次训练。有些人用它来进行一般性的压力管理；它并非经临床证实的成瘾治疗方法。',
      },
      {
        title: '催眠疗法',
        body: '在受过训练的催眠治疗师引导下进行放松和专注练习，有时用于改变习惯。有些人认为有帮助；但专门针对饮酒行为的对照研究证据有限，因此更适合作为与专业人士讨论的一个选项，而非已被证实的解决方案。',
      },
      {
        title: '正念 / 冥想',
        body: '结构化的专注与呼吸练习，常见于团体课程或应用程序中教授。相较于以上两种方法，正念在压力和渴求管理方面有更多的一般性研究支持，不过效果同样因人而异。',
      },
    ],
    caution: '和本页面的其他内容一样，这份清单并非推荐——只是如果你想了解非医学的选择，可以作为一个起点。医生或成瘾问题专科医生才是判断哪种方式适合你的合适人选。',
  },
  ar: {
    title: 'أساليب تكميلية غير طبية',
    intro:
      'لا شيء من هذه الأساليب هو علاج طبي، ولا أي منها مخصص للكحول تحديدًا — إنها تقنيات استرخاء أو سلوكية عامة يستخدمها بعض الأشخاص إلى جانب الرعاية المهنية، لا بدلًا منها. تختلف الفعالية من شخص لآخر، والأدلة الخاصة بالحد من استهلاك الكحول محدودة أو متباينة بالنسبة لمعظمها.',
    items: [
      {
        title: 'السوفرولوجيا',
        body: 'طريقة استرخاء (طُوّرت في أوروبا) تجمع بين تمارين التنفس والوعي الجسدي اللطيف والتصور الذهني، تُدرَّس عادة على عدة جلسات مع مختص. يستخدمها بعض الأشخاص لإدارة التوتر بشكل عام؛ وهي ليست علاجًا للإدمان مثبتًا سريريًا.',
      },
      {
        title: 'العلاج بالتنويم الإيحائي',
        body: 'استرخاء موجَّه وتركيز مُوجَّه مع معالج مدرَّب بالتنويم الإيحائي، يُستخدم أحيانًا للعمل على العادات. يجد بعض الأشخاص فيه فائدة؛ الأدلة المضبوطة الخاصة باستهلاك الكحول محدودة، لذا يُنظر إليه كخيار للنقاش مع مختص وليس كحل مثبت.',
      },
      {
        title: 'اليقظة الذهنية / التأمل',
        body: 'ممارسات منظمة للتركيز والتنفس، تُدرَّس غالبًا في دورات جماعية أو عبر التطبيقات. توجد أبحاث عامة حول اليقظة الذهنية لإدارة التوتر والرغبة الملحّة أكثر من الأسلوبين الآخرين هنا، رغم أن النتائج تختلف أيضًا من شخص لآخر.',
      },
    ],
    caution:
      'كما هو الحال مع كل ما في هذه الصفحة، هذه القائمة ليست توصية — إنها فقط نقطة بداية إذا رغبت في الاطلاع على خيارات غير طبية. الطبيب أو أخصائي الإدمان هو الشخص المناسب لتحديد ما يناسب حالتك.',
  },
};

export function approachesFor(locale: string): Approach[] {
  return APPROACHES[resolveLocale(locale)];
}

export function seekHelpFor(locale: string): SeekHelp {
  return SEEK_HELP[resolveLocale(locale)];
}

export function nonMedicalFor(locale: string): NonMedicalSection {
  return NON_MEDICAL[resolveLocale(locale)];
}
