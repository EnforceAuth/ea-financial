# EA Financial

This monorepo contains the code for the EA Financial, a fictional global bank serving as an example institution for demonstrating best practices in policy-as-code.

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

- **Policy-as-Code**: Authorization policies defined in Rego
- **Role-Based Access Control**: Hierarchical permission system
- **Kubernetes-Native**: Cloud-native deployment architecture
- **Development-Friendly**: Local testing and linting tools
- **Compliance-Ready**: Audit logging and decision tracking

## Documentation

- [Authorization Module](infra/opa/README.md) - Detailed authz documentation
- [Infrastructure Guide](infra/README.md) - Deployment and operations
- [Infrastructure Summary](infra/INFRASTRUCTURE_SUMMARY.md) - Technical overview
