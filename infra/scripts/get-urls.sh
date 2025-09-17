#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

NAMESPACE="ea-financial"

echo -e "${BLUE}🔗 EA Financial - Quick URLs${NC}"
echo "============================="

# Check if minikube is running
if ! minikube status >/dev/null 2>&1; then
    echo -e "${RED}❌ Minikube is not running.${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ Namespace '$NAMESPACE' not found.${NC}"
    exit 1
fi

# Check if services exist
if ! kubectl get svc consumer-accounts-app -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ App service not found.${NC}"
    exit 1
fi

if ! kubectl get svc consumer-accounts-api -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ API service not found.${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting temporary port-forwards to get URLs...${NC}"

# Get available ports
APP_PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('', 0)); print(s.getsockname()[1]); s.close()" 2>/dev/null || echo "8080")
API_PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('', 0)); print(s.getsockname()[1]); s.close()" 2>/dev/null || echo "8081")

# Start temporary port-forwards
kubectl port-forward svc/consumer-accounts-app $APP_PORT:80 -n $NAMESPACE >/dev/null 2>&1 &
APP_PID=$!
disown $APP_PID

kubectl port-forward svc/consumer-accounts-api $API_PORT:3001 -n $NAMESPACE >/dev/null 2>&1 &
API_PID=$!
disown $API_PID

# Wait for connection
sleep 3

# Test connectivity
APP_STATUS="❌"
API_STATUS="❌"

if curl -f -s -m 3 http://localhost:$APP_PORT/health >/dev/null 2>&1; then
    APP_STATUS="✅"
fi

if curl -f -s -m 3 http://localhost:$API_PORT/health >/dev/null 2>&1; then
    API_STATUS="✅"
fi

# Cleanup port-forwards
kill $APP_PID $API_PID 2>/dev/null || true

# Show results
echo ""
echo -e "${GREEN}🌐 EA Financial URLs:${NC}"
echo "====================="
echo ""
echo -e "${BLUE}📱 Frontend App:${NC}    http://localhost:$APP_PORT  $APP_STATUS"
echo -e "${BLUE}🔌 Backend API:${NC}     http://localhost:$API_PORT  $API_STATUS"
echo -e "${BLUE}📖 API Docs:${NC}        http://localhost:$API_PORT/"
echo ""
echo -e "${YELLOW}💡 To start the application:${NC}"
echo "   ./infra/scripts/start-app.sh"
echo ""
echo -e "${YELLOW}💡 For persistent access, use minikube tunnel in another terminal:${NC}"
echo "   minikube tunnel"
echo "   # Then use NodePorts: http://127.0.0.1:30000 (app), http://127.0.0.1:30001 (api)"
echo ""
echo -e "${YELLOW}💡 For quick one-time access:${NC}"
echo "   minikube service consumer-accounts-app -n ea-financial"
echo ""

if [[ "$APP_STATUS" == "❌" || "$API_STATUS" == "❌" ]]; then
    echo -e "${RED}⚠️  Some services may not be ready. Check pod status:${NC}"
    echo "   kubectl get pods -n $NAMESPACE"
fi
