import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/components/Auth/Login';
import Dashboard from '@/components/Dashboard/Dashboard';
import Layout from '@/components/Layout/Layout';
import AccountDetails from '@/components/Accounts/AccountDetails';
import TransactionHistory from '@/components/Accounts/TransactionHistory';
import ProcessTransaction from '@/components/Accounts/ProcessTransaction';
import Terms from '@/components/Terms/Terms';
import '@/styles/App.css';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading EA Financial Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

// App Routes Component
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading EA Financial Portal...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/accounts/:accountId" element={
        <ProtectedRoute>
          <AccountDetails />
        </ProtectedRoute>
      } />

      <Route path="/accounts/:accountId/transactions" element={
        <ProtectedRoute>
          <TransactionHistory />
        </ProtectedRoute>
      } />

      <Route path="/accounts/:accountId/process-transaction" element={
        <ProtectedRoute>
          <ProcessTransaction />
        </ProtectedRoute>
      } />

      <Route path="/terms" element={
        <ProtectedRoute>
          <Terms />
        </ProtectedRoute>
      } />

      {/* Default Routes */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
      } />

      {/* 404 Route */}
      <Route path="*" element={
        <ProtectedRoute>
          <div className="error-page">
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for doesn't exist.</p>
            <a href="/dashboard">Return to Dashboard</a>
          </div>
        </ProtectedRoute>
      } />
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
