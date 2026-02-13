import { adminRateLimit } from '../rateLimitAdmin';

describe('Rate Limiting - Admin API', () => {
  describe('IP-based identification', () => {
    it('should identify client by x-forwarded-for header', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      const result = await adminRateLimit(request, 'read');
      expect(result.success).toBe(true);
    });

    it('should identify client by x-real-ip header', async () => {
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

    it('should use first IP from x-forwarded-for chain', async () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });

      const result = await adminRateLimit(request, 'read');
      expect(result.success).toBe(true);
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
});
