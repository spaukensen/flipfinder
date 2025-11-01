# Guide d'Extraction des Lots Interencheres.com

## 🎯 Objectif

Extraire automatiquement les lots d'enchères depuis Interencheres.com dans n8n pour le système FlipFinder.

---

## 📦 Fichiers Créés

1. **`debug-save-html.js`** - Sauvegarder le HTML depuis n8n
2. **`extract-lots-interencheres.js`** - Code d'extraction pour n8n
3. **`analyze-interencheres-html.js`** - Script d'analyse standalone
4. Ce guide

---

## 🚀 Étape 1: Capturer le HTML

### Dans n8n:

1. Ouvrez votre workflow "Scanner Interencheres"
2. Ajoutez un nœud **Code** après le nœud HTTP Request
3. Collez le code de `debug-save-html.js`:

```javascript
const fs = require('fs');
const data = $input.first().json;
const html = data.html || data.body || '';

// Windows path
const savePath = 'C:\\temp\\interencheres-hilti.html';

// Ou Linux/Mac path
// const savePath = '/tmp/interencheres-hilti.html';

fs.writeFileSync(savePath, html);

return [{
  json: {
    saved: true,
    path: savePath,
    size: html.length,
    firstChars: html.substring(0, 200)
  }
}];
```

4. Exécutez le workflow
5. Le HTML sera sauvegardé dans `C:\temp\interencheres-hilti.html`

---

## 🔍 Étape 2: Analyser le HTML

### Option A: Depuis le projet FlipFinder

```bash
cd c:\wamp64\www\flipfinder
node analyze-interencheres-html.js C:\temp\interencheres-hilti.html
```

### Option B: Analyse rapide avec Node.js

```bash
node analyze-interencheres-html.js "C:\temp\interencheres-hilti.html"
```

### Ce que l'analyse vous montrera:

- ✅ Nombre de lots détectés
- ✅ Structure HTML (tags, classes, IDs)
- ✅ Sélecteurs CSS à utiliser
- ✅ Échantillon de 3 lots extraits
- ✅ Fichier JSON généré avec tous les lots

---

## ⚙️ Étape 3: Intégrer dans n8n

Une fois l'analyse terminée, vous connaîtrez les **sélecteurs CSS exacts**.

### Workflow n8n complet:

```
HTTP Request → Code (Extraction) → PostgreSQL (Save)
     ↓
  HTML brut
```

### Code d'extraction à utiliser:

Copiez le contenu de `extract-lots-interencheres.js` dans un nœud **Code** n8n.

Le code retourne:

```json
{
  "success": true,
  "totalLots": 63,
  "lots": [
    {
      "titre": "HILTI TE 6-A Perforateur",
      "prix": "45.00",
      "prixBrut": "45 €",
      "url": "https://www.interencheres.com/lot/12345",
      "image": "https://...",
      "source": "interencheres",
      "timestamp": "2024-11-01T10:30:00Z"
    }
  ]
}
```

---

## 🧪 Étape 4: Tester l'Extraction

### Test Manuel dans n8n:

1. Ajoutez un nœud **Code** avec le contenu de `extract-lots-interencheres.js`
2. Exécutez manuellement le workflow
3. Vérifiez le output du nœud Code
4. Vous devriez voir:
   - `success: true`
   - `totalLots: X`
   - Array de `lots` avec toutes les données

### Exemple de debug:

```javascript
// Ajoutez ça à la fin du code pour voir les résultats
console.log('=== RÉSULTATS EXTRACTION ===');
console.log('Lots trouvés:', lots.length);
console.log('Premier lot:', lots[0]);
```

---

## 📊 Sélecteurs CSS Probables

En attendant votre HTML, voici les sélecteurs les plus probables pour Interencheres:

### Sélecteurs à essayer (par ordre de priorité):

1. **Vuetify Cards** (Interencheres utilise Vue.js):
   ```css
   .v-card.lot-card
   .v-card[data-lot-id]
   ```

2. **Classes autoqa** (Tests E2E):
   ```css
   .autoqa-lot
   .autoqa-result-item
   .autoqa-lot-card
   ```

3. **Sélecteurs génériques**:
   ```css
   article.lot
   .search-results .lot-item
   [class*="lot-"]
   ```

4. **Par liens**:
   ```css
   a[href*="/lot/"]
   a[href*="/vente/"]
   ```

---

## 🔧 Ajustements Possibles

### Si l'extraction échoue:

1. **Vérifier le HTML complet**:
   ```javascript
   console.log('HTML size:', html.length);
   console.log('HTML preview:', html.substring(0, 500));
   ```

2. **Activer le mode debug**:
   ```javascript
   const DEBUG = true;
   if (DEBUG) {
     console.log('Sélecteurs testés:', selectors);
     console.log('Éléments trouvés:', elements.length);
   }
   ```

3. **Extraire depuis JSON** (si Nuxt SSR):
   ```javascript
   const nuxtData = html.match(/__NUXT__\s*=\s*(\{.+?\});/s);
   if (nuxtData) {
     const data = JSON.parse(nuxtData[1]);
     console.log('Nuxt data:', data);
   }
   ```

---

## 📋 Checklist d'Intégration

- [ ] Capturer le HTML depuis n8n
- [ ] Analyser avec `analyze-interencheres-html.js`
- [ ] Identifier les sélecteurs CSS
- [ ] Ajuster `extract-lots-interencheres.js`
- [ ] Tester extraction dans n8n
- [ ] Vérifier que tous les champs sont extraits:
  - [ ] Titre
  - [ ] Prix
  - [ ] URL
  - [ ] Image (optionnel)
  - [ ] Localisation (optionnel)
- [ ] Sauvegarder en DB PostgreSQL
- [ ] Configurer alertes Telegram

---

## 🐛 Troubleshooting

### Problème: "Aucun lot trouvé"

**Solution 1**: Le HTML n'est pas complètement chargé
```javascript
// Dans le nœud HTTP Request de n8n:
// Options → Wait for selector
await page.waitForSelector('.v-card');
```

**Solution 2**: Le site utilise du JavaScript pour charger les lots
```javascript
// Utiliser Puppeteer/Playwright au lieu de HTTP Request simple
// Voir: playwright-stealth/ dans le projet
```

**Solution 3**: Les sélecteurs CSS sont incorrects
```javascript
// Ajoutez des logs pour debug
console.log('Sélecteurs testés:', selectors);
selectors.forEach(sel => {
  const found = $(sel).length;
  console.log(`${sel}: ${found} éléments`);
});
```

### Problème: "Prix mal extrait"

```javascript
// Pattern de nettoyage de prix
const prix = prixText
  .replace(/[^\d,€]/g, '')  // Garder chiffres, virgule, €
  .replace(',', '.')         // Virgule → point
  .replace('€', '')          // Enlever €
  .trim();
```

### Problème: "URLs relatives"

```javascript
// Convertir URLs relatives en absolues
const fullUrl = url.startsWith('http')
  ? url
  : `https://www.interencheres.com${url}`;
```

---

## 📚 Ressources

### Documentation:

- [Cheerio (parsing HTML)](https://cheerio.js.org/)
- [n8n Code Node](https://docs.n8n.io/code-examples/javascript-functions/)
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)

### Dans le projet:

- `playwright-stealth/` - Pour contourner détection bot
- `init.sql` - Schema DB pour sauvegarder les lots
- `CLAUDE.md` - Documentation complète du projet

---

## 🎯 Prochaines Étapes

Une fois l'extraction fonctionnelle:

1. **Scoring automatique** (voir `CLAUDE.md` section Patterns)
2. **Alertes Telegram** pour lots score > 0.7
3. **Sauvegarde PostgreSQL** dans table `opportunites`
4. **Dashboard Grafana** pour monitoring

---

## 📞 Support

Si vous avez besoin d'aide:

1. Fournissez le fichier HTML complet
2. Partagez les logs de n8n
3. Indiquez le nombre de lots attendus vs trouvés

**Email**: flipfinder@ara-solutions.cloud
**GitHub**: [Issues du projet]

---

## ✅ Validation

Pour valider que tout fonctionne:

```bash
# 1. Tester l'analyse
node analyze-interencheres-html.js C:\temp\interencheres-hilti.html

# 2. Vérifier le JSON généré
cat C:\temp\interencheres-hilti-extracted-lots.json

# 3. Compter les lots
node -e "console.log(require('./C:/temp/interencheres-hilti-extracted-lots.json').length)"
```

Vous devriez obtenir le nombre de lots annoncé sur la page (ex: "63 Lots").

---

**Créé le**: 2024-11-01
**Version**: 1.0
**Auteur**: FlipFinder Team
