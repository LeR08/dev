# SubTrack

Application web qui centralise les abonnements récurrents d'un utilisateur. Architecture client/serveur multi-utilisateurs : chaque compte a ses propres abonnements, un compte admin supervise l'ensemble, avec paliers Free/Basic/Pro/VIP, notifications Discord, connexion bancaire automatique (VIP, sandbox) et un conseiller IA. Le tout tourne 100% en local pour un bêta-test solo (pas de déploiement cloud) — les appels sortants vers des API tierces (Anthropic, GoCardless) ne changent pas ça, seul le serveur reste local.

## Stack

- Frontend : React 18 + Vite + TailwindCSS (mode sombre via classe `dark`)
- Backend : Node.js + Express, écoute sur `localhost:3000`
- Base de données : SQLite via `better-sqlite3` (fichier local `data/subtrack.sqlite`, zéro config serveur)
- Auth : JWT (`jsonwebtoken`) + hash de mot de passe (`bcrypt`)
- Notifications : Discord Webhook (job `node-cron`)
- Conseiller IA : Claude API (`@anthropic-ai/sdk`), quota mensuel par palier
- Connexion bancaire (VIP) : GoCardless Bank Account Data, **mode sandbox uniquement**
- Graphiques : Recharts

## Commandes

```bash
npm install
cp .env.example .env      # ajuster si besoin (JWT_SECRET, identifiants admin seedés, clés API, etc.)

npm run dev:all           # backend (localhost:3000) + frontend (localhost:5173) en parallèle
# ou séparément :
npm run server             # backend seul
npm run dev                 # frontend seul (proxy /api -> localhost:3000, voir vite.config.js)

npm run build              # build de production du frontend dans dist/
npm run preview            # prévisualiser le build

npm audit                  # vérifier les vulnérabilités restantes après le bloc "overrides" de package.json
```

Au premier démarrage du backend, un compte admin est automatiquement créé (voir `.env.example` pour les identifiants par défaut `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`). Son mot de passe doit être changé dès la première connexion (`mustChangePassword`).

Le conseiller IA (`ANTHROPIC_API_KEY`) et la connexion bancaire (`GOCARDLESS_SECRET_ID`/`GOCARDLESS_SECRET_KEY`/`BANK_TOKEN_ENCRYPTION_KEY`) sont optionnels : sans ces variables, les routes correspondantes répondent `503` proprement plutôt que de planter.

## Structure

```
server/
├── index.js                 # bootstrap Express, montage des routes, lancement du job Discord
├── db.js                    # schéma SQLite (users, subscriptions, ai_usage, bank_connections, bank_suggestions) + seed admin
├── auth.js                  # JWT (sign/verify), middlewares requireAuth / attachUser / requireAdmin
├── serialize.js             # sérialisation user/subscription pour l'API (masque passwordHash, etc.)
├── tiers.js                 # règles des paliers (limite Free, Discord, multi-devises, quota IA, accès bancaire)
├── notifications.js         # job node-cron : alertes Discord pour prélèvements imminents
├── ai/
│   └── advisor.js            # appel Claude API (conseils factuels sur les abonnements)
├── bank/
│   ├── crypto.js              # chiffrement AES-256-GCM des identifiants de connexion bancaire
│   ├── gocardless.js          # client GoCardless Bank Account Data (sandbox)
│   └── recurring.js           # heuristique de détection de prélèvements récurrents
└── routes/
    ├── auth.js               # POST /api/auth/register, /api/auth/login
    ├── subscriptions.js      # CRUD + pause, scopé à req.user, cap Free = 5 côté serveur
    ├── user.js                # GET/PATCH /api/user/me (webhook, palier self-service, mot de passe)
    ├── admin.js               # GET /api/admin/users, /api/admin/stats, PATCH /api/admin/users/:id
    ├── ai.js                  # POST /api/ai/advice, GET /api/ai/usage — quota mensuel par palier
    ├── bank.js                 # connexion/déconnexion bancaire, suggestions d'abonnements (VIP)
    └── bankCallback.js         # callback public (sans JWT) du flux OAuth GoCardless

src/
├── components/
│   ├── AuthForm.jsx             # connexion / inscription
│   ├── ChangePasswordForm.jsx   # changement de mot de passe (mandatoire ou depuis "Mon compte")
│   ├── SubscriptionForm.jsx     # formulaire ajout/édition (devise verrouillée hors palier Pro/VIP)
│   ├── SubscriptionList.jsx     # liste triable (prix/date/catégorie) — inchangé, alimenté par l'API
│   ├── SubscriptionCard.jsx     # carte abonnement (pause/édition/suppression) — inchangé
│   ├── DashboardSummary.jsx     # totaux mensuel/annuel + graphique catégories (Basic+)
│   ├── ImportExport.jsx         # export/import JSON (import additif via l'API, respecte le cap Free)
│   ├── AiAdvisorPanel.jsx       # section "Mon compte" : demande de conseils IA, quota affiché
│   └── BankConnectionPanel.jsx  # section "Mon compte" : connexion bancaire, suggestions détectées (VIP)
├── pages/
│   ├── AccountPage.jsx          # "Mon compte" : palier, webhook Discord, mot de passe, IA, banque
│   └── AdminPage.jsx            # panel admin : utilisateurs, stats agrégées, changement de palier
├── context/
│   └── AuthContext.jsx          # état d'auth global (token localStorage, user courant)
├── hooks/
│   └── useSubscriptions.js      # CRUD réactif via fetch() vers l'API (remplace Dexie)
├── utils/
│   ├── api.js                   # client fetch (Authorization: Bearer, gestion des erreurs)
│   ├── calculations.js          # normalisation des coûts, dates, alertes — inchangé, réutilisé aussi côté backend
│   └── constants.js             # fréquences, catégories, devises, formatage
├── App.jsx
└── main.jsx
```

## Modèle de données (SQLite)

**`users`** : `id, email (unique), passwordHash, role (user|admin), tier (free|basic|pro|vip), discordWebhookUrl, isActive, mustChangePassword, createdAt`

**`subscriptions`** : `id, userId (FK -> users.id), name, price, currency, frequency (weekly|monthly|yearly), nextChargeDate (ISO), category, isPaused, lastAlertSentFor (ISO, dédup notifs), createdAt`

**`ai_usage`** : `id, userId, yearMonth (YYYY-MM), count` — compteur de requêtes IA par mois, unique par `(userId, yearMonth)`.

**`bank_connections`** : `id, userId, provider, institutionId, reference (unique, corrèle le callback), status (pending|linked|revoked), encryptedRequisition (AES-256-GCM), expiresAt, createdAt, linkedAt, revokedAt`

**`bank_suggestions`** : `id, userId, bankConnectionId, name, price, currency, frequency, nextChargeDate, status (pending|accepted|dismissed), createdAt`

## Routes API

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/subscriptions              (abonnements du user connecté uniquement)
POST   /api/subscriptions               (bloqué si palier Free et déjà 5 abonnements)
PUT    /api/subscriptions/:id
PATCH  /api/subscriptions/:id/pause
DELETE /api/subscriptions/:id
GET    /api/user/me
PATCH  /api/user/me                    (discordWebhookUrl, tier, currentPassword/newPassword)
GET    /api/admin/users                (admin uniquement)
GET    /api/admin/stats                (admin uniquement — agrégats, pas le détail privé de chacun)
PATCH  /api/admin/users/:id            (admin : changer tier, activer/désactiver)
POST   /api/ai/advice                  (Basic+ ; quota mensuel par palier, 429 si dépassé)
GET    /api/ai/usage
GET    /api/bank/institutions          (VIP uniquement)
POST   /api/bank/connect               (VIP uniquement — crée une requisition GoCardless, renvoie un lien)
GET    /api/bank/callback              (public, sans JWT — retour du flux GoCardless, corrélé par `ref`)
GET    /api/bank/connections           (VIP uniquement)
DELETE /api/bank/connections/:id       (VIP uniquement — révoque)
GET    /api/bank/suggestions           (VIP uniquement — détecte les prélèvements récurrents)
POST   /api/bank/suggestions/:id/accept    (VIP uniquement — crée l'abonnement correspondant)
POST   /api/bank/suggestions/:id/dismiss   (VIP uniquement)
```

Toutes les routes sauf `/api/auth/*` et `/api/bank/callback` exigent un JWT (`Authorization: Bearer <token>`). Les routes `/api/admin/*` exigent en plus `role = admin` (403 sinon). Les routes `/api/bank/*` (hors callback) exigent `tier = vip` (403 sinon).

## Règles métier

- Le prix doit être strictement positif (validé côté formulaire et côté serveur).
- Le coût mensuel normalise toutes les fréquences : hebdo × 4.33, annuel ÷ 12 (`src/utils/calculations.js`, réutilisé tel quel côté backend).
- Les totaux sont groupés par devise (pas de taux de change — hors scope).
- Un abonnement en pause est exclu des totaux mais reste visible (grisé) dans la liste.
- À chaque `GET /api/subscriptions`, toute `nextChargeDate` dépassée est automatiquement avancée à la prochaine occurrence selon la fréquence.
- Alerte visuelle in-app si le prélèvement arrive dans 0 à 3 jours (tous paliers).
- **Palier Free** : 5 abonnements suivis maximum (bloqué côté serveur, pas juste côté UI), alertes in-app uniquement.
- **Palier Basic** : abonnements illimités, alertes Discord, graphique de répartition par catégorie débloqué, 3 conseils IA/mois.
- **Palier Pro** : tout Basic + sélection de devise par abonnement (affichage groupé par devise, pas de conversion), export JSON avancé, 3 conseils IA/mois.
- **Palier VIP** : tout Pro + connexion bancaire automatique (détection d'abonnements, sandbox GoCardless), conseiller IA illimité.
- Le changement de palier est une simulation self-service (page "Mon compte") ou pilotée par un admin — aucun paiement réel dans cette itération.
- Chaque utilisateur ne peut voir/modifier que ses propres abonnements (scoping par `userId` sur chaque requête).
- Un compte désactivé par un admin ne peut plus s'authentifier ni utiliser un token existant.
- Le job de notifications Discord tourne au démarrage du serveur puis toutes les `DISCORD_CHECK_INTERVAL_HOURS` heures ; il n'alerte que les users palier ≥ Basic avec un webhook renseigné, et évite les doublons via `lastAlertSentFor`.
- Le conseiller IA envoie uniquement nom/prix/devise/fréquence/catégorie des abonnements actifs (jamais de données bancaires) à l'API Claude, et ne fait jamais d'action automatique — uniquement des suggestions textuelles.
- La connexion bancaire ne stocke jamais d'identifiants bancaires : GoCardless gère l'authentification, SubTrack ne reçoit qu'un identifiant de requisition + comptes liés, chiffré en base (AES-256-GCM). Un abonnement détecté n'est jamais ajouté automatiquement — confirmation manuelle requise (`.../accept`).
- Aucun mot de passe en clair : hashé en bcrypt en base, jamais loggé. Idem pour les jetons bancaires : jamais en clair en base ni dans les logs.

## Hors scope (volontairement absent dans cette itération)

- Sortie du mode sandbox pour la connexion bancaire (nécessiterait un audit de sécurité et probablement un enregistrement réglementaire)
- Notifications SMS (Twilio)
- Vrai système de paiement (Stripe/PayPal) pour les paliers — simulation admin/self-service suffit pour le bêta-test
- Déploiement cloud / nom de domaine / application mobile
- Récupération de mot de passe oublié
- Conversion de devises en temps réel

## Auto-critique (V3)

- **Coût IA** : chaque appel à l'API Claude a un coût réel. Le quota mensuel par palier (`aiMonthlyQuotaFor` dans `server/tiers.js`) est appliqué dès le premier appel, pas une optimisation à ajouter plus tard — il n'y a pas encore de vrai système de paiement pour couvrir un usage important.
- **La connexion bancaire sandbox n'est pas un environnement de production** : passer en production nécessiterait un audit de sécurité et probablement un enregistrement réglementaire ou un partenariat avec un prestataire agréé. Ne jamais présenter cette fonctionnalité comme "prête pour de vrais utilisateurs" tant qu'elle reste en sandbox.
- **La détection de doublons par l'IA n'est pas fiable à 100%** : elle doit rester une suggestion, jamais une action automatique (déjà le cas dans `server/routes/ai.js` — aucune route IA ne modifie/supprime des abonnements). L'UI le rappelle explicitement ("suggestions à vérifier vous-même").
- **Le périmètre grossit vite** : V1 → V2 → V3 a ajouté auth, backend, panels, paliers, banque et IA en trois itérations. Recommandation : après ce V3, prévoir une pause de stabilisation (tests manuels approfondis) avant d'ajouter quoi que ce soit d'autre.

## Vérifications avant de considérer une tâche terminée

- `npm audit` : 0 vulnérabilité critique restante après le bloc `overrides` de `package.json`
- Le backend démarre sans erreur (`npm run server`) et écoute sur le port configuré (3000 par défaut)
- `npm run build` du frontend passe sans erreur ni warning bloquant
- Un user palier Free ne peut pas ajouter un 6e abonnement (testé côté API, pas juste côté UI)
- Un user ne peut jamais voir/modifier les abonnements d'un autre user
- Un non-admin qui appelle une route `/api/admin/*` reçoit une erreur 403
- Un non-VIP qui appelle une route `/api/bank/*` (hors callback) reçoit une erreur 403
- Un user Basic/Pro qui dépasse son quota IA reçoit une erreur 429 claire, pas un crash
- Le flux sandbox bancaire fonctionne de bout en bout sans jamais logger un jeton en clair dans la console
- Un webhook Discord de test reçoit effectivement un message si on force une `nextChargeDate` à J+1 sur un compte palier ≥ Basic
- CRUD + pause persistent après redémarrage du serveur (SQLite)
- Export puis réimport JSON restitue les mêmes abonnements (dans la limite du palier du compte qui importe)
- Aucun mot de passe ni jeton en clair, ni dans la base ni dans les logs
