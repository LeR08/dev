# EduLearn — Académie business en ligne

Plateforme de formation : **création de produit digital, media buying, marketing digital,
vente et conversion**. Cours vidéo structurés, progression, quiz, exercices, notes, favoris,
gamification, espace d'administration complet.

Formation vendue en dehors de la plateforme ; l'accès se débloque par **code d'activation**.

**Statut : ÉTAPE 1 — conception.** Aucun code applicatif n'est encore écrit.

## Documentation

| Document | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, vérification du coût 0 €, couches applicatives, arborescence, rôles et sécurité, architecture vidéo, design system, performance, SEO, plan de développement |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schéma PostgreSQL : 26 tables, 2 vues, relations, index, fonctions, triggers, contrôle d'accès, RLS |
| [`docs/CONTENT.md`](docs/CONTENT.md) | Catalogue : 3 parcours, 5 domaines, 18 formations, badges, landing page |

## Hiérarchie du contenu

```
Parcours → Domaine → Formation → Module → Chapitre → Leçon → Vidéo / Ressources / Quiz / Exercices
```

Exemple : `Intermédiaire → Media Buying → Meta Ads de A à Z → Structure de campagne → ABO ou CBO → Passer en CBO`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + Storage + RLS) · Vercel

## Modèle d'accès

| | Non connecté | Membre sans code | Membre avec code |
|---|---|---|---|
| Catalogue et programme détaillé | ✅ | ✅ | ✅ |
| Leçons en accès libre | ✅ | ✅ | ✅ |
| Vidéos, ressources, quiz, exercices | ❌ | 🔒 | ✅ |

Verrouillage assuré par les policies PostgreSQL (`has_course_access()`), pas côté client.

## Prochaine étape

Étape 2 — initialisation du projet et de la base technique, après validation de la conception.
