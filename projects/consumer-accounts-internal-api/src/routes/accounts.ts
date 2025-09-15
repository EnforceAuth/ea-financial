import { Elysia } from "elysia";
import { dataService } from "../data/dataService";
import {
  BalanceRequest,
  BalanceResponse,
  TransactionRequest,
  TransactionResponse,
  ApiResponse,
  TransactionHistoryQuery,
} from "../types";

// Simple token validation middleware
const validateToken = (authorization?: string) => {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid authorization header" };
  }

  try {
    const token = authorization.replace("Bearer ", "");
    const payload = JSON.parse(Buffer.from(token, "base64").toString());

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

export const accountRoutes = new Elysia({ prefix: "/accounts" })
  .get(
    "/:accountId/balance",
    async ({ params, headers, set }): Promise<ApiResponse<BalanceResponse>> => {
      try {
        const tokenValidation = validateToken(headers.authorization);

        if (!tokenValidation.valid) {
          set.status = 401;
          return {
            success: false,
            message: "Unauthorized",
            error: tokenValidation.error,
          };
        }

        const { accountId } = params;

        // Check if user has permission to view accounts
        if (!tokenValidation.user?.permissions.includes("view_accounts")) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
            error: "User does not have view_accounts permission",
          };
        }

        const account = dataService.getAccountById(accountId);

        if (!account) {
          set.status = 404;
          return {
            success: false,
            message: "Account not found",
            error: `Account with ID ${accountId} does not exist`,
          };
        }

        const balanceResponse: BalanceResponse = {
          accountId: account.id,
          balance: account.balance,
          currency: account.currency,
          status: account.status,
          lastUpdated: account.updatedAt,
        };

        return {
          success: true,
          message: "Balance retrieved successfully",
          data: balanceResponse,
        };
      } catch (error) {
        console.error("Balance check error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Balance service error",
        };
      }
    },
  )

  .get(
    "/:accountId",
    async ({ params, headers, set }): Promise<ApiResponse<any>> => {
      try {
        const tokenValidation = validateToken(headers.authorization);

        if (!tokenValidation.valid) {
          set.status = 401;
          return {
            success: false,
            message: "Unauthorized",
            error: tokenValidation.error,
          };
        }

        const { accountId } = params;

        if (!tokenValidation.user?.permissions.includes("view_accounts")) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
            error: "User does not have view_accounts permission",
          };
        }

        const account = dataService.getAccountById(accountId);

        if (!account) {
          set.status = 404;
          return {
            success: false,
            message: "Account not found",
            error: `Account with ID ${accountId} does not exist`,
          };
        }

        return {
          success: true,
          message: "Account retrieved successfully",
          data: account,
        };
      } catch (error) {
        console.error("Account retrieval error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Account service error",
        };
      }
    },
  )

  .post(
    "/:accountId/debit",
    async ({
      params,
      body,
      headers,
      set,
    }): Promise<ApiResponse<TransactionResponse>> => {
      try {
        const tokenValidation = validateToken(headers.authorization);

        if (!tokenValidation.valid) {
          set.status = 401;
          return {
            success: false,
            message: "Unauthorized",
            error: tokenValidation.error,
          };
        }

        const { accountId } = params;
        const { amount, description, reference } = body as TransactionRequest;

        if (!tokenValidation.user?.permissions.includes("basic_operations")) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
            error: "User does not have basic_operations permission",
          };
        }

        if (!amount || amount <= 0) {
          set.status = 400;
          return {
            success: false,
            message: "Invalid amount",
            error: "Amount must be greater than 0",
          };
        }

        if (!description) {
          set.status = 400;
          return {
            success: false,
            message: "Description is required",
            error: "Transaction description cannot be empty",
          };
        }

        // Validate account status
        const accountValidation = dataService.validateAccountStatus(accountId);
        if (!accountValidation.valid) {
          set.status = 400;
          return {
            success: false,
            message: accountValidation.message,
            error: "Account validation failed",
          };
        }

        // Check sufficient funds
        const fundsValidation = dataService.validateSufficientFunds(
          accountId,
          amount,
        );
        if (!fundsValidation.valid) {
          set.status = 400;
          return {
            success: false,
            message: fundsValidation.message,
            error: "Insufficient funds for debit transaction",
          };
        }

        const account = dataService.getAccountById(accountId)!;
        const newBalance = account.balance - amount;

        // Create transaction record
        const transaction = dataService.addTransaction({
          accountId,
          type: "debit",
          amount,
          currency: account.currency,
          description,
          reference: reference || `DEB${Date.now()}`,
          initiatedBy: "employee",
          employeeId: tokenValidation.user!.employeeId,
          balanceAfter: newBalance,
        });

        // Update account balance
        dataService.updateAccountBalance(accountId, newBalance);

        const transactionResponse: TransactionResponse = {
          success: true,
          message: "Debit transaction completed successfully",
          transaction,
          newBalance,
        };

        return {
          success: true,
          message: "Debit processed successfully",
          data: transactionResponse,
        };
      } catch (error) {
        console.error("Debit transaction error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Debit transaction service error",
        };
      }
    },
  )

  .post(
    "/:accountId/credit",
    async ({
      params,
      body,
      headers,
      set,
    }): Promise<ApiResponse<TransactionResponse>> => {
      try {
        const tokenValidation = validateToken(headers.authorization);

        if (!tokenValidation.valid) {
          set.status = 401;
          return {
            success: false,
            message: "Unauthorized",
            error: tokenValidation.error,
          };
        }

        const { accountId } = params;
        const { amount, description, reference } = body as TransactionRequest;

        if (!tokenValidation.user?.permissions.includes("basic_operations")) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
            error: "User does not have basic_operations permission",
          };
        }

        if (!amount || amount <= 0) {
          set.status = 400;
          return {
            success: false,
            message: "Invalid amount",
            error: "Amount must be greater than 0",
          };
        }

        if (!description) {
          set.status = 400;
          return {
            success: false,
            message: "Description is required",
            error: "Transaction description cannot be empty",
          };
        }

        // Validate account status
        const accountValidation = dataService.validateAccountStatus(accountId);
        if (!accountValidation.valid) {
          set.status = 400;
          return {
            success: false,
            message: accountValidation.message,
            error: "Account validation failed",
          };
        }

        const account = dataService.getAccountById(accountId)!;
        const newBalance = account.balance + amount;

        // Create transaction record
        const transaction = dataService.addTransaction({
          accountId,
          type: "credit",
          amount,
          currency: account.currency,
          description,
          reference: reference || `CRD${Date.now()}`,
          initiatedBy: "employee",
          employeeId: tokenValidation.user!.employeeId,
          balanceAfter: newBalance,
        });

        // Update account balance
        dataService.updateAccountBalance(accountId, newBalance);

        const transactionResponse: TransactionResponse = {
          success: true,
          message: "Credit transaction completed successfully",
          transaction,
          newBalance,
        };

        return {
          success: true,
          message: "Credit processed successfully",
          data: transactionResponse,
        };
      } catch (error) {
        console.error("Credit transaction error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Credit transaction service error",
        };
      }
    },
  )

  .get(
    "/:accountId/transactions",
    async ({ params, query, headers, set }): Promise<ApiResponse<any>> => {
      try {
        const tokenValidation = validateToken(headers.authorization);

        if (!tokenValidation.valid) {
          set.status = 401;
          return {
            success: false,
            message: "Unauthorized",
            error: tokenValidation.error,
          };
        }

        const { accountId } = params;

        if (!tokenValidation.user?.permissions.includes("view_transactions")) {
          set.status = 403;
          return {
            success: false,
            message: "Insufficient permissions",
            error: "User does not have view_transactions permission",
          };
        }

        // Validate account exists
        const account = dataService.getAccountById(accountId);
        if (!account) {
          set.status = 404;
          return {
            success: false,
            message: "Account not found",
            error: `Account with ID ${accountId} does not exist`,
          };
        }

        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const transactions = dataService.getTransactionsByAccountId(
          accountId,
          limit,
          offset,
        );

        return {
          success: true,
          message: "Transactions retrieved successfully",
          data: {
            transactions,
            pagination: {
              page,
              limit,
              hasMore: transactions.length === limit,
            },
          },
        };
      } catch (error) {
        console.error("Transaction history error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Internal server error",
          error: "Transaction history service error",
        };
      }
    },
  );
