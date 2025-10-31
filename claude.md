# 🔧 FlipFinder - Système d'Arbitrage Outillage Professionnel

## 📋 Vue d'Ensemble

**FlipFinder** est un système automatisé d'arbitrage pour l'achat-revente d'outillage professionnel, basé sur la détection d'opportunités sur les sites d'enchères et la revente sur LeBonCoin.

### 🎯 Objectifs
- ROI cible : 200-300% sur 3 mois
- Capital initial : 1000€
- Automatisation complète : Scan → Achat → Vente
- Stack 100% Open Source

### 📊 Métriques Clés
- Marge moyenne attendue : 150-250%
- Temps de rotation stock : 7-14 jours  
- Volume cible : 20-30 transactions/mois

---

## 🏗️ Architecture Technique

### Stack Technologique
- **Orchestration** : n8n (workflows automatisés)
- **Base de données** : PostgreSQL 15
- **IA** : Ollama + Mistral 7B (local)
- **Scraping** : Browserless Chrome
- **Search** : MeiliSearch
- **Infrastructure** : Coolify sur VPS Hostinger KVM 2
- **Monitoring** : Grafana + Prometheus (à venir)

### Infrastructure Actuelle
```
VPS Hostinger KVM 2
- IP : 82.29.170.159
- Domain : flipfinder.ara-solutions.cloud
- RAM : 8GB
- CPU : 2 vCPU  
- Storage : 100GB NVMe
- OS : Ubuntu 22.04
```

---

## 🚀 Setup & Installation

### Prérequis
- VPS avec Docker et Coolify installés
- Nom de domaine configuré
- Compte Telegram pour notifications

### Variables d'Environnement
```env
# À configurer dans Coolify
SERVICE_FQDN_N8N=flipfinder.ara-solutions.cloud
N8N_ENCRYPTION_KEY=[GÉNÉRER_UNE_CLÉ_RANDOM]
POSTGRES_PASSWORD=SecurePass2024!
TELEGRAM_BOT_TOKEN=[VOTRE_TOKEN]
TELEGRAM_CHAT_ID=[VOTRE_CHAT_ID]
```

### Docker Compose
```yaml
# Voir docker-compose.yml dans le repo
version: '3.8'
services:
  postgres:
    # Configuration PostgreSQL
  n8n:
    # Configuration n8n
  ollama:
    # Configuration Ollama
  meilisearch:
    # Configuration MeiliSearch
  browserless:
    # Configuration Browserless
```

---

## 📂 Structure du Projet
```
flipfinder-outillage/
├── docker-compose.yml       # Stack Docker
├── .env.example             # Variables d'environnement
├── init.sql                 # Schema base de données
├── README.md               # Documentation
├── claude.md               # Ce fichier - Guide complet
├── workflows/              # Workflows n8n
│   ├── scanner-interencheres.json
│   ├── analyse-detail.json
│   ├── poster-leboncoin.json
│   └── monitoring.json
├── scripts/                # Scripts Python/JS
│   ├── analyze_tool.py     # Analyse IA
│   ├── scoring_engine.js   # Moteur de scoring
│   └── leboncoin_bot.js    # Bot publication
├── data/                   # Données de référence
│   ├── prix_reference.csv
│   └── marques_modeles.json
└── docs/                   # Documentation additionnelle
    ├── ROI_analysis.md
    └── patterns.md
```

---

## 🔄 Workflows n8n

### 1. Scanner Principal (30min)
- Scan des mots-clés sur Interencheres
- Extraction HTML des résultats
- Scoring automatique
- Sauvegarde en DB
- Alertes Telegram si score > 0.7

### 2. Analyse Détaillée
- Webhook déclenché pour analyse approfondie
- Détection marques/modèles
- Estimation valeur marché
- Calcul ROI précis
- Recommandation d'achat

### 3. Poster LeBonCoin (À créer)
- Template automatique selon catégorie
- Upload photos
- Prix optimisé
- Tracking des vues

### 4. Monitoring Dashboard (À créer)
- KPIs en temps réel
- Alertes anomalies
- Rapports hebdomadaires

---

## 🎯 Patterns de Détection

### Marques Premium (ROI 200%+)
```javascript
const MARQUES_PREMIUM = {
  'hilti': { multiplicateur: 2.5, patterns: /TE\d+|DD\d+/ },
  'festool': { multiplicateur: 2.3, patterns: /TS\d+|OF\d+/ },
  'milwaukee': { multiplicateur: 2.1, patterns: /M\d{2}/ },
  'makita': { multiplicateur: 2.0, patterns: /D[A-Z]{2}\d{3}/ },
  'dewalt': { multiplicateur: 1.9, patterns: /DC[A-Z]\d{3}/ }
};
```

### Signaux Liquidation
- "liquidation judiciaire" → Score +0.3
- "cessation activité" → Score +0.3
- "fermeture entreprise" → Score +0.25
- "départ retraite" → Score +0.2
- "urgent" → Score +0.15

### Anti-Patterns (À éviter)
- Marques GSB : Parkside, Dexter, Mac Allister
- "Réservé aux professionnels"
- Prix de réserve élevé
- Vendeurs récurrents (revendeurs)

---

## 💰 Modèle Économique

### Coûts Mensuels
- VPS Hostinger : 15€
- LeBonCoin Pro : 6€
- **Total** : 21€/mois

### Revenus Projetés
- Mois 1 : 650€ CA (300€ profit)
- Mois 2 : 3200€ CA (1650€ profit)
- Mois 3 : 5500€ CA (3000€ profit)
- **ROI 3 mois** : 495%

### Métriques de Performance
```sql
-- Requêtes SQL pour monitoring
SELECT 
  COUNT(*) as total_opportunites,
  AVG(score) as score_moyen,
  AVG(roi_estime) as roi_moyen
FROM opportunites
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 📝 TODO Liste

### Phase 1 : MVP (Semaine 1-2) ✅
- [x] Setup infrastructure Coolify
- [x] Configurer n8n + PostgreSQL
- [x] Créer workflow scanner de base
- [x] Configurer alertes Telegram
- [ ] Premier test d'achat réel

### Phase 2 : Optimisation (Semaine 3-4)
- [ ] Intégrer Ollama pour analyse IA
- [ ] Créer workflow poster LeBonCoin
- [ ] Système de tracking des ventes
- [ ] Dashboard de monitoring
- [ ] Calibrage scoring sur données réelles

### Phase 3 : Scale (Mois 2)
- [ ] Multi-sites (Drouot, eBay enchères)
- [ ] OCR pour photos floues (Tesseract)
- [ ] API LeBonCoin Pro
- [ ] Automatisation complète achat (enchère auto)
- [ ] Système de feedback loop ML

### Phase 4 : Advanced (Mois 3)
- [ ] Prédiction prix de vente ML
- [ ] Détection contrefaçons
- [ ] Expansion catégories (Bijoux, Montres)
- [ ] App mobile React Native
- [ ] API publique

---

## 🔧 Commandes Utiles

### Docker & Monitoring
```bash
# Logs n8n
docker logs outillage_n8n -f --tail=100

# Stats containers
docker stats --no-stream

# Backup DB
docker exec outillage_postgres pg_dump -U admin outillage > backup.sql

# Restart stack
docker-compose down && docker-compose up -d
```

### n8n CLI
```bash
# Export workflows
docker exec -it outillage_n8n n8n export:workflow --all

# Import workflow
docker exec -it outillage_n8n n8n import:workflow < workflow.json
```

### Database Queries
```sql
-- Top opportunités manquées
SELECT * FROM opportunites 
WHERE score > 0.8 AND statut = 'DETECTE'
ORDER BY roi_estime DESC LIMIT 10;

-- Performance par marque
SELECT 
  marques_detectees->>'marque' as marque,
  COUNT(*) as nombre,
  AVG((facteurs->>'roi_estime')::float) as roi_moyen
FROM opportunites
GROUP BY marque
ORDER BY roi_moyen DESC;
```

---

## 🐛 Troubleshooting

### Erreur Cookie Sécurisé
```env
N8N_SECURE_COOKIE=true
N8N_PROXY_HOPS=1
```

### Permissions Error
```bash
docker exec -it outillage_n8n chmod 600 /home/node/.n8n/config
```

### OOM (Out of Memory)
```env
NODE_OPTIONS=--max-old-space-size=1024
```

---

## 📚 Ressources

### Documentation
- [n8n Docs](https://docs.n8n.io)
- [Coolify Docs](https://coolify.io/docs)
- [Ollama Models](https://ollama.ai/library)

### Communauté
- Discord FlipFinder : [À créer]
- Telegram Groupe : [À créer]

### APIs & Tools
- [Interencheres Robot.txt](https://www.interencheres.com/robots.txt)
- [LeBonCoin API Pro](https://api.leboncoin.fr/docs)
- [BrickLink Price Guide](https://www.bricklink.com) (pour expansion LEGO)

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## ⚖️ Légal & Éthique

- Respecter les CGU des sites scannés
- Déclarer les revenus (micro-entreprise recommandé)
- TVA sur marge pour biens d'occasion
- Garantie légale de conformité à respecter

---

## 📧 Contact & Support

- **Email** : flipfinder@ara-solutions.cloud
- **GitHub** : [github.com/votre-username/flipfinder-outillage](https://github.com)
- **Créateur** : [Votre Nom]

---

## 🎉 Changelog

### v1.0.0 (31/10/2024)
- Initial setup avec n8n sur Coolify
- Workflow scanner de base
- Intégration PostgreSQL
- Alertes Telegram fonctionnelles

### v1.1.0 (À venir)
- Intégration Ollama IA
- Poster automatique LeBonCoin
- Dashboard monitoring

---

## 💡 Notes & Idées

### Expansions Futures
- **Catégories** : Électronique, Sneakers, Montres
- **Sites** : Drouot, Catawiki, eBay
- **IA** : Fine-tuning modèle pour détection prix
- **Mobile** : App React Native avec notifications push
- **SaaS** : Version multi-tenant pour autres revendeurs

### Optimisations Performance
- Cache Redis pour requêtes fréquentes
- CDN pour images produits
- Queue system (BullMQ) pour jobs longs
- Elasticsearch pour recherche avancée

### Sécurité
- Rate limiting sur webhooks
- Authentification 2FA
- Chiffrement données sensibles
- Backup automatique journalier

---

## 📈 Métriques Succès

- **MRR** (Monthly Recurring Revenue) : 5000€ sous 3 mois
- **Taux de conversion** : 80% des achats revendus
- **Temps moyen de vente** : < 10 jours
- **Score de satisfaction** : 4.8/5 sur LeBonCoin
