import type React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/context/AuthContext';
import { PERMISSIONS } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (_error) {
      // Still navigate to login even if logout request fails
      navigate('/login');
    }
  };

  const navigationItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '🏠',
      requiredPermissions: [],
    },
    {
      path: '/accounts/search',
      label: 'Account Search',
      icon: '🔍',
      requiredPermissions: [PERMISSIONS.VIEW_ACCOUNTS],
    },
    {
      path: '/terms',
      label: 'Terms & Policies',
      icon: '📋',
      requiredPermissions: [],
    },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'manager':
        return 'role-badge role-manager';
      case 'senior_representative':
        return 'role-badge role-senior';
      case 'representative':
        return 'role-badge role-representative';
      case 'analyst':
        return 'role-badge role-analyst';
      default:
        return 'role-badge';
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

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <div className="bank-logo">
              <div className="logo-icon">🏦</div>
              <div className="logo-text">
                <h1>EA Financial</h1>
                <span className="subtitle">Employee Portal</span>
              </div>
            </div>
          </div>

          <div className="header-center">
            <nav className="main-navigation">
              {navigationItems.map(item => {
                // Check if user has required permissions
                const hasRequiredPermissions =
                  item.requiredPermissions.length === 0 ||
                  item.requiredPermissions.every(permission => hasPermission(permission));

                if (!hasRequiredPermissions) {
                  return null;
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="header-right">
            <div className="user-info">
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
                <div className={getRoleBadgeClass(user?.role || '')}>
                  {formatRole(user?.role || '')}
                </div>
              </div>
              <div className="user-actions">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-button"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <span className="logout-icon">🚪</span>
                  <span className="logout-text">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="layout-main">
        <div className="main-content">{children}</div>
      </main>

      <footer className="layout-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span>EA Financial Internal System</span>
            <span className="separator">•</span>
            <span>Version 1.0.0</span>
          </div>
          <div className="footer-right">
            <span>For Internal Use Only</span>
            <span className="separator">•</span>
            <span>© 2024 EA Financial</span>
          </div>
        </div>
      </footer>

      {/* Quick Actions Sidebar (if needed) */}
      <div className="quick-actions">
        {hasPermission(PERMISSIONS.BASIC_OPERATIONS) && (
          <button
            type="button"
            className="quick-action-button"
            title="Quick Transaction"
            onClick={() => navigate('/accounts/search?action=transaction')}
          >
            💰
          </button>
        )}
        {hasPermission(PERMISSIONS.VIEW_ACCOUNTS) && (
          <button
            type="button"
            className="quick-action-button"
            title="Account Lookup"
            onClick={() => navigate('/accounts/search')}
          >
            👤
          </button>
        )}
      </div>
    </div>
  );
};

export default Layout;
