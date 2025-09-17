import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/context/AuthContext';
import { apiService } from '@/services/api';
import { PERMISSIONS } from '@/types';

interface QuickStats {
  totalAccounts: number;
  activeAccounts: number;
  todayTransactions: number;
  pendingTransactions: number;
}

interface SystemHealth {
  status: string;
  lastChecked: string;
  services: {
    authentication: string;
    accounts: string;
    terms: string;
    database: string;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const [accountSearch, setAccountSearch] = useState('');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [quickStats] = useState<QuickStats>({
    totalAccounts: 150,
    activeAccounts: 142,
    todayTransactions: 47,
    pendingTransactions: 3,
  });
  const [_loading, _setLoading] = useState(false);

  useEffect(() => {
    loadSystemHealth();
  }, [loadSystemHealth]);

  const loadSystemHealth = async () => {
    try {
      const status = await apiService.getStatus();
      setSystemHealth({
        status: status.status,
        lastChecked: status.timestamp,
        services: status.services,
      });
    } catch (_error) {}
  };

  const handleAccountSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountSearch.trim()) {
      navigate(`/accounts/${accountSearch.trim()}`);
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'senior_representative':
        return 'Senior Representative';
      case 'representative':
        return 'Representative';
      case 'manager':
        return 'Manager';
      case 'analyst':
        return 'Analyst';
      default:
        return role;
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 17) {
      return 'Good afternoon';
    }
    return 'Good evening';
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
        return '🟢';
      case 'degraded':
        return '🟡';
      case 'down':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const quickActions = [
    {
      title: 'Account Lookup',
      description: 'Search and view account details',
      icon: '🔍',
      action: () => navigate('/accounts/search'),
      permission: PERMISSIONS.VIEW_ACCOUNTS,
      primary: true,
    },
    {
      title: 'Process Transaction',
      description: 'Credit or debit customer accounts',
      icon: '💰',
      action: () => navigate('/accounts/search?action=transaction'),
      permission: PERMISSIONS.BASIC_OPERATIONS,
      primary: true,
    },
    {
      title: 'View Terms',
      description: 'Access banking policies and procedures',
      icon: '📋',
      action: () => navigate('/terms'),
      permission: null,
      primary: false,
    },
    {
      title: 'Transaction History',
      description: 'Review recent account activity',
      icon: '📊',
      action: () => navigate('/accounts/search?action=history'),
      permission: PERMISSIONS.VIEW_TRANSACTIONS,
      primary: false,
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>
            {getWelcomeMessage()}, {user?.username}!
          </h1>
          <p>
            Welcome to the EA Financial Employee Portal. You are logged in as a{' '}
            <span className="user-role">{formatRole(user?.role || '')}</span>.
          </p>
        </div>

        <div className="quick-search">
          <form onSubmit={handleAccountSearch} className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Enter Account ID or Number"
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="search-input"
                disabled={!hasPermission(PERMISSIONS.VIEW_ACCOUNTS)}
              />
              <button
                type="submit"
                className="search-button"
                disabled={!accountSearch.trim() || !hasPermission(PERMISSIONS.VIEW_ACCOUNTS)}
              >
                🔍 Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Quick Stats */}
          <div className="stats-section">
            <h2>System Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{quickStats.totalAccounts}</div>
                  <div className="stat-label">Total Accounts</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{quickStats.activeAccounts}</div>
                  <div className="stat-label">Active Accounts</div>
                </div>
              </div>

              {hasPermission(PERMISSIONS.VIEW_TRANSACTIONS) && (
                <>
                  <div className="stat-card">
                    <div className="stat-icon">💸</div>
                    <div className="stat-content">
                      <div className="stat-value">{quickStats.todayTransactions}</div>
                      <div className="stat-label">Today's Transactions</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                      <div className="stat-value">{quickStats.pendingTransactions}</div>
                      <div className="stat-label">Pending Reviews</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="actions-section">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              {quickActions
                .filter(action => !action.permission || hasPermission(action.permission))
                .map((action, index) => (
                  <button
                    key={index}
                    className={`action-card ${action.primary ? 'primary' : ''}`}
                    onClick={action.action}
                  >
                    <div className="action-icon">{action.icon}</div>
                    <div className="action-content">
                      <div className="action-title">{action.title}</div>
                      <div className="action-description">{action.description}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* System Health */}
          <div className="health-section">
            <h2>System Status</h2>
            <div className="health-card">
              <div className="health-header">
                <div className="health-status">
                  <span className="status-icon">
                    {systemHealth?.status === 'operational' ? '🟢' : '🟡'}
                  </span>
                  <span className="status-text">
                    {systemHealth?.status === 'operational'
                      ? 'All Systems Operational'
                      : 'Checking Status...'}
                  </span>
                </div>
                {systemHealth && (
                  <div className="health-timestamp">
                    Last checked: {new Date(systemHealth.lastChecked).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {systemHealth && (
                <div className="services-status">
                  <div className="service-item">
                    <span className="service-icon">
                      {getServiceStatusIcon(systemHealth.services.authentication)}
                    </span>
                    <span className="service-name">Authentication</span>
                    <span className="service-status">{systemHealth.services.authentication}</span>
                  </div>

                  <div className="service-item">
                    <span className="service-icon">
                      {getServiceStatusIcon(systemHealth.services.accounts)}
                    </span>
                    <span className="service-name">Account Services</span>
                    <span className="service-status">{systemHealth.services.accounts}</span>
                  </div>

                  <div className="service-item">
                    <span className="service-icon">
                      {getServiceStatusIcon(systemHealth.services.terms)}
                    </span>
                    <span className="service-name">Terms & Policies</span>
                    <span className="service-status">{systemHealth.services.terms}</span>
                  </div>

                  <div className="service-item">
                    <span className="service-icon">
                      {getServiceStatusIcon(systemHealth.services.database)}
                    </span>
                    <span className="service-name">Database</span>
                    <span className="service-status">{systemHealth.services.database}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          {hasPermission(PERMISSIONS.VIEW_TRANSACTIONS) && (
            <div className="activity-section">
              <h2>Recent Activity</h2>
              <div className="activity-card">
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">💰</div>
                    <div className="activity-content">
                      <div className="activity-title">Account Credit - $500.00</div>
                      <div className="activity-details">Account: acc_001 • 2 minutes ago</div>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">🔍</div>
                    <div className="activity-content">
                      <div className="activity-title">Account Balance Inquiry</div>
                      <div className="activity-details">Account: acc_002 • 15 minutes ago</div>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">📊</div>
                    <div className="activity-content">
                      <div className="activity-title">Transaction History Review</div>
                      <div className="activity-details">Account: acc_003 • 1 hour ago</div>
                    </div>
                  </div>
                </div>

                <div className="activity-footer">
                  <Link to="/activity" className="view-all-link">
                    View All Recent Activity →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
