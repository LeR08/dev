import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Configuration ESLint « flat » — eslint-config-next 16 l'expose nativement,
 * sans passer par FlatCompat.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'supabase/**',
      // Fichier généré depuis les migrations : ne pas le lint ni l'éditer.
      'src/types/database.types.ts',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Règle d'architecture (docs/ARCHITECTURE.md §2.1) : la couche présentation
    // n'accède jamais directement à la base. Les données arrivent en props
    // depuis un Server Component, les écritures passent par une server action.
    // Sans cette règle, la séparation des couches ne tiendrait que par
    // discipline — c'est-à-dire pas longtemps.
    files: ['src/components/**/*.tsx'],
    rules: {
      // Version typescript-eslint de la règle : `allowTypeImports` laisse
      // passer `import type`, qui disparaît à la compilation et ne crée donc
      // aucune dépendance réelle vers la couche données.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/server', '@/lib/supabase/admin', '@/server/db/*'],
              allowTypeImports: true,
              message:
                "Un composant n'accède jamais à la base directement : recevez les données en props, ou passez par une server action.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
