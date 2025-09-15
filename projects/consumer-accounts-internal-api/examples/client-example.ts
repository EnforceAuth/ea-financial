/**
 * EA Financial Consumer Accounts Internal API - Client Example
 *
 * This file demonstrates how to interact with the API from a TypeScript client.
 * Run this example with: bun run examples/client-example.ts
 */

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user: any;
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

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      console.log(`✓ Logged in as: ${response.data.user.firstName} ${response.data.user.lastName} (${response.data.user.role})`);
      return true;
    }

    console.error('❌ Login failed:', response.message);
    return false;
  }

  async logout(): Promise<boolean> {
    if (!this.token) {
      console.log('ℹ️ Already logged out');
      return true;
    }

    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    if (response.success) {
      this.token = null;
      console.log('✓ Logged out successfully');
      return true;
    }

    console.error('❌ Logout failed:', response.message);
    return false;
  }

  async getAccountBalance(accountId: string): Promise<BalanceResponse | null> {
    const response = await this.request<BalanceResponse>(`/accounts/${accountId}/balance`);

    if (response.success && response.data) {
      console.log(`💰 Balance for ${accountId}: $${response.data.balance} ${response.data.currency}`);
      return response.data;
    }

    console.error('❌ Failed to get balance:', response.message);
    return null;
  }

  async getAccount(accountId: string): Promise<any> {
    const response = await this.request(`/accounts/${accountId}`);

    if (response.success && response.data) {
      console.log(`📋 Account ${accountId}:`, {
        type: response.data.accountType,
        status: response.data.status,
        balance: `$${response.data.balance}`,
        customerId: response.data.customerId,
      });
      return response.data;
    }

    console.error('❌ Failed to get account:', response.message);
    return null;
  }

  async creditAccount(accountId: string, request: TransactionRequest): Promise<any> {
    const response = await this.request(`/accounts/${accountId}/credit`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      console.log(`✓ Credited $${request.amount} to ${accountId}. New balance: $${response.data.newBalance}`);
      return response.data;
    }

    console.error('❌ Credit failed:', response.message);
    return null;
  }

  async debitAccount(accountId: string, request: TransactionRequest): Promise<any> {
    const response = await this.request(`/accounts/${accountId}/debit`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      console.log(`✓ Debited $${request.amount} from ${accountId}. New balance: $${response.data.newBalance}`);
      return response.data;
    }

    console.error('❌ Debit failed:', response.message);
    return null;
  }

  async getTransactionHistory(accountId: string, limit: number = 10): Promise<any[]> {
    const response = await this.request(`/accounts/${accountId}/transactions?limit=${limit}`);

    if (response.success && response.data?.transactions) {
      console.log(`📊 Recent transactions for ${accountId}:`);
      response.data.transactions.forEach((txn: any, index: number) => {
        const sign = txn.type === 'credit' ? '+' : '-';
        console.log(`  ${index + 1}. ${sign}$${txn.amount} - ${txn.description} (${new Date(txn.timestamp).toLocaleDateString()})`);
      });
      return response.data.transactions;
    }

    console.error('❌ Failed to get transactions:', response.message);
    return [];
  }

  async getTerms(section?: string): Promise<any> {
    const endpoint = section ? `/terms/${section}` : '/terms';
    const response = await this.request(endpoint);

    if (response.success && response.data) {
      console.log(`📄 Terms retrieved: ${section || 'all sections'}`);
      return response.data;
    }

    console.error('❌ Failed to get terms:', response.message);
    return null;
  }
}

// Example usage
async function runExample() {
  console.log('🏦 EA Financial API Client Example');
  console.log('==================================\n');

  const client = new EAFinancialAPIClient();

  try {
    // 1. Login as manager
    console.log('1️⃣ Authenticating...');
    const loginSuccess = await client.login('mjohnson', 'password456');
    if (!loginSuccess) {
      throw new Error('Authentication failed');
    }

    // 2. Get account information
    console.log('\n2️⃣ Getting account information...');
    await client.getAccount('acc_001');
    await client.getAccountBalance('acc_001');

    // 3. Perform transactions
    console.log('\n3️⃣ Performing transactions...');
    await client.creditAccount('acc_001', {
      amount: 250.00,
      description: 'Client Example Credit',
      reference: 'CLIENT_001',
      employeeId: 'emp_67890'
    });

    await client.debitAccount('acc_001', {
      amount: 100.00,
      description: 'Client Example Debit',
      reference: 'CLIENT_002',
      employeeId: 'emp_67890'
    });

    // 4. Check updated balance
    console.log('\n4️⃣ Checking updated balance...');
    await client.getAccountBalance('acc_001');

    // 5. Get transaction history
    console.log('\n5️⃣ Getting transaction history...');
    await client.getTransactionHistory('acc_001', 5);

    // 6. Access terms and policies
    console.log('\n6️⃣ Accessing terms and policies...');
    await client.getTerms('account-policies');

    // 7. Error handling example
    console.log('\n7️⃣ Testing error handling...');
    await client.getAccountBalance('acc_999'); // Non-existent account

    // 8. Logout
    console.log('\n8️⃣ Logging out...');
    await client.logout();

    console.log('\n✅ Example completed successfully!');

  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Additional utility functions for common operations
export class BankingOperations {
  constructor(private client: EAFinancialAPIClient) {}

  async transferFunds(fromAccountId: string, toAccountId: string, amount: number, employeeId: string): Promise<boolean> {
    try {
      // Debit from source account
      const debitResult = await this.client.debitAccount(fromAccountId, {
        amount,
        description: `Transfer to ${toAccountId}`,
        reference: `TXF_${Date.now()}`,
        employeeId
      });

      if (!debitResult) {
        return false;
      }

      // Credit to destination account
      const creditResult = await this.client.creditAccount(toAccountId, {
        amount,
        description: `Transfer from ${fromAccountId}`,
        reference: `TXF_${Date.now()}`,
        employeeId
      });

      if (!creditResult) {
        // Rollback: credit back to source account
        await this.client.creditAccount(fromAccountId, {
          amount,
          description: `Transfer rollback - failed to credit ${toAccountId}`,
          reference: `RBK_${Date.now()}`,
          employeeId
        });
        return false;
      }

      console.log(`✓ Transfer successful: $${amount} from ${fromAccountId} to ${toAccountId}`);
      return true;

    } catch (error) {
      console.error('❌ Transfer failed:', error);
      return false;
    }
  }

  async performEndOfDayReport(accountIds: string[]): Promise<void> {
    console.log('📊 End of Day Report');
    console.log('==================');

    let totalBalance = 0;

    for (const accountId of accountIds) {
      const balance = await this.client.getAccountBalance(accountId);
      if (balance) {
        totalBalance += balance.balance;
      }
    }

    console.log(`\n💰 Total Portfolio Balance: $${totalBalance.toFixed(2)}`);
  }
}

// Export the client for use in other files
export { EAFinancialAPIClient };

// Run the example if this file is executed directly
if (import.meta.main) {
  runExample();
}
