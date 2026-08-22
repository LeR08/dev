/** Chemins de l'application — une seule source de vérité pour les liens et les gardes. */
export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  onboarding: '/onboarding',

  dashboard: '/dashboard',
  explore: '/explore',
  myCourses: '/my-courses',
  progress: '/progress',
  favorites: '/favorites',
  notes: '/notes',
  goals: '/goals',
  notifications: '/notifications',
  profile: '/profile',
  activate: '/activate',
  settings: '/settings',
  settingsSecurity: '/settings/security',
  settingsNotifications: '/settings/notifications',

  course: (slug: string) => `/courses/${slug}`,
  lesson: (lessonId: string) => `/learn/${lessonId}`,
  quiz: (quizId: string) => `/quiz/${quizId}`,

  admin: '/admin',
  adminTree: '/admin/tree',
  adminUsers: '/admin/users',
  adminLevels: '/admin/levels',
  adminSubjects: '/admin/subjects',
  adminCourses: '/admin/courses',
  adminCourse: (id: string) => `/admin/courses/${id}`,
  adminLesson: (id: string) => `/admin/lessons/${id}`,
  adminQuiz: (id: string) => `/admin/quizzes/${id}`,
  adminAccessCodes: '/admin/access-codes',
  adminBadges: '/admin/badges',
} as const;

/** Préfixes exigeant une session. Utilisés par le middleware. */
export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/explore',
  '/my-courses',
  '/courses',
  '/learn',
  '/quiz',
  '/progress',
  '/favorites',
  '/notes',
  '/goals',
  '/notifications',
  '/profile',
  '/settings',
  '/activate',
  '/onboarding',
  '/admin',
];

/** Pages d'authentification : un utilisateur connecté y est redirigé. */
export const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
