# SubTrack

Application web locale (React + Vite + Tailwind + Dexie/IndexedDB) qui centralise les abonnements récurrents d'un utilisateur. Aucun backend, aucune donnée ne quitte le navigateur.

## Stack

- React 18 + Vite
- TailwindCSS (mode sombre via classe `dark`)
- Dexie.js (IndexedDB) — base `subtrack`, table `subscriptions`
- Recharts — graphique de répartition par catégorie

## Commandes

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # prévisualiser le build
```

## Structure

```
src/
├── components/
│   ├── SubscriptionForm.jsx    # formulaire ajout/édition
│   ├── SubscriptionList.jsx    # liste triable (prix/date/catégorie)
│   ├── SubscriptionCard.jsx    # carte abonnement (pause/édition/suppression)
│   ├── DashboardSummary.jsx    # totaux mensuel/annuel + graphique catégories
│   └── ImportExport.jsx        # export/import JSON
├── db/
│   └── db.js                   # config Dexie
├── hooks/
│   └── useSubscriptions.js     # CRUD réactif + recalcul auto des dates dépassées
├── utils/
│   ├── calculations.js         # normalisation des coûts, dates, alertes
│   └── constants.js            # fréquences, catégories, devises, formatage
├── App.jsx
└── main.jsx
```

## Modèle de données

Table `subscriptions` (Dexie) : `id, name, price, currency, frequency (weekly|monthly|yearly), nextChargeDate (ISO), category, isPaused, createdAt`.

## Règles métier

- Le prix doit être strictement positif (validé dans le formulaire et dans `useSubscriptions`).
- Le coût mensuel normalise toutes les fréquences : hebdo × 4.33, annuel ÷ 12 (voir `utils/calculations.js`).
- Les totaux sont groupés par devise (pas de taux de change — hors scope).
- Un abonnement en pause est exclu des totaux mais reste visible (grisé) dans la liste.
- À chaque chargement, toute `nextChargeDate` dépassée est automatiquement avancée à la prochaine occurrence selon la fréquence (`rollForwardToFuture`).
- Alerte visuelle si le prélèvement arrive dans 0 à 3 jours.

## Hors scope (volontairement absent)

- Connexion bancaire / scraping d'e-mails
- Compte utilisateur / synchronisation cloud
- Application mobile native
- Conversion de devises en temps réel

## Vérifications avant de considérer une tâche terminée

- `npm run build` sans erreur ni warning bloquant
- CRUD + pause persistent après un rechargement (IndexedDB)
- Totaux mensuel/annuel vérifiés à la main sur au moins 3 exemples
- Export puis réimport du JSON restitue les mêmes données
- Aucun appel réseau autre que le chargement des assets statiques
