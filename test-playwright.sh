#!/bin/bash

echo "=== Test Playwright-Stealth Service ==="

# Test 1: Service is running
echo -e "\n1. Checking if playwright-stealth container is running..."
docker ps | grep playwright

# Test 2: Service responds
echo -e "\n2. Testing service endpoint..."
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.leboncoin.fr/recherche?text=hilti",
    "waitFor": 5000
  }' \
  --max-time 30 \
  -o test-output.html

# Test 3: Check if HTML contains prices
echo -e "\n3. Checking if HTML contains prices (€)..."
grep -c "€" test-output.html || echo "No prices found!"

# Test 4: Check for CAPTCHA
echo -e "\n4. Checking for CAPTCHA..."
grep -i "captcha\|datadome" test-output.html && echo "⚠️ CAPTCHA DETECTED!" || echo "✅ No CAPTCHA"

echo -e "\n=== Test Complete ==="
echo "Check test-output.html for full HTML"
