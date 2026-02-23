import { validateOrigin as _validateOrigin, setCorsHeaders as _setCorsHeaders } from '../cors';
import { NextRequest } from 'next/server';

// Mock environment
const originalEnv = process.env.EXTERNAL_API_ALLOWED_ORIGINS;

describe('CORS Configuration - Allowlist Validation', () => {
  beforeEach(() => {
    // Set up test origins
    process.env.EXTERNAL_API_ALLOWED_ORIGINS = 'https://runflow.schuelken.uk,http://localhost:3000';
    // Reset the module to pick up the new environment variable
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.EXTERNAL_API_ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.EXTERNAL_API_ALLOWED_ORIGINS;
    }
    jest.resetModules();
  });

  describe('validateOrigin', () => {
    it('should accept allowed origins', () => {
      const { validateOrigin } = require('../cors');
      const request1 = new NextRequest('http://localhost', {
        headers: { origin: 'https://runflow.schuelken.uk' },
      });
      expect(validateOrigin(request1)).toBe(true);

      const request2 = new NextRequest('http://localhost', {
        headers: { origin: 'http://localhost:3000' },
      });
      expect(validateOrigin(request2)).toBe(true);
    });

    it('should reject disallowed origins', () => {
      const { validateOrigin } = require('../cors');
      const request1 = new NextRequest('http://localhost', {
        headers: { origin: 'https://evil.com' },
      });
      expect(validateOrigin(request1)).toBe(false);

      const request2 = new NextRequest('http://localhost', {
        headers: { origin: 'https://runflow.schuelken.uk.evil.com' },
      });
      expect(validateOrigin(request2)).toBe(false);
    });

    it('should accept requests without origin header (same-origin)', () => {
      const { validateOrigin } = require('../cors');
      const request = new NextRequest('http://localhost:3000');
      expect(validateOrigin(request)).toBe(true);
    });

    it('should handle empty env variable', () => {
      process.env.EXTERNAL_API_ALLOWED_ORIGINS = '';
      jest.resetModules();
      const { validateOrigin } = require('../cors');
      
      const request = new NextRequest('http://localhost', {
        headers: { origin: 'https://evil.com' },
      });
      expect(validateOrigin(request)).toBe(false);
    });

    it('should handle undefined env variable', () => {
      delete process.env.EXTERNAL_API_ALLOWED_ORIGINS;
      jest.resetModules();
      const { validateOrigin } = require('../cors');
      
      const request = new NextRequest('http://localhost', {
        headers: { origin: 'https://evil.com' },
      });
      expect(validateOrigin(request)).toBe(false);
    });
  });

  describe('setCorsHeaders', () => {
    it('should set CORS headers for allowed origins', () => {
      const { setCorsHeaders } = require('../cors');
      const request = new NextRequest('http://localhost', {
        headers: { origin: 'https://runflow.schuelken.uk' },
      });
      const headers = new Headers();
      
      setCorsHeaders(request, headers);
      
      expect(headers.get('Access-Control-Allow-Origin')).toBe('https://runflow.schuelken.uk');
      expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
      expect(headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should not set CORS headers for disallowed origins', () => {
      const { setCorsHeaders } = require('../cors');
      const request = new NextRequest('http://localhost', {
        headers: { origin: 'https://evil.com' },
      });
      const headers = new Headers();
      
      setCorsHeaders(request, headers);
      
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(headers.get('Access-Control-Allow-Methods')).toBeNull();
      expect(headers.get('Access-Control-Allow-Headers')).toBeNull();
    });

    it('should not set CORS headers for requests without origin', () => {
      const { setCorsHeaders } = require('../cors');
      const request = new NextRequest('http://localhost');
      const headers = new Headers();
      
      setCorsHeaders(request, headers);
      
      expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(headers.get('Access-Control-Allow-Methods')).toBeNull();
    });
  });
});
