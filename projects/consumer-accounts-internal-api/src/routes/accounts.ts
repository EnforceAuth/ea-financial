import { Elysia } from "elysia";
import { dataService } from "../data/dataService";
import { authService } from "../services/authService";
import {
  BalanceResponse,
  TransactionRequest,
  TransactionResponse,
  ApiResponse,
} from "../types";

export const accountRoutes = new Elysia({ prefix: "/accounts" })
  .get(
    "/:accountId/balance",
    async ({
      params,
      headers,
      set,
      request,
    }): Promise<ApiResponse<BalanceResponse>> => {
      try {
        const { accountId } = params;

        // Use OPA for authorization
        const authResult = await authService.authorize(
          "GET",
          `/accounts/${accountId}/balance`,
          headers.authorization,
          headers as Record<string, string>,
        );

        if (!authResult.allowed) {
          set.status = authResult.user ? 403 : 401;
          return {
            success: false,
            message: authResult.user
              ? "Access denied"
              : "Authentication required",
            error: authResult.error,
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
        const { accountId } = params;

        // Use OPA for authorization
        const authResult = await authService.authorize(
          "GET",
          `/accounts/${accountId}`,
          headers.authorization,
          headers as Record<string, string>,
        );

        if (!authResult.allowed) {
          set.status = authResult.user ? 403 : 401;
          return {
            success: false,
            message: authResult.user
              ? "Access denied"
              : "Authentication required",
            error: authResult.error,
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
        const { accountId } = params;

        // Use OPA for authorization
        const authResult = await authService.authorize(
          "POST",
          `/accounts/${accountId}/debit`,
          headers.authorization,
          headers as Record<string, string>,
        );

        if (!authResult.allowed) {
          set.status = authResult.user ? 403 : 401;
          return {
            success: false,
            message: authResult.user
              ? "Access denied"
              : "Authentication required",
            error: authResult.error,
          };
        }

        const { amount, description, reference } = body as TransactionRequest;

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
          employeeId: authResult.user!.employeeId,
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
        const { accountId } = params;

        // Use OPA for authorization
        const authResult = await authService.authorize(
          "POST",
          `/accounts/${accountId}/credit`,
          headers.authorization,
          headers as Record<string, string>,
        );

        if (!authResult.allowed) {
          set.status = authResult.user ? 403 : 401;
          return {
            success: false,
            message: authResult.user
              ? "Access denied"
              : "Authentication required",
            error: authResult.error,
          };
        }

        const { amount, description, reference } = body as TransactionRequest;

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
          employeeId: authResult.user!.employeeId,
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
        const { accountId } = params;

        // Use OPA for authorization
        const authResult = await authService.authorize(
          "GET",
          `/accounts/${accountId}/transactions`,
          headers.authorization,
          headers as Record<string, string>,
        );

        if (!authResult.allowed) {
          set.status = authResult.user ? 403 : 401;
          return {
            success: false,
            message: authResult.user
              ? "Access denied"
              : "Authentication required",
            error: authResult.error,
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
