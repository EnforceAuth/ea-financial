import { Elysia } from "elysia";
import { accountRoutes } from "./routes/accounts";
import { authRoutes } from "./routes/auth";
import { termsRoutes } from "./routes/terms";
import { opaService } from "./services/opaService";

const appName = "EA Financial - Consumer Accounts Internal API";
const appPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3001;

const _app = new Elysia()
  // Add CORS middleware
  .onBeforeHandle(({ set }) => {
    set.headers["Access-Control-Allow-Origin"] = "*";
    set.headers["Access-Control-Allow-Methods"] =
      "GET, POST, PUT, DELETE, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  })

  // Handle preflight OPTIONS requests
  .options("/*", ({ set }) => {
    set.status = 204;
    return "";
  })

  // Root endpoint with API information
  .get("/", () => ({
    name: appName,
    version: "1.0.0",
    description:
      "Internal API for EA Financial consumer account operations with OPA authorization",
    endpoints: {
      authentication: {
        login: "POST /auth/login",
        logout: "POST /auth/logout",
        verify: "GET /auth/verify",
      },
      accounts: {
        getAccount: "GET /accounts/:accountId",
        getBalance: "GET /accounts/:accountId/balance",
        debitAccount: "POST /accounts/:accountId/debit",
        creditAccount: "POST /accounts/:accountId/credit",
        getTransactions: "GET /accounts/:accountId/transactions",
      },
      terms: {
        getAllTerms: "GET /terms",
        getGeneralTerms: "GET /terms/general",
        getEmployeeProcedures: "GET /terms/employee-procedures",
        getRegulatoryDisclosures: "GET /terms/regulatory",
        getAccountPolicies: "GET /terms/account-policies",
        getTransactionLimits: "GET /terms/transaction-limits",
      },
    },
    authorization: {
      provider: "Open Policy Agent (OPA)",
      policy_package: "main",
      decision_endpoint: process.env.OPA_URL || "http://localhost:8181",
    },
    demo_credentials: {
      manager: { username: "mjohnson", password: "password456" },
      senior_rep: { username: "jsmith", password: "password123" },
      representative: { username: "rbrown", password: "password789" },
      analyst_inactive: { username: "slee", password: "password000" },
    },
    timestamp: new Date().toISOString(),
  }))

  // Enhanced health check with OPA integration
  .get("/health", async () => {
    const opaHealth = await opaService.healthCheck();

    return {
      status: opaHealth.healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      service: appName,
      version: "1.0.0",
      dependencies: {
        opa: {
          status: opaHealth.healthy ? "operational" : "error",
          url: process.env.OPA_URL || "http://localhost:8181",
          error: opaHealth.error || undefined,
        },
      },
    };
  })

  // API status endpoint
  .get("/status", async () => {
    const opaHealth = await opaService.healthCheck();

    return {
      status: "operational",
      services: {
        authentication: "operational",
        accounts: "operational",
        terms: "operational",
        authorization: opaHealth.healthy ? "operational" : "degraded",
        database: "operational (fixture data)",
      },
      authorization_provider: {
        type: "OPA",
        url: process.env.OPA_URL || "http://localhost:8181",
        healthy: opaHealth.healthy,
      },
      timestamp: new Date().toISOString(),
    };
  })

  // Register route modules
  .use(authRoutes)
  .use(accountRoutes)
  .use(termsRoutes)

  // Global error handler
  .onError(({ error: _error, set }) => {
    set.status = 500;
    return {
      success: false,
      message: "Internal server error",
      error: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    };
  })

  // Start server
  .listen(appPort);

// Verify OPA connectivity on startup
opaService.healthCheck().then((health) => {
  if (health.healthy) {
    // OPA service is healthy and connected
  } else {
    // OPA service is not available - continuing without OPA authorization
  }
});
