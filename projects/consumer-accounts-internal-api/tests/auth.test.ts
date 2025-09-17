import { beforeAll, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { authRoutes } from '../src/routes/auth';

describe('Authentication Routes', () => {
  let app: Elysia;

  beforeAll(() => {
    app = new Elysia().use(authRoutes);
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'jsmith',
            password: 'password123',
          }),
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Authentication successful');
      expect(data.data.user.username).toBe('jsmith');
      expect(data.data.token).toBeDefined();
      expect(data.data.user.isActive).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'jsmith',
            password: 'wrongpassword',
          }),
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid credentials');
      expect(data.data).toBeUndefined();
    });

    it('should reject non-existent user', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'nonexistent',
            password: 'password123',
          }),
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'slee',
            password: 'password000',
          }),
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Account is inactive');
    });

    it('should reject missing credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'jsmith',
            // missing password
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Username and password are required');
    });

    it('should reject empty credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: '',
            password: '',
          }),
        })
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Username and password are required');
    });
  });

  describe('POST /auth/logout', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a valid token first
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'jsmith',
            password: 'password123',
          }),
        })
      );

      const loginData = await loginResponse.json();
      validToken = loginData.data.token;
    });

    it('should successfully logout with valid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${validToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('No authorization token provided');
    });
  });

  describe('GET /auth/verify', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a valid token first
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'mjohnson',
            password: 'password456',
          }),
        })
      );

      const loginData = await loginResponse.json();
      validToken = loginData.data.token;
    });

    it('should verify valid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Token is valid');
      expect(data.data.valid).toBe(true);
      expect(data.data.user.username).toBe('mjohnson');
    });

    it('should reject invalid token format', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer invalid-token-format',
          },
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid token format');
    });

    it('should reject missing authorization header', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid authorization header');
    });

    it('should reject malformed authorization header', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: 'InvalidFormat token123',
          },
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Invalid authorization header');
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const expiredPayload = {
        userId: 'cust_001',
        exp: Date.now() - 1000, // Expired 1 second ago
        iat: Date.now() - 86400000, // Issued 1 day ago
      };
      const expiredToken = Buffer.from(JSON.stringify(expiredPayload)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        })
      );

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token expired');
    });
  });

  describe('Integration - Full Authentication Flow', () => {
    it('should complete full login-verify-logout flow', async () => {
      // Step 1: Login
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'rbrown',
            password: 'password789',
          }),
        })
      );

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      const token = loginData.data.token;

      // Step 2: Verify token
      const verifyResponse = await app.handle(
        new Request('http://localhost/auth/verify', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.data.user.username).toBe('rbrown');

      // Step 3: Logout
      const logoutResponse = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(logoutResponse.status).toBe(200);
      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);
    });
  });
});
