# EA Financial

This monorepo contains the code for the EA Financial, a fictional global bank serving as an example institution for demonstrating best practices in policy-as-code.

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
