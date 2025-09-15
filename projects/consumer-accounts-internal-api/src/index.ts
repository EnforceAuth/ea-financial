import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth";
import { accountRoutes } from "./routes/accounts";
import { termsRoutes } from "./routes/terms";

const appName = "EA Financial - Consumer Accounts Internal API";
const appPort = 3001;

const app = new Elysia()
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
    description: "Internal API for EA Financial consumer account operations",
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
    documentation: {
      authentication:
        "All endpoints except root require Bearer token authentication",
      permissions: "Users must have appropriate permissions for each operation",
      demo_credentials: {
        jsmith: "password123",
        mjohnson: "password456",
        rbrown: "password789",
        slee: "password000",
      },
    },
    timestamp: new Date().toISOString(),
  }))

  // Health check endpoint
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: appName,
    version: "1.0.0",
  }))

  // API status endpoint
  .get("/status", () => ({
    status: "operational",
    services: {
      authentication: "operational",
      accounts: "operational",
      terms: "operational",
      database: "operational (mock data)",
    },
    timestamp: new Date().toISOString(),
  }))

  // Register route modules
  .use(authRoutes)
  .use(accountRoutes)
  .use(termsRoutes)

  // Global error handler
  .onError(({ error, set }) => {
    console.error("Global error handler:", error);

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

console.log(
  `🏦 ${appName} is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(
  `📚 API Documentation available at: http://${app.server?.hostname}:${app.server?.port}/`,
);
console.log(
  `❤️  Health Check available at: http://${app.server?.hostname}:${app.server?.port}/health`,
);
console.log(`\n🔐 Demo Credentials:`);
console.log(
  `   Username: jsmith, Password: password123 (Senior Representative)`,
);
console.log(`   Username: mjohnson, Password: password456 (Manager)`);
console.log(`   Username: rbrown, Password: password789 (Representative)`);
console.log(`   Username: slee, Password: password000 (Analyst - Inactive)`);
