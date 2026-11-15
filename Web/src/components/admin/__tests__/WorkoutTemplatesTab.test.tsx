import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import WorkoutTemplatesTab from '../WorkoutTemplatesTab';

jest.mock('@/lib/admin/csrfHelper', () => ({
    csrfHeaders: () => ({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-csrf',
    }),
    getCsrfToken: () => 'test-csrf',
}));

const sampleTemplate = {
    id: 'tpl-1',
    name: 'Threshold 3x10m',
    description: 'Three ten-minute tempo blocks',
    workoutType: 'TEMPO',
    sport: 'RUN',
    targetDistance: 12000,
    targetDuration: 2700,
    targetPace: 255,
    structuredSteps: [{ stepType: 'WORK', durationSeconds: 600 }],
    difficulty: 'intermediate',
    tags: ['threshold', '10k'],
    category: 'threshold',
    isPublished: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('WorkoutTemplatesTab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ templates: [sampleTemplate], total: 1 }),
        });
    });

    it('renders templates fetched from /api/admin/workout-templates', async () => {
        render(<WorkoutTemplatesTab />);

        await waitFor(() => {
            expect(screen.getByText('Threshold 3x10m')).toBeInTheDocument();
        });
        const table = screen.getByRole('table');
        expect(within(table).getByText('TEMPO')).toBeInTheDocument();
        expect(within(table).getByText('12.0 km')).toBeInTheDocument();
        expect(within(table).getByText('45:00')).toBeInTheDocument();
    });

    it('creates a workout template via POST /api/admin/workout-templates with CSRF headers', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ templates: [], total: 0 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    template: { ...sampleTemplate, id: 'tpl-2', name: 'VO2 5x1000m' },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    templates: [{ ...sampleTemplate, id: 'tpl-2', name: 'VO2 5x1000m' }],
                    total: 1,
                }),
            });
        global.fetch = fetchMock;

        render(<WorkoutTemplatesTab />);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: /new template/i }));
        fireEvent.change(screen.getByLabelText(/^Name$/i), {
            target: { value: 'VO2 5x1000m' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create template/i }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/admin/workout-templates',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' }),
            })
        );
    });

    it('toggles publish status via PATCH /api/admin/workout-templates/[id]', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ templates: [sampleTemplate], total: 1 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    template: { ...sampleTemplate, isPublished: false },
                }),
            });
        global.fetch = fetchMock;

        render(<WorkoutTemplatesTab />);
        await waitFor(() => expect(screen.getByText('Threshold 3x10m')).toBeInTheDocument());

        const toggle = screen.getByRole('switch', { name: /publish status for threshold 3x10m/i });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(toggle);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/admin/workout-templates/tpl-1',
            expect.objectContaining({
                method: 'PATCH',
                headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' }),
                body: JSON.stringify({ isPublished: false }),
            })
        );
    });

    it('deletes a template after destructive confirmation', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ templates: [sampleTemplate], total: 1 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ templates: [], total: 0 }),
            });
        global.fetch = fetchMock;

        render(<WorkoutTemplatesTab />);
        await waitFor(() => expect(screen.getByText('Threshold 3x10m')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /delete template threshold 3x10m/i }));
        fireEvent.click(await screen.findByRole('button', { name: /^Delete$/i }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/admin/workout-templates/tpl-1',
            expect.objectContaining({
                method: 'DELETE',
                headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' }),
            })
        );
    });
});
