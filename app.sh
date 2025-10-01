#!/bin/bash

# EA Financial - Application Launcher & Service Manager
# Manages the full banking application stack with authorization services

set -e

# Configuration
OPA_PORT=8181
OPA_DATA_DIR="./infra/opa/data"
OPA_POLICIES_DIR="./infra/opa/policies"
API_PORT=3001
APP_PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 EA Financial - Application Manager${NC}"
echo "======================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i ":$port" >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to start OPA service
start_opa() {
    echo -e "${BLUE}🔐 Starting OPA Authorization Service...${NC}"

    if check_port $OPA_PORT; then
        echo -e "${YELLOW}⚠️  OPA already running on port $OPA_PORT${NC}"
        return 0
    fi

    # Check if OPA binary exists
    if ! command -v opa &> /dev/null; then
        echo -e "${RED}❌ OPA binary not found${NC}"
        echo "Install OPA: brew install open-policy-agent/opa/opa"
        return 1
    fi

    # Start OPA in background
    opa run --server \
        --addr localhost:$OPA_PORT \
        $OPA_POLICIES_DIR \
        $OPA_DATA_DIR \
        --log-level info &

    local opa_pid=$!
    echo -e "${GREEN}✅ OPA started (PID: $opa_pid)${NC}"

    # Wait for OPA to be ready
    echo -e "${BLUE}⏳ Waiting for OPA to be ready...${NC}"
    for i in {1..10}; do
        if curl -s "http://localhost:$OPA_PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ OPA is ready${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}❌ OPA failed to start properly${NC}"
    return 1
}

# Function to start EOPA service (Enterprise OPA with additional features)
start_eopa() {
    echo -e "${PURPLE}🔐 Starting Enterprise OPA (EOPA) Service...${NC}"
    echo -e "${YELLOW}Note: EOPA includes additional security features and audit logging${NC}"

    if check_port $OPA_PORT; then
        echo -e "${YELLOW}⚠️  Service already running on port $OPA_PORT${NC}"
        return 0
    fi

    # Check if OPA binary exists (EOPA uses same binary with extended config)
    if ! command -v opa &> /dev/null; then
        echo -e "${RED}❌ OPA binary not found${NC}"
        echo "Install OPA: brew install open-policy-agent/opa/opa"
        return 1
    fi

    # Start EOPA with enhanced logging and audit features
    opa run --server \
        --addr localhost:$OPA_PORT \
        $OPA_POLICIES_DIR \
        $OPA_DATA_DIR \
        --log-level debug \
        --log-format json \
        --set decision_logs.console=true \
        --set status.console=true &

    local eopa_pid=$!
    echo -e "${GREEN}✅ EOPA started with enhanced features (PID: $eopa_pid)${NC}"

    # Wait for EOPA to be ready
    echo -e "${BLUE}⏳ Waiting for EOPA to be ready...${NC}"
    for i in {1..10}; do
        if curl -s "http://localhost:$OPA_PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ EOPA is ready with audit logging enabled${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}❌ EOPA failed to start properly${NC}"
    return 1
}

# Function to stop authorization services
stop_auth_services() {
    echo -e "${YELLOW}🛑 Stopping authorization services...${NC}"
    pkill -f opa || true
    echo -e "${GREEN}✅ Authorization services stopped${NC}"
}

# Function to check system status
check_system_status() {
    echo -e "${BLUE}📊 System Status Check${NC}"
    echo "======================"

    # Check OPA/EOPA
    if check_port $OPA_PORT; then
        if curl -s "http://localhost:$OPA_PORT/health" >/dev/null 2>&1; then
            echo -e "🔐 Authorization Service: ${GREEN}✅ Running (Port $OPA_PORT)${NC}"
        else
            echo -e "🔐 Authorization Service: ${YELLOW}⚠️  Port occupied but not responding${NC}"
        fi
    else
        echo -e "🔐 Authorization Service: ${RED}❌ Not Running${NC}"
    fi

    # Check API
    if check_port $API_PORT; then
        if curl -s "http://localhost:$API_PORT/health" >/dev/null 2>&1; then
            echo -e "🔗 API Service: ${GREEN}✅ Running (Port $API_PORT)${NC}"
        else
            echo -e "🔗 API Service: ${YELLOW}⚠️  Port occupied but not responding${NC}"
        fi
    else
        echo -e "🔗 API Service: ${RED}❌ Not Running${NC}"
    fi

    # Check Frontend
    if check_port $APP_PORT; then
        echo -e "🌐 Frontend App: ${GREEN}✅ Running (Port $APP_PORT)${NC}"
    else
        echo -e "🌐 Frontend App: ${RED}❌ Not Running${NC}"
    fi

    echo ""
    echo -e "${CYAN}💡 Quick Commands:${NC}"
    echo "  ./app.sh opa       - Start with OPA authorization"
    echo "  ./app.sh eopa      - Start with Enterprise OPA"
    echo "  ./app.sh dev       - Full development mode"
    echo "  ./app.sh stop      - Stop all services"
}

# Function to start development environment
start_dev_environment() {
    local auth_service=${1:-opa}  # Default to opa

    echo -e "${BLUE}🚀 Starting EA Financial Development Environment${NC}"
    echo "Auth Service: $auth_service"
    echo ""

    # Start authorization service
    case "$auth_service" in
        "opa")
            start_opa || exit 1
            ;;
        "eopa")
            start_eopa || exit 1
            ;;
        *)
            echo -e "${RED}❌ Unknown auth service: $auth_service${NC}"
            echo "Supported: opa, eopa"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}🎉 Authorization service ready!${NC}"
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "  1. Start API: cd projects/consumer-accounts-internal-api && bun run dev"
    echo "  2. Start Frontend: cd projects/consumer-accounts-internal-app && npm run dev"
    echo "  3. Visit: http://localhost:3000"
    echo ""
    echo -e "${CYAN}💡 Demo Credentials:${NC}"
    echo "  • Manager: mjohnson / password456"
    echo "  • Senior Rep: jsmith / password123"
    echo "  • Representative: rbrown / password789"
}

# Parse command line arguments
case "${1:-status}" in
    "opa")
        start_dev_environment "opa"
        ;;
    "eopa")
        start_dev_environment "eopa"
        ;;
    "dev"|"start")
        # Allow specifying auth service as second argument
        auth_service=${2:-opa}
        start_dev_environment "$auth_service"
        ;;
    "stop")
        stop_auth_services
        ;;
    "status"|"check")
        check_system_status
        ;;
    "help"|"-h"|"--help")
        echo ""
        echo -e "${YELLOW}Usage: $0 [command] [options]${NC}"
        echo ""
        echo -e "${CYAN}Service Management:${NC}"
        echo "  opa              Start with standard OPA authorization"
        echo "  eopa             Start with Enterprise OPA"
        echo "  dev [opa|eopa]   Full development environment"
        echo "  stop             Stop all authorization services"
        echo "  status           Show system status"
        echo ""
        echo -e "${CYAN}Legacy Commands:${NC}"
        echo "  urls             Show available URLs"
        echo "  tunnel           Setup permanent tunnel"
        echo "  health           Run health checks"
        echo "  monitor          Live monitoring dashboard"
        echo ""
        echo -e "${CYAN}Examples:${NC}"
        echo "  ./app.sh opa               # Start with standard OPA"
        echo "  ./app.sh eopa              # Start with Enterprise OPA"
        echo "  ./app.sh dev opa           # Full dev environment with OPA"
        echo "  ./app.sh dev eopa          # Full dev environment with EOPA"
        echo "  ./app.sh status            # Check what's running"
        echo ""
        echo -e "${YELLOW}🔒 About Authorization Services:${NC}"
        echo "  OPA:  Standard Open Policy Agent for authorization"
        echo "  EOPA: Enterprise OPA"
        echo ""
        ;;
    "urls")
        exec ./infra/scripts/get-urls.sh
        ;;
    "tunnel")
        exec ./infra/scripts/setup-tunnel.sh
        ;;
    "health")
        exec ./infra/scripts/health-check.sh
        ;;
    "monitor")
        exec ./infra/scripts/monitor.sh dashboard
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Unknown command: $1${NC}"
        echo "Run './app.sh help' to see available commands"
        exit 1
        ;;
esac
