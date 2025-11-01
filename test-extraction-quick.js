#!/usr/bin/env node

/**
 * Test rapide d'extraction Interencheres
 * Sans dépendances externes - utilise fetch natif Node.js 18+
 */

const https = require('https');

async function fetchInterencheresHTML(keyword = 'hilti') {
  return new Promise((resolve, reject) => {
    const url = `https://www.interencheres.com/recherche/?keyword=${keyword}&cat=14`;

    console.log('🌐 Fetching:', url);

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    }, (res) => {
      let html = '';

      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        console.log('✅ HTML récupéré:', (html.length / 1024).toFixed(2), 'KB');
        resolve(html);
      });
    }).on('error', reject);
  });
}

function analyzeHTML(html) {
  console.log('\n📊 ANALYSE RAPIDE DU HTML');
  console.log('='.repeat(50));

  // 1. Chercher le nombre de lots
  const lotsMatch = html.match(/(\d+)\s*Lots?/i);
  console.log('1. Lots annoncés:', lotsMatch ? lotsMatch[1] : 'Non trouvé');

  // 2. Chercher des liens vers lots
  const lotLinksMatches = html.match(/href="[^"]*\/lot\/[^"]*"/gi) || [];
  console.log('2. Liens /lot/ trouvés:', lotLinksMatches.length);
  if (lotLinksMatches.length > 0) {
    console.log('   Exemple:', lotLinksMatches[0]);
  }

  // 3. Chercher des prix
  const priceMatches = html.match(/\d+\s*€/g) || [];
  console.log('3. Prix trouvés:', priceMatches.length);
  if (priceMatches.length > 0) {
    console.log('   Exemples:', priceMatches.slice(0, 5).join(', '));
  }

  // 4. Chercher des classes autoqa
  const autoqaMatches = html.match(/class="[^"]*autoqa-[^"]*"/gi) || [];
  const autoqaClasses = new Set();
  autoqaMatches.forEach(match => {
    const classes = match.match(/autoqa-[\w-]+/gi);
    if (classes) classes.forEach(cls => autoqaClasses.add(cls));
  });
  console.log('4. Classes autoqa:', autoqaClasses.size);
  if (autoqaClasses.size > 0) {
    console.log('   Exemples:', Array.from(autoqaClasses).slice(0, 5).join(', '));
  }

  // 5. Chercher des v-card (Vuetify)
  const vCardMatches = html.match(/class="[^"]*v-card[^"]*"/gi) || [];
  console.log('5. V-Cards (Vuetify):', vCardMatches.length);

  // 6. Chercher du JSON Nuxt
  const hasNuxt = html.includes('__NUXT__');
  const hasInitialState = html.includes('__INITIAL_STATE__');
  console.log('6. JSON embarqué:');
  console.log('   __NUXT__:', hasNuxt ? '✓' : '✗');
  console.log('   __INITIAL_STATE__:', hasInitialState ? '✓' : '✗');

  // 7. Extraire un échantillon de structure
  console.log('\n7. Échantillon de HTML (premier résultat):');
  const firstLotPattern = html.match(/<a[^>]*href="[^"]*\/lot\/[^"]*"[^>]*>(.{0,200})/s);
  if (firstLotPattern) {
    console.log('   ', firstLotPattern[0].substring(0, 150) + '...');
  }

  // 8. Pattern de cards/items
  console.log('\n8. Patterns possibles:');
  const patterns = [
    { name: 'lot-card', regex: /class="[^"]*lot-card[^"]*"/i },
    { name: 'lot-item', regex: /class="[^"]*lot-item[^"]*"/i },
    { name: 'result-item', regex: /class="[^"]*result-item[^"]*"/i },
    { name: 'auction-item', regex: /class="[^"]*auction[^"]*"/i },
  ];

  patterns.forEach(({ name, regex }) => {
    const matches = html.match(new RegExp(regex, 'gi')) || [];
    if (matches.length > 0) {
      console.log(`   ✓ .${name}:`, matches.length);
    }
  });

  // 9. Recommandations
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('='.repeat(50));

  if (lotLinksMatches.length > 0) {
    console.log('✅ Des liens vers lots sont présents');
    console.log('→ Utiliser sélecteur: a[href*="/lot/"]');
  }

  if (autoqaClasses.size > 0) {
    console.log('✅ Classes autoqa détectées');
    console.log('→ Utiliser sélecteurs:', Array.from(autoqaClasses).slice(0, 3).map(c => `.${c}`).join(', '));
  }

  if (vCardMatches.length > 0) {
    console.log('✅ Vuetify détecté');
    console.log('→ Utiliser sélecteur: .v-card');
  }

  if (hasNuxt) {
    console.log('✅ Nuxt SSR détecté');
    console.log('→ Extraction JSON possible');
  }

  if (lotLinksMatches.length === 0 && priceMatches.length === 0) {
    console.log('⚠️  ATTENTION: Peu de données détectées');
    console.log('→ Le HTML est peut-être incomplet (JavaScript requis)');
    console.log('→ Utiliser Puppeteer/Playwright au lieu de HTTP simple');
  }
}

async function saveHTML(html, filename = 'interencheres-sample.html') {
  const fs = require('fs');
  const path = require('path');

  // Déterminer le chemin de sauvegarde
  let savePath;
  if (process.platform === 'win32') {
    // Windows
    const tempDir = process.env.TEMP || 'C:\\temp';
    savePath = path.join(tempDir, filename);
  } else {
    // Linux/Mac
    savePath = `/tmp/${filename}`;
  }

  fs.writeFileSync(savePath, html);
  console.log(`\n💾 HTML sauvegardé: ${savePath}`);
  console.log(`→ Analysez avec: node analyze-interencheres-html.js "${savePath}"`);

  return savePath;
}

// Point d'entrée
(async () => {
  try {
    const keyword = process.argv[2] || 'hilti';

    console.log('🚀 Test Extraction Interencheres');
    console.log('Keyword:', keyword);
    console.log('');

    const html = await fetchInterencheresHTML(keyword);

    analyzeHTML(html);

    await saveHTML(html, `interencheres-${keyword}.html`);

    console.log('\n✅ Test terminé');
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier le fichier HTML sauvegardé');
    console.log('2. Lancer: node analyze-interencheres-html.js <fichier>');
    console.log('3. Ajuster les sélecteurs dans extract-lots-interencheres.js');
    console.log('4. Importer workflow-extract-lots-interencheres.json dans n8n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
