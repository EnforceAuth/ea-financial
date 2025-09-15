import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, AuthContextType } from '@/types';
import { apiService } from '@/services/api';

// Auth State
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Auth Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'VERIFY_SUCCESS'; payload: User }
  | { type: 'VERIFY_FAILURE' };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'VERIFY_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'VERIFY_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
}

// Create contexts
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const authResponse = await apiService.login(credentials);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: authResponse.user,
          token: authResponse.token,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      // Log error but still proceed with local logout
      console.warn('Logout request failed:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Verify token on app start
  const verifyToken = async (): Promise<void> => {
    const token = apiService.getToken();

    if (!token) {
      dispatch({ type: 'VERIFY_FAILURE' });
      return;
    }

    try {
      const user = await apiService.verifyToken();
      dispatch({ type: 'VERIFY_SUCCESS', payload: user });
    } catch (error) {
      console.warn('Token verification failed:', error);
      dispatch({ type: 'VERIFY_FAILURE' });
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Effect to verify token on mount
  useEffect(() => {
    verifyToken();
  }, []);

  // Context value
  const contextValue: AuthContextType = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
    loading: state.loading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// HOC for protected routes
interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPermissions?: string[];
}

export function RequireAuth({
  children,
  fallback = <div>Access Denied</div>,
  requiredPermissions = []
}: RequireAuthProps) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Verifying authentication...</div>;
  }

  if (!isAuthenticated || !user) {
    return fallback;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasPermissions = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );

    if (!hasPermissions) {
      return (
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>You don't have the required permissions to access this resource.</p>
          <p>Required permissions: {requiredPermissions.join(', ')}</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook to check permissions
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const getUserRole = (): string | null => {
    return user?.role ?? null;
  };

  const isRole = (role: string): boolean => {
    return user?.role === role;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    isRole,
    permissions: user?.permissions ?? [],
  };
}

export default AuthContext;
