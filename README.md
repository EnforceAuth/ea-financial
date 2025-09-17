# EA Financial

This monorepo contains the code for the EA Financial, a fictional global bank serving as an example institution for demonstrating best practices in policy-as-code with **fully integrated Open Policy Agent (OPA) authorization**.

## Quick Start - Access the App in Your Browser

### ⚡ Super Quick (One Command)
```bash
./app.sh
```
Opens the app instantly in your browser. This is the fastest way to get started!

### 🚀 Easy One-Click Access (Recommended)
```bash
./infra/scripts/open-app.sh
```
This will start port-forwarding and automatically open the app in your browser at `http://localhost:8080`.

### 🔗 Get URLs Only
```bash
./infra/scripts/get-urls.sh
```
Shows available URLs without starting persistent connections.

### 🎯 Full Development Server
```bash
./infra/scripts/start-app.sh
```
Starts both frontend and API with auto-restart and detailed logging. Includes:
- Frontend: `http://localhost:8080`
- API: `http://localhost:8081`
- Auto-opens browser
- Keeps running until Ctrl+C

### 🌉 Permanent Access (Alternative)
For persistent access without keeping a terminal open:
```bash
./infra/scripts/setup-tunnel.sh
```
Then access at:
- Frontend: `http://127.0.0.1:30000`
- API: `http://127.0.0.1:30001`

### 🛠️ More Options
```bash
./app.sh help     # Show all access options
./app.sh start    # Full development mode  
./app.sh urls     # Just show URLs
./app.sh tunnel   # Permanent access
./app.sh health   # Health checks
./app.sh monitor  # Live monitoring
```

### 💡 Demo Credentials
- **Manager**: `mjohnson` / `password456` (Full access)
- **Senior Rep**: `jsmith` / `password123` (Enhanced access)
- **Representative**: `rbrown` / `password789` (Read access)

## Structure

This monorepo is organized into the following top-level directories:

### `infra/opa/` - Authorization Module
Complete authorization system using Enterprise Open Policy Agent (EOPA):
- `policies/main.rego` - Main authorization policy with RBAC
- `data/users.json` - Demo users with roles/permissions
- See [infra/opa/README.md](infra/opa/README.md) for detailed documentation

### `infra/` - Infrastructure Configuration
Kubernetes deployments, Docker configurations, and management scripts:
- `k8s/` - Kubernetes manifests and ConfigMaps
- `opa/` - EOPA server configuration
- `scripts/` - Deployment and monitoring scripts
- See [infra/README.md](infra/README.md) for detailed documentation

### `projects/` - Application Services
Banking application services and APIs:
- `consumer-accounts-internal-api/` - Account management service
- Additional services as they are developed

## Quick Start

### Testing Authorization Policies

```bash
# Test health check (should allow)
eopa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/health"}}}') \
  'data.main.allow'

# Test manager access (should allow)
eopa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/accounts","headers":{"authorization":"Bearer mjohnson_token_456"}}}}') \
  'data.main.allow'
```

### Linting Policies

```bash
# Run regal linter on authorization policies
regal lint infra/opa/policies/main.rego
```

### Infrastructure Management

```bash
cd infra
./deploy.sh setup    # Initial setup
./deploy.sh start    # Start services
./monitor.sh status  # Check status
```

## Key Features

- **✅ OPA Integration**: Fully integrated Open Policy Agent authorization with real-time policy evaluation
- **🔐 Role-Based Access Control**: Hierarchical permission system (Manager → Senior Rep → Representative → Analyst)
- **📜 Policy-as-Code**: Authorization policies defined in Rego with comprehensive test coverage
- **🏗️ Kubernetes-Native**: Cloud-native deployment with OPA sidecar architecture
- **🧪 Development-Friendly**: Local testing, linting tools, and comprehensive test suite
- **📊 Compliance-Ready**: Complete audit logging and decision tracking for banking regulations
- **🔒 Production-Ready**: Enterprise-grade security with fail-safe defaults

## Recent Updates

**🎉 OPA Integration Complete!** The Consumer Accounts API now features:
- Real-time authorization through OPA policies
- Token-based authentication with OPA user data
- Comprehensive role-based permissions
- Complete audit trail for compliance
- Fail-safe security when OPA is unavailable
- Full test coverage for authorization flows

All API endpoints are now protected by OPA policies with fine-grained access control.

## Documentation

- [🔐 Authorization Module](infra/opa/README.md) - Detailed OPA authorization documentation
- [🌐 Consumer Accounts API](projects/consumer-accounts-internal-api/README.md) - **NEW: Complete OPA integration guide**
- [🏗️ Infrastructure Guide](infra/README.md) - Deployment and operations  
- [📋 Infrastructure Summary](infra/INFRASTRUCTURE_SUMMARY.md) - Technical overview

## Demo Credentials & Testing

The system includes demo credentials for testing different access levels:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Manager** | `mjohnson` | `password456` | Full access to all operations |
| **Senior Rep** | `jsmith` | `password123` | Transaction operations, no admin |
| **Representative** | `rbrown` | `password789` | Read-only access |
| **Analyst** | `slee` | `password000` | Inactive user (access denied) |

### Quick API Test
```bash
# Test the OPA integration
cd projects/consumer-accounts-internal-api
./scripts/test-opa-integration.sh

# Or test without OPA (offline mode)
./scripts/test-integration-offline.sh
```
