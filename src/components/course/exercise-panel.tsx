'use client';

import * as React from 'react';
import { ChevronDown, Lightbulb, PencilRuler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Markdown } from '@/lib/utils/markdown';
import { submitExerciseAttempt } from '@/server/actions/assessment.actions';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LABELS } from '@/types/domain';
import type { Tables } from '@/types/database.types';

/**
 * Exercices — indépendants des quiz.
 *
 * La correction n'est pas automatique en v1 (sauf réponses numériques) :
 * l'apprenant répond, compare avec le corrigé, puis s'auto-évalue. C'est
 * honnête et cela laisse la place à une correction assistée plus tard, sans
 * changer ni le schéma ni cette interface.
 */
export function ExercisePanel({ exercises }: { exercises: Tables<'exercises'>[] }) {
  return (
    <ul className="space-y-3">
      {exercises.map((exercise, index) => (
        <li key={exercise.id}>
          <ExerciseCard exercise={exercise} index={index + 1} />
        </li>
      ))}
    </ul>
  );
}

function ExerciseCard({ exercise, index }: { exercise: Tables<'exercises'>; index: number }) {
  const { toast } = useToast();
  const [answer, setAnswer] = React.useState('');
  const [showSolution, setShowSolution] = React.useState(false);
  const [submitted, setSubmitted] = React.useState<{ correct: boolean | null } | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(selfAssessment?: number) {
    setPending(true);
    const result = await submitExerciseAttempt({
      exerciseId: exercise.id,
      responseText: answer,
      selfAssessment,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Envoi impossible', description: result.error, tone: 'error' });
      return;
    }

    setSubmitted({ correct: result.data.isCorrect });
    setShowSolution(true);

    if (result.data.isCorrect === true) {
      toast({ title: 'Bonne réponse', tone: 'success' });
    } else if (result.data.isCorrect === false) {
      toast({ title: 'Réponse incorrecte', description: 'Comparez avec le corrigé.', tone: 'error' });
    }
  }

  return (
    <div className="bg-card space-y-4 rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-primary-muted text-primary grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold">
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{exercise.title}</p>
          <Badge variant="outline">{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
        </div>
      </div>

      <div className="text-sm">
        <Markdown content={exercise.statement_md} />
      </div>

      {exercise.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={exercise.media_url} alt="" className="w-full rounded-lg border" loading="lazy" />
      )}

      <div className="space-y-2">
        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={
            exercise.kind === 'numeric' ? 'Votre résultat…' : 'Rédigez votre réponse…'
          }
          rows={exercise.kind === 'numeric' ? 2 : 4}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSolution((value) => !value)}
            aria-expanded={showSolution}
          >
            <Lightbulb />
            {showSolution ? 'Masquer le corrigé' : 'Voir le corrigé'}
            <ChevronDown className={cn('transition-transform', showSolution && 'rotate-180')} />
          </Button>
          <Button
            size="sm"
            loading={pending}
            disabled={answer.trim().length === 0}
            onClick={() => handleSubmit()}
          >
            Valider ma réponse
          </Button>
        </div>
      </div>

      {submitted?.correct !== null && submitted !== null && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium',
            submitted.correct ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger',
          )}
        >
          {submitted.correct ? 'Réponse correcte.' : 'Réponse incorrecte.'}
        </div>
      )}

      {showSolution && (
        <div className="bg-muted animate-fade-in space-y-3 rounded-lg p-4 text-sm">
          {exercise.solution_md ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">Corrigé</p>
              <Markdown content={exercise.solution_md} />
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun corrigé fourni pour cet exercice.</p>
          )}

          {exercise.explanation_md && (
            <div className="border-t pt-3">
              <p className="mb-1.5 text-xs font-semibold tracking-wide uppercase">Explication</p>
              <Markdown content={exercise.explanation_md} />
            </div>
          )}

          {submitted === null && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-muted-foreground text-xs">Comment vous en êtes-vous sorti ?</span>
              <Button size="sm" variant="secondary" onClick={() => handleSubmit(2)}>
                Réussi
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleSubmit(1)}>
                Partiellement
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleSubmit(0)}>
                Raté
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
