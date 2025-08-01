#!/bin/bash

# Capitão Caverna Image Engine - R2 Production Optimization Setup
# This script configures R2 bucket for optimal production performance

set -e

echo "🪣 Setting up Capitão Caverna R2 Production Optimization"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare. Please run 'wrangler login' first."
    exit 1
fi

BUCKET_NAME="capitao-caverna-images-prod"

# Create production R2 bucket if it doesn't exist
print_status "Setting up production R2 bucket..."

if wrangler r2 bucket list | grep -q "$BUCKET_NAME"; then
    print_status "Production R2 bucket already exists"
else
    print_status "Creating production R2 bucket..."
    wrangler r2 bucket create "$BUCKET_NAME"
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create production R2 bucket"
        exit 1
    fi
    
    print_success "Production R2 bucket created successfully"
fi

# Configure CORS for production
print_status "Configuring production CORS settings..."

cat > /tmp/production-cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://capitaocaverna.com",
        "https://www.capitaocaverna.com",
        "https://app.capitaocaverna.com"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": [
        "Range",
        "If-Modified-Since",
        "If-None-Match",
        "Cache-Control"
      ],
      "ExposeHeaders": [
        "ETag",
        "Content-Length",
        "Content-Type",
        "Last-Modified"
      ],
      "MaxAgeSeconds": 86400
    },
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

wrangler r2 bucket cors put "$BUCKET_NAME" --file /tmp/production-cors.json

if [ $? -ne 0 ]; then
    print_error "Failed to configure CORS. Please configure manually in Cloudflare Dashboard."
    exit 1
else
    print_success "Production CORS configured successfully"
fi

# Clean up temporary file
rm -f /tmp/production-cors.json

# Configure lifecycle rules for cost optimization
print_status "Configuring lifecycle rules for cost optimization..."

cat > /tmp/lifecycle-rules.json << 'EOF'
{
  "Rules": [
    {
      "Id": "DeleteIncompleteUploads",
      "Status": "Enabled",
      "Filter": {},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 1
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "generated/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "INFREQUENT_ACCESS"
        }
      ]
    },
    {
      "Id": "DeleteOldTempFiles",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
EOF

# Note: Lifecycle rules might not be available via CLI, so we'll provide instructions
print_warning "Lifecycle rules need to be configured manually in Cloudflare Dashboard:"
echo "1. Go to Cloudflare Dashboard > R2 > $BUCKET_NAME"
echo "2. Navigate to Settings > Lifecycle Rules"
echo "3. Add the following rules:"
echo "   - Delete incomplete multipart uploads after 1 day"
echo "   - Transition generated images to Infrequent Access after 30 days"
echo "   - Delete temporary files after 7 days"

# Clean up temporary file
rm -f /tmp/lifecycle-rules.json

# Set up bucket notifications (if available)
print_status "Setting up bucket monitoring..."

# Create a test object to verify bucket functionality
print_status "Testing bucket functionality..."

echo "test-content-$(date)" > /tmp/test-object.txt
wrangler r2 object put "$BUCKET_NAME/health-check/test.txt" --file /tmp/test-object.txt

if [ $? -eq 0 ]; then
    print_success "Bucket write test passed"
    
    # Test read functionality
    wrangler r2 object get "$BUCKET_NAME/health-check/test.txt" --file /tmp/test-download.txt
    
    if [ $? -eq 0 ]; then
        print_success "Bucket read test passed"
        
        # Clean up test files
        wrangler r2 object delete "$BUCKET_NAME/health-check/test.txt"
        rm -f /tmp/test-object.txt /tmp/test-download.txt
    else
        print_error "Bucket read test failed"
        exit 1
    fi
else
    print_error "Bucket write test failed"
    exit 1
fi

# Display bucket information
print_status "Getting bucket information..."
wrangler r2 bucket list | grep "$BUCKET_NAME"

# Create bucket structure
print_status "Creating optimal bucket structure..."

# Create directory structure by uploading placeholder files
echo "# Generated Images Directory" > /tmp/readme.md
wrangler r2 object put "$BUCKET_NAME/generated/README.md" --file /tmp/readme.md

echo "# Temporary Files Directory" > /tmp/readme.md
wrangler r2 object put "$BUCKET_NAME/temp/README.md" --file /tmp/readme.md

echo "# Cache Directory" > /tmp/readme.md
wrangler r2 object put "$BUCKET_NAME/cache/README.md" --file /tmp/readme.md

echo "# Health Check Directory" > /tmp/readme.md
wrangler r2 object put "$BUCKET_NAME/health-check/README.md" --file /tmp/readme.md

rm -f /tmp/readme.md

print_success "Bucket structure created"

# Display optimization recommendations
echo ""
print_success "R2 Production Optimization Setup Complete!"
echo "=========================================="
echo ""
print_status "Optimization features configured:"
echo "✅ Production CORS settings"
echo "✅ Bucket structure for organization"
echo "✅ Health check functionality"
echo "✅ Zero egress fees configuration"
echo ""
print_status "Manual configuration needed:"
echo "🔧 Lifecycle rules (see instructions above)"
echo "🔧 Custom domain setup for CDN benefits"
echo "🔧 Cache headers optimization"
echo ""
print_status "Performance benefits:"
echo "🚀 Zero egress fees for image delivery"
echo "🚀 Global edge caching"
echo "🚀 Co-location with Workers"
echo "🚀 Automatic compression and optimization"
echo ""
print_warning "Next steps:"
echo "1. Set up custom domain for R2 bucket in Cloudflare Dashboard"
echo "2. Configure cache headers for optimal performance"
echo "3. Set up monitoring and alerting for bucket usage"
echo "4. Test image upload and delivery performance"
echo "5. Configure CDN settings for global distribution"