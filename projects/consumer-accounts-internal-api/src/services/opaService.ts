import type { User } from '../types';

export interface OPARequest {
  input: {
    request: {
      http: {
        method: string;
        path: string;
        headers?: Record<string, string>;
      };
    };
    user?: {
      id: string;
      username: string;
      role: string;
      permissions: string[];
      isActive: boolean;
    };
  };
}

export interface OPAResponse {
  result: boolean;
  decision_id?: string;
}

class OPAService {
  private opaUrl: string;
  private timeout: number;

  constructor() {
    this.opaUrl = process.env.OPA_URL || 'http://localhost:8181';
    this.timeout = Number.parseInt(process.env.OPA_TIMEOUT || '5000', 10);
  }

  /**
   * Extract user info from Authorization header using OPA token lookup
   */
  async getUserFromToken(authorization?: string): Promise<{ user?: User; error?: string }> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header' };
    }

    const token = authorization.replace('Bearer ', '');

    try {
      // Call OPA to look up user by token
      const response = await fetch(`${this.opaUrl}/v1/data/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return {
          error: `Failed to fetch user data from OPA: ${response.status}`,
        };
      }

      const data = await response.json();
      const users = data.result?.users || {};

      // Find user by token
      for (const [username, userData] of Object.entries(users)) {
        const user = userData as User;
        if (user.token === token) {
          // Check if token is expired
          if (user.exp && user.exp * 1000 < Date.now()) {
            return { error: 'Token expired' };
          }

          return {
            user: {
              id: `user_${username}`,
              username,
              role: user.role,
              permissions: user.permissions || [],
              isActive: user.active !== false,
              department: user.department,
            },
          };
        }
      }

      return { error: 'Invalid token' };
    } catch (_error) {
      return { error: 'Token validation service unavailable' };
    }
  }

  /**
   * Check if a request is authorized using OPA
   */
  async authorize(
    method: string,
    path: string,
    authorization?: string,
    headers?: Record<string, string>
  ): Promise<{ allowed: boolean; user?: User; error?: string }> {
    try {
      // First get user from token if provided
      let user: User | undefined;
      if (authorization) {
        const userResult = await this.getUserFromToken(authorization);
        if (userResult.error && !this.isPublicEndpoint(method, path)) {
          return { allowed: false, error: userResult.error };
        }
        user = userResult.user;
      }

      const opaRequest: OPARequest = {
        input: {
          request: {
            http: {
              method: method.toUpperCase(),
              path,
              headers: headers || {},
            },
          },
        },
      };

      // Add user context if available
      if (user) {
        opaRequest.input.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
        };
      }

      const response = await fetch(`${this.opaUrl}/v1/data/main/allow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opaRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return {
          allowed: false,
          error: `OPA service error: ${response.status}`,
        };
      }

      const opaResponse: OPAResponse = await response.json();

      return {
        allowed: opaResponse.result === true,
        user,
      };
    } catch (error) {
      // In case of OPA service failure, we could either:
      // 1. Deny all requests (secure default)
      // 2. Fall back to local authorization (availability over security)
      //
      // For production banking systems, secure default is preferred
      return {
        allowed: false,
        error: error instanceof Error ? error.message : 'OPA service unavailable',
      };
    }
  }

  /**
   * Check if endpoint is public (doesn't require authentication)
   */
  private isPublicEndpoint(method: string, path: string): boolean {
    const publicEndpoints = [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/health' },
      { method: 'GET', path: '/status' },
      { method: 'OPTIONS', path: '*' },
    ];

    return publicEndpoints.some(
      endpoint =>
        endpoint.method === method.toUpperCase() &&
        (endpoint.path === '*' || endpoint.path === path)
    );
  }

  /**
   * Health check for OPA service
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.opaUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      return {
        healthy: response.ok,
        error: response.ok ? undefined : `OPA health check failed: ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'OPA service unreachable',
      };
    }
  }

  /**
   * Get OPA decision logs (for debugging/auditing)
   */
  async getDecisionLogs(limit = 10): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.opaUrl}/logs?limit=${limit}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch decision logs: ${response.status}`);
      }

      return await response.json();
    } catch (_error) {
      return [];
    }
  }
}

export const opaService = new OPAService();
