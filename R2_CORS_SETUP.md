# R2 CORS Configuration for Capitão Caverna Image Engine

## Overview

This document describes the CORS configuration required for the Capitão Caverna Image Engine R2 bucket to enable proper image access from web browsers.

## CORS Configuration

The R2 bucket `capitao-caverna-images` needs to be configured with the following CORS policy:

```json
[
  {
    "AllowedOrigins": [
      "https://your-domain.com",
      "https://*.your-domain.com",
      "http://localhost:*",
      "https://localhost:*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## Setup Instructions

### Using Wrangler CLI

1. Create a CORS configuration file `cors.json`:
```bash
cat > cors.json << 'EOF'
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
EOF
```

2. Apply CORS configuration to the bucket:
```bash
wrangler r2 bucket cors put capitao-caverna-images --file cors.json
```

3. Verify CORS configuration:
```bash
wrangler r2 bucket cors get capitao-caverna-images
```

### Using Cloudflare Dashboard

1. Navigate to R2 Object Storage in your Cloudflare dashboard
2. Select the `capitao-caverna-images` bucket
3. Go to Settings > CORS policy
4. Add the CORS configuration as shown above

## Security Considerations

- In production, replace `"*"` in `AllowedOrigins` with your specific domain(s)
- Consider restricting `AllowedHeaders` to only necessary headers
- The current configuration allows public read access to images, which is intended for this use case
- Images are stored with UUID-based keys to prevent enumeration attacks

## Testing CORS

You can test CORS configuration using curl:

```bash
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://capitao-caverna-images.your-account-id.r2.cloudflarestorage.com/test-image.jpg
```

The response should include appropriate CORS headers if configured correctly.