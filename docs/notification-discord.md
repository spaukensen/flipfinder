# 💬 Notification Discord - Scanner Interenchères

## 📋 Vue d'Ensemble

Le workflow **Scanner Interenchères** envoie automatiquement une notification Discord **uniquement quand de nouveaux produits** sont détectés par rapport au scan précédent, avec un résumé détaillé et un lien direct vers le Google Sheet.

> **Important** : Vous ne serez notifié que s'il y a de nouveaux produits ! Si le scan ne trouve rien de nouveau, aucune notification n'est envoyée.

---

## ✨ Fonctionnalités

### 📊 Statistiques Envoyées

La notification Discord contient :

- **✨ Nouveaux produits** - Nombre de produits jamais vus avant
- **📦 Total scannés** - Nombre total de lots détectés lors du scan
- **📊 Déjà connus** - Produits déjà présents dans le Google Sheet
- **💰 Prix moyen (nouveaux)** - Prix moyen des NOUVEAUX lots uniquement
- **📊 Fourchette de prix** - Prix min et max des nouveaux produits
- **🏷️ Marques détectées (nouveaux)** - Marques premium trouvées dans les nouveaux produits
- **🔎 Mots-clés scannés** - Liste des keywords utilisés pour le scan
- **📄 Lien Google Sheet** - Lien cliquable direct vers les résultats

### 🎨 Apparence

Le message utilise un **embed Discord** avec :
- Couleur : Vert (#2ECC71) - Indique de nouveaux produits détectés
- Titre : "🎉 Nouveaux Produits Détectés !"
- Footer : "FlipFinder Scanner • Scan quotidien"
- Timestamp : Date/heure du scan
- Champs organisés en colonnes

---

## 🔧 Configuration

### 1. Webhook Discord

Le webhook est configuré dans le node "💬 Notification Discord" :

```
https://discord.com/api/webhooks/1434620214611415161/1Bj9YnyI-gDnvtXhB5s4PpMh6EkkPdjKSdVq_b4Ek-2vC02xjpGAPemUoIxah6WpZFRe
```

**⚠️ Important** : Ce webhook doit rester privé pour éviter le spam.

### 2. Changement de Channel

Pour envoyer dans un autre channel Discord :

1. Allez dans **Paramètres du serveur** → **Intégrations** → **Webhooks**
2. Créez un nouveau webhook pour le channel souhaité
3. Copiez l'URL du webhook
4. Remplacez l'URL dans le node "💬 Notification Discord"

### 3. Personnalisation du Message

Pour modifier le message, éditez le node "💬 Notification Discord" :

```json
{
  "embeds": [{
    "title": "🔍 Scan Interenchères Terminé",
    "description": "Nouveau scan effectué avec succès !",
    "color": 5814783,  // Couleur en décimal (bleu)
    "fields": [...]
  }]
}
```

**Couleurs disponibles** :
- Vert : `3066993`
- Orange : `15105570`
- Rouge : `15158332`
- Bleu : `5814783` (actuel)

---

## 🔄 Workflow

### Flux Complet

```
Toutes les 24h (1x par jour)
    ↓
Mots-clés Premium
    ↓
Scan Interencheres (Stealth)
    ↓
📊 Synthèse & Validation
    ↓
Extraction + Scoring
    ↓
Filter (garde uniquement les lots avec titre)
    ↓
📖 Lire Sheet Existant ✨ NOUVEAU (parallèle)
    ↓
Sauvegarder dans Google Sheets
    ↓
📊 Calculer Statistiques ✨ MODIFIÉ (compare nouveau vs existant)
    ↓
🔍 Nouveaux produits ? ✨ NOUVEAU (filtre si nouveaux_produits > 0)
    ↓
💬 Notification Discord ✨ (envoyé uniquement si nouveaux)
```

### Node "📖 Lire Sheet Existant"

Ce node lit le Google Sheet **avant** la sauvegarde pour récupérer les `lot_id` déjà connus.

### Node "📊 Calculer Statistiques"

Ce node compare les nouveaux produits avec l'existant :

```javascript
// Compare :
- Récupère les lot_id existants depuis "📖 Lire Sheet Existant"
- Sépare nouveaux produits vs produits déjà connus
- Calcule stats UNIQUEMENT sur les nouveaux :
  * total_produits : nombre de lots scannés
  * nouveaux_produits : nombre de lots jamais vus
  * produits_existants : nombre de lots déjà dans le Sheet
  * prix_moyen : moyenne des prix (nouveaux uniquement)
  * prix_min / prix_max : fourchette (nouveaux uniquement)
  * marques : comptage par marque (nouveaux uniquement)
  * keywords_scanned : liste des mots-clés
  * google_sheet_url : lien du Sheet
```

### Node "🔍 Nouveaux produits ?"

Filtre conditionnel qui **bloque** si `nouveaux_produits == 0`. Discord n'est appelé que si des nouveaux produits existent.

### Node "💬 Notification Discord"

Envoie une requête POST à Discord avec un embed formaté.

---

## 📊 Exemple de Message

Voici à quoi ressemble la notification quand de nouveaux produits sont détectés :

```
┌─────────────────────────────────────┐
│ 🎉 Nouveaux Produits Détectés !     │
│ Le scan a trouvé 12 nouveau(x)      │
│ produit(s) sur Interenchères !      │
├─────────────────────────────────────┤
│ ✨ Nouveaux produits │ 12 produits  │
│ 📦 Total scannés     │ 42 produits  │
│ 📊 Déjà connus       │ 30 produits  │
├─────────────────────────────────────┤
│ 💰 Prix moyen (nouveaux) │ 350€     │
│ 📊 Fourchette            │ 50€-850€ │
│ ⏰ Scan à                │ 09:00    │
├─────────────────────────────────────┤
│ 🏷️ Marques détectées (nouveaux)    │
│ hilti: 4                            │
│ festool: 3                          │
│ milwaukee: 5                        │
├─────────────────────────────────────┤
│ 🔎 Mots-clés scannés                │
│ hilti, festool, milwaukee, makita,  │
│ dewalt, bosch pro                   │
├─────────────────────────────────────┤
│ 📄 Google Sheet                     │
│ [📊 Voir tous les résultats](...)   │
├─────────────────────────────────────┤
│ FlipFinder Scanner • Scan quotidien │
└─────────────────────────────────────┘
```

> **Note** : Si aucun nouveau produit n'est trouvé, **aucune notification** n'est envoyée.

---

## 🧪 Test Manuel

Pour tester la notification sans attendre le trigger automatique :

1. **Ouvrir n8n**
2. **Aller au workflow** "Scanner Interenchères"
3. **Cliquer sur le node** "💬 Notification Discord"
4. **Exécuter le node** manuellement
5. **Vérifier Discord** - La notification devrait apparaître

### Test avec des données fictives

Créez un node de test avant "📊 Calculer Statistiques" :

```javascript
return [{
  json: {
    titre: "Test Hilti TE 60",
    prix: 350,
    marque_detectee: "hilti",
    keyword: "hilti"
  }
}, {
  json: {
    titre: "Festool TS 55",
    prix: 420,
    marque_detectee: "festool",
    keyword: "festool"
  }
}];
```

---

## 🐛 Troubleshooting

### Pas de notification reçue

**Vérifications** :
1. Le workflow s'est-il exécuté ? Vérifier les logs n8n
2. Le node Discord a-t-il une erreur ? Regarder l'OUTPUT du node
3. Le webhook est-il valide ? Tester avec curl :

```bash
curl -X POST https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content": "Test"}'
```

### Erreur 404 sur Discord

**Cause** : Le webhook a été supprimé ou l'URL est incorrecte

**Solution** : Recréer un webhook et mettre à jour l'URL dans le node

### Erreur 429 (Rate Limit)

**Cause** : Trop de requêtes envoyées à Discord

**Solution** :
- Limiter la fréquence du scan (passer de 30min à 1h)
- Ou grouper plusieurs scans avant envoi

### Message vide ou incomplet

**Cause** : Variables non définies dans le node "📊 Calculer Statistiques"

**Solution** : Vérifier que les données arrivent bien du node Google Sheets

---

## 🔮 Évolutions Futures

### v2 : Alertes ciblées

Envoyer des notifications **uniquement** si :
- Plus de X produits trouvés
- ROI estimé > Y%
- Marque premium spécifique détectée

```javascript
// Dans le node avant Discord
if ($json.total_produits > 10 || $json.prix_moyen < 200) {
  return [$input.first()]; // Envoyer
} else {
  return []; // Ne pas envoyer
}
```

### v3 : Boutons interactifs

Ajouter des boutons Discord pour :
- Voir le détail d'un produit
- Marquer comme acheté
- Ignorer ce lot

```json
{
  "components": [{
    "type": 1,
    "components": [{
      "type": 2,
      "style": 5,
      "label": "Voir Google Sheet",
      "url": "..."
    }]
  }]
}
```

### v4 : Notifications personnalisées

Envoyer des DM privés au lieu d'un channel public.

**Nécessite** :
- Créer un bot Discord
- Obtenir le User ID du destinataire
- Utiliser l'endpoint `/users/{user_id}/messages`

---

## 📚 Ressources

- [Discord Webhook Documentation](https://discord.com/developers/docs/resources/webhook)
- [Discord Embed Builder](https://discohook.org/) - Outil visuel
- [Discord Color Picker](https://gist.github.com/thomasbnt/b6f455e2c7d743b796917fa3c205f812)

---

**Version** : v1.0
**Date** : 02 Novembre 2024
**Auteur** : FlipFinder Team
**Status** : ✅ PRODUCTION
