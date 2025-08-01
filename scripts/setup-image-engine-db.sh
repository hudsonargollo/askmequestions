#!/bin/bash

# Capitão Caverna Image Engine Database Setup Script
# This script creates the D1 database and R2 bucket for the image engine

set -e

echo "🏗️  Setting up Capitão Caverna Image Engine infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "You are not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

print_status "Creating D1 database for image engine..."

# Create D1 database
DB_OUTPUT=$(wrangler d1 create capitao-caverna-images-db 2>&1)
if [[ $? -eq 0 ]]; then
    print_status "D1 database created successfully"
    echo "$DB_OUTPUT"
    
    # Extract database ID from output
    DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
    if [[ -n "$DB_ID" ]]; then
        print_status "Database ID: $DB_ID"
        print_warning "Please update wrangler.toml with this database ID if different from current configuration"
    fi
else
    print_warning "Database might already exist or there was an error:"
    echo "$DB_OUTPUT"
fi

print_status "Creating R2 bucket for image storage..."

# Create R2 bucket
BUCKET_OUTPUT=$(wrangler r2 bucket create capitao-caverna-images 2>&1)
if [[ $? -eq 0 ]]; then
    print_status "R2 bucket created successfully"
    echo "$BUCKET_OUTPUT"
else
    print_warning "Bucket might already exist or there was an error:"
    echo "$BUCKET_OUTPUT"
fi

print_status "Running database migrations..."

# Run migrations
if [[ -f "migrations/3.sql" ]]; then
    wrangler d1 execute capitao-caverna-images-db --file=migrations/3.sql
    print_status "Database migration completed"
else
    print_error "Migration file migrations/3.sql not found"
    exit 1
fi

print_status "Setting up R2 CORS configuration..."

# Create temporary CORS file
cat > /tmp/cors.json << 'EOF'
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

# Apply CORS configuration
if wrangler r2 bucket cors put capitao-caverna-images --file /tmp/cors.json; then
    print_status "CORS configuration applied successfully"
else
    print_warning "Failed to apply CORS configuration. You may need to set it up manually."
fi

# Clean up temporary file
rm -f /tmp/cors.json

echo ""
print_status "🎉 Capitão Caverna Image Engine infrastructure setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your environment variables with API keys for external AI services"
echo "2. Deploy your worker: npm run deploy"
echo "3. Test the image generation endpoints"
echo ""
print_warning "Remember to update CORS origins in production to match your domain!"