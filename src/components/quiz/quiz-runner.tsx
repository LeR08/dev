'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { submitQuiz } from '@/server/actions/assessment.actions';
import { routes } from '@/lib/constants/routes';
import { cn, formatTimecode, pluralize } from '@/lib/utils';
import type { QuizResult } from '@/types/domain';
import type { Enums } from '@/types/database.types';

interface QuizQuestion {
  id: string;
  type: Enums<'question_type'>;
  prompt: string;
  media_url: string | null;
  points: number;
  answers: Array<{ id: string; label: string }>;
}

interface QuizRunnerProps {
  quizId: string;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitSeconds: number | null;
  shuffleQuestions: boolean;
  questions: QuizQuestion[];
  courseSlug: string | null;
  lessonId: string | null;
  attemptsUsed: number;
  maxAttempts: number | null;
}

type Responses = Record<string, { answer_ids: string[]; text: string }>;

export function QuizRunner({
  quizId,
  title,
  description,
  passingScore,
  timeLimitSeconds,
  shuffleQuestions,
  questions: rawQuestions,
  courseSlug,
  lessonId,
  attemptsUsed,
  maxAttempts,
}: QuizRunnerProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Le mélange est calculé une seule fois par montage : les questions ne
  // doivent pas se réorganiser à chaque rendu.
  const questions = React.useMemo(
    () => (shuffleQuestions ? shuffle(rawQuestions) : rawQuestions),
    [rawQuestions, shuffleQuestions],
  );

  const [index, setIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<Responses>({});
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const [pending, setPending] = React.useState(false);
  const [remaining, setRemaining] = React.useState(timeLimitSeconds ?? 0);

  const question = questions[index];
  const answeredCount = questions.filter((q) => isAnswered(responses[q.id], q.type)).length;

  const handleSubmit = React.useCallback(async () => {
    setPending(true);
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer_ids: responses[q.id]?.answer_ids ?? [],
      text: responses[q.id]?.text ?? '',
    }));

    const response = await submitQuiz({ quizId, responses: payload });
    setPending(false);

    if (!response.ok) {
      toast({ title: 'Envoi impossible', description: response.error, tone: 'error' });
      return;
    }

    setResult(response.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.refresh();
  }, [questions, responses, quizId, toast, router]);

  // Chronomètre : envoi automatique à l'expiration, jamais de perte de copie.
  React.useEffect(() => {
    if (!timeLimitSeconds || result) return;

    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimitSeconds, result, handleSubmit]);

  function setAnswer(questionId: string, update: Partial<{ answer_ids: string[]; text: string }>) {
    setResponses((current) => ({
      ...current,
      [questionId]: {
        answer_ids: update.answer_ids ?? current[questionId]?.answer_ids ?? [],
        text: update.text ?? current[questionId]?.text ?? '',
      },
    }));
  }

  if (result) {
    return (
      <QuizResultView
        result={result}
        questions={questions}
        responses={responses}
        title={title}
        courseSlug={courseSlug}
        lessonId={lessonId}
        canRetry={maxAttempts === null || attemptsUsed + 1 < maxAttempts}
        onRetry={() => {
          setResult(null);
          setResponses({});
          setIndex(0);
          setRemaining(timeLimitSeconds ?? 0);
        }}
      />
    );
  }

  if (!question) {
    return <Alert variant="warning">Ce quiz ne contient encore aucune question.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          {timeLimitSeconds && (
            <Badge variant={remaining < 60 ? 'danger' : 'default'} className="shrink-0 text-sm">
              <Clock /> {formatTimecode(remaining)}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <Progress value={((index + 1) / questions.length) * 100} size="sm" />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>
              Question {index + 1} sur {questions.length}
            </span>
            <span>
              {answeredCount} {pluralize(answeredCount, 'réponse')} sur {questions.length}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card space-y-5 rounded-xl border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="bg-primary-muted text-primary grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium">{question.prompt}</p>
            <p className="text-muted-foreground text-xs">
              {question.type === 'multiple_choice'
                ? 'Plusieurs réponses possibles'
                : question.type === 'short_answer'
                  ? 'Réponse libre'
                  : 'Une seule réponse'}
              {' · '}
              {question.points} {pluralize(question.points, 'point')}
            </p>
          </div>
        </div>

        {question.media_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.media_url} alt="" className="w-full rounded-lg border" loading="lazy" />
        )}

        <QuestionInput
          question={question}
          value={responses[question.id]}
          onChange={(update) => setAnswer(question.id, update)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          <ArrowLeft /> Précédent
        </Button>

        <div className="flex items-center gap-2">
          {index < questions.length - 1 ? (
            <Button onClick={() => setIndex((value) => value + 1)}>
              Suivant <ArrowRight />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={pending}>
              <Send /> Terminer le quiz
            </Button>
          )}
        </div>
      </div>

      {/* Navigation rapide : indispensable dès une dizaine de questions. */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Aller à la question ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            className={cn(
              'size-8 rounded-md border text-xs font-medium tabular-nums transition-colors',
              i === index && 'border-primary bg-primary text-primary-foreground',
              i !== index && isAnswered(responses[q.id], q.type) && 'bg-primary-muted text-primary border-transparent',
              i !== index && !isAnswered(responses[q.id], q.type) && 'text-muted-foreground hover:bg-muted',
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {answeredCount < questions.length && index === questions.length - 1 && (
        <Alert variant="warning">
          {questions.length - answeredCount} question(s) sans réponse. Les questions non répondues
          sont comptées comme fausses.
        </Alert>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuizQuestion;
  value?: { answer_ids: string[]; text: string };
  onChange: (update: Partial<{ answer_ids: string[]; text: string }>) => void;
}) {
  if (question.type === 'short_answer') {
    return (
      <Input
        value={value?.text ?? ''}
        onChange={(event) => onChange({ text: event.target.value })}
        placeholder="Votre réponse…"
        maxLength={500}
        aria-label="Votre réponse"
      />
    );
  }

  if (question.type === 'multiple_choice') {
    const selected = value?.answer_ids ?? [];
    return (
      <ul className="space-y-2">
        {question.answers.map((answer) => {
          const checked = selected.includes(answer.id);
          return (
            <li key={answer.id}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors',
                  checked ? 'border-primary bg-primary-muted' : 'hover:bg-muted',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange({
                      answer_ids: next === true
                        ? [...selected, answer.id]
                        : selected.filter((id) => id !== answer.id),
                    })
                  }
                />
                <span>{answer.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <RadioGroup
      value={value?.answer_ids[0] ?? ''}
      onValueChange={(next) => onChange({ answer_ids: [next] })}
      className="space-y-2"
    >
      {question.answers.map((answer) => {
        const checked = value?.answer_ids[0] === answer.id;
        return (
          <label
            key={answer.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors',
              checked ? 'border-primary bg-primary-muted' : 'hover:bg-muted',
            )}
          >
            <RadioGroupItem value={answer.id} />
            <span>{answer.label}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function QuizResultView({
  result,
  questions,
  responses,
  title,
  courseSlug,
  lessonId,
  canRetry,
  onRetry,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  responses: Responses;
  title: string;
  courseSlug: string | null;
  lessonId: string | null;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const detailsById = new Map(result.details.map((detail) => [detail.question_id, detail]));
  const wrong = questions.filter((q) => !detailsById.get(q.id)?.is_correct);

  return (
    <div className="space-y-7">
      <div
        className={cn(
          'space-y-4 rounded-xl border p-6 text-center',
          result.passed ? 'bg-success-muted border-transparent' : 'bg-muted',
        )}
      >
        <div
          className={cn(
            'mx-auto grid size-14 place-items-center rounded-full',
            result.passed ? 'bg-success text-success-foreground' : 'bg-danger text-danger-foreground',
          )}
        >
          {result.passed ? <Check className="size-7" strokeWidth={3} /> : <AlertCircle className="size-7" />}
        </div>

        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums">
            {Math.round(result.score)} / {Math.round(result.max_score)}
          </p>
          <p className="text-2xl font-medium tabular-nums">{Math.round(result.percentage)} %</p>
          <p className={cn('text-sm', result.passed ? 'text-success' : 'text-muted-foreground')}>
            {result.passed
              ? `Quiz réussi — seuil de ${result.passing_score} % atteint. +40 XP`
              : `Seuil de réussite : ${result.passing_score} %. Revoyez les explications ci-dessous.`}
          </p>
        </div>

        <Progress
          value={result.percentage}
          tone={result.passed ? 'success' : 'primary'}
          className="mx-auto max-w-sm"
        />

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {canRetry && (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCcw /> Refaire le quiz
            </Button>
          )}
          {lessonId && (
            <Button asChild>
              <Link href={routes.lesson(lessonId)}>Retour à la leçon</Link>
            </Button>
          )}
          {!lessonId && courseSlug && (
            <Button asChild>
              <Link href={routes.course(courseSlug)}>Retour à la formation</Link>
            </Button>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {wrong.length === 0 ? 'Toutes vos réponses sont correctes' : 'Correction détaillée'}
        </h2>

        <ul className="space-y-3">
          {questions.map((question, i) => {
            const detail = detailsById.get(question.id);
            const correct = detail?.is_correct ?? false;
            const given = responses[question.id];

            return (
              <li
                key={question.id}
                className={cn(
                  'space-y-3 rounded-xl border p-4',
                  correct ? 'border-success/30' : 'border-danger/30 bg-danger-muted/25',
                )}
              >
                <div className="flex items-start gap-3">
                  {correct ? (
                    <CircleCheck className="text-success mt-0.5 size-5 shrink-0" aria-label="Correct" />
                  ) : (
                    <CircleX className="text-danger mt-0.5 size-5 shrink-0" aria-label="Incorrect" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium">
                      {i + 1}. {question.prompt}
                    </p>

                    {question.type === 'short_answer' ? (
                      <p className="text-muted-foreground text-sm">
                        Votre réponse : <span className="font-medium">{given?.text || '—'}</span>
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {question.answers.map((answer) => {
                          const isCorrectAnswer = detail?.correct_answer_ids.includes(answer.id);
                          const wasSelected = given?.answer_ids.includes(answer.id);
                          if (!isCorrectAnswer && !wasSelected) return null;
                          return (
                            <li
                              key={answer.id}
                              className={cn(
                                'flex items-center gap-2',
                                isCorrectAnswer ? 'text-success' : 'text-danger',
                              )}
                            >
                              {isCorrectAnswer ? (
                                <Check className="size-3.5 shrink-0" strokeWidth={3} />
                              ) : (
                                <CircleX className="size-3.5 shrink-0" />
                              )}
                              <span>{answer.label}</span>
                              {wasSelected && (
                                <span className="text-muted-foreground text-xs">(votre réponse)</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {!correct && detail?.correct_labels.length ? (
                      <p className="text-success text-sm">
                        Bonne réponse : {detail.correct_labels.join(', ')}
                      </p>
                    ) : null}

                    {detail?.explanation && (
                      <p className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
                        {detail.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-muted-foreground text-center text-xs">
        Tentative n° {result.attempt_number} · {title}
      </p>
    </div>
  );
}

function isAnswered(
  response: { answer_ids: string[]; text: string } | undefined,
  type: Enums<'question_type'>,
): boolean {
  if (!response) return false;
  if (type === 'short_answer') return response.text.trim().length > 0;
  return response.answer_ids.length > 0;
}

/** Fisher-Yates — mélange uniforme, contrairement à sort(() => Math.random() - 0.5). */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
