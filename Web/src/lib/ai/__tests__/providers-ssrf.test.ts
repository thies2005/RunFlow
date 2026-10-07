import { validateBaseUrl, safeFetch, testAiConfig } from '../providers';
import { resolveHostAddresses } from '@/lib/net/dnsResolve';

jest.mock('@/lib/net/dnsResolve', () => ({
  resolveHostAddresses: jest.fn(),
}));

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

describe('SSRF Protection - DNS resolution guard (safeFetch)', () => {
  const PUBLIC = ['93.184.216.34'];

  beforeEach(() => {
    global.fetch = jest.fn();
    (resolveHostAddresses as jest.Mock).mockReset();
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockRestore?.();
  });

  it('allows a self-allowlisted public https base URL and performs the fetch (BYOK stays functional)', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(PUBLIC);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, url: 'https://my-llm.example.test/v1/chat/completions', body: null });

    const res = await safeFetch('https://my-llm.example.test/v1/chat/completions', {
      allowedUrls: ['https://my-llm.example.test/v1'],
    });

    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks a self-allowlisted hostname that resolves to a private IPv4 (docker-bridge rebinding)', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(['172.17.0.2']);

    await expect(
      safeFetch('http://rebind.attacker-example.test:6379/chat/completions', {
        allowedUrls: ['http://rebind.attacker-example.test:6379'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked request to host resolving to a private/reserved address');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks metadata.google.internal self-allowlisted when it resolves to the link-local metadata address', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(['169.254.169.254']);

    await expect(
      safeFetch('http://metadata.google.internal/v1beta/models/gemini', {
        allowedUrls: ['http://metadata.google.internal'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked request to host resolving to a private/reserved address');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['::1'],
    ['fe80::1'],
    ['fd12:3456:789a:1::1'],
    ['::ffff:10.0.0.8'],
    ['::ffff:7f00:1'],
  ])('blocks IPv6 target %s', async (address) => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue([address]);

    await expect(
      safeFetch('https://v6rebind.attacker-example.test/v1/chat/completions', {
        allowedUrls: ['https://v6rebind.attacker-example.test'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked request to host resolving to a private/reserved address');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks when any of the resolved addresses is private (mixed A records)', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(['93.184.216.34', '10.1.2.3']);

    await expect(
      safeFetch('https://mixed-rbind.attacker-example.test/v1/chat/completions', {
        allowedUrls: ['https://mixed-rbind.attacker-example.test'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked request to host resolving to a private/reserved address');
  });

  it('fails closed when DNS resolution fails', async () => {
    (resolveHostAddresses as jest.Mock).mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      safeFetch('https://nonexistent.example.test/v1/chat/completions', {
        allowedUrls: ['https://nonexistent.example.test'],
      })
    ).rejects.toThrow('SSRF Protection: DNS resolution failed');
  });

  it('blocks a redirect to a disallowed final URL even on non-OK responses', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(PUBLIC);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      url: 'https://evil-redirect-target.test/leak',
      body: { cancel: jest.fn() },
    });

    await expect(
      safeFetch('https://my-llm.example.test/v1/chat/completions', {
        allowedUrls: ['https://my-llm.example.test'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked redirect to disallowed URL');
  });

  it('blocks a redirect to an allowed-listed host that resolves privately', async () => {
    (resolveHostAddresses as jest.Mock)
      .mockResolvedValueOnce(PUBLIC) // original host
      .mockResolvedValueOnce(['192.168.1.50']); // redirect target
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://redirect-target.attacker-example.test/v1/chat/completions',
      body: null,
    });

    await expect(
      safeFetch('https://my-llm.example.test/v1/chat/completions', {
        allowedUrls: ['https://my-llm.example.test', 'https://redirect-target.attacker-example.test'],
      })
    ).rejects.toThrow('SSRF Protection: Blocked request to host resolving to a private/reserved address');
  });
});

describe('SSRF Protection - bounded error-body echo (testAiConfig)', () => {
  const baseConfig = {
    provider: 'openai' as const,
    apiKey: 'sk-test',
    apiKeys: ['sk-test'],
    baseUrl: 'https://my-llm.example.test/v1',
    model: 'gpt-4o-mini',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    (resolveHostAddresses as jest.Mock).mockReset();
    (resolveHostAddresses as jest.Mock).mockResolvedValue(['93.184.216.34']);
  });

  it('bounds the JSON error message echoed from the fetched target (openai path)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      url: 'https://my-llm.example.test/v1/chat/completions',
      body: null,
      json: async () => ({ error: { message: 'SECRET-INTERNAL-PAYLOAD-'.repeat(100) } }),
    });

    const result = await testAiConfig(baseConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeLessThanOrEqual('API returned 500: '.length + 500 + '…[truncated]'.length);
    expect(result.error).toContain('…[truncated]');
    // The 2800-char payload is not relayed in full.
    expect(result.error).not.toContain('SECRET-INTERNAL-PAYLOAD-'.repeat(80));
  });

  it('bounds the raw-text fallback body echoed from the fetched target', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      url: 'https://my-llm.example.test/v1/chat/completions',
      body: null,
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'RAW-INTERNAL-BODY-'.repeat(200),
    });

    const result = await testAiConfig(baseConfig);

    expect(result.success).toBe(false);
    expect(result.error!.length).toBeLessThanOrEqual('API returned 502: '.length + 500 + '…[truncated]'.length);
    expect(result.error).toContain('…[truncated]');
  });

  it('bounds the google-path error message echo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      url: 'https://my-llm.example.test/v1beta/models/gemini',
      body: null,
      json: async () => ({ error: { message: 'G-SECRET-'.repeat(200) } }),
    });

    const result = await testAiConfig({
      ...baseConfig,
      provider: 'google',
      baseUrl: 'https://my-llm.example.test',
    });

    expect(result.success).toBe(false);
    expect(result.error!.length).toBeLessThanOrEqual(500 + '…[truncated]'.length);
    expect(result.error).toContain('…[truncated]');
  });

  it('returns the resolved marker on a successful public endpoint (BYOK test flow keeps working)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://my-llm.example.test/v1/chat/completions',
      body: null,
    });

    const result = await testAiConfig(baseConfig);

    expect(result.success).toBe(true);
    expect(result.model).toBe('gpt-4o-mini');
  });

  it('surfaces the DNS guard rejection through the route-shaped error field', async () => {
    (resolveHostAddresses as jest.Mock).mockResolvedValue(['10.0.0.99']);

    const result = await testAiConfig({
      ...baseConfig,
      baseUrl: 'http://rebind.attacker-example.test:6379',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SSRF Protection: Blocked request to host resolving to a private/reserved address');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
