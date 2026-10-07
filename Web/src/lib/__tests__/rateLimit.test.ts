import { getClientIdentifier, checkRateLimit, checkRateLimitAsync, resetRateLimit } from '../rateLimit';

describe('Rate Limiting - Multi-factor Identifier', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TRUSTED_PROXY_HOPS;
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
    delete process.env.VERCEL;
    // Force the deterministic in-memory backend
    delete process.env.REDIS_URL;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

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
      expect(id1).not.toBe(hashOf('anonymous'));
    });

    it('should use the LAST (proxy-appended) IP from an x-forwarded-for chain', () => {
      // One trusted appending proxy in front (default TRUSTED_PROXY_HOPS=1):
      // the proxy appends the real client IP to the right of whatever the
      // client supplied.
      const direct = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      const viaProxySpoofing = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 1.2.3.4' },
      });

      expect(getClientIdentifier(direct)).toBe(getClientIdentifier(viaProxySpoofing));
    });

    it('REGRESSION: a spoofed first x-forwarded-for entry must not change the bucket', () => {
      // Attacker rotates the leftmost (client-controlled) entry while the
      // trusted proxy keeps appending the real client IP: all requests must
      // map to the same identity instead of minting fresh buckets.
      const victimIp = '198.51.100.9';
      const ids = new Set([
        getClientIdentifier(reqWithXff(victimIp)),
        getClientIdentifier(reqWithXff(`203.0.113.1, ${victimIp}`)),
        getClientIdentifier(reqWithXff(`203.0.113.2, ${victimIp}`)),
        getClientIdentifier(reqWithXff(`203.0.113.3, 203.0.113.4, ${victimIp}`)),
      ]);
      expect(ids.size).toBe(1);
    });

    it('REGRESSION: rotating single-entry XFF must not bypass the limit behind a trusted proxy', async () => {
      // Even though the attacker controls the whole header, with one trusted
      // appending hop the rightmost entry is what the proxy appended, so
      // spoofed entries cannot create distinct buckets for requests that
      // genuinely originate from one source.
      const config = { limit: 3, windowSeconds: 60, prefix: 'xff-spoof-test' };
      const spoofed = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4'].map((ip) =>
        getClientIdentifier(reqWithXff(`spoofed-${ip}, 198.51.100.9`))
      );
      expect(new Set(spoofed).size).toBe(1); // same identity

      const results = spoofed.map((id) => checkRateLimit(id, config).allowed);
      expect(results).toEqual([true, true, true, false]);
    });

    it('should ignore x-forwarded-for entirely when TRUSTED_PROXY_HOPS=0', () => {
      process.env.TRUSTED_PROXY_HOPS = '0';

      const withXff = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      const without = new Request('http://localhost', {
        headers: {},
      });

      // No trusted proxy: the header is client-supplied and must not shape identity
      expect(getClientIdentifier(withXff)).toBe(getClientIdentifier(without));
    });

    it('should honor a configured TRUSTED_CLIENT_IP_HEADER', () => {
      process.env.TRUSTED_CLIENT_IP_HEADER = 'Cf-Connecting-Ip';

      const viaTrustedHeader = new Request('http://localhost', {
        headers: {
          'cf-connecting-ip': '203.0.113.5',
          'x-forwarded-for': '1.1.1.1',
        },
      });
      const control = new Request('http://localhost', {
        headers: { 'cf-connecting-ip': '203.0.113.5' },
      });
      const otherClient = new Request('http://localhost', {
        headers: { 'cf-connecting-ip': '203.0.113.6' },
      });

      expect(getClientIdentifier(viaTrustedHeader)).toBe(getClientIdentifier(control));
      expect(getClientIdentifier(viaTrustedHeader)).not.toBe(getClientIdentifier(otherClient));
    });

    it('should ignore x-vercel-forwarded-for outside Vercel', () => {
      const both = new Request('http://localhost', {
        headers: {
          'x-vercel-forwarded-for': '1.1.1.1',
          'x-forwarded-for': '9.9.9.9',
        },
      });
      const xffOnly = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '9.9.9.9' },
      });

      expect(getClientIdentifier(both)).toBe(getClientIdentifier(xffOnly));
    });

    it('should no longer use x-real-ip off-Vercel (client-settable header)', () => {
      const withRealIp = new Request('http://localhost', {
        headers: { 'x-real-ip': '5.6.7.8' },
      });
      const nothing = new Request('http://localhost', {
        headers: {},
      });

      // Without a trusted proxy, x-real-ip is spoofable and must not be identity
      expect(getClientIdentifier(withRealIp)).toBe(getClientIdentifier(nothing));
    });

    it('should fall back to session cookie when no trusted IP source is available', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cookie': 'sessionId=abc123',
          'user-agent': 'Mozilla/5.0 Test',
        },
      });

      const id = getClientIdentifier(request);
      expect(id).not.toBe(hashOf('anonymous'));
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
      expect(id).toBe(hashOf('anonymous'));
    });

    it('REGRESSION: user-agent must NOT split the identity (client-controlled)', () => {
      const request1 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': 'spoof, 1.2.3.4',
          'user-agent': 'Mozilla/5.0 Chrome',
        },
      });

      const request2 = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': 'spoof, 1.2.3.4',
          'user-agent': 'Mozilla/5.0 Firefox',
        },
      });

      // Rotating the User-Agent used to mint a fresh bucket; the identity is
      // now derived from the trusted IP alone.
      expect(getClientIdentifier(request1)).toBe(getClientIdentifier(request2));
    });

    it('should generate different identifiers for different proxy-appended IPs', () => {
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

  describe('resetRateLimit', () => {
    it('should clear consumed in-memory state for the identifier+prefix', async () => {
      const config = { limit: 2, windowSeconds: 60, prefix: 'login' };
      const identifier = 'clientA|victim@example.com';

      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      expect(checkRateLimit(identifier, config).allowed).toBe(false);

      await resetRateLimit(identifier, 'login');

      expect(checkRateLimit(identifier, config).allowed).toBe(true);
    });

    it('should only clear the exact prefix bucket', async () => {
      const identifier = 'clientB|victim@example.com';
      checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'login' });
      checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'other' });

      await resetRateLimit(identifier, 'login');

      expect(checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'login' }).allowed).toBe(true);
      expect(checkRateLimit(identifier, { limit: 1, windowSeconds: 60, prefix: 'other' }).allowed).toBe(false);
    });
  });
});

function reqWithXff(xff: string): Request {
  return new Request('http://localhost', {
    headers: { 'x-forwarded-for': xff, 'user-agent': 'Mozilla/5.0 Test' },
  });
}

// Reproduce the module's FNV-1a hashing so tests can assert which raw string
// an identifier corresponds to.
function hashOf(ipAddress: string): string {
  let hash = 2166136261;
  for (let i = 0; i < ipAddress.length; i++) {
    hash ^= ipAddress.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}
