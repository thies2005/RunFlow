import { formatContextForAi, UserContext } from '../context-builder';

describe('formatContextForAi', () => {
    it('should return an empty string for an empty context', () => {
        const context: UserContext = {};
        expect(formatContextForAi(context)).toBe('');
    });

    it('should format name correctly', () => {
        const context: UserContext = { name: 'John Doe' };
        expect(formatContextForAi(context)).toBe('Athlete: John Doe');
    });

    it('should format biometrics correctly', () => {
        const context: UserContext = {
            biometrics: {
                age: 30,
                sex: 'M',
                weight: 70,
                height: 175,
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Profile: 30 years old, m, 70kg, 175cm');
    });

    it('should handle partial biometrics', () => {
        const context: UserContext = {
            biometrics: {
                weight: 70,
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Profile: 70kg');
        expect(result).not.toContain('years old');
    });

    it('should format fitness metrics correctly', () => {
        const context: UserContext = {
            fitnessMetrics: {
                ctl: 42.5,
                atl: 30.1,
                tsb: 12.4,
                ctlRunning: 40,
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Current Fitness: CTL 42.5, ATL 30.1, TSB 12.4 (Form: Fresh)');
    });

    it('should correctly interpret form based on TSB', () => {
        const freshContext: UserContext = { fitnessMetrics: { ctl: 0, atl: 0, tsb: 15, ctlRunning: 0 } };
        expect(formatContextForAi(freshContext)).toContain('(Form: Fresh)');

        const fatiguedContext: UserContext = { fitnessMetrics: { ctl: 0, atl: 0, tsb: -15, ctlRunning: 0 } };
        expect(formatContextForAi(fatiguedContext)).toContain('(Form: Fatigued)');

        const balancedContext: UserContext = { fitnessMetrics: { ctl: 0, atl: 0, tsb: 5, ctlRunning: 0 } };
        expect(formatContextForAi(balancedContext)).toContain('(Form: Balanced)');
    });

    it('should format heart rate data correctly', () => {
        const context: UserContext = {
            heartRateData: {
                maxHr: 190,
                restingHr: 50,
                thresholdHr: 170,
                zones: [],
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Max HR: 190, Resting HR: 50, LTHR: 170');
    });

    it('should handle partial heart rate data', () => {
        const context: UserContext = {
            heartRateData: {
                maxHr: 190,
                zones: [],
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Max HR: 190');
        expect(result).not.toContain('Resting HR');
    });

    it('should format goals correctly', () => {
        // Mock Date.now to ensure deterministic "days away" calculation
        const realDateNow = Date.now;
        const mockNow = new Date('2023-01-01T00:00:00Z').getTime();
        global.Date.now = jest.fn(() => mockNow);

        const raceDate = new Date('2023-01-11T00:00:00Z').toISOString(); // 10 days later

        const context: UserContext = {
            goals: [{
                name: 'Marathon',
                raceType: 'running',
                raceDate: raceDate,
                targetTime: 14400, // 4 hours
            }],
        };

        const result = formatContextForAi(context);
        // 10 days away
        expect(result).toContain('Goals: Marathon (running, 10 days away, target: 4:00:00)');

        // Restore Date.now
        global.Date.now = realDateNow;
    });

    it('should format performance metrics correctly', () => {
        const context: UserContext = {
            performance: {
                currentVdot: 54.2,
                vdotCorrectionFactor: 1,
            },
        };
        const result = formatContextForAi(context);
        expect(result).toContain('Current VDOT: 54.2');
    });

    it('should format recent activities correctly', () => {
        const context: UserContext = {
            recentActivities: [
                {
                    date: '2023-01-01',
                    type: 'Run',
                    distance: 5000,
                    duration: 1500, // 25 min
                    pace: 300, // 5:00/km
                    avgHr: 150,
                    elevationGain: 50,
                    tss: 40,
                },
                {
                    date: '2023-01-02',
                    type: 'Run',
                    distance: 10000,
                    duration: 3000, // 50 min
                    pace: 300, // 5:00/km
                }
            ],
        };

        const result = formatContextForAi(context);

        // Check summary
        // Total distance: 15km
        // Total duration: 75 min
        // Count: 2
        expect(result).toContain('Last 7 days: 15.0km in 75 minutes across 2 activities');

        // Check individual activities
        expect(result).toContain('Recent Activities (Last 20):');
        expect(result).toContain('2023-01-01 | Run | 5.0km | 5:00/km | 150bpm | +50m | TSS 40');
        expect(result).toContain('2023-01-02 | Run | 10.0km | 5:00/km');
    });

    it('should format training plan correctly', () => {
        const context: UserContext = {
            trainingPlan: {
                upcomingWorkouts: [
                    { date: '2023-01-05', type: 'Intervals', description: '5x1km' },
                    { date: '2023-01-06', type: 'Recovery', description: 'Easy run' },
                ],
                recentCompletedWorkouts: [],
            },
        };

        const result = formatContextForAi(context);
        expect(result).toContain('Upcoming workouts: 2023-01-05: Intervals, 2023-01-06: Recovery');
    });

    it('should format a full context correctly', () => {
         const context: UserContext = {
            name: 'Jane Doe',
            biometrics: { age: 28, sex: 'F' },
            fitnessMetrics: { ctl: 50, atl: 40, tsb: 10, ctlRunning: 50 },
            heartRateData: { maxHr: 195, zones: [] },
            recentActivities: [{
                date: '2023-01-01', type: 'Run', distance: 5000, duration: 1800, pace: 360, avgHr: 140
            }]
        };

        const result = formatContextForAi(context);
        const lines = result.split('\n');

        expect(lines).toContain('Athlete: Jane Doe');
        expect(lines).toContain('Profile: 28 years old, f');
        expect(lines).toContain('Current Fitness: CTL 50.0, ATL 40.0, TSB 10.0 (Form: Balanced)');
        expect(lines).toContain('Max HR: 195');
        expect(lines).toContain('Last 7 days: 5.0km in 30 minutes across 1 activities');
    });
});
