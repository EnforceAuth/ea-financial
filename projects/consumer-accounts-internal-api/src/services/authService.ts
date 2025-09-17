import { dataService } from "../data/dataService";
import { opaService } from "./opaService";
import { User } from "../types";

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  user?: User;
  error?: string;
}

class AuthService {
  /**
   * Extract and validate JWT-like token from Authorization header
   */
  private extractAndValidateToken(authorization?: string): {
    valid: boolean;
    userId?: string;
    error?: string;
  } {
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return { valid: false, error: "Missing or invalid authorization header" };
    }

    try {
      const token = authorization.replace("Bearer ", "");
      const payload = JSON.parse(Buffer.from(token, "base64").toString());

      // Check if token is expired
      if (payload.exp < Date.now()) {
        return { valid: false, error: "Token expired" };
      }

      return { valid: true, userId: payload.userId };
    } catch (error) {
      return { valid: false, error: "Invalid token format" };
    }
  }

  /**
   * Authenticate user from token
   */
  async authenticate(authorization?: string): Promise<AuthResult> {
    if (!authorization) {
      return {
        success: false,
        error: "Missing authorization header",
      };
    }

    // Use OPA for token-based authentication
    const userResult = await opaService.getUserFromToken(authorization);

    if (userResult.error) {
      return {
        success: false,
        error: userResult.error,
      };
    }

    if (!userResult.user) {
      return {
        success: false,
        error: "Invalid token",
      };
    }

    // Get full user details from our data service using username
    const user = dataService.getUserByUsername(userResult.user.username);

    if (!user) {
      return {
        success: false,
        error: "User not found in system",
      };
    }

    return {
      success: true,
      user,
    };
  }

  /**
   * Authorize request using OPA
   */
  async authorize(
    method: string,
    path: string,
    authorization?: string,
    headers?: Record<string, string>,
  ): Promise<AuthorizationResult> {
    // Call OPA for authorization decision (OPA will handle both auth and authz)
    const opaResult = await opaService.authorize(
      method,
      path,
      authorization,
      headers,
    );

    if (!opaResult.allowed) {
      return {
        allowed: false,
        user: opaResult.user,
        error: opaResult.error || "Access denied",
      };
    }

    // If we have a user from OPA token, get full user details
    let user = opaResult.user;
    if (user) {
      const fullUser = dataService.getUserByUsername(user.username);
      if (fullUser) {
        user = fullUser;
      }
    }

    return {
      allowed: true,
      user,
    };
  }

  /**
   * Generate token for user - uses OPA-compatible token format
   * In production, this should integrate with your token management system
   */
  generateToken(username: string): string {
    // For demo, use the same token format as OPA data
    const tokenMap: Record<string, string> = {
      jsmith: "jsmith_token_123",
      mjohnson: "mjohnson_token_456",
      rbrown: "rbrown_token_789",
      slee: "slee_token_000",
    };

    return tokenMap[username] || `${username}_token_${Date.now()}`;
  }

  /**
   * Validate user credentials for login
   */
  validateCredentials(username: string, password: string): boolean {
    // Demo credentials - in production, use proper password hashing
    const demoCredentials: Record<string, string> = {
      jsmith: "password123",
      mjohnson: "password456",
      rbrown: "password789",
      slee: "password000",
    };

    return demoCredentials[username] === password;
  }
}

export const authService = new AuthService();
