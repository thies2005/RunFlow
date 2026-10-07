import { adminRateLimit } from '../rateLimitAdmin';

describe('Rate Limiting - Admin API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Simulate the documented deployment with one trusted appending proxy in
    // front of the app so distinct XFF entries map to distinct clients.
    process.env.TRUSTED_PROXY_COUNT = '1';
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('IP-based identification', () => {
    it('should identify client by x-forwarded-for header', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      const result = await adminRateLimit(request, 'read');
      expect(result.success).toBe(true);
    });

    it('should identify client by x-real-ip header behind a trusted proxy', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '5.6.7.8' },
      });

      const result = await adminRateLimit(request, 'read');
      expect(result.success).toBe(true);
    });

    it('should handle unknown IPs', async () => {
      const request = new Request('http://localhost');
      const result = await adminRateLimit(request, 'read');
      expect(result.success).toBe(true);
    });

    it('should use the LAST (proxy-appended) IP from an x-forwarded-for chain', async () => {
      // With one trusted appending proxy, the rightmost entry is the client
      // the proxy saw; the leftmost is client-supplied and spoofable.
      const requestA = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });
      const requestB = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '9.9.9.9, 5.6.7.8' },
      });

      // Exhaust the sensitive limit (3/min) under the shared appended IP
      await adminRateLimit(requestA, 'sensitive');
      await adminRateLimit(requestA, 'sensitive');
      await adminRateLimit(requestA, 'sensitive');
      const result = await adminRateLimit(requestB, 'sensitive');
      expect(result.success).toBe(false); // spoofed first entry does not mint a new bucket
    });
  });

  describe('rate limits per operation type', () => {
    it('should enforce read operation limits', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });

      // Read allows 60 requests per minute
      for (let i = 0; i < 60; i++) {
        const result = await adminRateLimit(request, 'read');
        expect(result.success).toBe(true);
      }

      const blocked = await adminRateLimit(request, 'read');
      expect(blocked.success).toBe(false);
      expect(blocked.error).toBeDefined();
    });

    it('should enforce write operation limits', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.2' },
      });

      // Write allows 10 requests per minute
      for (let i = 0; i < 10; i++) {
        const result = await adminRateLimit(request, 'write');
        expect(result.success).toBe(true);
      }

      const blocked = await adminRateLimit(request, 'write');
      expect(blocked.success).toBe(false);
    });

    it('should enforce sensitive operation limits', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.3' },
      });

      // Sensitive allows only 3 requests per minute
      for (let i = 0; i < 3; i++) {
        const result = await adminRateLimit(request, 'sensitive');
        expect(result.success).toBe(true);
      }

      const blocked = await adminRateLimit(request, 'sensitive');
      expect(blocked.success).toBe(false);
    });
  });

  describe('independent limits per operation', () => {
    it('should have separate limits for different operations', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.4' },
      });

      // Exhaust sensitive limit (3)
      for (let i = 0; i < 3; i++) {
        await adminRateLimit(request, 'sensitive');
      }

      const sensitiveBlocked = await adminRateLimit(request, 'sensitive');
      expect(sensitiveBlocked.success).toBe(false);

      // Write should still work (different limit)
      const writeResult = await adminRateLimit(request, 'write');
      expect(writeResult.success).toBe(true);

      // Read should still work (different limit)
      const readResult = await adminRateLimit(request, 'read');
      expect(readResult.success).toBe(true);
    });
  });

  describe('violation tracking and blocking', () => {
    it('should track violations and block after threshold', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.5' },
      });

      // Violation threshold is 5
      for (let i = 0; i < 5; i++) {
        // Exhaust sensitive limit (3 requests)
        for (let j = 0; j < 4; j++) {
          await adminRateLimit(request, 'sensitive');
        }
      }

      // After 5 violations, IP should be blocked
      const blocked = await adminRateLimit(request, 'read');
      expect(blocked.success).toBe(false);
      const errorJson = await blocked.error?.json();
      expect(errorJson?.error).toContain('Too many violations - IP temporarily blocked');
    });

    it('should include proper headers when blocked', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.6' },
      });

      // Block the IP
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 4; j++) {
          await adminRateLimit(request, 'sensitive');
        }
      }

      const result = await adminRateLimit(request, 'read');
      expect(result.error?.headers.get('Retry-After')).toBeDefined();
      expect(result.error?.headers.get('X-RateLimit-Limit')).toBe('0');
      expect(result.error?.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });

  describe('rate limit response data', () => {
    it('should return remaining and reset info', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.7' },
      });

      const result1 = await adminRateLimit(request, 'write');
      expect(result1.result).toBeDefined();
      expect(result1.result?.remaining).toBe(9);
      expect(result1.result?.reset).toBeDefined();
      expect(result1.result?.limit).toBe(10);
    });

    it('should include retryAfter when blocked', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '10.0.0.8' },
      });

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await adminRateLimit(request, 'write');
      }

      const blocked = await adminRateLimit(request, 'write');
      expect(blocked.success).toBe(false);
      expect(blocked.error).toBeDefined();
      expect(blocked.error?.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('REGRESSION: XFF / x-real-ip spoofing must not bypass or frame', () => {
    let nowSpy: jest.SpyInstance;
    let clock = Date.now();

    beforeEach(() => {
      // Default deployment: no trusted proxy configured - forwarded headers
      // are client-supplied and must be ignored entirely.
      delete process.env.TRUSTED_PROXY_COUNT;
      delete process.env.TRUSTED_CLIENT_IP_HEADER;
      // Age out any shared 'unknown'-bucket state from earlier tests
      // (rate windows are 60s, violation blocks 15min).
      clock += 20 * 60 * 1000;
      nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    });

    afterEach(() => {
      nowSpy.mockRestore();
    });

    it('rotating spoofed x-forwarded-for values shares one bucket (throttled, not bypassed)', async () => {
      const results: boolean[] = [];
      for (let i = 0; i < 6; i++) {
        const request = new Request('http://localhost', {
          headers: { 'x-forwarded-for': `198.51.100.${i}` },
        });
        results.push((await adminRateLimit(request, 'sensitive')).success);
      }
      // Sensitive limit is 3/min: the 4th spoofed rotation must be throttled
      expect(results).toEqual([true, true, true, false, false, false]);
    });

    it('rotating spoofed x-real-ip values shares one bucket when no proxy is trusted', async () => {
      const results: boolean[] = [];
      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost', {
          headers: { 'x-real-ip': `203.0.113.${i}` },
        });
        results.push((await adminRateLimit(request, 'sensitive')).success);
      }
      expect(results).toEqual([true, true, true, false, false]);
    });

    it('a spoofed first entry cannot frame a different appended client', async () => {
      process.env.TRUSTED_PROXY_COUNT = '1';
      const victimAppendedIp = '203.0.113.7';

      // Attacker spoofs the victim's IP as the FIRST entry with their own
      // appended entry: they must only consume their own bucket.
      for (let i = 0; i < 3; i++) {
        const attacker = new Request('http://localhost', {
          headers: { 'x-forwarded-for': `${victimAppendedIp}, 198.51.100.250` },
        });
        expect((await adminRateLimit(attacker, 'sensitive')).success).toBe(true);
      }
      // Attacker exhausted their own bucket...
      const attackerAgain = new Request('http://localhost', {
        headers: { 'x-forwarded-for': `${victimAppendedIp}, 198.51.100.250` },
      });
      expect((await adminRateLimit(attackerAgain, 'sensitive')).success).toBe(false);

      // ...while the victim's genuine requests are unaffected.
      const victim = new Request('http://localhost', {
        headers: { 'x-forwarded-for': `1.1.1.1, ${victimAppendedIp}` },
      });
      expect((await adminRateLimit(victim, 'sensitive')).success).toBe(true);
    });

    it('honors a configured TRUSTED_CLIENT_IP_HEADER over forwarded headers', async () => {
      process.env.TRUSTED_CLIENT_IP_HEADER = 'Cf-Connecting-Ip';

      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        const request = new Request('http://localhost', {
          headers: {
            'cf-connecting-ip': '198.51.100.77',
            'x-forwarded-for': `spoofed-${i}`,
          },
        });
        results.push((await adminRateLimit(request, 'sensitive')).success);
      }
      expect(results).toEqual([true, true, true, false]);
    });
  });
});
