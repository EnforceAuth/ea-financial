import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePermissions } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { type Account, type AccountBalance, PERMISSIONS, type TransactionHistory } from '@/types';

interface AccountDetailsState {
  account: Account | null;
  balance: AccountBalance | null;
  recentTransactions: TransactionHistory | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

const AccountDetails: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [state, setState] = useState<AccountDetailsState>({
    account: null,
    balance: null,
    recentTransactions: null,
    loading: true,
    error: null,
    refreshing: false,
  });

  const loadAccountData = useCallback(
    async (id: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Load account details and balance in parallel
        const [accountData, balanceData] = await Promise.all([
          apiService.getAccount(id),
          apiService.getAccountBalance(id),
        ]);

        // Load recent transactions if user has permission
        let transactionsData = null;
        if (hasPermission(PERMISSIONS.VIEW_TRANSACTIONS)) {
          try {
            transactionsData = await apiService.getTransactionHistory(id, {
              page: 1,
              limit: 5,
            });
          } catch (_error) {
            // Silently ignore transaction loading errors - not critical
          }
        }

        setState(prev => ({
          ...prev,
          account: accountData,
          balance: balanceData,
          recentTransactions: transactionsData,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load account data',
        }));
      }
    },
    [hasPermission]
  );

  const handleRefresh = async () => {
    if (!accountId) {
      return;
    }

    setState(prev => ({ ...prev, refreshing: true }));
    await loadAccountData(accountId);
    setState(prev => ({ ...prev, refreshing: false }));
  };

  useEffect(() => {
    if (accountId) {
      loadAccountData(accountId);
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No account ID provided',
      }));
    }
  }, [accountId, loadAccountData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return '🏦';
      case 'savings':
        return '💰';
      case 'credit':
        return '💳';
      case 'loan':
        return '🏠';
      default:
        return '📄';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { class: 'status-active', label: 'Active', icon: '✅' },
      inactive: { class: 'status-inactive', label: 'Inactive', icon: '⏸️' },
      frozen: { class: 'status-frozen', label: 'Frozen', icon: '🧊' },
      closed: { class: 'status-closed', label: 'Closed', icon: '❌' },
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

  if (state.loading) {
    return (
      <div className="account-details-loading">
        <div className="loading-spinner" />
        <p>Loading account details...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="account-details-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Account</h2>
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
                onClick={() => loadAccountData(accountId)}
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

  if (!state.account || !state.balance) {
    return (
      <div className="account-details-not-found">
        <div className="not-found-content">
          <div className="not-found-icon">🔍</div>
          <h2>Account Not Found</h2>
          <p>The requested account could not be found.</p>
          <button type="button" onClick={() => navigate('/dashboard')} className="primary-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { account, balance, recentTransactions } = state;

  return (
    <div className="account-details">
      <div className="account-details-header">
        <div className="header-left">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label="Back to Dashboard"
          >
            ← Back
          </button>
          <div className="account-title">
            <div className="account-icon">{getAccountTypeIcon(account.accountType)}</div>
            <div className="account-info">
              <h1>{account.customerName}'s Account</h1>
              <p>
                {account.accountNumber} •{' '}
                {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={state.refreshing}
            className="refresh-button"
            title="Refresh Account Data"
          >
            {state.refreshing ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      <div className="account-details-content">
        <div className="account-grid">
          {/* Account Information */}
          <div className="account-info-section">
            <h2>Account Information</h2>
            <div className="info-card">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Account ID</span>
                  <div className="info-value">{account.accountId}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Number</span>
                  <div className="info-value">{account.accountNumber}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Customer ID</span>
                  <div className="info-value">{account.customerId}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Customer Name</span>
                  <div className="info-value">{account.customerName}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Type</span>
                  <div className="info-value">
                    {getAccountTypeIcon(account.accountType)}{' '}
                    {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                  </div>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <div className="info-value">{getStatusBadge(account.status)}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Open Date</span>
                  <div className="info-value">{formatDate(account.openDate)}</div>
                </div>
                <div className="info-item">
                  <span className="info-label">Last Activity</span>
                  <div className="info-value">{formatDate(account.lastActivity)}</div>
                </div>
                {account.interestRate && (
                  <div className="info-item">
                    <span className="info-label">Interest Rate</span>
                    <div className="info-value">{(account.interestRate * 100).toFixed(2)}%</div>
                  </div>
                )}
                {account.creditLimit && (
                  <div className="info-item">
                    <span className="info-label">Credit Limit</span>
                    <div className="info-value">{formatCurrency(account.creditLimit)}</div>
                  </div>
                )}
                {account.minimumBalance && (
                  <div className="info-item">
                    <span className="info-label">Minimum Balance</span>
                    <div className="info-value">{formatCurrency(account.minimumBalance)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Balance Information */}
          <div className="balance-section">
            <h2>Balance Information</h2>
            <div className="balance-card">
              <div className="balance-main">
                <div className="balance-item current-balance">
                  <span className="info-label">Current Balance</span>
                  <div className="info-value balance-amount">
                    {formatCurrency(balance.currentBalance)}
                  </div>
                </div>
                <div className="balance-item available-balance">
                  <span className="info-label">Available Balance</span>
                  <div className="info-value balance-amount">
                    {formatCurrency(balance.availableBalance)}
                  </div>
                </div>
                {balance.pendingTransactions > 0 && (
                  <div className="balance-item pending-transactions">
                    <span className="info-label">Pending Transactions</span>
                    <div className="info-value pending-amount">
                      {formatCurrency(balance.pendingTransactions)}
                    </div>
                  </div>
                )}
              </div>
              <div className="balance-footer">
                <small>Last updated: {formatDate(balance.lastUpdated)}</small>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="actions-section">
            <h2>Quick Actions</h2>
            <div className="actions-card">
              <div className="action-buttons">
                {hasPermission(PERMISSIONS.BASIC_OPERATIONS) && account.status === 'active' && (
                  <Link
                    to={`/accounts/${account.accountId}/process-transaction`}
                    className="action-button primary"
                  >
                    <span className="action-icon">💰</span>
                    Process Transaction
                  </Link>
                )}

                {hasPermission(PERMISSIONS.VIEW_TRANSACTIONS) && (
                  <Link
                    to={`/accounts/${account.accountId}/transactions`}
                    className="action-button secondary"
                  >
                    <span className="action-icon">📊</span>
                    View All Transactions
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={state.refreshing}
                  className="action-button secondary"
                >
                  <span className="action-icon">🔄</span>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentTransactions && recentTransactions.transactions.length > 0 && (
            <div className="recent-transactions-section">
              <h2>Recent Transactions</h2>
              <div className="transactions-card">
                <div className="transactions-list">
                  {recentTransactions.transactions.slice(0, 5).map(transaction => (
                    <div key={transaction.transactionId} className="transaction-item">
                      <div className="transaction-icon">
                        {transaction.type === 'credit' ? '💰' : '💸'}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">{transaction.description}</div>
                        <div className="transaction-meta">
                          {formatDate(transaction.timestamp)} • Ref: {transaction.reference}
                        </div>
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${transaction.type}`}>
                          {transaction.type === 'credit' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                        <div className="balance-after">
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {recentTransactions.transactions.length > 0 && (
                  <div className="transactions-footer">
                    <Link
                      to={`/accounts/${account.accountId}/transactions`}
                      className="view-all-link"
                    >
                      View All {recentTransactions.pagination.total} Transactions →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDetails;
