#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌉 EA Financial - Tunnel Setup${NC}"
echo "==============================="

# Check if minikube is running
if ! minikube status >/dev/null 2>&1; then
    echo -e "${RED}❌ Minikube is not running. Please start minikube first.${NC}"
    exit 1
fi

# Check if services exist
NAMESPACE="ea-financial"
if ! kubectl get svc consumer-accounts-app -n $NAMESPACE >/dev/null 2>&1; then
    echo -e "${RED}❌ EA Financial services not found. Please deploy first.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Current service configuration:${NC}"
kubectl get svc -n $NAMESPACE

echo ""
echo -e "${YELLOW}🌉 Starting minikube tunnel...${NC}"
echo -e "${BLUE}ℹ️  This will create a network tunnel to access services directly${NC}"
echo -e "${BLUE}ℹ️  You may be prompted for your password (sudo required)${NC}"
echo -e "${BLUE}ℹ️  Keep this terminal open while using the app${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping tunnel...${NC}"
    echo -e "${BLUE}👋 Thanks for using EA Financial!${NC}"
}

# Trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start the tunnel
echo -e "${GREEN}🚀 Starting tunnel... (press Ctrl+C to stop)${NC}"
echo ""

# Show what URLs will be available
echo -e "${GREEN}📱 Once tunnel is ready, access the app at:${NC}"
echo -e "${BLUE}   Frontend App:${NC} http://127.0.0.1:30000"
echo -e "${BLUE}   Backend API:${NC}  http://127.0.0.1:30001"
echo -e "${BLUE}   OPA Service:${NC}  http://127.0.0.1:30002"
echo ""
echo -e "${YELLOW}⏳ Tunnel starting...${NC}"

# Start minikube tunnel (this blocks)
minikube tunnel
