import { Elysia } from "elysia";
import { dataService } from "../data/dataService";
import { LoginRequest, LoginResponse, ApiResponse } from "../types";

// Simple password validation for demo - in real app, use proper hashing
const validateCredentials = (username: string, password: string): boolean => {
  // Demo credentials - in production, use proper authentication
  const demoCredentials: Record<string, string> = {
    jsmith: "password123",
    mjohnson: "password456",
    rbrown: "password789",
    slee: "password000",
  };

  return demoCredentials[username] === password;
};

// Generate a simple JWT-like token for demo
const generateToken = (userId: string): string => {
  const payload = {
    userId,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    iat: Date.now(),
  };

  // In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString("base64");
};

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, set }): Promise<ApiResponse<LoginResponse>> => {
      try {
        const { username, password } = body as LoginRequest;

        if (!username || !password) {
          set.status = 400;
          return {
            success: false,
            message: "Username and password are required",
            error: "Missing credentials",
          };
        }

        // Find user by username
        const user = dataService.getUserByUsername(username);

        if (!user) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid credentials",
            error: "User not found",
          };
        }

        // Validate password first
        if (!validateCredentials(username, password)) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid credentials",
            error: "Authentication failed",
          };
        }

        // Check if user is active
        if (!user.isActive) {
          set.status = 401;
          return {
            success: false,
            message: "Account is inactive",
            error: "User account disabled",
          };
        }

        // Generate token
        const token = generateToken(user.id);

        const loginResponse: LoginResponse = {
          success: true,
          message: "Login successful",
          user: {
            ...user,
            // Don't include sensitive data
          },
          token,
        };

        return {
          success: true,
          message: "Authentication successful",
          data: loginResponse,
        };
      } catch (error) {
        console.error("Login error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Authentication service error",
        };
      }
    },
  )

  .post(
    "/logout",
    async ({ headers, set }): Promise<ApiResponse<{ message: string }>> => {
      try {
        // In a real app, you would invalidate the token/session here
        const authorization = headers.authorization;

        if (!authorization) {
          set.status = 401;
          return {
            success: false,
            message: "No authorization token provided",
            error: "Missing token",
          };
        }

        // For demo purposes, we'll just return success
        // In production, add token to blacklist or invalidate session

        return {
          success: true,
          message: "Logout successful",
          data: { message: "Successfully logged out" },
        };
      } catch (error) {
        console.error("Logout error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Logout service error",
        };
      }
    },
  )

  .get(
    "/verify",
    async ({
      headers,
      set,
    }): Promise<ApiResponse<{ user: any; valid: boolean }>> => {
      try {
        const authorization = headers.authorization;

        if (!authorization || !authorization.startsWith("Bearer ")) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid authorization header",
            error: "Missing or invalid token",
          };
        }

        const token = authorization.replace("Bearer ", "");

        try {
          // Decode token (in production, use proper JWT verification)
          const payload = JSON.parse(Buffer.from(token, "base64").toString());

          // Check if token is expired
          if (payload.exp < Date.now()) {
            set.status = 401;
            return {
              success: false,
              message: "Token expired",
              error: "Authentication token has expired",
            };
          }

          // Get user info
          const user = dataService.getUserById(payload.userId);

          if (!user || !user.isActive) {
            set.status = 401;
            return {
              success: false,
              message: "Invalid user",
              error: "User not found or inactive",
            };
          }

          return {
            success: true,
            message: "Token is valid",
            data: {
              user,
              valid: true,
            },
          };
        } catch (decodeError) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid token format",
            error: "Token decode failed",
          };
        }
      } catch (error) {
        console.error("Token verification error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Token verification service error",
        };
      }
    },
  );
