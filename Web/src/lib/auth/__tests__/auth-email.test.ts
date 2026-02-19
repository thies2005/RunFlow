import { validatePassword, validateEmail } from '../auth-email';

describe('auth-email', () => {
    describe('validatePassword', () => {
        it('should return valid for a strong password', () => {
            const result = validatePassword('SecureP@ss123');
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return error for password too short', () => {
            const result = validatePassword('Short1!');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must be at least 12 characters');
        });

        it('should return error for missing uppercase letter', () => {
            const result = validatePassword('securep@ss123');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one uppercase letter');
        });

        it('should return error for missing lowercase letter', () => {
            const result = validatePassword('SECUREP@SS123');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one lowercase letter');
        });

        it('should return error for missing number', () => {
            const result = validatePassword('SecureP@ssword');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one number');
        });

        it('should return error for missing special character', () => {
            const result = validatePassword('SecurePass123');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one special character');
        });

        it('should return error for forbidden patterns', () => {
            const forbidden = ['Password123!', '1234567890AB!', 'qwertyUIOP1!', 'adminSecure1!', 'testPassword1!'];
            forbidden.forEach(pw => {
                const result = validatePassword(pw);
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Password contains a common/forbidden pattern');
            });
        });

        it('should return multiple errors when multiple criteria are not met', () => {
            const result = validatePassword('abc');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
            expect(result.errors).toContain('Password must be at least 12 characters');
            expect(result.errors).toContain('Password must contain at least one uppercase letter');
            expect(result.errors).toContain('Password must contain at least one number');
            expect(result.errors).toContain('Password must contain at least one special character');
        });
    });

    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
            expect(validateEmail('user+alias@gmail.com')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('user@domain')).toBe(false);
            expect(validateEmail('user @domain.com')).toBe(false);
        });
    });
});
