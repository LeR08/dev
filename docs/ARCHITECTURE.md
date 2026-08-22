# EduLearn — Architecture technique (ÉTAPE 1)

> Document de conception validé **avant** tout développement.
> Statut : en attente de validation. Aucun code applicatif n'est encore écrit.

---

## 1. Stack technique

### 1.1 Choix retenus

| Couche | Technologie | Version (vérifiée le 2026-08-22) |
|---|---|---|
| Framework | **Next.js** (App Router, Server Components, Server Actions) | 16.3.2 |
| UI | **React** | 19.2.8 |
| Langage | **TypeScript** (`strict: true`) | 5.x |
| Styles | **Tailwind CSS v4** (config CSS-first, `@theme`) | 4.4.3 |
| Primitives UI | **Radix UI** + composants maison (pattern shadcn, code possédé, pas de dépendance lourde) | — |
| Icônes | **lucide-react** | — |
| BDD | **PostgreSQL** via **Supabase** | — |
| Auth | **Supabase Auth** + `@supabase/ssr` (cookies, SSR) | 0.12.4 |
| Client BDD | `@supabase/supabase-js` | 2.112.3 |
| Validation | **Zod** (schémas partagés client/serveur) | 4.4.3 |
| Formulaires | **react-hook-form** + `@hookform/resolvers` | — |
| État serveur (client) | **TanStack Query** — uniquement pour les écrans interactifs (admin, quiz) | 5.101.4 |
| Drag & drop admin | **@dnd-kit** (core + sortable) | 6.3.1 |
| Graphiques | **Recharts** (statistiques de progression) | — |
| Animations | **CSS/Tailwind** + `motion` ponctuellement | — |
| Thème | **next-themes** (light / dark / system) | — |
| Tests | **Vitest** (unitaire) + **Playwright** (E2E) | — |
| CI | **GitHub Actions** | — |
| Hébergement | **Vercel** (Hobby) | — |
| Stockage vidéo | **Cloudflare R2** / **YouTube non répertorié** / Google Drive | — |

### 1.2 Vérification du coût réel : **0 €**

Exigence : « 0 € pour un petit nombre d'utilisateurs, aucun service payant obligatoire ». Vérification poste par poste :

| Service | Palier gratuit | Suffisant ? | Limite à surveiller |
|---|---|---|---|
| Vercel Hobby | 100 GB bande passante/mois, builds illimités, fonctions serverless | ✅ largement | **Usage non commercial uniquement** |
| Supabase Free | 500 MB Postgres, 1 GB stockage, 5 GB egress, 50 000 MAU | ✅ | **Le projet est mis en pause après 7 jours d'inactivité** |
| Cloudflare R2 | 10 GB stockage, **egress gratuit**, 1 M opérations écriture/mois | ✅ | 10 GB ≈ 15–20 h de vidéo en 720p |
| YouTube (non répertorié) | illimité | ✅ | vidéos hébergées chez Google, brandé YouTube |
| GitHub | repos + Actions (2 000 min/mois sur repo privé) | ✅ | — |
| Domaine | `*.vercel.app` gratuit | ✅ | domaine perso ≈ 10 €/an, **optionnel** |

**Total : 0 €/mois.** Deux points d'attention que je traite dans l'architecture plutôt que de les ignorer :

1. **Mise en pause Supabase.** Un projet gratuit inactif 7 jours est suspendu. Mitigation : un workflow GitHub Actions (`keepalive.yml`) appelle `/api/health` deux fois par semaine — gratuit, 5 lignes de YAML.
2. **Vercel Hobby est non commercial.** Si la plateforme devient payante un jour, il faut migrer. Mitigation architecturale : **aucune API propriétaire Vercel** dans le code (pas de `@vercel/*`, pas d'`ISR` dépendant de leur infra, pas de KV/Blob Vercel). Le projet reste déployable sur Cloudflare Workers via `@opennextjs/cloudflare` sans réécriture.

### 1.3 Vercel plutôt que Cloudflare Pages — pourquoi

Next.js 16 App Router utilise intensivement Server Components, Server Actions, `middleware` et le streaming. Cloudflare Pages ne les exécute nativement pas : il faut l'adaptateur `@opennextjs/cloudflare`, qui fonctionne mais ajoute une couche de friction (runtime workerd, incompatibilités Node ponctuelles, debug plus difficile). Pour un projet dont l'objectif est d'être **fonctionnel et déployable**, Vercel est le chemin le plus court et reste à 0 €. La compatibilité Cloudflare est conservée comme porte de sortie (§1.2).

### 1.4 Alternatives gratuites écartées (et pourquoi)

- **Firebase** : Firestore est NoSQL, or la hiérarchie Niveau→…→Leçon et les statistiques de progression sont massivement relationnelles. Postgres + RLS est nettement supérieur ici.
- **Stocker les vidéos dans Supabase Storage** : 1 GB de quota gratuit, saturé par ~3 vidéos. Écarté (voir §5).
- **PocketBase / Appwrite auto-hébergés** : nécessitent un serveur → coût.
- **NextAuth + Postgres séparé (Neon)** : ajoute une brique d'auth à maintenir alors que Supabase Auth + RLS partagent le même moteur d'autorisation. Écarté par cohérence.

---

## 2. Architecture applicative

### 2.1 Principe de couches

Règle stricte, vérifiable en revue de code : **une dépendance ne remonte jamais.**

```
  app/          Routes, layouts, metadata, streaming  (Next.js)
     ↓
  components/   Présentation pure. NE contient JAMAIS d'accès BDD.
     ↓ (props / server actions)
  server/actions/    Frontière écriture. Auth + validation Zod + appel service.
     ↓
  server/services/   Logique métier (progression, gamification, reco, notifications)
     ↓
  server/db/         Accès données. SEUL endroit qui parle à Supabase.
     ↓
  lib/supabase/      Clients (server / browser / middleware / admin)
```

- `components/` n'importe **jamais** `@/lib/supabase`. Un lint ESLint (`no-restricted-imports`) fait respecter la règle mécaniquement.
- Les types de `types/database.types.ts` sont **générés** (`supabase gen types typescript`), jamais écrits à la main.
- `validations/` contient les schémas Zod, importés **à la fois** par le formulaire client et par la server action : une seule source de vérité.
- Pas de duplication : toute règle métier (« une leçon est terminée si… ») vit dans `server/services/`, jamais recopiée dans un composant.

### 2.2 Modes de rendu

| Type de page | Rendu | Raison |
|---|---|---|
| Landing, pages légales | Statique | SEO, gratuit à servir |
| Catalogue `/explore` | Server Component + `searchParams` | filtrable, indexable, pagination serveur |
| Fiche cours `/courses/[slug]` | Server Component + `generateMetadata` | SEO + Open Graph |
| Lecteur `/learn/[lessonId]` | Server shell + îlot client | le player doit être client, le reste non |
| Dashboard, progression | Server Component (dynamique, par utilisateur) | données privées |
| Admin | Client + TanStack Query | fortement interactif (drag & drop, édition inline) |

---

## 3. Arborescence du projet

```
edulearn/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # typecheck + lint + tests + build
│       └── keepalive.yml              # ping /api/health (anti-pause Supabase)
├── docs/
│   ├── ARCHITECTURE.md                # ce document
│   ├── DATABASE.md                    # schéma SQL complet + RLS
│   └── DEPLOYMENT.md                  # étape 12
├── public/
│   ├── icons/  images/  og-default.png
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_extensions_enums.sql
│   │   ├── 0002_identity_profiles.sql
│   │   ├── 0003_content_hierarchy.sql   # levels → … → videos, resources
│   │   ├── 0004_assessments.sql         # quizzes, questions, answers, exercises
│   │   ├── 0005_progress.sql            # lesson/video/course progress, study_sessions
│   │   ├── 0006_engagement.sql          # notes, favorites, badges, goals, notifications
│   │   ├── 0007_functions_triggers.sql  # helpers, agrégats, XP, streaks, reorder
│   │   ├── 0008_rls_policies.sql
│   │   └── 0009_storage_buckets.sql
│   └── seed.sql                        # données de démonstration (étape 4)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # <html>, ThemeProvider, fonts, Toaster
│   │   ├── globals.css                 # @theme Tailwind v4, tokens light/dark
│   │   ├── error.tsx  not-found.tsx  loading.tsx
│   │   ├── sitemap.ts  robots.ts  manifest.ts
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx              # header public + footer
│   │   │   ├── page.tsx                # landing (hero, matières, niveaux, CTA)
│   │   │   ├── about/page.tsx
│   │   │   └── legal/[slug]/page.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx              # layout centré, redirige si déjà connecté
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── onboarding/page.tsx     # choix du niveau + matières
│   │   │   └── callback/route.ts       # échange du code OAuth/magic link
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # sidebar desktop + bottom nav mobile (garde: session)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── explore/
│   │   │   │   ├── page.tsx            # filtres + recherche
│   │   │   │   └── loading.tsx
│   │   │   ├── courses/[slug]/
│   │   │   │   ├── page.tsx            # sommaire LMS (modules/chapitres/leçons)
│   │   │   │   └── opengraph-image.tsx
│   │   │   ├── learn/[lessonId]/
│   │   │   │   ├── page.tsx            # player + onglets (notes, ressources, quiz)
│   │   │   │   └── layout.tsx          # rail de navigation entre leçons
│   │   │   ├── quiz/[quizId]/page.tsx
│   │   │   ├── my-courses/page.tsx
│   │   │   ├── progress/page.tsx
│   │   │   ├── favorites/page.tsx
│   │   │   ├── notes/page.tsx
│   │   │   ├── goals/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx            # compte
│   │   │       ├── security/page.tsx   # mot de passe
│   │   │       └── notifications/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx              # garde: role IN (admin, teacher)
│   │   │   └── admin/
│   │   │       ├── page.tsx            # tableau de bord admin
│   │   │       ├── tree/page.tsx       # arborescence drag & drop (§20 du cahier)
│   │   │       ├── users/[[...id]]/page.tsx
│   │   │       ├── levels/…  subjects/…
│   │   │       ├── courses/[[...id]]/page.tsx
│   │   │       ├── lessons/[id]/page.tsx      # éditeur leçon : vidéos, ressources, quiz
│   │   │       ├── quizzes/[[...id]]/page.tsx
│   │   │       └── badges/page.tsx
│   │   └── api/
│   │       ├── health/route.ts          # keepalive
│   │       └── og/route.tsx             # images Open Graph dynamiques
│   ├── components/
│   │   ├── ui/                # button, card, dialog, sheet, tabs, input, select,
│   │   │                      # progress, badge, avatar, skeleton, toast, dropdown…
│   │   ├── layout/            # sidebar, mobile-nav, topbar, theme-toggle, user-menu
│   │   ├── course/            # course-card, course-grid, filters, syllabus-tree,
│   │   │                      # progress-ring, difficulty-badge
│   │   ├── player/            # video-player, controls, speed-menu, progress-bar,
│   │   │                      # resume-prompt, lesson-nav, complete-button
│   │   ├── quiz/              # quiz-runner, question-*, result-summary, explanation
│   │   ├── notes/             # note-editor, note-list, timestamp-chip
│   │   ├── gamification/      # xp-bar, badge-card, streak-flame, goal-ring
│   │   ├── admin/             # entity-table, tree-editor, sortable-list, media-picker
│   │   └── shared/            # empty-state, error-state, loading-state, pagination,
│   │                          # search-input, confirm-dialog
│   ├── server/
│   │   ├── auth/
│   │   │   ├── session.ts      # getSession, getProfile (cache React)
│   │   │   └── guards.ts       # requireUser, requireRole, requireAdmin
│   │   ├── db/                 # 1 fichier par agrégat : courses.ts, lessons.ts,
│   │   │                       # videos.ts, quizzes.ts, progress.ts, notes.ts…
│   │   ├── services/
│   │   │   ├── progress.service.ts
│   │   │   ├── gamification.service.ts   # XP, badges, séries
│   │   │   ├── recommendation.service.ts
│   │   │   ├── quiz.service.ts           # correction serveur
│   │   │   ├── notification.service.ts
│   │   │   └── stats.service.ts
│   │   └── actions/            # server actions, 1 fichier par domaine
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts       # createServerClient (cookies)
│   │   │   ├── client.ts       # createBrowserClient
│   │   │   ├── middleware.ts   # rafraîchissement de session
│   │   │   └── admin.ts        # service_role — IMPORT SERVEUR UNIQUEMENT
│   │   ├── video/              # voir §5
│   │   ├── ai/                 # interfaces seulement (voir §7)
│   │   ├── utils/              # cn, format-duration, format-date, slugify, chunk
│   │   └── constants/          # routes, nav, xp-rules, limites de pagination
│   ├── hooks/                  # use-media-query, use-debounce, use-video-progress,
│   │                           # use-local-storage, use-intersection
│   ├── types/
│   │   ├── database.types.ts   # GÉNÉRÉ — ne pas éditer
│   │   └── domain.ts           # types métier dérivés (CourseWithProgress…)
│   ├── validations/            # auth.schema.ts, course.schema.ts, quiz.schema.ts…
│   └── middleware.ts           # session + protection /app et /admin
├── tests/
│   ├── unit/                   # services (progression, XP, correction quiz)
│   └── e2e/                    # inscription → cours → vidéo → quiz
├── .env.example
├── next.config.ts   tsconfig.json   eslint.config.mjs   postcss.config.mjs
└── package.json
```

---

## 4. Architecture des rôles et de la sécurité

### 4.1 Les trois rôles

| Rôle | Périmètre |
|---|---|
| `student` | Consulte le contenu **publié**. Possède sa progression, ses notes, favoris, objectifs, tentatives de quiz. Aucun accès à `/admin`. |
| `teacher` | Tout ce qui précède + création/édition du contenu (cours → vidéos, quiz, ressources). **Ne gère pas les utilisateurs.** |
| `admin` | Tout, y compris la gestion des utilisateurs, des niveaux, des matières et des badges. |

Le rôle est stocké dans `profiles.role` (enum `user_role`), jamais dans le client.

### 4.2 Défense en profondeur — 4 barrières

Une seule barrière ne suffit pas : le cahier des charges exige qu'« un étudiant ne puisse jamais accéder à l'administration ».

1. **`middleware.ts`** — rafraîchit la session, redirige les non-connectés vers `/login`. Redirection d'UX, pas une sécurité.
2. **Garde de layout serveur** — `(admin)/layout.tsx` appelle `requireRole(['admin','teacher'])`, qui lit le rôle **côté serveur** depuis la base et fait `notFound()` sinon. Impossible à contourner depuis le client.
3. **Garde de server action** — chaque action mutative revérifie le rôle avant d'agir. Une server action est un endpoint HTTP public : le layout ne la protège pas.
4. **RLS PostgreSQL** — la barrière finale. Même avec un jeton valide et une requête forgée, Postgres refuse. C'est la seule qui compte vraiment.

### 4.3 RLS — principes

- Fonctions `SECURITY DEFINER STABLE` : `public.auth_role()`, `public.is_staff()`, `public.is_admin()`. Elles évitent la **récursion infinie** classique d'une policy sur `profiles` qui interrogerait `profiles`.
- Contenu : lecture publique **uniquement si `status = 'published'`** ; écriture réservée au staff.
- Données personnelles : `user_id = auth.uid()` sur SELECT/INSERT/UPDATE/DELETE.
- Un trigger `profiles_guard_privileged_columns` empêche un utilisateur de modifier lui-même `role`, `xp` ou `streak_*`.

### 4.4 Point critique : les bonnes réponses des quiz

Naïvement, `answers.is_correct` est lisible par tout élève authentifié → il suffit d'ouvrir l'onglet réseau pour connaître les réponses. Deux mesures combinées :

1. **Privilège au niveau colonne** : `REVOKE SELECT (is_correct, match_pattern) ON answers FROM authenticated;` — PostgREST respecte les GRANT colonne par colonne.
2. **Correction côté serveur** : la soumission passe par la fonction `submit_quiz_attempt(p_quiz_id, p_responses jsonb)` en `SECURITY DEFINER`, qui corrige, calcule le score, enregistre la tentative et ne renvoie les explications **qu'après** enregistrement. Le staff conserve l'accès complet.

Ce point est traité maintenant parce qu'il conditionne le schéma des tables.

---

## 5. Architecture vidéo

### 5.1 Règle absolue

**La base ne stocke que des métadonnées.** Aucun binaire vidéo dans Postgres ni dans Supabase Storage (1 GB gratuit = ~3 vidéos). La table `videos` contient `provider`, `external_id`, `url`, `thumbnail_url`, `duration_seconds`, `sort_order`, `lesson_id`, `metadata jsonb`.

### 5.2 Abstraction fournisseur

```
src/lib/video/
├── types.ts          # VideoSource, PlayerCapabilities, PlayerAdapter, PlayerEvent
├── registry.ts       # provider → adaptateur (point d'extension unique)
├── resolve.ts        # ligne BDD → VideoSource normalisée
└── providers/
    ├── native.ts             # <video> HTML5 : MP4 / HLS (R2, Bunny, tout CDN)
    ├── youtube.ts            # YouTube IFrame Player API
    ├── google-drive.ts       # iframe /preview
    ├── cloudflare-stream.ts  # à activer plus tard
    └── vimeo.ts              # à activer plus tard
```

Contrat commun implémenté par chaque fournisseur :

```ts
interface PlayerAdapter {
  mount(container: HTMLElement, source: VideoSource, opts: MountOptions): Promise<void>;
  play(): void;  pause(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;  getDuration(): number;
  setPlaybackRate(rate: number): void;   // 0.5 → 2
  setVolume(v: number): void;  setMuted(m: boolean): void;
  destroy(): void;
  on(event: PlayerEvent, cb: (payload: unknown) => void): () => void;
}
```

Ajouter Cloudflare Stream plus tard = **créer un fichier dans `providers/` et une ligne dans `registry.ts`**. Aucun composant, aucune page, aucune table ne change.

### 5.3 Capacités déclarées — le point honnête

Tous les fournisseurs ne se valent pas. Prétendre le contraire produirait un lecteur cassé. Chaque adaptateur déclare donc ses capacités, et l'UI s'adapte :

| Fournisseur | Contrôle JS | Seek / reprise | Vitesse | Temps réel | Coût |
|---|---|---|---|---|---|
| `native` (MP4/HLS sur **R2**) | total | ✅ | ✅ | ✅ | 0 € jusqu'à 10 GB |
| `youtube` (non répertorié) | IFrame API | ✅ | ✅ | ✅ | 0 € illimité |
| `google_drive` | **aucun** (iframe `/preview`) | ❌ | ❌ | ❌ | 0 € |
| `cloudflare_stream` | total | ✅ | ✅ | ✅ | payant |

```ts
interface PlayerCapabilities {
  canSeek: boolean; canTrackTime: boolean; canSetRate: boolean;
  canSetVolume: boolean; hasNativeFullscreen: boolean;
}
```

Conséquences concrètes, gérées dès le départ :
- Si `canTrackTime === false` → pas de reprise automatique, pas de progression auto ; le bouton **« Marquer comme terminé »** devient le seul moyen de valider la leçon (il existe de toute façon).
- Si `canSetRate === false` → le menu de vitesse est masqué, pas désactivé sans explication.

**Recommandation de démarrage :** `native` (MP4 sur Cloudflare R2, egress gratuit) comme fournisseur principal — c'est le seul qui donne un lecteur totalement maison ; `youtube` non répertorié pour les vidéos lourdes ; `google_drive` accepté comme demandé, mais en mode dégradé assumé. Le choix se fait par vidéo, en base, sans redéploiement.

### 5.4 Reprise de lecture

- Sauvegarde `position_seconds` toutes les **10 s** et sur `pause` / `beforeunload` / changement d'onglet — throttlée, jamais à chaque `timeupdate` (≈ 4 écritures/seconde sinon).
- Écriture via `navigator.sendBeacon` sur déchargement de page.
- Table `video_progress` en `UNIQUE(user_id, video_id)` + `UPSERT`.
- Auto-complétion à **≥ 90 %** de la durée, ce qui déclenche en cascade : leçon → chapitre → module → cours (triggers SQL, §DATABASE.md).
- Au retour : si `position_seconds > 15` et `< 95 %`, l'UI propose « Reprendre à 12:34 » **ou** « Recommencer ». On ne saute jamais silencieusement.

---

## 6. Système de design

- **Tokens CSS** dans `globals.css` via `@theme` (Tailwind v4) : couleurs sémantiques (`--color-background`, `--color-foreground`, `--color-primary`, `--color-muted`, `--color-border`…), redéfinies sous `.dark`. Aucune couleur codée en dur dans les composants.
- **Couleur principale** : indigo profond (`oklch`) — sobre, lisible en clair comme en sombre, contraste AA garanti. Les matières ont une couleur d'accent secondaire (stockée en base, `subjects.color`) utilisée avec parcimonie.
- **Typographie** : Inter (variable, via `next/font`, self-hosted → 0 requête externe). Échelle typographique stricte, hauteurs de ligne généreuses.
- **Espace** : grille de 4 px, cartes `rounded-xl`, ombres très douces, densité faible (inspiration Linear/Notion, sans copie).
- **Mobile-first** : la sidebar desktop devient une barre de navigation basse à 5 entrées ; le lecteur passe en pleine largeur ; les tableaux admin deviennent des cartes empilées.
- **Animations** : transitions 150–200 ms sur les états, `prefers-reduced-motion` respecté. Pas d'effet gratuit.
- **États obligatoires** pour chaque écran (exigence §31 du cahier) : `loading` (skeleton), `empty` (illustration + action), `error` (message + réessayer), `success`. Trois composants partagés dans `components/shared/` garantissent l'uniformité.

---

## 7. Préparation de l'IA (sans dépendance)

`src/lib/ai/` ne contient en v1 **que des interfaces et une implémentation nulle** :

```ts
export interface AIProvider {
  explain(concept: string, ctx: LessonContext): Promise<string>;
  generateExercises(lessonId: string, count: number): Promise<GeneratedExercise[]>;
  gradeOpenAnswer(question: string, answer: string): Promise<GradingResult>;
  summarize(lessonId: string): Promise<string>;
}
export const aiProvider: AIProvider = createNullProvider(); // v1 : désactivé
```

Les composants concernés (`ExplainButton`, etc.) vérifient `isAIEnabled()` — piloté par une variable d'environnement absente en v1 — et ne s'affichent tout simplement pas. **Zéro dépendance à une API payante**, et l'ajout ultérieur ne touche qu'un fichier. Les tables `exercises` et `quiz_attempts` prévoient déjà les colonnes nécessaires (`kind = 'interactive'`, `metadata jsonb`).

---

## 8. Performance

- **Pagination serveur systématique** (`.range()`), jamais de `select('*')` sur une table de contenu. 12 cours par page sur `/explore`.
- **Projections explicites** : `select('id, title, thumbnail_url, …')` — jamais `*` hors admin.
- **Progression du cours dénormalisée** dans `course_progress` (maintenue par trigger) : le dashboard lit 1 ligne au lieu d'agréger N leçons.
- **`course_id` dénormalisé** sur `chapters`, `lessons`, `quizzes` : évite 3 jointures sur les requêtes les plus fréquentes.
- **Recherche plein texte** : colonne `tsvector` générée + index GIN, configuration `french`. Pas de `ILIKE '%…%'`.
- `next/image` partout, `loading="lazy"` par défaut, tailles explicites.
- Le lecteur vidéo et l'éditeur admin sont chargés en `dynamic(() => …, { ssr: false })` — hors du bundle initial.
- `React.cache()` sur `getSession()`/`getProfile()` : une seule requête par rendu, même appelée dans 5 composants.

---

## 9. SEO

`metadata` par route + `generateMetadata` pour cours et leçons ; `sitemap.ts` dynamique (cours publiés) ; `robots.ts` bloquant `/app`, `/admin`, `/api` ; Open Graph via `opengraph-image.tsx` ; URLs propres à base de slugs (`/courses/analyse-terminale`) ; JSON-LD `Course` sur les fiches. Les pages privées sont `noindex`.

---

## 10. Plan de développement

Chaque étape se termine par : `tsc --noEmit` propre, `eslint` propre, build réussi, vérification mobile + desktop, états vides/chargement/erreur présents, commit sur `claude/educational-platform-full-r72l12`.

| Étape | Contenu | Livrable vérifiable |
|---|---|---|
| **2** | Init Next 16 + TS strict + Tailwind v4 + tokens + système de design (`components/ui/`) + clients Supabase + middleware + CI | `npm run build` OK, page d'accueil stylée, thème clair/sombre |
| **3** | Auth complète : inscription, connexion, déconnexion, mot de passe oublié/changé, onboarding niveau+matières, gardes 4 barrières, migrations `0001`+`0002` | Un compte peut être créé et `/admin` est inaccessible à un `student` |
| **4** | Hiérarchie Niveau→Matière→Cours→Module→Chapitre→Leçon, migrations `0003`, seed de démonstration, `/explore` (filtres+recherche), fiche cours LMS | Catalogue navigable avec vraies données |
| **5** | Lecteur vidéo (abstraction §5), reprise, progression leçon/chapitre/module/cours, migrations `0005`, triggers d'agrégation | Une vidéo reprend là où on s'est arrêté |
| **6** | Quiz (4 types) + correction serveur sécurisée + exercices, migrations `0004` | Score, explications, tentatives enregistrées |
| **7** | Notes (avec timestamp), favoris, objectifs, gamification (XP, badges, séries), migrations `0006` | Pages « Mes notes », « Mes favoris », badges attribués |
| **8** | Dashboard élève complet (reprise, recommandations, statistiques, activité, série) | Dashboard §6 du cahier |
| **9** | Administration complète + arborescence drag & drop + gestion utilisateurs | CRUD sur les 10 entités |
| **10** | Responsive final, dark mode, animations, polish, notifications | Audit mobile/desktop |
| **11** | Tests (Vitest + Playwright), corrections, accessibilité, états d'erreur réseau | Suite verte en CI |
| **12** | SEO, sitemap, OG, `DEPLOYMENT.md`, déploiement Vercel + Supabase | URL en ligne, guide 0 € |

---

## 11. Décisions à valider

1. **Vercel** comme cible de déploiement (Cloudflare Pages reste possible mais coûte en friction) — §1.3.
2. **Cloudflare R2 + YouTube non répertorié** comme fournisseurs vidéo principaux, **Google Drive supporté mais en mode dégradé assumé** (pas de reprise ni de vitesse) — §5.3.
3. **Matières globales** réutilisées entre niveaux, un cours portant `(level_id, subject_id)`, plutôt qu'une matière dupliquée par niveau — voir `DATABASE.md` §2.
4. **Correction des quiz côté serveur** via fonction `SECURITY DEFINER` + révocation de `SELECT` sur `answers.is_correct` — §4.4.
5. **Rôle `teacher`** = édition du contenu sans gestion des utilisateurs — §4.1.
