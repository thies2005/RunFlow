
import { goalSchema } from './schemas';
import { RaceType } from '@/generated/prisma/browser';

describe('goalSchema Validation', () => {
    it('should accept valid RaceType values', () => {
        const validData = {
            name: 'My Marathon',
            raceType: RaceType.MARATHON,
            raceDate: new Date().toISOString(),
        };

        const result = goalSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.raceType).toBe(RaceType.MARATHON);
        }
    });

    it('should accept all enum values', () => {
        const types = Object.values(RaceType);
        types.forEach(type => {
            const result = goalSchema.safeParse({
                name: 'Race',
                raceType: type,
                raceDate: new Date().toISOString(),
            });
            expect(result.success).toBe(true);
        });
    });

    it('should reject invalid RaceType values', () => {
        const invalidData = {
            name: 'My Invalid Race',
            raceType: 'ULTRA_MARATHON', // Not in enum
            raceDate: new Date().toISOString(),
        };

        const result = goalSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
             const error = result.error.issues.find(i => i.path.includes('raceType'));
             expect(error).toBeDefined();
        }
    });

    it('should reject arbitrary strings', () => {
        const invalidData = {
            name: 'My Random Race',
            raceType: 'random_string',
            raceDate: new Date().toISOString(),
        };

        const result = goalSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});
