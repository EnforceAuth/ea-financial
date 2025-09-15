# EA Financial - Consumer Accounts Internal API

A TypeScript-based internal API for EA Financial's consumer account operations, built with ElysiaJS. This API is designed for internal bank employee use and provides secure access to account management, transaction processing, and policy information.

## 🏦 Overview

This API serves as the backend for internal banking operations, providing authenticated access to customer account data and banking services. It includes comprehensive authentication, authorization, and audit logging capabilities.

## 🚀 Features

- **Authentication & Authorization**: Token-based authentication with role-based permissions
- **Account Management**: View account details, check balances, and account status
- **Transaction Processing**: Credit and debit operations with validation and audit trails
- **Terms & Policies**: Access to banking terms, employee procedures, and regulatory information
- **Comprehensive Testing**: Full test coverage with integration and unit tests
- **Type Safety**: Built with TypeScript for enhanced reliability
- **Mock Data**: JSON fixtures for development and testing

## 📋 Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Node.js >= 18.0.0 (if not using Bun)
- TypeScript knowledge

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ea-financial/projects/consumer-accounts-internal-api
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

The API will be available at `http://localhost:3001`

## 📖 API Documentation

### Base URL
```
http://localhost:3001
```

### Authentication

All endpoints (except root and health) require authentication using Bearer tokens.

#### Demo Credentials
```
Username: jsmith     | Password: password123 | Role: Senior Representative
Username: mjohnson   | Password: password456 | Role: Manager  
Username: rbrown     | Password: password789 | Role: Representative
Username: slee       | Password: password000 | Role: Analyst (Inactive)
```

### Endpoints

#### Root & Health
- `GET /` - API information and documentation
- `GET /health` - Health check endpoint
- `GET /status` - Service status information

#### Authentication
- `POST /auth/login` - Employee login
- `POST /auth/logout` - Employee logout  
- `GET /auth/verify` - Token verification

#### Account Operations
- `GET /accounts/:accountId` - Get full account details
- `GET /accounts/:accountId/balance` - Get account balance
- `POST /accounts/:accountId/credit` - Credit account
- `POST /accounts/:accountId/debit` - Debit account
- `GET /accounts/:accountId/transactions` - Get transaction history

#### Terms & Policies
- `GET /terms` - All terms and conditions
- `GET /terms/general` - General banking terms
- `GET /terms/employee-procedures` - Employee procedures
- `GET /terms/regulatory` - Regulatory disclosures
- `GET /terms/account-policies` - Account policies
- `GET /terms/transaction-limits` - Transaction limits

## 🔐 Authentication Flow

### 1. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "mjohnson",
    "password": "password456"
  }'
```

Response:
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
      "permissions": ["view_accounts", "view_transactions", "basic_operations", "advanced_operations", "account_management"]
    },
    "token": "eyJ1c2VySWQ..."
  }
}
```

### 2. Use Token
Include the token in the Authorization header for all subsequent requests:
```bash
curl -H "Authorization: Bearer eyJ1c2VySWQ..."
```

## 💰 Account Operations Examples

### Check Balance
```bash
curl -X GET http://localhost:3001/accounts/acc_001/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Credit Account
```bash
curl -X POST http://localhost:3001/accounts/acc_001/credit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "description": "Customer deposit",
    "reference": "DEP001",
    "employeeId": "emp_67890"
  }'
```

### Debit Account
```bash
curl -X POST http://localhost:3001/accounts/acc_001/debit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "ATM withdrawal",
    "reference": "ATM001",
    "employeeId": "emp_67890"
  }'
```

### Get Transaction History
```bash
curl -X GET "http://localhost:3001/accounts/acc_001/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🏗️ Project Structure

```
src/
├── data/
│   └── dataService.ts          # Data access layer
├── routes/
│   ├── auth.ts                 # Authentication routes
│   ├── accounts.ts             # Account operation routes
│   └── terms.ts                # Terms and policies routes
├── types/
│   └── index.ts                # TypeScript type definitions
└── index.ts                    # Main application entry point

fixtures/
├── accounts.json               # Mock account data
├── users.json                  # Mock user data
├── transactions.json           # Mock transaction data
└── terms.json                  # Banking terms and policies

tests/
├── auth.test.ts                # Authentication tests
├── accounts.test.ts            # Account operations tests
├── terms.test.ts               # Terms and policies tests
└── integration.test.ts         # Full integration tests
```

## 🧪 Testing

### Run All Tests
```bash
bun run test
```

### Run Tests with Watch Mode
```bash
bun run test:watch
```

### Run Tests with Coverage
```bash
bun run test:coverage
```

### Test Categories
- **Authentication Tests**: Login, logout, token verification
- **Account Tests**: Balance checks, transactions, validations
- **Terms Tests**: Policy and procedure access
- **Integration Tests**: Full workflow scenarios

## 🔒 Security Features

- **Token-based Authentication**: JWT-like tokens with expiration
- **Role-based Permissions**: Granular access control
- **Input Validation**: Comprehensive request validation
- **Audit Logging**: Transaction tracking with employee attribution
- **Account Status Validation**: Prevents operations on frozen/closed accounts
- **Business Rule Enforcement**: Amount validation, sufficient funds checks

## 📊 Permission Levels

### Representative
- `view_accounts`: View account information
- `view_transactions`: View transaction history

### Senior Representative  
- All Representative permissions plus:
- `basic_operations`: Perform credit/debit transactions

### Manager
- All Senior Representative permissions plus:
- `advanced_operations`: Advanced transaction capabilities  
- `account_management`: Account status modifications

### Analyst
- `view_accounts`: View account information
- `view_transactions`: View transaction history
- `risk_analysis`: Risk assessment capabilities

## 🔄 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 📝 Business Rules

### Transaction Rules
- Amounts must be greater than 0
- Descriptions are required for all transactions
- Sufficient funds required for debit operations
- Frozen accounts cannot process transactions
- All transactions require employee attribution

### Account Rules
- Account status affects available operations
- Balance validation on all operations
- Transaction history maintains chronological order

### Authentication Rules
- Tokens expire after 24 hours
- Failed login attempts are tracked
- Inactive users cannot authenticate

## 🚧 Development

### Available Scripts
```bash
bun run dev          # Start development server with watch mode
bun run start        # Start production server
bun run test         # Run all tests
bun run test:watch   # Run tests in watch mode
bun run build        # Build for production
bun run clean        # Clean build artifacts
```

### Adding New Routes
1. Create route file in `src/routes/`
2. Implement authentication middleware
3. Add input validation
4. Create corresponding tests
5. Update main application in `src/index.ts`

### Mock Data
The API uses JSON fixtures in the `fixtures/` directory. To add new data:
1. Update relevant JSON file
2. Restart the development server
3. Data is loaded at startup

## 📋 TODO / Future Enhancements

- [ ] Database integration (replace mock data)
- [ ] Redis for session management
- [ ] Enhanced logging with structured logs
- [ ] Rate limiting and API throttling
- [ ] Account search and filtering
- [ ] Bulk transaction processing
- [ ] Transaction approval workflows
- [ ] Real-time notifications
- [ ] Advanced reporting endpoints
- [ ] API versioning
- [ ] OpenAPI/Swagger documentation
- [ ] Docker containerization
- [ ] CI/CD pipeline integration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add/update tests
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is proprietary to EA Financial. All rights reserved.

## 📞 Support

For internal support and questions:
- Engineering Team: engineering@eafinancial.com
- Documentation: docs@eafinancial.com
- Security Issues: security@eafinancial.com

---

**Note**: This is a demo/educational project for a fictional bank. Do not use in production environments without proper security audits and compliance reviews.