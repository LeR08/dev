'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { completeOnboarding } from '@/server/actions/auth.actions';
import { routes } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  name: string;
  description: string | null;
}

export function OnboardingForm({
  levels,
  subjects,
}: {
  levels: Option[];
  subjects: Option[];
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [levelId, setLevelId] = React.useState<string | null>(null);
  const [subjectIds, setSubjectIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function finish() {
    setError(null);
    setPending(true);
    const result = await completeOnboarding({ levelId, subjectIds });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace(routes.dashboard);
    router.refresh();
  }

  return (
    <div className="space-y-7">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1].map((index) => (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {step === 0 ? (
        <div className="space-y-5">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Où en êtes-vous ?</h1>
            <p className="text-muted-foreground text-sm">
              Cela nous sert à ordonner vos recommandations. Vous gardez accès à tout le catalogue.
            </p>
          </div>

          <div className="space-y-2.5">
            {levels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => setLevelId(level.id)}
                aria-pressed={levelId === level.id}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  levelId === level.id
                    ? 'border-primary bg-primary-muted'
                    : 'hover:bg-muted',
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{level.name}</span>
                    {level.description && (
                      <span className="text-muted-foreground block text-sm">
                        {level.description}
                      </span>
                    )}
                  </span>
                  {levelId === level.id && <Check className="text-primary size-5 shrink-0" />}
                </span>
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!levelId}
            onClick={() => setStep(1)}
          >
            Continuer <ArrowRight />
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Qu&apos;est-ce qui vous intéresse ?</h1>
            <p className="text-muted-foreground text-sm">
              Choisissez un ou plusieurs domaines. Modifiable à tout moment depuis votre profil.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {subjects.map((subject) => {
              const selected = subjectIds.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() =>
                    setSubjectIds((current) =>
                      selected
                        ? current.filter((id) => id !== subject.id)
                        : [...current, subject.id],
                    )
                  }
                  aria-pressed={selected}
                  className={cn(
                    'rounded-xl border p-3.5 text-left transition-colors',
                    selected ? 'border-primary bg-primary-muted' : 'hover:bg-muted',
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-sm font-medium">{subject.name}</span>
                    {selected && <Check className="text-primary size-4 shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
              Retour
            </Button>
            <Button
              className="flex-1"
              disabled={subjectIds.length === 0}
              loading={pending}
              onClick={finish}
            >
              Terminer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
