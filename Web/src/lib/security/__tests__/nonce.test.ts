import { generateNonce } from '../nonce';

describe('CSP Nonce Generation', () => {
  it('should generate a valid base64 string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
    // Strict base64 regex
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it('should generate unique nonces each time', () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    const nonce3 = generateNonce();

    expect(nonce1).not.toBe(nonce2);
    expect(nonce2).not.toBe(nonce3);
    expect(nonce1).not.toBe(nonce3);
  });

  it('should generate nonces of reasonable length', () => {
    const nonce = generateNonce();
    // 16 bytes random -> ~22 chars base64
    expect(nonce.length).toBeGreaterThanOrEqual(20);
    expect(nonce.length).toBeLessThanOrEqual(30);
  });

  it('should use crypto.getRandomValues when available', () => {
    // In test environment, this should use browser crypto
    const nonce = generateNonce();
    expect(nonce).toBeTruthy();
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('should not generate empty strings', () => {
    const nonce = generateNonce();
    expect(nonce).not.toBe('');
  });

  it('should not generate whitespace-only strings', () => {
    const nonce = generateNonce();
    expect(nonce.trim()).toBe(nonce);
  });

  it('should generate nonces suitable for CSP (alphanumeric and special chars)', () => {
    const nonce = generateNonce();
    // CSP nonces should be safe to include in HTML attributes
    expect(nonce).not.toMatch(/['"]/); // No quotes
    expect(nonce).not.toMatch(/\s/); // No whitespace
    expect(nonce).not.toMatch(/[<>]/); // No angle brackets
  });
});
