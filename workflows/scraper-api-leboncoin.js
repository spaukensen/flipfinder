// Alternative: Utiliser l'API LeBonCoin au lieu du scraping HTML
// Cette méthode est plus fiable et moins susceptible d'être bloquée

const data = $input.first().json;
const searchQuery = data.search_query;

// Endpoint API LeBonCoin (utilisé par leur site web)
const apiUrl = "https://api.leboncoin.fr/api/adfinder/v1/search";

// Body de la requête
const requestBody = {
  "limit": 35,
  "offset": 0,
  "filters": {
    "category": {"id": "15"}, // Catégorie outillage
    "keywords": {
      "text": searchQuery
    }
  },
  "limit_alu": 3
};

// Headers requis
const headers = {
  "Content-Type": "application/json",
  "api_key": "ba0c2dad52b3ec", // Clé API publique LeBonCoin
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};

// Faire la requête
const response = await $http.request({
  method: 'POST',
  url: apiUrl,
  headers: headers,
  body: requestBody,
  json: true
});

// Extraire les prix des annonces
const ads = response.ads || [];
const prices = ads
  .map(ad => ad.price?.[0])
  .filter(price => price && price > 0 && price < 50000);

// Calculer les stats
let prix_lbc_min = null;
let prix_lbc_max = null;
let prix_lbc_moyen = null;
let prix_lbc_median = null;

if (prices.length > 0) {
  const sorted = prices.sort((a, b) => a - b);

  prix_lbc_min = sorted[0];
  prix_lbc_max = sorted[sorted.length - 1];
  prix_lbc_moyen = Math.round(sorted.reduce((sum, p) => sum + p, 0) / sorted.length);

  const mid = Math.floor(sorted.length / 2);
  prix_lbc_median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// Calculer ROI
const prixEstime = prix_lbc_median || prix_lbc_moyen;
const prixAchat = data.prix_interencheres || 0;

let opportunite_estimee = null;
let roi_estime = null;

if (prixEstime && prixAchat > 0) {
  opportunite_estimee = prixEstime - prixAchat;
  roi_estime = Math.round(((prixEstime - prixAchat) / prixAchat) * 100);
}

return {
  json: {
    lot_id: data.lot_id,
    reference_extraite: data.reference_extraite,
    search_query_auto: data.search_query_auto || null,
    search_query: data.search_query,
    search_type: data.search_type,
    prix_lbc_min: prix_lbc_min,
    prix_lbc_max: prix_lbc_max,
    prix_lbc_moyen: prix_lbc_moyen,
    prix_lbc_median: prix_lbc_median,
    nb_annonces_actives: prices.length,
    nb_annonces_vendues: 0,
    nb_annonces_total: prices.length,
    opportunite_estimee: opportunite_estimee,
    roi_estime: roi_estime,
    date_estimation: new Date().toISOString()
  }
};
