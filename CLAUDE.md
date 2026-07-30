# SubTrack

Application web qui centralise les abonnements récurrents d'un utilisateur. Architecture client/serveur multi-utilisateurs (V2) : chaque compte a ses propres abonnements, un compte admin supervise l'ensemble, avec paliers Free/Basic/Pro et notifications Discord. Le tout tourne 100% en local pour un bêta-test solo (pas de déploiement cloud).

## Stack

- Frontend : React 18 + Vite + TailwindCSS (mode sombre via classe `dark`)
- Backend : Node.js + Express, écoute sur `localhost:3000`
- Base de données : SQLite via `better-sqlite3` (fichier local `data/subtrack.sqlite`, zéro config serveur)
- Auth : JWT (`jsonwebtoken`) + hash de mot de passe (`bcrypt`)
- Notifications : Discord Webhook (job `node-cron`)
- Graphiques : Recharts

## Commandes

```bash
npm install
cp .env.example .env      # ajuster si besoin (JWT_SECRET, identifiants admin seedés, etc.)

npm run dev:all           # backend (localhost:3000) + frontend (localhost:5173) en parallèle
# ou séparément :
npm run server             # backend seul
npm run dev                 # frontend seul (proxy /api -> localhost:3000, voir vite.config.js)

npm run build              # build de production du frontend dans dist/
npm run preview            # prévisualiser le build
```

Au premier démarrage du backend, un compte admin est automatiquement créé (voir `.env.example` pour les identifiants par défaut `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`). Son mot de passe doit être changé dès la première connexion (`mustChangePassword`).

## Structure

```
server/
├── index.js                 # bootstrap Express, montage des routes, lancement du job Discord
├── db.js                    # schéma SQLite (users, subscriptions) + seed du compte admin
├── auth.js                  # JWT (sign/verify), middlewares requireAuth / attachUser / requireAdmin
├── serialize.js             # sérialisation user/subscription pour l'API (masque passwordHash, etc.)
├── tiers.js                 # règles des paliers (limite Free, accès Discord, multi-devises)
├── notifications.js         # job node-cron : alertes Discord pour prélèvements imminents
└── routes/
    ├── auth.js               # POST /api/auth/register, /api/auth/login
    ├── subscriptions.js      # CRUD + pause, scopé à req.user, cap Free = 5 côté serveur
    ├── user.js                # GET/PATCH /api/user/me (webhook, palier self-service, mot de passe)
    └── admin.js               # GET /api/admin/users, /api/admin/stats, PATCH /api/admin/users/:id

src/
├── components/
│   ├── AuthForm.jsx             # connexion / inscription
│   ├── ChangePasswordForm.jsx   # changement de mot de passe (mandatoire ou depuis "Mon compte")
│   ├── SubscriptionForm.jsx     # formulaire ajout/édition (devise verrouillée hors palier Pro)
│   ├── SubscriptionList.jsx     # liste triable (prix/date/catégorie) — inchangé, alimenté par l'API
│   ├── SubscriptionCard.jsx     # carte abonnement (pause/édition/suppression) — inchangé
│   ├── DashboardSummary.jsx     # totaux mensuel/annuel + graphique catégories (Basic+)
│   └── ImportExport.jsx         # export/import JSON (import additif via l'API, respecte le cap Free)
├── pages/
│   ├── AccountPage.jsx          # "Mon compte" : palier, webhook Discord, mot de passe
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

**`users`** : `id, email (unique), passwordHash, role (user|admin), tier (free|basic|pro), discordWebhookUrl, isActive, mustChangePassword, createdAt`

**`subscriptions`** : `id, userId (FK -> users.id), name, price, currency, frequency (weekly|monthly|yearly), nextChargeDate (ISO), category, isPaused, lastAlertSentFor (ISO, dédup notifs), createdAt`

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
```

Toutes les routes sauf `/api/auth/*` exigent un JWT (`Authorization: Bearer <token>`). Les routes `/api/admin/*` exigent en plus `role = admin` (403 sinon).

## Règles métier

- Le prix doit être strictement positif (validé côté formulaire et côté serveur).
- Le coût mensuel normalise toutes les fréquences : hebdo × 4.33, annuel ÷ 12 (`src/utils/calculations.js`, réutilisé tel quel côté backend).
- Les totaux sont groupés par devise (pas de taux de change — hors scope).
- Un abonnement en pause est exclu des totaux mais reste visible (grisé) dans la liste.
- À chaque `GET /api/subscriptions`, toute `nextChargeDate` dépassée est automatiquement avancée à la prochaine occurrence selon la fréquence.
- Alerte visuelle in-app si le prélèvement arrive dans 0 à 3 jours (tous paliers).
- **Palier Free** : 5 abonnements suivis maximum (bloqué côté serveur, pas juste côté UI), alertes in-app uniquement.
- **Palier Basic** : abonnements illimités, alertes Discord, graphique de répartition par catégorie débloqué.
- **Palier Pro** : tout Basic + sélection de devise par abonnement (affichage groupé par devise, pas de conversion), export JSON avancé.
- Le changement de palier est une simulation self-service (page "Mon compte") ou pilotée par un admin — aucun paiement réel dans cette itération.
- Chaque utilisateur ne peut voir/modifier que ses propres abonnements (scoping par `userId` sur chaque requête).
- Un compte désactivé par un admin ne peut plus s'authentifier ni utiliser un token existant.
- Le job de notifications Discord tourne au démarrage du serveur puis toutes les `DISCORD_CHECK_INTERVAL_HOURS` heures ; il n'alerte que les users palier ≥ Basic avec un webhook renseigné, et évite les doublons via `lastAlertSentFor`.
- Aucun mot de passe en clair : hashé en bcrypt en base, jamais loggé.

## Hors scope (volontairement absent dans cette itération)

- Intégration bancaire réelle (Powens, GoCardless, Bridge)
- Notifications SMS (Twilio)
- Vrai système de paiement (Stripe/PayPal) — simulation admin/self-service suffit pour le bêta-test
- Déploiement cloud / nom de domaine / application mobile
- Récupération de mot de passe oublié
- Conversion de devises en temps réel

## Vérifications avant de considérer une tâche terminée

- Le backend démarre sans erreur (`npm run server`) et écoute sur le port configuré (3000 par défaut)
- `npm run build` du frontend passe sans erreur ni warning bloquant
- Un user palier Free ne peut pas ajouter un 6e abonnement (testé côté API, pas juste côté UI)
- Un user ne peut jamais voir/modifier les abonnements d'un autre user
- Un non-admin qui appelle une route `/api/admin/*` reçoit une erreur 403
- Un webhook Discord de test reçoit effectivement un message si on force une `nextChargeDate` à J+1 sur un compte palier ≥ Basic
- CRUD + pause persistent après redémarrage du serveur (SQLite)
- Export puis réimport JSON restitue les mêmes abonnements (dans la limite du palier du compte qui importe)
- Aucun mot de passe en clair, ni dans la base ni dans les logs
