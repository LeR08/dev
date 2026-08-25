#!/usr/bin/env node
/**
 * Régénère supabase/install.sql à partir des migrations.
 *
 * install.sql n'est qu'une concaténation de commodité, pour coller le schéma
 * en une seule fois dans l'éditeur SQL de Supabase. La source de vérité reste
 * supabase/migrations/.
 *
 *   node scripts/build-install-sql.mjs         régénère le fichier
 *   node scripts/build-install-sql.mjs --check échoue s'il a dérivé (CI)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'supabase/migrations';
const OUTPUT = 'supabase/install.sql';

const header = `-- ===========================================================================
-- INSTALLATION COMPLÈTE DU SCHÉMA — AtelierDigital
--
-- Concaténation de supabase/migrations/, dans l'ordre.
-- Généré par scripts/build-install-sql.mjs : ne pas éditer à la main.
--
-- USAGE
--   Supabase Dashboard > SQL Editor > New query > coller ce fichier > Run
--   ou : psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/install.sql
--
-- Le fichier commence par une vérification préalable : si le schéma public
-- contient déjà des tables du même nom, l'exécution s'arrête avec la marche
-- à suivre, sans rien modifier.
--
-- Les données de démonstration sont dans supabase/seed.sql, à exécuter APRÈS.
-- ===========================================================================

`;

const footer = `

-- ===========================================================================
-- Récapitulatif
-- ===========================================================================
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
  (select count(*) from information_schema.views
     where table_schema = 'public')                               as vues,
  (select count(*) from pg_policies where schemaname = 'public')  as policies,
  (select count(*) from pg_tables
     where schemaname = 'public' and not rowsecurity)             as tables_sans_rls;
`;

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const body = files
  .map(
    (name) =>
      `\n-- ###########################################################################\n` +
      `-- ### ${name}\n` +
      `-- ###########################################################################\n\n` +
      `${readFileSync(join(MIGRATIONS, name), 'utf8').trimEnd()}\n`,
  )
  .join('');

const content = header + body + footer;

if (process.argv.includes('--check')) {
  const current = readFileSync(OUTPUT, 'utf8');
  if (current !== content) {
    console.error(
      `${OUTPUT} a dérivé des migrations.\n` +
        `Régénérez-le : npm run build:install-sql`,
    );
    process.exit(1);
  }
  console.log(`${OUTPUT} est à jour (${files.length} migrations).`);
} else {
  writeFileSync(OUTPUT, content);
  console.log(`${OUTPUT} régénéré depuis ${files.length} migrations.`);
}
