# API Test Scripts

This directory contains test scripts for validating the EA Financial Consumer Accounts Internal API with OPA integration.

## Available Scripts

### `test-opa-integration.sh`
**Comprehensive OPA Integration Tests**

- **Purpose**: Full end-to-end testing with OPA service running
- **Prerequisites**: 
  - OPA service running on `http://localhost:8181`
  - API server available on `http://localhost:3001`
- **Test Coverage**:
  - 70+ automated test scenarios
  - Public endpoint validation
  - Authentication flows (login/logout/verify)
  - Authorization with different roles
  - Protected endpoint access control
  - Error handling and edge cases
- **Usage**:
  ```bash
  ./scripts/test-opa-integration.sh
  # or
  bun run test:opa
  ```

### `test-integration-offline.sh`
**Offline Integration Tests**

- **Purpose**: Validates API behavior when OPA is unavailable
- **Prerequisites**: 
  - Only requires the API to be buildable
  - No external dependencies needed
- **Test Coverage**:
  - Public endpoint functionality
  - Authentication (credential validation)
  - Protected endpoint security (fail-safe behavior)
  - OPA integration error handling
  - Health check reporting
- **Usage**:
  ```bash
  ./scripts/test-integration-offline.sh
  # or
  bun run test:offline
  ```

## Test Scenarios

### Authentication Tests
- ✅ Valid user login (all roles)
- ✅ Invalid credential rejection
- ✅ Inactive user handling
- ✅ Token generation and validation
- ✅ Token expiration handling

### Authorization Tests (OPA Required)
- ✅ Manager: Full access to all operations
- ✅ Senior Rep: Transaction operations allowed
- ✅ Representative: Read-only access only
- ✅ Analyst (inactive): All access denied
- ✅ Cross-role permission boundaries

### Security Tests
- ✅ Protected endpoints without authentication
- ✅ Invalid token rejection
- ✅ Fail-safe behavior when OPA unavailable
- ✅ Proper HTTP status codes (401/403)
- ✅ Error message consistency

### Infrastructure Tests
- ✅ Health check endpoint functionality
- ✅ OPA connectivity monitoring
- ✅ Service dependency reporting
- ✅ Graceful degradation handling

## Running Tests

### Local Development
```bash
# Start OPA locally (for full tests)
cd ../../infra/opa
opa run --server --addr 0.0.0.0:8181 policies/ data/ &

# Run full integration tests
./scripts/test-opa-integration.sh

# Run offline tests (no OPA needed)
./scripts/test-integration-offline.sh
```

### CI/CD Pipeline
```bash
# In CI environments, run offline tests first
bun run test:offline

# Then run full integration if OPA service available
if curl -s http://opa-service:8181/health; then
  bun run test:opa
fi
```

## Expected Results

### With OPA Running
- **All tests should pass** (70+ scenarios)
- Protected endpoints accessible with proper roles
- Authorization decisions made in real-time
- Complete audit trail generation

### Without OPA (Offline)
- **Public endpoints work** (root, health, status)
- **Authentication works** (credential validation)
- **Protected endpoints fail safely** (401 responses)
- **System reports OPA unavailable** (health checks)

## Troubleshooting

### Common Issues

**OPA Connection Failed**
```bash
# Check OPA service
curl http://localhost:8181/health

# Start OPA if needed
cd ../../infra/opa
opa run --server --addr 0.0.0.0:8181 policies/ data/
```

**API Won't Start**
```bash
# Check port availability
lsof -i :3001

# Check dependencies
bun install

# View API logs
tail -f /tmp/api.log
```

**Tests Failing**
```bash
# Run with verbose output
bash -x ./scripts/test-opa-integration.sh

# Check individual endpoints
curl -v http://localhost:3001/health
```

### Test Environment Requirements

**Minimum (Offline Tests)**
- Bun runtime
- curl command
- jq for JSON parsing

**Full Testing**
- Above requirements plus:
- OPA service running
- Network connectivity to localhost:8181
- Demo user data loaded in OPA

## Test Data

The tests use demo credentials defined in OPA user data:

| Username | Role | Token | Status |
|----------|------|-------|--------|
| `mjohnson` | Manager | `mjohnson_token_456` | Active |
| `jsmith` | Senior Rep | `jsmith_token_123` | Active |
| `rbrown` | Representative | `rbrown_token_789` | Active |
| `slee` | Analyst | `slee_token_000` | Inactive |

## Integration with CI/CD

These scripts are designed to integrate with continuous integration pipelines:

```yaml
# Example GitHub Actions
- name: Test API Offline
  run: bun run test:offline

- name: Start OPA Service  
  run: docker run -d -p 8181:8181 openpolicyagent/opa:latest

- name: Test API with OPA
  run: bun run test:opa
```

## Contributing

When adding new API endpoints or modifying authorization logic:

1. **Add test scenarios** to both test scripts
2. **Update expected behavior** for offline mode
3. **Verify role-based access** patterns
4. **Test error conditions** and edge cases
5. **Update this documentation** with new test coverage

---

**Last Updated**: December 2024  
**Test Coverage**: 70+ scenarios  
**OPA Integration**: Fully tested  
**Production Ready**: Yes