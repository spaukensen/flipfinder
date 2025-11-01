#!/usr/bin/env node

/**
 * Script standalone pour analyser le HTML d'Interencheres
 * Usage: node analyze-interencheres-html.js <chemin-vers-fichier.html>
 */

const fs = require('fs');
const cheerio = require('cheerio');

// Fonction principale d'analyse
function analyzeInterencheresHTML(htmlPath) {
  console.log('📄 Lecture du fichier:', htmlPath);

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);

  console.log('\n📊 STATISTIQUES GÉNÉRALES');
  console.log('─'.repeat(50));
  console.log('Taille HTML:', (html.length / 1024).toFixed(2), 'KB');
  console.log('Éléments totaux:', $('*').length);

  // Chercher le nombre de lots affiché
  const lotsCount = $('body').text().match(/(\d+)\s*Lots?/i);
  if (lotsCount) {
    console.log('Lots annoncés:', lotsCount[1]);
  }

  console.log('\n🔍 ANALYSE DES STRUCTURES POSSIBLES');
  console.log('─'.repeat(50));

  // 1. Chercher des liens vers des lots
  const lotLinks = $('a[href*="/lot/"], a[href*="/vente/"], a[href*="/detail"]');
  console.log(`\n1️⃣  Liens vers lots: ${lotLinks.length}`);
  if (lotLinks.length > 0) {
    lotLinks.slice(0, 3).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 80);
      console.log(`   → ${href} | ${text}`);
    });
  }

  // 2. Chercher des divs/cards avec prix
  const priceElements = $('[class*="price"], [class*="prix"], [class*="amount"]');
  console.log(`\n2️⃣  Éléments avec prix: ${priceElements.length}`);
  priceElements.slice(0, 3).each((i, el) => {
    const $el = $(el);
    const classes = $el.attr('class');
    const text = $el.text().trim();
    console.log(`   → .${classes} = "${text}"`);
  });

  // 3. Chercher des cards/items Vue/Vuetify
  const vCards = $('.v-card, [class*="v-card"]');
  console.log(`\n3️⃣  V-Cards (Vuetify): ${vCards.length}`);
  if (vCards.length > 0) {
    vCards.slice(0, 2).each((i, el) => {
      const $el = $(el);
      const classes = $el.attr('class');
      const hasLink = $el.find('a').length > 0;
      const hasPrice = $el.text().includes('€');
      console.log(`   → Classes: ${classes}`);
      console.log(`      Lien: ${hasLink}, Prix: ${hasPrice}`);
    });
  }

  // 4. Chercher des attributs data-* spécifiques
  const dataLotElements = $('[data-lot], [data-lot-id], [data-item], [data-product]');
  console.log(`\n4️⃣  Éléments avec data-lot/item: ${dataLotElements.length}`);
  dataLotElements.slice(0, 3).each((i, el) => {
    const attrs = el.attribs;
    const dataAttrs = Object.keys(attrs).filter(k => k.startsWith('data-'));
    console.log(`   → ${el.name}.${attrs.class || ''}`);
    console.log(`      Data attrs:`, dataAttrs.join(', '));
  });

  // 5. Chercher les classes "autoqa-" (auto-QA testing)
  const autoqaElements = $('[class*="autoqa-"]');
  console.log(`\n5️⃣  Éléments autoqa (testing): ${autoqaElements.length}`);
  const autoqaClasses = new Set();
  autoqaElements.each((i, el) => {
    const classes = ($(el).attr('class') || '').split(' ');
    classes.forEach(cls => {
      if (cls.startsWith('autoqa-')) autoqaClasses.add(cls);
    });
  });
  console.log('   Classes autoqa trouvées:');
  Array.from(autoqaClasses).slice(0, 10).forEach(cls => {
    console.log(`   → ${cls}`);
  });

  // 6. Chercher du JSON embarqué (Nuxt SSR)
  console.log('\n6️⃣  JSON embarqué (Nuxt SSR)');
  const jsonScripts = $('script[type="application/json"]');
  console.log(`   Scripts JSON: ${jsonScripts.length}`);

  const nuxtMatch = html.match(/__NUXT__\s*=/);
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__/);
  console.log(`   __NUXT__: ${nuxtMatch ? '✓ Trouvé' : '✗ Absent'}`);
  console.log(`   __INITIAL_STATE__: ${initialStateMatch ? '✓ Trouvé' : '✗ Absent'}`);

  // 7. Pattern de grid/liste de résultats
  console.log('\n7️⃣  Containers de résultats');
  const resultContainers = [
    '.search-results',
    '.results-list',
    '.lot-grid',
    '[class*="results"]',
    '[class*="grid"]',
    '[class*="list"]'
  ];

  resultContainers.forEach(selector => {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`   → ${selector}: ${elements.length} éléments`);
      elements.first().children().slice(0, 5).each((i, child) => {
        const tag = child.name;
        const classes = $(child).attr('class') || '';
        console.log(`      Child ${i + 1}: <${tag} class="${classes.substring(0, 50)}...">`);
      });
    }
  });

  // 8. Extraction d'un échantillon de structure
  console.log('\n📋 ÉCHANTILLON DE STRUCTURE HTML');
  console.log('─'.repeat(50));

  // Essayer de trouver un conteneur principal
  const mainContainer = $('.v-main, main, #app, [id*="app"]').first();
  if (mainContainer.length > 0) {
    const structure = extractStructure(mainContainer, 0, 3);
    console.log(structure);
  }

  // 9. Tentative d'extraction automatique
  console.log('\n🤖 TENTATIVE D\'EXTRACTION AUTOMATIQUE');
  console.log('─'.repeat(50));

  const extractedLots = autoExtractLots($, html);
  console.log(`Lots extraits: ${extractedLots.length}`);

  if (extractedLots.length > 0) {
    console.log('\n📦 ÉCHANTILLON DE LOTS EXTRAITS (3 premiers):');
    extractedLots.slice(0, 3).forEach((lot, i) => {
      console.log(`\n${i + 1}. ${lot.titre}`);
      console.log(`   Prix: ${lot.prix}`);
      console.log(`   URL: ${lot.url}`);
      console.log(`   Méthode: ${lot.method}`);
    });

    // Sauvegarder les lots extraits
    const outputPath = htmlPath.replace('.html', '-extracted-lots.json');
    fs.writeFileSync(outputPath, JSON.stringify(extractedLots, null, 2));
    console.log(`\n💾 Lots sauvegardés dans: ${outputPath}`);
  } else {
    console.log('⚠️  Aucun lot extrait automatiquement');
    console.log('→ Vérifiez manuellement le HTML et ajustez les sélecteurs');
  }
}

// Fonction pour extraire la structure HTML (recursive tree)
function extractStructure($el, depth, maxDepth) {
  if (depth >= maxDepth) return '';

  const indent = '  '.repeat(depth);
  const tag = $el.prop('tagName')?.toLowerCase() || 'unknown';
  const classes = $el.attr('class') || '';
  const id = $el.attr('id') || '';

  let result = `${indent}<${tag}`;
  if (id) result += ` id="${id}"`;
  if (classes) result += ` class="${classes.substring(0, 50)}${classes.length > 50 ? '...' : ''}"`;
  result += '>\n';

  $el.children().slice(0, 5).each((i, child) => {
    result += extractStructure($(child), depth + 1, maxDepth);
  });

  return result;
}

// Fonction d'extraction automatique multi-méthodes
function autoExtractLots($, html) {
  const lots = [];

  // Méthode 1: Par liens vers lots
  $('a[href*="/lot/"], a[href*="/vente/"]').each((i, el) => {
    const $el = $(el);
    const $parent = $el.closest('.v-card, [class*="card"], [class*="item"]');

    if ($parent.length > 0) {
      const titre = $parent.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim()
        || $el.text().trim();
      const prix = $parent.find('[class*="price"], [class*="prix"]').first().text().trim();
      const url = $el.attr('href');

      if (titre && !lots.some(lot => lot.url === url)) {
        lots.push({
          titre,
          prix,
          url: url.startsWith('http') ? url : `https://www.interencheres.com${url}`,
          method: 'link-based'
        });
      }
    }
  });

  // Méthode 2: Par éléments avec classe "lot"
  $('[class*="lot-"]').each((i, el) => {
    const $el = $(el);
    const titre = $el.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
    const prix = $el.find('[class*="price"], [class*="prix"]').first().text().trim();
    const url = $el.find('a').first().attr('href');

    if (titre && url && !lots.some(lot => lot.url === url)) {
      lots.push({
        titre,
        prix,
        url: url.startsWith('http') ? url : `https://www.interencheres.com${url}`,
        method: 'class-based'
      });
    }
  });

  // Méthode 3: Extraction depuis JSON
  const jsonLots = extractLotsFromJSON(html);
  jsonLots.forEach(lot => {
    if (!lots.some(l => l.url === lot.url)) {
      lots.push({ ...lot, method: 'json-based' });
    }
  });

  return lots;
}

// Extraction depuis JSON embarqué
function extractLotsFromJSON(html) {
  const lots = [];

  try {
    // Pattern Nuxt
    const nuxtMatch = html.match(/__NUXT__\s*=\s*(\{.+?\});/s);
    if (nuxtMatch) {
      const data = JSON.parse(nuxtMatch[1]);
      const foundLots = findLotsRecursive(data);
      lots.push(...foundLots);
    }

    // Scripts JSON
    const scriptMatches = html.matchAll(/<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/gs);
    for (const match of scriptMatches) {
      try {
        const data = JSON.parse(match[1]);
        const foundLots = findLotsRecursive(data);
        lots.push(...foundLots);
      } catch (e) {
        // Ignore
      }
    }
  } catch (e) {
    console.error('Erreur extraction JSON:', e.message);
  }

  return lots;
}

// Recherche recursive de lots dans un objet
function findLotsRecursive(obj, depth = 0) {
  if (depth > 10 || !obj) return [];

  const lots = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        if (item.titre || item.title || item.name) {
          lots.push({
            titre: item.titre || item.title || item.name || '',
            prix: item.prix || item.price || item.amount || '0',
            url: item.url || item.link || item.href || ''
          });
        }
        lots.push(...findLotsRecursive(item, depth + 1));
      }
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      lots.push(...findLotsRecursive(obj[key], depth + 1));
    }
  }

  return lots;
}

// Point d'entrée
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: node analyze-interencheres-html.js <fichier.html>');
    console.error('\nExemple:');
    console.error('  node analyze-interencheres-html.js /tmp/interencheres.html');
    console.error('  node analyze-interencheres-html.js C:\\temp\\interencheres.html');
    process.exit(1);
  }

  const htmlPath = args[0];

  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ Fichier introuvable: ${htmlPath}`);
    process.exit(1);
  }

  analyzeInterencheresHTML(htmlPath);
}

module.exports = { analyzeInterencheresHTML, autoExtractLots };
