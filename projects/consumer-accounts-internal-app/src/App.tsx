import type React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AccountDetails from '@/components/Accounts/AccountDetails';
import ProcessTransaction from '@/components/Accounts/ProcessTransaction';
import TransactionHistory from '@/components/Accounts/TransactionHistory';
import Login from '@/components/Auth/Login';
import Dashboard from '@/components/Dashboard/Dashboard';
import Layout from '@/components/Layout/Layout';
import Terms from '@/components/Terms/Terms';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import '@/styles/App.css';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading EA Financial Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace={true} />;
  }

  return <Layout>{children}</Layout>;
}

// App Routes Component
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading EA Financial Portal...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace={true} /> : <Login />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/accounts/:accountId"
        element={
          <ProtectedRoute>
            <AccountDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/accounts/:accountId/transactions"
        element={
          <ProtectedRoute>
            <TransactionHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/accounts/:accountId/process-transaction"
        element={
          <ProtectedRoute>
            <ProcessTransaction />
          </ProtectedRoute>
        }
      />

      <Route
        path="/terms"
        element={
          <ProtectedRoute>
            <Terms />
          </ProtectedRoute>
        }
      />

      {/* Default Routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace={true} />
          ) : (
            <Navigate to="/login" replace={true} />
          )
        }
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <div className="error-page">
              <h1>404 - Page Not Found</h1>
              <p>The page you are looking for doesn't exist.</p>
              <a href="/dashboard">Return to Dashboard</a>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
