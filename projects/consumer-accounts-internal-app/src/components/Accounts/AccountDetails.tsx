import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePermissions } from '@/context/AuthContext';
import { PERMISSIONS, Account, AccountBalance, TransactionHistory } from '@/types';
import { apiService } from '@/services/api';

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
  }, [accountId]);

  const loadAccountData = async (id: string) => {
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
          transactionsData = await apiService.getTransactionHistory(id, { page: 1, limit: 5 });
        } catch (error) {
          console.warn('Failed to load transactions:', error);
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
  };

  const handleRefresh = async () => {
    if (!accountId) return;

    setState(prev => ({ ...prev, refreshing: true }));
    await loadAccountData(accountId);
    setState(prev => ({ ...prev, refreshing: false }));
  };

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
        <div className="loading-spinner"></div>
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
            <button onClick={() => navigate('/dashboard')} className="secondary-button">
              Return to Dashboard
            </button>
            {accountId && (
              <button onClick={() => loadAccountData(accountId)} className="primary-button">
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
          <button onClick={() => navigate('/dashboard')} className="primary-button">
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
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label="Back to Dashboard"
          >
            ← Back
          </button>
          <div className="account-title">
            <div className="account-icon">
              {getAccountTypeIcon(account.accountType)}
            </div>
            <div className="account-info">
              <h1>{account.customerName}'s Account</h1>
              <p>{account.accountNumber} • {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button
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
                  <label>Account ID</label>
                  <value>{account.accountId}</value>
                </div>
                <div className="info-item">
                  <label>Account Number</label>
                  <value>{account.accountNumber}</value>
                </div>
                <div className="info-item">
                  <label>Customer ID</label>
                  <value>{account.customerId}</value>
                </div>
                <div className="info-item">
                  <label>Customer Name</label>
                  <value>{account.customerName}</value>
                </div>
                <div className="info-item">
                  <label>Account Type</label>
                  <value>
                    {getAccountTypeIcon(account.accountType)} {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                  </value>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <value>{getStatusBadge(account.status)}</value>
                </div>
                <div className="info-item">
                  <label>Open Date</label>
                  <value>{formatDate(account.openDate)}</value>
                </div>
                <div className="info-item">
                  <label>Last Activity</label>
                  <value>{formatDate(account.lastActivity)}</value>
                </div>
                {account.interestRate && (
                  <div className="info-item">
                    <label>Interest Rate</label>
                    <value>{(account.interestRate * 100).toFixed(2)}%</value>
                  </div>
                )}
                {account.creditLimit && (
                  <div className="info-item">
                    <label>Credit Limit</label>
                    <value>{formatCurrency(account.creditLimit)}</value>
                  </div>
                )}
                {account.minimumBalance && (
                  <div className="info-item">
                    <label>Minimum Balance</label>
                    <value>{formatCurrency(account.minimumBalance)}</value>
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
                  <label>Current Balance</label>
                  <value className="balance-amount">{formatCurrency(balance.currentBalance)}</value>
                </div>
                <div className="balance-item available-balance">
                  <label>Available Balance</label>
                  <value className="balance-amount">{formatCurrency(balance.availableBalance)}</value>
                </div>
                {balance.pendingTransactions > 0 && (
                  <div className="balance-item pending-transactions">
                    <label>Pending Transactions</label>
                    <value className="pending-amount">{formatCurrency(balance.pendingTransactions)}</value>
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
                  {recentTransactions.transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.transactionId} className="transaction-item">
                      <div className="transaction-icon">
                        {transaction.type === 'credit' ? '💰' : '💸'}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">
                          {transaction.description}
                        </div>
                        <div className="transaction-meta">
                          {formatDate(transaction.timestamp)} • Ref: {transaction.reference}
                        </div>
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${transaction.type}`}>
                          {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
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
