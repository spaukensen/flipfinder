# 📊 Workflow Estimation LeBonCoin v2

## Vue d'Ensemble

Ce workflow automatisé permet d'estimer la valeur de revente d'outils professionnels sur LeBonCoin en analysant les offres actives et vendues.

### 🎯 Objectifs
- **Extraction automatique** de la référence produit (ex: "TE 60" pour Hilti)
- **Scraping double** : offres actives + offres vendues
- **Scope France entière** via paramètre `shippable=1`
- **Statistiques complètes** : min, max, moyen, médian, ROI

---

## 🔄 Flux du Workflow

```
┌─────────────────┐
│  Trigger 2h     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lire GSheet     │ ← Lit toutes les lignes du Google Sheet
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Extraire Référence Produit  │ ← Détecte référence (ex: TE60, M18, TS55)
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│ Traiter 1 par 1 │ ← Split en batches
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Construire URLs │ ← Génère 2 URLs (actives + vendues)
└────────┬────────┘
         │
         ├───────────────────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Scrape ACTIVES   │    │ Scrape VENDUES   │
└────────┬─────────┘    └─────────┬────────┘
         │                        │
         └───────────┬────────────┘
                     ▼
         ┌──────────────────────┐
         │ Fusionner Résultats  │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │ Extraire Prix Stats  │ ← Calcule min/max/moyen/médian/ROI
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │ Update Google Sheet  │ ← Écrit les résultats
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │ Loop → Produit suiv. │
         └──────────────────────┘
```

---

## 🔧 Nœuds du Workflow

### 1. **Trigger : Toutes les 2h**
- **Type** : Schedule Trigger
- **Fréquence** : Toutes les 2 heures
- **Rôle** : Déclenche automatiquement l'estimation

### 2. **Lire Google Sheets**
- **Type** : Google Sheets
- **Operation** : Read
- **Sheet ID** : `1aXhXYEybgfXURg2QYduYL61dSPv4WPPqzp4hfgPpGNo`
- **Filtre** : Tous les produits avec `marque_detectee` renseignée

### 3. **Extraire Référence Produit** ⭐
**Node le plus important** - Extraction intelligente avec **FALLBACK automatique**

Ce node utilise **2 stratégies** :
- ✅ **Stratégie 1** : Référence détectée → Recherche précise (ex: "Hilti TE60")
- 🔄 **Stratégie 2** : Pas de référence → Fallback mots-clés intelligents (ex: "DeWalt perceuse visseuse 18v")

#### Patterns supportés par marque :

| Marque | Patterns | Exemples |
|--------|----------|----------|
| **Hilti** | `TE xx`, `DD xx`, `SDS xx`, `SF xx` | TE 60, DD 150, SF 10 |
| **Festool** | `TS xx`, `OF xxxx`, `CT xx`, `RO xx` | TS 55, OF 1400, CT 26 |
| **Milwaukee** | `Mxx`, `HD18` | M18, M12, HD18 |
| **Makita** | `DXXxxxx`, `BLxxxx`, `HRxxxx` | DHR263, BL1850, HR2470 |
| **DeWalt** | `DCxxx`, `DWxxx`, `DCFxxx` | DCF887, DCD996, DWE315 |
| **Bosch** | `GBH xx`, `GSR xx`, `GWS xx` | GBH 36, GSR 18, GWS 18 |

#### Code d'extraction :
```javascript
const REFERENCE_PATTERNS = {
  'hilti': [
    /\b(TE[\s-]?\d+[A-Z]*)/gi,
    /\b(DD[\s-]?\d+[A-Z]*)/gi,
    /\b(SDS[\s-]?\d+)/gi
  ],
  // ... autres marques
};

function extractReference(titre, marque) {
  const patterns = REFERENCE_PATTERNS[marque.toLowerCase()];
  for (const pattern of patterns) {
    const match = titre.match(pattern);
    if (match) {
      return match[0].replace(/[\s-]/g, '').toUpperCase();
    }
  }
  return null;
}
```

#### Fallback Intelligent ⭐ NOUVEAU

Si **aucune référence** n'est détectée, le workflow utilise un **système de fallback** :

**Exemple :**
```
Titre: "DeWalt perceuse visseuse sans fil 18V lithium avec batterie"
Marque: "DeWalt"

❌ Pas de référence DCxxx/DWxxx détectée

✅ FALLBACK activé :
1. Suppression stopwords : "sans", "avec" → supprimés
2. Extraction keywords : "perceuse", "visseuse", "18v", "lithium" → conservés
3. Génération query : "DeWalt perceuse visseuse 18v lithium"
```

**Règles du fallback :**
- ✅ Conserve : keywords outillage (60+ termes), nombres avec unités, mots > 4 caractères
- ❌ Supprime : stopwords (30+ termes : "de", "le", "avec", "sans", etc.)
- 📏 Limite : 4 mots-clés maximum

**Résultat** : TOUS les produits sont traités, même sans référence !

Voir [exemples-extraction-recherche.md](./exemples-extraction-recherche.md) pour 10+ cas concrets.

### 4. **Traiter un par un**
- **Type** : Split In Batches
- **Reset** : false
- **Rôle** : Évite de surcharger LeBonCoin avec trop de requêtes simultanées

### 5. **Construire URLs LBC** ⭐

Génère 2 URLs de recherche :

#### URL Offres ACTIVES
```
https://www.leboncoin.fr/recherche?
  text=Hilti+TE60
  &category=15          ← Bricolage
  &shippable=1          ← France entière
  &sort=time
  &order=desc
```

#### URL Offres VENDUES
```
https://www.leboncoin.fr/recherche?
  text=Hilti+TE60
  &category=15
  &shippable=1
  &search_type=sold     ← DIFFÉRENCE CLÉ
  &sort=time
  &order=desc
```

**Paramètres importants** :
- `shippable=1` : Limite aux annonces expédiables = portée nationale
- `category=15` : Catégorie Bricolage
- `search_type=sold` : Affiche uniquement les annonces vendues

### 6. **Scraper Offres ACTIVES + VENDUES**
- **Type** : HTTP Request (x2 en parallèle)
- **Method** : POST
- **URL** : `http://playwright-stealth:3001/scrape`
- **Timeout** : 90s
- **Body** :
```json
{
  "url": "{{ $json.lbc_url_active }}",
  "waitFor": 5000
}
```

**Pourquoi Playwright-stealth ?**
- Bypass Cloudflare
- Headers réalistes
- Anti-détection bot

### 7. **Fusionner Résultats**
- **Type** : Merge
- **Mode** : Combine by position
- **Rôle** : Fusionne les 2 réponses (actives + vendues) en un seul objet

### 8. **Extraire Prix & Calculer Stats** ⭐

#### Extraction des prix
```javascript
const pricePatterns = [
  /<span[^>]*data-qa-id="aditem_price"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/span>/gi,
  /<p[^>]*data-test-id="price"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/p>/gi,
  /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/span>/gi
];
```

#### Calculs statistiques
- **Prix min** : Plus bas prix trouvé
- **Prix max** : Plus haut prix trouvé
- **Prix moyen** : Moyenne arithmétique
- **Prix médian** : Valeur centrale (plus robuste que la moyenne)
- **Nb annonces actives** : Compte des offres en vente
- **Nb annonces vendues** : Compte des offres écoulées
- **Opportunité €** : `Prix médian LBC - Prix Interencheres`
- **ROI %** : `((Prix médian - Prix achat) / Prix achat) * 100`

#### Exemple de sortie
```json
{
  "lot_id": "12345",
  "reference_extraite": "TE60",
  "prix_lbc_min": 180,
  "prix_lbc_max": 450,
  "prix_lbc_moyen": 315,
  "prix_lbc_median": 320,
  "nb_annonces_actives": 8,
  "nb_annonces_vendues": 12,
  "nb_annonces_total": 20,
  "opportunite_estimee": 220,
  "roi_estime": 220,
  "date_estimation": "2024-10-31T15:30:00.000Z"
}
```

### 9. **Mettre à jour Google Sheets**
- **Type** : Google Sheets
- **Operation** : Append or Update
- **Matching Column** : `lot_id`
- **Rôle** : Écrit les résultats dans la ligne correspondante

**Colonnes mises à jour** :
- `reference_extraite`
- `prix_lbc_min` / `max` / `moyen` / `median`
- `nb_annonces_actives` / `vendues` / `total`
- `opportunite_estimee`
- `roi_estime`
- `date_estimation`

### 10. **Retour au split**
- **Type** : NoOp
- **Rôle** : Boucle pour traiter le produit suivant

---

## 📊 Structure Google Sheet Attendue

### Colonnes en entrée (lecture)
| Colonne | Type | Description |
|---------|------|-------------|
| `lot_id` | String | ID unique du lot |
| `titre` | String | Titre du produit (référence sera extraite) |
| `marque_detectee` | String | Marque détectée (Hilti, Festool, etc.) |
| `prix` | Number | Prix Interencheres |
| `url` | String | URL Interencheres |
| `prix_lbc_min` | Number | (vide au départ) Pour vérifier si déjà estimé |

### Colonnes en sortie (écriture)
| Colonne | Type | Description |
|---------|------|-------------|
| `reference_extraite` | String | Référence produit (ex: TE60) ou null |
| `search_query` | String | **NOUVEAU** - Requête utilisée (référence OU mots-clés) |
| `search_type` | String | **NOUVEAU** - "reference" ou "keywords" |
| `prix_lbc_min` | Number | Prix minimum trouvé |
| `prix_lbc_max` | Number | Prix maximum trouvé |
| `prix_lbc_moyen` | Number | Prix moyen |
| `prix_lbc_median` | Number | Prix médian ⭐ |
| `nb_annonces_actives` | Number | Nombre d'offres actives |
| `nb_annonces_vendues` | Number | Nombre d'offres vendues |
| `nb_annonces_total` | Number | Total offres analysées |
| `opportunite_estimee` | Number | Marge estimée en € |
| `roi_estime` | Number | ROI en % |
| `date_estimation` | DateTime | Date de l'estimation |

---

## 🚀 Utilisation

### Import dans n8n
1. Se connecter à n8n : `https://flipfinder.ara-solutions.cloud`
2. Aller dans **Workflows** → **Import from File**
3. Sélectionner `estimation-leboncoin-v2.json`
4. Configurer les credentials Google Sheets
5. Activer le workflow

### Configuration Google Sheets
1. Créer un nouveau projet Google Cloud
2. Activer l'API Google Sheets
3. Créer des credentials OAuth 2.0
4. Dans n8n : **Credentials** → **Google Sheets OAuth2** → Ajouter

### Test Manuel
1. Désactiver le trigger automatique
2. Cliquer sur **Execute Workflow**
3. Vérifier les résultats dans le Google Sheet

---

## 🔍 Debugging

### Problème : Pas de prix extrait
**Cause** : Pattern HTML LeBonCoin a changé
**Solution** :
1. Aller sur LeBonCoin manuellement
2. Inspecter l'élément prix (F12)
3. Mettre à jour les patterns dans le node "Extraire Prix"

### Problème : Timeout Playwright
**Cause** : LeBonCoin prend trop de temps à charger
**Solution** :
- Augmenter `waitFor` à 7000-10000ms
- Vérifier que `playwright-stealth` est bien démarré :
```bash
docker logs outillage_playwright
```

### Problème : Référence non détectée
**Cause** : Pattern de la marque manquant
**Solution** :
Ajouter le pattern dans `REFERENCE_PATTERNS` :
```javascript
'nouvelle_marque': [
  /\b(PATTERN_REGEX)/gi
]
```

### Problème : Trop de requêtes → Ban IP
**Cause** : Scraping trop rapide
**Solution** :
- Ajouter un délai entre chaque produit
- Utiliser un proxy rotatif
- Réduire la fréquence du trigger (4h au lieu de 2h)

---

## 📈 Optimisations Futures

### 1. Cache Redis
Éviter de re-scraper les mêmes références sous 24h
```javascript
// Pseudo-code
const cacheKey = `lbc:${marque}:${reference}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### 2. Proxy Rotatif
Pour éviter les bans IP avec Bright Data ou Oxylabs
```javascript
const proxyUrl = getNextProxy(); // Rotation
await page.setProxy(proxyUrl);
```

### 3. ML Price Prediction
Prédire le prix de vente optimal avec un modèle
```python
model = train_model(historical_data)
optimal_price = model.predict([features])
```

### 4. Webhook Alertes
Notifier Telegram quand ROI > 200%
```javascript
if (roi_estime > 200) {
  await sendTelegramAlert(lot_id, roi_estime);
}
```

### 5. Export CSV
Générer un rapport hebdomadaire
```javascript
const csv = json2csv(results);
await sendEmail(csv);
```

---

## 🐛 Logs & Monitoring

### Voir les exécutions
```bash
# Logs n8n
docker logs outillage_n8n -f --tail=100

# Logs Playwright
docker logs outillage_playwright -f --tail=50
```

### Requêtes SQL utiles
```sql
-- Produits avec meilleur ROI
SELECT lot_id, titre, roi_estime, opportunite_estimee
FROM opportunites
WHERE roi_estime > 200
ORDER BY roi_estime DESC
LIMIT 10;

-- Performance par marque
SELECT
  marque_detectee,
  AVG(roi_estime) as roi_moyen,
  COUNT(*) as nb_produits
FROM opportunites
WHERE date_estimation > NOW() - INTERVAL '7 days'
GROUP BY marque_detectee
ORDER BY roi_moyen DESC;
```

---

## 📚 Ressources

- [n8n Docs](https://docs.n8n.io)
- [LeBonCoin API](https://www.leboncoin.fr/robots.txt)
- [Playwright Stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## 🔐 Sécurité

- **Ne jamais commit** les credentials Google
- **Rate limiting** : Max 1 requête / 5 secondes vers LeBonCoin
- **User-Agent** : Toujours utiliser un UA réaliste
- **Respect robots.txt** : Vérifier `/robots.txt` des sites scrapés

---

## 📝 Changelog

### v2.1.0 (31/10/2024) - FALLBACK INTELLIGENT
- ✨ **NOUVEAU** : Fallback automatique pour titres sans référence
- ✨ **NOUVEAU** : Extraction intelligente de mots-clés (60+ keywords outillage)
- ✨ **NOUVEAU** : Suppression de 30+ stopwords
- ✨ **NOUVEAU** : Colonnes `search_query` et `search_type` dans Google Sheet
- 📊 Couverture : 100% des produits traités (vs 60% avant)
- 📚 Documentation : Ajout [exemples-extraction-recherche.md](./exemples-extraction-recherche.md)

### v2.0.0 (31/10/2024)
- ✨ Extraction automatique de référence produit
- ✨ Scraping des offres vendues en plus des actives
- ✨ Calcul du prix médian (plus robuste)
- ✨ Comptage séparé actives/vendues
- ✨ Calcul ROI en %
- 🐛 Fix patterns prix LeBonCoin (data-test-id)

### v1.0.0 (30/10/2024)
- Initial release
- Scraping offres actives uniquement
- Recherche par titre complet
