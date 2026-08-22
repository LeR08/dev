import { z } from 'zod';

const slug = z
  .string()
  .trim()
  .min(2, 'Slug trop court')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Minuscules, chiffres et tirets uniquement');

const status = z.enum(['draft', 'published', 'archived']);

export const entitySchema = z.object({
  id: z.string().uuid().optional(),
  slug,
  name: z.string().trim().min(1, 'Nom requis').max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(60).optional(),
  color: z.string().max(60).optional(),
  status: status.default('published'),
  sortOrder: z.number().int().min(0).default(0),
});

export const courseSchema = z.object({
  id: z.string().uuid().optional(),
  slug,
  title: z.string().trim().min(1, 'Titre requis').max(200),
  summary: z.string().max(300).optional(),
  description: z.string().max(20000).optional(),
  thumbnailUrl: z.string().url('URL invalide').max(500).optional().or(z.literal('')),
  levelId: z.string().uuid('Parcours requis'),
  subjectId: z.string().uuid('Domaine requis'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  status: status.default('draft'),
  sortOrder: z.number().int().min(0).default(0),
});

export const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  chapterId: z.string().uuid('Chapitre requis'),
  slug,
  title: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional(),
  contentMd: z.string().max(60000).optional(),
  durationSeconds: z.number().int().min(0).max(24 * 3600).default(0),
  isFreePreview: z.boolean().default(false),
  status: status.default('published'),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Une vidéo « native » exige une URL de fichier ; tout autre fournisseur exige
 * un identifiant externe. La contrainte existe aussi en base
 * (videos_source_present) : ce schéma la reproduit pour donner un message
 * lisible avant l'aller-retour serveur.
 */
export const videoSchema = z
  .object({
    id: z.string().uuid().optional(),
    lessonId: z.string().uuid(),
    title: z.string().trim().min(1, 'Titre requis').max(200),
    description: z.string().max(2000).optional(),
    provider: z.enum(['native', 'youtube', 'google_drive', 'cloudflare_stream', 'vimeo']),
    externalId: z.string().max(200).optional(),
    url: z.string().url('URL invalide').max(1000).optional().or(z.literal('')),
    thumbnailUrl: z.string().url('URL invalide').max(1000).optional().or(z.literal('')),
    durationSeconds: z.number().int().min(0).max(24 * 3600).default(0),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine((data) => (data.provider === 'native' ? Boolean(data.url) : Boolean(data.externalId)), {
    message: 'Une URL de fichier est requise pour un fichier direct, un identifiant sinon.',
    path: ['url'],
  });

export const resourceSchema = z
  .object({
    id: z.string().uuid().optional(),
    lessonId: z.string().uuid().nullable().optional(),
    courseId: z.string().uuid().nullable().optional(),
    type: z.enum(['pdf', 'document', 'image', 'link', 'file', 'archive']),
    title: z.string().trim().min(1, 'Titre requis').max(200),
    description: z.string().max(500).optional(),
    url: z.string().url('URL invalide').max(1000).optional().or(z.literal('')),
    storagePath: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine((data) => Boolean(data.lessonId) !== Boolean(data.courseId), {
    message: 'Une ressource est rattachée soit à une leçon, soit à une formation.',
    path: ['lessonId'],
  })
  .refine((data) => Boolean(data.url) !== Boolean(data.storagePath), {
    message: 'Fournissez une URL externe ou un fichier, pas les deux.',
    path: ['url'],
  });

export const quizSchema = z.object({
  id: z.string().uuid().optional(),
  lessonId: z.string().uuid(),
  title: z.string().trim().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional(),
  passingScore: z.number().int().min(0).max(100).default(60),
  maxAttempts: z.number().int().min(1).max(50).nullable().optional(),
  timeLimitSeconds: z.number().int().min(30).max(7200).nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  showExplanations: z.boolean().default(true),
  status: status.default('published'),
  sortOrder: z.number().int().min(0).default(0),
});

export const questionSchema = z
  .object({
    id: z.string().uuid().optional(),
    quizId: z.string().uuid(),
    type: z.enum(['single_choice', 'multiple_choice', 'true_false', 'short_answer']),
    prompt: z.string().trim().min(1, 'Énoncé requis').max(2000),
    explanation: z.string().max(2000).optional(),
    points: z.number().min(0.5).max(100).default(1),
    sortOrder: z.number().int().min(0).default(0),
    answers: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Libellé requis').max(500),
          isCorrect: z.boolean().default(false),
          matchPattern: z.string().max(500).optional(),
        }),
      )
      .min(1, 'Au moins une réponse'),
  })
  .refine((data) => data.answers.some((answer) => answer.isCorrect), {
    message: 'Indiquez au moins une bonne réponse.',
    path: ['answers'],
  })
  .refine(
    (data) =>
      data.type !== 'single_choice' && data.type !== 'true_false'
        ? true
        : data.answers.filter((answer) => answer.isCorrect).length === 1,
    { message: 'Ce type de question n’admet qu’une seule bonne réponse.', path: ['answers'] },
  );

export const reorderSchema = z.object({
  entity: z.enum([
    'levels', 'subjects', 'courses', 'modules', 'chapters', 'lessons',
    'videos', 'resources', 'quizzes', 'questions', 'answers', 'exercises',
  ]),
  parentId: z.string().uuid().nullable().optional(),
  orderedIds: z.array(z.string().uuid()).min(1).max(500),
});

export const accessCodeBatchSchema = z.object({
  count: z.number().int().min(1, 'Au moins 1').max(500, 'Au plus 500'),
  scope: z.enum(['all', 'subject', 'course']).default('all'),
  courseId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  maxUses: z.number().int().min(1).max(10000).default(1),
  accessDays: z.number().int().min(1).max(3650).nullable().optional(),
  label: z.string().max(120).optional(),
});

/**
 * Les schémas comportent des `.default()` : le type d'ENTRÉE (ce que le
 * formulaire manipule, avec des champs optionnels) diffère du type de SORTIE
 * (ce que la server action reçoit, complété). react-hook-form a besoin des
 * deux, d'où ces paires de types.
 */
export type EntityInput = z.output<typeof entitySchema>;
export type EntityFormInput = z.input<typeof entitySchema>;
export type CourseInput = z.output<typeof courseSchema>;
export type CourseFormInput = z.input<typeof courseSchema>;
export type LessonInput = z.output<typeof lessonSchema>;
export type LessonFormInput = z.input<typeof lessonSchema>;
export type VideoInput = z.output<typeof videoSchema>;
export type VideoFormInput = z.input<typeof videoSchema>;
export type ResourceInput = z.output<typeof resourceSchema>;
export type ResourceFormInput = z.input<typeof resourceSchema>;
export type QuizInput = z.output<typeof quizSchema>;
export type QuizFormInput = z.input<typeof quizSchema>;
export type QuestionInput = z.output<typeof questionSchema>;
export type QuestionFormInput = z.input<typeof questionSchema>;
export type AccessCodeBatchInput = z.output<typeof accessCodeBatchSchema>;
export type AccessCodeBatchFormInput = z.input<typeof accessCodeBatchSchema>;
