# 🚀 Installation Solution Cloudflare Bypass (Gratuite)

Guide complet pour déployer le système de contournement Cloudflare Turnstile avec Playwright Stealth.

## 📋 Prérequis

- Docker & Docker Compose installés
- VPS avec au moins 2GB RAM
- Coolify (optionnel, mais recommandé)

## 🔧 Installation

### 1. Cloner/Mettre à jour le projet

```bash
cd /path/to/flipfinder
git pull  # ou télécharger les nouveaux fichiers
```

Vérifier que ces fichiers existent :
```
playwright-stealth/
├── Dockerfile
├── package.json
├── server.js
├── README.md
└── .dockerignore
```

### 2. Builder les services

```bash
# Arrêter les services existants
docker-compose down

# Builder avec le nouveau service Playwright
docker-compose up -d --build

# Cela va créer :
# - outillage_postgres (existant)
# - outillage_n8n (existant)
# - outillage_ollama (existant)
# - outillage_meilisearch (existant)
# - outillage_browser (existant - Browserless)
# - outillage_playwright (NOUVEAU - Playwright Stealth)
```

### 3. Vérifier le déploiement

```bash
# Vérifier que tous les containers tournent
docker ps

# Vérifier les logs Playwright
docker logs outillage_playwright -f

# Vous devriez voir :
# "Playwright Stealth API running on port 3001"
```

### 4. Tester le service

```bash
# Test health endpoint
curl http://localhost:3001/health

# Devrait retourner :
# {"status":"ok","browserConnected":true}

# Test scraping simple
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com","waitFor":2000}'

# Test Interencheres avec Cloudflare
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":8000}'
```

### 5. Importer le workflow n8n mis à jour

1. Aller sur `https://flipfinder.ara-solutions.cloud` (votre n8n)
2. Aller dans **Workflows**
3. Supprimer l'ancien workflow "Scanner Interencheres"
4. Cliquer **Import from File**
5. Sélectionner `workflows/scanner-interencheres.json`
6. **Activer** le workflow

### 6. Tester le workflow n8n

1. Ouvrir le workflow "Scanner Interencheres - Outillage Pro"
2. Cliquer sur **Execute Workflow** (bouton Play en haut)
3. Observer les résultats :
   - ✅ **Mots-clés Premium** : génère 10 keywords
   - ✅ **Scan Interencheres (Stealth)** : doit retourner du HTML (pas Cloudflare)
   - ✅ **Extraction + Scoring** : extrait les lots d'enchères
   - ✅ **Score > 0.7** : filtre les opportunités
   - ✅ **Sauvegarder en DB** : insert en PostgreSQL
   - ✅ **Alerte Discord** : notification

## 🐛 Troubleshooting

### Erreur : "Connection refused" sur port 3001

**Cause :** Service Playwright pas démarré

**Solution :**
```bash
docker logs outillage_playwright
docker restart outillage_playwright
```

### Erreur : "Cloudflare détecté" dans l'extraction

**Cause :** Le délai `waitFor: 8000` est insuffisant

**Solution :** Augmenter le délai dans le workflow :

1. Ouvrir le workflow
2. Éditer le nœud **"Scan Interencheres (Stealth)"**
3. Modifier le JSON Body :
```json
{
  "url": "https://www.interencheres.com/recherche/?keyword={{ encodeURIComponent($json.keyword) }}&cat=14",
  "waitFor": 12000  // Augmenter à 12-15 secondes
}
```

### Erreur : "Browser not connected"

**Cause :** Playwright n'arrive pas à lancer le navigateur

**Solution :**
```bash
# Vérifier les logs
docker logs outillage_playwright

# Reconstruire le container
docker-compose build playwright-stealth
docker-compose up -d
```

### Erreur : RAM insuffisante

**Cause :** Playwright + Chrome consomme ~400MB RAM

**Solution :** Libérer de la RAM ou augmenter la taille VPS

```bash
# Arrêter services non essentiels temporairement
docker stop outillage_ollama  # Si pas utilisé pour l'instant
```

### HTML retourné = page Cloudflare

**Symptômes :** Le HTML contient "challenge-platform" ou "cf-browser-verification"

**Solution 1 :** Augmenter waitFor à 15000ms

**Solution 2 :** Installer FlareSolverr (voir plus bas)

**Solution 3 :** Ajouter des proxies rotatifs (voir plus bas)

## 🎯 Optimisations Avancées

### Option 1 : FlareSolverr (Alternative gratuite)

FlareSolverr est spécialisé dans le bypass Cloudflare.

**Installation :**

1. Ajouter au `docker-compose.yml` :
```yaml
services:
  # ... services existants ...

  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    container_name: outillage_flaresolverr
    restart: unless-stopped
    networks:
      - outillage-net
    environment:
      - LOG_LEVEL=info
      - CAPTCHA_SOLVER=none
      - TZ=Europe/Paris
    ports:
      - '8191:8191'
    healthcheck:
      test:
        - CMD-SHELL
        - 'curl -f http://localhost:8191/health || exit 1'
      interval: 30s
      timeout: 10s
      retries: 3
```

2. Relancer :
```bash
docker-compose up -d
```

3. Modifier le workflow n8n pour utiliser FlareSolverr :

Remplacer le nœud **"Scan Interencheres (Stealth)"** par :

```json
{
  "method": "POST",
  "url": "http://flaresolverr:8191/v1",
  "jsonBody": {
    "cmd": "request.get",
    "url": "https://www.interencheres.com/recherche/?keyword={{ encodeURIComponent($json.keyword) }}&cat=14",
    "maxTimeout": 60000
  }
}
```

Dans le nœud **"Extraction + Scoring"**, changer :
```javascript
const html = $input.first().json.solution.response || '';
```

### Option 2 : Rotation de User-Agents

Modifier `playwright-stealth/server.js` pour randomiser les User-Agents :

```javascript
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const context = await browser.newContext({
  userAgent: randomUA,
  // ...
});
```

Puis rebuild :
```bash
docker-compose build playwright-stealth
docker-compose up -d
```

### Option 3 : Proxies Gratuits (Moins fiable)

1. Créer un fichier `playwright-stealth/proxies.json` :
```json
[
  "http://proxy1.com:8080",
  "http://proxy2.com:8080"
]
```

2. Modifier `server.js` :
```javascript
const proxies = require('./proxies.json');
const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];

const context = await browser.newContext({
  proxy: { server: randomProxy },
  // ...
});
```

**⚠️ Attention :** Les proxies gratuits sont peu fiables et peuvent être déjà blacklistés.

## 📊 Monitoring

### Vérifier les performances

```bash
# Stats containers
docker stats --no-stream

# Logs en temps réel
docker logs outillage_playwright -f

# Vérifier la RAM utilisée
docker stats outillage_playwright --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Métriques attendues

| Service | RAM | CPU | Temps réponse |
|---------|-----|-----|---------------|
| Playwright Stealth | 200-400 MB | 5-15% | 8-12s |
| n8n | 150-250 MB | 5-10% | - |
| PostgreSQL | 50-100 MB | 1-5% | <100ms |
| Browserless | 200-300 MB | 5-10% | 5-8s |

## ✅ Validation complète

### Checklist déploiement

- [ ] Tous les containers démarrent : `docker ps`
- [ ] Playwright répond : `curl http://localhost:3001/health`
- [ ] Test scraping Google fonctionne
- [ ] Test scraping Interencheres retourne du HTML réel (pas Cloudflare)
- [ ] Workflow n8n importé et activé
- [ ] Exécution manuelle workflow réussie
- [ ] Notifications Discord reçues
- [ ] Données insérées en PostgreSQL

### Commandes de validation

```bash
# 1. Check containers
docker ps | grep -E "outillage_(playwright|n8n|postgres)"

# 2. Test Playwright
curl -s http://localhost:3001/health | jq '.'

# 3. Test complet Interencheres
curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":8000}' \
  | jq '.cloudflareDetected'

# Devrait retourner : false

# 4. Check PostgreSQL
docker exec -it outillage_postgres psql -U outillage_user -d outillage -c "SELECT COUNT(*) FROM opportunites;"

# 5. Test workflow n8n
# Aller dans n8n UI et cliquer "Execute Workflow"
```

## 🎉 Résultat Attendu

Après cette installation, vous devriez avoir :

✅ **Service Playwright Stealth** tournant sur port 3001
✅ **Contournement Cloudflare Turnstile** fonctionnel
✅ **Workflow n8n** scannant Interencheres toutes les 30min
✅ **Détection opportunités** avec score > 0.7
✅ **Alertes Discord** en temps réel
✅ **Base de données** alimentée automatiquement
✅ **Coût : 0€** (solution 100% gratuite)

## 📞 Support

En cas de problème :

1. Vérifier les logs : `docker logs outillage_playwright -f`
2. Tester manuellement le service (voir commandes ci-dessus)
3. Essayer FlareSolverr si Playwright ne suffit pas
4. Augmenter les délais `waitFor` dans le workflow

## 🔐 Considérations Légales

⚠️ **Important :**

- Vérifier les CGU d'Interencheres
- Respecter le `robots.txt` : https://www.interencheres.com/robots.txt
- Ne pas surcharger le site (rate limiting)
- Usage personnel uniquement

## 🚀 Prochaines Étapes

Une fois le scanner fonctionnel :

1. Calibrer le scoring sur données réelles
2. Ajouter plus de mots-clés pertinents
3. Créer le workflow poster LeBonCoin
4. Implémenter le système de suivi des ventes
5. Créer le dashboard Grafana

**Bon arbitrage ! 🔥**
