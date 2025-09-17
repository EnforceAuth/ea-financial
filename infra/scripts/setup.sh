#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (two levels up from scripts)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ea-financial"
REGISTRY="ea-financial"

echo -e "${BLUE}🏦 EA Financial - Minikube Infrastructure Setup${NC}"
echo "=============================================="

# Check if required tools are installed
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    local missing_tools=()

    if ! command -v minikube &> /dev/null; then
        missing_tools+=("minikube")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required tools: ${missing_tools[*]}${NC}"
        echo "Please install the missing tools and run this script again."
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

# Start Minikube if not running
start_minikube() {
    echo -e "${YELLOW}🚀 Starting Minikube...${NC}"

    if minikube status &> /dev/null; then
        echo -e "${GREEN}✅ Minikube is already running${NC}"
    else
        echo "Starting Minikube with Docker driver and sufficient resources..."
        minikube start \
            --driver=docker \
            --memory=4096 \
            --cpus=4 \
            --disk-size=20g \
            --kubernetes-version=v1.28.0

        # Enable necessary addons
        minikube addons enable ingress
        minikube addons enable metrics-server
        minikube addons enable dashboard
    fi

    # Configure Docker to use Minikube's Docker daemon
    echo -e "${YELLOW}🔧 Configuring Docker environment...${NC}"
    eval $(minikube docker-env)

    echo -e "${GREEN}✅ Minikube is ready${NC}"
}

# Create namespace
create_namespace() {
    echo -e "${YELLOW}📁 Creating namespace...${NC}"

    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        echo -e "${GREEN}✅ Namespace '${NAMESPACE}' already exists${NC}"
    else
        kubectl create namespace ${NAMESPACE}
        echo -e "${GREEN}✅ Created namespace '${NAMESPACE}'${NC}"
    fi
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"

    # Build API image
    echo "Building consumer-accounts-internal-api..."
    docker build -t ${REGISTRY}/consumer-accounts-api:latest \
        "${PROJECT_ROOT}/projects/consumer-accounts-internal-api/"

    # Build App image
    echo "Building consumer-accounts-internal-app..."
    docker build -f "${PROJECT_ROOT}/projects/consumer-accounts-internal-app/Dockerfile" \
        -t ${REGISTRY}/consumer-accounts-app:latest \
        "${PROJECT_ROOT}"

    # Build EOPA image with policies
    echo "Building EOPA with policies..."
    docker build -f "${PROJECT_ROOT}/infra/opa/Dockerfile" \
        -t ${REGISTRY}/eopa-with-policies:latest \
        "${PROJECT_ROOT}"

    echo -e "${GREEN}✅ All images built successfully${NC}"
}

# Deploy OPA ConfigMaps
deploy_opa_policies() {
    echo -e "${YELLOW}🔐 Deploying OPA policies...${NC}"

    # Create ConfigMap for OPA policies
    kubectl create configmap opa-policies \
        --from-file="${PROJECT_ROOT}/infra/opa/policies/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create ConfigMap for OPA data
    kubectl create configmap opa-data \
        --from-file="${PROJECT_ROOT}/infra/opa/data/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    echo -e "${GREEN}✅ OPA policies deployed${NC}"
}

# Deploy applications
deploy_applications() {
    echo -e "${YELLOW}🚀 Deploying applications...${NC}"

    # Apply all Kubernetes manifests
    kubectl apply -f "${PROJECT_ROOT}/infra/k8s/" -n ${NAMESPACE}

    echo -e "${YELLOW}⏳ Waiting for deployments to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=300s deployment --all -n ${NAMESPACE}

    echo -e "${GREEN}✅ Applications deployed successfully${NC}"
}

# Display access information
show_access_info() {
    echo -e "${BLUE}🎯 Access Information${NC}"
    echo "==================="

    # Get Minikube IP
    MINIKUBE_IP=$(minikube ip)

    # Get service URLs
    echo -e "${YELLOW}Frontend Application:${NC}"
    echo "  http://${MINIKUBE_IP}:30000"
    echo ""

    echo -e "${YELLOW}API Service:${NC}"
    echo "  http://${MINIKUBE_IP}:30001"
    echo "  Health: http://${MINIKUBE_IP}:30001/health"
    echo ""

    echo -e "${YELLOW}OPA Policy API:${NC}"
    echo "  http://${MINIKUBE_IP}:30002"
    echo ""

    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  # View pods:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo ""
    echo "  # View services:"
    echo "  kubectl get services -n ${NAMESPACE}"
    echo ""
    echo "  # View ingress:"
    echo "  kubectl get ingress -n ${NAMESPACE}"
    echo ""
    echo "  # Access Kubernetes dashboard:"
    echo "  minikube dashboard"
    echo ""
    echo "  # View OPA logs:"
    echo "  kubectl logs -l app=opa -n ${NAMESPACE}"
    echo ""
    echo "  # Port forward to services:"
    echo "  kubectl port-forward svc/consumer-accounts-app 3000:80 -n ${NAMESPACE}"
    echo "  kubectl port-forward svc/consumer-accounts-api 3001:3001 -n ${NAMESPACE}"
}

# Cleanup function
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up existing resources...${NC}"
    kubectl delete namespace ${NAMESPACE} --ignore-not-found=true
    docker rmi ${REGISTRY}/consumer-accounts-api:latest 2>/dev/null || true
    docker rmi ${REGISTRY}/consumer-accounts-app:latest 2>/dev/null || true
    docker rmi ${REGISTRY}/opa-with-policies:latest 2>/dev/null || true
}

# Main execution
main() {
    case "${1:-}" in
        "clean")
            cleanup
            echo -e "${GREEN}✅ Cleanup completed${NC}"
            ;;
        "build-only")
            check_prerequisites
            start_minikube
            build_images
            echo -e "${GREEN}✅ Build completed${NC}"
            ;;
        *)
            check_prerequisites
            start_minikube
            create_namespace
            build_images
            deploy_opa_policies
            deploy_applications
            show_access_info
            echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
            ;;
    esac
}

# Handle script arguments
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
