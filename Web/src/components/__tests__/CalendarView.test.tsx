/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarView } from '../views/CalendarView';

const fetchMock = jest.fn();

function renderCalendar() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <CalendarView />
        </QueryClientProvider>,
    );
}

function jsonResponse(data: unknown) {
    return {
        ok: true,
        status: 200,
        json: async () => data,
    };
}

beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
});

describe('CalendarView advanced editor link', () => {
    it('shows an "Advanced Editor" link to the active goal\'s plan editor', async () => {
        fetchMock.mockImplementation(async (url: string) => {
            if (url.startsWith('/api/plans')) {
                return jsonResponse({
                    goals: [
                        {
                            id: 'goal-1',
                            isActive: true,
                            raceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            raceType: 'HALF_MARATHON',
                            parentGoalId: null,
                            deletedAt: null,
                        },
                    ],
                });
            }
            if (url.startsWith('/api/plan-advanced/')) {
                return jsonResponse({ plan: { id: 'plan-1', workouts: [] } });
            }
            if (url.startsWith('/api/activities')) {
                return jsonResponse({ activities: [] });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        renderCalendar();

        const link = await screen.findByRole('link', { name: /advanced editor/i });
        await waitFor(() => expect(link).toHaveAttribute('href', '/plan-advanced/goal-1'));
    });

    it('hides the link when there is no goal', async () => {
        fetchMock.mockImplementation(async (url: string) => {
            if (url.startsWith('/api/plans')) {
                return jsonResponse({ goals: [] });
            }
            if (url.startsWith('/api/activities')) {
                return jsonResponse({ activities: [] });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        renderCalendar();

        // Let the queries settle before asserting absence
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(screen.queryByRole('link', { name: /advanced editor/i })).not.toBeInTheDocument();
    });
});
