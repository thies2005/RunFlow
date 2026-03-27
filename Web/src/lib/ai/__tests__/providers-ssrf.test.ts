import { validateBaseUrl } from '../providers';

describe('SSRF Protection - URL Allowlist Validation', () => {
  describe('valid URLs', () => {
    it('should allow valid OpenAI API URL', () => {
      expect(validateBaseUrl('https://api.openai.com/v1')).toBe(true);
    });

    it('should allow valid OpenAI API URL with path', () => {
      expect(validateBaseUrl('https://api.openai.com/v1/chat/completions')).toBe(true);
    });

    it('should allow valid Anthropic API URL', () => {
      expect(validateBaseUrl('https://api.anthropic.com')).toBe(true);
    });

    it('should allow valid Anthropic API URL with path', () => {
      expect(validateBaseUrl('https://api.anthropic.com/v1/messages')).toBe(true);
    });

    it('should allow valid Google API URL', () => {
      expect(validateBaseUrl('https://generativelanguage.googleapis.com')).toBe(true);
    });

    it('should allow valid Google API URL with path', () => {
      expect(validateBaseUrl('https://generativelanguage.googleapis.com/v1beta/models')).toBe(true);
    });
  });

  describe('invalid URLs - SSRF attack vectors', () => {
    it('should reject internal network addresses', () => {
      expect(validateBaseUrl('http://localhost:8080')).toBe(false);
      expect(validateBaseUrl('http://127.0.0.1')).toBe(false);
      expect(validateBaseUrl('http://192.168.1.1')).toBe(false);
      expect(validateBaseUrl('http://10.0.0.1')).toBe(false);
      expect(validateBaseUrl('http://172.16.0.1')).toBe(false);
    });

    it('should reject private DNS names', () => {
      expect(validateBaseUrl('http://metadata.google.internal')).toBe(false);
      expect(validateBaseUrl('http://169.254.169.254')).toBe(false);
    });

    it('should reject non-allowed public URLs', () => {
      expect(validateBaseUrl('https://evil.com')).toBe(false);
      expect(validateBaseUrl('https://api.evil.com')).toBe(false);
      expect(validateBaseUrl('https://api.malicious-site.com')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(validateBaseUrl('not-a-url')).toBe(false);
      expect(validateBaseUrl('')).toBe(false);
      expect(validateBaseUrl('://invalid')).toBe(false);
    });

    it('should reject URLs with userinfo (potential bypass)', () => {
      expect(validateBaseUrl('https://user:pass@api.openai.com@evil.com/v1')).toBe(false);
      expect(validateBaseUrl('https://api.openai.com:443@evil.com/v1')).toBe(false);
    });
  });

  describe('potential bypasses (CRITICAL SECURITY TESTS)', () => {
    it('should reject URL with @ redirect to evil domain', () => {
      // This is a known SSRF bypass pattern
      expect(validateBaseUrl('https://api.openai.com@evil.com/v1')).toBe(false);
    });

    it('should reject URL with subdomain bypass', () => {
      // api.openai.com.evil.com starts with api.openai.com
      expect(validateBaseUrl('https://api.openai.com.evil.com')).toBe(false);
    });

    it('should reject URL with unicode bypass attempts', () => {
      expect(validateBaseUrl('https://api.openai.com。evil.com')).toBe(false);
    });

    it('should reject URL with IP address bypass', () => {
      expect(validateBaseUrl('https://8.8.8.8')).toBe(false);
    });
  });

  describe('protocol restrictions', () => {
    it('should reject non-HTTPS URLs', () => {
      expect(validateBaseUrl('http://api.openai.com')).toBe(false);
      expect(validateBaseUrl('ftp://api.openai.com')).toBe(false);
    });

    it('should reject URLs without protocol', () => {
      expect(validateBaseUrl('api.openai.com')).toBe(false);
    });
  });

  describe('extra allowed URLs', () => {
    it('should allow admin-configured URLs when passed as extras', () => {
      expect(validateBaseUrl('https://my-custom-llm.example.com/v1', ['https://my-custom-llm.example.com/v1'])).toBe(true);
    });

    it('should reject admin-configured URLs pointing to private IPs even with extras', () => {
      expect(validateBaseUrl('http://192.168.1.1:8080/v1', ['http://192.168.1.1:8080/v1'])).toBe(false);
    });

    it('should allow subdomain of extra allowed URL', () => {
      expect(validateBaseUrl('https://api.my-custom-llm.example.com/v1', ['https://my-custom-llm.example.com/v1'])).toBe(true);
    });
  });
});
