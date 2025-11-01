# 🧪 Exemples d'Extraction de Recherche - Workflow Estimation LeBonCoin

Ce document présente des exemples concrets de traitement des titres avec et sans référence.

---

## 🎯 Stratégie Double

Le workflow utilise **2 stratégies** selon le contenu du titre :

### ✅ **Stratégie 1 : Référence Détectée** (Idéal)
- Extraction de la référence exacte (ex: TE60, M18, TS55)
- Recherche LBC : `Marque + Référence`
- **Précision maximale**

### 🔄 **Stratégie 2 : Fallback Intelligent** (Pas de référence)
- Extraction de mots-clés pertinents
- Suppression des stopwords
- Recherche LBC : `Marque + Mots-clés`
- **Pertinence maintenue**

---

## 📊 Exemples Concrets

### 🟢 CAS 1 : Référence Détectée - Hilti

**Entrée Google Sheet :**
```
titre: "Perforateur HILTI TE 60 ATC avec 3 batteries et coffret"
marque_detectee: "Hilti"
```

**Traitement :**
```javascript
// Extraction
reference_extraite: "TE60"
search_query: "Hilti TE60"
search_type: "reference"

// URL générée
https://www.leboncoin.fr/recherche?text=Hilti+TE60&category=15&shippable=1
```

**Résultat :** ✅ Recherche ultra-précise sur le modèle exact

---

### 🟢 CAS 2 : Référence Détectée - Festool

**Entrée Google Sheet :**
```
titre: "Scie circulaire FESTOOL TS 55 REQ plongeante rail FSK"
marque_detectee: "Festool"
```

**Traitement :**
```javascript
// Extraction
reference_extraite: "TS55"
search_query: "Festool TS55"
search_type: "reference"

// URL générée
https://www.leboncoin.fr/recherche?text=Festool+TS55&category=15&shippable=1
```

**Résultat :** ✅ Focus sur le modèle TS55 (ignorant REQ, FSK)

---

### 🟢 CAS 3 : Référence Détectée - Milwaukee

**Entrée Google Sheet :**
```
titre: "Visseuse à chocs MILWAUKEE M18 FPD brushless 2x5Ah"
marque_detectee: "Milwaukee"
```

**Traitement :**
```javascript
// Extraction
reference_extraite: "M18"
search_query: "Milwaukee M18"
search_type: "reference"

// URL générée
https://www.leboncoin.fr/recherche?text=Milwaukee+M18&category=15&shippable=1
```

**Résultat :** ✅ Recherche sur la gamme M18

---

### 🟡 CAS 4 : Fallback - DeWalt sans référence

**Entrée Google Sheet :**
```
titre: "DeWalt perceuse visseuse sans fil 18V lithium avec batterie"
marque_detectee: "DeWalt"
```

**Traitement :**
```javascript
// Pas de pattern référence détecté
reference_extraite: null

// Fallback intelligent
Mots bruts: ["dewalt", "perceuse", "visseuse", "sans", "fil", "18v", "lithium", "avec", "batterie"]

Filtrage stopwords: ["sans", "avec"] → supprimés
Keywords outillage: ["perceuse", "visseuse", "fil", "lithium", "batterie"] → conservés
Nombres: ["18v"] → conservés

search_query: "DeWalt perceuse visseuse 18v lithium"
search_type: "keywords"

// URL générée
https://www.leboncoin.fr/recherche?text=DeWalt+perceuse+visseuse+18v+lithium&category=15&shippable=1
```

**Résultat :** ✅ Recherche pertinente malgré l'absence de référence

---

### 🟡 CAS 5 : Fallback - Bosch perceuse filaire

**Entrée Google Sheet :**
```
titre: "Bosch perceuse à percussion filaire 750W professional coffret"
marque_detectee: "Bosch"
```

**Traitement :**
```javascript
// Pas de pattern référence détecté (GBH, GSR, GWS)
reference_extraite: null

// Fallback intelligent
Mots bruts: ["bosch", "perceuse", "à", "percussion", "filaire", "750w", "professional", "coffret"]

Filtrage stopwords: ["à"] → supprimé
Keywords outillage: ["perceuse", "percussion", "filaire", "750w", "professional", "coffret"] → conservés

search_query: "Bosch perceuse percussion filaire 750w"
search_type: "keywords"

// URL générée (limité à 4 mots-clés)
https://www.leboncoin.fr/recherche?text=Bosch+perceuse+percussion+filaire+750w&category=15&shippable=1
```

**Résultat :** ✅ Recherche descriptive précise

---

### 🟡 CAS 6 : Fallback - Makita meuleuse

**Entrée Google Sheet :**
```
titre: "Makita meuleuse d'angle brushless 125mm batterie 18V coffret"
marque_detectee: "Makita"
```

**Traitement :**
```javascript
// Pas de pattern DXXxxxx détecté
reference_extraite: null

// Fallback intelligent
Mots bruts: ["makita", "meuleuse", "d'angle", "brushless", "125mm", "batterie", "18v", "coffret"]

Filtrage:
- "d'angle" → mot composé, garde "angle"
- Keywords: ["meuleuse", "brushless", "batterie", "coffret"]
- Nombres: ["125mm", "18v"]

search_query: "Makita meuleuse brushless 125mm 18v"
search_type: "keywords"

// URL générée
https://www.leboncoin.fr/recherche?text=Makita+meuleuse+brushless+125mm+18v&category=15&shippable=1
```

**Résultat :** ✅ Caractéristiques techniques capturées

---

### 🔴 CAS 7 : Titre très court (edge case)

**Entrée Google Sheet :**
```
titre: "Hilti TE"
marque_detectee: "Hilti"
```

**Traitement :**
```javascript
// Pattern pas assez précis (TE nécessite un chiffre)
reference_extraite: null

// Fallback
Mots bruts: ["hilti", "te"]
Après filtrage: "te" (trop court, < 4 caractères)

search_query: "Hilti"
search_type: "keywords"

// URL générée
https://www.leboncoin.fr/recherche?text=Hilti&category=15&shippable=1
```

**Résultat :** ⚠️ Recherche large (tous les Hilti)

---

### 🟢 CAS 8 : Référence avec espaces/tirets

**Entrée Google Sheet :**
```
titre: "HILTI TE-60 ATC AVR perforateur burineur SDS-MAX"
marque_detectee: "Hilti"
```

**Traitement :**
```javascript
// Pattern détecte malgré le tiret
Match: "TE-60"

// Normalisation (suppression espaces/tirets)
reference_extraite: "TE60"
search_query: "Hilti TE60"
search_type: "reference"

// URL générée
https://www.leboncoin.fr/recherche?text=Hilti+TE60&category=15&shippable=1
```

**Résultat :** ✅ Normalisation automatique

---

## 📝 Résumé des Règles de Fallback

### Mots Conservés
✅ **Keywords outillage** (60+ termes)
```
perceuse, visseuse, perforateur, meuleuse, scie, ponceuse,
raboteuse, défonceuse, sauteuse, circulaire, plongeante,
burineur, marteau, piqueur, fraiseuse, tronçonneuse,
filaire, sans fil, batterie, brushless, coffret, systainer,
sds, plus, max, compact, fuel, xr, professional
```

✅ **Nombres avec unités**
```
18v, 5ah, 750w, 125mm, etc.
```

✅ **Mots longs** (> 4 caractères)
```
perforateur, lithium, accessoire, etc.
```

### Mots Supprimés
❌ **Stopwords** (30+ termes)
```
lot, de, le, la, les, un, une, des, avec, sans,
en, pour, par, sur, sous, et, ou, très, bon, état,
neuf, occasion, comme, quasi, pro, professionnel,
outil, outils, machine, machines, accessoire, accessoires
```

### Limite
⚠️ **Maximum 4 mots-clés** pour éviter URL trop longue

---

## 🎯 Comparaison Avant/Après

### ❌ AVANT (sans fallback)
```
Titre: "DeWalt perceuse visseuse sans fil 18V"
→ Pas de référence → ❌ Produit ignoré
```

### ✅ APRÈS (avec fallback)
```
Titre: "DeWalt perceuse visseuse sans fil 18V"
→ Pas de référence → ✅ Fallback keywords
→ search_query: "DeWalt perceuse visseuse 18v"
→ Estimation effectuée !
```

---

## 📊 Statistiques Attendues

Sur 100 produits typiques :

| Type | % | Exemple |
|------|---|---------|
| Référence détectée | **60%** | Hilti TE60, Festool TS55, Milwaukee M18 |
| Fallback keywords | **35%** | DeWalt perceuse 18V, Bosch meuleuse 750W |
| Titre trop vague | **5%** | "Outil", "Lot bricolage" |

---

## 🔍 Debug dans Google Sheet

Pour comprendre ce qui a été traité, consultez ces colonnes :

| Colonne | Valeur | Signification |
|---------|--------|---------------|
| `reference_extraite` | `TE60` | ✅ Référence trouvée |
| `reference_extraite` | `null` | ⚠️ Fallback utilisé |
| `search_query` | `Hilti TE60` | Requête de recherche exacte |
| `search_type` | `reference` | Stratégie utilisée |
| `search_type` | `keywords` | Fallback activé |

---

## 💡 Conseils d'Optimisation

### Pour améliorer la détection

1. **Ajouter de nouveaux patterns** si une marque n'est pas reconnue
2. **Enrichir KEYWORDS_OUTILLAGE** avec des termes spécifiques
3. **Ajuster STOPWORDS** si trop de mots pertinents sont supprimés

### Exemple : Ajouter Metabo

```javascript
// Dans workflows/estimation-leboncoin-v2.json
const REFERENCE_PATTERNS = {
  // ... autres marques
  'metabo': [
    /\b(SB[A-Z]*\d+)/gi,      // SB 18, SBE 650
    /\b(BS[A-Z]*\d+)/gi,      // BSE 18
    /\b(W[A-Z]*\d+)/gi        // WEA 15, WX 2400
  ]
};
```

---

## 🧪 Tests Recommandés

Avant la mise en production, tester avec :

1. **10 produits avec référence** (vérifier extraction)
2. **10 produits sans référence** (vérifier fallback)
3. **5 produits edge cases** (titres courts, symboles spéciaux)

**Validation :**
- Vérifier `search_query` dans Google Sheet
- Tester manuellement les URLs générées
- Comparer nombre de résultats LBC vs attentes

---

## 📚 Ressources

- [Code source du workflow](../workflows/estimation-leboncoin-v2.json)
- [Documentation complète](./workflow-estimation-leboncoin.md)
- [Patterns regex testeur](https://regex101.com/)
