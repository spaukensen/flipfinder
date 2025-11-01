// Nœud Code n8n pour sauvegarder le HTML
const fs = require('fs');
const path = require('path');

// Récupérer le HTML depuis le nœud précédent
const data = $input.first().json;
const html = data.html || data.body || '';

// Chemin de sauvegarde
const savePath = '/tmp/interencheres-hilti.html';

// Sauvegarder le fichier
fs.writeFileSync(savePath, html);

// Statistiques
return [{
  json: {
    saved: true,
    path: savePath,
    size: html.length,
    preview: html.substring(0, 500)
  }
}];
