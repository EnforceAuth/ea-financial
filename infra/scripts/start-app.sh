#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

NAMESPACE="ea-financial"
APP_PORT=8080
API_PORT=8081

echo -e "${BLUE}🏦 EA Financial - Quick Start${NC}"
echo "=============================="

# Check if minikube is running
if ! minikube status >/dev/null 2>&1; then
    echo -e "${RED}❌ Minikube is not running. Please start minikube first.${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ Namespace '$NAMESPACE' not found. Please deploy the application first.${NC}"
    exit 1
fi

# Check if services are ready
echo -e "${YELLOW}🔍 Checking services...${NC}"
if ! kubectl get svc consumer-accounts-app -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ App service not found. Please deploy the application first.${NC}"
    exit 1
fi

if ! kubectl get svc consumer-accounts-api -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ API service not found. Please deploy the application first.${NC}"
    exit 1
fi

# Check if pods are ready
echo -e "${YELLOW}🔍 Checking pods...${NC}"
app_ready=$(kubectl get pods -n $NAMESPACE -l app=consumer-accounts-app -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | grep -o true | wc -l | tr -d ' ')
api_ready=$(kubectl get pods -n $NAMESPACE -l app=consumer-accounts-api -o jsonpath='{.items[*].status.containerStatuses[*].ready}' | grep -o true | wc -l | tr -d ' ')

if [ "$app_ready" -lt 2 ]; then
    echo -e "${RED}❌ App pods are not ready. Please wait for deployment to complete.${NC}"
    kubectl get pods -n $NAMESPACE -l app=consumer-accounts-app
    exit 1
fi

if [ "$api_ready" -lt 4 ]; then  # 2 pods with 2 containers each = 4 ready containers
    echo -e "${RED}❌ API pods are not ready. Please wait for deployment to complete.${NC}"
    kubectl get pods -n $NAMESPACE -l app=consumer-accounts-api
    exit 1
fi

echo -e "${GREEN}✅ All services are ready!${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping port-forwards...${NC}"
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
    fi
    echo -e "${BLUE}👋 Thanks for using EA Financial!${NC}"
}

# Trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Kill any existing port-forwards on these ports
echo -e "${YELLOW}🧹 Cleaning up existing port-forwards...${NC}"
pkill -f "port-forward.*consumer-accounts" 2>/dev/null || true
sleep 2

# Start port-forwards
echo -e "${YELLOW}🚀 Starting port-forwards...${NC}"

# App port-forward
kubectl port-forward svc/consumer-accounts-app $APP_PORT:80 -n $NAMESPACE >/dev/null 2>&1 &
APP_PID=$!

# API port-forward
kubectl port-forward svc/consumer-accounts-api $API_PORT:3001 -n $NAMESPACE >/dev/null 2>&1 &
API_PID=$!

# Wait a moment for port-forwards to establish
sleep 3

# Test connectivity
echo -e "${YELLOW}🔗 Testing connectivity...${NC}"
if ! curl -f -s -m 5 http://localhost:$APP_PORT/health >/dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to app. Port-forward may have failed.${NC}"
    exit 1
fi

if ! curl -f -s -m 5 http://localhost:$API_PORT/health >/dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to API. Port-forward may have failed.${NC}"
    exit 1
fi

# Success! Show URLs
echo ""
echo -e "${GREEN}✅ EA Financial is now running!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend App:${NC}    http://localhost:$APP_PORT"
echo -e "${BLUE}🔌 Backend API:${NC}     http://localhost:$API_PORT"
echo -e "${BLUE}📖 API Docs:${NC}        http://localhost:$API_PORT/"
echo -e "${BLUE}❤️  Health Check:${NC}    http://localhost:$API_PORT/health"
echo ""
echo -e "${YELLOW}💡 Demo Credentials:${NC}"
echo "   Username: jsmith, Password: password123 (Senior Representative)"
echo "   Username: mjohnson, Password: password456 (Manager)"
echo "   Username: rbrown, Password: password789 (Representative)"
echo ""
echo -e "${GREEN}🌐 Opening app in browser...${NC}"

# Try to open in browser
if command -v open >/dev/null 2>&1; then
    # macOS
    sleep 2
    open http://localhost:$APP_PORT
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    sleep 2
    xdg-open http://localhost:$APP_PORT
else
    echo -e "${YELLOW}⚠️  Could not auto-open browser. Please manually navigate to: http://localhost:$APP_PORT${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Press Ctrl+C to stop the application${NC}"
echo ""

# Keep running until interrupted
while true; do
    # Check if port-forwards are still alive
    if ! kill -0 $APP_PID 2>/dev/null || ! kill -0 $API_PID 2>/dev/null; then
        echo -e "${RED}❌ Port-forward died unexpectedly. Restarting...${NC}"

        # Restart app port-forward if needed
        if ! kill -0 $APP_PID 2>/dev/null; then
            kubectl port-forward svc/consumer-accounts-app $APP_PORT:80 -n $NAMESPACE >/dev/null 2>&1 &
            APP_PID=$!
        fi

        # Restart API port-forward if needed
        if ! kill -0 $API_PID 2>/dev/null; then
            kubectl port-forward svc/consumer-accounts-api $API_PORT:3001 -n $NAMESPACE >/dev/null 2>&1 &
            API_PID=$!
        fi
    fi

    sleep 5
done
