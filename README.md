# AtelierDigital — Académie business en ligne

Plateforme de formation complète : **création de produit digital, media buying,
marketing digital, vente et conversion**. Cours vidéo structurés, suivi de
progression, quiz corrigés, exercices, notes horodatées, favoris, gamification
et espace d'administration.

La formation se vend en dehors de la plateforme ; l'accès se débloque par
**code d'activation**. Aucun paiement ne transite par l'application.

---

## Table des matières

1. [État du projet](#état-du-projet)
2. [Prérequis](#prérequis)
3. [Installation en 5 minutes](#installation-en-5-minutes)
4. [Variables d'environnement](#variables-denvironnement)
5. [Base de données](#base-de-données)
6. [Scripts disponibles](#scripts-disponibles)
7. [Architecture](#architecture)
8. [Modèle d'accès](#modèle-daccès)
9. [Sécurité](#sécurité)
10. [Vidéos](#vidéos)
11. [Déploiement](#déploiement)
12. [Documentation](#documentation)
13. [Dépannage](#dépannage)

---

## État du projet

| | |
|---|---|
| Build de production | ✅ |
| Vérification des types (`strict`) | ✅ 0 erreur |
| ESLint | ✅ 0 erreur (4 avertissements informatifs) |
| Tests unitaires | ✅ 33 |
| Tests SQL — logique métier | ✅ 18, contre PostgreSQL 16 réel |
| Tests SQL — sécurité RLS | ✅ 27, contre PostgreSQL 16 réel |
| Tests SQL — robustesse de l'auth | ✅ 8, contre PostgreSQL 16 réel |
| Rendu navigateur | ✅ 8 pages, clair/sombre, desktop/mobile, 0 erreur console |
| Catalogue de démonstration | 22 formations · 254 leçons · 50 h · 13 quiz |

---

## Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| **Node.js** | 20 ou plus (22 recommandé) | Next.js 16 |
| **npm** | 10+ | fourni avec Node |
| **Compte Supabase** | palier gratuit | base, authentification, fichiers |
| `psql` | 16 *(facultatif)* | charger le schéma en une commande |

Vérifiez : `node -v && npm -v`

---

## Installation en 5 minutes

```bash
# 1. Récupérer le code
git clone https://github.com/<vous>/<votre-depot>.git
cd <votre-depot>
npm install

# 2. Créer le fichier d'environnement
cp .env.example .env.local

# 3. Renseigner vos clés Supabase dans .env.local (voir section suivante)

# 4. Lancer
npm run dev
```

L'application démarre sur <http://localhost:3000>.

> **Sans base configurée**, l'application démarre quand même : la page
> d'accueil, la connexion et l'inscription s'affichent. Le catalogue restera
> vide tant que le schéma et les données ne sont pas chargés — voir
> [Base de données](#base-de-données).

---

## Variables d'environnement

Toutes les variables vivent dans **`.env.local`** (ignoré par git), créé à
partir de **`.env.example`** :

```bash
cp .env.example .env.local
```

### Les 4 variables obligatoires

| Variable | Où la trouver | Exposée au navigateur |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem → **Project API keys → `anon` `public`** | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | idem → **Project API keys → `service_role`** | **NON** |
| `NEXT_PUBLIC_SITE_URL` | vous la choisissez | oui |

Exemple de `.env.local` complet en développement :

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Détail de chaque variable

#### `NEXT_PUBLIC_SUPABASE_URL` — obligatoire

L'adresse de votre projet Supabase, de la forme
`https://<référence>.supabase.co`. Publique : elle apparaît dans le code envoyé
au navigateur, c'est normal.

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY` — obligatoire

La clé publique utilisée par le navigateur et par le serveur pour les requêtes
ordinaires.

**Elle est publique par conception.** Ce ne sont pas les clés qui protègent vos
données, ce sont les *Row Level Security policies* de PostgreSQL. C'est
précisément ce que vérifient les 27 tests de `tests/sql/02_security_rls.sql` :
même avec cette clé et une requête forgée à la main, un membre ne voit rien de
ce qui ne lui appartient pas.

#### `SUPABASE_SERVICE_ROLE_KEY` — obligatoire

> ⚠️ **Cette clé contourne toutes les règles de sécurité.** Quiconque la
> possède peut lire, modifier et supprimer l'intégralité de la base.

Trois règles :

1. **Jamais** de préfixe `NEXT_PUBLIC_` — elle partirait dans le navigateur.
2. **Jamais** dans un composant client. Le module `src/lib/supabase/admin.ts`
   qui l'utilise commence par `import 'server-only'` : la compilation échoue si
   quelqu'un tente de l'importer côté client. La protection est mécanique, pas
   une consigne.
3. **Si elle fuite**, régénérez-la immédiatement : Supabase →
   Project Settings → API → *Reset service_role key*.

Elle ne sert qu'à une chose dans l'application : lire les adresses e-mail des
membres depuis `auth.users`, table hors de portée de la RLS, pour l'écran
d'administration.

#### `NEXT_PUBLIC_SITE_URL` — obligatoire

L'URL publique du site, **sans barre oblique finale**.

Elle sert aux liens de confirmation d'e-mail, aux liens de réinitialisation de
mot de passe, au `sitemap.xml` et aux images Open Graph.

> **Piège le plus fréquent.** Cette valeur doit correspondre **exactement** à la
> *Site URL* configurée dans Supabase → Authentication → URL Configuration.
> Si elles diffèrent, les liens reçus par e-mail renverront vers la mauvaise
> adresse — typiquement vers `localhost` en production.

| Contexte | Valeur |
|---|---|
| Développement | `http://localhost:3000` |
| Préproduction Vercel | `https://votre-projet.vercel.app` |
| Production | `https://votre-domaine.com` |

En l'absence de cette variable, l'application se rabat sur `VERCEL_URL`
(fournie automatiquement par Vercel), puis sur `http://localhost:3000`.
Ce repli dépanne, mais définissez-la explicitement en production.

### Les 2 variables facultatives

#### `NEXT_PUBLIC_CF_STREAM_CUSTOMER`

Nécessaire **uniquement** si vous utilisez le fournisseur vidéo
`cloudflare_stream` (service payant). C'est l'identifiant client visible dans
les URL Stream :

```
https://customer-<CET-IDENTIFIANT>.cloudflarestream.com/...
```

Laissez-la absente pour démarrer : les fournisseurs *Fichier direct*,
*YouTube* et *Google Drive* n'en ont pas besoin.

#### `ANTHROPIC_API_KEY`

Réservée à l'assistant IA, **non activé en v1**. Tant que cette variable est
absente, `isAIEnabled()` renvoie `false` et aucune fonctionnalité IA n'apparaît
dans l'interface. **L'application ne dépend d'aucune API payante pour
fonctionner.**

### Où déclarer ces variables selon l'environnement

| Environnement | Où |
|---|---|
| Votre machine | `.env.local` à la racine |
| Vercel | Project Settings → **Environment Variables** (cochez *Production*, *Preview* et *Development*) |
| GitHub Actions | La CI utilise des valeurs factices : le build ne contacte pas la base. Rien à configurer. |

> Sur Vercel, les variables sont lues **au moment du build**. Après en avoir
> ajouté ou modifié une, il faut **redéployer** pour qu'elle soit prise en
> compte.

### Un secret GitHub, séparément

Le workflow `.github/workflows/keepalive.yml` empêche la mise en pause d'un
projet Supabase gratuit après 7 jours d'inactivité. Il a besoin d'un secret :

**Dépôt GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Nom | Valeur |
|---|---|
| `SITE_URL` | l'URL de production, sans barre oblique finale |

Sans ce secret le workflow ne fait rien et n'échoue pas — mais votre base
finira en pause.

### Vérifier que tout est bon

```bash
npm run dev
```

Si une variable obligatoire manque, le serveur démarre mais **la première page
renvoie une erreur 500 nommant précisément la variable en cause** — plutôt
qu'un message obscur venant de la couche réseau :

```
Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_URL.
Copiez .env.example vers .env.local et renseignez-la.
```

Ce contrôle vit dans `src/lib/env.ts` (comportement vérifié en retirant la
variable et en observant la réponse réelle).

---

## Base de données

### 1. Créer le schéma

Les migrations s'appliquent **dans l'ordre**, **une seule fois**.

**Méthode A — éditeur SQL Supabase** (aucune installation) : *SQL Editor →
New query*, puis collez et exécutez chaque fichier de `supabase/migrations/`
dans l'ordre numérique, de `0001` à `0011`.

**Méthode B — `psql`** (une commande). L'URL est dans
*Project Settings → Database → Connection string → URI* :

```bash
export DATABASE_URL="postgresql://postgres.[ref]:[mot-de-passe]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

### 2. Charger le catalogue de démonstration

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

22 formations, 254 leçons, 13 quiz, 13 badges et 3 codes d'activation de test
(`DEMO-FULL-2026`, `DEMO-YEAR-2026`, `DEMO-MEDIA-BUY`).

Le seed est **rejouable** : le relancer met à jour le contenu sans créer de
doublon.

> Les URL de vidéos pointent vers `demo.invalid`, un domaine qui n'existe pas.
> Les lecteurs afficheront une erreur tant que vous n'aurez pas saisi vos
> propres vidéos. C'est volontaire : mieux vaut une erreur visible qu'une
> vidéo d'exemple qu'on oublie de remplacer.

### 3. Vérifier

```sql
-- 34 tables attendues
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';

-- Doit ne renvoyer AUCUNE ligne : une table sans RLS est lisible par tous
select tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
```

### 4. Créer le premier administrateur

Inscrivez-vous normalement via `/register`, puis dans l'éditeur SQL Supabase :

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'vous@exemple.com');
```

Cette requête ne fonctionne **que** depuis l'éditeur SQL. Un trigger empêche
tout membre connecté de modifier son propre rôle depuis l'application, y
compris par une requête forgée. C'est le seul chemin d'amorçage, et il est
volontairement hors de portée du navigateur.

---

## Scripts disponibles

```bash
npm run dev         # serveur de développement
npm run build       # build de production
npm run start       # servir le build
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run test        # tests unitaires (Vitest)
npm run test:watch  # tests en continu
npm run format      # Prettier
```

Tests de la base contre PostgreSQL — voir [`tests/README.md`](tests/README.md) :

```bash
psql "$DATABASE_URL" -f tests/sql/01_business_logic.sql
psql "$DATABASE_URL" -f tests/sql/02_security_rls.sql
psql "$DATABASE_URL" -f tests/sql/03_auth_recovery.sql
```

---

## Architecture

```
app/ (routes)  →  components/ (présentation pure)
                       ↓ props / server actions
               server/actions/  (écritures, validation Zod, gardes)
                       ↓
               server/services/ (logique métier)
                       ↓
               server/db/       (lecture)
                       ↓
               lib/supabase/    (clients)
```

Une règle ESLint interdit à un composant d'importer la couche données : la
séparation ne repose pas sur la discipline.

```
src/
├── app/            33 routes (marketing, auth, application, admin, api)
├── components/     76 composants — ui/, layout/, course/, player/, quiz/…
├── server/         actions, services, db, auth
├── lib/            supabase/, video/, utils/, constants/, ai/
├── types/          database.types.ts (généré) + domain.ts
└── validations/    schémas Zod partagés client ↔ serveur
supabase/
├── migrations/     10 fichiers — 34 tables, 59 policies RLS
└── seed.sql        catalogue de démonstration
tests/
├── sql/            logique métier et sécurité, contre PostgreSQL réel
└── unit/           logique pure (Vitest)
```

### Hiérarchie du contenu

```
Parcours → Domaine → Formation → Module → Chapitre → Leçon
                                                       ├── Vidéo(s)
                                                       ├── Contenu écrit
                                                       ├── Ressources
                                                       ├── Exercices
                                                       └── Quiz
```

Exemple : `Intermédiaire → Media Buying → Meta Ads de A à Z → Structure de
campagne → ABO ou CBO → Passer en CBO sans tout casser`

---

## Modèle d'accès

| | Non connecté | Membre sans code | Membre avec code |
|---|:---:|:---:|:---:|
| Catalogue et **programme détaillé** | ✅ | ✅ | ✅ |
| Leçons en accès libre | ✅ | ✅ | ✅ |
| Vidéos, ressources, quiz, exercices | ❌ | 🔒 | ✅ |

Le programme reste public : c'est l'argument de vente. Le verrouillage est
appliqué par les policies PostgreSQL, jamais par du code client.

Vous encaissez où vous voulez (Stripe Payment Link, Systeme.io, virement),
puis vous générez un code depuis **Administration → Codes d'accès**. Portée
réglable : catalogue complet, un domaine ou une formation ; durée réglable :
à vie ou limitée.

---

## Sécurité

`tests/sql/02_security_rls.sql` s'exécute contre une vraie base et vérifie
qu'un membre ne peut pas :

- voir une vidéo, un quiz ou une ressource d'une formation non débloquée ;
- lire `answers.is_correct` — donc connaître les réponses avant de répondre ;
- lire `lessons.content_md` ou la solution d'un exercice sans y avoir droit ;
- énumérer les codes d'activation ;
- s'inventer un score de quiz, de l'XP ou une inscription ;
- se promouvoir administrateur ;
- consulter les notes, la progression ou les accès d'un autre membre.

Ces garanties tiennent au niveau de la base : elles résistent à une requête
forgée depuis le navigateur, pas seulement à l'interface.

L'accès à l'administration est protégé par quatre barrières successives :
proxy (redirection), garde de layout serveur, garde dans chaque server action,
et RLS PostgreSQL. Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §4.

---

## Vidéos

La base ne stocke **que des métadonnées** ; les fichiers vivent chez un
fournisseur. Quatre sont gérés, avec leurs capacités réelles déclarées :

| Fournisseur | Reprise | Vitesse | Suivi | Coût |
|---|:---:|:---:|:---:|---|
| **Fichier direct** (MP4/HLS, ex. Cloudflare R2) | ✅ | ✅ | ✅ | 0 € jusqu'à 10 Go |
| **YouTube non répertorié** | ✅ | ✅ | ✅ | 0 € illimité |
| **Google Drive** | ❌ | ❌ | ❌ | 0 € |
| **Cloudflare Stream** | ✅ | ✅ | ✅ | payant |

L'iframe de Google Drive n'expose aucune API JavaScript : ni reprise de
lecture, ni réglage de vitesse, ni suivi de progression. Le formulaire
d'ajout affiche ces limites et l'interface bascule sur le bouton
« Marquer comme terminé ». C'est assumé, pas caché.

Ajouter un fournisseur = un fichier dans `src/lib/video/providers/` et une
ligne dans `registry.ts`. Aucun composant, aucune page, aucune table ne change.

---

## Déploiement

Guide complet, de zéro à en ligne : **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

Coût vérifié poste par poste : **0 €/mois**.

| Service | Palier gratuit |
|---|---|
| Vercel Hobby | 100 Go de bande passante/mois |
| Supabase Free | 500 Mo de base, 1 Go de fichiers, 50 000 utilisateurs actifs/mois |
| Cloudflare R2 | 10 Go, **sortie de données gratuite** |
| GitHub | dépôt privé + Actions |

Deux limites à connaître dès maintenant :

- un projet **Supabase gratuit est mis en pause après 7 jours d'inactivité** —
  le workflow `keepalive.yml` l'en empêche (secret `SITE_URL`) ;
- le palier **Hobby de Vercel est réservé à un usage non commercial**. Le code
  n'utilise aucune API propriétaire Vercel : la migration vers Cloudflare
  Workers via `@opennextjs/cloudflare` reste possible sans réécriture.

---

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, vérification du coût, couches, arborescence, rôles et sécurité, architecture vidéo, design system, performance, SEO |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schéma PostgreSQL : 34 tables, 2 vues, 59 policies RLS, fonctions métier, contrôle d'accès |
| [`docs/CONTENT.md`](docs/CONTENT.md) | Catalogue : parcours, domaines, formations, badges, landing page |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Mise en production pas à pas |
| [`tests/README.md`](tests/README.md) | Exécution des tests SQL et unitaires |

---

## Dépannage

**Erreur 500 : `Variable d'environnement manquante : …`**
La variable n'est pas dans `.env.local`, ou pas définie sur Vercel. Sur Vercel,
ajoutez-la **puis redéployez** : les variables sont lues au build.

### L'authentification ne fonctionne pas

L'application affiche désormais un message explicite pour chaque cause. Lisez-le
d'abord : il désigne le réglage à corriger.

| Message affiché sur `/login` | Cause | Correction |
|---|---|---|
| « Ce lien a expiré ou a déjà été utilisé » | Lien de confirmation périmé (24 h par défaut) ou déjà cliqué | Demandez un nouvel e-mail |
| « Ce lien est incomplet » | Le lien a été recopié à la main, ou ouvert dans un autre navigateur que celui de l'inscription | Cliquez sur le lien directement depuis l'e-mail, dans le même navigateur |
| « Le service d'authentification a refusé ce lien » | L'URL de callback n'est pas déclarée dans le projet Supabase | Ajoutez `https://votre-domaine.com/callback` dans **Authentication → URL Configuration → Redirect URLs** |
| « Ce compte a été désactivé » | `profiles.is_active = false` | Réactivez le compte depuis **Administration → Membres** |
| « Votre compte n'a pas pu être initialisé » | Aucune ligne `profiles` pour ce compte | La migration `0011` répare automatiquement ; vérifiez qu'elle est appliquée |

**Les trois vérifications qui résolvent la grande majorité des cas :**

1. **Site URL et Redirect URLs.** Dans Supabase → Authentication → URL
   Configuration :
   - *Site URL* = exactement la valeur de `NEXT_PUBLIC_SITE_URL`
   - *Redirect URLs* contient `https://votre-domaine.com/callback`
     **et** `http://localhost:3000/callback`

   L'oubli du `/callback` dans les Redirect URLs est la cause la plus fréquente.

2. **Confirmation d'e-mail.** Si *Confirm email* est activé (Authentication →
   Providers → Email), un compte non confirmé ne peut pas se connecter. En
   développement, désactivez-la pour éviter d'attendre un e-mail à chaque test.

3. **Quota d'e-mails.** Le service intégré de Supabase est limité à quelques
   messages par heure et sert uniquement aux tests. Au-delà, les e-mails ne
   partent plus — silencieusement. Branchez un SMTP (Resend, Brevo : palier
   gratuit suffisant) dans **Project Settings → Authentication → SMTP Settings**.

**Comptes créés avant la migration `0006`** — depuis le tableau de bord
Supabase, par exemple — n'ont pas de ligne `profiles` : le trigger n'existait
pas encore. La migration `0011` les répare rétroactivement et installe une
fonction d'auto-réparation. Pour vérifier qu'il n'en reste aucun :

```sql
select count(*) from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
-- attendu : 0
```

**Boucle de redirection entre `/login` et `/dashboard`**
Symptôme d'un compte sans profil, corrigé par la migration `0011`. Si elle n'est
pas encore appliquée, faites-le : les redirections passent désormais par
`/logout`, qui efface réellement la session au lieu de la laisser en place.

---

**Le lien de confirmation d'e-mail renvoie vers `localhost`**
La *Site URL* de Supabase (Authentication → URL Configuration) est restée sur
`http://localhost:3000`. Elle doit correspondre à `NEXT_PUBLIC_SITE_URL`.

**`Invalid API key` au démarrage**
Une clé a été copiée partiellement. Les clés Supabase sont des JWT longs qui
commencent par `eyJ`. Recopiez-les entièrement.

**Le catalogue est vide**
Le seed n'a pas été chargé : `psql "$DATABASE_URL" -f supabase/seed.sql`.

**Les vidéos ne se lancent pas**
Attendu tant que le seed de démonstration est en place (`demo.invalid`).
Remplacez les URL depuis l'administration.

**`permission denied for table …`**
La migration `0009_rls.sql` n'a pas été appliquée, ou l'a été partiellement.
Rejouez-la : les policies sont rejouables sans erreur.

**Je n'ai pas accès à `/admin` (404)**
Le compte n'est pas administrateur. Voir
[Créer le premier administrateur](#4-créer-le-premier-administrateur).
Un 404 plutôt qu'un 403 est volontaire : cela ne révèle pas l'existence de la
zone.

**La base ne répond plus après quelques jours**
Projet Supabase mis en pause. Réactivez-le depuis le tableau de bord, puis
vérifiez que le secret GitHub `SITE_URL` est bien défini.
