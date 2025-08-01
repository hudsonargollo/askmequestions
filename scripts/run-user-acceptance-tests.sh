#!/bin/bash

# User Acceptance Testing Runner for Capitão Caverna Image Engine
# This script runs comprehensive UAT tests and generates detailed reports

set -e

echo "🧪 Starting User Acceptance Testing for Capitão Caverna Image Engine"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create test results directory
RESULTS_DIR="test-results/uat"
mkdir -p "$RESULTS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/uat_report_$TIMESTAMP.json"
LOG_FILE="$RESULTS_DIR/uat_log_$TIMESTAMP.log"

echo "📁 Test results will be saved to: $RESULTS_DIR"
echo "📊 Report file: $REPORT_FILE"
echo "📝 Log file: $LOG_FILE"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to run test suite with metrics
run_test_suite() {
    local test_name="$1"
    local test_pattern="$2"
    local start_time=$(date +%s)
    
    log "🚀 Running $test_name tests..."
    
    # Run the specific test pattern
    if npm run test -- --run --reporter=json --outputFile="$RESULTS_DIR/${test_name}_results.json" "$test_pattern" 2>&1 | tee -a "$LOG_FILE"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ $test_name tests completed successfully in ${duration}s${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ $test_name tests failed after ${duration}s${NC}"
        return 1
    fi
}

# Initialize test results
cat > "$REPORT_FILE" << EOF
{
  "testRun": {
    "timestamp": "$TIMESTAMP",
    "startTime": "$(date -Iseconds)",
    "environment": "$(node --version)",
    "testSuites": []
  }
}
EOF

log "🔧 Setting up test environment..."

# Ensure dependencies are installed
if ! npm list vitest >/dev/null 2>&1; then
    log "📦 Installing test dependencies..."
    npm install
fi

# Start test execution
log "🎯 Beginning User Acceptance Test execution..."

# Test Suite 1: Complete User Workflows
echo -e "${BLUE}📋 Test Suite 1: Complete User Workflows${NC}"
if run_test_suite "user_workflows" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Complete User Workflows'"; then
    WORKFLOW_TESTS_PASSED=true
else
    WORKFLOW_TESTS_PASSED=false
fi

# Test Suite 2: Error Handling and User Feedback
echo -e "${BLUE}📋 Test Suite 2: Error Handling and User Feedback${NC}"
if run_test_suite "error_handling" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Error Handling and User Feedback'"; then
    ERROR_TESTS_PASSED=true
else
    ERROR_TESTS_PASSED=false
fi

# Test Suite 3: Performance Under Realistic Usage
echo -e "${BLUE}📋 Test Suite 3: Performance Under Realistic Usage${NC}"
if run_test_suite "performance" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Performance Under Realistic Usage'"; then
    PERFORMANCE_TESTS_PASSED=true
else
    PERFORMANCE_TESTS_PASSED=false
fi

# Test Suite 4: Image Quality and System Usability
echo -e "${BLUE}📋 Test Suite 4: Image Quality and System Usability${NC}"
if run_test_suite "usability" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Image Quality and System Usability'"; then
    USABILITY_TESTS_PASSED=true
else
    USABILITY_TESTS_PASSED=false
fi

# Test Suite 5: Authentication and Authorization
echo -e "${BLUE}📋 Test Suite 5: Authentication and Authorization${NC}"
if run_test_suite "auth" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Authentication and Authorization'"; then
    AUTH_TESTS_PASSED=true
else
    AUTH_TESTS_PASSED=false
fi

# Test Suite 6: Navigation and User Experience
echo -e "${BLUE}📋 Test Suite 6: Navigation and User Experience${NC}"
if run_test_suite "navigation" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Navigation and User Experience'"; then
    NAV_TESTS_PASSED=true
else
    NAV_TESTS_PASSED=false
fi

# Test Suite 7: Responsive Design and Accessibility
echo -e "${BLUE}📋 Test Suite 7: Responsive Design and Accessibility${NC}"
if run_test_suite "accessibility" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'Responsive Design and Accessibility'"; then
    A11Y_TESTS_PASSED=true
else
    A11Y_TESTS_PASSED=false
fi

# Performance Benchmarks
echo -e "${BLUE}📋 Performance Benchmarks${NC}"
if run_test_suite "benchmarks" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'UAT Performance Benchmarks'"; then
    BENCHMARK_TESTS_PASSED=true
else
    BENCHMARK_TESTS_PASSED=false
fi

# Error Recovery and Resilience
echo -e "${BLUE}📋 Error Recovery and Resilience${NC}"
if run_test_suite "resilience" "src/shared/__tests__/userAcceptanceTesting.test.ts -t 'UAT Error Recovery and Resilience'"; then
    RESILIENCE_TESTS_PASSED=true
else
    RESILIENCE_TESTS_PASSED=false
fi

# Generate comprehensive report
log "📊 Generating comprehensive test report..."

END_TIME=$(date -Iseconds)
TOTAL_DURATION=$(($(date +%s) - $(date -d "$TIMESTAMP" +%s 2>/dev/null || date -j -f "%Y%m%d_%H%M%S" "$TIMESTAMP" +%s)))

# Count passed/failed tests
PASSED_SUITES=0
TOTAL_SUITES=9

for test_result in "$WORKFLOW_TESTS_PASSED" "$ERROR_TESTS_PASSED" "$PERFORMANCE_TESTS_PASSED" "$USABILITY_TESTS_PASSED" "$AUTH_TESTS_PASSED" "$NAV_TESTS_PASSED" "$A11Y_TESTS_PASSED" "$BENCHMARK_TESTS_PASSED" "$RESILIENCE_TESTS_PASSED"; do
    if [ "$test_result" = "true" ]; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
    fi
done

FAILED_SUITES=$((TOTAL_SUITES - PASSED_SUITES))

# Create final report
cat > "$REPORT_FILE" << EOF
{
  "testRun": {
    "timestamp": "$TIMESTAMP",
    "startTime": "$(date -d "$TIMESTAMP" -Iseconds 2>/dev/null || date -j -f "%Y%m%d_%H%M%S" "$TIMESTAMP" -Iseconds)",
    "endTime": "$END_TIME",
    "duration": ${TOTAL_DURATION},
    "environment": {
      "nodeVersion": "$(node --version)",
      "npmVersion": "$(npm --version)",
      "platform": "$(uname -s)",
      "architecture": "$(uname -m)"
    }
  },
  "summary": {
    "totalSuites": $TOTAL_SUITES,
    "passedSuites": $PASSED_SUITES,
    "failedSuites": $FAILED_SUITES,
    "successRate": $(echo "scale=2; $PASSED_SUITES * 100 / $TOTAL_SUITES" | bc -l 2>/dev/null || echo "0")
  },
  "testSuites": [
    {
      "name": "Complete User Workflows",
      "status": "$([ "$WORKFLOW_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Tests complete user workflows from selection to image delivery",
      "requirements": ["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "4.1-4.6", "7.1", "7.2", "9.1-9.4"]
    },
    {
      "name": "Error Handling and User Feedback",
      "status": "$([ "$ERROR_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Validates error handling and user feedback mechanisms",
      "requirements": ["1.2", "1.3", "2.2", "3.3", "10.1-10.4"]
    },
    {
      "name": "Performance Under Realistic Usage",
      "status": "$([ "$PERFORMANCE_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Tests performance under realistic usage patterns",
      "requirements": ["6.1-6.4", "7.3"]
    },
    {
      "name": "Image Quality and System Usability",
      "status": "$([ "$USABILITY_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Validates image quality and overall system usability",
      "requirements": ["5.1-5.4", "8.1-8.4", "9.1-9.4"]
    },
    {
      "name": "Authentication and Authorization",
      "status": "$([ "$AUTH_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Tests authentication and authorization mechanisms",
      "requirements": ["4.1", "10.1", "10.2"]
    },
    {
      "name": "Navigation and User Experience",
      "status": "$([ "$NAV_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Validates navigation and overall user experience",
      "requirements": ["3.1-3.4", "5.3", "5.4"]
    },
    {
      "name": "Responsive Design and Accessibility",
      "status": "$([ "$A11Y_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Tests responsive design and accessibility compliance",
      "requirements": ["3.1-3.4"]
    },
    {
      "name": "Performance Benchmarks",
      "status": "$([ "$BENCHMARK_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Validates performance benchmarks for critical user paths",
      "requirements": ["6.1-6.4"]
    },
    {
      "name": "Error Recovery and Resilience",
      "status": "$([ "$RESILIENCE_TESTS_PASSED" = "true" ] && echo "PASSED" || echo "FAILED")",
      "description": "Tests system resilience and error recovery mechanisms",
      "requirements": ["10.1-10.4"]
    }
  ],
  "recommendations": [
    $([ "$WORKFLOW_TESTS_PASSED" = "false" ] && echo '"Fix critical user workflow issues before production deployment",' || echo "")
    $([ "$ERROR_TESTS_PASSED" = "false" ] && echo '"Improve error handling and user feedback mechanisms",' || echo "")
    $([ "$PERFORMANCE_TESTS_PASSED" = "false" ] && echo '"Optimize performance for realistic usage patterns",' || echo "")
    $([ "$USABILITY_TESTS_PASSED" = "false" ] && echo '"Address usability issues and image quality concerns",' || echo "")
    $([ "$AUTH_TESTS_PASSED" = "false" ] && echo '"Fix authentication and authorization issues",' || echo "")
    $([ "$NAV_TESTS_PASSED" = "false" ] && echo '"Improve navigation and user experience",' || echo "")
    $([ "$A11Y_TESTS_PASSED" = "false" ] && echo '"Address accessibility and responsive design issues",' || echo "")
    $([ "$BENCHMARK_TESTS_PASSED" = "false" ] && echo '"Optimize performance to meet benchmark requirements",' || echo "")
    $([ "$RESILIENCE_TESTS_PASSED" = "false" ] && echo '"Improve system resilience and error recovery",' || echo "")
    "Continue monitoring user feedback and system performance in production"
  ]
}
EOF

# Display final results
echo ""
echo "=================================================================="
echo -e "${BLUE}🎯 USER ACCEPTANCE TESTING RESULTS${NC}"
echo "=================================================================="
echo ""
echo -e "📊 ${BLUE}Test Summary:${NC}"
echo -e "   Total Test Suites: $TOTAL_SUITES"
echo -e "   Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "   Failed: ${RED}$FAILED_SUITES${NC}"
echo -e "   Success Rate: $(echo "scale=1; $PASSED_SUITES * 100 / $TOTAL_SUITES" | bc -l 2>/dev/null || echo "0")%"
echo ""

echo -e "⏱️  ${BLUE}Execution Time:${NC} ${TOTAL_DURATION}s"
echo ""

echo -e "📋 ${BLUE}Test Suite Results:${NC}"
echo -e "   1. Complete User Workflows: $([ "$WORKFLOW_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   2. Error Handling: $([ "$ERROR_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   3. Performance: $([ "$PERFORMANCE_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   4. Usability: $([ "$USABILITY_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   5. Authentication: $([ "$AUTH_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   6. Navigation: $([ "$NAV_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   7. Accessibility: $([ "$A11Y_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   8. Benchmarks: $([ "$BENCHMARK_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo -e "   9. Resilience: $([ "$RESILIENCE_TESTS_PASSED" = "true" ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo ""

echo -e "📁 ${BLUE}Generated Files:${NC}"
echo -e "   📊 Detailed Report: $REPORT_FILE"
echo -e "   📝 Execution Log: $LOG_FILE"
echo ""

# Final status
if [ "$FAILED_SUITES" -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL USER ACCEPTANCE TESTS PASSED!${NC}"
    echo -e "${GREEN}✅ System is ready for production deployment${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the results before deployment.${NC}"
    echo -e "${RED}❌ $FAILED_SUITES out of $TOTAL_SUITES test suites failed${NC}"
    exit 1
fi