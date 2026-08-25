# Tests

## Tests SQL — logique métier et sécurité

Ces tests s'exécutent contre une **vraie base PostgreSQL**. Ils vérifient ce
que les tests unitaires JavaScript ne peuvent pas atteindre : le comportement
réel des triggers, des fonctions `SECURITY DEFINER`, des policies RLS et des
privilèges de colonne.

| Fichier | Vérifie |
|---|---|
| `sql/01_business_logic.sql` | Inscription, activation de code, progression vidéo, complétion en cascade, idempotence de l'XP, séries, badges, correction de quiz, exercices numériques, temps d'étude |
| `sql/02_security_rls.sql` | Isolation entre membres, verrouillage du contenu payant, impossibilité de tricher (score, XP, rôle), invisibilité des codes d'accès, accès anonyme, accès du staff |
| `sql/03_auth_recovery.sql` | Création du profil à l'inscription, réparation d'un compte sans profil, idempotence de `ensure_profile()`, absence de compte orphelin |

### Exécution contre le projet Supabase

```bash
# URL de connexion : Dashboard > Project Settings > Database > Connection string
psql "$DATABASE_URL" -f tests/sql/01_business_logic.sql
psql "$DATABASE_URL" -f tests/sql/02_security_rls.sql
psql "$DATABASE_URL" -f tests/sql/03_auth_recovery.sql
```

Les tests créent des comptes de test (`test-*@demo.invalid`, `sec-*@demo.invalid`,
`recovery-*@demo.invalid`)
et les nettoient au début de chaque exécution. Ils sont rejouables.

### Exécution en local

PostgreSQL 16 suffit — il n'est pas nécessaire d'installer Supabase. Un script
d'amorçage crée les objets que Supabase fournit d'office (`auth.users`,
`auth.uid()`, `storage.objects`, rôles `anon` / `authenticated`) :

```bash
createdb edulearn_test
psql -d edulearn_test -f tests/sql/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d edulearn_test -f "$f"; done
psql -d edulearn_test -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -d edulearn_test -f tests/sql/01_business_logic.sql
psql -v ON_ERROR_STOP=1 -d edulearn_test -f tests/sql/02_security_rls.sql
psql -v ON_ERROR_STOP=1 -d edulearn_test -f tests/sql/03_auth_recovery.sql
```

Un échec s'arrête immédiatement (`ON_ERROR_STOP`) et affiche une ligne
commençant par `ECHEC :`.

## Tests unitaires

```bash
npm run test          # une fois
npm run test:watch    # en continu
```

Ils portent sur la logique pure : formatage, calcul de niveau, résolution des
sources vidéo. Tout ce qui touche à la base est couvert par les tests SQL
ci-dessus, qui la testent réellement plutôt que de la simuler.
