import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, usePermissions } from '@/context/AuthContext';
import { PERMISSIONS, Account, TransactionRequest, Transaction } from '@/types';
import { apiService } from '@/services/api';

interface TransactionFormData {
  type: 'credit' | 'debit';
  amount: string;
  description: string;
  reference: string;
}

interface ProcessTransactionState {
  account: Account | null;
  formData: TransactionFormData;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: Transaction | null;
  validationErrors: Record<string, string>;
}

const ProcessTransaction: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [state, setState] = useState<ProcessTransactionState>({
    account: null,
    formData: {
      type: 'credit',
      amount: '',
      description: '',
      reference: '',
    },
    loading: true,
    submitting: false,
    error: null,
    success: null,
    validationErrors: {},
  });

  useEffect(() => {
    // Check permissions
    if (!hasPermission(PERMISSIONS.BASIC_OPERATIONS)) {
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
  }, [accountId, hasPermission, navigate]);

  const loadAccountData = async (id: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const accountData = await apiService.getAccount(id);

      // Generate a default reference number
      const defaultReference = `TXN${Date.now()}`;

      setState(prev => ({
        ...prev,
        account: accountData,
        formData: {
          ...prev.formData,
          reference: defaultReference,
        },
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const { amount, description, reference } = state.formData;

    // Validate amount
    const numAmount = parseFloat(amount);
    if (!amount.trim()) {
      errors.amount = 'Amount is required';
    } else if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (numAmount > 999999.99) {
      errors.amount = 'Amount cannot exceed $999,999.99';
    }

    // Validate description
    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.trim().length < 3) {
      errors.description = 'Description must be at least 3 characters';
    } else if (description.trim().length > 100) {
      errors.description = 'Description cannot exceed 100 characters';
    }

    // Validate reference
    if (!reference.trim()) {
      errors.reference = 'Reference is required';
    } else if (reference.trim().length < 3) {
      errors.reference = 'Reference must be at least 3 characters';
    } else if (reference.trim().length > 50) {
      errors.reference = 'Reference cannot exceed 50 characters';
    }

    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof TransactionFormData, value: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
      validationErrors: { ...prev.validationErrors, [field]: '' },
      error: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.account || !user) return;

    if (!validateForm()) return;

    const { type, amount, description, reference } = state.formData;

    setState(prev => ({ ...prev, submitting: true, error: null }));

    try {
      const transactionRequest: TransactionRequest = {
        amount: parseFloat(amount),
        description: description.trim(),
        reference: reference.trim(),
        employeeId: user.id,
      };

      let result: Transaction;
      if (type === 'credit') {
        result = await apiService.creditAccount(state.account.accountId, transactionRequest);
      } else {
        result = await apiService.debitAccount(state.account.accountId, transactionRequest);
      }

      setState(prev => ({
        ...prev,
        submitting: false,
        success: result,
        formData: {
          type: 'credit',
          amount: '',
          description: '',
          reference: `TXN${Date.now()}`,
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        submitting: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      }));
    }
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      formData: {
        type: 'credit',
        amount: '',
        description: '',
        reference: `TXN${Date.now()}`,
      },
      error: null,
      success: null,
      validationErrors: {},
    }));
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

  if (!hasPermission(PERMISSIONS.BASIC_OPERATIONS)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <div className="access-denied-icon">🚫</div>
          <h2>Access Denied</h2>
          <p>You don't have permission to process transactions.</p>
          <button onClick={() => navigate('/dashboard')} className="primary-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="transaction-loading">
        <div className="loading-spinner"></div>
        <p>Loading account information...</p>
      </div>
    );
  }

  if (state.error && !state.account) {
    return (
      <div className="transaction-error">
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

  if (!state.account) {
    return (
      <div className="transaction-not-found">
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

  const { account, formData, validationErrors } = state;

  // Check if account can process transactions
  const canProcessTransactions = account.status === 'active';

  return (
    <div className="process-transaction">
      <div className="transaction-header">
        <div className="header-left">
          <button
            onClick={() => navigate(`/accounts/${accountId}`)}
            className="back-button"
            aria-label="Back to Account Details"
          >
            ← Back to Account
          </button>
          <div className="transaction-title">
            <div className="transaction-icon">💰</div>
            <div className="title-content">
              <h1>Process Transaction</h1>
              <p>{account.customerName} • {account.accountNumber}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="transaction-content">
        {/* Success Message */}
        {state.success && (
          <div className="success-message">
            <div className="success-content">
              <div className="success-icon">✅</div>
              <div className="success-details">
                <h3>Transaction Successful!</h3>
                <p>
                  {state.success.type === 'credit' ? 'Credited' : 'Debited'} {formatCurrency(state.success.amount)}
                </p>
                <div className="success-meta">
                  <div>Transaction ID: {state.success.transactionId}</div>
                  <div>Reference: {state.success.reference}</div>
                  <div>Processed: {formatDate(state.success.timestamp)}</div>
                  <div>New Balance: {formatCurrency(state.success.balanceAfter)}</div>
                </div>
              </div>
            </div>
            <div className="success-actions">
              <Link
                to={`/accounts/${accountId}`}
                className="primary-button"
              >
                View Account Details
              </Link>
              <button
                onClick={handleReset}
                className="secondary-button"
              >
                Process Another Transaction
              </button>
            </div>
          </div>
        )}

        {/* Account Status Warning */}
        {!canProcessTransactions && (
          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h3>Account Status Warning</h3>
              <p>
                This account is currently {account.status}. Transactions cannot be processed
                on inactive, frozen, or closed accounts.
              </p>
            </div>
          </div>
        )}

        <div className="transaction-grid">
          {/* Account Summary */}
          <div className="account-summary-section">
            <h2>Account Summary</h2>
            <div className="summary-card">
              <div className="summary-item">
                <label>Account Holder</label>
                <value>{account.customerName}</value>
              </div>
              <div className="summary-item">
                <label>Account Number</label>
                <value>{account.accountNumber}</value>
              </div>
              <div className="summary-item">
                <label>Account Type</label>
                <value>{account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}</value>
              </div>
              <div className="summary-item">
                <label>Current Balance</label>
                <value className="balance-amount">{formatCurrency(account.balance)}</value>
              </div>
              <div className="summary-item">
                <label>Status</label>
                <value>
                  <span className={`status-badge status-${account.status}`}>
                    {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                  </span>
                </value>
              </div>
            </div>
          </div>

          {/* Transaction Form */}
          <div className="transaction-form-section">
            <h2>Transaction Details</h2>
            <form onSubmit={handleSubmit} className="transaction-form">
              {/* Transaction Type */}
              <div className="form-group">
                <label>Transaction Type</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="credit"
                      checked={formData.type === 'credit'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      disabled={state.submitting || !canProcessTransactions}
                    />
                    <span className="radio-label">
                      <span className="radio-icon">💰</span>
                      Credit (Deposit)
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="debit"
                      checked={formData.type === 'debit'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      disabled={state.submitting || !canProcessTransactions}
                    />
                    <span className="radio-label">
                      <span className="radio-icon">💸</span>
                      Debit (Withdrawal)
                    </span>
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div className="form-group">
                <label htmlFor="amount">Amount</label>
                <div className="currency-input-group">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="999999.99"
                    disabled={state.submitting || !canProcessTransactions}
                    className={validationErrors.amount ? 'error' : ''}
                  />
                </div>
                {validationErrors.amount && (
                  <div className="field-error">{validationErrors.amount}</div>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter transaction description"
                  maxLength={100}
                  disabled={state.submitting || !canProcessTransactions}
                  className={validationErrors.description ? 'error' : ''}
                />
                <div className="field-hint">
                  Provide a clear description of the transaction (3-100 characters)
                </div>
                {validationErrors.description && (
                  <div className="field-error">{validationErrors.description}</div>
                )}
              </div>

              {/* Reference */}
              <div className="form-group">
                <label htmlFor="reference">Reference Number</label>
                <input
                  type="text"
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Enter reference number"
                  maxLength={50}
                  disabled={state.submitting || !canProcessTransactions}
                  className={validationErrors.reference ? 'error' : ''}
                />
                <div className="field-hint">
                  Unique reference for tracking this transaction (3-50 characters)
                </div>
                {validationErrors.reference && (
                  <div className="field-error">{validationErrors.reference}</div>
                )}
              </div>

              {/* Error Message */}
              {state.error && (
                <div className="form-error" role="alert">
                  <span className="error-icon">⚠️</span>
                  {state.error}
                </div>
              )}

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="secondary-button"
                  disabled={state.submitting}
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    state.submitting ||
                    !canProcessTransactions ||
                    !formData.amount.trim() ||
                    !formData.description.trim() ||
                    !formData.reference.trim()
                  }
                >
                  {state.submitting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      {formData.type === 'credit' ? '💰' : '💸'}
                      Process {formData.type === 'credit' ? 'Credit' : 'Debit'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Transaction Preview */}
          {formData.amount && formData.description && formData.reference && (
            <div className="transaction-preview-section">
              <h2>Transaction Preview</h2>
              <div className="preview-card">
                <div className="preview-header">
                  <div className="preview-type">
                    <span className="preview-icon">
                      {formData.type === 'credit' ? '💰' : '💸'}
                    </span>
                    <span className="preview-label">
                      {formData.type === 'credit' ? 'Credit' : 'Debit'} Transaction
                    </span>
                  </div>
                </div>

                <div className="preview-details">
                  <div className="preview-item">
                    <label>Amount</label>
                    <value className={`amount ${formData.type}`}>
                      {formData.type === 'credit' ? '+' : '-'}{formatCurrency(parseFloat(formData.amount) || 0)}
                    </value>
                  </div>
                  <div className="preview-item">
                    <label>Description</label>
                    <value>{formData.description}</value>
                  </div>
                  <div className="preview-item">
                    <label>Reference</label>
                    <value>{formData.reference}</value>
                  </div>
                  <div className="preview-item">
                    <label>Current Balance</label>
                    <value>{formatCurrency(account.balance)}</value>
                  </div>
                  <div className="preview-item">
                    <label>Projected Balance</label>
                    <value className="projected-balance">
                      {formatCurrency(
                        account.balance +
                        (formData.type === 'credit' ? 1 : -1) * (parseFloat(formData.amount) || 0)
                      )}
                    </value>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessTransaction;
