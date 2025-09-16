#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ea-financial"
MINIKUBE_IP=$(minikube ip 2>/dev/null || echo "localhost")

echo -e "${BLUE}📊 EA Financial - Monitoring & Testing Dashboard${NC}"
echo "=================================================="

# Function to check if services are running
check_services() {
    echo -e "${YELLOW}🔍 Checking service health...${NC}"

    local api_health="❌"
    local app_health="❌"
    local eopa_health="❌"

    # Check API health via port-forward
    kubectl port-forward svc/consumer-accounts-api 13001:3001 -n ${NAMESPACE} >/dev/null 2>&1 &
    local api_pf_pid=$!
    disown $api_pf_pid
    sleep 2
    if curl -f -s -m 5 "http://localhost:13001/health" > /dev/null 2>&1; then
        api_health="✅"
    fi
    kill $api_pf_pid 2>/dev/null || true

    # Check App health via port-forward
    kubectl port-forward svc/consumer-accounts-app 13000:80 -n ${NAMESPACE} >/dev/null 2>&1 &
    local app_pf_pid=$!
    disown $app_pf_pid
    sleep 2
    if curl -f -s -m 5 "http://localhost:13000/health" > /dev/null 2>&1; then
        app_health="✅"
    fi
    kill $app_pf_pid 2>/dev/null || true

    # Check EOPA health via port-forward
    kubectl port-forward svc/consumer-accounts-api 13002:8181 -n ${NAMESPACE} >/dev/null 2>&1 &
    local eopa_pf_pid=$!
    disown $eopa_pf_pid
    sleep 2
    if curl -f -s -m 5 "http://localhost:13002/health" > /dev/null 2>&1; then
        eopa_health="✅"
    fi
    kill $eopa_pf_pid 2>/dev/null || true

    echo -e "API Service:   ${api_health} (via port-forward 13001->3001)"
    echo -e "App Service:   ${app_health} (via port-forward 13000->80)"
    echo -e "EOPA Service:  ${eopa_health} (via port-forward 13002->8181)"
    echo ""
}

# Function to show resource usage
show_resource_usage() {
    echo -e "${YELLOW}📈 Resource Usage${NC}"
    echo "=================="

    kubectl top pods -n ${NAMESPACE} --containers 2>/dev/null || echo "Metrics not available (metrics-server may not be running)"
    echo ""
}

# Function to show pod status
show_pod_status() {
    echo -e "${YELLOW}🏗️ Pod Status${NC}"
    echo "=============="

    kubectl get pods -n ${NAMESPACE} -o custom-columns=\
'NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[*].ready,RESTARTS:.status.containerStatuses[*].restartCount,AGE:.metadata.creationTimestamp' \
    --sort-by=.metadata.creationTimestamp
    echo ""
}

# Function to show events
show_events() {
    echo -e "${YELLOW}📰 Recent Events${NC}"
    echo "================"

    kubectl get events -n ${NAMESPACE} --sort-by=.firstTimestamp | tail -10
    echo ""
}

# Function to test EOPA authorization
test_opa_authorization() {
    echo -e "${YELLOW}🔐 Testing EOPA Authorization${NC}"
    echo "============================="

    # Test data
    local test_cases=(
        '{"input": {"request": {"http": {"method": "GET", "path": "/health", "headers": {}}}}}|Health check (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/", "headers": {}}}}}|Root endpoint (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/accounts/ACC001", "headers": {"authorization": "Bearer jsmith_token_123"}}}}}|Valid user accessing account (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/accounts/ACC001", "headers": {"authorization": "Bearer invalid_token"}}}}}|Invalid token (should deny)'
        '{"input": {"request": {"http": {"method": "POST", "path": "/accounts/ACC001/debit", "headers": {"authorization": "Bearer rbrown_token_789"}}}}}|Representative trying debit (should deny)'
        '{"input": {"request": {"http": {"method": "POST", "path": "/accounts/ACC001/debit", "headers": {"authorization": "Bearer jsmith_token_123"}}}}}|Senior rep doing debit (should allow)'
        '{"input": {"request": {"http": {"method": "GET", "path": "/accounts/ACC001", "headers": {"authorization": "Bearer slee_token_000"}}}}}|Inactive user (should deny)'
    )

    for test_case in "${test_cases[@]}"; do
        local json_data=$(echo "$test_case" | cut -d'|' -f1)
        local description=$(echo "$test_case" | cut -d'|' -f2)

        echo -n "Testing: $description... "

        # Use port-forward for OPA testing
        kubectl port-forward svc/consumer-accounts-api 13002:8181 -n ${NAMESPACE} >/dev/null 2>&1 &
        local opa_pf_pid=$!
        disown $opa_pf_pid
        sleep 2

        local response=$(curl -s -m 5 -X POST \
            -H "Content-Type: application/json" \
            -d "$json_data" \
            "http://localhost:13002/v1/data/main/allow" 2>/dev/null)

        kill $opa_pf_pid 2>/dev/null || true

        if echo "$response" | grep -q '"result":true'; then
            echo -e "${GREEN}ALLOWED${NC}"
        elif echo "$response" | grep -q '"result":false'; then
            echo -e "${RED}DENIED${NC}"
        else
            echo -e "${PURPLE}ERROR${NC} - $response"
        fi
    done
    echo ""
}

# Function to test API endpoints
test_api_endpoints() {
    echo -e "${YELLOW}🌐 Testing API Endpoints${NC}"
    echo "======================="

    local endpoints=(
        "GET|/|Root endpoint"
        "GET|/health|Health check"
        "GET|/status|Status check"
        "POST|/auth/login|Login (with valid credentials)"
        "GET|/accounts/ACC001|Get account (authenticated)"
        "GET|/accounts/ACC001/balance|Get balance (authenticated)"
        "GET|/terms|Get terms"
    )

    for endpoint in "${endpoints[@]}"; do
        local method=$(echo "$endpoint" | cut -d'|' -f1)
        local path=$(echo "$endpoint" | cut -d'|' -f2)
        local description=$(echo "$endpoint" | cut -d'|' -f3)

        echo -n "Testing $method $path ($description)... "

        # Use port-forward for API testing
        kubectl port-forward svc/consumer-accounts-api 13001:3001 -n ${NAMESPACE} >/dev/null 2>&1 &
        local api_pf_pid=$!
        disown $api_pf_pid
        sleep 2

        local status_code
        if [[ "$path" == "/auth/login" ]]; then
            # Special case for login with credentials
            status_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
                -X POST \
                -H "Content-Type: application/json" \
                -d '{"username": "jsmith", "password": "password123"}' \
                "http://localhost:13001$path" 2>/dev/null)
        elif [[ "$path" == "/accounts"* ]]; then
            # Authenticated endpoints
            status_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
                -X $method \
                -H "Authorization: Bearer jsmith_token_123" \
                "http://localhost:13001$path" 2>/dev/null)
        else
            # Public endpoints
            status_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
                -X $method \
                "http://localhost:13001$path" 2>/dev/null)
        fi

        kill $api_pf_pid 2>/dev/null || true

        if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
            echo -e "${GREEN}✅ $status_code${NC}"
        elif [[ "$status_code" =~ ^4[0-9][0-9]$ ]]; then
            echo -e "${YELLOW}⚠️  $status_code${NC}"
        else
            echo -e "${RED}❌ $status_code${NC}"
        fi
    done
    echo ""
}

# Function to monitor logs in real-time
monitor_logs() {
    local component=${1:-"all"}

    echo -e "${YELLOW}📋 Monitoring logs for: ${component}${NC}"
    echo "Press Ctrl+C to stop..."
    echo ""

    case $component in
        "api")
            kubectl logs -f -l app=consumer-accounts-api -n ${NAMESPACE} --all-containers=true
            ;;
        "app")
            kubectl logs -f -l app=consumer-accounts-app -n ${NAMESPACE}
            ;;
        "opa"|"eopa")
            kubectl logs -f -l app=consumer-accounts-api -c opa -n ${NAMESPACE}
            ;;
        "all"|*)
            kubectl logs -f -l app=consumer-accounts-api -n ${NAMESPACE} --all-containers=true &
            kubectl logs -f -l app=consumer-accounts-app -n ${NAMESPACE} &
            wait
            ;;
    esac
}

# Function to show performance metrics
show_performance_metrics() {
    echo -e "${YELLOW}⚡ Performance Metrics${NC}"
    echo "====================="

    echo "HPA Status:"
    kubectl get hpa -n ${NAMESPACE} 2>/dev/null || echo "HPA not available"
    echo ""

    echo "Resource Limits vs Usage:"
    kubectl describe pods -n ${NAMESPACE} | grep -A 5 -E "(Requests|Limits):" | head -20
    echo ""

    echo "Node Resource Usage:"
    kubectl top nodes 2>/dev/null || echo "Node metrics not available"
    echo ""
}

# Function to run load test
run_load_test() {
    local duration=${1:-30}
    local concurrent=${2:-10}

    echo -e "${YELLOW}🚀 Running Load Test${NC}"
    echo "Duration: ${duration}s, Concurrent requests: ${concurrent}"
    echo "==================="

    # Start port-forward for load test
    kubectl port-forward svc/consumer-accounts-api 13001:3001 -n ${NAMESPACE} >/dev/null 2>&1 &
    local pf_pid=$!
    disown $pf_pid
    sleep 3

    if command -v ab &> /dev/null; then
        echo "Running Apache Bench load test..."
        ab -t ${duration} -c ${concurrent} "http://localhost:13001/health"
    elif command -v curl &> /dev/null; then
        echo "Running simple curl-based load test..."
        local start_time=$(date +%s)
        local end_time=$((start_time + duration))
        local request_count=0

        while [ $(date +%s) -lt $end_time ]; do
            for i in $(seq 1 $concurrent); do
                curl -s -m 5 "http://localhost:13001/health" > /dev/null &
            done
            wait
            request_count=$((request_count + concurrent))
            echo "Requests sent: $request_count"
            sleep 1
        done

        echo "Load test completed. Total requests: $request_count"
    else
        echo "No load testing tools available (ab or curl)"
    fi

    kill $pf_pid 2>/dev/null || true
    echo ""
}

# Function to check security configuration
check_security() {
    echo -e "${YELLOW}🔒 Security Configuration Check${NC}"
    echo "==============================="

    echo "Network Policies:"
    kubectl get networkpolicy -n ${NAMESPACE} || echo "No network policies found"
    echo ""

    echo "Pod Security Context:"
    kubectl get pods -n ${NAMESPACE} -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}' | head -5
    echo ""

    echo "Service Accounts:"
    kubectl get serviceaccounts -n ${NAMESPACE}
    echo ""

    echo "RBAC Policies:"
    kubectl get rolebindings,clusterrolebindings -n ${NAMESPACE} 2>/dev/null || echo "No RBAC policies found in namespace"
    echo ""
}

# Function to generate monitoring report
generate_report() {
    local output_file="monitoring-report-$(date +%Y%m%d_%H%M%S).txt"

    echo -e "${YELLOW}📄 Generating monitoring report...${NC}"

    {
        echo "EA Financial - Monitoring Report"
        echo "Generated: $(date)"
        echo "================================"
        echo ""

        echo "SERVICE HEALTH:"
        check_services

        echo "RESOURCE USAGE:"
        show_resource_usage

        echo "POD STATUS:"
        show_pod_status

        echo "RECENT EVENTS:"
        show_events

        echo "PERFORMANCE METRICS:"
        show_performance_metrics

        echo "SECURITY CHECK:"
        check_security

    } > "$output_file"

    echo -e "${GREEN}✅ Report generated: $output_file${NC}"
}

# Function to show dashboard
show_dashboard() {
    while true; do
        clear
        echo -e "${BLUE}📊 EA Financial - Live Dashboard${NC}"
        echo "================================"
        echo -e "${CYAN}Last updated: $(date)${NC}"
        echo ""

        check_services
        show_resource_usage
        show_pod_status

        echo -e "${PURPLE}Press Ctrl+C to exit, or wait 30 seconds for refresh...${NC}"
        sleep 30
    done
}

# Function to show help
show_help() {
    echo -e "${BLUE}EA Financial Monitoring Script${NC}"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dashboard           Show live monitoring dashboard"
    echo "  health              Check service health"
    echo "  resources           Show resource usage"
    echo "  pods                Show pod status"
    echo "  events              Show recent events"
    echo "  test-opa            Test EOPA authorization policies"
    echo "  test-api            Test API endpoints"
    echo "  logs [component]    Monitor logs (api|app|opa|eopa|all)"
    echo "  performance         Show performance metrics"
    echo "  load-test [dur] [concurrent]  Run load test (default: 30s, 10 concurrent)"
    echo "  security            Check security configuration"
    echo "  report              Generate monitoring report"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dashboard                    # Show live dashboard"
    echo "  $0 test-opa                     # Test EOPA policies"
    echo "  $0 logs api                     # Monitor API logs"
    echo "  $0 load-test 60 20              # Load test for 60s with 20 concurrent"
    echo "  $0 report                       # Generate report"
}

# Main execution
main() {
    local command=${1:-dashboard}

    # Check if kubectl is available and namespace exists
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl not found. Please install kubectl.${NC}"
        exit 1
    fi

    if ! kubectl get namespace ${NAMESPACE} &> /dev/null 2>&1; then
        echo -e "${RED}❌ Namespace '${NAMESPACE}' not found. Please run setup.sh first.${NC}"
        exit 1
    fi

    case $command in
        "dashboard")
            show_dashboard
            ;;
        "health")
            check_services
            ;;
        "resources")
            show_resource_usage
            ;;
        "pods")
            show_pod_status
            ;;
        "events")
            show_events
            ;;
        "test-opa")
            test_opa_authorization
            ;;
        "test-api")
            test_api_endpoints
            ;;
        "logs")
            monitor_logs $2
            ;;
        "performance")
            show_performance_metrics
            ;;
        "load-test")
            run_load_test $2 $3
            ;;
        "security")
            check_security
            ;;
        "report")
            generate_report
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Handle script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
