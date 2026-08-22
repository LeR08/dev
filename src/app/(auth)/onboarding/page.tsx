import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/auth/onboarding-form';
import { requireUser } from '@/server/auth/guards';
import { getLevels, getSubjects } from '@/server/db/content';
import { routes } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Bienvenue',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.profile.onboarding_done) redirect(routes.dashboard);

  const [levels, subjects] = await Promise.all([getLevels(), getSubjects()]);

  return <OnboardingForm levels={levels} subjects={subjects} />;
}
