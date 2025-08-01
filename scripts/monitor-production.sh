#!/bin/bash

# Capitão Caverna Image Engine - Production Monitoring Script
# This script performs automated health checks and monitoring

set -e

echo "🔍 Capitão Caverna Image Engine - Production Monitoring"
echo "====================================================="

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

# Configuration
WORKER_URL="${WORKER_URL:-https://capitao-caverna-image-engine-prod.workers.dev}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
LOG_FILE="/tmp/monitoring-$(date +%Y%m%d-%H%M%S).log"

# Health check thresholds
MAX_RESPONSE_TIME=5000  # 5 seconds
MIN_SUCCESS_RATE=95     # 95%
MAX_ERROR_RATE=5        # 5%

# Function to send alerts
send_alert() {
    local severity=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[$timestamp] ALERT [$severity]: $message" >> "$LOG_FILE"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"severity\": \"$severity\",
                \"message\": \"$message\",
                \"timestamp\": \"$timestamp\",
                \"service\": \"capitao-caverna-image-engine\"
            }" || echo "Failed to send webhook alert"
    fi
    
    # Also log to console
    case $severity in
        "CRITICAL") print_error "$message" ;;
        "WARNING") print_warning "$message" ;;
        "INFO") print_status "$message" ;;
    esac
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-10}
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}|%{time_total}" -m "$timeout" "$url" 2>/dev/null || echo "000|0")
    local end_time=$(date +%s%3N)
    
    local status_code=$(echo "$response" | cut -d'|' -f1)
    local response_time=$(echo "$response" | cut -d'|' -f2)
    local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
    
    echo "$status_code|$response_time_ms"
}

# Function to parse JSON (simple extraction)
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":[^,}]*" | cut -d':' -f2 | tr -d '"' | tr -d ' '
}

print_status "Starting production monitoring checks..."

# 1. Health Check
print_status "Checking system health..."
health_result=$(check_endpoint "$WORKER_URL/health" 200 10)
health_status=$(echo "$health_result" | cut -d'|' -f1)
health_time=$(echo "$health_result" | cut -d'|' -f2)

if [ "$health_status" = "200" ]; then
    print_success "Health check passed (${health_time}ms)"
    
    # Get detailed health info
    health_response=$(curl -s "$WORKER_URL/health" 2>/dev/null || echo "{}")
    overall_status=$(extract_json_value "$health_response" "status")
    
    if [ "$overall_status" = "unhealthy" ]; then
        send_alert "CRITICAL" "System health check reports unhealthy status"
    elif [ "$overall_status" = "degraded" ]; then
        send_alert "WARNING" "System health check reports degraded status"
    fi
    
    # Check response time
    if (( $(echo "$health_time > $MAX_RESPONSE_TIME" | bc -l) )); then
        send_alert "WARNING" "Health check response time is high: ${health_time}ms"
    fi
else
    send_alert "CRITICAL" "Health check failed with status: $health_status"
fi

# 2. Metrics Check
print_status "Checking system metrics..."
metrics_result=$(check_endpoint "$WORKER_URL/metrics" 200 10)
metrics_status=$(echo "$metrics_result" | cut -d'|' -f1)

if [ "$metrics_status" = "200" ]; then
    print_success "Metrics endpoint accessible"
    
    # Get metrics data
    metrics_response=$(curl -s "$WORKER_URL/metrics" 2>/dev/null || echo "{}")
    
    # Extract key metrics (simplified - in production you'd use jq)
    total_requests=$(extract_json_value "$metrics_response" "total")
    failed_requests=$(extract_json_value "$metrics_response" "failed")
    
    if [ -n "$total_requests" ] && [ -n "$failed_requests" ] && [ "$total_requests" -gt 0 ]; then
        error_rate=$(echo "scale=2; $failed_requests * 100 / $total_requests" | bc -l)
        
        if (( $(echo "$error_rate > $MAX_ERROR_RATE" | bc -l) )); then
            send_alert "WARNING" "Error rate is high: ${error_rate}%"
        fi
    fi
else
    send_alert "WARNING" "Metrics endpoint failed with status: $metrics_status"
fi

# 3. Database Connectivity Check
print_status "Checking database connectivity..."
# This is done through the health check, but we can do additional checks
db_test_result=$(check_endpoint "$WORKER_URL/health" 200 15)
db_status=$(echo "$db_test_result" | cut -d'|' -f1)

if [ "$db_status" != "200" ]; then
    send_alert "CRITICAL" "Database connectivity check failed"
fi

# 4. Security Monitoring (if admin token available)
if [ -n "$ADMIN_TOKEN" ]; then
    print_status "Checking security status..."
    
    security_result=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$WORKER_URL/api/v1/admin/security/report" 2>/dev/null || echo "{}")
    
    # Check for high-risk security events
    blocked_requests=$(extract_json_value "$security_result" "blockedRequests")
    failed_auth=$(extract_json_value "$security_result" "failedAuthentications")
    content_violations=$(extract_json_value "$security_result" "contentViolations")
    
    if [ -n "$blocked_requests" ] && [ "$blocked_requests" -gt 50 ]; then
        send_alert "WARNING" "High number of blocked requests: $blocked_requests"
    fi
    
    if [ -n "$failed_auth" ] && [ "$failed_auth" -gt 20 ]; then
        send_alert "WARNING" "High number of failed authentications: $failed_auth"
    fi
    
    if [ -n "$content_violations" ] && [ "$content_violations" -gt 10 ]; then
        send_alert "WARNING" "High number of content violations: $content_violations"
    fi
else
    print_warning "Admin token not provided, skipping security checks"
fi

# 5. External Service Check (simplified)
print_status "Checking external service configuration..."
# We can't directly test external services, but we can check if they're configured
# This would be done through the health check endpoint

# 6. Storage Check
print_status "Checking storage accessibility..."
# This is also done through the health check endpoint

# 7. Performance Benchmarking
print_status "Running performance benchmark..."
benchmark_start=$(date +%s%3N)

# Make a few test requests to measure performance
total_time=0
successful_requests=0
failed_requests=0

for i in {1..5}; do
    test_result=$(check_endpoint "$WORKER_URL/health" 200 5)
    test_status=$(echo "$test_result" | cut -d'|' -f1)
    test_time=$(echo "$test_result" | cut -d'|' -f2)
    
    if [ "$test_status" = "200" ]; then
        successful_requests=$((successful_requests + 1))
        total_time=$(echo "$total_time + $test_time" | bc -l)
    else
        failed_requests=$((failed_requests + 1))
    fi
    
    sleep 1
done

if [ $successful_requests -gt 0 ]; then
    avg_response_time=$(echo "scale=2; $total_time / $successful_requests" | bc -l)
    success_rate=$(echo "scale=2; $successful_requests * 100 / 5" | bc -l)
    
    print_success "Performance benchmark completed:"
    echo "  - Average response time: ${avg_response_time}ms"
    echo "  - Success rate: ${success_rate}%"
    
    if (( $(echo "$avg_response_time > $MAX_RESPONSE_TIME" | bc -l) )); then
        send_alert "WARNING" "Average response time is high: ${avg_response_time}ms"
    fi
    
    if (( $(echo "$success_rate < $MIN_SUCCESS_RATE" | bc -l) )); then
        send_alert "CRITICAL" "Success rate is low: ${success_rate}%"
    fi
else
    send_alert "CRITICAL" "All benchmark requests failed"
fi

# 8. Generate Summary Report
print_status "Generating monitoring summary..."

cat > "/tmp/monitoring-summary-$(date +%Y%m%d-%H%M%S).json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "service": "capitao-caverna-image-engine",
  "environment": "production",
  "checks": {
    "health": {
      "status": "$health_status",
      "responseTime": $health_time
    },
    "metrics": {
      "status": "$metrics_status"
    },
    "performance": {
      "averageResponseTime": ${avg_response_time:-0},
      "successRate": ${success_rate:-0}
    }
  },
  "alerts": $(grep -c "ALERT" "$LOG_FILE" 2>/dev/null || echo "0")
}
EOF

# 9. Cleanup and Final Status
alert_count=$(grep -c "ALERT" "$LOG_FILE" 2>/dev/null || echo "0")

echo ""
print_status "Monitoring completed!"
echo "===================="
echo "- Health checks: $([ "$health_status" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "- Metrics: $([ "$metrics_status" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "- Performance: $([ "$successful_requests" -gt 3 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "- Alerts generated: $alert_count"
echo "- Log file: $LOG_FILE"

if [ "$alert_count" -gt 0 ]; then
    print_warning "Monitoring detected $alert_count issues. Check the log file for details."
    exit 1
else
    print_success "All monitoring checks passed successfully!"
    exit 0
fi