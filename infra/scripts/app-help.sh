#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 EA Financial - Access Options${NC}"
echo "================================="
echo ""

# Check if minikube and services are ready
MINIKUBE_STATUS="❌"
SERVICES_STATUS="❌"

if minikube status >/dev/null 2>&1; then
    MINIKUBE_STATUS="✅"
    if kubectl get svc consumer-accounts-app -n ea-financial >/dev/null 2>&1; then
        SERVICES_STATUS="✅"
    fi
fi

echo -e "${CYAN}Current Status:${NC}"
echo "  Minikube: $MINIKUBE_STATUS"
echo "  Services: $SERVICES_STATUS"
echo ""

if [[ "$MINIKUBE_STATUS" == "❌" ]]; then
    echo -e "${RED}⚠️  Minikube is not running. Start it first with: minikube start${NC}"
    echo ""
elif [[ "$SERVICES_STATUS" == "❌" ]]; then
    echo -e "${RED}⚠️  EA Financial services not deployed. Deploy them first.${NC}"
    echo ""
fi

echo -e "${GREEN}📱 Browser Access Options:${NC}"
echo "========================="
echo ""

echo -e "${YELLOW}1. 🚀 Quick & Easy (Recommended)${NC}"
echo "   ./infra/scripts/open-app.sh"
echo "   • Opens app instantly in your browser"
echo "   • Uses port-forwarding (keeps terminal open)"
echo "   • URL: http://localhost:8080"
echo ""

echo -e "${YELLOW}2. 🎯 Full Development Mode${NC}"
echo "   ./infra/scripts/start-app.sh"
echo "   • Starts both frontend + API"
echo "   • Auto-opens browser"
echo "   • Includes health monitoring"
echo "   • Frontend: http://localhost:8080"
echo "   • API: http://localhost:8081"
echo ""

echo -e "${YELLOW}3. 🌉 Permanent Access (No Terminal)${NC}"
echo "   ./infra/scripts/setup-tunnel.sh"
echo "   • Creates persistent tunnel"
echo "   • No port-forwarding needed"
echo "   • Frontend: http://127.0.0.1:30000"
echo "   • API: http://127.0.0.1:30001"
echo "   • Requires sudo password"
echo ""

echo -e "${YELLOW}4. 🔗 Just Show URLs${NC}"
echo "   ./infra/scripts/get-urls.sh"
echo "   • Quick check of available URLs"
echo "   • Tests connectivity"
echo "   • No persistent connections"
echo ""

echo -e "${YELLOW}5. 🖥️  Native minikube Command${NC}"
echo "   minikube service consumer-accounts-app -n ea-financial"
echo "   • Uses minikube's built-in service access"
echo "   • Keeps terminal open"
echo "   • URL provided by minikube"
echo ""

echo -e "${GREEN}💡 Demo Credentials:${NC}"
echo "==================="
echo "  Manager:      mjohnson / password456  (Full access)"
echo "  Senior Rep:   jsmith / password123    (Enhanced access)"
echo "  Representative: rbrown / password789  (Read-only access)"
echo ""

echo -e "${GREEN}🔧 Monitoring & Health:${NC}"
echo "======================"
echo "  ./infra/scripts/health-check.sh     # Quick health check"
echo "  ./infra/scripts/monitor.sh health   # Service health status"
echo "  ./infra/scripts/monitor.sh dashboard # Live monitoring"
echo ""

echo -e "${GREEN}💭 Which option should I use?${NC}"
echo "============================="
echo -e "${CYAN}• First time or demo:${NC} ./infra/scripts/open-app.sh"
echo -e "${CYAN}• Development work:${NC}  ./infra/scripts/start-app.sh"
echo -e "${CYAN}• Long-term use:${NC}     ./infra/scripts/setup-tunnel.sh"
echo -e "${CYAN}• Just checking:${NC}     ./infra/scripts/get-urls.sh"
echo ""

if [[ "$SERVICES_STATUS" == "✅" ]]; then
    echo -e "${GREEN}✅ Ready to go! Choose an option above to access EA Financial.${NC}"
else
    echo -e "${RED}❌ Services not ready. Please ensure minikube is running and EA Financial is deployed.${NC}"
fi
