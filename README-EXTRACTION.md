# 🔧 Extraction Lots Interencheres - Guide Complet

## 📦 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `test-extraction-quick.js` | Test rapide - Fetch + Analyse HTML |
| `analyze-interencheres-html.js` | Analyse approfondie du HTML |
| `extract-lots-interencheres.js` | Code d'extraction pour n8n |
| `debug-save-html.js` | Sauvegarder HTML depuis n8n |
| `workflow-extract-lots-interencheres.json` | Workflow n8n complet |
| `GUIDE-EXTRACTION-INTERENCHERES.md` | Documentation détaillée |

---

## 🚀 Quick Start - 3 Commandes

### 1️⃣ Test Rapide (recommandé pour commencer)

```bash
cd c:\wamp64\www\flipfinder
node test-extraction-quick.js hilti
```

**Ce que ça fait:**
- ✅ Télécharge le HTML depuis Interencheres
- ✅ Analyse rapide de la structure
- ✅ Sauvegarde le HTML dans `C:\temp\interencheres-hilti.html`
- ✅ Affiche les recommandations de sélecteurs CSS

**Output attendu:**
```
🌐 Fetching: https://www.interencheres.com/recherche/?keyword=hilti&cat=14
✅ HTML récupéré: 453.25 KB

📊 ANALYSE RAPIDE DU HTML
==================================================
1. Lots annoncés: 63
2. Liens /lot/ trouvés: 63
3. Prix trouvés: 126
4. Classes autoqa: 15
...
```

---

### 2️⃣ Analyse Approfondie

```bash
node analyze-interencheres-html.js "C:\temp\interencheres-hilti.html"
```

**Ce que ça fait:**
- ✅ Analyse détaillée de la structure HTML
- ✅ Identification des sélecteurs CSS exacts
- ✅ Extraction automatique des lots
- ✅ Sauvegarde des lots dans `C:\temp\interencheres-hilti-extracted-lots.json`

**Output attendu:**
```
📄 Lecture du fichier: C:\temp\interencheres-hilti.html

📊 STATISTIQUES GÉNÉRALES
──────────────────────────────────────────────────
Taille HTML: 453.25 KB
Éléments totaux: 8542
Lots annoncés: 63

🔍 ANALYSE DES STRUCTURES POSSIBLES
──────────────────────────────────────────────────
1️⃣  Liens vers lots: 63
2️⃣  Éléments avec prix: 126
3️⃣  V-Cards (Vuetify): 63
...

🤖 TENTATIVE D'EXTRACTION AUTOMATIQUE
──────────────────────────────────────────────────
Lots extraits: 63

📦 ÉCHANTILLON DE LOTS EXTRAITS (3 premiers):

1. HILTI TE 6-A Perforateur burineur
   Prix: 45.00
   URL: https://www.interencheres.com/lot/12345
   Méthode: link-based

💾 Lots sauvegardés dans: C:\temp\interencheres-hilti-extracted-lots.json
```

---

### 3️⃣ Vérification des Lots Extraits

```bash
# Windows PowerShell
Get-Content "C:\temp\interencheres-hilti-extracted-lots.json" | ConvertFrom-Json | Measure-Object

# Windows CMD
type "C:\temp\interencheres-hilti-extracted-lots.json"

# Avec Node.js (multiplateforme)
node -e "console.log(JSON.parse(require('fs').readFileSync('C:/temp/interencheres-hilti-extracted-lots.json')).length)"
```

---

## 🔧 Installation des Dépendances

Si `cheerio` n'est pas installé:

```bash
cd c:\wamp64\www\flipfinder
npm install cheerio
```

---

## 📋 Workflow n8n - Import

### Étape 1: Importer le workflow

1. Ouvrez n8n: `http://flipfinder.ara-solutions.cloud`
2. Cliquez sur **Workflows** → **Import from File**
3. Sélectionnez: `workflow-extract-lots-interencheres.json`
4. Cliquez **Import**

### Étape 2: Configurer les credentials

Dans le workflow importé:

1. **PostgreSQL** → Configurer connexion DB
2. **Telegram** → Ajouter Bot Token et Chat ID

### Étape 3: Ajuster les sélecteurs CSS

Ouvrez le nœud **Code - Extract Lots** et modifiez les sélecteurs selon les résultats de l'analyse:

```javascript
const selectors = [
  '.v-card.lot-card',        // À ajuster selon votre analyse
  '.autoqa-lot',             // À ajuster selon votre analyse
  'a[href*="/lot/"]'         // Sélecteur de fallback
];
```

### Étape 4: Tester

1. Désactivez le **Cron** (pour test manuel)
2. Cliquez **Execute Workflow**
3. Vérifiez le output du nœud **Code - Extract Lots**
4. Vérifiez que les lots sont bien sauvegardés en DB

---

## 🐛 Troubleshooting

### Problème: "HTML trop court"

**Cause:** Le site nécessite JavaScript pour charger les lots.

**Solution:** Utiliser Puppeteer/Playwright au lieu de HTTP Request simple.

```javascript
// Dans n8n, remplacer HTTP Request par un nœud Puppeteer
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://www.interencheres.com/recherche/?keyword=hilti&cat=14');
await page.waitForSelector('.v-card'); // Attendre le chargement
const html = await page.content();
await browser.close();
```

**Ou utiliser le service playwright-stealth:**

```bash
cd c:\wamp64\www\flipfinder\playwright-stealth
node index.js
```

---

### Problème: "Aucun lot trouvé"

**Diagnostic:**

```javascript
// Ajoutez ça dans le nœud Code pour debug
console.log('HTML size:', html.length);
console.log('HTML preview:', html.substring(0, 500));

selectors.forEach(sel => {
  const found = $(sel).length;
  console.log(`${sel}: ${found} éléments`);
});
```

**Solutions:**

1. Vérifiez que le HTML est complet (> 100KB)
2. Testez les sélecteurs un par un
3. Utilisez l'analyse pour trouver les bons sélecteurs
4. Activez l'extraction depuis JSON si Nuxt SSR

---

### Problème: "Prix mal formatés"

**Nettoyage de prix:**

```javascript
const prix = prixText
  .replace(/\s/g, '')           // Enlever espaces
  .replace(/[^\d,€]/g, '')      // Garder chiffres, virgule, €
  .replace(',', '.')            // Virgule → point
  .replace('€', '')             // Enlever €
  .trim();

// Convertir en nombre
const prixNumber = parseFloat(prix) || 0;
```

---

### Problème: "Données manquantes (image, localisation)"

**Extraction défensive:**

```javascript
const lot = {
  titre: $el.find('.title').text().trim() || 'Sans titre',
  prix: extractPrix($el) || '0',
  url: $el.find('a').attr('href') || '',
  image: $el.find('img').attr('src') || '',
  localisation: $el.find('.location').text().trim() || '',
  dateEnchere: $el.find('.date').text().trim() || '',
  // Fallback si champs vides
  metadata: $el.html() // Sauvegarder HTML brut pour debug
};
```

---

## 📊 Validation des Résultats

### Checklist:

- [ ] Le nombre de lots extraits correspond au nombre affiché (ex: "63 Lots")
- [ ] Tous les lots ont un **titre** non vide
- [ ] Tous les lots ont une **URL** valide
- [ ] Les **prix** sont au format numérique correct
- [ ] Les **images** sont des URLs complètes (https://...)
- [ ] Les lots sont bien **sauvegardés en DB**
- [ ] Les **alertes Telegram** fonctionnent

### Requête SQL de vérification:

```sql
-- Vérifier les lots insérés
SELECT
  COUNT(*) as total,
  COUNT(DISTINCT titre) as titres_uniques,
  COUNT(DISTINCT url) as urls_uniques,
  AVG(prix_depart) as prix_moyen,
  MAX(created_at) as derniere_insertion
FROM opportunites
WHERE source = 'interencheres'
  AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 🎯 Optimisations Avancées

### 1. Cache pour éviter les re-scrapes

```javascript
// Dans le nœud Code
const cache = new Map();
const cacheKey = `interencheres_${keyword}`;

if (cache.has(cacheKey)) {
  const cached = cache.get(cacheKey);
  if (Date.now() - cached.timestamp < 1800000) { // 30min
    console.log('✓ Utilisation du cache');
    return [cached.data];
  }
}

// ... extraction ...

cache.set(cacheKey, {
  data: result,
  timestamp: Date.now()
});
```

---

### 2. Détection de changements (uniquement nouveaux lots)

```sql
-- N'insérer que les lots non existants
INSERT INTO opportunites (titre, prix_depart, url, ...)
VALUES (...)
ON CONFLICT (url) DO NOTHING
RETURNING *;
```

---

### 3. Scoring automatique

Ajoutez après l'extraction:

```javascript
lots.forEach(lot => {
  let score = 0;

  // Marques premium
  if (/hilti|festool|milwaukee/i.test(lot.titre)) score += 0.3;

  // Prix bas
  if (parseFloat(lot.prix) < 50) score += 0.2;

  // Signaux liquidation
  if (/liquidation|cessation|urgent/i.test(lot.titre)) score += 0.3;

  lot.score = score;
});

// Filtrer score > 0.7
const highScoreLots = lots.filter(lot => lot.score > 0.7);
```

---

## 📚 Ressources

- **Guide complet**: `GUIDE-EXTRACTION-INTERENCHERES.md`
- **Documentation projet**: `CLAUDE.md`
- **Schema DB**: `init.sql`
- **Playwright stealth**: `playwright-stealth/`

---

## 🔄 Workflow Complet (Résumé)

```
┌─────────────┐
│   Cron      │ Toutes les 30min
│  (n8n)      │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│  HTTP Request /     │ Fetch HTML
│  Puppeteer          │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  Code - Extract     │ Parser HTML → Lots
│  (cheerio)          │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  Split Out          │ 1 item par lot
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  PostgreSQL         │ Sauvegarder en DB
│  (opportunites)     │
└──────┬──────────────┘
       │
       v
┌─────────────────────┐
│  Telegram           │ Alertes si score > 0.7
└─────────────────────┘
```

---

## ✅ Commandes Rapides (Mémo)

```bash
# 1. Test rapide
node test-extraction-quick.js hilti

# 2. Analyse approfondie
node analyze-interencheres-html.js "C:\temp\interencheres-hilti.html"

# 3. Vérifier lots extraits
node -pe "JSON.parse(fs.readFileSync('C:/temp/interencheres-hilti-extracted-lots.json')).length"

# 4. Lancer Playwright Stealth (si nécessaire)
cd playwright-stealth && node index.js

# 5. Logs n8n
docker logs -f outillage_n8n --tail=100
```

---

## 📞 Support

Si vous êtes bloqué:

1. **Fournissez:**
   - Le fichier HTML complet (`C:\temp\interencheres-*.html`)
   - Les logs de n8n
   - Le résultat de `test-extraction-quick.js`

2. **Vérifiez:**
   - Cheerio installé: `npm list cheerio`
   - Node.js version: `node --version` (>= 18 recommandé)
   - Accès au site: `curl https://www.interencheres.com`

3. **Contact:**
   - GitHub Issues
   - Email: flipfinder@ara-solutions.cloud

---

**Dernière mise à jour:** 2024-11-01
**Version:** 1.0
**Auteur:** FlipFinder Team
