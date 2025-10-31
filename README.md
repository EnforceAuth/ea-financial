# EA Financial

This monorepo contains the code for the EA Financial, a fictional global bank serving as an example institution for demonstrating best practices in policy-as-code with **fully integrated Open Policy Agent (OPA) authorization**.

## 🚀 Quick Start

The EA Financial application requires an authorization service (OPA) to run properly. The new integrated launcher makes this simple:

### Install Dependencies
- `bun`: [https://bun.com/docs/installation](https://bun.com/docs/installation)
- `opa`: homebrew?  build from source [https://github.com/open-policy-agent/opa](https://github.com/open-policy-agent/opa)
- `eopa`: homebrew?  build from source [https://github.com/open-policy-agent/eopa](https://github.com/open-policy-agent/eopa)
- `regal`: homebrew?  build from source [https://github.com/open-policy-agent/regal](https://github.com/open-policy-agent/regal)

example:
```bash
# macOS
brew install open-policy-agent/opa/opa

# Linux/WSL
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
chmod +x opa && sudo mv opa /usr/local/bin/
```


### ⚡ One-Command Start (Recommended)

```bash
# Start with standard OPA authorization
./app.sh opa

# OR start with Enterprise OPA
./app.sh eopa
```

This starts the authorization service and provides instructions for the API and frontend.

**Note**: OPA fetches policy bundles from S3. Create a `.env` file with your AWS credentials:
```bash
cp .env.example .env
# Add your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
```

### 🔍 Check System Status
```bash
./app.sh status
```
Shows the status of all services (Authorization, API, Frontend).

### 🏗️ Full Development Environment
```bash
# Start everything with OPA
./app.sh dev opa

# OR start everything with Enterprise OPA
./app.sh dev eopa
```

Then in separate terminals:
```bash
# Terminal 2: Start API
cd projects/consumer-accounts-internal-api
bun run dev

# Terminal 3: Start Frontend  
cd projects/consumer-accounts-internal-app
npm run dev
```

Visit: **http://localhost:3000**

### 🎯 Demo Credentials

- **Manager**: `mjohnson` / `password456` (Full Access)
- **Senior Rep**: `jsmith` / `password123` (Enhanced Access)
- **Representative**: `rbrown` / `password789` (Standard Access)
- **Analyst**: `slee` / `password000` (Read-Only, Inactive)

### 🛠️ Legacy Access Options
```bash
./app.sh help     # Show all access options
./app.sh stop     # Stop all services
./app.sh urls     # Just show URLs (legacy)
./app.sh tunnel   # Permanent access (legacy)
./app.sh health   # Health checks (legacy)
./app.sh monitor  # Live monitoring (legacy)
```

## 🔒 Authorization System

EA Financial uses **Open Policy Agent (OPA)** for comprehensive authorization:

### Authorization Services

- **OPA** (`./app.sh opa`): Standard Open Policy Agent for production-like authorization
- **Enterprise OPA** (`./app.sh eopa`): Enhanced OPA with detailed audit logging and debugging

### Security Features

- ✅ **Role-Based Access Control (RBAC)** - Manager, Senior Rep, Representative, Analyst roles  
- ✅ **Token-Based Authentication** - JWT-like tokens for API access
- ✅ **Policy-as-Code** - Authorization rules defined in Rego policies
- ✅ **Real-time Authorization** - Every API request is authorized through OPA
- ✅ **Audit Logging** - Complete decision logs for compliance (EOPA mode)
- ✅ **Graceful Degradation** - Login is properly disabled when OPA is unavailable

### System Integration

The banking application **requires** OPA to be running for proper security:

- **Login fails** when OPA is unavailable (prevents false sense of security)
- **All protected endpoints** require OPA authorization 
- **Frontend shows system status** to help users understand service availability
- **Comprehensive error handling** with clear messages about authorization issues

## Structure

This monorepo is organized into the following top-level directories:

### `infra/opa/` - Authorization Module
Complete authorization system using Open Policy Agent (OPA):
- `policies/main.rego` - Main authorization policy with RBAC
- `data/users.json` - Demo users with roles/permissions  
- `config/` - OPA server configuration files
- See [infra/opa/README.md](infra/opa/README.md) for detailed documentation

### `infra/` - Infrastructure Configuration
Kubernetes deployments, Docker configurations, and management scripts:
- `k8s/` - Kubernetes manifests and ConfigMaps
- `opa/` - Open Policy Agent server configuration (fetches bundles from S3)
- `scripts/` - Deployment scripts (`setup.sh`, `deploy.sh`, `monitor.sh`, `cleanup.sh`)
- `docker-compose.dev.yml` - Full dev stack with Traefik, Redis, PostgreSQL, Prometheus, Grafana
- See [infra/README.md](infra/README.md) for detailed documentation

### `projects/` - Application Services
Banking application services and APIs:
- `consumer-accounts-internal-api/` - Backend API with OPA integration
- `consumer-accounts-internal-app/` - React frontend application
- Additional services as they are developed

## 🧪 Testing & Development

### Testing Authorization Policies

```bash
# Test health check (public endpoint - should allow)
opa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/health"}}}') \
  'data.main.allow'

# Test login endpoint (should allow)
opa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"POST","path":"/auth/login"}}}') \
  'data.main.allow'

# Test manager access to accounts (should allow)
opa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/accounts/acc_001","headers":{"authorization":"Bearer mjohnson_token_456"}}}}') \
  'data.main.allow'

# Test unauthorized access (should deny)
opa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/accounts/acc_001"}}}') \
  'data.main.allow'
```

### Live Testing with Running Services

```bash
# Start OPA and test endpoints
./app.sh opa

# Test API health (should show OPA as operational)
curl http://localhost:3001/health | jq .

# Test login (should succeed when OPA is running)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mjohnson","password":"password456"}' | jq .

# Test protected endpoint (requires token)
curl -H "Authorization: Bearer mjohnson_token_456" \
  http://localhost:3001/accounts/acc_001/balance | jq .
```

### Linting Policies

```bash
# Run regal linter on authorization policies (if regal is installed)
regal lint infra/opa/policies/main.rego

# Alternative: Use OPA's built-in formatter
opa fmt infra/opa/policies/main.rego
```

## 🚨 Troubleshooting

Having issues? Check the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) guide for:

- Authorization service unavailable errors
- System status checks  
- Common startup issues
- Manual service management
- Security notes and best practices

### Quick Diagnostics

```bash
# Check all service status
./app.sh status

# Stop all services and restart
./app.sh stop
./app.sh opa    # or ./app.sh eopa

# View detailed help
./app.sh help
```

## 🌟 Key Features

### 🔐 Authorization & Security
- **Full OPA Integration**: Real-time authorization through Open Policy Agent policies
- **Role-Based Access Control**: Hierarchical permissions (Manager → Senior Rep → Representative → Analyst)
- **Token-Based Authentication**: JWT-like tokens validated through OPA
- **Policy-as-Code**: Authorization rules defined in Rego with version control
- **Fail-Safe Security**: Login disabled when authorization service is unavailable
- **Audit Logging**: Complete decision trails for banking compliance (EOPA mode)

### 🏦 Banking Operations
- **Account Management**: View accounts, balances, and transaction history
- **Transaction Processing**: Credit/debit operations with authorization checks
- **Terms & Policies**: Access to banking terms and regulatory information
- **Multi-Role Support**: Different access levels for different employee types
- **Real-Time Validation**: Every operation authorized in real-time

### 🛠️ Developer Experience
- **Integrated Launcher**: One-command startup with `./app.sh`
- **System Status Dashboard**: Real-time service health monitoring
- **Comprehensive Testing**: OPA policy testing and API integration tests
- **Hot Reloading**: Development servers with automatic restart
- **Clear Error Messages**: Detailed feedback for authorization issues

### 🚀 Architecture Highlights
- **React Frontend**: Modern TypeScript React app with system status integration
- **Bun-Powered API**: High-performance API server with OPA middleware
- **Policy Engine**: Dedicated OPA service with banking-specific policies  
- **Graceful Degradation**: Clear user feedback when services are unavailable
- **Monorepo Structure**: Organized codebase with shared tooling and scripts

## 📈 Recent Updates

**🎉 Major Security Enhancement (v2.0)**: 
- **Login Security**: Login now properly fails when OPA is unavailable (prevents false authentication)
- **System Status UI**: Frontend shows real-time authorization service status
- **Enhanced Error Handling**: Clear messages when authorization services are down
- **Integrated Launcher**: New `./app.sh` with OPA and EOPA support
- **Comprehensive Docs**: Updated troubleshooting and setup guides

**Previous Updates**:
- Complete OPA integration with real-time policy evaluation
- Token-based authentication with OPA user data validation
- Role-based permissions with hierarchical access control
- Audit logging and compliance-ready decision tracking

## Documentation

- [🔐 Authorization Module](infra/opa/README.md) - Detailed OPA authorization documentation
- [🌐 Consumer Accounts API](projects/consumer-accounts-internal-api/README.md) - Complete OPA integration guide
- [🏗️ Infrastructure Guide](infra/README.md) - Deployment and operations

## 👥 Demo Credentials & Testing

The system includes demo credentials for testing different access levels:

| Role | Username | Password | Access Level | Description |
|------|----------|----------|--------------|-------------|
| **Manager** | `mjohnson` | `password456` | Full access | All banking operations + admin functions |
| **Senior Rep** | `jsmith` | `password123` | Enhanced access | Transaction operations, no admin access |
| **Representative** | `rbrown` | `password789` | Standard access | Read-only account and transaction viewing |
| **Analyst** | `slee` | `password000` | Inactive | Account disabled (tests access denial) |

### 🧪 Testing Scenarios

- **Authentication Flow**: Test login with/without OPA running
- **Authorization Matrix**: Each role has different endpoint access
- **System Resilience**: Observe behavior when OPA service is down  
- **Error Handling**: Clear messages for different failure modes
- **Audit Trail**: EOPA mode provides detailed authorization logs

---

*EA Financial is a demonstration banking application showcasing enterprise-grade authorization with Open Policy Agent.*


