import type { Tables } from './database.types';

/**
 * Types métier composés à partir des lignes de la base.
 * Ils décrivent ce que les composants reçoivent réellement.
 */

export type Level = Tables<'levels'>;
export type Subject = Tables<'subjects'>;
export type Course = Tables<'courses'>;
export type Module = Tables<'modules'>;
export type Chapter = Tables<'chapters'>;
export type Lesson = Tables<'lessons'>;
export type Video = Tables<'videos'>;
export type Resource = Tables<'resources'>;
export type Quiz = Tables<'quizzes'>;
export type Question = Tables<'questions'>;
export type Answer = Tables<'answers'>;
export type Note = Tables<'notes'>;
export type Badge = Tables<'badges'>;
export type Notification = Tables<'notifications'>;
export type Goal = Tables<'goals'>;

/** Carte de formation du catalogue : projection minimale, jamais `select *`. */
export interface CourseCard {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  difficulty: Course['difficulty'];
  lessonsCount: number;
  durationSeconds: number;
  levelId: string;
  levelName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string | null;
  subjectIcon: string | null;
  /** Pourcentage de progression, absent si la formation n'est pas commencée. */
  progressPercent?: number;
  lessonsCompleted?: number;
  /** L'utilisateur a-t-il un accès valide à cette formation ? */
  unlocked: boolean;
  isFavorite?: boolean;
}

export interface LessonNode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  sortOrder: number;
  isFreePreview: boolean;
  hasVideo: boolean;
  hasQuiz: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  locked: boolean;
}

export interface ChapterNode {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: LessonNode[];
  lessonsCompleted: number;
  completed: boolean;
}

export interface ModuleNode {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  chapters: ChapterNode[];
  lessonsTotal: number;
  lessonsCompleted: number;
  completed: boolean;
}

export interface CourseDetail {
  course: Course;
  level: Pick<Level, 'id' | 'name' | 'slug'>;
  subject: Pick<Subject, 'id' | 'name' | 'slug' | 'color' | 'icon'>;
  modules: ModuleNode[];
  lessonsTotal: number;
  lessonsCompleted: number;
  progressPercent: number;
  unlocked: boolean;
  /** Leçon sur laquelle pointe le bouton « Continuer ». */
  resumeLessonId: string | null;
  isFavorite: boolean;
}

/** Voisinage d'une leçon dans le fil du cours — navigation précédent/suivant. */
export interface LessonNeighbours {
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  index: number;
  total: number;
}

export interface VideoWithProgress {
  video: Video;
  positionSeconds: number;
  percent: number;
  completed: boolean;
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  passingScore: number;
  maxAttempts: number | null;
  bestPercentage: number | null;
  attemptsUsed: number;
  passed: boolean;
}

export interface QuizGradedQuestion {
  question_id: string;
  is_correct: boolean;
  points: number;
  explanation: string | null;
  correct_answer_ids: string[];
  correct_labels: string[];
}

export interface QuizResult {
  ok: true;
  attempt_id: string;
  attempt_number: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  passing_score: number;
  details: QuizGradedQuestion[];
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
  message: string;
  scope?: 'all' | 'subject' | 'course';
  course_id?: string | null;
  subject_id?: string | null;
  expires_at?: string | null;
}

export const DIFFICULTY_LABELS: Record<Course['difficulty'], string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export const PROGRESS_LABELS: Record<'not_started' | 'in_progress' | 'completed', string> = {
  not_started: 'À commencer',
  in_progress: 'En cours',
  completed: 'Terminé',
};
