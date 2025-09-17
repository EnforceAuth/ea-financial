import type React from 'react';
import { type FormEvent, useId, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { LoginCredentials } from '@/types';

interface LoginState {
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const [state, setState] = useState<LoginState>({
    username: '',
    password: '',
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const demoCredentials = [
    {
      username: 'jsmith',
      password: 'password123',
      role: 'Senior Representative',
    },
    { username: 'mjohnson', password: 'password456', role: 'Manager' },
    { username: 'rbrown', password: 'password789', role: 'Representative' },
    { username: 'slee', password: 'password000', role: 'Analyst (Inactive)' },
  ];

  const handleInputChange = (field: keyof LoginState, value: string) => {
    setState(prev => ({
      ...prev,
      [field]: value,
      error: null, // Clear error when user starts typing
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!state.username.trim() || !state.password.trim()) {
      setState(prev => ({
        ...prev,
        error: 'Please enter both username and password',
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const credentials: LoginCredentials = {
        username: state.username.trim(),
        password: state.password,
      };

      await login(credentials);
      // Navigation will be handled by the App component
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed. Please try again.',
      }));
    }
  };

  const handleDemoLogin = (credentials: { username: string; password: string }) => {
    setState(prev => ({
      ...prev,
      username: credentials.username,
      password: credentials.password,
      error: null,
    }));
  };

  const togglePasswordVisibility = () => {
    setState(prev => ({ ...prev, showPassword: !prev.showPassword }));
  };

  const user_id = useId();
  const pass_id = useId();

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="bank-logo">
              <div className="logo-icon">🏦</div>
              <h1>EA Financial</h1>
            </div>
            <h2>Employee Portal</h2>
            <p>Consumer Accounts Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id={user_id}
                value={state.username}
                onChange={e => handleInputChange('username', e.target.value)}
                placeholder="Enter your username"
                disabled={state.isLoading}
                autoComplete="username"
                required={true}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-group">
                <input
                  type={state.showPassword ? 'text' : 'password'}
                  id={pass_id}
                  value={state.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  disabled={state.isLoading}
                  autoComplete="current-password"
                  required={true}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={state.isLoading}
                  aria-label={state.showPassword ? 'Hide password' : 'Show password'}
                >
                  {state.showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {state.error && (
              <div className="error-message" role="alert">
                <span className="error-icon">⚠️</span>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={state.isLoading || !state.username.trim() || !state.password.trim()}
            >
              {state.isLoading ? (
                <>
                  <span className="loading-spinner-small" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="demo-section">
            <h3>Demo Credentials</h3>
            <p>Click any credential set to populate the form:</p>
            <div className="demo-credentials">
              {demoCredentials.map(cred => (
                <button
                  key={cred.username}
                  type="button"
                  className="demo-credential-card"
                  onClick={() => handleDemoLogin(cred)}
                >
                  <div className="demo-username">{cred.username}</div>
                  <div className="demo-role">{cred.role}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="login-footer">
            <div className="security-notice">
              <span className="security-icon">🔒</span>
              <span>This is a secure internal banking system</span>
            </div>
            <div className="version-info">Version 1.0.0 | EA Financial Internal Use Only</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
