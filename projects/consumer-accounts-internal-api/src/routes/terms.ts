import { Elysia } from "elysia";
import { dataService } from "../data/dataService";
import { ApiResponse } from "../types";

// Simple token validation middleware
const validateToken = (authorization?: string) => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { valid: false, error: "Missing or invalid authorization header" };
  }

  try {
    const token = authorization.replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (payload.exp < Date.now()) {
      return { valid: false, error: "Token expired" };
    }

    const user = dataService.getUserById(payload.userId);
    if (!user || !user.isActive) {
      return { valid: false, error: "Invalid user" };
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: "Invalid token" };
  }
};

export const termsRoutes = new Elysia({ prefix: "/terms" })
  .get("/", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "Terms and conditions retrieved successfully",
        data: termsData
      };

    } catch (error) {
      console.error("Terms retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "Terms service error"
      };
    }
  })

  .get("/general", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "General terms retrieved successfully",
        data: termsData.general_terms
      };

    } catch (error) {
      console.error("General terms retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "General terms service error"
      };
    }
  })

  .get("/employee-procedures", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "Employee procedures retrieved successfully",
        data: termsData.employee_procedures
      };

    } catch (error) {
      console.error("Employee procedures retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "Employee procedures service error"
      };
    }
  })

  .get("/regulatory", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "Regulatory disclosures retrieved successfully",
        data: termsData.regulatory_disclosures
      };

    } catch (error) {
      console.error("Regulatory disclosures retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "Regulatory disclosures service error"
      };
    }
  })

  .get("/account-policies", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "Account policies retrieved successfully",
        data: termsData.general_terms?.sections?.account_policies
      };

    } catch (error) {
      console.error("Account policies retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "Account policies service error"
      };
    }
  })

  .get("/transaction-limits", async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      const tokenValidation = validateToken(headers.authorization);

      if (!tokenValidation.valid) {
        set.status = 401;
        return {
          success: false,
          message: "Unauthorized",
          error: tokenValidation.error
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: "Transaction limits retrieved successfully",
        data: termsData.general_terms?.sections?.transaction_limits
      };

    } catch (error) {
      console.error("Transaction limits retrieval error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Internal server error",
        error: "Transaction limits service error"
      };
    }
  });
