export interface Account {
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

export interface User {
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

export interface Transaction {
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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface BalanceRequest {
  accountId: string;
}

export interface BalanceResponse {
  accountId: string;
  balance: number;
  currency: string;
  status: string;
  lastUpdated: string;
}

export interface TransactionRequest {
  accountId: string;
  amount: number;
  description: string;
  reference?: string;
  employeeId: string;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  transaction?: Transaction;
  newBalance?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface TransactionHistoryQuery extends PaginationQuery {
  accountId: string;
  startDate?: string;
  endDate?: string;
  type?: 'debit' | 'credit';
}
