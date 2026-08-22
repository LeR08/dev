# EduLearn — Plateforme éducative

Plateforme d'apprentissage (LMS) : cours vidéo structurés, progression, quiz, notes, favoris,
gamification et espace d'administration complet.

**Statut : ÉTAPE 1 — conception.** Aucun code applicatif n'est encore écrit.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, vérification du coût 0 €, couches applicatives, arborescence, rôles et sécurité, architecture vidéo, design system, performance, SEO, plan de développement |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schéma PostgreSQL complet : 23 tables, relations, contraintes, index, fonctions, triggers, RLS, données de démonstration |

## Hiérarchie du contenu

```
Niveau → Matière → Cours → Module → Chapitre → Leçon → Vidéo / Ressources / Quiz / Exercices
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + Storage + RLS) · Vercel

## Prochaine étape

Étape 2 — initialisation du projet et de la base technique, après validation de la conception.
