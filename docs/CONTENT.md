# EduLearn — Catalogue de formation (ÉTAPE 1)

Positionnement : **académie business en ligne**. Quatre domaines : créer un produit digital,
acheter du trafic, faire du marketing, et vendre.

La hiérarchie technique définie dans `ARCHITECTURE.md` reste inchangée ; seul le vocabulaire
d'interface change.

| Table | Libellé interface | Exemple |
|---|---|---|
| `levels` | **Parcours** | Débutant |
| `subjects` | **Domaine** | Media Buying |
| `courses` | **Formation** | Meta Ads de A à Z |
| `modules` | **Module** | Structure de compte |
| `chapters` | **Chapitre** | Le Business Manager |
| `lessons` | **Leçon** | Configurer son BM |
| `videos` | **Vidéo** | — |
| `profiles.role = student` | **Membre** | — |

---

## 1. Parcours (`levels`)

| Slug | Nom | Promesse |
|---|---|---|
| `debutant` | Débutant | « Je pars de zéro, je veux lancer mon premier produit » |
| `intermediaire` | Intermédiaire | « J'ai lancé, je veux structurer et acquérir » |
| `avance` | Avancé | « Je veux scaler mon acquisition et mes marges » |

Le parcours choisi à l'inscription pilote les **recommandations** et le tri par défaut
d'« Explorer » — il ne verrouille rien.

---

## 2. Domaines (`subjects`)

| Slug | Nom | Icône | Couvre |
|---|---|---|---|
| `produit-digital` | Produit digital | `package` | Idée, validation, création, packaging de l'offre |
| `media-buying` | Media Buying | `target` | Meta, TikTok, Google, créatives, tracking |
| `marketing-digital` | Marketing digital | `megaphone` | Tunnels, email, copywriting, SEO, contenu |
| `vente-conversion` | Vente & Conversion | `trending-up` | Page de vente, VSL, closing, lancement, pricing |
| `business-ops` | Business & Ops | `settings-2` | Outils, automatisation, pilotage, KPI |

---

## 3. Catalogue des formations (`courses`)

18 formations. Chaque ligne = une entrée `courses` avec `level_id`, `subject_id`, `difficulty`.

### 3.1 Produit digital

| Formation | Parcours | Modules |
|---|---|---|
| **Trouver et valider son idée de produit** | Débutant | Étude de marché · Analyse concurrentielle · Test de demande avant création · Choisir son format |
| **Créer sa formation en ligne** | Débutant | Structurer le programme · Matériel et tournage · Montage et hébergement · Mise en ligne |
| **Créer un produit léger : ebook, template, notion** | Débutant | Choix du format · Production rapide · Design et mise en page · Livraison automatisée |
| **Construire son offre irrésistible** | Intermédiaire | Promesse et positionnement · Architecture de l'offre · Pricing et ancrage · Garanties et bonus |

### 3.2 Media Buying

| Formation | Parcours | Modules |
|---|---|---|
| **Fondamentaux du media buying** | Débutant | Le vocabulaire (CPM, CTR, CPC, CPA, ROAS, AOV, LTV) · Lire un tableau de bord · Unit economics · Budget et seuil de rentabilité |
| **Meta Ads de A à Z** | Intermédiaire | Business Manager et sécurité du compte · Pixel et Conversions API · Structure de campagne (ABO / CBO) · Audiences et ciblage · Lecture des résultats · Scaling vertical et horizontal · Diagnostiquer une campagne qui chute |
| **TikTok Ads** | Intermédiaire | Compte et pixel · Spécificités du format · Créatives natives · Campagnes et scaling |
| **Google Ads : Search, YouTube, PMax** | Avancé | Intention de recherche · Structure de compte Search · YouTube Ads · Performance Max · Enchères et budgets |
| **Créatives publicitaires qui performent** | Intermédiaire | Anatomie d'une pub qui convertit · Hooks et 3 premières secondes · Angles marketing et itération · UGC : brief, casting, production · Process de test créatif |
| **Tracking et mesure** | Avancé | Pixel, CAPI et déduplication · UTM et conventions de nommage · GA4 · Attribution et écarts de données · Tableau de bord de pilotage |

### 3.3 Marketing digital

| Formation | Parcours | Modules |
|---|---|---|
| **Construire un tunnel de vente** | Débutant | Anatomie d'un funnel · Lead magnet et capture · Page de vente · Order bump, upsell, downsell · Mesurer et optimiser chaque étape |
| **Email marketing et automatisation** | Intermédiaire | Délivrabilité et réchauffement · Séquence de bienvenue · Séquence de vente · Newsletter et rétention · Segmentation et scénarios |
| **Copywriting** | Débutant | Comprendre son audience · Frameworks (AIDA, PAS, BAB) · Titres et accroches · Storytelling · Traiter les objections · Appel à l'action |
| **SEO et contenu** | Intermédiaire | Recherche de mots-clés · SEO technique · Contenu qui classe · Netlinking · Suivi des positions |
| **Réseaux sociaux et personal branding** | Débutant | Choisir ses plateformes · Ligne éditoriale · Formats courts · Rythme et système de production · Convertir son audience |

### 3.4 Vente & Conversion — « comment les vendre »

| Formation | Parcours | Modules |
|---|---|---|
| **Page de vente qui convertit** | Intermédiaire | Structure d'une page de vente · Preuve sociale · Objections et FAQ · Design et lisibilité · Tests A/B |
| **VSL et webinaire de vente** | Avancé | Script d'une VSL · Webinaire evergreen vs live · Techniques de conversion · Relances post-webinaire |
| **Closing et appels de vente** | Avancé | Qualification du prospect · Trame d'appel · Traiter les objections · Suivi et relance · Éthique commerciale |
| **Lancement orchestré** | Avancé | Pré-lancement et liste d'attente · Contenu de lancement · Ouverture des ventes · Urgence et rareté · Débriefer un lancement |
| **Affiliation et partenariats** | Intermédiaire | Recruter des affiliés · Commissions et suivi · Kit promotionnel · Partenariats et co-marketing |

### 3.5 Business & Ops

| Formation | Parcours | Modules |
|---|---|---|
| **Stack d'outils et automatisation** | Débutant | Choisir ses outils · Connecter son écosystème · Automatiser la livraison · Support et SAV |
| **Piloter son business par les chiffres** | Avancé | KPI qui comptent vraiment · Tableau de bord hebdomadaire · Marge et coût d'acquisition · Prévisionnel simple |

---

## 4. Structure type d'une formation

Exemple complet, **Meta Ads de A à Z → Module « Structure de campagne »** :

```
Formation : Meta Ads de A à Z
└── Module 3 — Structure de campagne
    ├── Chapitre 1 — Comprendre la hiérarchie Meta
    │   ├── Leçon : Campagne, ensemble de pubs, publicité      🎥 8 min
    │   ├── Leçon : Choisir son objectif de campagne           🎥 11 min
    │   └── Quiz : La hiérarchie Meta                          📝 6 questions
    ├── Chapitre 2 — ABO ou CBO
    │   ├── Leçon : Différences et cas d'usage                 🎥 9 min
    │   ├── Leçon : Structurer un compte en ABO                🎥 14 min
    │   ├── Leçon : Passer en CBO                              🎥 12 min
    │   ├── Ressource : Template de structure de compte        📄 XLSX
    │   └── Exercice : Structurer un compte à 50 €/jour        ✏️
    └── Chapitre 3 — Budgets et enchères
        ├── Leçon : Répartir son budget                        🎥 10 min
        ├── Leçon : Stratégies d'enchères                      🎥 13 min
        └── Quiz : Budgets et enchères                         📝 8 questions
```

Chaque leçon peut porter : vidéo(s), texte markdown, ressources (PDF, tableur, lien),
exercice, quiz — exactement ce que prévoit le schéma.

---

## 5. Ressources téléchargeables (`resources`)

Les formations business vivent autant de leurs livrables que de leurs vidéos :
tableur de calcul de ROAS, template de structure de compte, checklist de lancement,
swipe file de pubs, trame d'appel de closing, calendrier éditorial, brief UGC,
tableau de bord KPI. Le bucket privé `resources` et les URL signées sont prévus pour ça.

---

## 6. Badges (`badges`)

Ton sobre, orienté progression business — pas de gamification enfantine.

| Code | Nom | Critère |
|---|---|---|
| `first_lesson` | Premier pas | 1 leçon terminée |
| `first_course` | Première formation | 1 formation terminée |
| `streak_7` | Une semaine sans faille | 7 jours consécutifs |
| `streak_30` | Discipline | 30 jours consécutifs |
| `quiz_10` | Théorie maîtrisée | 10 quiz réussis |
| `perfect_quiz` | Sans faute | 1 quiz à 100 % |
| `media_buyer` | Media Buyer | Toutes les formations Media Buying terminées |
| `closer` | Closer | Toutes les formations Vente & Conversion terminées |
| `builder` | Builder | Toutes les formations Produit digital terminées |
| `marketer` | Marketer | Toutes les formations Marketing digital terminées |
| `full_stack` | Full-stack business | Les 5 domaines terminés |
| `night_owl` / `early_bird` | — | Sessions d'étude tard le soir / tôt le matin |

---

## 7. Landing page — sections

1. **Hero** — promesse + CTA « Créer mon compte » / « J'ai un code d'accès »
2. **Le problème** — les 3 blocages classiques (pas d'offre, pas de trafic, pas de conversion)
3. **Les 4 domaines** — 4 cartes, une par pilier
4. **Le parcours** — Débutant → Intermédiaire → Avancé
5. **Aperçu du programme** — arborescence réelle d'une formation, leçons gratuites en accès libre
6. **Comment ça marche** — 3 étapes : je m'inscris → j'active mon code → je suis mon parcours
7. **Ce que contient la plateforme** — vidéos, ressources, quiz, exercices, suivi de progression
8. **Statistiques** — **fictives et signalées comme telles** dans le seed de démonstration
9. **FAQ**
10. **CTA final**

Aucun chiffre de résultat inventé (« +12 000 € en 30 jours ») : ni crédible, ni tenable juridiquement.
Les statistiques de démonstration portent sur le contenu (nombre de leçons, d'heures, de ressources),
pas sur des promesses de revenus.
