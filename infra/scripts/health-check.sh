#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="ea-financial"

echo -e "${BLUE}🏥 EA Financial - Health Check${NC}"
echo "================================"

# Function to check if a pod is ready
check_pod_readiness() {
    local app_label=$1
    local expected_containers=$2

    local pods=$(kubectl get pods -n $NAMESPACE -l app=$app_label -o jsonpath='{.items[*].metadata.name}')

    if [ -z "$pods" ]; then
        echo -e "${RED}❌ No pods found for app=$app_label${NC}"
        return 1
    fi

    local healthy_pods=0
    local total_pods=0

    for pod in $pods; do
        total_pods=$((total_pods + 1))
        local ready=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.status.containerStatuses[*].ready}' | grep -o true | wc -l)
        local ready_count=$(echo $ready | tr -d ' ')

        if [ "$ready_count" -eq "$expected_containers" ]; then
            healthy_pods=$((healthy_pods + 1))
            echo -e "${GREEN}✅ $pod: $ready_count/$expected_containers containers ready${NC}"
        else
            echo -e "${RED}❌ $pod: $ready_count/$expected_containers containers ready${NC}"
        fi
    done

    if [ $healthy_pods -eq $total_pods ]; then
        echo -e "${GREEN}✅ All $app_label pods are healthy ($healthy_pods/$total_pods)${NC}"
        return 0
    else
        echo -e "${RED}❌ Some $app_label pods are unhealthy ($healthy_pods/$total_pods)${NC}"
        return 1
    fi
}

# Function to test internal connectivity
test_internal_connectivity() {
    echo -e "\n${YELLOW}🔗 Testing Internal Connectivity${NC}"
    echo "================================"

    # Get a running API pod
    local api_pod=$(kubectl get pods -n $NAMESPACE -l app=consumer-accounts-api -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$api_pod" ]; then
        echo -e "${RED}❌ No API pods found${NC}"
        return 1
    fi

    echo "Using pod: $api_pod"

    # Test API health endpoint internally
    echo -n "Testing API health endpoint... "
    if kubectl exec $api_pod -n $NAMESPACE -c api -- wget -q -T 5 -O - http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API health OK${NC}"
    else
        echo -e "${RED}❌ API health FAILED${NC}"
    fi

    # Test OPA health endpoint from API container
    echo -n "Testing OPA health endpoint... "
    if kubectl exec $api_pod -n $NAMESPACE -c api -- wget -q -T 5 -O - http://localhost:8181/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OPA health OK${NC}"
    else
        echo -e "${RED}❌ OPA health FAILED${NC}"
    fi

    # Test App health endpoint via internal service
    echo -n "Testing App health endpoint... "
    if kubectl exec $api_pod -n $NAMESPACE -c api -- wget -q -T 5 -O - http://consumer-accounts-app-internal/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ App health OK${NC}"
    else
        echo -e "${RED}❌ App health FAILED${NC}"
    fi

    # Test service-to-service connectivity
    echo -n "Testing API to App connectivity... "
    if kubectl exec $api_pod -n $NAMESPACE -c api -- wget -q -T 5 -O - http://consumer-accounts-app-internal/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API->App connectivity OK${NC}"
    else
        echo -e "${RED}❌ API->App connectivity FAILED${NC}"
    fi
}

# Function to test external connectivity using port-forwarding
test_external_connectivity() {
    echo -e "\n${YELLOW}🌐 Testing External Connectivity${NC}"
    echo "================================"

    # Test API via port-forward
    echo -n "Testing API external access... "
    kubectl port-forward svc/consumer-accounts-api 13001:3001 -n $NAMESPACE >/dev/null 2>&1 &
    local api_pf_pid=$!
    disown $api_pf_pid
    sleep 2

    if curl -f -s -m 5 http://localhost:13001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API external access OK${NC}"
    else
        echo -e "${RED}❌ API external access FAILED${NC}"
    fi
    kill $api_pf_pid 2>/dev/null || true

    # Test App via port-forward
    echo -n "Testing App external access... "
    kubectl port-forward svc/consumer-accounts-app 13000:80 -n $NAMESPACE >/dev/null 2>&1 &
    local app_pf_pid=$!
    disown $app_pf_pid
    sleep 2

    if curl -f -s -m 5 http://localhost:13000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ App external access OK${NC}"
    else
        echo -e "${RED}❌ App external access FAILED${NC}"
    fi
    kill $app_pf_pid 2>/dev/null || true

    # Test OPA via port-forward
    echo -n "Testing OPA external access... "
    kubectl port-forward svc/consumer-accounts-api 13002:8181 -n $NAMESPACE >/dev/null 2>&1 &
    local opa_pf_pid=$!
    disown $opa_pf_pid
    sleep 2

    if curl -f -s -m 5 http://localhost:13002/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OPA external access OK${NC}"
    else
        echo -e "${RED}❌ OPA external access FAILED${NC}"
    fi
    kill $opa_pf_pid 2>/dev/null || true
}

# Function to show resource status
show_resource_status() {
    echo -e "\n${YELLOW}📊 Resource Status${NC}"
    echo "=================="

    echo "Pods:"
    kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[*].ready,RESTARTS:.status.containerStatuses[*].restartCount,AGE:.metadata.creationTimestamp

    echo -e "\nServices:"
    kubectl get services -n $NAMESPACE

    echo -e "\nDeployments:"
    kubectl get deployments -n $NAMESPACE
}

# Function to show recent events
show_events() {
    echo -e "\n${YELLOW}📰 Recent Events${NC}"
    echo "================"
    kubectl get events -n $NAMESPACE --sort-by=.firstTimestamp | tail -10
}

# Function to test OPA policies
test_opa_policies() {
    echo -e "\n${YELLOW}🔐 Testing OPA Policies${NC}"
    echo "======================"

    # Port forward OPA
    kubectl port-forward svc/consumer-accounts-api 13002:8181 -n $NAMESPACE >/dev/null 2>&1 &
    local opa_pf_pid=$!
    disown $opa_pf_pid
    sleep 3

    # Test cases
    local tests=(
        '{"input": {"request": {"http": {"method": "GET", "path": "/health"}}}}|Health check (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/accounts/ACC001", "headers": {"authorization": "Bearer jsmith_token_123"}}}}}|Valid user (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/accounts/ACC001", "headers": {"authorization": "Bearer invalid"}}}}}|Invalid token (should deny)'
    )

    for test in "${tests[@]}"; do
        local json_data=$(echo "$test" | cut -d'|' -f1)
        local description=$(echo "$test" | cut -d'|' -f2)

        echo -n "Testing: $description... "

        local response=$(curl -s -m 5 -X POST \
            -H "Content-Type: application/json" \
            -d "$json_data" \
            "http://localhost:13002/v1/data/main/allow" 2>/dev/null)

        if echo "$response" | grep -q '"result":true'; then
            echo -e "${GREEN}ALLOWED${NC}"
        elif echo "$response" | grep -q '"result":false'; then
            echo -e "${RED}DENIED${NC}"
        else
            echo -e "${YELLOW}UNKNOWN${NC} - Response: $response"
        fi
    done

    kill $opa_pf_pid 2>/dev/null || true
}

# Main execution
main() {
    local command=${1:-"all"}

    # Check prerequisites
    if ! kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
        echo -e "${RED}❌ Namespace '$NAMESPACE' not found${NC}"
        exit 1
    fi

    case $command in
        "pods"|"readiness")
            echo -e "${YELLOW}🔍 Checking Pod Readiness${NC}"
            echo "========================"
            check_pod_readiness "consumer-accounts-api" 2
            echo ""
            check_pod_readiness "consumer-accounts-app" 1
            ;;
        "internal")
            test_internal_connectivity
            ;;
        "external")
            test_external_connectivity
            ;;
        "resources")
            show_resource_status
            ;;
        "events")
            show_events
            ;;
        "opa")
            test_opa_policies
            ;;
        "all"|*)
            echo -e "${YELLOW}🔍 Checking Pod Readiness${NC}"
            echo "========================"
            local api_healthy=false
            local app_healthy=false

            if check_pod_readiness "consumer-accounts-api" 2; then
                api_healthy=true
            fi
            echo ""
            if check_pod_readiness "consumer-accounts-app" 1; then
                app_healthy=true
            fi

            if [ "$api_healthy" = true ] && [ "$app_healthy" = true ]; then
                test_internal_connectivity
                test_external_connectivity
                test_opa_policies
            else
                echo -e "\n${RED}⚠️  Skipping connectivity tests due to unhealthy pods${NC}"
                show_resource_status
                show_events
            fi
            ;;
    esac

    echo -e "\n${BLUE}Health check completed!${NC}"
}

# Show help if requested
if [[ "$1" == "help" ]] || [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all        Run full health check (default)"
    echo "  pods       Check pod readiness only"
    echo "  internal   Test internal connectivity"
    echo "  external   Test external connectivity via port-forward"
    echo "  resources  Show resource status"
    echo "  events     Show recent events"
    echo "  opa        Test OPA policies"
    echo "  help       Show this help"
    exit 0
fi

main "$@"
