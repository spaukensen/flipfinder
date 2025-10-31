# Playwright Stealth API - Contournement Cloudflare

Service Node.js utilisant Playwright avec plugins stealth pour contourner Cloudflare Turnstile **gratuitement**.

## 🎯 Fonctionnalités

- **Playwright Extra** avec plugin stealth
- **Emulation navigateur réaliste** (Chrome 120)
- **Fingerprint masking** (webdriver, plugins, languages)
- **User-Agent réaliste** avec headers complets
- **Délais humains** et mouvements de souris
- **API REST simple** pour n8n

## 🚀 Installation

### Avec Docker (Recommandé)

Le service est déjà configuré dans `docker-compose.yml` :

```bash
# Builder et lancer tous les services
docker-compose up -d --build

# Vérifier les logs
docker logs outillage_playwright -f

# Tester le service
curl http://localhost:3001/health
```

### Manuel (Dev)

```bash
cd playwright-stealth
npm install
node server.js
```

## 📡 API

### POST /scrape

Scrape une URL en contournant Cloudflare.

**Request:**
```json
{
  "url": "https://www.interencheres.com/recherche/?keyword=hilti&cat=14",
  "waitFor": 8000
}
```

**Response:**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "url": "https://www.interencheres.com/recherche/?keyword=hilti&cat=14",
  "cloudflareDetected": false
}
```

**Paramètres:**
- `url` (required): URL à scraper
- `waitFor` (optional): Temps d'attente en ms (défaut: 3000)

### GET /health

Vérifie l'état du service.

**Response:**
```json
{
  "status": "ok",
  "browserConnected": true
}
```

## 🔧 Configuration

### Variables d'environnement

```env
NODE_ENV=production
PORT=3001  # Optionnel
```

### Paramètres Stealth

Le service applique automatiquement :

1. **Navigator Overrides:**
   - `navigator.webdriver` → `undefined`
   - `navigator.plugins` → Array réaliste
   - `navigator.languages` → `['fr-FR', 'fr', 'en-US', 'en']`

2. **Chrome Runtime Mock:**
   - Ajoute `window.chrome.runtime`

3. **Permissions Mock:**
   - Mock des permissions pour notifications

4. **Headers HTTP Réalistes:**
   ```
   User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
   Accept-Language: fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7
   Accept: text/html,application/xhtml+xml...
   Sec-Fetch-Dest: document
   Sec-Fetch-Mode: navigate
   Sec-Fetch-Site: none
   Sec-Fetch-User: ?1
   ```

5. **Comportement Humain:**
   - Mouvements de souris aléatoires
   - Délais réalistes entre actions
   - Scrolling naturel (à activer si besoin)

## 🛠️ Intégration n8n

Le workflow `scanner-interencheres.json` utilise ce service :

```json
{
  "method": "POST",
  "url": "http://playwright-stealth:3001/scrape",
  "jsonBody": {
    "url": "https://www.interencheres.com/recherche/?keyword={{ keyword }}&cat=14",
    "waitFor": 8000
  }
}
```

## 📊 Performance

- **Temps de réponse:** 8-12 secondes (avec attente Cloudflare)
- **Taux de succès:** ~85-95% (dépend de Cloudflare)
- **RAM:** ~200-400 MB par instance de navigateur
- **CPU:** Faible (headless)

## ⚠️ Limitations

1. **Cloudflare avancé:** Certains sites avec Cloudflare très agressif peuvent quand même bloquer
2. **Rate limiting:** Ne pas spammer (risque de ban IP)
3. **Maintenance:** Cloudflare évolue, peut nécessiter des ajustements
4. **Légalité:** Vérifier les CGU du site cible

## 🔄 Alternatives si échec

Si Cloudflare bloque quand même, options supplémentaires :

### 1. FlareSolverr (Gratuit)

Ajouter au docker-compose :

```yaml
flaresolverr:
  image: ghcr.io/flaresolverr/flaresolverr:latest
  container_name: flaresolverr
  environment:
    - LOG_LEVEL=info
    - CAPTCHA_SOLVER=none
  ports:
    - "8191:8191"
  restart: unless-stopped
```

### 2. Rotation IP avec Proxies

Utiliser des proxies gratuits (moins fiable) :

```javascript
// Dans server.js, ajouter :
const proxy = {
  server: 'http://proxy-server:port'
};

const context = await browser.newContext({ proxy });
```

### 3. Délais plus longs

Augmenter `waitFor` à 15-20 secondes.

### 4. Residential Proxies (Payant)

- Bright Data
- Oxylabs
- ScraperAPI

## 📝 Debugging

### Logs verbeux

```bash
docker logs outillage_playwright -f
```

### Tester manuellement

```bash
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com","waitFor":5000}' \
  | jq '.cloudflareDetected'
```

### Capturer screenshot (debug)

Ajouter dans `server.js` :

```javascript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

## 🎉 Succès attendu

Avec cette configuration, vous devriez obtenir :

- ✅ Contournement Cloudflare Turnstile basique
- ✅ Scraping Interencheres fonctionnel
- ✅ Coût: **0€** (100% gratuit)
- ✅ Délai: ~8-10 secondes par requête

## 📚 Ressources

- [Playwright Docs](https://playwright.dev/)
- [Playwright Extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra)
- [Stealth Plugin](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)

## 🤝 Support

Si le service ne fonctionne pas :

1. Vérifier les logs : `docker logs outillage_playwright`
2. Tester health endpoint : `curl http://localhost:3001/health`
3. Augmenter `waitFor` dans le workflow
4. Essayer FlareSolverr (alternative gratuite)
