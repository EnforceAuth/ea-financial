# EA Financial - Infrastructure Documentation

This directory contains all infrastructure configuration and deployment scripts for the EA Financial Consumer Accounts system running on Minikube with EOPA (Enterprise Open Policy Agent) sidecars for centralized authorization.

## 🏗️ Architecture Overview

The infrastructure provides:
- **Kubernetes deployment** on Minikube for local development
- **EOPA sidecars** for centralized authorization and policy management
- **Containerized applications** with Docker
- **Network security** with Kubernetes Network Policies
- **Monitoring and scaling** with HPA and resource management
- **Service mesh ready** architecture with sidecar patterns

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Minikube Cluster                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   Frontend      │    │           Backend            │   │
│  │   (React App)   │◄───┤      (Bun/Elysia API)       │   │
│  │   Port: 3000    │    │       Port: 3001             │   │
│  │                 │    │                              │   │
│  └─────────────────┘    │  ┌─────────────────────────┐ │   │
│                         │  │    EOPA Sidecar        │ │   │
│                         │  │   (Policy Engine)      │ │   │
│                         │  │     Port: 8181         │ │   │
│                         │  └─────────────────────────┘ │   │
│                         └──────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Kubernetes Services                     │
│  • NodePort Services (30000, 30001, 30002)                │
│  • ClusterIP Services (Internal Communication)             │
│  • Ingress Controller (nginx)                              │
│  • Network Policies (Security)                             │
│  • HPA (Auto-scaling)                                      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
infra/
├── README.md                   # This file
├── k8s/                       # Kubernetes manifests
│   ├── api-deployment.yaml    # API deployment with EOPA sidecar
│   ├── app-deployment.yaml    # Frontend deployment
│   ├── configmaps.yaml        # ConfigMaps for EOPA policies/data
│   ├── ingress.yaml           # Ingress configuration
│   ├── network-policies.yaml  # Network security policies
│   └── hpa.yaml               # Horizontal Pod Autoscaler
├── opa/                       # EOPA configuration and policies
│   ├── Dockerfile             # EOPA container with policies
│   ├── config/                # EOPA server configuration
│   ├── policies/              # Rego policy files
│   └── data/                  # Policy data (users, roles, etc.)
└── scripts/                   # Automation scripts
    ├── setup.sh               # Initial infrastructure setup
    ├── deploy.sh              # Application deployment
    ├── monitor.sh             # Monitoring and testing
    └── cleanup.sh             # Infrastructure cleanup
```

## 🚀 Quick Start

### Prerequisites

Ensure you have the following tools installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- curl (for testing)

### 1. Initial Setup

Run the setup script to initialize the complete infrastructure:

```bash
cd infra/scripts
chmod +x *.sh
./setup.sh
```

This will:
- Start Minikube with appropriate resources
- Create the `ea-financial` namespace
- Build all Docker images
- Deploy EOPA policies and configurations
- Deploy both applications with sidecars
- Configure networking and security policies

### 2. Access Applications

After successful deployment:

- **Frontend App**: http://MINIKUBE_IP:30000
- **API Service**: http://MINIKUBE_IP:30001
- **EOPA Policy API**: http://MINIKUBE_IP:30002

Get your Minikube IP:
```bash
minikube ip
```

### 3. Monitor and Test

Use the monitoring script for real-time dashboard and testing:

```bash
./monitor.sh dashboard    # Live monitoring dashboard
./monitor.sh test-opa     # Test EOPA authorization policies
./monitor.sh test-api     # Test API endpoints
```

## 🔐 EOPA Authorization

### Policy Architecture

The system implements a comprehensive authorization layer using EOPA with the following features:

#### Policy Structure
- **Package**: `main`
- **Main Decision**: `allow` (boolean)
- **Default**: Deny all (fail-secure)

#### Authorization Flow
1. **Token Extraction**: Bearer token from Authorization header
2. **Token Validation**: Format and expiration checks
3. **Claims Resolution**: User permissions and role mapping
4. **Resource Mapping**: URL path to resource/action mapping
5. **Permission Check**: User permissions vs required permissions
6. **Role-based Access**: Hierarchical role permissions
7. **Account Access**: User-specific account assignments

#### User Roles and Permissions

| Role | Level | Permissions | Description |
|------|-------|-------------|-------------|
| **Manager** | 4 | Full access | Complete administrative access |
| **Senior Representative** | 3 | Most operations | Enhanced customer service with transaction rights |
| **Representative** | 2 | Read-only + basic ops | Standard customer service |
| **Analyst** | 1 | Read-only reports | Analytics and reporting only |

#### Demo Users

| Username | Password | Role | Token | Status |
|----------|----------|------|-------|---------|
| `jsmith` | `password123` | Senior Representative | `jsmith_token_123` | Active |
| `mjohnson` | `password456` | Manager | `mjohnson_token_456` | Active |
| `rbrown` | `password789` | Representative | `rbrown_token_789` | Active |
| `slee` | `password000` | Analyst | `slee_token_000` | Inactive |

### Testing Authorization

Test EOPA policies using the monitor script:

```bash
./monitor.sh test-opa
```

Or manually test authorization:

```bash
# Test valid user access
curl -X POST http://MINIKUBE_IP:30002/v1/data/ea_financial/authz/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "request": {
        "http": {
          "method": "GET",
          "path": "/accounts/ACC001",
          "headers": {
            "authorization": "Bearer jsmith_token_123"
          }
        }
      }
    }
  }'
```

### Customizing Policies

1. **Edit Policy Files**: Modify files in `infra/opa/policies/`
2. **Update User Data**: Modify files in `infra/opa/data/`
3. **Redeploy Policies**: Run `./deploy.sh update-policies`

## 🛠️ Management Scripts

### Setup Script (`setup.sh`)

Initial infrastructure setup and configuration:

```bash
./setup.sh              # Full setup
./setup.sh clean         # Clean existing resources
./setup.sh build-only    # Build images only
```

### Deploy Script (`deploy.sh`)

Application deployment and management:

```bash
./deploy.sh              # Deploy applications
./deploy.sh build        # Build images only
./deploy.sh restart      # Restart deployments
./deploy.sh status       # Show deployment status
./deploy.sh logs api     # Tail API logs
./deploy.sh scale consumer-accounts-api 3  # Scale API to 3 replicas
./deploy.sh update-policies  # Update EOPA policies
```

### Monitor Script (`monitor.sh`)

Monitoring, testing, and diagnostics:

```bash
./monitor.sh dashboard   # Live monitoring dashboard
./monitor.sh health      # Check service health
./monitor.sh test-opa    # Test EOPA authorization policies
./monitor.sh test-api    # Test API endpoints
./monitor.sh logs all    # Monitor all logs
./monitor.sh load-test 60 20  # Load test (60s, 20 concurrent)
./monitor.sh report      # Generate monitoring report
```

### Cleanup Script (`cleanup.sh`)

Infrastructure cleanup and reset:

```bash
./cleanup.sh status      # Show current resources
./cleanup.sh resources   # Clean K8s resources only
./cleanup.sh all         # Complete cleanup
./cleanup.sh nuclear     # Destroy everything including Minikube
```

## 🔧 Configuration

### Environment Variables

The system uses the following environment variables:

#### API Container
- `NODE_ENV`: Environment mode (production)
- `PORT`: API port (3001)
- `OPA_URL`: EOPA sidecar URL (http://localhost:8181)
- `LOG_LEVEL`: Logging level (info)

#### Frontend Container
- `NODE_ENV`: Environment mode (production)
- `REACT_APP_API_URL`: Backend API URL
- `NGINX_WORKER_PROCESSES`: Nginx worker processes

#### EOPA Container
- `OPA_LOG_LEVEL`: EOPA logging level (info)
- `OPA_LOG_FORMAT`: Log format (json)

### Resource Limits

Default resource allocation per container:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| API | 250m | 500m | 256Mi | 512Mi |
| Frontend | 100m | 200m | 128Mi | 256Mi |
| EOPA | 100m | 200m | 128Mi | 256Mi |

### Scaling Configuration

HPA (Horizontal Pod Autoscaler) settings:

| Component | Min Replicas | Max Replicas | CPU Target | Memory Target |
|-----------|--------------|--------------|------------|---------------|
| API | 2 | 10 | 70% | 80% |
| Frontend | 2 | 8 | 60% | 70% |

## 🔒 Security Features

### Network Policies

- **Default Deny**: All traffic denied by default
- **Selective Allow**: Only required communication permitted
- **Ingress Control**: Controlled external access
- **Pod-to-Pod**: Restricted inter-pod communication

### Pod Security

- **Non-root Users**: All containers run as non-root
- **Read-only Filesystem**: Where applicable
- **Security Context**: Proper security contexts applied
- **Capability Dropping**: Unnecessary capabilities removed

### EOPA Security

- **Fail-secure**: Default deny policy
- **Token Validation**: Proper JWT validation (mock in demo)
- **Role-based Access**: Hierarchical permission model
- **Audit Logging**: Decision logging for compliance
- **Policy Separation**: Policies and data separated

## 📊 Monitoring and Observability

### Health Checks

All components include:
- **Liveness Probes**: Container restart on failure
- **Readiness Probes**: Traffic routing control
- **Health Endpoints**: Dedicated health check endpoints

### Metrics and Logging

- **Structured Logging**: JSON formatted logs
- **Prometheus Metrics**: Ready for metrics collection
- **Decision Logging**: EOPA decision audit trail
- **Performance Metrics**: Resource usage tracking

### Monitoring Dashboard

Real-time monitoring includes:
- Service health status
- Resource utilization
- Pod status and events
- Authorization decisions
- Performance metrics
- Load testing capabilities

## 🚨 Troubleshooting

### Common Issues

#### Minikube Not Starting
```bash
minikube delete
minikube start --driver=docker --memory=8192 --cpus=4
```

#### Images Not Found
```bash
eval $(minikube docker-env)
./setup.sh build-only
```

#### Pods Not Ready
```bash
kubectl describe pods -n ea-financial
kubectl logs -f deployment/consumer-accounts-api -n ea-financial
```

#### EOPA Authorization Failing
```bash
./monitor.sh test-opa
kubectl logs -f -l app=consumer-accounts-api -c opa -n ea-financial
```

### Debug Commands

```bash
# Check all resources
kubectl get all -n ea-financial

# Describe problematic pods
kubectl describe pod POD_NAME -n ea-financial

# Check events
kubectl get events -n ea-financial --sort-by=.firstTimestamp

# Test EOPA directly
curl -X POST http://$(minikube ip):30002/v1/data/ea_financial/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input": {"request": {"http": {"method": "GET", "path": "/health"}}}}'

# Port forward for local testing
kubectl port-forward svc/consumer-accounts-api 3001:3001 -n ea-financial
```

## 🔄 Development Workflow

### Making Changes

1. **Code Changes**: Modify application code in `projects/`
2. **Policy Changes**: Update EOPA policies in `infra/opa/`
3. **Rebuild**: Run `./deploy.sh build`
4. **Deploy**: Run `./deploy.sh`
5. **Test**: Run `./monitor.sh test-api` and `./monitor.sh test-opa`

### Updating Policies

1. Edit policy files in `infra/opa/policies/`
2. Edit data files in `infra/opa/data/`
3. Run `./deploy.sh update-policies`
4. Test with `./monitor.sh test-opa`

### Scaling for Load

```bash
# Manual scaling
./deploy.sh scale consumer-accounts-api 5

# Load testing
./monitor.sh load-test 300 50  # 5 minutes, 50 concurrent

# Monitor scaling
watch kubectl get hpa -n ea-financial
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Open Policy Agent Documentation](https://www.openpolicyagent.org/docs/)
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Rego Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)

## 🤝 Contributing

When contributing to the infrastructure:

1. Test all changes locally with `./monitor.sh`
2. Update relevant documentation
3. Ensure security policies remain intact
4. Test authorization scenarios thoroughly
5. Verify resource limits and scaling behavior

## 📄 License

This infrastructure configuration is part of the EA Financial project and is subject to the same licensing terms as the main project.