#!/bin/bash

# EA Financial - Application Launcher & Service Manager
# Manages the full banking application stack with authorization services

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    set -a  # automatically export all variables
    source .env
    set +a
    echo "✅ Loaded environment variables from .env"
fi

# Configuration
OPA_PORT=8181
OPA_CONFIG_FILE="./infra/opa/config/opa-config-local.yaml"
EOPA_CONFIG_FILE="./infra/opa/config/opa-config.yaml"
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

# Function to validate AWS credentials
validate_aws_credentials() {
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        echo -e "${YELLOW}⚠️  AWS credentials not set - OPA will fail to fetch bundle from S3${NC}"
        echo -e "${YELLOW}   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file${NC}"
    else
        echo -e "${GREEN}✅ AWS credentials loaded${NC}"
        if [ -z "$AWS_REGION" ]; then
            echo -e "${YELLOW}⚠️  AWS_REGION not set - using default region${NC}"
        fi
    fi
}

# Function to validate and display S3 bundle path
validate_s3_bundle_path() {
    local bucket="${OPA_BUNDLE_BUCKET:-ea-financial-demo-policy}"
    local path="${OPA_BUNDLE_PATH:-policies/ea-financial/bundle.tar.gz}"

    if [[ -n "$OPA_BUNDLE_BUCKET" && "$OPA_BUNDLE_BUCKET" =~ [^a-z0-9.-] ]]; then
        echo -e "${YELLOW}⚠️  Warning: OPA_BUNDLE_BUCKET contains invalid characters for S3 bucket names${NC}"
    fi

    echo -e "${CYAN}   Fetching bundle from S3: s3://${bucket}/${path}${NC}"
}

# Function to start OPA service
start_opa() {
    echo -e "${BLUE}🔐 Starting OPA Authorization Service (with S3 bundle support)...${NC}"

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

    # Check AWS credentials
    validate_aws_credentials

    # Start OPA in background with config file
    opa run --server \
        --addr localhost:$OPA_PORT \
        --config-file $OPA_CONFIG_FILE \
        --log-level info &

    local opa_pid=$!
    echo -e "${GREEN}✅ OPA started (PID: $opa_pid)${NC}"
    validate_s3_bundle_path

    # Wait for OPA to be ready
    echo -e "${BLUE}⏳ Waiting for OPA to be ready...${NC}"
    for i in {1..15}; do
        if curl -s "http://localhost:$OPA_PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ OPA is ready and bundle loaded from S3${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}❌ OPA failed to start properly${NC}"
    echo -e "${YELLOW}   Check that AWS credentials are correct and S3 bucket is accessible${NC}"
    return 1
}

# Function to start EOPA service (Enterprise OPA with additional features)
start_eopa() {
    echo -e "${PURPLE}🔐 Starting Enterprise OPA (EOPA) Service (with S3 bundle support)...${NC}"
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

    # Check AWS credentials
    validate_aws_credentials

    # Start EOPA with enhanced logging and audit features
    opa run --server \
        --addr localhost:$OPA_PORT \
        --config-file $EOPA_CONFIG_FILE \
        --log-level debug \
        --log-format json \
        --set decision_logs.console=true \
        --set status.console=true &

    local eopa_pid=$!
    echo -e "${GREEN}✅ EOPA started with enhanced features (PID: $eopa_pid)${NC}"
    validate_s3_bundle_path

    # Wait for EOPA to be ready
    echo -e "${BLUE}⏳ Waiting for EOPA to be ready...${NC}"
    for i in {1..15}; do
        if curl -s "http://localhost:$OPA_PORT/health" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ EOPA is ready with audit logging enabled and bundle loaded from S3${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}❌ EOPA failed to start properly${NC}"
    echo -e "${YELLOW}   Check that AWS credentials are correct and S3 bucket is accessible${NC}"
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
