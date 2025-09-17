# EA Financial - Consumer Accounts Internal API

## Overview

The Consumer Accounts Internal API is a secure, role-based API service designed for EA Financial bank employees to perform customer account operations. The API implements enterprise-grade authorization using **Open Policy Agent (OPA)** for fine-grained access control and compliance with banking regulations.

## 🔐 Security & Authorization

### OPA Integration
- **Authorization Provider**: Open Policy Agent (OPA/EOPA)
- **Policy Package**: `main`
- **Decision Endpoint**: `/v1/data/main/allow`
- **Token-based Authentication**: Compatible with OPA user data
- **Real-time Policy Evaluation**: Every request is authorized through OPA

### Role-Based Access Control (RBAC)

| Role | Level | Description | Permissions |
|------|-------|-------------|-------------|
| **Manager** | 4 | Full access to all operations | All account operations, admin functions, 24/7 access |
| **Senior Representative** | 3 | Enhanced customer service | Account operations, transactions, no admin functions |
| **Representative** | 2 | Standard customer service | Read-only access to accounts and transactions |
| **Analyst** | 1 | Analytics and reporting | Read-only access during business hours |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun 1.0+
- OPA/EOPA service running on port 8181
- Access to demo user credentials

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd ea-financial/projects/consumer-accounts-internal-api

# Install dependencies
bun install

# Start in development mode
bun run dev

# Or start in production mode
bun run start
```

### Environment Variables
```bash
PORT=3001                               # API server port
OPA_URL=http://localhost:8181          # OPA service URL
OPA_TIMEOUT=5000                       # OPA request timeout (ms)
NODE_ENV=production                    # Environment
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```bash
Authorization: Bearer <token>
```

### Demo Credentials

| Username | Password | Role | Status | Access Level |
|----------|----------|------|---------|--------------|
| `mjohnson` | `password456` | Manager | Active | Full Access |
| `jsmith` | `password123` | Senior Rep | Active | Enhanced Access |
| `rbrown` | `password789` | Representative | Active | Standard Access |
| `slee` | `password000` | Analyst | Inactive | No Access |

## 🔌 API Endpoints

### Public Endpoints (No Authentication Required)

#### Get API Information
```http
GET /
```
Returns API metadata, endpoints, and demo credentials.

#### Health Check
```http
GET /health
```
Returns API health status and OPA connectivity.

#### Service Status
```http
GET /status
```
Returns detailed service status including all dependencies.

### Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "mjohnson",
  "password": "password456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "success": true,
    "message": "Login successful",
    "user": {
      "id": "cust_002",
      "username": "mjohnson",
      "role": "manager",
      "department": "Operations"
    },
    "token": "mjohnson_token_456"
  }
}
```

#### Verify Token
```http
GET /auth/verify
Authorization: Bearer <token>
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### Account Operations

#### Get Account Details
```http
GET /accounts/{accountId}
Authorization: Bearer <token>
```

#### Get Account Balance
```http
GET /accounts/{accountId}/balance
Authorization: Bearer <token>
```

#### Debit Account
```http
POST /accounts/{accountId}/debit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100.00,
  "description": "Withdrawal",
  "reference": "REF123"
}
```

#### Credit Account
```http
POST /accounts/{accountId}/credit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 250.00,
  "description": "Deposit",
  "reference": "DEP456"
}
```

#### Get Transaction History
```http
GET /accounts/{accountId}/transactions?page=1&limit=10
Authorization: Bearer <token>
```

### Terms & Conditions

#### Get All Terms
```http
GET /terms
Authorization: Bearer <token>
```

#### Get General Terms
```http
GET /terms/general
Authorization: Bearer <token>
```

#### Get Employee Procedures
```http
GET /terms/employee-procedures
Authorization: Bearer <token>
```

#### Get Regulatory Disclosures
```http
GET /terms/regulatory
Authorization: Bearer <token>
```

## 🧪 Testing

### Automated Tests
```bash
# Run the OPA integration test suite (requires OPA running)
./scripts/test-opa-integration.sh

# Run offline integration tests (works without OPA)
./scripts/test-integration-offline.sh

# Run unit tests
bun test

# Run API endpoint tests
bun run test:api

# Or use npm scripts:
bun run test:opa      # OPA integration tests
bun run test:offline  # Offline integration tests
```

### Manual Testing Examples

#### Test Manager Access (Full Permissions)
```bash
# Login as manager
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mjohnson","password":"password456"}' | \
  jq -r '.data.token')

# Access account (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/accounts/ACC001

# Perform debit operation (should succeed)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.00,"description":"Test debit"}' \
  http://localhost:3001/accounts/ACC001/debit
```

#### Test Representative Access (Limited Permissions)
```bash
# Login as representative
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rbrown","password":"password789"}' | \
  jq -r '.data.token')

# View balance (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/accounts/ACC001/balance

# Attempt debit operation (should fail with 403)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.00,"description":"Test debit"}' \
  http://localhost:3001/accounts/ACC001/debit
```

## 🏗️ Architecture

### OPA Integration Flow
1. **Request Received**: API receives HTTP request
2. **Token Validation**: Extract and validate bearer token with OPA
3. **User Lookup**: Retrieve user context from OPA user data
4. **Policy Evaluation**: Send request context to OPA for authorization decision
5. **Decision Enforcement**: Allow or deny request based on OPA decision
6. **Audit Logging**: OPA logs all authorization decisions for compliance

### Security Features
- **Token-based Authentication**: Secure bearer token system
- **Role-based Authorization**: Fine-grained permissions per role
- **Policy-as-Code**: Authorization rules defined in Rego
- **Real-time Decisions**: Every request evaluated against current policies
- **Audit Trail**: Complete decision logging for compliance
- **Fail-Safe**: Secure defaults when OPA is unavailable

### Data Sources
- **User Data**: Stored in OPA data layer
- **Account Data**: Mock data from fixtures (production would use database)
- **Policy Rules**: Defined in OPA Rego policies
- **Audit Logs**: Generated by OPA decision logging

## 🔧 Development

### Project Structure
```
src/
├── index.ts                    # Main application entry point
├── services/
│   ├── opaService.ts          # OPA integration service
│   └── authService.ts         # Authentication service
├── routes/
│   ├── auth.ts                # Authentication endpoints
│   ├── accounts.ts            # Account operation endpoints
│   └── terms.ts               # Terms and conditions endpoints
├── data/
│   └── dataService.ts         # Data access layer
└── types/
    └── index.ts               # TypeScript type definitions

fixtures/                      # Mock data files
├── users.json                # Demo user accounts
├── accounts.json             # Demo customer accounts
└── transactions.json         # Demo transaction history

scripts/                       # Test and utility scripts
├── test-opa-integration.sh   # Comprehensive OPA integration tests
└── test-integration-offline.sh # Offline integration tests
```

### Adding New Endpoints

1. **Define Route Handler**:
```typescript
.get("/new-endpoint", async ({ headers, set }) => {
  // Use OPA for authorization
  const authResult = await authService.authorize(
    "GET",
    "/new-endpoint",
    headers.authorization,
    headers,
  );

  if (!authResult.allowed) {
    set.status = authResult.user ? 403 : 401;
    return {
      success: false,
      message: "Access denied",
      error: authResult.error,
    };
  }

  // Your business logic here
  return { success: true, data: "result" };
})
```

2. **Update OPA Policies**: Add route mapping in OPA policy files
3. **Add Tests**: Include endpoint in integration test suite

### OPA Policy Development
- Policies located in `../../infra/opa/policies/`
- User data in `../../infra/opa/data/users.json`
- Test policies using `eopa eval` command
- Lint policies with `regal lint`

## 📊 Monitoring & Observability

### Health Checks
- **API Health**: `GET /health` - Application status
- **OPA Health**: `GET /status` - Authorization service status
- **Dependencies**: Database, external services status

### Logging
- **Application Logs**: Structured JSON logging
- **Authorization Logs**: OPA decision logs
- **Audit Trail**: All financial operations logged
- **Error Tracking**: Comprehensive error handling and logging

### Metrics
- Request rate and response times
- Authorization success/failure rates
- Role-based access patterns
- OPA policy evaluation performance

## 🔒 Security Considerations

### Production Deployment
- **Token Management**: Replace demo tokens with proper JWT
- **Database Integration**: Replace fixtures with encrypted database
- **TLS/SSL**: Enable HTTPS for all communications
- **Rate Limiting**: Implement API rate limiting
- **Input Validation**: Enhanced request validation
- **Secret Management**: Use secure secret management system

### Compliance
- **SOX Compliance**: Audit trail for all financial operations
- **PCI DSS**: Secure handling of financial data
- **Data Privacy**: GDPR/CCPA compliant data handling
- **Access Controls**: Principle of least privilege

## 🚀 Deployment

### Docker Deployment
```bash
# Build container
docker build -t ea-financial/consumer-accounts-api:latest .

# Run with OPA integration
docker run -p 3001:3001 \
  -e OPA_URL=http://opa-service:8181 \
  ea-financial/consumer-accounts-api:latest
```

### Kubernetes Deployment
- Main container: API application
- Sidecar container: OPA/EOPA
- ConfigMaps: Policies and user data
- Services: Load balancer configuration

## 📞 Support

### Common Issues

**OPA Connection Failed**
- Verify OPA service is running on configured port
- Check network connectivity between API and OPA
- Validate OPA configuration and policy loading

**Authorization Denied**
- Verify user token is valid and not expired
- Check user role and permissions in OPA data
- Review policy rules for endpoint access

**Invalid Token**
- Ensure proper Bearer token format
- Verify token exists in OPA user data
- Check token expiration time

### Development Team Contacts
- **API Development**: EA Financial Engineering Team
- **Security/Authorization**: InfoSec Team  
- **DevOps/Infrastructure**: Platform Team

## 📜 License

PRIVATE - EA Financial Internal Use Only

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**OPA Integration**: Fully Implemented  
**Security Status**: Enterprise Ready