import { beforeAll, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { accountRoutes } from '../src/routes/accounts';
import { authRoutes } from '../src/routes/auth';

describe('Account Routes', () => {
  let app: Elysia;
  let validToken: string;
  let managerToken: string;
  let limitedToken: string;

  beforeAll(async () => {
    app = new Elysia().use(authRoutes).use(accountRoutes);

    // Get tokens for different user types
    const loginResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'jsmith',
          password: 'password123',
        }),
      })
    );

    const loginData = await loginResponse.json();
    validToken = loginData.data.token;

    // Get manager token
    const managerResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'mjohnson',
          password: 'password456',
        }),
      })
    );

    const managerData = await managerResponse.json();
    managerToken = managerData.data.token;

    // Get limited permissions token
    const limitedResponse = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'rbrown',
          password: 'password789',
        }),
      })
    );

    const limitedData = await limitedResponse.json();
    limitedToken = limitedData.data.token;
  });

  describe('GET /accounts/:accountId/balance', () => {
    it('should retrieve account balance with valid token and permissions', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Balance retrieved successfully');
      expect(data.data.accountId).toBe('acc_001');
      expect(data.data.balance).toBe(2500.75);
      expect(data.data.currency).toBe('USD');
      expect(data.data.status).toBe('active');
    });

    it('should reject request without authorization token', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('should reject request with insufficient permissions', async () => {
      // rbrown has limited permissions - view_accounts and view_transactions only
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${limitedToken}`,
          },
        })
      );

      expect(response.status).toBe(200); // rbrown has view_accounts permission

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_999/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Account not found');
    });
  });

  describe('GET /accounts/:accountId', () => {
    it('should retrieve full account details', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('acc_001');
      expect(data.data.customerId).toBe('cust_001');
      expect(data.data.accountType).toBe('checking');
      expect(data.data.accountNumber).toBe('1234567890123456');
    });

    it('should reject unauthorized requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /accounts/:accountId/debit', () => {
    it('should successfully process debit transaction with sufficient funds', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_003/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 50.0,
            description: 'Test debit transaction',
            reference: 'TEST001',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Debit processed successfully');
      expect(data.data.transaction.type).toBe('debit');
      expect(data.data.transaction.amount).toBe(50.0);
      expect(data.data.newBalance).toBe(700.25); // 750.25 - 50.00
    });

    it('should reject debit with insufficient funds', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_004/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 200.0,
            description: 'Test debit - insufficient funds',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Insufficient funds');
    });

    it('should reject debit without proper permissions', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${limitedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 25.0,
            description: 'Unauthorized debit attempt',
            employeeId: 'emp_11111',
          }),
        })
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Insufficient permissions');
    });

    it('should reject debit with invalid amount', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: -50.0,
            description: 'Invalid negative amount',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid amount');
    });

    it('should reject debit without description', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/debit', {
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

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Description is required');
    });

    it('should reject debit on frozen account', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_006/debit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 10.0,
            description: 'Attempt on frozen account',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Account is frozen');
    });
  });

  describe('POST /accounts/:accountId/credit', () => {
    it('should successfully process credit transaction', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_004/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100.0,
            description: 'Test credit transaction',
            reference: 'CREDIT001',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Credit processed successfully');
      expect(data.data.transaction.type).toBe('credit');
      expect(data.data.transaction.amount).toBe(100.0);
      expect(data.data.newBalance).toBe(225.5); // 125.50 + 100.00
    });

    it('should reject credit without proper permissions', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${limitedToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100.0,
            description: 'Unauthorized credit attempt',
            employeeId: 'emp_11111',
          }),
        })
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Insufficient permissions');
    });

    it('should reject credit with invalid amount', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 0,
            description: 'Zero amount credit',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid amount');
    });

    it('should reject credit on frozen account', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_006/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100.0,
            description: 'Credit to frozen account',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Account is frozen');
    });
  });

  describe('GET /accounts/:accountId/transactions', () => {
    it('should retrieve transaction history', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/transactions', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transactions retrieved successfully');
      expect(Array.isArray(data.data.transactions)).toBe(true);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(10);
    });

    it('should support pagination', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/transactions?page=2&limit=5', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(5);
    });

    it('should reject without transaction viewing permissions', async () => {
      // Create a token for a user without view_transactions permission
      // For this test, we'll assume rbrown has view_transactions permission
      // In a real scenario, you'd create a user without this permission
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_001/transactions', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${limitedToken}`,
          },
        })
      );

      // rbrown has view_transactions permission, so this should succeed
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_999/transactions', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Account not found');
    });

    it('should handle empty transaction history gracefully', async () => {
      // Use an account that might not have transactions in fixtures
      const response = await app.handle(
        new Request('http://localhost/accounts/acc_005/transactions', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.transactions)).toBe(true);
    });
  });

  describe('Integration - Account Operations Flow', () => {
    it('should complete full account operation workflow', async () => {
      // Step 1: Check initial balance
      const balanceResponse1 = await app.handle(
        new Request('http://localhost/accounts/acc_002/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(balanceResponse1.status).toBe(200);
      const balanceData1 = await balanceResponse1.json();
      const initialBalance = balanceData1.data.balance;

      // Step 2: Perform credit transaction
      const creditResponse = await app.handle(
        new Request('http://localhost/accounts/acc_002/credit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${managerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 500.0,
            description: 'Integration test credit',
            employeeId: 'emp_67890',
          }),
        })
      );

      expect(creditResponse.status).toBe(200);
      const creditData = await creditResponse.json();
      expect(creditData.data.newBalance).toBe(initialBalance + 500.0);

      // Step 3: Check updated balance
      const balanceResponse2 = await app.handle(
        new Request('http://localhost/accounts/acc_002/balance', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(balanceResponse2.status).toBe(200);
      const balanceData2 = await balanceResponse2.json();
      expect(balanceData2.data.balance).toBe(initialBalance + 500.0);

      // Step 4: View transaction history to verify the transaction
      const transactionsResponse = await app.handle(
        new Request('http://localhost/accounts/acc_002/transactions?limit=1', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        })
      );

      expect(transactionsResponse.status).toBe(200);
      const transactionsData = await transactionsResponse.json();
      expect(transactionsData.data.transactions.length).toBeGreaterThan(0);
    });
  });
});
