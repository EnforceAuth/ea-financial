/**
 * EA Financial Consumer Accounts Internal API - Client Example
 *
 * This file demonstrates how to interact with the API from a TypeScript client.
 * Run this example with: bun run examples/client-example.ts
 */

interface User {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

interface Account {
  id: string;
  customerId: string;
  accountNumber: string;
  accountType: 'checking' | 'savings';
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  accountId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed' | 'pending_review';
  initiatedBy: 'customer' | 'employee' | 'system' | 'external';
  employeeId: string | null;
  timestamp: string;
  balanceAfter: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
}

interface BalanceResponse {
  accountId: string;
  balance: number;
  currency: string;
  status: string;
  lastUpdated: string;
}

interface TransactionRequest {
  amount: number;
  description: string;
  reference?: string;
  employeeId: string;
}

class EAFinancialAPIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  }

  async login(username: string, password: string): Promise<boolean> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      return true;
    }
    return false;
  }

  async logout(): Promise<boolean> {
    if (!this.token) {
      return true;
    }

    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.token = null;
      return true;
    }
    return false;
  }

  async getAccountBalance(accountId: string): Promise<BalanceResponse | null> {
    const response = await this.request<BalanceResponse>(`/accounts/${accountId}/balance`);

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async getAccount(accountId: string): Promise<Account> {
    const response = await this.request(`/accounts/${accountId}`);

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async creditAccount(accountId: string, request: TransactionRequest): Promise<Transaction> {
    const response = await this.request(`/accounts/${accountId}/credit`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async debitAccount(accountId: string, request: TransactionRequest): Promise<Transaction> {
    const response = await this.request(`/accounts/${accountId}/debit`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }

  async getTransactionHistory(accountId: string, limit = 10): Promise<Transaction[]> {
    const response = await this.request(`/accounts/${accountId}/transactions?limit=${limit}`);

    if (response.success && response.data?.transactions) {
      response.data.transactions.forEach((txn: Transaction, _index: number) => {
        const _sign = txn.type === 'credit' ? '+' : '-';
      });
      return response.data.transactions;
    }
    return [];
  }

  async getTerms(section?: string): Promise<unknown> {
    const endpoint = section ? `/terms/${section}` : '/terms';
    const response = await this.request(endpoint);

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  }
}

// Example usage
async function runExample() {
  const client = new EAFinancialAPIClient();

  try {
    const loginSuccess = await client.login('mjohnson', 'password456');
    if (!loginSuccess) {
      throw new Error('Authentication failed');
    }
    await client.getAccount('acc_001');
    await client.getAccountBalance('acc_001');
    await client.creditAccount('acc_001', {
      amount: 250.0,
      description: 'Client Example Credit',
      reference: 'CLIENT_001',
      employeeId: 'emp_67890',
    });

    await client.debitAccount('acc_001', {
      amount: 100.0,
      description: 'Client Example Debit',
      reference: 'CLIENT_002',
      employeeId: 'emp_67890',
    });
    await client.getAccountBalance('acc_001');
    await client.getTransactionHistory('acc_001', 5);
    await client.getTerms('account-policies');
    await client.getAccountBalance('acc_999'); // Non-existent account
    await client.logout();
  } catch (_error) {
    // Example client error - would handle appropriately in production
    // In production, this would log to a proper logging service
  }
}

// Additional utility functions for common operations
export class BankingOperations {
  constructor(private client: EAFinancialAPIClient) {}

  async transferFunds(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    employeeId: string
  ): Promise<boolean> {
    try {
      // Debit from source account
      const debitResult = await this.client.debitAccount(fromAccountId, {
        amount,
        description: `Transfer to ${toAccountId}`,
        reference: `TXF_${Date.now()}`,
        employeeId,
      });

      if (!debitResult) {
        return false;
      }

      // Credit to destination account
      const creditResult = await this.client.creditAccount(toAccountId, {
        amount,
        description: `Transfer from ${fromAccountId}`,
        reference: `TXF_${Date.now()}`,
        employeeId,
      });

      if (!creditResult) {
        // Rollback: credit back to source account
        await this.client.creditAccount(fromAccountId, {
          amount,
          description: `Transfer rollback - failed to credit ${toAccountId}`,
          reference: `RBK_${Date.now()}`,
          employeeId,
        });
        return false;
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  async performEndOfDayReport(accountIds: string[]): Promise<void> {
    let _totalBalance = 0;

    for (const accountId of accountIds) {
      const balance = await this.client.getAccountBalance(accountId);
      if (balance) {
        _totalBalance += balance.balance;
      }
    }
  }
}

// Export the client for use in other files
export { EAFinancialAPIClient };

// Run the example if this file is executed directly
if (import.meta.main) {
  runExample();
}
