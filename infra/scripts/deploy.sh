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

echo -e "${BLUE}🚀 EA Financial - Application Deployment${NC}"
echo "=========================================="

# Function to check if namespace exists
check_namespace() {
    if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
        echo -e "${RED}❌ Namespace '${NAMESPACE}' does not exist${NC}"
        echo "Please run './setup.sh' first to initialize the infrastructure"
        exit 1
    fi
    echo -e "${GREEN}✅ Namespace '${NAMESPACE}' exists${NC}"
}

# Function to build and deploy applications
build_and_deploy() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"

    # Configure Docker to use Minikube's Docker daemon
    eval $(minikube docker-env)

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

# Function to update ConfigMaps
update_configmaps() {
    echo -e "${YELLOW}🔄 Updating ConfigMaps...${NC}"

    # Update EOPA policies
    kubectl create configmap opa-policies \
        --from-file="${PROJECT_ROOT}/infra/opa/policies/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Update EOPA data
    kubectl create configmap opa-data \
        --from-file="${PROJECT_ROOT}/infra/opa/data/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    echo -e "${GREEN}✅ ConfigMaps updated${NC}"
}

# Function to deploy applications
deploy_apps() {
    echo -e "${YELLOW}📦 Deploying applications...${NC}"

    # Apply all Kubernetes manifests
    kubectl apply -f "${PROJECT_ROOT}/infra/k8s/" -n ${NAMESPACE}

    echo -e "${YELLOW}⏳ Waiting for deployments to be ready...${NC}"

    # Wait for API deployment
    echo "Waiting for API deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/consumer-accounts-api -n ${NAMESPACE}

    # Wait for App deployment
    echo "Waiting for App deployment..."
    kubectl wait --for=condition=available --timeout=300s deployment/consumer-accounts-app -n ${NAMESPACE}

    echo -e "${GREEN}✅ Applications deployed successfully${NC}"
}

# Function to restart deployments
restart_deployments() {
    echo -e "${YELLOW}🔄 Restarting deployments...${NC}"

    kubectl rollout restart deployment/consumer-accounts-api -n ${NAMESPACE}
    kubectl rollout restart deployment/consumer-accounts-app -n ${NAMESPACE}

    # Wait for rollouts to complete
    kubectl rollout status deployment/consumer-accounts-api -n ${NAMESPACE}
    kubectl rollout status deployment/consumer-accounts-app -n ${NAMESPACE}

    echo -e "${GREEN}✅ Deployments restarted${NC}"
}

# Function to show deployment status
show_status() {
    echo -e "${BLUE}📊 Deployment Status${NC}"
    echo "==================="

    echo -e "${YELLOW}Pods:${NC}"
    kubectl get pods -n ${NAMESPACE} -o wide

    echo -e "\n${YELLOW}Services:${NC}"
    kubectl get services -n ${NAMESPACE}

    echo -e "\n${YELLOW}Deployments:${NC}"
    kubectl get deployments -n ${NAMESPACE}

    echo -e "\n${YELLOW}HPA Status:${NC}"
    kubectl get hpa -n ${NAMESPACE}

    echo -e "\n${YELLOW}Ingress:${NC}"
    kubectl get ingress -n ${NAMESPACE}

    # Get Minikube IP for access information
    MINIKUBE_IP=$(minikube ip)
    echo -e "\n${BLUE}🎯 Access URLs:${NC}"
    echo "Frontend: http://${MINIKUBE_IP}:30000"
    echo "API: http://${MINIKUBE_IP}:30001"
    echo "EOPA: http://${MINIKUBE_IP}:30002"
}

# Function to tail logs
tail_logs() {
    local component=${1:-"all"}

    echo -e "${YELLOW}📋 Tailing logs for: ${component}${NC}"

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

# Function to run health checks
health_check() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"

    MINIKUBE_IP=$(minikube ip)

    # Check API health
    echo "Checking API health..."
    if curl -f -s "http://${MINIKUBE_IP}:30001/health" > /dev/null; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    else
        echo -e "${RED}❌ API health check failed${NC}"
    fi

    # Check App health
    echo "Checking App health..."
    if curl -f -s "http://${MINIKUBE_IP}:30000/health" > /dev/null; then
        echo -e "${GREEN}✅ App is healthy${NC}"
    else
        echo -e "${RED}❌ App health check failed${NC}"
    fi

    # Check EOPA health
    echo "Checking EOPA health..."
    if curl -f -s "http://${MINIKUBE_IP}:30002/health" > /dev/null; then
        echo -e "${GREEN}✅ EOPA is healthy${NC}"
    else
        echo -e "${RED}❌ EOPA health check failed${NC}"
    fi
}

# Function to scale deployments
scale_deployment() {
    local deployment=$1
    local replicas=$2

    if [[ -z "$deployment" || -z "$replicas" ]]; then
        echo -e "${RED}❌ Usage: $0 scale <deployment> <replicas>${NC}"
        echo "Available deployments: consumer-accounts-api, consumer-accounts-app"
        exit 1
    fi

    echo -e "${YELLOW}📏 Scaling ${deployment} to ${replicas} replicas...${NC}"
    kubectl scale deployment/${deployment} --replicas=${replicas} -n ${NAMESPACE}
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE}
    echo -e "${GREEN}✅ Scaling completed${NC}"
}

# Function to update EOPA policies
update_policies() {
    echo -e "${YELLOW}🔐 Updating EOPA policies...${NC}"

    # Update policies ConfigMap
    kubectl create configmap opa-policies \
        --from-file="${PROJECT_ROOT}/infra/opa/policies/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Update data ConfigMap
    kubectl create configmap opa-data \
        --from-file="${PROJECT_ROOT}/infra/opa/data/" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Restart API pods to pick up new policies
    kubectl rollout restart deployment/consumer-accounts-api -n ${NAMESPACE}
    kubectl rollout status deployment/consumer-accounts-api -n ${NAMESPACE}

    echo -e "${GREEN}✅ EOPA policies updated${NC}"
}

# Function to show help
show_help() {
    echo -e "${BLUE}EA Financial Deployment Script${NC}"
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy              Build and deploy applications (default)"
    echo "  build               Build Docker images only"
    echo "  restart             Restart all deployments"
    echo "  status              Show deployment status"
    echo "  logs [component]    Tail logs (api|app|opa|eopa|all)"
    echo "  health              Run health checks"
    echo "  scale <app> <num>   Scale deployment to specified replicas"
    echo "  update-policies     Update EOPA policies"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy everything"
    echo "  $0 build                    # Build images only"
    echo "  $0 logs api                 # Tail API logs"
    echo "  $0 scale consumer-accounts-api 3  # Scale API to 3 replicas"
    echo "  $0 update-policies          # Update EOPA policies"
}

# Main execution
main() {
    local command=${1:-deploy}

    case $command in
        "deploy")
            check_namespace
            build_and_deploy
            update_configmaps
            deploy_apps
            show_status
            ;;
        "build")
            build_and_deploy
            ;;
        "restart")
            check_namespace
            restart_deployments
            show_status
            ;;
        "status")
            check_namespace
            show_status
            ;;
        "logs")
            check_namespace
            tail_logs $2
            ;;
        "health")
            check_namespace
            health_check
            ;;
        "scale")
            check_namespace
            scale_deployment $2 $3
            ;;
        "update-policies")
            check_namespace
            update_policies
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
