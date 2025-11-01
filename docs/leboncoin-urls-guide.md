# 🔍 Guide des URLs LeBonCoin

## 📋 Format des URLs

### ✅ URL de base (CONFIRMÉE)
```
https://www.leboncoin.fr/recherche?text=dewalt
```

### 🔧 Paramètres Testés

#### 1. Recherche Simple
```
https://www.leboncoin.fr/recherche?text=hilti+te60
```
- ✅ Fonctionne
- Retourne toutes les annonces actives

#### 2. Avec Catégorie (à tester)
```
https://www.leboncoin.fr/recherche?text=hilti&category=15
```
- ⚠️ À vérifier si category=15 existe toujours
- Peut nécessiter un ID différent

#### 3. France Entière (à tester)
```
https://www.leboncoin.fr/recherche?text=hilti&shippable=1
```
OU
```
https://www.leboncoin.fr/recherche?text=hilti&location=france
```
- ⚠️ À tester

#### 4. Offres Vendues (CRITIQUE - à tester)
```
https://www.leboncoin.fr/recherche?text=hilti&owner_type=all
```
OU
```
https://www.leboncoin.fr/recherche?text=hilti&sold=1
```
OU
```
https://www.leboncoin.fr/recherche?text=hilti&search_type=sold
```
- ⚠️ **IMPORTANT** : Ce paramètre doit être validé manuellement
- LeBonCoin peut avoir changé son API

---

## 🧪 Plan de Test

### Étape 1 : Test URL de base
1. Ouvrir navigateur
2. Tester : `https://www.leboncoin.fr/recherche?text=hilti+te60`
3. Vérifier que des résultats s'affichent

### Étape 2 : Test offres vendues
Pour trouver le bon paramètre :

1. Aller sur https://www.leboncoin.fr/
2. Chercher "hilti te60"
3. **Activer le filtre "Objets vendus"** dans l'interface
4. Regarder l'URL dans la barre d'adresse
5. Noter le paramètre exact utilisé

**Exemple attendu :**
```
Avant filtre : /recherche?text=hilti+te60
Après filtre : /recherche?text=hilti+te60&PARAM_INCONNU=VALEUR
```

### Étape 3 : Mettre à jour le workflow
Une fois le paramètre trouvé, modifier le node "Construire URLs LBC" :

```javascript
// Remplacer cette ligne
const urlSold = `https://www.leboncoin.fr/recherche?text=${searchQuery}&owner_type=all`;

// Par le bon paramètre trouvé, par exemple :
const urlSold = `https://www.leboncoin.fr/recherche?text=${searchQuery}&PARAM_TROUVE=VALEUR`;
```

---

## 🎯 Version Actuelle du Workflow

### URLs Générées (v2.1)

```javascript
// ACTIVES - Format simple validé
const urlActive = `https://www.leboncoin.fr/recherche?text=${searchQuery}`;

// VENDUES - À VALIDER MANUELLEMENT
const urlSold = `https://www.leboncoin.fr/recherche?text=${searchQuery}&owner_type=all`;
```

---

## 🔍 Inspection Manuelle Recommandée

### Méthode 1 : Interface LeBonCoin
1. Aller sur leboncoin.fr
2. Chercher "hilti te60"
3. **Inspecter le réseau** (F12 → Network)
4. Activer filtre "Vendus"
5. Observer la requête XHR/API
6. Noter l'endpoint et paramètres

### Méthode 2 : HTML Source
```javascript
// Dans le scraper, inspecter le HTML retourné
console.log(html);

// Chercher des classes/attributs spécifiques pour les vendus
// Par exemple : data-qa-id="sold_item" ou class="sold-badge"
```

---

## ⚠️ Alternative : Scraper SANS filtre "Vendus"

Si le paramètre "vendus" est introuvable ou bloqué :

### Solution de Secours
```javascript
// Scraper UNIQUEMENT les offres actives
const urlActive = `https://www.leboncoin.fr/recherche?text=${searchQuery}`;

// NE PAS scraper les vendues
// Calculer les stats uniquement sur les actives

// Dans le node "Extraire Prix"
const pricesActive = extractPrices(htmlActive);
// const pricesSold = []; // Vide

const allPrices = pricesActive; // Uniquement actives
```

**Avantage :**
- Plus simple
- Moins de requêtes
- Données toujours à jour (vendues peuvent être anciennes)

**Inconvénient :**
- Manque de données historiques
- Estimation basée uniquement sur prix demandés (pas prix réels)

---

## 📊 Impact sur l'Estimation

### Avec Offres Vendues
- ✅ Données historiques réelles
- ✅ Prix de vente confirmés
- ✅ Meilleure estimation de la valeur marché

### Sans Offres Vendues (Actives uniquement)
- ⚠️ Prix demandés (peut être surévalué)
- ⚠️ Pas de confirmation de vente
- ✅ Données actuelles du marché
- ✅ Plus simple à maintenir

---

## 🚀 Recommandation

### Option A : Validation Manuelle (Idéal)
1. Tester manuellement sur leboncoin.fr
2. Trouver le paramètre "vendus"
3. Mettre à jour le workflow

### Option B : Actives Uniquement (Pragmatique)
1. Supprimer le scraping des vendues
2. Baser l'estimation sur les actives uniquement
3. Déployer rapidement

### Option C : Hybride (Compromis)
1. Lancer avec actives uniquement
2. Tester les vendues en parallèle
3. Ajouter les vendues une fois validé

---

## 🔧 Modification Rapide pour "Actives Uniquement"

Si vous voulez démarrer rapidement avec uniquement les offres actives :

### Dans le node "Construire URLs LBC"
```javascript
const data = $input.first().json;
const searchQuery = encodeURIComponent(data.search_query);

// URL simple pour offres actives
const urlActive = `https://www.leboncoin.fr/recherche?text=${searchQuery}`;

return {
  json: {
    ...data,
    lbc_url_active: urlActive,
    // Pas de lbc_url_sold pour l'instant
  }
};
```

### Dans le node "Scraper"
- Supprimer le node "Scraper Offres VENDUES"
- Garder seulement "Scraper Offres ACTIVES"
- Adapter le merge en conséquence

---

Voulez-vous que je :
1. **Teste manuellement** les URLs pour trouver le bon paramètre "vendus" ?
2. **Modifie le workflow** pour fonctionner avec actives uniquement ?
3. **Crée une version hybride** qui teste les deux ?
