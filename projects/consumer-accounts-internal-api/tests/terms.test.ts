import { describe, it, expect, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { authRoutes } from "../src/routes/auth";
import { termsRoutes } from "../src/routes/terms";

describe("Terms Routes", () => {
  let app: Elysia;
  let validToken: string;
  let managerToken: string;

  beforeAll(async () => {
    app = new Elysia().use(authRoutes).use(termsRoutes);

    // Get valid token
    const loginResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "jsmith",
          password: "password123",
        }),
      }),
    );

    const loginData = await loginResponse.json();
    validToken = loginData.data.token;

    // Get manager token
    const managerResponse = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "mjohnson",
          password: "password456",
        }),
      }),
    );

    const managerData = await managerResponse.json();
    managerToken = managerData.data.token;
  });

  describe("GET /terms", () => {
    it("should retrieve all terms and conditions", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Terms and conditions retrieved successfully");
      expect(data.data).toBeDefined();
      expect(data.data.general_terms).toBeDefined();
      expect(data.data.employee_procedures).toBeDefined();
      expect(data.data.regulatory_disclosures).toBeDefined();
    });

    it("should reject request without authorization token", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
        }),
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("should reject request with invalid token", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        }),
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });
  });

  describe("GET /terms/general", () => {
    it("should retrieve general terms", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/general", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("General terms retrieved successfully");
      expect(data.data).toBeDefined();
      expect(data.data.version).toBe("2024.1");
      expect(data.data.sections).toBeDefined();
      expect(data.data.sections.account_policies).toBeDefined();
      expect(data.data.sections.transaction_limits).toBeDefined();
      expect(data.data.sections.interest_rates).toBeDefined();
    });

    it("should include account policies in general terms", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/general", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.sections.account_policies.minimum_balance).toBeDefined();
      expect(data.data.sections.account_policies.monthly_fees).toBeDefined();
      expect(data.data.sections.account_policies.overdraft_fees).toBeDefined();
    });
  });

  describe("GET /terms/employee-procedures", () => {
    it("should retrieve employee procedures", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/employee-procedures", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Employee procedures retrieved successfully");
      expect(data.data).toBeDefined();
      expect(data.data.version).toBe("2024.1");
      expect(data.data.sections).toBeDefined();
      expect(data.data.sections.account_access).toBeDefined();
      expect(data.data.sections.transaction_processing).toBeDefined();
      expect(data.data.sections.customer_service).toBeDefined();
      expect(data.data.sections.emergency_procedures).toBeDefined();
    });

    it("should include transaction processing limits", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/employee-procedures", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(
        data.data.sections.transaction_processing.manual_override_limit,
      ).toBe(1000.0);
      expect(
        data.data.sections.transaction_processing.dual_approval_required,
      ).toBe(5000.0);
    });
  });

  describe("GET /terms/regulatory", () => {
    it("should retrieve regulatory disclosures", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/regulatory", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe(
        "Regulatory disclosures retrieved successfully",
      );
      expect(data.data).toBeDefined();
      expect(data.data.truth_in_savings).toBeDefined();
      expect(data.data.electronic_fund_transfers).toBeDefined();
      expect(data.data.privacy_notice).toBeDefined();
    });

    it("should include FDIC insurance information in compliance", async () => {
      const generalResponse = await app.handle(
        new Request("http://localhost/terms/general", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        }),
      );

      expect(generalResponse.status).toBe(200);

      const generalData = await generalResponse.json();
      expect(generalData.data.sections.compliance.fdic_insured).toBe(true);
      expect(generalData.data.sections.compliance.fdic_insurance_limit).toBe(
        250000.0,
      );
    });
  });

  describe("GET /terms/account-policies", () => {
    it("should retrieve account policies", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/account-policies", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Account policies retrieved successfully");
      expect(data.data).toBeDefined();
      expect(data.data.minimum_balance).toBeDefined();
      expect(data.data.monthly_fees).toBeDefined();
      expect(data.data.overdraft_fees).toBeDefined();
    });

    it("should include minimum balance requirements", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/account-policies", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.minimum_balance.checking).toBe(25.0);
      expect(data.data.minimum_balance.savings).toBe(100.0);
      expect(data.data.monthly_fees.checking).toBe(12.0);
      expect(data.data.monthly_fees.savings).toBe(0.0);
    });

    it("should include overdraft fee information", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/account-policies", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.overdraft_fees.fee_amount).toBe(35.0);
      expect(data.data.overdraft_fees.daily_maximum).toBe(6);
      expect(data.data.overdraft_fees.grace_period_hours).toBe(24);
    });
  });

  describe("GET /terms/transaction-limits", () => {
    it("should retrieve transaction limits", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/transaction-limits", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Transaction limits retrieved successfully");
      expect(data.data).toBeDefined();
      expect(data.data.daily_atm_withdrawal).toBe(500.0);
      expect(data.data.daily_debit_card).toBe(2500.0);
      expect(data.data.monthly_savings_withdrawals).toBe(6);
      expect(data.data.wire_transfer_daily).toBe(10000.0);
      expect(data.data.mobile_deposit_daily).toBe(5000.0);
    });

    it("should reject unauthorized access", async () => {
      const response = await app.handle(
        new Request("http://localhost/terms/transaction-limits", {
          method: "GET",
          headers: {
            Authorization: "Bearer expired-token",
          },
        }),
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });
  });

  describe("Terms Data Integrity", () => {
    it("should return consistent data across different endpoints", async () => {
      // Get general terms
      const generalResponse = await app.handle(
        new Request("http://localhost/terms/general", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      // Get specific account policies
      const policiesResponse = await app.handle(
        new Request("http://localhost/terms/account-policies", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(generalResponse.status).toBe(200);
      expect(policiesResponse.status).toBe(200);

      const generalData = await generalResponse.json();
      const policiesData = await policiesResponse.json();

      // Compare account policies from both endpoints
      expect(
        generalData.data.sections.account_policies.minimum_balance.checking,
      ).toBe(policiesData.data.minimum_balance.checking);
      expect(
        generalData.data.sections.account_policies.monthly_fees.savings,
      ).toBe(policiesData.data.monthly_fees.savings);
    });

    it("should maintain version consistency across all terms", async () => {
      const responses = await Promise.all([
        app.handle(
          new Request("http://localhost/terms/general", {
            method: "GET",
            headers: { Authorization: `Bearer ${validToken}` },
          }),
        ),
        app.handle(
          new Request("http://localhost/terms/employee-procedures", {
            method: "GET",
            headers: { Authorization: `Bearer ${validToken}` },
          }),
        ),
      ]);

      const [generalData, employeeData] = await Promise.all(
        responses.map((r) => r.json()),
      );

      expect(generalData.data.version).toBe("2024.1");
      expect(employeeData.data.version).toBe("2024.1");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing terms data gracefully", async () => {
      // This test assumes the terms data is properly loaded
      // In a real scenario, you might want to test what happens when the file is missing
      const response = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("should handle expired tokens gracefully", async () => {
      // Create an expired token
      const expiredPayload = {
        userId: "cust_001",
        exp: Date.now() - 1000,
        iat: Date.now() - 86400000,
      };
      const expiredToken = Buffer.from(JSON.stringify(expiredPayload)).toString(
        "base64",
      );

      const response = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        }),
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Token expired");
    });
  });

  describe("Integration - Terms Access Flow", () => {
    it("should complete full terms access workflow", async () => {
      // Step 1: Get all terms
      const allTermsResponse = await app.handle(
        new Request("http://localhost/terms", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(allTermsResponse.status).toBe(200);
      const allTermsData = await allTermsResponse.json();
      expect(allTermsData.success).toBe(true);

      // Step 2: Get specific account policies
      const policiesResponse = await app.handle(
        new Request("http://localhost/terms/account-policies", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(policiesResponse.status).toBe(200);
      const policiesData = await policiesResponse.json();
      expect(policiesData.success).toBe(true);

      // Step 3: Get transaction limits
      const limitsResponse = await app.handle(
        new Request("http://localhost/terms/transaction-limits", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        }),
      );

      expect(limitsResponse.status).toBe(200);
      const limitsData = await limitsResponse.json();
      expect(limitsData.success).toBe(true);

      // Step 4: Verify data consistency
      expect(
        allTermsData.data.general_terms.sections.account_policies
          .minimum_balance.checking,
      ).toBe(policiesData.data.minimum_balance.checking);
      expect(
        allTermsData.data.general_terms.sections.transaction_limits
          .daily_atm_withdrawal,
      ).toBe(limitsData.data.daily_atm_withdrawal);
    });
  });
});
