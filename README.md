# AtelierDigital — Académie business en ligne

Plateforme de formation complète : **création de produit digital, media buying,
marketing digital, vente et conversion**. Cours vidéo structurés, suivi de
progression, quiz corrigés, exercices, notes horodatées, favoris, gamification
et espace d'administration.

La formation se vend en dehors de la plateforme ; l'accès se débloque par
**code d'activation**. Aucun paiement ne transite par l'application.

---

## État du projet

| | |
|---|---|
| Build de production | ✅ |
| Vérification des types (`strict`) | ✅ 0 erreur |
| ESLint | ✅ 0 erreur |
| Tests unitaires | ✅ 33 |
| Tests SQL — logique métier | ✅ 18, contre PostgreSQL 16 réel |
| Tests SQL — sécurité RLS | ✅ 27, contre PostgreSQL 16 réel |
| Catalogue de démonstration | 22 formations · 254 leçons · 50 h · 13 quiz |

---

## Démarrage rapide

```bash
npm install
cp .env.example .env.local     # renseignez vos clés Supabase
npm run dev
```

La mise en production complète — création du projet Supabase, schéma, premier
administrateur, déploiement Vercel, hébergement des vidéos — est décrite pas à
pas dans **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**. Coût : **0 €/mois**.

---

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, vérification du coût, couches applicatives, arborescence, rôles et sécurité, architecture vidéo, design system, performance, SEO |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schéma PostgreSQL : 34 tables, 2 vues, 59 policies RLS, fonctions métier, contrôle d'accès |
| [`docs/CONTENT.md`](docs/CONTENT.md) | Catalogue : parcours, domaines, formations, badges, landing page |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Mise en production de zéro à en ligne |
| [`tests/README.md`](tests/README.md) | Exécution des tests SQL et unitaires |

---

## Hiérarchie du contenu

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

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Supabase (PostgreSQL, Auth, Storage, RLS) · Vercel

---

## Modèle d'accès

| | Non connecté | Membre sans code | Membre avec code |
|---|---|---|---|
| Catalogue et **programme détaillé** | ✅ | ✅ | ✅ |
| Leçons en accès libre | ✅ | ✅ | ✅ |
| Vidéos, ressources, quiz, exercices | ❌ | 🔒 | ✅ |

Le programme reste public : c'est l'argument de vente. Le verrouillage est
appliqué par les policies PostgreSQL, jamais par du code client.

---

## Sécurité — ce qui est vérifié par les tests

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

---

## Scripts

```bash
npm run dev         # développement
npm run build       # build de production
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run test        # tests unitaires (Vitest)
npm run format      # Prettier
```

---

## Architecture en une phrase

```
app/ (routes) → components/ (présentation pure) → server/actions/ (écritures)
             → server/services/ (métier) → server/db/ (lecture) → Supabase
```

Une règle ESLint interdit à un composant d'importer la couche données : la
séparation ne repose pas sur la discipline.
