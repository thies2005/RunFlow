import {
    calculateCaloriesHr,
    calculateCaloriesMet,
    calculateCalories,
    getIntensityFromSpeed,
    getMetValue,
    calculateAge,
} from '../calories';

describe('Calorie Calculator', () => {
    describe('calculateCaloriesHr', () => {
        it('should calculate calories for a male runner', () => {
            // 30 min run at 150 bpm avg, 70kg, 30 years old
            const calories = calculateCaloriesHr(30, 150, 70, 30, 'MALE');
            // HR formula: (-55.0969 + 0.6309*150 + 0.1988*70 + 0.2017*30) / 4.184
            // = (-55.0969 + 94.635 + 13.916 + 6.051) / 4.184 = 14.2 cal/min
            // 30 min * 14.2 = ~426 calories
            expect(calories).toBeGreaterThan(100);
            expect(calories).toBeLessThan(600);
        });

        it('should calculate calories for a female runner', () => {
            // 30 min run at 150 bpm, 60kg, 28 years old
            const calories = calculateCaloriesHr(30, 150, 60, 28, 'FEMALE');
            // Female formula produces somewhat different values
            expect(calories).toBeGreaterThan(100);
            expect(calories).toBeLessThan(500);
        });

        it('should return 0 for invalid inputs', () => {
            expect(calculateCaloriesHr(0, 150, 70, 30, 'MALE')).toBe(0);
            expect(calculateCaloriesHr(30, 0, 70, 30, 'MALE')).toBe(0);
            expect(calculateCaloriesHr(30, 150, 0, 30, 'MALE')).toBe(0);
            expect(calculateCaloriesHr(30, 150, 70, 0, 'MALE')).toBe(0);
        });

        it('should scale with duration', () => {
            const cal30 = calculateCaloriesHr(30, 150, 70, 30, 'MALE');
            const cal60 = calculateCaloriesHr(60, 150, 70, 30, 'MALE');
            expect(cal60).toBeCloseTo(cal30 * 2, -1); // Within 10
        });
    });

    describe('calculateCaloriesMet', () => {
        it('should calculate calories for running', () => {
            // 60 min moderate run (9.8 METs), 70kg
            const calories = calculateCaloriesMet(60, 'RUN', 70, 'moderate');
            // 9.8 * 70 * 1 = 686
            expect(calories).toBeCloseTo(686, 0);
        });

        it('should calculate calories for cycling', () => {
            // 60 min moderate ride (8.0 METs), 70kg
            const calories = calculateCaloriesMet(60, 'RIDE', 70, 'moderate');
            expect(calories).toBeCloseTo(560, 0);
        });

        it('should calculate calories for swimming', () => {
            // 30 min vigorous swim (10.0 METs), 65kg
            const calories = calculateCaloriesMet(30, 'SWIM', 65, 'vigorous');
            // 10 * 65 * 0.5 = 325
            expect(calories).toBeCloseTo(325, 0);
        });

        it('should return 0 for zero duration', () => {
            expect(calculateCaloriesMet(0, 'RUN', 70, 'moderate')).toBe(0);
        });
    });

    describe('getIntensityFromSpeed', () => {
        it('should classify running speed correctly', () => {
            expect(getIntensityFromSpeed('RUN', 2.0)).toBe('light'); // ~7.2 km/h
            expect(getIntensityFromSpeed('RUN', 3.0)).toBe('moderate'); // ~10.8 km/h
            expect(getIntensityFromSpeed('RUN', 4.0)).toBe('vigorous'); // ~14.4 km/h
        });

        it('should classify cycling speed correctly', () => {
            expect(getIntensityFromSpeed('RIDE', 4.0)).toBe('light'); // ~14.4 km/h
            expect(getIntensityFromSpeed('RIDE', 6.0)).toBe('moderate'); // ~21.6 km/h
            expect(getIntensityFromSpeed('RIDE', 9.0)).toBe('vigorous'); // ~32.4 km/h
        });

        it('should default to moderate when no speed provided', () => {
            expect(getIntensityFromSpeed('RUN', undefined)).toBe('moderate');
            expect(getIntensityFromSpeed('RUN', 0)).toBe('moderate');
        });
    });

    describe('calculateCalories (main function)', () => {
        it('should use HR-based calculation when HR data available', () => {
            const result = calculateCalories({
                durationMinutes: 30,
                activityType: 'RUN',
                weightKg: 70,
                averageHr: 150,
                age: 30,
                sex: 'MALE',
            });
            expect(result.method).toBe('hr');
            expect(result.calories).toBeGreaterThan(0);
        });

        it('should fall back to MET when no HR data', () => {
            const result = calculateCalories({
                durationMinutes: 30,
                activityType: 'RUN',
                weightKg: 70,
                averageSpeedMps: 3.0,
            });
            expect(result.method).toBe('met');
            expect(result.calories).toBeGreaterThan(0);
        });

        it('should have high confidence with complete user data', () => {
            const result = calculateCalories({
                durationMinutes: 30,
                activityType: 'RUN',
                weightKg: 70,
                averageHr: 150,
                age: 30,
                sex: 'MALE',
            });
            expect(result.confidence).toBe('high');
        });

        it('should have medium confidence with HR but missing user data', () => {
            const result = calculateCalories({
                durationMinutes: 30,
                activityType: 'RUN',
                averageHr: 150, // No weight/age provided
            });
            expect(result.confidence).toBe('medium');
        });

        it('should have low confidence with no HR and no weight', () => {
            const result = calculateCalories({
                durationMinutes: 30,
                activityType: 'RUN',
            });
            expect(result.confidence).toBe('low');
        });
    });

    describe('getMetValue', () => {
        it('should return correct MET values', () => {
            expect(getMetValue('RUN', 'moderate')).toBe(9.8);
            expect(getMetValue('RIDE', 'vigorous')).toBe(12.0);
            expect(getMetValue('SWIM', 'light')).toBe(6.0);
        });
    });

    describe('calculateAge', () => {
        it('should calculate age from birthdate', () => {
            const today = new Date();
            const birthDate = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
            expect(calculateAge(birthDate)).toBe(30);
        });

        it('should return default age for null birthdate', () => {
            expect(calculateAge(null)).toBe(30); // Default age
        });
    });
});
