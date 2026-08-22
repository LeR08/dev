import { z } from 'zod';

/** Schémas partagés client ↔ serveur : une seule définition des règles. */

const passwordRules = z
  .string()
  .min(8, 'Au moins 8 caractères')
  .max(72, 'Au plus 72 caractères')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[0-9]/, 'Au moins un chiffre');

export const emailSchema = z
  .string()
  .min(1, 'Adresse e-mail requise')
  .email('Adresse e-mail invalide')
  .transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Prénom requis').max(60),
    lastName: z.string().min(1, 'Nom requis').max(60),
    email: emailSchema,
    password: passwordRules,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'Vous devez accepter les conditions' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const onboardingSchema = z.object({
  levelId: z.string().uuid('Choisissez un parcours'),
  subjectIds: z.array(z.string().uuid()).min(1, 'Choisissez au moins un domaine'),
});

export const profileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(60),
  lastName: z.string().min(1, 'Nom requis').max(60),
  bio: z.string().max(500, 'Au plus 500 caractères').optional().or(z.literal('')),
  levelId: z.string().uuid().nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
