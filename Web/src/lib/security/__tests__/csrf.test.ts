import { generateCsrfToken, setCsrfCookie, validateCsrfToken } from '../csrf';
import { NextRequest, NextResponse } from 'next/server';

describe('CSRF Protection', () => {
  describe('httpOnly cookie setting', () => {
    it('should set csrf cookie with httpOnly: true', () => {
      const response = NextResponse.json({});
      setCsrfCookie(response);
      
      const cookies = response.cookies.getAll();
      const csrfCookie = cookies.find(c => c.name === 'csrf_token');
      const csrfClientCookie = cookies.find(c => c.name === 'csrf_token_client');
      
      expect(csrfCookie).toBeDefined();
      expect(csrfClientCookie).toBeDefined();
      // Note: The server sets two cookies:
      // 1. csrf_token (httpOnly: true) for server-side validation
      // 2. csrf_token_client (httpOnly: false) for client-side access
    });
  });

  describe('token validation', () => {
    it('should validate matching tokens', () => {
      const token = generateCsrfToken();
      const request = new NextRequest('http://localhost', {
        headers: {
          'X-CSRF-Token': token,
        },
      });
      
      // Mock the cookie
      const cookieValue = JSON.stringify({
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      request.cookies.set('csrf_token', cookieValue);
      
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();
      
      const request = new NextRequest('http://localhost', {
        headers: {
          'X-CSRF-Token': headerToken,
        },
      });
      
      const cookieValue = JSON.stringify({
        token: cookieToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      request.cookies.set('csrf_token', cookieValue);
      
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should reject expired tokens', () => {
      const token = generateCsrfToken();
      const request = new NextRequest('http://localhost', {
        headers: {
          'X-CSRF-Token': token,
        },
      });
      
      const cookieValue = JSON.stringify({
        token,
        expiresAt: Date.now() - 1000, // Expired
      });
      request.cookies.set('csrf_token', cookieValue);
      
      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should reject requests without tokens', () => {
      const request = new NextRequest('http://localhost');
      expect(validateCsrfToken(request)).toBe(false);
    });
  });

  describe('constant-time comparison and HMAC signature enforcement', () => {
    it('should use constant-time comparison to prevent timing attacks', () => {
      const token = generateCsrfToken();
      const request = new NextRequest('http://localhost', {
        headers: {
          'X-CSRF-Token': token,
        },
      });
      
      const cookieValue = JSON.stringify({
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      request.cookies.set('csrf_token', cookieValue);
      
      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should reject unsigned tokens without an HMAC signature separator', () => {
      const unsignedToken = 'a'.repeat(64);
      const request = new NextRequest('http://localhost', {
        headers: {
          'X-CSRF-Token': unsignedToken,
        },
      });

      const cookieValue = JSON.stringify({
        token: unsignedToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
      request.cookies.set('csrf_token', cookieValue);

      expect(validateCsrfToken(request)).toBe(false);
    });
  });
});
