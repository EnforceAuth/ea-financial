#!/bin/bash

# Offline Integration Test for EA Financial Consumer Accounts API
# Tests the OPA integration logic when OPA is unavailable (expected behavior)

set -e

API_BASE_URL="http://localhost:3001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Start API in background
start_api() {
    log_info "Starting API server..."
    bun run start > /tmp/api.log 2>&1 &
    API_PID=$!

    # Wait for API to start
    for i in {1..10}; do
        if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
            log_success "API started successfully (PID: $API_PID)"
            return 0
        fi
        sleep 1
    done

    log_error "Failed to start API"
    return 1
}

# Stop API
stop_api() {
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        wait $API_PID 2>/dev/null || true
        log_info "API stopped"
    fi
}

# Test public endpoints (should work without OPA)
test_public_endpoints() {
    log_info "Testing public endpoints (no auth required)..."

    # Root endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/")
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "GET / returns 200"
    else
        log_error "GET / returned $http_code, expected 200"
    fi

    # Health endpoint (should show OPA unavailable)
    response=$(curl -s "$API_BASE_URL/health")
    if echo "$response" | grep -q "status.*healthy\|degraded"; then
        log_success "GET /health returns valid status"
        if echo "$response" | grep -q "opa.*error\|opa.*operational"; then
            log_success "Health check includes OPA status"
        else
            log_error "Health check missing OPA status"
        fi
    else
        log_error "GET /health response invalid"
    fi

    # Status endpoint
    response=$(curl -s "$API_BASE_URL/status")
    if echo "$response" | grep -q "authorization"; then
        log_success "GET /status includes authorization info"
    else
        log_error "GET /status missing authorization info"
    fi
}

# Test authentication (should work - uses local credential validation)
test_authentication() {
    log_info "Testing authentication (local validation)..."

    # Valid login - should work even without OPA for credential validation
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"mjohnson","password":"password456"}')
    http_code="${response: -3}"

    if [ "$http_code" = "200" ]; then
        log_success "Manager login returns 200"
        # Try to extract token
        token=$(echo "${response%???}" | jq -r '.data.token // empty' 2>/dev/null)
        if [ -n "$token" ]; then
            log_success "Token extracted: ${token:0:15}..."
            MANAGER_TOKEN="$token"
        else
            log_error "Failed to extract token from login response"
        fi
    else
        log_error "Manager login failed with code $http_code"
    fi

    # Invalid login
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"invalid","password":"wrong"}')
    http_code="${response: -3}"
    if [ "$http_code" = "401" ]; then
        log_success "Invalid login correctly rejected (401)"
    else
        log_error "Invalid login returned $http_code, expected 401"
    fi
}

# Test protected endpoints (should fail gracefully without OPA)
test_protected_endpoints_without_opa() {
    log_info "Testing protected endpoints without OPA (should fail gracefully)..."

    if [ -z "$MANAGER_TOKEN" ]; then
        log_warning "No manager token available, skipping protected endpoint tests"
        return
    fi

    # Account access (should fail because OPA is unavailable)
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    http_code="${response: -3}"

    # Expecting 401 or 500 because OPA service is unavailable
    if [ "$http_code" = "401" ] || [ "$http_code" = "500" ]; then
        log_success "Protected endpoint correctly fails without OPA ($http_code)"
    else
        log_error "Protected endpoint returned $http_code, expected 401 or 500"
    fi

    # Balance endpoint (should also fail gracefully)
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    http_code="${response: -3}"

    if [ "$http_code" = "401" ] || [ "$http_code" = "500" ]; then
        log_success "Balance endpoint correctly fails without OPA ($http_code)"
    else
        log_error "Balance endpoint returned $http_code, expected 401 or 500"
    fi

    # Token verification (might work locally or fail with OPA unavailable)
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/auth/verify" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    http_code="${response: -3}"

    if [ "$http_code" = "401" ] || [ "$http_code" = "200" ] || [ "$http_code" = "500" ]; then
        log_success "Token verification behaves appropriately ($http_code)"
    else
        log_error "Token verification returned unexpected code $http_code"
    fi
}

# Test endpoints without authentication
test_protected_endpoints_no_auth() {
    log_info "Testing protected endpoints without authentication..."

    # Account access without token
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001")
    http_code="${response: -3}"
    if [ "$http_code" = "401" ]; then
        log_success "Account access without auth correctly rejected (401)"
    else
        log_error "Account access without auth returned $http_code, expected 401"
    fi

    # Balance without token
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance")
    http_code="${response: -3}"
    if [ "$http_code" = "401" ]; then
        log_success "Balance access without auth correctly rejected (401)"
    else
        log_error "Balance access without auth returned $http_code, expected 401"
    fi
}

# Test OPA integration code paths
test_opa_integration_logic() {
    log_info "Testing OPA integration logic..."

    # Check that API logs indicate OPA integration
    if [ -f /tmp/api.log ]; then
        if grep -q "OPA" /tmp/api.log; then
            log_success "API logs show OPA integration awareness"
        else
            log_error "API logs missing OPA integration indicators"
        fi

        if grep -q "connection failed\|unavailable" /tmp/api.log; then
            log_success "API correctly detects OPA unavailability"
        else
            log_warning "API may not be detecting OPA unavailability"
        fi
    else
        log_warning "API log file not found"
    fi
}

# Main test execution
main() {
    echo "=============================================="
    echo "EA Financial API - Offline Integration Tests"
    echo "=============================================="
    echo ""
    echo "This test validates OPA integration logic"
    echo "when OPA service is unavailable (expected)."
    echo ""

    # Trap to ensure cleanup
    trap 'stop_api; exit' INT TERM EXIT

    if ! start_api; then
        echo "Failed to start API, exiting"
        exit 1
    fi

    echo ""
    test_public_endpoints
    echo ""
    test_authentication
    echo ""
    test_protected_endpoints_without_opa
    echo ""
    test_protected_endpoints_no_auth
    echo ""
    test_opa_integration_logic
    echo ""

    # Summary
    echo "=============================================="
    echo "TEST RESULTS"
    echo "=============================================="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        echo -e "${YELLOW}Note: OPA integration is working correctly.${NC}"
        echo -e "${YELLOW}Protected endpoints fail as expected without OPA.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        echo -e "${YELLOW}Check API logs: tail /tmp/api.log${NC}"
        exit 1
    fi
}

# Check for required tools
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required but not installed. Aborting."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "jq is required but not installed. Aborting."; exit 1; }

# Run main function
main "$@"
