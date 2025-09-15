// User and Authentication Types
export interface User {
  id: string;
  username: string;
  role: 'representative' | 'senior_representative' | 'manager' | 'analyst';
  permissions: string[];
  isActive?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Account Types
export interface Account {
  accountId: string;
  accountNumber: string;
  customerId: string;
  customerName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'loan';
  balance: number;
  status: 'active' | 'inactive' | 'frozen' | 'closed';
  openDate: string;
  lastActivity: string;
  interestRate?: number;
  creditLimit?: number;
  minimumBalance?: number;
}

export interface AccountBalance {
  accountId: string;
  currentBalance: number;
  availableBalance: number;
  pendingTransactions: number;
  lastUpdated: string;
}

// Transaction Types
export interface Transaction {
  transactionId: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  employeeId: string;
  employeeName?: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  balanceBefore: number;
  balanceAfter: number;
}

export interface TransactionRequest {
  amount: number;
  description: string;
  reference: string;
  employeeId: string;
}

export interface TransactionHistory {
  accountId: string;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Terms and Policies Types
export interface TermsSection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
  version: string;
}

export interface Terms {
  general: TermsSection[];
  employeeProcedures: TermsSection[];
  regulatory: TermsSection[];
  accountPolicies: TermsSection[];
  transactionLimits: TermsSection[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  timestamp?: string;
}

// Health and Status Types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
}

export interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  services: {
    authentication: string;
    accounts: string;
    terms: string;
    database: string;
  };
  timestamp: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Form Types
export interface AccountSearchForm {
  accountId: string;
  customerId?: string;
  accountNumber?: string;
}

export interface TransactionForm {
  accountId: string;
  type: 'credit' | 'debit';
  amount: string;
  description: string;
  reference: string;
}

// Navigation Types
export interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
  requiredPermissions?: string[];
}

// Permission Constants
export const PERMISSIONS = {
  VIEW_ACCOUNTS: 'view_accounts',
  VIEW_TRANSACTIONS: 'view_transactions',
  BASIC_OPERATIONS: 'basic_operations',
  ADVANCED_OPERATIONS: 'advanced_operations',
  ACCOUNT_MANAGEMENT: 'account_management',
  RISK_ANALYSIS: 'risk_analysis'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  representative: [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.VIEW_TRANSACTIONS
  ],
  senior_representative: [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.BASIC_OPERATIONS
  ],
  manager: [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.BASIC_OPERATIONS,
    PERMISSIONS.ADVANCED_OPERATIONS,
    PERMISSIONS.ACCOUNT_MANAGEMENT
  ],
  analyst: [
    PERMISSIONS.VIEW_ACCOUNTS,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.RISK_ANALYSIS
  ]
};
