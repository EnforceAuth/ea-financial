import { Elysia } from 'elysia';
import { dataService } from '../data/dataService';
import { authService } from '../services/authService';
import type { ApiResponse, LoginRequest, LoginResponse, User } from '../types';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set }): Promise<ApiResponse<LoginResponse>> => {
    try {
      const { username, password } = body as LoginRequest;

      if (!username || !password) {
        set.status = 400;
        return {
          success: false,
          message: 'Username and password are required',
          error: 'Missing credentials',
        };
      }

      // Find user by username
      const user = dataService.getUserByUsername(username);

      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials',
          error: 'User not found',
        };
      }

      // Validate password
      if (!authService.validateCredentials(username, password)) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid credentials',
          error: 'Authentication failed',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        set.status = 401;
        return {
          success: false,
          message: 'Account is inactive',
          error: 'User account disabled',
        };
      }

      // Generate token
      const token = authService.generateToken(user.username);

      const loginResponse: LoginResponse = {
        success: true,
        message: 'Login successful',
        user: {
          ...user,
        },
        token,
      };

      return {
        success: true,
        message: 'Authentication successful',
        data: loginResponse,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Authentication service error',
      };
    }
  })

  .post('/logout', async ({ headers, set }): Promise<ApiResponse<{ message: string }>> => {
    try {
      // Verify we have a valid token for logout
      const authResult = await authService.authenticate(headers.authorization);

      if (!authResult.success) {
        set.status = 401;
        return {
          success: false,
          message: 'Invalid or missing authorization token',
          error: authResult.error,
        };
      }

      // In production, add token to blacklist or invalidate session
      return {
        success: true,
        message: 'Logout successful',
        data: { message: 'Successfully logged out' },
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Logout service error',
      };
    }
  })

  .get(
    '/verify',
    async ({ headers, set }): Promise<ApiResponse<{ user: User; valid: boolean }>> => {
      try {
        const authResult = await authService.authenticate(headers.authorization);

        if (!authResult.success) {
          set.status = 401;
          return {
            success: false,
            message: 'Token verification failed',
            error: authResult.error,
          };
        }

        return {
          success: true,
          message: 'Token is valid',
          data: {
            user: authResult.user,
            valid: true,
          },
        };
      } catch (_error) {
        set.status = 500;
        return {
          success: false,
          message: 'Internal server error',
          error: 'Token verification service error',
        };
      }
    }
  );
