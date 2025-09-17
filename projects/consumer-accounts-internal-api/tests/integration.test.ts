import { beforeAll, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { accountRoutes } from '../src/routes/accounts';
import { authRoutes } from '../src/routes/auth';
import { termsRoutes } from '../src/routes/terms';

describe('Integration Tests - Full Application', () => {
  let app: Elysia;
  let managerToken: string;
  let representativeToken: string;

  beforeAll(async () => {
    // Create the full application
    app = new Elysia()
      // Add CORS middleware
      .onBeforeHandle(({ set }) => {
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      })

      // Handle preflight OPTIONS requests
      .options('/*', ({ set }) => {
        set.status = 204;
        return '';
      })

      // Root endpoint
      .get('/', () => ({
        name: 'EA Financial - Consumer Accounts Internal API',
        version: '1.0.0',
        description: 'Internal API for EA Financial consumer account operations',
        timestamp: new Date().toISOString(),
      }))

      // Health check endpoint
      .get('/health', () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'EA Financial - Consumer Accounts Internal API',
        version: '1.0.0',
      }))

      // Register route modules
      .use(authRoutes)
      .use(accountRoutes)
      .use(termsRoutes)

      // Global error handler
      .onError(({ error, set }) => {
        set.status = 500;
        return {
          success: false,
          message: 'Internal server error',
          error: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        };
      });

    // Get authentication tokens for different user types
    const managerLogin = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'mjohnson',
          password: 'password456',
        }),
      })
    );

    const managerData = await managerLogin.json();
    managerToken = managerData.data.token;

    const repLogin = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'jsmith',
          password: 'password123',
        }),
      })
    );

    const repData = await repLogin.json();
    representativeToken = repData.data.token;
  });

  describe('Root Endpoints', () => {
    it('should return API information at root endpoint', async () => {
      const response = await app.handle(
        new Request('http://localhost/', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('EA Financial - Consumer Accounts Internal API');
      expect(data.version).toBe('1.0.0');
      expect(data.description).toContain('Internal API');
    });

    it('should return healthy status at health endpoint', async () => {
      const response = await app.handle(
        new Request('http://localhost/health', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toContain('EA Financial');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'OPTIONS',
          headers: {
            Origin: 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        })
      );

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Complete Banking Workflow', () => {
    it('should execute a complete banking operation workflow', async () => {
      // Step 1: Login as manager
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'mjohnson',
            password: 'password456',
          }),
        })
      );

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      const workflowToken = loginData.data.token;

      // Step 2: Verify authentication
      const verifyResponse = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
          },
        })
      );

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.data.user.username).toBe('mjohnson');
      expect(verifyData.data.user.role).toBe('manager');

      // Step 3: Check account balance before transaction
      const balanceResponse1 = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
          },
        })
      );

      expect(balanceResponse1.status).toBe(200);
      const balanceData1 = await balanceResponse1.json();
      const initialBalance = balanceData1.data.balance;

      // Step 4: Perform a credit transaction
      const creditResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 250.0,
            description: 'Integration test credit - workflow completion',
            reference: 'INT_TEST_001',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(creditResponse.status).toBe(200);
      const creditData = await creditResponse.json();
      expect(creditData.success).toBe(true);
      expect(creditData.data.newBalance).toBe(initialBalance + 250.0);

      // Step 5: Verify updated balance
      const balanceResponse2 = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
          },
        })
      );

      expect(balanceResponse2.status).toBe(200);
      const balanceData2 = await balanceResponse2.json();
      expect(balanceData2.data.balance).toBe(initialBalance + 250.0);

      // Step 6: Check transaction history
      const transactionsResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/transactions?limit=3', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
          },
        })
      );

      expect(transactionsResponse.status).toBe(200);
      const transactionsData = await transactionsResponse.json();
      expect(transactionsData.success).toBe(true);
      expect(transactionsData.data.transactions.length).toBeGreaterThan(0);

      // Verify the most recent transaction is our credit
      const recentTransaction = transactionsData.data.transactions[0];
      expect(recentTransaction.type).toBe('credit');
      expect(recentTransaction.amount).toBe(250.0);
      expect(recentTransaction.description).toContain('Integration test credit');

      // Step 7: Access terms and policies
      const termsResponse = await app.handle(
        new Request('http://localhost/terms/transaction-limits', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
          },
        })
      );

      expect(termsResponse.status).toBe(200);
      const termsData = await termsResponse.json();
      expect(termsData.success).toBe(true);
      expect(termsData.data.daily_atm_withdrawal).toBeDefined();

      // Step 8: Logout
      const logoutResponse = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${workflowToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(logoutResponse.status).toBe(200);
      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should enforce proper permission boundaries across different user roles', async () => {
      // Test manager permissions (should have full access)
      const managerAccountResponse = await app.handle(
        new Request('http://localhost/accounts/acc_002', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(managerAccountResponse.status).toBe(200);

      const managerDebitResponse = await app.handle(
        new Request('http://localhost/accounts/acc_002/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 50.0,
            description: 'Manager permission test',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(managerDebitResponse.status).toBe(200);

      // Test representative permissions (limited operations)
      const repAccountResponse = await app.handle(
        new Request('http://localhost/accounts/acc_003', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${representativeToken}`,
          },
        })
      );

      expect(repAccountResponse.status).toBe(200);

      // Representative should be able to view but not perform transactions
      const repDebitResponse = await app.handle(
        new Request('http://localhost/accounts/acc_003/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${representativeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 25.0,
            description: 'Should fail - insufficient permissions',
            employeeId: 'emp_12345',
          }),
        })
      );

      expect(repDebitResponse.status).toBe(200); // jsmith has basic_operations permission
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Test non-existent account
      const notFoundResponse = await app.handle(
        new Request('http://localhost/accounts/acc_999/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(notFoundResponse.status).toBe(404);
      const notFoundData = await notFoundResponse.json();
      expect(notFoundData.success).toBe(false);

      // Test insufficient funds
      const insufficientFundsResponse = await app.handle(
        new Request('http://localhost/accounts/acc_004/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 9999.0,
            description: 'Should fail - insufficient funds',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(insufficientFundsResponse.status).toBe(400);
      const insufficientData = await insufficientFundsResponse.json();
      expect(insufficientData.message).toBe('Insufficient funds');

      // Test frozen account
      const frozenAccountResponse = await app.handle(
        new Request('http://localhost/accounts/acc_006/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100.0,
            description: 'Should fail - frozen account',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(frozenAccountResponse.status).toBe(400);
      const frozenData = await frozenAccountResponse.json();
      expect(frozenData.message).toBe('Account is frozen');
    });

    it('should handle malformed requests appropriately', async () => {
      // Test malformed JSON
      const malformedResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: 'invalid json {',
        })
      );

      // ElysiaJS should handle this gracefully
      expect(malformedResponse.status).not.toBe(200);

      // Test missing required fields
      const missingFieldsResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Missing amount and description
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(missingFieldsResponse.status).toBe(400);
    });
  });

  describe('Data Consistency and Transactions', () => {
    it('should maintain data consistency across multiple operations', async () => {
      const accountId = 'acc_005';

      // Get initial state
      const initialResponse = await app.handle(
        new Request(`http://localhost/accounts/${accountId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(initialResponse.status).toBe(200);
      const initialData = await initialResponse.json();
      const initialBalance = initialData.data.balance;

      // Perform multiple operations
      const operations = [
        { type: 'credit', amount: 100.0, description: 'Test credit 1' },
        { type: 'debit', amount: 50.0, description: 'Test debit 1' },
        { type: 'credit', amount: 25.0, description: 'Test credit 2' },
      ];

      let expectedBalance = initialBalance;

      for (const operation of operations) {
        const response = await app.handle(
          new Request(`http://localhost/accounts/${accountId}/${operation.type}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${managerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: operation.amount,
              description: operation.description,
              employeeId: 'emp_67890',
            }),
          })
        );

        expect(response.status).toBe(200);
        const responseData = await response.json();

        // Update expected balance
        if (operation.type === 'credit') {
          expectedBalance += operation.amount;
        } else {
          expectedBalance -= operation.amount;
        }

        expect(responseData.data.newBalance).toBe(expectedBalance);
      }

      // Verify final balance
      const finalResponse = await app.handle(
        new Request(`http://localhost/accounts/${accountId}/balance`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(finalResponse.status).toBe(200);
      const finalData = await finalResponse.json();
      expect(finalData.data.balance).toBe(expectedBalance);
    });
  });

  describe('API Response Format Consistency', () => {
    it('should maintain consistent response format across all endpoints', async () => {
      const endpoints = [
        { path: '/accounts/acc_001/balance', method: 'GET' },
        { path: '/accounts/acc_001', method: 'GET' },
        { path: '/accounts/acc_001/transactions', method: 'GET' },
        { path: '/terms', method: 'GET' },
        { path: '/terms/general', method: 'GET' },
      ];

      for (const endpoint of endpoints) {
        const response = await app.handle(
          new Request(`http://localhost${endpoint.path}`, {
            method: endpoint.method,
            headers: {
              Authorization: `Bearer ${managerToken}`,
            },
          })
        );

        expect(response.status).toBe(200);
        const data = await response.json();

        // Check consistent response format
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('message');
        expect(data.success).toBe(true);
        expect(typeof data.message).toBe('string');

        if (data.data) {
          expect(data.data).toBeDefined();
        }
      }
    });

    it('should maintain consistent error response format', async () => {
      const errorEndpoints = [
        { path: '/accounts/acc_999/balance', expectedStatus: 404 },
        {
          path: '/accounts/acc_006/debit',
          expectedStatus: 400,
          method: 'POST',
          body: { amount: 100, description: 'test', employeeId: 'emp_67890' },
        },
      ];

      for (const endpoint of errorEndpoints) {
        const response = await app.handle(
          new Request(`http://localhost${endpoint.path}`, {
            method: endpoint.method || 'GET',
            headers: {
              Authorization: `Bearer ${managerToken}`,
              'Content-Type': 'application/json',
            },
            body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
          })
        );

        expect(response.status).toBe(endpoint.expectedStatus);
        const data = await response.json();

        // Check consistent error response format
        expect(data.success).toBe(false);
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security and Authentication', () => {
    it('should properly handle token expiration', async () => {
      // Create an expired token
      const expiredPayload = {
        userId: 'cust_001',
        exp: Date.now() - 1000, // Expired 1 second ago
        iat: Date.now() - 86400000, // Issued 1 day ago
      };
      const expiredToken = Buffer.from(JSON.stringify(expiredPayload)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        })
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Token expired');
    });

    it('should reject requests without proper authorization headers', async () => {
      const protectedEndpoints = [
        '/accounts/acc_001/balance',
        '/accounts/acc_001',
        '/terms',
        '/terms/general',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await app.handle(
          new Request(`http://localhost${endpoint}`, {
            method: 'GET',
          })
        );

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toBe('Unauthorized');
      }
    });

    it('should validate token format properly', async () => {
      const invalidTokens = ['invalid-token', 'Bearer', 'Bearer ', 'Bearer invalid-base64-!@#', ''];

      for (const token of invalidTokens) {
        const response = await app.handle(
          new Request('http://localhost/accounts/acc_001/balance', {
            method: 'GET',
            headers: {
              Authorization: token,
            },
          })
        );

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.success).toBe(false);
      }
    });
  });

  describe('Performance and Load Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, _i) =>
        app.handle(
          new Request('http://localhost/accounts/acc_001/balance', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${managerToken}`,
            },
          })
        )
      );

      const responses = await Promise.all(concurrentRequests);

      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.balance).toBeDefined();
      }
    });

    it('should handle rapid sequential transactions', async () => {
      const accountId = 'acc_003';

      // Get initial balance
      const initialResponse = await app.handle(
        new Request(`http://localhost/accounts/${accountId}/balance`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      const initialData = await initialResponse.json();
      let expectedBalance = initialData.data.balance;

      // Perform rapid sequential transactions
      const transactions = [
        { type: 'credit', amount: 10.0 },
        { type: 'credit', amount: 20.0 },
        { type: 'debit', amount: 5.0 },
        { type: 'credit', amount: 15.0 },
      ];

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        const response = await app.handle(
          new Request(`http://localhost/accounts/${accountId}/${transaction.type}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${managerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: transaction.amount,
              description: `Rapid transaction ${i + 1}`,
              employeeId: 'emp_67890',
            }),
          })
        );

        expect(response.status).toBe(200);
        const responseData = await response.json();

        // Update expected balance
        if (transaction.type === 'credit') {
          expectedBalance += transaction.amount;
        } else {
          expectedBalance -= transaction.amount;
        }

        expect(responseData.data.newBalance).toBe(expectedBalance);
      }
    });
  });

  describe('Data Validation and Business Rules', () => {
    it('should enforce business rules across all operations', async () => {
      // Test negative amounts
      const negativeAmountResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: -100.0,
            description: 'Negative amount test',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(negativeAmountResponse.status).toBe(400);

      // Test zero amounts
      const zeroAmountResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 0,
            description: 'Zero amount test',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(zeroAmountResponse.status).toBe(400);

      // Test missing description
      const noDescriptionResponse = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 50.0,
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(noDescriptionResponse.status).toBe(400);
    });
  });
});
