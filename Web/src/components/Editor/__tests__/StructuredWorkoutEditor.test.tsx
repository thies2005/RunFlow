/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StructuredWorkoutEditor } from '../StructuredWorkoutEditor';
import type { StructuredWorkoutV2 } from '@/lib/plans/structured';

describe('StructuredWorkoutEditor (Schema v2)', () => {
    it('loads legacy v1 engine shapes without crashing', () => {
        const legacyV1 = {
            version: 1,
            steps: [
                { type: 'warmup', distanceMeters: 1500, paceSecondsPerKm: 320, name: 'Easy Warmup' },
                { type: 'work', distanceMeters: 400, paceSecondsPerKm: 240, name: '400m Rep' },
                { type: 'cooldown', durationSeconds: 600, hrZone: 2, name: 'Cool down' },
            ],
        };

        const onChange = jest.fn();
        render(
            <StructuredWorkoutEditor
                value={legacyV1}
                onChange={onChange}
                workoutType="INTERVALS"
                vdot={48}
                ftpWatts={240}
            />
        );

        expect(screen.getAllByText('Distance')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Duration')[0]).toBeInTheDocument();
        expect(screen.getByText('Est. TSS')).toBeInTheDocument();
        expect(screen.getByText('Intensity Preview')).toBeInTheDocument();
    });

    it('loads legacy builder progression shapes without crashing', () => {
        const legacyBuilder = {
            warmup: { distance: 1000, pace: 'E' },
            main: [{ reps: 6, distance: 800, pace: 'I', restSeconds: 90 }],
            cooldown: { distance: 1000, pace: 'E' },
        };

        const onChange = jest.fn();
        render(
            <StructuredWorkoutEditor
                value={legacyBuilder}
                onChange={onChange}
                workoutType="INTERVALS"
                vdot={50}
            />
        );

        expect(screen.getByText('Repeat Block')).toBeInTheDocument();
        expect(screen.getByText('Rest between sets:')).toBeInTheDocument();
    });

    it('supports adding a new step and a repeat group', () => {
        const onChange = jest.fn();
        render(
            <StructuredWorkoutEditor
                value={{ version: 2, source: 'editor', steps: [] }}
                onChange={onChange}
                workoutType="INTERVALS"
                vdot={45}
            />
        );

        const addStepBtn = screen.getByText('Add Step');
        fireEvent.click(addStepBtn);
        expect(onChange).toHaveBeenCalled();
        const call1 = onChange.mock.calls[onChange.mock.calls.length - 1][0] as StructuredWorkoutV2;
        expect(call1.steps.length).toBe(1);
        expect(call1.steps[0].kind).toBe('work');

        const addRepeatBtn = screen.getByText('Add Repeat Group');
        fireEvent.click(addRepeatBtn);
        expect(onChange).toHaveBeenCalled();
        const call2 = onChange.mock.calls[onChange.mock.calls.length - 1][0] as StructuredWorkoutV2;
        expect(call2.steps.some((s) => s.kind === 'repeat')).toBe(true);
    });

    it('displays power zone chips for bike workouts and pace chips for run workouts', () => {
        const bikeWorkout: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [
                {
                    kind: 'work',
                    duration: { type: 'time', seconds: 1200 },
                    target: { type: 'power', minWatts: 180, maxWatts: 220, ftpPercent: 85, zoneLabel: 'Z3' },
                },
            ],
        };

        const { rerender } = render(
            <StructuredWorkoutEditor
                value={bikeWorkout}
                onChange={jest.fn()}
                workoutType="RIDE"
                sport="BIKE"
                ftpWatts={250}
            />
        );

        expect(screen.getByText('Z3')).toBeInTheDocument();
        expect(screen.getByText('Z4')).toBeInTheDocument();

        // Rerender with run workout
        const runWorkout: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [
                {
                    kind: 'work',
                    duration: { type: 'distance', meters: 1000 },
                    target: { type: 'pace', unit: 'sec_per_km', min: 240, max: 250, zoneLabel: 'T' },
                },
            ],
        };

        rerender(
            <StructuredWorkoutEditor
                value={runWorkout}
                onChange={jest.fn()}
                workoutType="TEMPO"
                sport="RUN"
                vdot={48}
            />
        );

        expect(screen.getByText('T')).toBeInTheDocument();
        expect(screen.getByText('I')).toBeInTheDocument();
    });

    it('computes summary metrics and triggers onSummaryChange', () => {
        const onSummaryChange = jest.fn();
        const workout: StructuredWorkoutV2 = {
            version: 2,
            source: 'editor',
            steps: [
                {
                    kind: 'warmup',
                    duration: { type: 'distance', meters: 2000 },
                    target: { type: 'pace', unit: 'sec_per_km', min: 300, max: 300 },
                },
                {
                    kind: 'repeat',
                    times: 5,
                    steps: [
                        {
                            kind: 'work',
                            duration: { type: 'distance', meters: 1000 },
                            target: { type: 'pace', unit: 'sec_per_km', min: 240, max: 240 },
                        },
                    ],
                },
            ],
        };

        render(
            <StructuredWorkoutEditor
                value={workout}
                onChange={jest.fn()}
                onSummaryChange={onSummaryChange}
                workoutType="INTERVALS"
                vdot={50}
            />
        );

        expect(onSummaryChange).toHaveBeenCalled();
        const lastCall = onSummaryChange.mock.calls[onSummaryChange.mock.calls.length - 1][0];
        // 2000m + 5x1000m = 7000m
        expect(lastCall.targetDistance).toBe(7000);
        expect(lastCall.targetDuration).toBeGreaterThan(0);
        expect(lastCall.plannedTss).toBeGreaterThan(0);
    });
});
