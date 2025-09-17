#!/bin/bash

# Test script for OPA integration with EA Financial Consumer Accounts API
# This script tests the OPA-integrated API endpoints

set -e

API_BASE_URL="http://localhost:3001"
OPA_URL="http://localhost:8181"

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

# Check if services are running
check_services() {
    log_info "Checking service availability..."

    # Check API
    if curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
        log_success "API service is running"
    else
        log_error "API service is not available at $API_BASE_URL"
        exit 1
    fi

    # Check OPA
    if curl -s "$OPA_URL/health" >/dev/null 2>&1; then
        log_success "OPA service is running"
        OPA_AVAILABLE=true
    else
        log_warning "OPA service is not available at $OPA_URL"
        log_warning "Some tests will fail as expected"
        OPA_AVAILABLE=false
    fi
}

# Test public endpoints (should work without auth)
test_public_endpoints() {
    log_info "Testing public endpoints..."

    # Root endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/")
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "GET / returns 200"
    else
        log_error "GET / returned $http_code, expected 200"
    fi

    # Health endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/health")
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "GET /health returns 200"
    else
        log_error "GET /health returned $http_code, expected 200"
    fi

    # Status endpoint
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/status")
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "GET /status returns 200"
    else
        log_error "GET /status returned $http_code, expected 200"
    fi
}

# Test authentication
test_authentication() {
    log_info "Testing authentication..."

    # Valid login - Manager
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"mjohnson","password":"password456"}')
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "Manager login successful"
        # Extract token for further tests
        MANAGER_TOKEN=$(echo "${response%???}" | jq -r '.data.token // empty')
        if [ -n "$MANAGER_TOKEN" ]; then
            log_success "Manager token extracted: ${MANAGER_TOKEN:0:20}..."
        else
            log_error "Failed to extract manager token"
        fi
    else
        log_error "Manager login failed with code $http_code"
    fi

    # Valid login - Senior Rep
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"jsmith","password":"password123"}')
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "Senior Rep login successful"
        SENIOR_REP_TOKEN=$(echo "${response%???}" | jq -r '.data.token // empty')
        if [ -n "$SENIOR_REP_TOKEN" ]; then
            log_success "Senior Rep token extracted: ${SENIOR_REP_TOKEN:0:20}..."
        fi
    else
        log_error "Senior Rep login failed with code $http_code"
    fi

    # Valid login - Regular Rep
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"rbrown","password":"password789"}')
    http_code="${response: -3}"
    if [ "$http_code" = "200" ]; then
        log_success "Regular Rep login successful"
        REGULAR_REP_TOKEN=$(echo "${response%???}" | jq -r '.data.token // empty')
    else
        log_error "Regular Rep login failed with code $http_code"
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

    # Inactive user login
    response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"slee","password":"password000"}')
    http_code="${response: -3}"
    if [ "$http_code" = "401" ]; then
        log_success "Inactive user login correctly rejected (401)"
    else
        log_error "Inactive user login returned $http_code, expected 401"
    fi
}

# Test authorization with OPA
test_authorization() {
    log_info "Testing OPA authorization..."

    if [ "$OPA_AVAILABLE" = false ]; then
        log_warning "Skipping OPA authorization tests - OPA not available"
        return
    fi

    if [ -z "$MANAGER_TOKEN" ]; then
        log_warning "No manager token available, skipping manager authorization tests"
    else
        # Test manager access to accounts
        response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001" \
            -H "Authorization: Bearer $MANAGER_TOKEN")
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Manager can access account details"
        else
            log_error "Manager account access failed with code $http_code"
        fi

        # Test manager access to balance
        response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance" \
            -H "Authorization: Bearer $MANAGER_TOKEN")
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Manager can access account balance"
        else
            log_error "Manager balance access failed with code $http_code"
        fi

        # Test manager access to transactions
        response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/transactions" \
            -H "Authorization: Bearer $MANAGER_TOKEN")
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Manager can access transaction history"
        else
            log_error "Manager transaction access failed with code $http_code"
        fi
    fi

    if [ -z "$SENIOR_REP_TOKEN" ]; then
        log_warning "No senior rep token available, skipping senior rep authorization tests"
    else
        # Test senior rep access
        response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance" \
            -H "Authorization: Bearer $SENIOR_REP_TOKEN")
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Senior Rep can access account balance"
        else
            log_error "Senior Rep balance access failed with code $http_code"
        fi

        # Test debit operation
        response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/accounts/ACC001/debit" \
            -H "Authorization: Bearer $SENIOR_REP_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"amount":10.00,"description":"Test debit"}')
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Senior Rep can perform debit operations"
        else
            log_error "Senior Rep debit operation failed with code $http_code"
        fi
    fi

    if [ -z "$REGULAR_REP_TOKEN" ]; then
        log_warning "No regular rep token available, skipping regular rep authorization tests"
    else
        # Test regular rep limited access
        response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance" \
            -H "Authorization: Bearer $REGULAR_REP_TOKEN")
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "Regular Rep can access account balance"
        else
            log_error "Regular Rep balance access failed with code $http_code"
        fi

        # Test that regular rep cannot perform debit (should be denied by OPA)
        response=$(curl -s -w "%{http_code}" -X POST "$API_BASE_URL/accounts/ACC001/debit" \
            -H "Authorization: Bearer $REGULAR_REP_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"amount":10.00,"description":"Test debit"}')
        http_code="${response: -3}"
        if [ "$http_code" = "403" ]; then
            log_success "Regular Rep correctly denied debit operations (403)"
        else
            log_error "Regular Rep debit returned $http_code, expected 403"
        fi
    fi
}

# Test protected endpoints without auth
test_protected_endpoints_no_auth() {
    log_info "Testing protected endpoints without authentication..."

    # Account details without auth
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001")
    http_code="${response: -3}"
    expected_code="401"
    if [ "$OPA_AVAILABLE" = false ]; then
        expected_code="401"  # Should still fail due to missing auth
    fi

    if [ "$http_code" = "$expected_code" ]; then
        log_success "Account access without auth correctly rejected ($expected_code)"
    else
        log_error "Account access without auth returned $http_code, expected $expected_code"
    fi

    # Balance without auth
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/balance")
    http_code="${response: -3}"
    if [ "$http_code" = "$expected_code" ]; then
        log_success "Balance access without auth correctly rejected ($expected_code)"
    else
        log_error "Balance access without auth returned $http_code, expected $expected_code"
    fi

    # Transaction history without auth
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/accounts/ACC001/transactions")
    http_code="${response: -3}"
    if [ "$http_code" = "$expected_code" ]; then
        log_success "Transaction access without auth correctly rejected ($expected_code)"
    else
        log_error "Transaction access without auth returned $http_code, expected $expected_code"
    fi
}

# Test terms endpoints
test_terms_endpoints() {
    log_info "Testing terms endpoints..."

    if [ -z "$MANAGER_TOKEN" ]; then
        log_warning "No manager token available, skipping terms tests"
        return
    fi

    # General terms
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/terms/general" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    http_code="${response: -3}"
    expected_code="200"
    if [ "$OPA_AVAILABLE" = false ]; then
        expected_code="401"  # OPA will deny if not available
    fi

    if [ "$http_code" = "$expected_code" ]; then
        log_success "Terms access with auth works as expected ($expected_code)"
    else
        log_error "Terms access returned $http_code, expected $expected_code"
    fi
}

# Test token verification
test_token_verification() {
    log_info "Testing token verification..."

    if [ -z "$MANAGER_TOKEN" ]; then
        log_warning "No manager token available, skipping token verification tests"
        return
    fi

    # Valid token verification
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/auth/verify" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    http_code="${response: -3}"
    expected_code="200"
    if [ "$OPA_AVAILABLE" = false ]; then
        expected_code="401"  # Will fail without OPA
    fi

    if [ "$http_code" = "$expected_code" ]; then
        log_success "Token verification works as expected ($expected_code)"
    else
        log_error "Token verification returned $http_code, expected $expected_code"
    fi

    # Invalid token verification
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/auth/verify" \
        -H "Authorization: Bearer invalid_token")
    http_code="${response: -3}"
    if [ "$http_code" = "401" ]; then
        log_success "Invalid token correctly rejected (401)"
    else
        log_error "Invalid token returned $http_code, expected 401"
    fi
}

# Main test execution
main() {
    echo "==========================================="
    echo "EA Financial API - OPA Integration Tests"
    echo "==========================================="
    echo ""

    check_services
    echo ""

    test_public_endpoints
    echo ""

    test_authentication
    echo ""

    test_protected_endpoints_no_auth
    echo ""

    test_authorization
    echo ""

    test_terms_endpoints
    echo ""

    test_token_verification
    echo ""

    # Summary
    echo "==========================================="
    echo "TEST RESULTS"
    echo "==========================================="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        if [ "$OPA_AVAILABLE" = false ]; then
            echo -e "${YELLOW}Note: Some failures expected due to OPA not being available${NC}"
        fi
        exit 1
    fi
}

# Check for required tools
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required but not installed. Aborting."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "jq is required but not installed. Aborting."; exit 1; }

# Run main function
main "$@"
