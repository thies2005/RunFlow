import { getClientIdentifier, checkRateLimit, checkRateLimitAsync } from '../rateLimit';

describe('Rate Limiting - Multi-factor Identifier', () => {
  describe('getClientIdentifier', () => {
    it('should use x-forwarded-for header when available', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id1 = getClientIdentifier(request);
      const id2 = getClientIdentifier(request);
      
      expect(id1).toBe(id2); // Should be consistent
      expect(id1).not.toBe('anonymous');
    });

    it('should use first IP from x-forwarded-for chain', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id = getClientIdentifier(request);
      
      // Should use 1.2.3.4 (first IP)
      expect(id).not.toBe('');
    });

    it('should fall back to x-real-ip when x-forwarded-for not available', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '5.6.7.8',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).not.toBe('anonymous');
    });

    it('should fall back to session cookie when no IP headers available', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cookie': 'sessionId=abc123',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).not.toBe('anonymous');
    });

    it('should use anonymous when no identifying information available', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).not.toBe('');
      expect(id).not.toBe('0');
    });

    it('should generate different identifiers for different user agents', () => {
      const request1 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Mozilla/5.0 Chrome',
        },
      });

      const request2 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Mozilla/5.0 Firefox',
        },
      });

      const id1 = getClientIdentifier(request1);
      const id2 = getClientIdentifier(request2);
      
      expect(id1).not.toBe(id2);
    });

    it('should generate different identifiers for different IPs', () => {
      const request1 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const request2 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '5.6.7.8',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id1 = getClientIdentifier(request1);
      const id2 = getClientIdentifier(request2);
      
      expect(id1).not.toBe(id2);
    });

    it('should handle empty user-agent', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).not.toBe('');
    });

    it('should generate consistent hash for same inputs', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const ids = Array.from({ length: 100 }, () => getClientIdentifier(request));
      
      // All should be identical
      expect(new Set(ids).size).toBe(1);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests under limit', () => {
      const config = { limit: 5, windowSeconds: 60 };
      const identifier = 'test-user-1';

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(identifier, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests over limit', () => {
      const config = { limit: 3, windowSeconds: 60 };
      const identifier = 'test-user-2';

      // First 3 should succeed
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(identifier, config);
        expect(result.allowed).toBe(true);
      }

      // 4th should fail
      const result = checkRateLimit(identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset after window expires', () => {
      const config = { limit: 2, windowSeconds: 1 };
      const identifier = 'test-user-3';

      // Exhaust limit
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      const blocked = checkRateLimit(identifier, config);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit(identifier, config);
          expect(result.allowed).toBe(true);
          resolve();
        }, 1100);
      });
    });

    it('should use prefix in key', () => {
      const config1 = { limit: 2, windowSeconds: 60, prefix: 'api' };
      const config2 = { limit: 2, windowSeconds: 60, prefix: 'web' };
      const identifier = 'test-user-4';

      // Exhaust API limit
      checkRateLimit(identifier, config1);
      checkRateLimit(identifier, config1);
      const apiBlocked = checkRateLimit(identifier, config1);
      expect(apiBlocked.allowed).toBe(false);

      // Web should still work (different prefix)
      const webResult = checkRateLimit(identifier, config2);
      expect(webResult.allowed).toBe(true);
    });
  });

  describe('checkRateLimitAsync', () => {
    it('should use in-memory fallback when Redis not available', async () => {
      const config = { limit: 3, windowSeconds: 60 };
      const identifier = 'test-user-5';

      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimitAsync(identifier, config);
        expect(result.allowed).toBe(true);
      }

      const blocked = await checkRateLimitAsync(identifier, config);
      expect(blocked.allowed).toBe(false);
    });
  });
});
