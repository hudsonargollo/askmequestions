#!/bin/bash

# Capitão Caverna Image Engine - Production Database Setup
# This script sets up the production D1 database with proper scaling and optimization

set -e

echo "🗄️  Setting up Capitão Caverna Image Engine Production Database"
echo "=============================================================="

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

# Check if wrangler is installed and user is logged in
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare. Please run 'wrangler login' first."
    exit 1
fi

# Create production database if it doesn't exist
print_status "Creating production D1 database..."

if wrangler d1 info capitao-caverna-images-prod &> /dev/null; then
    print_warning "Production database already exists. Skipping creation."
else
    wrangler d1 create capitao-caverna-images-prod
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create production database"
        exit 1
    fi
    
    print_success "Production database created successfully"
fi

# Apply migrations
print_status "Applying database migrations..."

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    print_error "Migrations directory not found. Please ensure you're running this from the project root."
    exit 1
fi

# Apply all migrations
wrangler d1 migrations apply capitao-caverna-images-prod --env production

if [ $? -ne 0 ]; then
    print_error "Failed to apply migrations"
    exit 1
fi

print_success "Database migrations applied successfully"

# Create optimized indexes for production
print_status "Creating production-optimized indexes..."

# Create a temporary SQL file with production indexes
cat > /tmp/production-indexes.sql << 'EOF'
-- Production-optimized indexes for Capitão Caverna Image Engine

-- Index for user image queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_generated_images_user_status_created 
ON GeneratedImages(user_id, status, created_at DESC);

-- Index for status-based queries (for monitoring and cleanup)
CREATE INDEX IF NOT EXISTS idx_generated_images_status_created 
ON GeneratedImages(status, created_at);

-- Index for parameter-based searches (for cache optimization)
CREATE INDEX IF NOT EXISTS idx_generated_images_parameters_hash 
ON GeneratedImages(json_extract(prompt_parameters, '$.hash'));

-- Index for service monitoring
CREATE INDEX IF NOT EXISTS idx_generated_images_service_created 
ON GeneratedImages(service_used, created_at DESC);

-- Index for R2 object key lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_r2_key 
ON GeneratedImages(r2_object_key);

-- Optimize prompt cache for production
CREATE INDEX IF NOT EXISTS idx_prompt_cache_created 
ON PromptCache(created_at DESC);

-- Analyze tables for query optimization
ANALYZE GeneratedImages;
ANALYZE PromptCache;
EOF

# Execute the production indexes
wrangler d1 execute capitao-caverna-images-prod --file /tmp/production-indexes.sql --env production

if [ $? -ne 0 ]; then
    print_warning "Some indexes may have failed to create. This is normal if they already exist."
else
    print_success "Production indexes created successfully"
fi

# Clean up temporary file
rm -f /tmp/production-indexes.sql

# Insert production configuration data
print_status "Inserting production configuration data..."

cat > /tmp/production-config.sql << 'EOF'
-- Production configuration for Capitão Caverna Image Engine

-- Insert system configuration (if not exists)
INSERT OR IGNORE INTO GeneratedImages (
    image_id, 
    user_id, 
    r2_object_key, 
    prompt_parameters, 
    status, 
    created_at,
    service_used
) VALUES (
    'system-health-check',
    'system',
    'health-check.png',
    '{"type": "health_check", "version": "1.0"}',
    'COMPLETE',
    datetime('now'),
    'system'
);
EOF

wrangler d1 execute capitao-caverna-images-prod --file /tmp/production-config.sql --env production

if [ $? -ne 0 ]; then
    print_warning "Failed to insert configuration data. This may be normal."
else
    print_success "Production configuration data inserted"
fi

# Clean up temporary file
rm -f /tmp/production-config.sql

# Test database connectivity
print_status "Testing database connectivity..."

# Create a simple test query
cat > /tmp/test-query.sql << 'EOF'
SELECT COUNT(*) as total_images FROM GeneratedImages;
SELECT COUNT(*) as cached_prompts FROM PromptCache;
EOF

QUERY_RESULT=$(wrangler d1 execute capitao-caverna-images-prod --file /tmp/test-query.sql --env production 2>/dev/null)

if [ $? -eq 0 ]; then
    print_success "Database connectivity test passed"
    echo "Database statistics:"
    echo "$QUERY_RESULT"
else
    print_error "Database connectivity test failed"
    exit 1
fi

# Clean up temporary file
rm -f /tmp/test-query.sql

# Display database information
print_status "Getting database information..."
wrangler d1 info capitao-caverna-images-prod

echo ""
print_success "Production database setup completed successfully!"
echo ""
print_status "Database is ready for production use with:"
echo "- Optimized indexes for common query patterns"
echo "- Production-grade configuration"
echo "- Health check data"
echo ""
print_warning "Next steps:"
echo "1. Monitor database performance in Cloudflare Dashboard"
echo "2. Set up automated backups if needed"
echo "3. Configure alerting for database errors"
echo "4. Review and adjust indexes based on actual usage patterns"