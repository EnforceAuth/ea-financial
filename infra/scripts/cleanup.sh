#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ea-financial"
REGISTRY="ea-financial"

echo -e "${BLUE}🧹 EA Financial - Infrastructure Cleanup${NC}"
echo "=========================================="

# Function to confirm cleanup
confirm_cleanup() {
    local cleanup_type=$1
    echo -e "${YELLOW}⚠️  WARNING: This will $cleanup_type${NC}"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}ℹ️  Cleanup cancelled${NC}"
        exit 0
    fi
}

# Function to cleanup Kubernetes resources
cleanup_k8s_resources() {
    echo -e "${YELLOW}🗑️  Cleaning up Kubernetes resources...${NC}"

    # Delete deployments
    if kubectl get deployment -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting deployments..."
        kubectl delete deployments --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete services
    if kubectl get services -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting services..."
        kubectl delete services --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete ingress
    if kubectl get ingress -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting ingress..."
        kubectl delete ingress --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete HPA
    if kubectl get hpa -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting HPA..."
        kubectl delete hpa --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete ConfigMaps
    if kubectl get configmaps -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting ConfigMaps..."
        kubectl delete configmaps --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete Secrets
    if kubectl get secrets -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting Secrets..."
        kubectl delete secrets --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete Network Policies
    if kubectl get networkpolicies -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting Network Policies..."
        kubectl delete networkpolicies --all -n ${NAMESPACE} --timeout=60s
    fi

    # Delete PVCs
    if kubectl get pvc -n ${NAMESPACE} &> /dev/null; then
        echo "Deleting PVCs..."
        kubectl delete pvc --all -n ${NAMESPACE} --timeout=60s
    fi

    echo -e "${GREEN}✅ Kubernetes resources cleaned up${NC}"
}

# Function to delete namespace
delete_namespace() {
    echo -e "${YELLOW}📁 Deleting namespace...${NC}"

    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        kubectl delete namespace ${NAMESPACE} --timeout=120s

        # Wait for namespace to be fully deleted
        echo "Waiting for namespace deletion to complete..."
        while kubectl get namespace ${NAMESPACE} &> /dev/null; do
            echo -n "."
            sleep 2
        done
        echo ""
        echo -e "${GREEN}✅ Namespace '${NAMESPACE}' deleted${NC}"
    else
        echo -e "${BLUE}ℹ️  Namespace '${NAMESPACE}' does not exist${NC}"
    fi
}

# Function to cleanup Docker images
cleanup_docker_images() {
    echo -e "${YELLOW}🐳 Cleaning up Docker images...${NC}"

    # Configure Docker to use Minikube's Docker daemon
    if minikube status &> /dev/null; then
        eval $(minikube docker-env)
    fi

    # Remove application images
    local images=(
        "${REGISTRY}/consumer-accounts-api:latest"
        "${REGISTRY}/consumer-accounts-app:latest"
        "${REGISTRY}/eopa-with-policies:latest"
    )

    for image in "${images[@]}"; do
        if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "${image}"; then
            echo "Removing image: ${image}"
            docker rmi "${image}" 2>/dev/null || echo "  - Image may be in use or already removed"
        else
            echo "  - Image not found: ${image}"
        fi
    done

    # Clean up dangling images
    echo "Removing dangling images..."
    docker image prune -f 2>/dev/null || echo "  - No dangling images to remove"

    echo -e "${GREEN}✅ Docker images cleaned up${NC}"
}

# Function to cleanup Minikube
cleanup_minikube() {
    echo -e "${YELLOW}⚙️  Cleaning up Minikube...${NC}"

    if minikube status &> /dev/null; then
        echo "Stopping Minikube..."
        minikube stop

        echo "Deleting Minikube cluster..."
        minikube delete
        echo -e "${GREEN}✅ Minikube cluster deleted${NC}"
    else
        echo -e "${BLUE}ℹ️  Minikube is not running${NC}"
    fi
}

# Function to cleanup temporary files
cleanup_temp_files() {
    echo -e "${YELLOW}🗂️  Cleaning up temporary files...${NC}"

    # Remove monitoring reports
    if ls monitoring-report-*.txt 1> /dev/null 2>&1; then
        echo "Removing monitoring reports..."
        rm -f monitoring-report-*.txt
    fi

    # Remove kubectl cache
    if [ -d ~/.kube/cache ]; then
        echo "Clearing kubectl cache..."
        rm -rf ~/.kube/cache
    fi

    # Remove Docker build cache
    echo "Cleaning Docker build cache..."
    docker builder prune -f 2>/dev/null || echo "  - Docker builder cache cleanup skipped"

    echo -e "${GREEN}✅ Temporary files cleaned up${NC}"
}

# Function to show current resource usage
show_current_resources() {
    echo -e "${BLUE}📊 Current Resource Status${NC}"
    echo "=========================="

    echo -e "${YELLOW}Namespaces:${NC}"
    kubectl get namespaces | grep ${NAMESPACE} || echo "  - No EA Financial namespace found"
    echo ""

    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        echo -e "${YELLOW}Pods in ${NAMESPACE}:${NC}"
        kubectl get pods -n ${NAMESPACE} 2>/dev/null || echo "  - No pods found"
        echo ""

        echo -e "${YELLOW}Services in ${NAMESPACE}:${NC}"
        kubectl get services -n ${NAMESPACE} 2>/dev/null || echo "  - No services found"
        echo ""

        echo -e "${YELLOW}Deployments in ${NAMESPACE}:${NC}"
        kubectl get deployments -n ${NAMESPACE} 2>/dev/null || echo "  - No deployments found"
        echo ""
    fi

    echo -e "${YELLOW}Docker Images:${NC}"
    if minikube status &> /dev/null; then
        eval $(minikube docker-env)
        docker images | grep ${REGISTRY} || echo "  - No EA Financial images found"
    else
        docker images | grep ${REGISTRY} || echo "  - No EA Financial images found"
    fi
    echo ""

    echo -e "${YELLOW}Minikube Status:${NC}"
    minikube status 2>/dev/null || echo "  - Minikube is not running"
    echo ""
}

# Function to show help
show_help() {
    echo -e "${BLUE}EA Financial Cleanup Script${NC}"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  resources           Clean up only Kubernetes resources (keep namespace)"
    echo "  namespace           Clean up resources and delete namespace"
    echo "  images              Clean up Docker images only"
    echo "  minikube            Stop and delete Minikube cluster"
    echo "  temp                Clean up temporary files"
    echo "  all                 Complete cleanup (resources + images + temp files)"
    echo "  nuclear             Nuclear cleanup (everything including Minikube)"
    echo "  status              Show current resource status"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Show current status"
    echo "  $0 resources                # Clean up K8s resources only"
    echo "  $0 all                      # Full application cleanup"
    echo "  $0 nuclear                  # Complete infrastructure reset"
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: Cleanup operations are destructive and cannot be undone!${NC}"
}

# Function to perform graceful resource cleanup
graceful_cleanup() {
    echo -e "${YELLOW}🕒 Performing graceful cleanup...${NC}"

    if kubectl get namespace ${NAMESPACE} &> /dev/null; then
        # Scale down deployments first
        echo "Scaling down deployments..."
        kubectl get deployments -n ${NAMESPACE} -o name | xargs -I {} kubectl scale {} --replicas=0 -n ${NAMESPACE} 2>/dev/null || true

        # Wait a moment for pods to terminate gracefully
        echo "Waiting for pods to terminate gracefully..."
        sleep 10

        # Check if any pods are still running
        local running_pods=$(kubectl get pods -n ${NAMESPACE} --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
        if [ "$running_pods" -gt 0 ]; then
            echo "Waiting for remaining $running_pods pods to terminate..."
            kubectl wait --for=delete pods --all -n ${NAMESPACE} --timeout=60s 2>/dev/null || true
        fi
    fi

    echo -e "${GREEN}✅ Graceful cleanup completed${NC}"
}

# Main execution
main() {
    local command=${1:-status}

    case $command in
        "resources")
            confirm_cleanup "delete all Kubernetes resources in namespace '${NAMESPACE}'"
            graceful_cleanup
            cleanup_k8s_resources
            show_current_resources
            ;;
        "namespace")
            confirm_cleanup "delete namespace '${NAMESPACE}' and all its resources"
            graceful_cleanup
            delete_namespace
            show_current_resources
            ;;
        "images")
            confirm_cleanup "delete all EA Financial Docker images"
            cleanup_docker_images
            show_current_resources
            ;;
        "minikube")
            confirm_cleanup "stop and delete the entire Minikube cluster"
            cleanup_minikube
            show_current_resources
            ;;
        "temp")
            cleanup_temp_files
            show_current_resources
            ;;
        "all")
            confirm_cleanup "perform complete application cleanup (K8s resources + Docker images + temp files)"
            graceful_cleanup
            cleanup_k8s_resources
            delete_namespace
            cleanup_docker_images
            cleanup_temp_files
            show_current_resources
            echo -e "${GREEN}🎉 Complete cleanup finished!${NC}"
            ;;
        "nuclear")
            confirm_cleanup "perform NUCLEAR cleanup (destroy everything including Minikube)"
            echo -e "${PURPLE}💥 Initiating nuclear cleanup...${NC}"
            graceful_cleanup
            cleanup_k8s_resources
            delete_namespace
            cleanup_docker_images
            cleanup_minikube
            cleanup_temp_files
            show_current_resources
            echo -e "${GREEN}☢️  Nuclear cleanup completed! Infrastructure destroyed.${NC}"
            ;;
        "status")
            show_current_resources
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}⚠️  Cleanup interrupted by user${NC}"; exit 130' INT

# Handle script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
