/**
 * Script d'extraction des lots depuis Interencheres.com
 * Compatible avec n8n - À utiliser dans un nœud Code
 */

const cheerio = require('cheerio');

function extractLots(html) {
  const $ = cheerio.load(html);
  const lots = [];

  // Patterns possibles pour les lots (à ajuster selon le HTML réel)
  const selectors = [
    // Pattern 1: Cards Vue/Vuetify
    '.v-card.lot-card',
    '.v-card[data-lot-id]',
    'article.lot',

    // Pattern 2: Liste de résultats
    '.search-results .lot-item',
    '.results-list > div',

    // Pattern 3: Grid layout
    '.lot-grid .lot',
    '[class*="lot-item"]',

    // Pattern 4: Nuxt/Vue components
    '[data-v-][class*="lot"]',
    '.autoqa-lot',
    '.autoqa-result-item'
  ];

  // Essayer chaque sélecteur
  for (const selector of selectors) {
    const elements = $(selector);

    if (elements.length > 0) {
      console.log(`✓ Trouvé ${elements.length} éléments avec sélecteur: ${selector}`);

      elements.each((index, element) => {
        const $el = $(element);

        // Extraction du titre (plusieurs patterns possibles)
        const titre = $el.find('h2, h3, .title, .lot-title, [class*="title"]').first().text().trim()
          || $el.find('a').first().text().trim();

        // Extraction du prix (patterns communs)
        const prixText = $el.find('.price, .lot-price, [class*="price"], .amount').first().text().trim()
          || $el.text().match(/\d+\s*€/)?.[0] || '';

        // Nettoyage du prix
        const prix = prixText.replace(/[^\d,]/g, '').replace(',', '.');

        // Extraction de l'URL
        const url = $el.find('a').first().attr('href') || '';
        const fullUrl = url.startsWith('http') ? url : `https://www.interencheres.com${url}`;

        // Extraction d'informations supplémentaires
        const image = $el.find('img').first().attr('src') || '';
        const enchereInfo = $el.find('.enchere-info, [class*="auction"]').text().trim();
        const localisation = $el.find('.location, [class*="location"]').text().trim();

        // N'ajouter que si on a au moins un titre ou une URL
        if (titre || url) {
          lots.push({
            titre,
            prix: prix || '0',
            prixBrut: prixText,
            url: fullUrl,
            image,
            enchereInfo,
            localisation,
            source: 'interencheres',
            extractedWith: selector,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Si on a trouvé des lots, on arrête
      if (lots.length > 0) {
        break;
      }
    }
  }

  return lots;
}

/**
 * Analyse plus approfondie du HTML pour identifier la structure
 */
function analyzeStructure(html) {
  const $ = cheerio.load(html);
  const analysis = {
    totalElements: 0,
    possibleLotContainers: [],
    classesFound: new Set(),
    dataAttributes: new Set()
  };

  // Chercher tous les éléments qui pourraient contenir des lots
  $('div, article, section, li').each((i, el) => {
    const $el = $(el);
    const classes = $el.attr('class') || '';
    const dataAttrs = Object.keys(el.attribs).filter(attr => attr.startsWith('data-'));

    // Collecter les classes
    classes.split(' ').forEach(cls => {
      if (cls) analysis.classesFound.add(cls);
    });

    // Collecter les attributs data-*
    dataAttrs.forEach(attr => analysis.dataAttributes.add(attr));

    // Identifier les conteneurs potentiels de lots
    if (classes.match(/lot|item|card|result|auction/i) ||
        dataAttrs.some(attr => attr.match(/lot|item/i))) {
      analysis.possibleLotContainers.push({
        tag: el.name,
        classes: classes,
        dataAttrs: dataAttrs,
        hasLink: $el.find('a').length > 0,
        hasPrice: $el.text().includes('€'),
        textPreview: $el.text().substring(0, 100).trim()
      });
    }
  });

  analysis.totalElements = $('*').length;
  analysis.classesFound = Array.from(analysis.classesFound);
  analysis.dataAttributes = Array.from(analysis.dataAttributes);

  return analysis;
}

/**
 * Méthode alternative: extraction par regex si le HTML contient du JSON
 */
function extractFromJSON(html) {
  const lots = [];

  // Chercher des structures JSON dans le HTML (Nuxt SSR)
  const jsonPatterns = [
    /__NUXT__\s*=\s*(\{.+?\});/s,
    /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});/s,
    /<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/gs
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1];
        const data = JSON.parse(jsonStr);

        // Explorer l'objet JSON pour trouver les lots
        const extractedLots = findLotsInObject(data);
        if (extractedLots.length > 0) {
          lots.push(...extractedLots);
        }
      } catch (e) {
        console.error('Erreur parsing JSON:', e.message);
      }
    }
  }

  return lots;
}

/**
 * Recherche récursive de lots dans un objet JSON
 */
function findLotsInObject(obj, depth = 0) {
  if (depth > 10) return []; // Limite de profondeur

  const lots = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        // Vérifier si c'est un lot
        if (item.titre || item.title || item.name) {
          lots.push({
            titre: item.titre || item.title || item.name,
            prix: item.prix || item.price || item.amount || '0',
            url: item.url || item.link || item.href || '',
            ...item
          });
        } else {
          lots.push(...findLotsInObject(item, depth + 1));
        }
      }
    }
  } else if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.match(/lot|result|item|auction/i) && Array.isArray(obj[key])) {
        lots.push(...findLotsInObject(obj[key], depth + 1));
      } else if (typeof obj[key] === 'object') {
        lots.push(...findLotsInObject(obj[key], depth + 1));
      }
    }
  }

  return lots;
}

// ====================
// CODE POUR N8N
// ====================

// Récupérer le HTML depuis le nœud précédent
const inputData = $input.first().json;
const html = inputData.html || inputData.body || '';

if (!html || html.length < 1000) {
  return [{
    json: {
      error: 'HTML trop court ou vide',
      length: html.length
    }
  }];
}

// Méthode 1: Extraction par sélecteurs CSS
let lots = extractLots(html);

// Méthode 2: Si méthode 1 échoue, essayer extraction JSON
if (lots.length === 0) {
  console.log('Tentative extraction depuis JSON embarqué...');
  lots = extractFromJSON(html);
}

// Méthode 3: Analyse de structure pour debug
const structure = analyzeStructure(html);

// Retourner les résultats
return [{
  json: {
    success: lots.length > 0,
    totalLots: lots.length,
    lots: lots,
    debug: {
      htmlSize: html.length,
      structure: structure,
      sample: lots.slice(0, 3) // Premiers 3 lots comme échantillon
    }
  }
}];
