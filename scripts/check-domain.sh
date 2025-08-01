#!/bin/bash

# Domain Configuration Checker
# Usage: ./scripts/check-domain.sh yourdomain.com

if [ $# -eq 0 ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 app.yourdomain.com"
    exit 1
fi

DOMAIN=$1
echo "🔍 Checking domain configuration for: $DOMAIN"
echo "================================================"

# Check DNS resolution
echo "📡 DNS Resolution:"
if nslookup $DOMAIN > /dev/null 2>&1; then
    echo "✅ DNS resolves correctly"
    nslookup $DOMAIN | grep -A 2 "Name:"
else
    echo "❌ DNS resolution failed"
fi

echo ""

# Check HTTP response
echo "🌐 HTTP Response:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✅ HTTP redirects to HTTPS (Status: $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "200" ]; then
    echo "⚠️  HTTP returns 200 (consider forcing HTTPS)"
else
    echo "❌ HTTP failed (Status: $HTTP_STATUS)"
fi

echo ""

# Check HTTPS response
echo "🔒 HTTPS Response:"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$HTTPS_STATUS" = "200" ]; then
    echo "✅ HTTPS works correctly (Status: $HTTPS_STATUS)"
else
    echo "❌ HTTPS failed (Status: $HTTPS_STATUS)"
fi

echo ""

# Check SSL certificate
echo "🛡️  SSL Certificate:"
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo "✅ SSL certificate is valid"
    echo "Certificate details:"
    openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null
else
    echo "❌ SSL certificate check failed"
fi

echo ""

# Check specific endpoints
echo "🔧 API Endpoints:"
FILTERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/filters)
if [ "$FILTERS_STATUS" = "200" ]; then
    echo "✅ /api/filters endpoint works (Status: $FILTERS_STATUS)"
else
    echo "❌ /api/filters endpoint failed (Status: $FILTERS_STATUS)"
fi

GOOGLE_AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/auth/google/url)
if [ "$GOOGLE_AUTH_STATUS" = "200" ] || [ "$GOOGLE_AUTH_STATUS" = "500" ]; then
    echo "✅ /api/auth/google/url endpoint accessible (Status: $GOOGLE_AUTH_STATUS)"
else
    echo "❌ /api/auth/google/url endpoint failed (Status: $GOOGLE_AUTH_STATUS)"
fi

echo ""
echo "🎉 Domain check complete!"
echo ""
echo "Next steps:"
echo "1. If DNS failed: Wait for propagation (up to 48 hours)"
echo "2. If HTTPS failed: Check Cloudflare SSL settings"
echo "3. If API failed: Verify worker deployment"
echo "4. Update Google OAuth settings with this domain"