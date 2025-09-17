import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePermissions } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import {
  type Account,
  PERMISSIONS,
  type Transaction,
  type TransactionHistory as TransactionHistoryType,
} from '@/types';

interface TransactionHistoryState {
  account: Account | null;
  transactions: TransactionHistoryType | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  filters: {
    type: 'all' | 'credit' | 'debit';
    dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
    startDate: string;
    endDate: string;
    searchTerm: string;
  };
}

const TransactionHistory: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [state, setState] = useState<TransactionHistoryState>({
    account: null,
    transactions: null,
    loading: true,
    error: null,
    filters: {
      type: 'all',
      dateRange: 'all',
      startDate: '',
      endDate: '',
    },
    currentPage: 1,
    pageSize: 25,
  });

  const loadAccountData = useCallback(async (id: string) => {
    try {
      const accountData = await apiService.getAccount(id);
      setState(prev => ({
        ...prev,
        account: accountData,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load account data',
      }));
    }
  }, []);

  useEffect(() => {
    // Check permissions
    if (!hasPermission(PERMISSIONS.VIEW_TRANSACTIONS)) {
      navigate('/dashboard');
      return;
    }

    if (accountId) {
      loadAccountData(accountId);
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No account ID provided',
      }));
    }
  }, [accountId, hasPermission, navigate, loadAccountData]);

  const loadTransactionHistory = useCallback(
    async (id: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const transactionsData = await apiService.getTransactionHistory(id, {
          page: state.currentPage,
          limit: state.pageSize,
        });

        setState(prev => ({
          ...prev,
          transactions: transactionsData,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load transaction history',
        }));
      }
    },
    [state.currentPage, state.pageSize]
  );

  useEffect(() => {
    if (accountId && state.account) {
      loadTransactionHistory(accountId);
    }
  }, [accountId, loadTransactionHistory, state.account]);

  const handlePageChange = (newPage: number) => {
    setState(prev => ({ ...prev, currentPage: newPage }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setState(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1,
    }));
  };

  const handleFilterChange = (filterKey: keyof typeof state.filters, value: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterKey]: value },
      currentPage: 1,
    }));
  };

  const clearFilters = () => {
    setState(prev => ({
      ...prev,
      filters: {
        type: 'all',
        dateRange: 'all',
        startDate: '',
        endDate: '',
        searchTerm: '',
      },
      currentPage: 1,
    }));
  };

  const exportTransactions = () => {
    // TODO: Implement export functionality
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const _formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? '💰' : '💸';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { class: 'status-completed', label: 'Completed', icon: '✅' },
      pending: { class: 'status-pending', label: 'Pending', icon: '⏳' },
      failed: { class: 'status-failed', label: 'Failed', icon: '❌' },
      cancelled: { class: 'status-cancelled', label: 'Cancelled', icon: '🚫' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      class: 'status-unknown',
      label: status,
      icon: '❓',
    };

    return (
      <span className={`status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Filter transactions based on current filters
  const filteredTransactions =
    state.transactions?.transactions?.filter((transaction: Transaction) => {
      // Type filter
      if (state.filters.type !== 'all' && transaction.type !== state.filters.type) {
        return false;
      }

      // Search term filter
      if (state.filters.searchTerm) {
        const searchTerm = state.filters.searchTerm.toLowerCase();
        const searchableFields = [
          transaction.description,
          transaction.reference,
          transaction.transactionId,
          transaction.employeeName || '',
        ];

        if (!searchableFields.some(field => field.toLowerCase().includes(searchTerm))) {
          return false;
        }
      }

      // Date range filter
      if (state.filters.dateRange !== 'all') {
        const transactionDate = new Date(transaction.timestamp);
        const now = new Date();

        switch (state.filters.dateRange) {
          case 'today': {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (transactionDate < today) {
              return false;
            }
            break;
          }
          case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (transactionDate < weekAgo) {
              return false;
            }
            break;
          }
          case 'month': {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (transactionDate < monthAgo) {
              return false;
            }
            break;
          }
          case 'custom':
            if (state.filters.startDate && transactionDate < new Date(state.filters.startDate)) {
              return false;
            }
            if (state.filters.endDate && transactionDate > new Date(state.filters.endDate)) {
              return false;
            }
            break;
        }
      }

      return true;
    }) || [];

  if (!hasPermission(PERMISSIONS.VIEW_TRANSACTIONS)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <div className="access-denied-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You don't have permission to view transaction history.</p>
          <button type="button" onClick={() => navigate('/dashboard')} className="primary-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="transaction-history-loading">
        <div className="loading-spinner" />
        <p>Loading transaction history...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="transaction-history-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Transactions</h2>
          <p>{state.error}</p>
          <div className="error-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="secondary-button"
            >
              Return to Dashboard
            </button>
            {accountId && (
              <button
                type="button"
                onClick={() => loadTransactionHistory(accountId)}
                className="primary-button"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!state.account || !state.transactions) {
    return (
      <div className="transaction-history-not-found">
        <div className="not-found-content">
          <div className="not-found-icon">🔍</div>
          <h2>No Data Available</h2>
          <p>Unable to load account or transaction data.</p>
          <button type="button" onClick={() => navigate('/dashboard')} className="primary-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { account, transactions } = state;
  const totalPages = transactions.pagination.totalPages;

  return (
    <div className="transaction-history">
      <div className="transaction-history-header">
        <div className="header-left">
          <button
            type="button"
            onClick={() => navigate(`/accounts/${accountId}`)}
            className="back-button"
            aria-label="Back to Account Details"
          >
            ← Back to Account
          </button>
          <div className="history-title">
            <div className="history-icon">📊</div>
            <div className="title-content">
              <h1>Transaction History</h1>
              <p>
                {account.customerName} • {account.accountNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button
            type="button"
            onClick={exportTransactions}
            className="export-button"
            title="Export Transactions"
          >
            📊 Export
          </button>
        </div>
      </div>

      <div className="transaction-history-content">
        {/* Filters and Search */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="search-group">
              <input
                type="text"
                placeholder="Search transactions..."
                value={state.filters.searchTerm}
                onChange={e => handleFilterChange('searchTerm', e.target.value)}
                className="search-input"
              />
              <div className="search-icon">🔍</div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Type:</span>
              <select
                value={state.filters.type}
                onChange={e => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="credit">Credits Only</option>
                <option value="debit">Debits Only</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-label">Date Range:</span>
              <select
                value={state.filters.dateRange}
                onChange={e => handleFilterChange('dateRange', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {state.filters.dateRange === 'custom' && (
              <>
                <div className="filter-group">
                  <span className="filter-label">Start Date:</span>
                  <input
                    type="date"
                    value={state.filters.startDate}
                    onChange={e => handleFilterChange('startDate', e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="filter-group">
                  <span className="filter-label">End Date:</span>
                  <input
                    type="date"
                    value={state.filters.endDate}
                    onChange={e => handleFilterChange('endDate', e.target.value)}
                    className="date-input"
                  />
                </div>
              </>
            )}

            <button type="button" onClick={clearFilters} className="clear-filters-button">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="summary-section">
          <div className="summary-stats">
            <div className="stat-item">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{transactions.pagination.total}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Credits</div>
              <div className="stat-value credit">
                {transactions.transactions.filter(t => t.type === 'credit').length}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Debits</div>
              <div className="stat-value debit">
                {transactions.transactions.filter(t => t.type === 'debit').length}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Current Balance</div>
              <div className="stat-value balance">{formatCurrency(account.balance)}</div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="transactions-section">
          <div className="transactions-header">
            <h2>Transactions</h2>
            <div className="page-size-selector">
              <span className="filter-label">Show:</span>
              <select
                value={state.pageSize}
                onChange={e => handlePageSizeChange(Number.parseInt(e.target.value, 10))}
                className="page-size-select"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="no-transactions">
              <div className="no-transactions-icon">📭</div>
              <h3>No Transactions Found</h3>
              <p>
                {state.filters.type !== 'all' ||
                state.filters.dateRange !== 'all' ||
                state.filters.searchTerm
                  ? 'No transactions match your current filters.'
                  : 'No transactions have been processed for this account yet.'}
              </p>
              {(state.filters.type !== 'all' ||
                state.filters.dateRange !== 'all' ||
                state.filters.searchTerm) && (
                <button type="button" onClick={clearFilters} className="primary-button">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="transactions-table">
                <div className="table-header">
                  <div className="header-cell">Date & Time</div>
                  <div className="header-cell">Type</div>
                  <div className="header-cell">Description</div>
                  <div className="header-cell">Reference</div>
                  <div className="header-cell">Amount</div>
                  <div className="header-cell">Balance</div>
                  <div className="header-cell">Status</div>
                  <div className="header-cell">Employee</div>
                </div>

                <div className="table-body">
                  {filteredTransactions.map(transaction => (
                    <div key={transaction.transactionId} className="table-row">
                      <div className="table-cell date-cell">
                        <div className="date-primary">{formatShortDate(transaction.timestamp)}</div>
                        <div className="date-secondary">
                          {new Date(transaction.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="table-cell type-cell">
                        <div className="transaction-type">
                          <span className="type-icon">{getTransactionIcon(transaction.type)}</span>
                          <span className="type-label">
                            {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                          </span>
                        </div>
                      </div>

                      <div className="table-cell description-cell">
                        <div className="description-text">{transaction.description}</div>
                      </div>

                      <div className="table-cell reference-cell">
                        <div className="reference-text">{transaction.reference}</div>
                      </div>

                      <div className="table-cell amount-cell">
                        <div className={`amount ${transaction.type}`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>

                      <div className="table-cell balance-cell">
                        <div className="balance-amount">
                          {formatCurrency(transaction.balanceAfter)}
                        </div>
                      </div>

                      <div className="table-cell status-cell">
                        {getStatusBadge(transaction.status)}
                      </div>

                      <div className="table-cell employee-cell">
                        <div className="employee-info">
                          <div className="employee-id">{transaction.employeeId}</div>
                          {transaction.employeeName && (
                            <div className="employee-name">{transaction.employeeName}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {(state.currentPage - 1) * state.pageSize + 1} to{' '}
                    {Math.min(state.currentPage * state.pageSize, transactions.pagination.total)} of{' '}
                    {transactions.pagination.total} transactions
                  </div>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={state.currentPage <= 1}
                      className="pagination-button"
                    >
                      ← Previous
                    </button>

                    <div className="page-numbers">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (state.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (state.currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = state.currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`page-button ${state.currentPage === pageNum ? 'active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={state.currentPage >= totalPages}
                      className="pagination-button"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
