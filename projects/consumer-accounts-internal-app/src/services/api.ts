import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  User,
  Account,
  AccountBalance,
  Transaction,
  TransactionHistory,
  TransactionRequest,
  Terms,
  HealthStatus,
  ServiceStatus,
  PaginationParams
} from '@/types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TIMEOUT = 10000; // 10 seconds

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(this.handleApiError(error));
      }
    );

    // Load token from localStorage on initialization
    this.loadToken();
  }

  // Token Management
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('ea_financial_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('ea_financial_token');
  }

  private loadToken(): void {
    const savedToken = localStorage.getItem('ea_financial_token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  // Error Handling
  private handleApiError(error: AxiosError): Error {
    if (error.response?.data) {
      const apiError = error.response.data as ApiResponse;
      return new Error(apiError.message || 'An API error occurred');
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('Request timed out. Please try again.');
    }

    if (error.code === 'ERR_NETWORK') {
      return new Error('Network error. Please check your connection and API server status.');
    }

    return new Error(error.message || 'An unexpected error occurred');
  }

  // Health and Status Endpoints
  async getHealth(): Promise<HealthStatus> {
    const response = await this.api.get<HealthStatus>('/health');
    return response.data;
  }

  async getStatus(): Promise<ServiceStatus> {
    const response = await this.api.get<ServiceStatus>('/status');
    return response.data;
  }

  async getApiInfo(): Promise<any> {
    const response = await this.api.get('/');
    return response.data;
  }

  // Authentication Endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);

    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      this.setToken(authData.token);
      return authData;
    }

    throw new Error(response.data.message || 'Login failed');
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async verifyToken(): Promise<User> {
    const response = await this.api.get<ApiResponse<User>>('/auth/verify');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Token verification failed');
  }

  // Account Endpoints
  async getAccount(accountId: string): Promise<Account> {
    const response = await this.api.get<ApiResponse<Account>>(`/accounts/${accountId}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch account');
  }

  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const response = await this.api.get<ApiResponse<AccountBalance>>(`/accounts/${accountId}/balance`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch account balance');
  }

  async creditAccount(accountId: string, transaction: TransactionRequest): Promise<Transaction> {
    const response = await this.api.post<ApiResponse<Transaction>>(
      `/accounts/${accountId}/credit`,
      transaction
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Credit transaction failed');
  }

  async debitAccount(accountId: string, transaction: TransactionRequest): Promise<Transaction> {
    const response = await this.api.post<ApiResponse<Transaction>>(
      `/accounts/${accountId}/debit`,
      transaction
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Debit transaction failed');
  }

  async getTransactionHistory(
    accountId: string,
    params: PaginationParams = {}
  ): Promise<TransactionHistory> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `/accounts/${accountId}/transactions${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.api.get<ApiResponse<TransactionHistory>>(url);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch transaction history');
  }

  // Terms and Policies Endpoints
  async getAllTerms(): Promise<Terms> {
    const response = await this.api.get<ApiResponse<Terms>>('/terms');

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch terms');
  }

  async getGeneralTerms(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/terms/general');

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch general terms');
  }

  async getEmployeeProcedures(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/terms/employee-procedures');

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch employee procedures');
  }

  async getRegulatoryDisclosures(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/terms/regulatory');

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch regulatory disclosures');
  }

  async getAccountPolicies(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/terms/account-policies');

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch account policies');
  }

  async getTransactionLimits(): Promise<any> {
    const response = await this.api.get<ApiResponse>('/terms/transaction-limits');

    if (response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch transaction limits');
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Test connectivity to the API
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch {
      return false;
    }
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export class for testing purposes
export { ApiService };

// Export convenient methods for direct use
export const {
  login,
  logout,
  verifyToken,
  getAccount,
  getAccountBalance,
  creditAccount,
  debitAccount,
  getTransactionHistory,
  getAllTerms,
  getGeneralTerms,
  getEmployeeProcedures,
  getRegulatoryDisclosures,
  getAccountPolicies,
  getTransactionLimits,
  getHealth,
  getStatus,
  testConnection
} = apiService;
