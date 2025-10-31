# 🚀 Déploiement sur Coolify - Guide Complet

Guide spécifique pour déployer FlipFinder avec Playwright Stealth sur Coolify.

## ⚠️ Problème Rencontré

```
unable to prepare context: path "/data/coolify/services/kowg00cc4sw0gkog4os0o08g/playwright-stealth" not found
```

**Cause :** Coolify ne supporte pas les `build: ./sous-dossier` dans docker-compose.

**Solution :** Utiliser un Dockerfile à la racine du projet.

---

## 📋 Prérequis

- Coolify installé et configuré
- Domaine configuré (ex: `flipfinder.ara-solutions.cloud`)
- Repository Git (GitHub, GitLab, etc.) ou upload manuel

---

## 🔧 Méthode 1 : Docker Compose Coolify (Recommandé)

### Étape 1 : Fichiers requis

Assurez-vous que ces fichiers sont à la **racine** du projet :

```
flipfinder/
├── docker-compose.coolify.yml    # ✅ Créé
├── Dockerfile.playwright-stealth # ✅ Créé
├── .env.example
├── playwright-stealth/
│   ├── package.json
│   ├── server.js
│   └── README.md
└── workflows/
    └── ...
```

### Étape 2 : Configuration Coolify

1. **Aller dans Coolify** → Resources → New Resource
2. Choisir **Docker Compose**
3. **Source** :
   - Git Repository : Coller l'URL de votre repo
   - OU Upload : Uploader les fichiers

4. **Configuration** :
   ```
   Name: FlipFinder Outillage
   Docker Compose Location: docker-compose.coolify.yml
   Branch: main
   ```

5. **Variables d'environnement** :

   Aller dans **Environment Variables** et ajouter :

   ```env
   SERVICE_FQDN_N8N=flipfinder.ara-solutions.cloud
   N8N_ENCRYPTION_KEY=VotreClé32CaracteresMinimum123
   POSTGRES_USER=outillage_user
   POSTGRES_PASSWORD=SecurePass2024!
   POSTGRES_DB=outillage
   BROWSERLESS_TOKEN=token123
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   MEILI_MASTER_KEY=masterKey123SecurePassword
   ```

6. **Deploy** :
   - Cliquer sur **Deploy**
   - Attendre 3-5 minutes (build Playwright)
   - Vérifier les logs

### Étape 3 : Vérification

```bash
# SSH sur votre VPS
ssh root@82.29.170.159

# Vérifier les containers
docker ps | grep outillage

# Devrait montrer :
# - outillage_postgres
# - outillage_n8n
# - outillage_playwright
# - outillage_ollama
# - outillage_meilisearch
# - outillage_browser

# Test Playwright
curl http://localhost:3001/health
# Attendu: {"status":"ok","browserConnected":true}
```

---

## 🔧 Méthode 2 : Service Individuel (Alternative)

Si la méthode 1 ne fonctionne pas, créer les services séparément.

### A. PostgreSQL

1. Coolify → New Resource → Database → PostgreSQL 15
2. Configuration :
   ```
   Name: outillage-postgres
   Database: outillage
   Username: outillage_user
   Password: SecurePass2024!
   ```

### B. n8n

1. New Resource → Docker Image
2. Image : `n8nio/n8n:latest`
3. Environment Variables :
   ```env
   N8N_HOST=flipfinder.ara-solutions.cloud
   N8N_PORT=5678
   N8N_PROTOCOL=https
   WEBHOOK_URL=https://flipfinder.ara-solutions.cloud/
   N8N_ENCRYPTION_KEY=VotreClé32Caracteres
   DB_TYPE=postgresdb
   DB_POSTGRESDB_HOST=outillage-postgres
   DB_POSTGRESDB_PORT=5432
   DB_POSTGRESDB_DATABASE=outillage
   DB_POSTGRESDB_USER=outillage_user
   DB_POSTGRESDB_PASSWORD=SecurePass2024!
   BROWSERLESS_TOKEN=token123
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
   ```
4. Ports : `5678:5678`
5. Network : Même que PostgreSQL

### C. Playwright Stealth (Custom Build)

**Option C1 : Via Dockerfile Custom**

1. New Resource → Docker Image
2. Source : Git Repository
3. Dockerfile Path : `Dockerfile.playwright-stealth`
4. Build Args : Aucun
5. Ports : `3001:3001`

**Option C2 : Image Pré-buildée (Plus rapide)**

Si vous avez accès à un registry Docker :

```bash
# Sur votre machine locale
cd flipfinder
docker build -f Dockerfile.playwright-stealth -t votre-registry/playwright-stealth:latest .
docker push votre-registry/playwright-stealth:latest
```

Puis dans Coolify :
1. New Resource → Docker Image
2. Image : `votre-registry/playwright-stealth:latest`
3. Ports : `3001:3001`

---

## 🐛 Troubleshooting Coolify

### Erreur : "path not found"

**Cause :** Build context incorrect

**Solution :** Vérifier que `Dockerfile.playwright-stealth` est à la racine :

```bash
ls -la Dockerfile.playwright-stealth
# Devrait exister
```

### Erreur : "npm ci failed"

**Cause :** Fichiers `package.json` ou `server.js` manquants

**Solution :** Vérifier la structure :

```bash
ls -la playwright-stealth/
# Devrait contenir : package.json, server.js
```

Corriger le `Dockerfile.playwright-stealth` si besoin :

```dockerfile
# Vérifier que les COPY pointent vers les bons fichiers
COPY playwright-stealth/package.json playwright-stealth/package-lock.json ./
COPY playwright-stealth/server.js ./
```

### Build très long (>10 minutes)

**Cause :** Playwright télécharge Chrome (~300 MB)

**Solution :** Normal pour le premier build. Les builds suivants utilisent le cache.

Pour accélérer, utiliser une image pré-buildée (voir Méthode 2, Option C2).

### Container redémarre en boucle

**Vérifier les logs :**

```bash
# Dans Coolify UI : Logs
# Ou en SSH :
docker logs outillage_playwright -f
```

**Erreurs communes :**

1. **Port déjà utilisé :** Changer le port dans Coolify
2. **RAM insuffisante :** Libérer de la RAM (arrêter Ollama temporairement)
3. **Fichiers manquants :** Vérifier que `server.js` est copié

---

## 🔒 Configuration Réseau Coolify

### Exposer les Services

Par défaut, Coolify crée un réseau isolé. Pour que n8n puisse communiquer avec Playwright :

**Option 1 : Même Docker Compose (Recommandé)**

Tous les services dans `docker-compose.coolify.yml` partagent le réseau `outillage-net`.

**Option 2 : Services Séparés**

1. Aller dans chaque service → Network
2. Sélectionner le même réseau pour tous : `outillage-net`
3. Redéployer

### URLs Internes

Une fois sur le même réseau :

- **Playwright** : `http://playwright-stealth:3001`
- **PostgreSQL** : `postgres:5432`
- **Browserless** : `http://browserless:3000`

---

## ✅ Validation Déploiement

### Checklist

- [ ] Tous les containers `Running` dans Coolify UI
- [ ] n8n accessible via `https://flipfinder.ara-solutions.cloud`
- [ ] Test Playwright : `curl http://localhost:3001/health`
- [ ] Test PostgreSQL : Connexion depuis n8n OK
- [ ] Workflow importé et activé
- [ ] Test exécution manuelle réussie
- [ ] Notifications Discord reçues

### Commandes de Test

```bash
# SSH sur le VPS
ssh root@82.29.170.159

# 1. Vérifier containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Test Playwright health
curl http://localhost:3001/health
# Attendu: {"status":"ok","browserConnected":true}

# 3. Test scraping Interencheres
curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":8000}' \
  | jq '.cloudflareDetected'
# Attendu: false

# 4. Vérifier PostgreSQL
docker exec -it outillage_postgres psql -U outillage_user -d outillage -c "SELECT version();"

# 5. Logs en temps réel
docker logs outillage_playwright -f
```

---

## 📊 Monitoring dans Coolify

### Logs

Coolify UI → Service → **Logs** (temps réel)

### Métriques

Coolify UI → Service → **Metrics**

Vérifier :
- **CPU** : <30% en moyenne
- **RAM** : Playwright ~300-400 MB
- **Network** : Pics pendant scraping

### Alertes

Configurer des webhooks Discord pour alertes Coolify :

1. Coolify → Settings → Webhooks
2. Ajouter webhook Discord
3. Événements : `deployment_failed`, `service_stopped`

---

## 🚀 Workflow n8n dans Coolify

### Import Workflow

1. Aller sur `https://flipfinder.ara-solutions.cloud`
2. Workflows → **Import from File**
3. Sélectionner `workflows/scanner-interencheres.json`
4. **Important :** Vérifier l'URL du nœud Playwright :
   ```json
   {
     "url": "http://playwright-stealth:3001/scrape"
     // OU
     "url": "http://outillage_playwright:3001/scrape"
     // Selon le nom du container dans Coolify
   }
   ```

### Tester le Workflow

1. Ouvrir le workflow
2. Cliquer **Execute Workflow**
3. Vérifier chaque nœud :
   - ✅ Mots-clés générés
   - ✅ Playwright retourne HTML (pas Cloudflare)
   - ✅ Extraction trouve des lots
   - ✅ Score calculé
   - ✅ Données insérées en PostgreSQL
   - ✅ Notification Discord reçue

---

## 🔄 Mises à Jour

### Redéploiement

**Via Git :**

1. Push les changements sur votre repo
2. Coolify → Service → **Redeploy**
3. Attendre le rebuild

**Via UI :**

1. Modifier les fichiers localement
2. Coolify → Service → **Redeploy** → Upload files

### Rebuild Playwright uniquement

```bash
# SSH
ssh root@82.29.170.159

# Rebuild
cd /data/coolify/services/[SERVICE_ID]
docker-compose build playwright-stealth
docker-compose up -d playwright-stealth

# Vérifier
docker logs outillage_playwright -f
```

---

## 💡 Optimisations Coolify

### 1. Cache Docker

Pour accélérer les builds :

```bash
# Dans Coolify, activer BuildKit cache
# Settings → Build → Use BuildKit: ON
```

### 2. Multi-Stage Build (Optionnel)

Optimiser `Dockerfile.playwright-stealth` :

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal AS base

WORKDIR /app

# Dependencies
COPY playwright-stealth/package*.json ./
RUN npm ci --production

# Application
COPY playwright-stealth/server.js ./

EXPOSE 3001
CMD ["node", "server.js"]
```

### 3. Healthcheck Tuning

Si Coolify marque le service "Unhealthy" :

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
  interval: 30s
  timeout: 15s        # Augmenter si nécessaire
  retries: 5          # Augmenter si démarrage lent
  start_period: 60s   # Augmenter pour Playwright
```

---

## 📚 Ressources

- [Coolify Docs - Docker Compose](https://coolify.io/docs/resources/docker-compose)
- [Coolify Docs - Custom Dockerfile](https://coolify.io/docs/resources/dockerfile)
- [Coolify Discord](https://discord.gg/coolify)

---

## 🎉 Résultat Final

Après déploiement réussi, vous aurez :

✅ **n8n** : `https://flipfinder.ara-solutions.cloud`
✅ **Playwright Stealth** : Port 3001 (interne)
✅ **PostgreSQL** : Port 5432 (interne)
✅ **Scanner automatique** : Toutes les 30 min
✅ **Cloudflare bypassé** : 85-95% de succès
✅ **Alertes Discord** : Temps réel
✅ **0€ de coût** : Solution 100% gratuite

---

**Support :** Si problème, vérifier les logs Coolify et [créer un issue](https://github.com/votre-username/flipfinder/issues)
