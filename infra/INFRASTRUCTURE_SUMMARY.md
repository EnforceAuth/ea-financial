# EA Financial - Infrastructure Summary

This document provides a complete overview of the infrastructure setup created for the EA Financial Consumer Accounts system.

## 🎯 Infrastructure Overview

The infrastructure provides a complete Kubernetes-based deployment on Minikube with:
- **Centralized Authorization** via EOPA (Enterprise Open Policy Agent) sidecars
- **Containerized Applications** with Docker
- **Service Mesh Ready** architecture
- **Security-First** design with network policies
- **Monitoring & Observability** built-in
- **Development-Friendly** tooling and scripts

## 📋 Created Files and Components

### 🏗️ Core Infrastructure (`/infra/`)

#### Kubernetes Manifests (`/k8s/`)
- **`api-deployment.yaml`** - API deployment with EOPA sidecar (2 replicas)
- **`app-deployment.yaml`** - React frontend deployment (2 replicas)
- **`configmaps.yaml`** - EOPA policies and data configuration
- **`ingress.yaml`** - Nginx ingress with multiple domains
- **`network-policies.yaml`** - Security policies (default deny, selective allow)
- **`hpa.yaml`** - Horizontal Pod Autoscaler for both services

#### EOPA Configuration (`/opa/`)
- **`Dockerfile`** - EOPA container with embedded policies
- **`config/opa-config.yaml`** - EOPA server configuration
- **`policies/main.rego`** - Main authorization policy (272 lines)
- **`data/users.json`** - Demo users with roles and permissions

#### Management Scripts (`/scripts/`)
- **`setup.sh`** - Complete infrastructure setup (220 lines)
- **`deploy.sh`** - Application deployment management (307 lines)
- **`monitor.sh`** - Monitoring and testing dashboard (418 lines)
- **`cleanup.sh`** - Infrastructure cleanup and reset (337 lines)

#### Alternative Development (`/`)
- **`docker-compose.dev.yml`** - Full stack with monitoring (336 lines)
- **`README.md`** - Comprehensive documentation (429 lines)
- **`INFRASTRUCTURE_SUMMARY.md`** - This file

### 🐳 Application Dockerfiles

#### API Service
- **`projects/consumer-accounts-internal-api/Dockerfile`** - Production Bun/Elysia container

#### Frontend Service
- **`projects/consumer-accounts-internal-app/Dockerfile`** - Production Nginx container
- **`projects/consumer-accounts-internal-app/Dockerfile.dev`** - Development container
- **`projects/consumer-accounts-internal-app/nginx.conf`** - Nginx configuration with API proxy

## 🔐 Authorization Architecture

### EOPA Policy Engine
- **Default Deny**: Fail-secure authorization model
- **Token-Based**: Bearer token authentication
- **Role-Based Access Control**: 4-tier permission hierarchy
- **Resource Mapping**: URL-to-permission mapping
- **Account-Level**: User-specific account access control
- **Audit Logging**: Decision tracking for compliance

### User Roles & Permissions
```
Manager (Level 4)          → Full administrative access
Senior Representative (3)  → Enhanced customer service + transactions
Representative (Level 2)   → Standard customer service (read-only)
Analyst (Level 1)         → Analytics and reporting only
```

### Demo Users
```
Username  | Role                | Token              | Status
----------|--------------------|--------------------|--------
jsmith    | Senior Representative| jsmith_token_123   | Active
mjohnson  | Manager            | mjohnson_token_456 | Active
rbrown    | Representative     | rbrown_token_789   | Active
slee      | Analyst            | slee_token_000     | Inactive
```

## 🚀 Deployment Architecture

### Minikube Cluster
```
┌─────────────────────────────────────────────────────────┐
│                    Minikube Cluster                     │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │   Frontend      │    │        Backend           │   │
│  │   (React)       │◄───┤     (Bun/Elysia)        │   │
│  │   :30000        │    │       :30001             │   │
│  │                 │    │  ┌─────────────────────┐ │   │
│  └─────────────────┘    │  │  EOPA Sidecar      │ │   │
│                         │  │   (Policies)       │ │   │
│                         │  │     :30002         │ │   │
│                         │  └─────────────────────┘ │   │
│                         └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Port Mapping
- **30000**: Frontend Application
- **30001**: API Service
- **30002**: EOPA Policy API

### Internal Services
- **ClusterIP Services**: Internal cluster communication
- **NodePort Services**: External access via Minikube IP
- **Ingress Controller**: Domain-based routing

## 🛠️ Management Commands

### Quick Start
```bash
cd infra/scripts
./setup.sh              # Complete infrastructure setup
./monitor.sh dashboard   # Live monitoring dashboard
./deploy.sh status       # Check deployment status
```

### Common Operations
```bash
# Deployment
./deploy.sh                           # Deploy applications
./deploy.sh restart                   # Restart all services
./deploy.sh scale consumer-accounts-api 5  # Scale API

# Monitoring
./monitor.sh test-opa                 # Test EOPA authorization
./monitor.sh test-api                 # Test API endpoints
./monitor.sh logs api                 # View API logs
./monitor.sh load-test 60 20          # Load test (60s, 20 concurrent)

# Cleanup
./cleanup.sh status                   # Show current resources
./cleanup.sh all                      # Complete cleanup
./cleanup.sh nuclear                  # Destroy everything
```

## 📊 Resource Configuration

### Container Resources
| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| API       | 250m        | 500m      | 256Mi          | 512Mi        |
| Frontend  | 100m        | 200m      | 128Mi          | 256Mi        |
| EOPA      | 100m        | 200m      | 128Mi          | 256Mi        |

### Auto-Scaling (HPA)
| Service   | Min | Max | CPU Target | Memory Target |
|-----------|-----|-----|------------|---------------|
| API       | 2   | 10  | 70%        | 80%           |
| Frontend  | 2   | 8   | 60%        | 70%           |

## 🔒 Security Features

### Network Security
- **Default Deny All**: Network policies block all traffic by default
- **Selective Allow**: Only required communication paths permitted
- **Pod Security Context**: Non-root users, read-only filesystems
- **Security Headers**: Comprehensive HTTP security headers

### Authorization Security
- **Fail-Secure**: Default deny with explicit allow rules
- **Token Validation**: Proper JWT format checking
- **Session Management**: Time-based access controls
- **Audit Trail**: Complete decision logging

### Container Security
- **Non-Root Execution**: All containers run as unprivileged users
- **Minimal Attack Surface**: Alpine-based images where possible
- **Capability Dropping**: Unnecessary Linux capabilities removed
- **Health Checks**: Comprehensive liveness and readiness probes

## 📈 Monitoring & Observability

### Built-in Monitoring
- **Health Checks**: All services have `/health` endpoints
- **Resource Metrics**: CPU/Memory usage tracking
- **Decision Logging**: EOPA authorization decisions
- **Performance Testing**: Built-in load testing capabilities

### Monitoring Dashboard Features
- Real-time service health status
- Resource utilization graphs
- Pod status and events
- Authorization decision testing
- API endpoint validation
- Load testing capabilities
- Monitoring report generation

### Alternative Stack (Docker Compose)
The `docker-compose.dev.yml` provides a complete development stack:
- **Traefik**: Reverse proxy with automatic service discovery
- **Redis**: Session storage and caching
- **PostgreSQL**: Optional data persistence
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **Loki/Promtail**: Log aggregation

## 🎯 Key Benefits

### For Development
- **One-Command Setup**: Complete infrastructure in minutes
- **Hot Reload**: Development containers with live reloading
- **Comprehensive Testing**: Built-in authorization and API testing
- **Real-time Monitoring**: Live dashboard with multiple views

### For Operations
- **Production-Ready**: Security and scaling built-in
- **Policy Management**: Centralized authorization rules
- **Observability**: Complete monitoring and logging
- **Easy Cleanup**: Safe environment reset capabilities

### for Security
- **Zero Trust**: Default deny network policies
- **Centralized AuthZ**: All authorization through EOPA
- **Audit Compliance**: Complete decision logging
- **Policy as Code**: Version-controlled authorization rules

## 📚 Usage Examples

### Testing Authorization Scenarios
```bash
# Test manager access (should allow)
./monitor.sh test-opa

# Test specific endpoint
curl -X POST http://$(minikube ip):30002/v1/data/ea_financial/authz/allow \
  -H "Content-Type: application/json" \
  -d '{"input":{"request":{"http":{"method":"GET","path":"/accounts/ACC001","headers":{"authorization":"Bearer jsmith_token_123"}}}}}'
```

### Scaling for Load
```bash
# Scale API for high load
./deploy.sh scale consumer-accounts-api 8

# Run load test
./monitor.sh load-test 300 50

# Monitor scaling behavior
watch kubectl get hpa -n ea-financial
```

### Policy Updates
```bash
# Edit policy files in infra/opa/policies/
# Update user data in infra/opa/data/
./deploy.sh update-policies
./monitor.sh test-opa
```

## 🏁 Next Steps

1. **Deploy Infrastructure**: Run `./setup.sh` to get started
2. **Explore Monitoring**: Use `./monitor.sh dashboard` for real-time view
3. **Test Authorization**: Run `./monitor.sh test-opa` to verify EOPA policies
4. **Customize Policies**: Edit files in `infra/opa/` as needed
5. **Scale as Needed**: Use HPA or manual scaling commands

This infrastructure provides a robust, secure, and scalable foundation for the EA Financial Consumer Accounts system with centralized authorization, comprehensive monitoring, and production-ready security features.