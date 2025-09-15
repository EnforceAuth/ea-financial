import { readFileSync } from "fs";
import { join } from "path";
import { Account, User, Transaction } from "../types";

class DataService {
  private accounts: Account[] = [];
  private users: User[] = [];
  private transactions: Transaction[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const fixturesPath = join(process.cwd(), "fixtures");

      this.accounts = JSON.parse(
        readFileSync(join(fixturesPath, "accounts.json"), "utf-8"),
      );

      this.users = JSON.parse(
        readFileSync(join(fixturesPath, "users.json"), "utf-8"),
      );

      this.transactions = JSON.parse(
        readFileSync(join(fixturesPath, "transactions.json"), "utf-8"),
      );
    } catch (error) {
      console.error("Error loading fixture data:", error);
    }
  }

  // User operations
  getUserByUsername(username: string): User | undefined {
    return this.users.find((user) => user.username === username);
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  // Account operations
  getAccountById(accountId: string): Account | undefined {
    return this.accounts.find((account) => account.id === accountId);
  }

  getAccountsByCustomerId(customerId: string): Account[] {
    return this.accounts.filter((account) => account.customerId === customerId);
  }

  updateAccountBalance(accountId: string, newBalance: number): boolean {
    const account = this.getAccountById(accountId);
    if (!account) return false;

    account.balance = newBalance;
    account.updatedAt = new Date().toISOString();
    return true;
  }

  // Transaction operations
  getTransactionsByAccountId(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Transaction[] {
    let accountTransactions = this.transactions
      .filter((txn) => txn.accountId === accountId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    if (offset) {
      accountTransactions = accountTransactions.slice(offset);
    }

    if (limit) {
      accountTransactions = accountTransactions.slice(0, limit);
    }

    return accountTransactions;
  }

  addTransaction(
    transaction: Omit<Transaction, "id" | "timestamp" | "status">,
  ): Transaction {
    const newTransaction: Transaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: "completed",
    };

    this.transactions.unshift(newTransaction);
    return newTransaction;
  }

  // Validation helpers
  validateAccountStatus(accountId: string): {
    valid: boolean;
    message: string;
  } {
    const account = this.getAccountById(accountId);

    if (!account) {
      return { valid: false, message: "Account not found" };
    }

    if (account.status === "frozen") {
      return { valid: false, message: "Account is frozen" };
    }

    if (account.status === "closed") {
      return { valid: false, message: "Account is closed" };
    }

    return { valid: true, message: "Account is valid" };
  }

  validateSufficientFunds(
    accountId: string,
    amount: number,
  ): { valid: boolean; message: string } {
    const account = this.getAccountById(accountId);

    if (!account) {
      return { valid: false, message: "Account not found" };
    }

    if (account.balance < amount) {
      return { valid: false, message: "Insufficient funds" };
    }

    return { valid: true, message: "Sufficient funds available" };
  }

  // Terms data
  getTermsData(): any {
    try {
      const fixturesPath = join(process.cwd(), "fixtures");
      return JSON.parse(
        readFileSync(join(fixturesPath, "terms.json"), "utf-8"),
      );
    } catch (error) {
      console.error("Error loading terms data:", error);
      return {};
    }
  }
}

export const dataService = new DataService();
