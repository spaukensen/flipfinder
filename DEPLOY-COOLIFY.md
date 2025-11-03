# 🚀 Déploiement sur Coolify - FlipFinder

## 📋 Services déployés

| Service | Port | Container | Usage |
|---------|------|-----------|-------|
| n8n | 5678 | outillage_n8n | Orchestration workflows |
| PostgreSQL | 5432 | outillage_postgres | Base de données |
| Ollama | 11434 | outillage_ollama | IA locale (si besoin) |
| MeiliSearch | 7700 | outillage_meilisearch | Recherche |
| Browserless | 3300 | outillage_browser | Browser headless |
| **Playwright (Interencheres)** | 3001 | outillage_playwright | Scraping Interencheres |
| **Playwright (LeBonCoin)** | 3002 | outillage_playwright_lbc | Scraping LeBonCoin anti-DataDome |
| Open WebUI | 3000 | outillage_open_webui | Interface Ollama |

---

## 🔧 Déploiement du nouveau service Playwright LeBonCoin

### Étape 1 : Commit et push sur Git

Sur votre machine locale :

```bash
cd /wamp64/www/flipfinder

# Ajouter les nouveaux fichiers
git add playwright-stealth/server-advanced.js
git add playwright-stealth/Dockerfile.leboncoin
git add docker-compose.yml
git add DEPLOY-COOLIFY.md

# Commit
git commit -m "feat: Add playwright-leboncoin service with DataDome bypass"

# Push
git push origin main
```

### Étape 2 : Connexion au serveur

```bash
ssh root@82.29.170.159
cd /path/to/flipfinder  # Chemin où Coolify a cloné le repo
```

### Étape 3 : Pull les modifications

```bash
git pull origin main
```

### Étape 4 : Build et démarrage du nouveau service

```bash
# Build uniquement le nouveau service
docker-compose build playwright-leboncoin

# Démarrer le nouveau service
docker-compose up -d playwright-leboncoin

# Vérifier le statut
docker-compose ps
docker logs outillage_playwright_lbc -f
```

### Étape 5 : Vérification

```bash
# Test du healthcheck
curl http://localhost:3002/health

# Test d'une URL
curl -X POST http://localhost:3002/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.leboncoin.fr/recherche?text=hilti","waitFor":5000}'
```

✅ Si vous voyez du HTML avec des annonces (et pas de captcha), c'est bon !

---

## 🔄 Via l'interface Coolify

### Option 1 : Redéployer tout le projet

1. Connectez-vous à Coolify : https://coolify.ara-solutions.cloud
2. Allez dans votre projet **FlipFinder**
3. Cliquez sur **"Redeploy"**
4. Coolify va automatiquement :
   - Pull les dernières modifications
   - Build les nouveaux services
   - Démarrer les containers

### Option 2 : Ajouter le service manuellement

1. Dans Coolify → Project → **"Add Resource"**
2. Choisir **"Docker Compose"**
3. Copier-coller le contenu de `docker-compose.yml`
4. Deploy

---

## 📊 Monitoring

### Logs en temps réel

```bash
# Tous les services
docker-compose logs -f

# Playwright LeBonCoin uniquement
docker logs outillage_playwright_lbc -f --tail=100

# Grep pour les erreurs
docker logs outillage_playwright_lbc --tail=500 | grep -i "error\|datadome"
```

### Stats CPU/RAM

```bash
docker stats outillage_playwright_lbc
```

---

## 🧪 Test du workflow n8n

### 1. Mettre à jour le workflow estimation-leboncoin.json

Dans le node **"Scraper Offres ACTIVES"**, changez l'URL :

```
Ancienne URL : http://playwright-stealth:3001/scrape
Nouvelle URL  : http://playwright-leboncoin:3002/scrape
```

### 2. Tester le workflow

1. Ouvrir n8n : https://flipfinder.ara-solutions.cloud
2. Importer/ouvrir le workflow **"Estimation LeBonCoin"**
3. Exécuter manuellement le workflow
4. Vérifier les logs du node **"Scraper Offres ACTIVES"**

✅ **Résultat attendu** : Vous devriez voir des annonces LeBonCoin extraites (pas de captcha)

---

## 🐛 Troubleshooting

### Problème 1 : Service ne démarre pas

```bash
# Vérifier les logs
docker logs outillage_playwright_lbc

# Vérifier le port
netstat -tuln | grep 3002

# Rebuild complet
docker-compose down
docker-compose build --no-cache playwright-leboncoin
docker-compose up -d playwright-leboncoin
```

### Problème 2 : DataDome toujours présent

Le bypass DataDome n'est **pas garanti à 100%**. Si ça ne marche toujours pas :

1. Attendez quelques heures (IP temporairement bannie)
2. Augmentez les délais dans `server-advanced.js` (ligne waitFor)
3. Testez depuis une autre IP (proxy)
4. Envisagez ScrapingBee en fallback

### Problème 3 : Erreur "port already in use"

```bash
# Trouver le process sur le port 3002
lsof -i :3002

# Tuer le process
kill -9 <PID>

# Ou arrêter tous les containers
docker-compose down
docker-compose up -d
```

---

## 📈 Optimisations futures

### 1. Ajouter un proxy rotatif

Pour éviter les bans IP, ajouter un service proxy :

```yaml
  proxy-rotator:
    image: luminati/proxy-manager
    ports:
      - "24000:24000"
```

### 2. Augmenter les ressources Docker

Dans Coolify → Service → Settings :
- CPU Limit : 2 cores
- Memory Limit : 4GB

### 3. Monitoring avec Prometheus

Ajouter des métriques pour suivre :
- Nombre de captchas détectés
- Taux de succès bypass DataDome
- Temps de réponse moyen

---

## 🎯 Checklist de déploiement

- [ ] Git commit + push des fichiers
- [ ] SSH sur le serveur
- [ ] `git pull origin main`
- [ ] `docker-compose build playwright-leboncoin`
- [ ] `docker-compose up -d playwright-leboncoin`
- [ ] Test healthcheck : `curl http://localhost:3002/health`
- [ ] Test scraping : `curl -X POST http://localhost:3002/scrape ...`
- [ ] Mise à jour workflow n8n (URL vers :3002)
- [ ] Test workflow complet dans n8n
- [ ] Vérifier les logs : `docker logs outillage_playwright_lbc -f`

---

## 📞 Support

En cas de problème :
1. Vérifier les logs Docker
2. Tester le service en local d'abord
3. Vérifier la documentation Coolify : https://coolify.io/docs
4. GitHub Issues : https://github.com/votre-username/flipfinder/issues

---

**Dernière mise à jour** : 03/11/2025
**Version** : 1.0.0
