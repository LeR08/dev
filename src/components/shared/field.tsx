'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>
      {/*
        L'identifiant n'est posé que si l'enfant n'en a pas déjà un.
        Certains champs sont enveloppés dans un <div> (mot de passe avec bouton
        « afficher », par exemple) : coller l'id sur cette enveloppe créerait un
        identifiant en double et casserait l'association <label for> — le clic
        sur le libellé ne donnerait plus le focus au champ.
      */}
      {React.isValidElement(children) && isFormControl(children) && !hasOwnId(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const NATIVE_CONTROLS = new Set(['input', 'textarea', 'select']);

/**
 * L'`id` et les attributs ARIA ne sont posés que sur un vrai contrôle de
 * formulaire.
 *
 * Certains champs sont enveloppés dans un <div> — le mot de passe avec son
 * bouton « afficher », par exemple. Cloner l'id sur cette enveloppe créerait
 * un identifiant en double et casserait l'association <label for> : le clic
 * sur le libellé ne donnerait plus le focus au champ. Dans ce cas, l'appelant
 * pose lui-même l'id et appelle `fieldAria()` sur le contrôle réel.
 *
 * Un composant personnalisé (Input, Textarea, Select…) transmet ses props au
 * contrôle sous-jacent : on peut le cloner sans risque.
 */
function isFormControl(element: React.ReactElement): boolean {
  return typeof element.type === 'string'
    ? NATIVE_CONTROLS.has(element.type)
    : true;
}

function hasOwnId(element: React.ReactElement): boolean {
  return Boolean((element.props as { id?: string } | undefined)?.id);
}

/**
 * Attributs ARIA à poser à la main sur un contrôle enveloppé, pour rester
 * cohérent avec ce que Field applique automatiquement ailleurs.
 */
export function fieldAria(htmlFor: string, options: { error?: string; hint?: boolean }) {
  const hintId = options.hint ? `${htmlFor}-hint` : undefined;
  const errorId = options.error ? `${htmlFor}-error` : undefined;
  return {
    'aria-invalid': options.error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

export function PasswordInputHint() {
  return (
    <span>8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre.</span>
  );
}
