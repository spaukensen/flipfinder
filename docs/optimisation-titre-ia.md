# 🤖 Optimisation des Titres avec IA (Ollama + Mistral)

## 📋 Vue d'Ensemble

Le workflow utilise désormais **Ollama avec le modèle Mistral** pour optimiser intelligemment les titres de produits avant la recherche sur LeBonCoin.

### 🎯 Objectif

Transformer des titres bruts d'Interencheres (souvent verbeux et avec numéros de lot) en **titres de recherche optimisés** qui maximisent les chances de trouver des résultats pertinents sur LeBonCoin.

---

## 🏗️ Architecture

### Flux du Workflow

```
[Extraire Référence Produit]
         ↓
[Optimiser Titre avec IA] ← Appel Ollama/Mistral
         ↓
[Traiter Réponse IA] ← Nettoyage + Fallback
         ↓
[Traiter un par un]
         ↓
    (suite du workflow...)
```

### Nodes Ajoutés

1. **"Optimiser Titre avec IA"** (HTTP Request)
   - Appelle Ollama API sur `http://ollama:11434/api/generate`
   - Modèle : `mistral`
   - Timeout : 30s par titre

2. **"Traiter Réponse IA"** (Code)
   - Nettoie la réponse de l'IA
   - Applique un fallback si réponse invalide
   - Garde trace de `search_query_auto` (version sans IA)

---

## 🧠 Prompt Engineering

### Template du Prompt

```javascript
Tu es un expert en optimisation de titres pour recherche e-commerce.

Titre original: "{titre}"
Marque: {marque_detectee}
Référence: {reference_extraite} // Si disponible

Crée un titre de recherche optimisé pour LeBonCoin (5-7 mots max)
qui maximise les chances de trouver ce produit.

Règles:
1. Commencer par la marque
2. Inclure la référence si disponible
3. Ajouter le type d'outil principal
4. Supprimer: numéros de lot, accessoires secondaires, mots comme 'avec', 'lot'
5. Format: Marque [Référence] Type [Caractéristique]

Exemples:
- 'Lot 453 Hilti TE 60 ATC avec batteries' → 'Hilti TE60 perforateur'
- 'DeWalt perceuse visseuse 18V lithium' → 'DeWalt perceuse visseuse 18v'

Réponds UNIQUEMENT avec le titre optimisé, rien d'autre.
```

### Paramètres Ollama

- **Temperature** : `0.3` (faible = plus déterministe)
- **num_predict** : `30` tokens (limite la longueur de réponse)
- **stream** : `false` (réponse complète d'un coup)

---

## 📊 Exemples de Transformation

### Cas 1 : Avec Référence

| Titre Interencheres | Titre Auto (règles) | Titre IA Optimisé | Utilisé |
|---------------------|---------------------|-------------------|---------|
| "Lot 453 - Perforateur HILTI TE 60 ATC avec 3 batteries et accessoires" | "Hilti TE60" | "Hilti TE60 perforateur" | ✅ IA |

### Cas 2 : Sans Référence

| Titre Interencheres | Titre Auto (règles) | Titre IA Optimisé | Utilisé |
|---------------------|---------------------|-------------------|---------|
| "DeWalt perceuse visseuse sans fil 18V lithium ion batterie + chargeur" | "DeWalt perceuse visseuse 18v" | "DeWalt perceuse 18v sans fil" | ✅ IA |

### Cas 3 : Titre Complexe

| Titre Interencheres | Titre Auto (règles) | Titre IA Optimisé | Utilisé |
|---------------------|---------------------|-------------------|---------|
| "Makita grosse défonceuse filaire diamètre 230mm professional série bleue" | "Makita défonceuse filaire 230mm" | "Makita défonceuse 230mm professionnelle" | ✅ IA |

---

## 📈 Colonnes Google Sheet

### Nouvelles Colonnes

| Colonne | Type | Description | Exemple |
|---------|------|-------------|---------|
| `search_query_auto` | String | Titre généré par règles | "Hilti TE60" |
| `search_query` | String | **Titre final utilisé** (IA ou fallback) | "Hilti TE60 perforateur" |
| `search_type` | String | "reference" ou "keywords" | "reference" |

### Ordre de Priorité

1. **Titre IA** (si réponse valide) ← Utilisé en priorité
2. **Titre Auto** (fallback si IA échoue) ← Sécurité

---

## ⚙️ Configuration Ollama

### Prérequis

Ollama doit être installé et accessible depuis n8n :

```yaml
# Dans docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - flipfinder_network

  n8n:
    # ...
    depends_on:
      - ollama
```

### Vérifier qu'Ollama fonctionne

```bash
# Test depuis le host
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Test",
  "stream": false
}'

# Test depuis n8n container
docker exec -it outillage_n8n curl http://ollama:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Test",
  "stream": false
}'
```

### Télécharger Mistral

```bash
# Si pas encore fait
docker exec -it ollama ollama pull mistral
```

---

## 🐛 Gestion des Erreurs

### Fallback Automatique

Le node "Traiter Réponse IA" implémente un système de fallback robuste :

```javascript
// Si l'IA n'a pas répondu correctement
if (!titreOptimise || titreOptimise.length < 3 || titreOptimise.length > 100) {
  titreOptimise = originalData.search_query;  // ← Fallback vers titre auto
}
```

### Cas d'Erreur Gérés

1. **Ollama ne répond pas** (timeout 30s) → Utilise `search_query_auto`
2. **Réponse vide ou trop courte** → Utilise `search_query_auto`
3. **Réponse trop longue** (>100 chars) → Utilise `search_query_auto`
4. **Réponse avec guillemets/formatage** → Nettoyage automatique

---

## 📊 Performance

### Temps d'Exécution

- **Sans IA** : ~2s par produit
- **Avec IA** : ~3-5s par produit (selon charge CPU)

### Impact sur le Workflow

| Nombre de Produits | Temps Sans IA | Temps Avec IA | Surcoût |
|--------------------|---------------|---------------|---------|
| 10 produits | 20s | 40s | +20s (100%) |
| 50 produits | 100s | 200s | +100s (100%) |
| 100 produits | 200s | 400s | +200s (100%) |

**Recommandation** : Activer l'IA uniquement pour les produits **sans référence** pour optimiser les performances.

---

## 🔧 Optimisations Futures

### Option 1 : IA Conditionnelle

N'utiliser l'IA **que** pour les produits sans référence claire :

```javascript
if (searchType === 'keywords') {
  // Appeler l'IA pour optimiser
} else {
  // Utiliser la référence directement (pas besoin d'IA)
}
```

### Option 2 : Batch Processing

Traiter plusieurs titres en un seul appel API :

```javascript
const prompt = `Optimise ces ${items.length} titres:\n1. ${titre1}\n2. ${titre2}...`;
```

### Option 3 : Cache Local

Sauvegarder les transformations réussies pour éviter de re-traiter :

```sql
CREATE TABLE titre_optimisations (
  titre_original TEXT PRIMARY KEY,
  titre_optimise TEXT,
  created_at TIMESTAMP
);
```

---

## 🎯 KPIs à Surveiller

### Métriques de Succès

1. **Taux de réussite IA** : % de réponses valides vs fallback
2. **Amélioration recherche** : Nombre moyen de résultats LBC (avec vs sans IA)
3. **Temps d'exécution** : Durée moyenne par produit
4. **Charge CPU** : Utilisation Ollama pendant exécution

### Requêtes SQL pour Monitoring

```sql
-- Comparer résultats avec/sans IA
SELECT
  search_type,
  COUNT(*) as total,
  AVG(nb_annonces_actives) as avg_results,
  AVG(CASE WHEN search_query != search_query_auto THEN 1 ELSE 0 END) as ia_used_rate
FROM opportunites
WHERE date_estimation > NOW() - INTERVAL '7 days'
GROUP BY search_type;
```

---

## 📚 Ressources

### Documentation Ollama

- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Mistral Model](https://ollama.ai/library/mistral)

### Modèles Alternatifs

- **llama2** : Plus rapide, moins précis
- **codellama** : Optimisé pour code, pas idéal ici
- **phi** : Très rapide, modèle compact

---

## ✅ Checklist d'Activation

Avant d'activer l'optimisation IA :

- [ ] Ollama installé et accessible depuis n8n
- [ ] Modèle Mistral téléchargé (`ollama pull mistral`)
- [ ] Test manuel d'un appel API réussi
- [ ] Colonnes `search_query_auto` et `search_query` ajoutées au Sheet
- [ ] Workflow importé avec les 2 nouveaux nodes
- [ ] Test sur 2-3 produits en mode manuel
- [ ] Vérification du fallback (désactiver Ollama temporairement)
- [ ] Monitoring CPU/RAM pendant exécution

---

**Version** : v2.2.0 avec IA
**Date** : 01 Novembre 2024
**Auteur** : FlipFinder Team
**Status** : ✅ PRÊT POUR TESTS
