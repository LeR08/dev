# Mise en production — de zéro à en ligne

Objectif : plateforme en ligne pour **0 €/mois**. Le seul coût optionnel est un
nom de domaine (~10 €/an) ; sans lui, l'adresse `*.vercel.app` fonctionne.

Comptez 45 minutes la première fois.

---

## Ce que vous allez créer

| Service | Rôle | Palier gratuit |
|---|---|---|
| **GitHub** | Code source, intégration continue | Illimité pour un dépôt privé |
| **Supabase** | Base PostgreSQL, authentification, stockage de fichiers | 500 Mo de base, 1 Go de fichiers, 50 000 utilisateurs actifs/mois |
| **Vercel** | Hébergement de l'application | 100 Go de bande passante/mois |
| **Cloudflare R2** *(recommandé)* | Hébergement des vidéos | 10 Go, **sortie de données gratuite** |

Deux limites à connaître dès maintenant, plutôt que de les découvrir plus tard :

- **Un projet Supabase gratuit est mis en pause après 7 jours sans activité.**
  Le workflow `.github/workflows/keepalive.yml` l'en empêche (étape 8).
- **Le palier Hobby de Vercel est réservé à un usage non commercial.** Si la
  plateforme devient une activité commerciale, il faut passer au palier Pro
  (20 $/mois) ou migrer. Le code n'utilise aucune API propriétaire Vercel :
  la migration vers Cloudflare Workers via `@opennextjs/cloudflare` reste
  possible sans réécriture.

---

## Étape 1 — Le dépôt GitHub

```bash
git clone https://github.com/<vous>/<votre-depot>.git
cd <votre-depot>
npm install
```

---

## Étape 2 — Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), **New project**.
2. Nom du projet, **mot de passe de base de données** (conservez-le : il est
   nécessaire pour `psql`), région **Europe (Frankfurt)** ou la plus proche de
   vos membres.
3. Palier **Free**. Attendez la fin de l'initialisation (~2 minutes).

---

## Étape 3 — Créer le schéma

Deux méthodes. La première ne demande aucune installation.

### Méthode A — Éditeur SQL (la plus simple)

**SQL Editor → New query**, puis collez et exécutez les fichiers **dans
l'ordre**, un par un :

```
supabase/migrations/0001_extensions_enums.sql
supabase/migrations/0002_identity.sql
supabase/migrations/0003_content.sql
supabase/migrations/0004_assessments.sql
supabase/migrations/0005_progress.sql
supabase/migrations/0006_engagement.sql
supabase/migrations/0007_access.sql
supabase/migrations/0008_functions.sql
supabase/migrations/0009_rls.sql
supabase/migrations/0010_storage.sql
```

L'ordre compte : chaque fichier s'appuie sur le précédent. Une migration
s'applique **une seule fois** — c'est normal qu'un second passage échoue sur
`relation already exists`.

### Méthode B — `psql` (plus rapide, tout en une commande)

L'URL de connexion se trouve dans **Project Settings → Database →
Connection string → URI**.

```bash
export DATABASE_URL="postgresql://postgres.[ref]:[mot-de-passe]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

### Vérifier

```sql
select count(*) as tables
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';
-- attendu : 34

select tablename, rowsecurity
from pg_tables where schemaname = 'public' and not rowsecurity;
-- attendu : aucune ligne (la RLS est active partout)
```

Si la seconde requête renvoie des lignes, **arrêtez-vous là** : une table sans
RLS est une table lisible par n'importe qui.

---

## Étape 4 — Charger le catalogue de démonstration

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

Ou par l'éditeur SQL. Le fichier est volumineux (~400 Ko) ; s'il est refusé
par l'éditeur, utilisez `psql`.

Il crée 22 formations, 254 leçons, 13 quiz, 13 badges et 3 codes d'activation
de démonstration (`DEMO-FULL-2026`, `DEMO-YEAR-2026`, `DEMO-MEDIA-BUY`).

> **Les URL de vidéos pointent vers `demo.invalid`**, un domaine qui n'existe
> pas. Les lecteurs afficheront une erreur tant que vous n'aurez pas saisi vos
> propres vidéos depuis l'administration. C'est volontaire : mieux vaut une
> erreur visible qu'une vidéo d'exemple qu'on oublie de remplacer.

Le seed est **rejouable** : le relancer met à jour le contenu sans créer de
doublon.

---

## Étape 5 — Configurer l'authentification

**Authentication → Providers → Email** :

- **Enable email provider** : activé
- **Confirm email** : activé en production (désactivez-le en développement
  pour éviter d'attendre un e-mail à chaque test)

**Authentication → URL Configuration** :

| Champ | Valeur |
|---|---|
| Site URL | `https://votre-domaine.com` (ou l'URL Vercel) |
| Redirect URLs | `https://votre-domaine.com/callback`, `http://localhost:3000/callback` |

Sans l'URL de redirection, les liens de confirmation et de réinitialisation de
mot de passe échoueront silencieusement.

> Le service d'e-mail intégré de Supabase est limité (quelques messages par
> heure) et destiné aux tests. Pour la production, connectez un fournisseur SMTP
> — Resend et Brevo ont un palier gratuit suffisant — dans
> **Project Settings → Authentication → SMTP Settings**.

---

## Étape 6 — Variables d'environnement en local

Les clés sont dans **Project Settings → API**.

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

`SUPABASE_SERVICE_ROLE_KEY` **contourne toutes les règles de sécurité**. Elle ne
doit jamais être préfixée `NEXT_PUBLIC_`, jamais apparaître dans du code client,
jamais être commitée. Si elle fuite, régénérez-la immédiatement depuis le
tableau de bord.

```bash
npm run dev
```

---

## Étape 7 — Créer le premier administrateur

1. Créez un compte normal via `/register`.
2. Confirmez l'e-mail si la confirmation est activée.
3. Dans l'éditeur SQL Supabase :

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'vous@exemple.com');
```

Cette requête ne fonctionne **que depuis l'éditeur SQL** (ou avec la clé
`service_role`). Un trigger empêche tout membre connecté de modifier son propre
rôle depuis l'application — y compris par une requête forgée. C'est le seul
chemin d'amorçage, et il est volontairement hors de portée du navigateur.

Vérifiez : `/admin` doit maintenant être accessible.

---

## Étape 8 — Déployer sur Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importez le dépôt.
2. Vercel détecte Next.js seul ; ne changez rien aux commandes de build.
3. **Environment Variables** — ajoutez les quatre, pour les trois
   environnements (Production, Preview, Development) :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | l'URL de votre projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé `service_role` |
| `NEXT_PUBLIC_SITE_URL` | l'URL finale du site |

4. **Deploy**.
5. Revenez dans Supabase corriger **Site URL** et **Redirect URLs** avec
   l'adresse réelle.

### Empêcher la mise en pause de Supabase

Dans le dépôt GitHub, **Settings → Secrets and variables → Actions → New
repository secret** :

- Nom : `SITE_URL`
- Valeur : l'URL de production, sans barre oblique finale

Le workflow `keepalive.yml` appellera `/api/health` deux fois par semaine.

---

## Étape 9 — Nom de domaine (optionnel)

1. Achetez le domaine (Cloudflare Registrar vend à prix coûtant).
2. Vercel → **Settings → Domains → Add** → suivez les instructions DNS.
3. Le certificat HTTPS est émis automatiquement.
4. Mettez à jour `NEXT_PUBLIC_SITE_URL`, la **Site URL** Supabase et le secret
   `SITE_URL`, puis redéployez.

---

## Étape 10 — Héberger vos vidéos

La base ne stocke **que des métadonnées** ; les fichiers vivent chez un
fournisseur. Trois options, toutes gérées par l'application :

### Cloudflare R2 — recommandé

10 Go gratuits et **aucun frais de sortie de données**, ce qui est décisif :
c'est la bande passante qui coûte cher ailleurs. C'est aussi le seul choix qui
donne un lecteur entièrement maison, avec reprise et vitesse de lecture.

1. Cloudflare → **R2 → Create bucket**.
2. **Settings → Public access → Allow Access** (ou reliez un sous-domaine).
3. Téléversez vos `.mp4`.
4. Dans l'administration : **Formations → une leçon → Vidéos → Ajouter**,
   fournisseur **Fichier direct**, collez l'URL publique.

### YouTube non répertorié

Gratuit et illimité. Toutes les fonctions du lecteur restent disponibles
(l'API IFrame expose la position, le seek et la vitesse). En contrepartie, la
vidéo est hébergée chez Google et l'habillage YouTube apparaît au survol.

Fournisseur **YouTube**, identifiant = les 11 caractères après `v=`.

### Google Drive — dépannage uniquement

Fonctionne sans rien héberger, mais **l'iframe de Drive n'expose aucune API** :
ni reprise de lecture, ni réglage de vitesse, ni suivi de progression. Le
formulaire d'ajout affiche ces limites, et l'interface bascule sur le bouton
« Marquer comme terminé ».

---

## Étape 11 — Vendre et distribuer les codes

Aucun paiement ne transite par la plateforme : vous encaissez où vous voulez
(Stripe Payment Link, Systeme.io, virement…), puis vous envoyez un code.

1. **Administration → Codes d'accès → Générer des codes**.
2. Choisissez la portée : catalogue complet, un domaine, ou une formation.
3. `Utilisations par code = 1` pour un code nominatif par vente ;
   une valeur plus élevée pour un code de campagne partagé.
4. `Durée d'accès` vide = accès à vie ; `365` = un an.
5. **Exporter en CSV** pour un publipostage.

Le membre saisit son code sur `/activate`.

---

## Étape 12 — Vérifier que tout tient

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Puis, contre la base réelle :

```bash
psql "$DATABASE_URL" -f tests/sql/01_business_logic.sql
psql "$DATABASE_URL" -f tests/sql/02_security_rls.sql
```

Le second est le plus important : il vérifie qu'un membre sans accès ne voit
aucune vidéo réservée, qu'il ne peut ni lire les bonnes réponses des quiz, ni
s'attribuer un score ou de l'XP, ni se promouvoir administrateur, ni consulter
les données d'un autre membre.

### Vérification manuelle

- [ ] Un visiteur non connecté voit la page d'accueil et le catalogue
- [ ] Il ne peut pas atteindre `/dashboard` (redirection vers `/login`)
- [ ] Inscription, e-mail de confirmation, connexion
- [ ] Un membre sans code voit le **programme** mais aucune vidéo réservée
- [ ] Les leçons en accès libre se lisent sans code
- [ ] Après activation d'un code, tout se débloque
- [ ] Une vidéo reprise plus tard redémarre au bon endroit
- [ ] Un quiz affiche le score et les explications après soumission
- [ ] Un membre reçoit un **404** sur `/admin`
- [ ] Le thème sombre fonctionne, sur mobile comme sur ordinateur

---

## Coût récapitulé

| Poste | Coût |
|---|---|
| Vercel Hobby | 0 € |
| Supabase Free | 0 € |
| Cloudflare R2 (< 10 Go) | 0 € |
| GitHub | 0 € |
| **Total mensuel** | **0 €** |
| Nom de domaine (optionnel) | ~10 €/an |

### Quand faudra-t-il payer

- **Base > 500 Mo** : très loin — le contenu textuel est léger, les vidéos ne
  sont pas dans la base. Plusieurs milliers de membres avant d'y arriver.
- **Vidéos > 10 Go sur R2** : ~15 à 20 h en 720p. Au-delà, 0,015 $/Go/mois,
  soit quelques centimes.
- **Usage commercial sur Vercel** : passage au palier Pro (20 $/mois) ou
  migration vers Cloudflare Workers.
- **Bande passante > 100 Go/mois sur Vercel** : ne concerne que les pages, pas
  les vidéos (servies par R2, hors quota Vercel).

---

## Dépannage

**« Variable d'environnement manquante »**
La variable n'est pas définie sur Vercel, ou l'a été après le dernier
déploiement. Ajoutez-la puis **redéployez** — les variables ne sont lues qu'au
build.

**Le lien de confirmation renvoie vers `localhost`**
La **Site URL** de Supabase est restée sur `http://localhost:3000`.

**Un membre voit `/admin`**
Impossible via l'interface. Vérifiez `select role from public.profiles where
id = …` : le compte est probablement réellement `admin` ou `teacher`.

**Les vidéos ne se lancent pas**
Attendu tant que le seed de démonstration est en place (`demo.invalid`).
Remplacez les URL depuis l'administration.

**« permission denied for table … »**
La migration `0009_rls.sql` n'a pas été appliquée, ou l'a été partiellement.
Rejouez-la : les policies sont rejouables sans erreur.

**La base ne répond plus après quelques jours**
Projet Supabase mis en pause. Réactivez-le depuis le tableau de bord, puis
vérifiez que le secret `SITE_URL` est bien défini dans GitHub.
