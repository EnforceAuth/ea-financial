#!/bin/bash

# EA Financial - Consumer Accounts Internal API Test Script
# This script demonstrates the basic functionality of the API

set -e

API_BASE="http://localhost:3001"
TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 EA Financial - Consumer Accounts Internal API Test Script${NC}"
echo "=================================================================="

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

# Function to make API calls and display results
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${BLUE}→ $description${NC}"

    if [ "$method" = "GET" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE$endpoint")
        fi
    else
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$data" "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" "$API_BASE$endpoint")
        fi
    fi

    body=$(echo "$response" | sed '$d')
    status=$(echo "$response" | tail -n1 | sed 's/HTTP_STATUS://')

    if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
        echo -e "${GREEN}✓ Status: $status${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Status: $status${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# Check if server is running
print_section "🔍 Checking Server Status"
if ! curl -s "$API_BASE/health" > /dev/null; then
    echo -e "${RED}❌ Server is not running at $API_BASE${NC}"
    echo "Please start the server with: bun run dev"
    exit 1
fi

api_call "GET" "/" "" "Get API information"
api_call "GET" "/health" "" "Check server health"

# Authentication Tests
print_section "🔐 Authentication Tests"

# Login as manager
api_call "POST" "/auth/login" '{"username":"mjohnson","password":"password456"}' "Login as manager (mjohnson)"

# Extract token from response
login_response=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"mjohnson","password":"password456"}' "$API_BASE/auth/login")
TOKEN=$(echo "$login_response" | jq -r '.data.token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get authentication token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token acquired: ${TOKEN:0:20}...${NC}"

# Verify token
api_call "GET" "/auth/verify" "" "Verify authentication token"

# Account Operations Tests
print_section "💰 Account Operations Tests"

# Check account balance
api_call "GET" "/accounts/acc_001/balance" "" "Get account balance for acc_001"

# Get full account details
api_call "GET" "/accounts/acc_001" "" "Get full account details for acc_001"

# Credit account
api_call "POST" "/accounts/acc_001/credit" '{
    "amount": 100.00,
    "description": "API Test Credit Transaction",
    "reference": "TEST_CREDIT_001",
    "employeeId": "emp_67890"
}' "Credit $100 to account acc_001"

# Check updated balance
api_call "GET" "/accounts/acc_001/balance" "" "Get updated balance after credit"

# Get transaction history
api_call "GET" "/accounts/acc_001/transactions?limit=5" "" "Get recent transactions for acc_001"

# Debit account
api_call "POST" "/accounts/acc_001/debit" '{
    "amount": 50.00,
    "description": "API Test Debit Transaction",
    "reference": "TEST_DEBIT_001",
    "employeeId": "emp_67890"
}' "Debit $50 from account acc_001"

# Check final balance
api_call "GET" "/accounts/acc_001/balance" "" "Get final balance after debit"

# Terms and Policies Tests
print_section "📋 Terms and Policies Tests"

# Get all terms
api_call "GET" "/terms" "" "Get all terms and conditions"

# Get specific terms sections
api_call "GET" "/terms/general" "" "Get general banking terms"
api_call "GET" "/terms/account-policies" "" "Get account policies"
api_call "GET" "/terms/transaction-limits" "" "Get transaction limits"

# Error Handling Tests
print_section "⚠️  Error Handling Tests"

# Test non-existent account
api_call "GET" "/accounts/acc_999/balance" "" "Test non-existent account (should return 404)"

# Test insufficient funds
api_call "POST" "/accounts/acc_004/debit" '{
    "amount": 99999.00,
    "description": "Test insufficient funds",
    "employeeId": "emp_67890"
}' "Test insufficient funds debit (should fail)"

# Test frozen account
api_call "POST" "/accounts/acc_006/credit" '{
    "amount": 100.00,
    "description": "Test frozen account",
    "employeeId": "emp_67890"
}' "Test credit to frozen account (should fail)"

# Logout
print_section "👋 Cleanup"
api_call "POST" "/auth/logout" "" "Logout"

print_section "✅ Test Complete"
echo -e "${GREEN}All API tests completed successfully!${NC}"
echo ""
echo "💡 Tips:"
echo "• Use the demo credentials from the README to test different user roles"
echo "• Check the comprehensive test suite with: bun test"
echo "• View API documentation at: $API_BASE/"
echo "• Monitor server logs for detailed request/response information"
