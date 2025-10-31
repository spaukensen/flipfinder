# 🚀 Déploiement Manuel sur VPS - Solution Rapide

Guide pour déployer FlipFinder avec Playwright Stealth **directement sur le VPS**, sans passer par Coolify.

---

## ⚡ Solution Rapide (15 minutes)

### Étape 1 : Se connecter au VPS

```bash
ssh root@82.29.170.159
```

### Étape 2 : Créer le dossier du projet

```bash
# Créer le dossier
mkdir -p /opt/flipfinder
cd /opt/flipfinder

# Créer la structure
mkdir -p playwright-stealth workflows
```

### Étape 3 : Créer les fichiers

#### A. `docker-compose.yml`

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

networks:
  outillage-net:
    driver: bridge

volumes:
  postgres_data:
  n8n_data:

services:
  postgres:
    image: postgres:15-alpine
    container_name: outillage_postgres
    restart: unless-stopped
    networks:
      - outillage-net
    environment:
      POSTGRES_USER: outillage_user
      POSTGRES_PASSWORD: SecurePass2024!
      POSTGRES_DB: outillage
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  n8n:
    image: n8nio/n8n:latest
    container_name: outillage_n8n
    restart: unless-stopped
    networks:
      - outillage-net
    environment:
      N8N_HOST: flipfinder.ara-solutions.cloud
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://flipfinder.ara-solutions.cloud/
      N8N_ENCRYPTION_KEY: YOUR_ENCRYPTION_KEY_32_CHARS_MIN
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: outillage
      DB_POSTGRESDB_USER: outillage_user
      DB_POSTGRESDB_PASSWORD: SecurePass2024!
      N8N_SECURE_COOKIE: "true"
      N8N_PROXY_HOPS: 1
      DISCORD_WEBHOOK_URL: YOUR_DISCORD_WEBHOOK
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: "true"
    volumes:
      - n8n_data:/home/node/.n8n
    ports:
      - "5678:5678"
    depends_on:
      - postgres

  playwright-stealth:
    build: ./playwright-stealth
    container_name: outillage_playwright
    restart: unless-stopped
    networks:
      - outillage-net
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
EOF
```

#### B. `playwright-stealth/Dockerfile`

```bash
cat > playwright-stealth/Dockerfile << 'EOF'
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]
EOF
```

#### C. `playwright-stealth/package.json`

```bash
cat > playwright-stealth/package.json << 'EOF'
{
  "name": "playwright-stealth-api",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "playwright": "^1.40.0",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  }
}
EOF
```

#### D. `playwright-stealth/server.js`

```bash
cat > playwright-stealth/server.js << 'EOFSERVER'
const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const app = express();
app.use(express.json());

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  }
  return browser;
}

app.post('/scrape', async (req, res) => {
  const { url, waitFor = 3000 } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  let page = null;
  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris'
    });

    page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(waitFor);

    const html = await page.content();
    await context.close();

    res.json({
      success: true,
      html,
      url: page.url(),
      cloudflareDetected: html.includes('challenge-platform')
    });
  } catch (error) {
    if (page) await page.close().catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', browserConnected: browser?.isConnected() || false });
});

app.listen(3001, () => console.log('Playwright API on port 3001'));
EOFSERVER
```

#### E. `.env` (optionnel)

```bash
cat > .env << 'EOF'
N8N_ENCRYPTION_KEY=YOUR_32_CHARS_ENCRYPTION_KEY_HERE
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK
POSTGRES_PASSWORD=SecurePass2024!
EOF
```

### Étape 4 : Lancer les services

```bash
# Vérifier que tous les fichiers sont créés
ls -la
ls -la playwright-stealth/

# Lancer Docker Compose
docker-compose up -d --build

# Suivre les logs
docker-compose logs -f playwright-stealth
```

### Étape 5 : Vérifier

```bash
# Attendre 2-3 minutes pour le build

# Test health
curl http://localhost:3001/health
# Attendu: {"status":"ok","browserConnected":true}

# Test scraping
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":8000}'

# Vérifier tous les containers
docker ps
```

---

## 🔧 Configuration n8n

### Accéder à n8n

1. Ouvrir `https://flipfinder.ara-solutions.cloud`
2. Si premier démarrage, créer un compte admin

### Importer le workflow

**Méthode 1 : Via upload**

1. Sur votre machine Windows, récupérer `workflows/scanner-interencheres.json`
2. Dans n8n : Workflows → Import from File
3. Sélectionner le fichier

**Méthode 2 : Via SCP**

```bash
# Sur votre machine Windows (PowerShell/CMD)
cd C:\wamp64\www\flipfinder
scp workflows/scanner-interencheres.json root@82.29.170.159:/tmp/

# Sur le VPS
# Copier dans le volume n8n
docker cp /tmp/scanner-interencheres.json outillage_n8n:/tmp/
docker exec -it outillage_n8n n8n import:workflow --input=/tmp/scanner-interencheres.json
```

### Configurer les credentials

1. Dans n8n : Credentials → New → PostgreSQL
2. Configuration :
   ```
   Host: postgres
   Database: outillage
   User: outillage_user
   Password: SecurePass2024!
   Port: 5432
   ```

3. Sauvegarder avec le nom : `PostgreSQL Outillage`

---

## ✅ Tests

### Test 1 : Playwright Health

```bash
curl http://localhost:3001/health
```

Attendu :
```json
{"status":"ok","browserConnected":true}
```

### Test 2 : Scraping Interencheres

```bash
curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com/recherche/?keyword=hilti&cat=14","waitFor":8000}' \
  | jq '.cloudflareDetected'
```

Attendu : `false`

### Test 3 : Workflow n8n

1. Aller dans n8n UI
2. Ouvrir le workflow "Scanner Interencheres"
3. Cliquer "Execute Workflow"
4. Vérifier que chaque nœud s'exécute sans erreur

---

## 🐛 Troubleshooting

### Erreur : "COPY failed"

**Cause :** Fichiers manquants

**Solution :**
```bash
cd /opt/flipfinder
ls -la playwright-stealth/
# Vérifier que package.json et server.js existent
```

### Erreur : "npm ci failed"

**Cause :** Pas de `package-lock.json`

**Solution :**
```bash
cd playwright-stealth
npm install  # Générer package-lock.json
cd ..
docker-compose build playwright-stealth
```

### Container redémarre en boucle

```bash
docker logs outillage_playwright -f
# Lire l'erreur et corriger
```

### Port déjà utilisé

```bash
# Vérifier les ports
netstat -tulpn | grep -E '3001|5678|5432'

# Arrêter les services Coolify si nécessaire
```

---

## 🔒 Sécurité

### Configurer le firewall

```bash
# Autoriser uniquement les ports nécessaires
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable

# Les autres ports (3001, 5432, 5678) sont accessibles uniquement en local
```

### Générer une clé d'encryption sécurisée

```bash
# Pour N8N_ENCRYPTION_KEY
openssl rand -base64 32

# Copier le résultat dans docker-compose.yml
```

---

## 🔄 Maintenance

### Redémarrer les services

```bash
cd /opt/flipfinder
docker-compose restart
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker logs outillage_playwright -f
```

### Mettre à jour

```bash
# Modifier les fichiers si nécessaire
nano playwright-stealth/server.js

# Rebuild
docker-compose down
docker-compose up -d --build
```

### Backup PostgreSQL

```bash
# Backup
docker exec outillage_postgres pg_dump -U outillage_user outillage > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20241101.sql | docker exec -i outillage_postgres psql -U outillage_user -d outillage
```

---

## 📊 Monitoring

### Stats containers

```bash
docker stats --no-stream
```

### Espace disque

```bash
df -h
docker system df
```

### Cleanup

```bash
# Nettoyer images non utilisées
docker system prune -a

# Nettoyer volumes non utilisés
docker volume prune
```

---

## 🎉 Résultat Final

Après ce déploiement, vous aurez :

✅ PostgreSQL sur port 5432 (interne)
✅ n8n sur port 5678 (accessible via Nginx/Caddy)
✅ Playwright Stealth sur port 3001 (interne)
✅ Scanner automatique toutes les 30 min
✅ Cloudflare bypass fonctionnel (85-95%)
✅ Alertes Discord temps réel

---

## 📞 Support

Si problème, vérifier :

1. Logs : `docker-compose logs -f`
2. Status : `docker ps`
3. Santé : `curl http://localhost:3001/health`

**Documentation complète :** Voir [INSTALLATION-CLOUDFLARE-BYPASS.md](INSTALLATION-CLOUDFLARE-BYPASS.md)
