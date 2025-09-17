import { Elysia } from 'elysia';
import { dataService } from '../data/dataService';
import { opaService } from '../services/opaService';
import type { ApiResponse } from '../types';

interface TermsData {
  title: string;
  content: string;
  lastUpdated: string;
  version: string;
}

interface TermsResponse {
  terms: TermsData;
  userAcknowledged?: boolean;
}

export const termsRoutes = new Elysia({ prefix: '/terms' })
  .get('/', async ({ headers, set }): Promise<ApiResponse<TermsResponse>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'Terms and conditions retrieved successfully',
        data: termsData,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Terms service error',
      };
    }
  })

  .get('/general', async ({ headers, set }): Promise<ApiResponse<TermsResponse>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms/general',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'General terms retrieved successfully',
        data: termsData.general_terms,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'General terms service error',
      };
    }
  })

  .get('/employee-procedures', async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms/employee-procedures',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'Employee procedures retrieved successfully',
        data: termsData.employee_procedures,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Employee procedures service error',
      };
    }
  })

  .get('/regulatory', async ({ headers, set }): Promise<ApiResponse<TermsResponse>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms/regulatory',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'Regulatory disclosures retrieved successfully',
        data: termsData.regulatory_disclosures,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Regulatory disclosures service error',
      };
    }
  })

  .get('/account-policies', async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms/account-policies',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'Account policies retrieved successfully',
        data: termsData.general_terms?.sections?.account_policies,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Account policies service error',
      };
    }
  })

  .get('/transaction-limits', async ({ headers, set }): Promise<ApiResponse<any>> => {
    try {
      // Use OPA for authorization
      const authResult = await opaService.authorize(
        'GET',
        '/terms/transaction-limits',
        headers.authorization,
        headers as Record<string, string>
      );

      if (!authResult.allowed) {
        set.status = authResult.user ? 403 : 401;
        return {
          success: false,
          message: authResult.user ? 'Access denied' : 'Authentication required',
          error: authResult.error,
        };
      }

      const termsData = dataService.getTermsData();

      return {
        success: true,
        message: 'Transaction limits retrieved successfully',
        data: termsData.general_terms?.sections?.transaction_limits,
      };
    } catch (_error) {
      set.status = 500;
      return {
        success: false,
        message: 'Internal server error',
        error: 'Transaction limits service error',
      };
    }
  });
