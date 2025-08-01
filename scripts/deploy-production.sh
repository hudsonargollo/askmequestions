#!/bin/bash

# Capitão Caverna Image Engine - Production Deployment Script
# This script handles the complete production deployment process

set -e

echo "🚀 Starting Capitão Caverna Image Engine Production Deployment"
echo "============================================================"

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
print_status "Checking prerequisites..."

if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js and npm first."
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare. Please run 'wrangler login' first."
    exit 1
fi

print_success "Prerequisites check passed"

# Build the application
print_status "Building application for production..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix build errors before deploying."
    exit 1
fi

print_success "Application built successfully"

# Create production D1 database if it doesn't exist
print_status "Setting up production D1 database..."

# Check if database exists
if ! wrangler d1 info capitao-caverna-images-prod &> /dev/null; then
    print_status "Creating production D1 database..."
    wrangler d1 create capitao-caverna-images-prod
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create production D1 database"
        exit 1
    fi
    
    print_success "Production D1 database created"
else
    print_status "Production D1 database already exists"
fi

# Run database migrations
print_status "Running database migrations..."
wrangler d1 migrations apply capitao-caverna-images-prod --env production

if [ $? -ne 0 ]; then
    print_error "Database migrations failed"
    exit 1
fi

print_success "Database migrations completed"

# Create production R2 bucket if it doesn't exist
print_status "Setting up production R2 bucket..."

if ! wrangler r2 bucket list | grep -q "capitao-caverna-images-prod"; then
    print_status "Creating production R2 bucket..."
    wrangler r2 bucket create capitao-caverna-images-prod
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create production R2 bucket"
        exit 1
    fi
    
    print_success "Production R2 bucket created"
else
    print_status "Production R2 bucket already exists"
fi

# Configure R2 bucket CORS for production
print_status "Configuring R2 bucket CORS..."
cat > /tmp/cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://capitaocaverna.com",
        "https://www.capitaocaverna.com"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

wrangler r2 bucket cors put capitao-caverna-images-prod --file /tmp/cors-config.json

if [ $? -ne 0 ]; then
    print_warning "Failed to configure R2 CORS. You may need to configure this manually."
else
    print_success "R2 bucket CORS configured"
fi

# Clean up temporary file
rm -f /tmp/cors-config.json

# Deploy to production
print_status "Deploying to Cloudflare Workers..."
wrangler deploy --config wrangler.prod.toml --env production

if [ $? -ne 0 ]; then
    print_error "Deployment failed"
    exit 1
fi

print_success "Deployment completed successfully"

# Set up monitoring and health checks
print_status "Setting up monitoring..."

# Create a simple health check endpoint test
WORKER_URL=$(wrangler whoami | grep -o 'https://[^/]*\.workers\.dev' | head -1)
if [ -n "$WORKER_URL" ]; then
    print_status "Testing health check endpoint..."
    if curl -s "$WORKER_URL/health" > /dev/null; then
        print_success "Health check endpoint is responding"
    else
        print_warning "Health check endpoint not responding. This may be normal if the endpoint is not implemented yet."
    fi
fi

# Display post-deployment information
echo ""
echo "🎉 Production Deployment Complete!"
echo "=================================="
echo ""
print_status "Next steps:"
echo "1. Set up your production secrets using 'wrangler secret put'"
echo "   - MIDJOURNEY_API_KEY"
echo "   - DALLE_API_KEY"
echo "   - STABLE_DIFFUSION_API_KEY"
echo "   - OPENAI_API_KEY (if using OpenAI)"
echo ""
echo "2. Configure your custom domain in Cloudflare Dashboard"
echo ""
echo "3. Set up monitoring and alerting in Cloudflare Dashboard"
echo ""
echo "4. Test the production deployment thoroughly"
echo ""
print_warning "Remember to update your DNS settings to point to the new worker!"
echo ""
print_success "Production deployment script completed successfully"