// Extraire prix des offres actives uniquement - VERSION DEBUG
// Récupérer les données du scraper (HTML)
const scraperData = $input.first().json;
const html = scraperData.html || '';

// Récupérer les données originales du node Construire URL LBC
const originalData = $('Construire URL LBC').first().json;

// DEBUG: Afficher des infos sur le HTML reçu
console.log('=== DEBUG EXTRACTION PRIX ===');
console.log('HTML length:', html.length);
console.log('HTML preview (first 1000 chars):', html.substring(0, 1000));

// Pattern LeBonCoin pour prix (formats multiples pour compatibilité)
const pricePatterns = [
  // Format 1: data-qa-id dans span
  /<span[^>]*data-qa-id="aditem_price"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/span>/gi,
  // Format 2: data-test-id="price" avec span enfant (nouveau format 2025)
  /<p[^>]*data-test-id="price"[^>]*>[\s\S]*?<span[^>]*>([\d\s]+)(?:&nbsp;)?€<\/span>/gi,
  // Format 3: data-test-id="price" direct
  /<p[^>]*data-test-id="price"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/p>/gi,
  // Format 4: class contenant price
  /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d\s]+)(?:&nbsp;)?€<\/span>/gi,
  // Format 5: Recherche générique de prix avec € (fallback)
  />([\d\s]{2,})(?:&nbsp;|\s)?€</gi
];

function extractPrices(html) {
  const prices = [];
  const seenPrices = new Set(); // Éviter les doublons

  for (let i = 0; i < pricePatterns.length; i++) {
    const pattern = pricePatterns[i];
    let match;
    let matchCount = 0;

    while ((match = pattern.exec(html)) !== null) {
      matchCount++;
      const priceStr = match[1].replace(/[\s&nbsp;]/g, '');
      const price = parseInt(priceStr);

      // DEBUG: Afficher chaque match
      if (matchCount <= 3) { // Limiter les logs aux 3 premiers
        console.log(`Pattern ${i+1} - Match ${matchCount}:`, priceStr, '→', price);
      }

      if (price > 0 && price < 50000 && !seenPrices.has(price)) {
        prices.push(price);
        seenPrices.add(price);
      }
    }

    console.log(`Pattern ${i+1} - Total matches: ${matchCount}`);
  }

  return prices;
}

const prices = extractPrices(html);

console.log('=== RÉSULTAT EXTRACTION ===');
console.log('Prices found:', prices);
console.log('Number of prices:', prices.length);

// Calculer stats
let prix_lbc_min = null;
let prix_lbc_max = null;
let prix_lbc_moyen = null;
let prix_lbc_median = null;
const nb_annonces_actives = prices.length;
const nb_annonces_vendues = 0;
const nb_annonces_total = prices.length;

if (prices.length > 0) {
  const sorted = prices.sort((a, b) => a - b);

  prix_lbc_min = sorted[0];
  prix_lbc_max = sorted[sorted.length - 1];
  prix_lbc_moyen = Math.round(sorted.reduce((sum, p) => sum + p, 0) / sorted.length);

  const mid = Math.floor(sorted.length / 2);
  prix_lbc_median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];

  console.log('Stats calculées:');
  console.log('  - Min:', prix_lbc_min);
  console.log('  - Max:', prix_lbc_max);
  console.log('  - Moyen:', prix_lbc_moyen);
  console.log('  - Médian:', prix_lbc_median);
} else {
  console.log('⚠️ AUCUN PRIX TROUVÉ - Vérifier le HTML et les patterns');
}

// Calculer opportunité et ROI
const prixEstime = prix_lbc_median || prix_lbc_moyen;
const prixAchat = originalData.prix_interencheres || 0;

let opportunite_estimee = null;
let roi_estime = null;

if (prixEstime && prixAchat > 0) {
  opportunite_estimee = prixEstime - prixAchat;
  roi_estime = Math.round(((prixEstime - prixAchat) / prixAchat) * 100);
}

return {
  json: {
    lot_id: originalData.lot_id,
    reference_extraite: originalData.reference_extraite,
    search_query_auto: originalData.search_query_auto || null,
    search_query: originalData.search_query,
    search_type: originalData.search_type,
    prix_lbc_min: prix_lbc_min,
    prix_lbc_max: prix_lbc_max,
    prix_lbc_moyen: prix_lbc_moyen,
    prix_lbc_median: prix_lbc_median,
    nb_annonces_actives: nb_annonces_actives,
    nb_annonces_vendues: nb_annonces_vendues,
    nb_annonces_total: nb_annonces_total,
    opportunite_estimee: opportunite_estimee,
    roi_estime: roi_estime,
    date_estimation: new Date().toISOString()
  }
};
