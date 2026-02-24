import { generateAuthCode } from '../tokens';

describe('tokens', () => {
    describe('generateAuthCode', () => {
        it('should generate a code of length 8', () => {
            const code = generateAuthCode();
            expect(code).toHaveLength(8);
        });

        it('should generate a code with allowed characters', () => {
            const code = generateAuthCode();
            const allowedChars = /^[0-9A-Z]{8}$/;
            expect(code).toMatch(allowedChars);
        });

        it('should generate unique codes', () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(generateAuthCode());
            }
            // With 36^6 possible combinations, 100 iterations should be unique
            expect(codes.size).toBe(100);
        });
    });
});
