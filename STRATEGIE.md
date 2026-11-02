# Stratégie « liquidité » — Kraken (BTC / ETH)

Document de référence de la stratégie que le bot exécute par défaut sur Kraken
(`kraken.mode: liquidity` dans `tradebot/config/strategy.yaml`).

---

## 1. Idée en une phrase

Quand de l'argent frais entre dans la crypto, signe que l'offre totale de stablecoins augmente,
le bot détient **BTC ou ETH**. Quand cet argent sort, il **revend et reste en cash**.

Pourquoi : les stablecoins (USDT, USDC…) sont la monnaie d'entrée du marché crypto.
Une offre qui grossit signale des capitaux qui arrivent et peuvent acheter. Une offre qui diminue
signale des capitaux qui se retirent. Ce signal était le seul, parmi tous ceux testés, à rester
positif sur la période de développement **et** sur la période de validation (voir §8).

---

## 2. Données utilisées (gratuites)

| Donnée | Source | Usage |
|---|---|---|
| Offre totale de stablecoins (USD) | DefiLlama (`stablecoins.llama.fi`), sans clé | le signal |
| Cours journaliers BTC/USD, ETH/USD | Kraken (API publique) | choix de l'actif, réinjections |
| Prix d'exécution | carnet d'ordres Kraken | ordres limite |
| Taux EUR/USD | ticker Kraken | comptabilité en euros |

Le signal utilise **la dernière journée complète** : le bot ne regarde jamais une donnée publiée
après le moment de sa décision.

---

## 3. Règles de trading

### 3.1 Le signal (évalué chaque jour)

```
variation = offre_stablecoins(hier) / offre_stablecoins(hier − 30 jours) − 1
FAVORABLE   si variation > 0
DÉFAVORABLE sinon
```

### 3.2 Entrée

Chaque jour (`decision_day: daily`), si le signal est **FAVORABLE** et qu'aucune position n'est ouverte :

1. le bot compare BTC et ETH sur 30 jours et choisit **celui qui a le plus monté** ;
2. il achète ce seul actif, **jamais les deux en même temps** ;
3. taille : **5 % du capital** (`tranche_pct: 5`), multipliée par le levier ;
4. ordre limite au prix acheteur (« post-only », frais maker). Non exécuté après 30 min, il est annulé
   puis retenté au cycle suivant.

### 3.3 Réinjection

À chaque baisse de **33 %** par rapport au prix de la **dernière** tranche achetée, n'importe quel jour :

- le bot ajoute **5 % du capital**, au **même levier** que l'entrée ;
- sans limite de nombre (`max_tranches: null`) ;
- exemple pour un achat à 3 000 $ : réinjection à 2 010 $, puis à 1 347 $, puis à 902 $, etc.

### 3.4 Levier

- `leverage: 1` (par défaut) : achat au comptant, sans emprunt.
- `leverage: 2` : la tranche de 5 % devient une position de 10 % (marge Kraken).
- Les réinjections gardent **toujours** le levier de l'entrée. Jamais au-delà de 2×.
- Coût de la marge Kraken : environ 0,02 % toutes les 4 h sur la partie empruntée, soit environ 44 %/an.
  C'est pourquoi le 2× n'a rien apporté sur la période récente.

### 3.5 Sortie

Chaque jour, si le signal devient **DÉFAVORABLE**, toute la position est revendue
(ordre limite, puis ordre au marché s'il n'est pas exécuté dans le délai prévu).
La raison de sortie enregistrée est `liquidity_off`.

### 3.6 Ce que la stratégie ne fait **pas**

- pas de short (les tests montraient que les shorts font perdre, voir §8) ;
- pas de stop-loss sur ces positions (choix de l'opérateur) ;
- pas d'objectif de prix : la sortie dépend uniquement du signal.

---

## 4. Sécurités qui restent actives

Les positions de ce mode n'ont pas de stop-loss chez le broker. Le reste de la protection
s'applique toujours :

| Sécurité | Réglage (profil agressif actuel) | Effet |
|---|---|---|
| Perte journalière | 6 % du capital | ferme tout et repasse en fictif jusqu'au lendemain |
| Drawdown maximal | 25 % depuis le plus haut | ferme tout, repasse en fictif jusqu'à `risk review` |
| Exposition totale | 150 % du capital | refuse les nouveaux achats au-delà |
| Ordres par minute | 10 | ralentit |
| Kill switch | `kill` ou Ctrl+K | annule tout, ferme tout, repasse en fictif (< 30 s) |
| Liquidation Kraken (réel, 2×) | automatique chez Kraken | si la marge devient insuffisante |

⚠️ En **2×**, une chute de 33 % **en une seule journée** fait perdre environ 3,3 % du capital par tranche.
Avec plusieurs tranches, la limite de perte journalière peut tout fermer **avant** la réinjection.

---

## 5. Mode fictif / mode réel

Le bot démarre **toujours en mode fictif** (argent simulé, 1 000 € de départ), à chaque lancement.

| Commande | Effet |
|---|---|
| `mode` | affiche le mode de chaque broker (FICTIF / RÉEL) |
| `fictif` (ou `fictif kraken`) | retour immédiat au mode fictif, sans confirmation |
| `reel` (ou `reel kraken`) | demande de passage en réel : affiche les limites, les résultats fictifs et les conditions, puis demande la phrase exacte |

Pour que `reel` soit accepté :

1. au moins **14 jours** en mode fictif et **1 trade fictif complet** (achat puis revente),
   réglables dans `risk.yaml` (`live_min_paper_days`, `live_min_paper_trades`) ;
2. clés API Kraken présentes dans `.env`, avec **retrait désactivé** sur la clé (vérifié par le bot) ;
3. un plafond de capital réel défini : `risk set kraken.live_capital_cap_eur 100` (par exemple) ;
4. aucune sécurité de risque active ;
5. taper exactement : `I ACCEPT REAL LOSSES ON KRAKEN`.

Le bot revient **automatiquement en fictif** à chaque redémarrage, après `kill` ou `fictif`,
si une limite de perte est touchée, et en cas d'erreur dans le traitement d'un ordre.

En réel, il faut des **dollars (USD)** sur le compte Kraken pour acheter BTC/USD ou ETH/USD au comptant.

---

## 6. Frais et coûts pris en compte

- Frais Kraken : 0,40 % par ordre (votre palier actuel), soit 0,80 % aller-retour.
- Glissement de prix estimé : 0,10 % par ordre en backtest.
- Marge (2× uniquement) : 0,02 % toutes les 4 h sur la partie empruntée.
- La stratégie fait peu de trades (environ 4 par an), donc les frais pèsent peu.

---

## 7. Tableau de bord

Le panneau **Analyse** affiche en permanence, par exemple :

```
liquidité : stablecoins −2,69 % sur 30 j (298,4 Md$) → DÉFAVORABLE
position : aucune (cash)
décision : chaque jour
```

Les panneaux **Positions en cours** et **Positions terminées** montrent le P&L de chaque position.
Les réinjections augmentent le nombre de tranches et ajustent le prix moyen d'entrée.

---

## 8. Résultats des tests (honnêtes)

Méthode : développement sur une période, validation sur une période jamais vue, frais réels,
pas de regard dans le futur.

### 8.1 Le signal seul (BTC, 100 % investi, hebdomadaire)

| | Développement 2020 → mi-2023 | Validation mi-2023 → nov. 2026 |
|---|---|---|
| BTC acheté et gardé | +321 %, pire baisse −77 % | +155 %, pire baisse −53 % |
| Signal liquidité | +389 %, pire baisse −53 % | +180 %, pire baisse −36 % |

### 8.2 Les règles exactes du bot (5 % par tranche, réinjection à −33 %, sans stop, quotidien)

| | Levier 1× | Levier 2× |
|---|---|---|
| mars 2020 → mi-2023 | +194 %, pire baisse −43 % | +360 %, pire baisse −51 % |
| mi-2023 → nov. 2026 | **+6,5 %**, pire baisse −3 % | **+5,8 %**, pire baisse −7 % |
| Total 6,7 ans | +213 % (26 trades) | +387 % (26 trades) |

### 8.3 Ce qui a été testé et rejeté

| Stratégie | Résultat sur 5 ans |
|---|---|
| Ancienne stratégie à 4 agents (swing long/short) | −19 % (normal), −73 % (agressif) |
| Momentum sur un panier d'altcoins | illusion due au biais du survivant (LUNA, FTT…) |
| Day trading en barres d'1 h et de 4 h | −75 % à −99 % (les frais mangent tout) |
| Levier 2× à 3× sur le signal | 3× : capital anéanti |
| Shorts quand le signal est défavorable | perdants sur BTC comme sur ETH |
| Sentiment (Fear & Greed), taux de financement, hashrate | pas mieux que garder du BTC |

---

## 9. Limites à connaître

1. **Le gros du gain historique vient d'un seul trade** : ETH gardé pendant la hausse de 2021.
   Sur la période récente, le résultat est modeste (+6,5 % en 3 ans en 1×), parce que 5 % du capital
   expose peu.
2. **Un seul grand marché baissier (2022) dans l'historique** : statistiquement, c'est peu.
3. **Pas de stop** : après plusieurs réinjections dans un krach prolongé, la perte peut dépasser
   largement 5 % du capital.
4. **Peu de trades** (environ 4 par an) : il faudra des mois de fonctionnement en fictif pour juger.
5. **Aucune garantie de gain.** Le passé ne prédit pas l'avenir.

---

## 10. Réglages (`tradebot/config/strategy.yaml`, section `kraken.liquidity`)

| Réglage | Valeur | Rôle |
|---|---|---|
| `window_days` | 30 | fenêtre de variation de l'offre de stablecoins |
| `assets` | [BTC, ETH] | actifs tradés, un seul à la fois |
| `momentum_days` | 30 | choix du plus fort des deux |
| `tranche_pct` | 5 | % du capital par tranche |
| `reinject_drop_pct` | 33 | baisse déclenchant une réinjection |
| `max_tranches` | null | pas de limite de réinjections |
| `leverage` | 1 | 1× ou 2× (réinjections au même levier) |
| `decision_day` | daily | analyse chaque jour (`sunday` possible) |
| `stop_loss` | false | pas de stop chez le broker |

Pour revenir à l'ancienne stratégie : `mode: agents` dans la section `kraken`.
Pour rejouer la stratégie sur l'historique Kraken (environ 2 ans) : `backtest kraken 2024-01-01 2026-11-01`.
