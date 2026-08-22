'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { routes } from '@/lib/constants/routes';
import { requireUserOrFail } from '@/server/auth/guards';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/validations/auth.schema';
import { fail, guard, ok, type ActionResult } from './action-result';

/**
 * Messages d'erreur : jamais « cet e-mail n'existe pas ». Cela permettrait
 * d'énumérer les comptes existants.
 */
function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Adresse e-mail ou mot de passe incorrect.';
  }
  if (normalized.includes('email not confirmed')) {
    return "Votre adresse e-mail n'a pas encore été confirmée. Consultez votre boîte de réception.";
  }
  if (normalized.includes('user already registered')) {
    return 'Un compte existe déjà avec cette adresse e-mail.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  }
  if (normalized.includes('same password')) {
    return 'Le nouveau mot de passe doit être différent de l’ancien.';
  }
  return "Une erreur est survenue lors de l'authentification.";
}

export async function signIn(formData: unknown): Promise<ActionResult<{ next: string }>> {
  return guard(async () => {
    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      return fail('Formulaire invalide', z4FieldErrors(parsed.error));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return fail(translateAuthError(error.message));

    // Compte désactivé par l'administration : on referme immédiatement.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, onboarding_done')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return fail('Ce compte a été désactivé. Contactez le support.');
      }

      return ok({ next: profile?.onboarding_done ? routes.dashboard : routes.onboarding });
    }

    return ok({ next: routes.dashboard });
  });
}

export async function signUp(formData: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  return guard(async () => {
    const parsed = registerSchema.safeParse(formData);
    if (!parsed.success) return fail('Formulaire invalide', z4FieldErrors(parsed.error));

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${env.siteUrl()}/callback?next=${routes.onboarding}`,
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
        },
      },
    });

    if (error) return fail(translateAuthError(error.message));

    // Supabase renvoie un utilisateur sans session quand la confirmation
    // d'e-mail est activée sur le projet.
    const needsConfirmation = !data.session;
    return ok({ needsConfirmation });
  });
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.login);
}

export async function requestPasswordReset(formData: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const parsed = forgotPasswordSchema.safeParse(formData);
    if (!parsed.success) return fail('Adresse e-mail invalide', z4FieldErrors(parsed.error));

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.siteUrl()}/callback?next=${routes.resetPassword}`,
    });

    // Réponse toujours identique, que l'adresse existe ou non.
    return ok(undefined, 'Si un compte existe pour cette adresse, un e-mail vient d’être envoyé.');
  });
}

export async function resetPassword(formData: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const parsed = resetPasswordSchema.safeParse(formData);
    if (!parsed.success) return fail('Formulaire invalide', z4FieldErrors(parsed.error));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail('Lien expiré ou invalide. Demandez un nouvel e-mail de réinitialisation.');
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return fail(translateAuthError(error.message));

    return ok(undefined, 'Mot de passe mis à jour.');
  });
}

export async function changePassword(formData: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = changePasswordSchema.safeParse(formData);
    if (!parsed.success) return fail('Formulaire invalide', z4FieldErrors(parsed.error));

    const supabase = await createClient();

    // Vérifie le mot de passe actuel : sinon, un cookie volé suffirait à
    // s'approprier définitivement le compte.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) return fail('Mot de passe actuel incorrect.');

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return fail(translateAuthError(error.message));

    return ok(undefined, 'Mot de passe modifié.');
  });
}

export async function completeOnboarding(formData: unknown): Promise<ActionResult<undefined>> {
  return guard(async () => {
    const user = await requireUserOrFail();
    const parsed = onboardingSchema.safeParse(formData);
    if (!parsed.success) return fail('Formulaire invalide', z4FieldErrors(parsed.error));

    const supabase = await createClient();

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ level_id: parsed.data.levelId, onboarding_done: true })
      .eq('id', user.id);

    if (profileError) return fail("Impossible d'enregistrer votre parcours.");

    await supabase.from('user_subject_interests').delete().eq('user_id', user.id);
    if (parsed.data.subjectIds.length > 0) {
      await supabase.from('user_subject_interests').insert(
        parsed.data.subjectIds.map((subjectId) => ({
          user_id: user.id,
          subject_id: subjectId,
        })),
      );
    }

    revalidatePath(routes.dashboard);
    return ok(undefined);
  });
}

/** Convertit une erreur Zod v4 en dictionnaire champ → messages. */
function z4FieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (result[key] ??= []).push(issue.message);
  }
  return result;
}
