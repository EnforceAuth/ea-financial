import React, { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoginCredentials } from "@/types";
import { apiService } from "@/services/api";

interface LoginState {
  username: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  dependencies: {
    opa: {
      status: string;
      url: string;
      error?: string;
    };
  };
}

const Login: React.FC = () => {
  const { login } = useAuth();
  const [state, setState] = useState<LoginState>({
    username: "",
    password: "",
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const checkSystemHealth = async () => {
    try {
      setHealthLoading(true);
      const healthData = await apiService.getHealth();
      setSystemHealth(healthData as SystemHealth);
      setLastHealthCheck(new Date());
    } catch (error) {
      console.warn("Failed to check system health:", error);
      // Set a default error state when health check fails
      setSystemHealth({
        status: "unknown",
        timestamp: new Date().toISOString(),
        service: "EA Financial - Consumer Accounts Internal API",
        version: "1.0.0",
        dependencies: {
          opa: {
            status: "unknown",
            url: "http://localhost:8181",
            error: "Unable to check system status",
          },
        },
      });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();

    // Check system health every 45 seconds
    const interval = setInterval(checkSystemHealth, 45000);

    return () => clearInterval(interval);
  }, []);

  const demoCredentials = [
    {
      username: "jsmith",
      password: "password123",
      role: "Senior Representative",
    },
    { username: "mjohnson", password: "password456", role: "Manager" },
    { username: "rbrown", password: "password789", role: "Representative" },
    { username: "slee", password: "password000", role: "Analyst (Inactive)" },
  ];

  const handleInputChange = (field: keyof LoginState, value: string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
      error: null, // Clear error when user starts typing
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!state.username.trim() || !state.password.trim()) {
      setState((prev) => ({
        ...prev,
        error: "Please enter both username and password",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const credentials: LoginCredentials = {
        username: state.username.trim(),
        password: state.password,
      };

      await login(credentials);
      // Navigation will be handled by the App component
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Login failed. Please try again.",
      }));
    }
  };

  const handleDemoLogin = (credentials: {
    username: string;
    password: string;
  }) => {
    setState((prev) => ({
      ...prev,
      username: credentials.username,
      password: credentials.password,
      error: null,
    }));
  };

  const togglePasswordVisibility = () => {
    setState((prev) => ({ ...prev, showPassword: !prev.showPassword }));
  };

  const isOpaDown = systemHealth?.dependencies.opa.status === "error";
  const systemDegraded = systemHealth?.status === "degraded";

  const getSystemStatusBanner = () => {
    if (healthLoading && !systemHealth) {
      return (
        <div className="system-status-banner checking">
          <div className="status-content">
            <span className="status-icon">🔄</span>
            <div className="status-text">
              <strong>Checking system status...</strong>
            </div>
          </div>
        </div>
      );
    }

    if (isOpaDown) {
      return (
        <div className="system-status-banner error">
          <div className="status-content">
            <span className="status-icon">🔒</span>
            <div className="status-text">
              <strong>Authorization Service Unavailable</strong>
              <p>
                The banking security system (OPA) is currently offline. Login is
                temporarily disabled for security reasons.
              </p>
              <div className="status-details">
                <span>System administrators have been notified.</span>
                <button
                  onClick={checkSystemHealth}
                  className="refresh-status-btn"
                  disabled={healthLoading}
                >
                  {healthLoading ? "Checking..." : "Check Status"}
                </button>
              </div>
            </div>
          </div>
          {lastHealthCheck && (
            <div className="status-timestamp">
              Last checked: {lastHealthCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      );
    }

    if (systemDegraded) {
      return (
        <div className="system-status-banner warning">
          <div className="status-content">
            <span className="status-icon">⚠️</span>
            <div className="status-text">
              <strong>System Running in Degraded Mode</strong>
              <p>
                Some banking services may be slower than usual. Login is
                available but some features may be limited.
              </p>
              <button
                onClick={checkSystemHealth}
                className="refresh-status-btn"
                disabled={healthLoading}
              >
                {healthLoading ? "Checking..." : "Check Status"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // System is healthy - show a brief success banner that auto-hides
    if (systemHealth?.status === "healthy") {
      return (
        <div className="system-status-banner success">
          <div className="status-content">
            <span className="status-icon">✅</span>
            <div className="status-text">
              <strong>All Systems Operational</strong>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          {/* System Status Banner */}
          {getSystemStatusBanner()}

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
                id="username"
                value={state.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
                disabled={state.isLoading}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-group">
                <input
                  type={state.showPassword ? "text" : "password"}
                  id="password"
                  value={state.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="Enter your password"
                  disabled={state.isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={state.isLoading}
                  aria-label={
                    state.showPassword ? "Hide password" : "Show password"
                  }
                >
                  {state.showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {state.error && (
              <div className="error-message" role="alert">
                <span className="error-icon">⚠️</span>
                <div className="error-content">
                  {state.error}
                  {state.error.includes("Authorization system") && (
                    <div className="error-details">
                      <p>
                        <strong>What this means:</strong>
                      </p>
                      <ul>
                        <li>
                          The security authorization service (OPA) is not
                          running
                        </li>
                        <li>Banking operations cannot be performed safely</li>
                        <li>Please contact your system administrator</li>
                      </ul>
                      <p>
                        <strong>System Administrator:</strong> Please ensure the
                        OPA service is running on port 8181
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={
                state.isLoading ||
                !state.username.trim() ||
                !state.password.trim() ||
                isOpaDown
              }
            >
              {state.isLoading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  Signing In...
                </>
              ) : isOpaDown ? (
                "🔒 Login Disabled"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="demo-section">
            <h3>Demo Credentials</h3>
            <p>Click any credential set to populate the form:</p>
            {isOpaDown && (
              <div className="opa-warning">
                <span className="warning-icon">🔒</span>
                <span>
                  Demo credentials disabled while authorization service is
                  unavailable
                </span>
              </div>
            )}
            <div className="demo-credentials">
              {demoCredentials.map((cred, index) => (
                <div
                  key={index}
                  className={`demo-credential-card ${isOpaDown ? "disabled" : ""}`}
                  onClick={() => !isOpaDown && handleDemoLogin(cred)}
                  role="button"
                  tabIndex={isOpaDown ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isOpaDown && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleDemoLogin(cred);
                    }
                  }}
                >
                  <div className="demo-username">{cred.username}</div>
                  <div className="demo-role">{cred.role}</div>
                  <div className="demo-password">Password: {cred.password}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="login-footer">
            <div className="security-notice">
              <span className="security-icon">🔒</span>
              <span>This is a secure internal banking system</span>
            </div>
            <div className="version-info">
              Version 1.0.0 | EA Financial Internal Use Only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
