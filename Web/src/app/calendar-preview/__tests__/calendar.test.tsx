/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { buildDays, buildWeeks, fmtPace, fmtKm, fmtDuration, fillFitness } from '../components/metrics';
import { WeeklyView } from '../components/WeeklyView';
import type { MockActivity, MockWorkout } from '../components/mockData';
import { resolveDeepLink } from '@/components/DeepLinkHandler';

describe('Calendar Metrics & Formatting', () => {
    it('formats pace correctly for runs and swims', () => {
        expect(fmtPace(290)).toBe('4:50/km');
        expect(fmtPace(290, 'km')).toBe('4:50/km');
        expect(fmtPace(115, '100m')).toBe('1:55/100m');
        expect(fmtPace(0)).toBe('—');
    });

    it('formats km and duration cleanly', () => {
        expect(fmtKm(10000)).toBe('10k');
        expect(fmtKm(5400)).toBe('5.4k');
        expect(fmtDuration(3660)).toBe('1h01m');
        expect(fmtDuration(1800)).toBe('30m');
    });

    it('aggregates daily and weekly multi-sport load', () => {
        const from = new Date('2026-10-12T00:00:00');
        const to = new Date('2026-10-18T00:00:00');

        const activities: MockActivity[] = [
            {
                id: 'act-run',
                name: 'Morning Easy Run',
                type: 'EASY',
                startDate: '2026-10-12T07:00:00Z',
                distance: 8000,
                duration: 2400,
                averageHr: 145,
                trimp: 45,
                tss: 38,
                vdot: 48.5,
                totalElevation: 50,
            },
            {
                id: 'act-ride',
                name: 'Afternoon Tempo Ride',
                type: 'RIDE',
                sport: 'BIKE',
                startDate: '2026-10-13T15:00:00Z',
                distance: 30000,
                duration: 3600,
                averageHr: 152,
                trimp: 55,
                tss: null,
                bikeTss: 65,
                averageWatts: 210,
                npWatts: 225,
                vdot: null,
                totalElevation: 200,
            },
        ];

        const workouts: MockWorkout[] = [
            {
                id: 'work-swim',
                name: 'Threshold Swim',
                type: 'SWIM',
                sport: 'SWIM',
                phase: 'BUILD',
                scheduledDate: '2026-10-14T08:00:00Z',
                targetDistance: 2000,
                targetDuration: 2400,
                plannedTss: 40,
                targetPaceMinSecondsPerKm: 110,
                linkedActivityId: null,
                completed: false,
            },
        ];

        const days = buildDays(activities, workouts, from, to);
        expect(days.size).toBe(7);

        const runDay = days.get('2026-10-12');
        expect(runDay?.distance).toBe(8000);
        expect(runDay?.trimp).toBe(45);
        expect(runDay?.tss).toBe(38);

        const rideDay = days.get('2026-10-13');
        expect(rideDay?.tss).toBe(65); // Includes bikeTss

        const swimDay = days.get('2026-10-14');
        expect(swimDay?.workouts.length).toBe(1);
        expect(swimDay?.plannedTss).toBe(40);

        const weeks = buildWeeks(days, from, to);
        expect(weeks.length).toBe(1);
        expect(weeks[0].plannedTss).toBe(40);
        expect(weeks[0].distance).toBe(38000);

        const filledWeeks = fillFitness(weeks, { initialCtl: 50, initialAtl: 50 });
        expect(filledWeeks[0].ctl).toBeGreaterThan(0);
        expect(filledWeeks[0].atl).toBeGreaterThan(0);
    });
});

describe('WeeklyView Minimal Pills', () => {
    it('renders minimal pills for Run, Bike, and Swim workouts and activities', () => {
        const from = new Date('2026-10-12T00:00:00Z');
        const to = new Date('2026-10-18T23:59:59Z');

        const activities: MockActivity[] = [
            {
                id: 'act-run',
                name: 'Morning Easy Run',
                type: 'EASY',
                sport: 'RUN',
                startDate: '2026-10-12T07:00:00Z',
                distance: 10000,
                duration: 3000,
                averageHr: 140,
                trimp: 50,
                tss: 45,
                vdot: 49,
                totalElevation: 40,
            },
            {
                id: 'act-ride',
                name: 'Sweetspot Ride',
                type: 'RIDE',
                sport: 'BIKE',
                startDate: '2026-10-13T07:00:00Z',
                distance: 40000,
                duration: 4800,
                averageHr: 150,
                trimp: 70,
                tss: null,
                bikeTss: 80,
                averageWatts: 200,
                npWatts: 220,
                vdot: null,
                totalElevation: 300,
            },
        ];

        const workouts: MockWorkout[] = [
            {
                id: 'plan-bike',
                name: 'Interval Ride',
                type: 'RIDE',
                sport: 'BIKE',
                phase: 'BUILD',
                scheduledDate: '2026-10-14T10:00:00Z',
                targetDistance: 35000,
                targetDuration: 4200,
                plannedTss: 75,
                targetPowerMinWatts: 220,
                targetPowerMaxWatts: 250,
                linkedActivityId: null,
                completed: false,
            },
            {
                id: 'plan-swim',
                name: 'Pace Swim',
                type: 'SWIM',
                sport: 'SWIM',
                phase: 'BUILD',
                scheduledDate: '2026-10-15T08:00:00Z',
                targetDistance: 1500,
                targetDuration: 1800,
                plannedTss: 30,
                targetPaceMinSecondsPerKm: 105,
                linkedActivityId: null,
                completed: false,
            },
        ];

        const days = buildDays(activities, workouts, from, to);
        const weeks = buildWeeks(days, from, to);

        render(<WeeklyView weeks={weeks} />);

        // Activity pills: single effort metric + load
        expect(screen.getByText('Morning Easy Run')).toBeInTheDocument();
        expect(screen.getByText('5:00/km')).toBeInTheDocument();
        expect(screen.getByText('TRIMP 50')).toBeInTheDocument();

        expect(screen.getByText('Sweetspot Ride')).toBeInTheDocument();
        expect(screen.getByText('220W')).toBeInTheDocument();
        expect(screen.getByText('TSS 80')).toBeInTheDocument();

        // Planned workout pills: target chip + planned TSS
        expect(screen.getByText('Interval Ride')).toBeInTheDocument();
        expect(screen.getByText('220-250W')).toBeInTheDocument();
        expect(screen.getByText('TSS 75')).toBeInTheDocument();

        expect(screen.getByText('Pace Swim')).toBeInTheDocument();
        expect(screen.getByText('1:45/100m')).toBeInTheDocument();
        expect(screen.getByText('TSS 30')).toBeInTheDocument();
    });
});

describe('Navigation & Deep Links', () => {
    it('resolves /calendar deep link correctly', () => {
        expect(resolveDeepLink('https://runflow.schuelken.uk/calendar')).toBe('/calendar');
        expect(resolveDeepLink('runflow:/calendar')).toBe('/calendar');
    });
});
