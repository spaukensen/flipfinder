# ⚡ QuickStart - Cloudflare Bypass

Guide ultra-rapide pour déployer la solution en 5 minutes.

## 🚀 Installation Express

```bash
# 1. Aller dans le projet
cd /path/to/flipfinder

# 2. Reconstruire avec le nouveau service
docker-compose down
docker-compose up -d --build

# 3. Attendre 60 secondes (build + start)
sleep 60

# 4. Vérifier
docker ps | grep playwright
docker logs outillage_playwright --tail 20
```

## ✅ Test Rapide

```bash
# Test 1: Health check
curl http://localhost:3001/health
# Attendu: {"status":"ok","browserConnected":true}

# Test 2: Scraping Interencheres
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":8000}' \
  | jq '.cloudflareDetected'
# Attendu: false
```

## 📋 Import Workflow n8n

1. Aller sur `https://flipfinder.ara-solutions.cloud`
2. **Workflows** → Supprimer ancien scanner
3. **Import from File** → `workflows/scanner-interencheres.json`
4. **Activer** le workflow
5. Cliquer **Execute Workflow** pour tester

## 🎯 Validation

```bash
# Logs en temps réel
docker logs outillage_playwright -f

# Stats
docker stats --no-stream | grep playwright

# Test complet
curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com/recherche/?keyword=hilti&cat=14","waitFor":8000}' \
  | jq -r '.html | length'
# Attendu: >10000 (HTML complet)
```

## 🐛 Fix Rapide si Problème

```bash
# Restart service
docker restart outillage_playwright

# Rebuild si erreur
docker-compose build playwright-stealth
docker-compose up -d

# Check logs
docker logs outillage_playwright -f

# Check RAM
free -h
docker stats --no-stream
```

## 📊 Métriques Attendues

| Service | RAM | Status |
|---------|-----|--------|
| playwright-stealth | ~300 MB | Running |
| n8n | ~200 MB | Running |
| postgres | ~80 MB | Running |

## 🎉 C'est Prêt !

Si tous les tests passent :

✅ Scanner automatique toutes les 30min
✅ Cloudflare bypassé
✅ Alertes Discord activées
✅ Base de données alimentée

**Pour plus de détails :** Voir `INSTALLATION-CLOUDFLARE-BYPASS.md`

**Monitoring :** `docker logs outillage_playwright -f`

**Support :** Vérifier `SOLUTION-CLOUDFLARE.md` section Troubleshooting
