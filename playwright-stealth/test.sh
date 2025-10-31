#!/bin/bash

# Test script pour Playwright Stealth API

echo "🧪 Test Playwright Stealth API"
echo "================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo -n "1️⃣  Testing health endpoint... "
HEALTH=$(curl -s http://localhost:3001/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $HEALTH"
fi

echo ""

# Test 2: Simple scrape (Google - should work)
echo "2️⃣  Testing simple scrape (Google)... "
echo -e "${YELLOW}Expected: ~2-3 seconds${NC}"
START=$(date +%s)
GOOGLE=$(curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com","waitFor":2000}')
END=$(date +%s)
DURATION=$((END - START))

if echo "$GOOGLE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ OK${NC} (${DURATION}s)"
    echo "HTML length: $(echo "$GOOGLE" | jq -r '.html | length') chars"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$GOOGLE" | jq '.'
fi

echo ""

# Test 3: Interencheres (with Cloudflare)
echo "3️⃣  Testing Interencheres (Cloudflare challenge)... "
echo -e "${YELLOW}Expected: ~8-12 seconds${NC}"
START=$(date +%s)
INTER=$(curl -s -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.interencheres.com/recherche/?keyword=hilti&cat=14","waitFor":8000}')
END=$(date +%s)
DURATION=$((END - START))

if echo "$INTER" | grep -q '"success":true'; then
    HTML_LENGTH=$(echo "$INTER" | jq -r '.html | length')
    CLOUDFLARE=$(echo "$INTER" | jq -r '.cloudflareDetected')

    echo -e "${GREEN}✓ OK${NC} (${DURATION}s)"
    echo "HTML length: $HTML_LENGTH chars"
    echo "Cloudflare detected: $CLOUDFLARE"

    # Vérifier si c'est vraiment du contenu et pas juste Cloudflare
    if echo "$INTER" | jq -r '.html' | grep -q "recherche"; then
        echo -e "${GREEN}✓ Real content detected (not Cloudflare page)${NC}"
    else
        echo -e "${RED}⚠ Warning: Might still be Cloudflare page${NC}"
        echo "First 200 chars of HTML:"
        echo "$INTER" | jq -r '.html' | head -c 200
        echo ""
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$INTER" | jq '.'
fi

echo ""

# Test 4: Check browser connection
echo "4️⃣  Checking browser connection... "
HEALTH_BROWSER=$(curl -s http://localhost:3001/health | jq -r '.browserConnected')
if [ "$HEALTH_BROWSER" = "true" ]; then
    echo -e "${GREEN}✓ Browser connected${NC}"
else
    echo -e "${RED}✗ Browser not connected${NC}"
fi

echo ""
echo "================================"
echo "Tests complete!"
echo ""
echo "💡 Tips:"
echo "  - Si Cloudflare bloque, augmenter waitFor à 12000-15000ms"
echo "  - Vérifier les logs: docker logs outillage_playwright -f"
echo "  - Si échec persistant, essayer FlareSolverr (voir README)"
