# Authorization (AuthZ) Module

This directory contains all authorization policies and related data for the EA Financial application.

## Structure

```
infra/opa/
├── README.md                           # This file
├── Dockerfile                          # EOPA container configuration
├── config/
│   └── opa-config.yaml                 # EOPA server configuration
├── data/
│   └── users.json                      # Demo user data with roles and permissions
└── policies/
    └── main.rego                       # Main authorization policy
```

## Overview

The authorization system uses Enterprise Open Policy Agent (EOPA) to enforce access control policies. It implements:

- **Role-Based Access Control (RBAC)** with hierarchical permissions
- **Resource-based permissions** for fine-grained access control
- **JWT token validation** and claims extraction
- **Time-based access controls** for banking hours
- **Audit logging** for compliance tracking

## Policy Package

- **Package**: `main`
- **Main Decision**: `allow` (boolean)
- **Entry Point**: `data.main.allow`

## Roles and Permissions

### Role Hierarchy
1. **Manager** (Level 4) - Full access to all operations
2. **Senior Representative** (Level 3) - Enhanced access, no admin operations
3. **Representative** (Level 2) - Standard customer service access
4. **Analyst** (Level 1) - Read-only analytics access

### Permission Format
Permissions follow the pattern: `resource:action`

**Resources**: `accounts`, `transactions`, `balance`, `credit`, `debit`, `terms`, `auth`, `admin`
**Actions**: `read`, `create`, `update`, `delete`

## Demo Users

| Username | Role | Status | Token | Permissions |
|----------|------|--------|-------|-------------|
| mjohnson | manager | active | mjohnson_token_456 | Full access |
| jsmith | senior_representative | active | jsmith_token_123 | Enhanced access |
| rbrown | representative | active | rbrown_token_789 | Standard access |
| slee | analyst | inactive | slee_token_000 | Read-only (inactive) |

## Usage

### Testing Policies Locally

```bash
# Test health check (should allow)
eopa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/health"}}}') \
  'data.main.allow'

# Test manager access (should allow)
eopa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/accounts","headers":{"authorization":"Bearer mjohnson_token_456"}}}}') \
  'data.main.allow'

# Test inactive user (should deny)
eopa eval -d infra/opa/policies/main.rego -d infra/opa/data/users.json \
  --input <(echo '{"request":{"http":{"method":"GET","path":"/accounts","headers":{"authorization":"Bearer slee_token_000"}}}}') \
  'data.main.allow'
```

### Linting

```bash
# Run regal linter
regal lint infra/opa/policies/main.rego
```

### Format Policy

```bash
# Format with EOPA
eopa fmt infra/opa/policies/main.rego
```

## Policy Rules

### Allow Rules
1. **Public endpoints**: `/health`, `/status`, `/` (GET), OPTIONS requests
2. **Authenticated users**: Valid token + active status + specific permission
3. **Managers**: Full access to everything
4. **Senior representatives**: All operations except admin functions

### Deny Rules (Default)
- No token provided
- Invalid token format
- Inactive user
- Insufficient permissions
- Admin operations for non-managers

### Token Validation
- **Format**: Bearer token in Authorization header
- **Validation**: Non-empty string (mock implementation)
- **Claims**: Extracted from user data lookup
- **Production**: Should implement proper JWT signature validation

## Business Rules

### Banking Hours
- **Standard hours**: 6 AM - 10 PM
- **Management**: 24/7 access
- **Analytics**: 8 AM - 6 PM

### Account Access
- Users can only access accounts in their assigned list
- Managers can access any account
- Account assignments defined in `user_accounts` data

### Admin Operations
- DELETE requests to any endpoint
- Any requests to `/admin` paths
- Only managers allowed

## Compliance & Auditing

The policy generates decision logs with:
- Timestamp
- User identity
- Resource and action
- Decision result
- Reason for decision

## Development

### Adding New Permissions
1. Update user permissions in `data/users.json`
2. Add resource mapping in `route_to_resource()` function
3. Test with sample requests

### Adding New Roles
1. Define role in `data/users.json` under `roles`
2. Add role-based rules in policy
3. Update documentation

### Modifying Business Rules
1. Edit policy rules in `main.rego`
2. Run tests to verify changes
3. Update this documentation

## Configuration

The authorization module uses `.regal.yaml` at the project root for linting configuration:

```yaml
rules:
  idiomatic:
    directory-package-mismatch:
      level: ignore
  style:
    pointless-reassignment:
      level: ignore
    messy-rule:
      level: ignore
```

## Deployment

The policies and data are deployed via Kubernetes ConfigMaps in the infrastructure configuration. See `infra/k8s/configmaps.yaml` for deployment configuration.