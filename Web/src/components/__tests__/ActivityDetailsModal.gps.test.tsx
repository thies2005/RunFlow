import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ActivityDetailsModal from '../ActivityDetailsModal';
import type { ActivityListItem } from '@/lib/types';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('../InteractiveStreamsChart', () => ({ __esModule: true, default: () => null }));
jest.mock('react-markdown', () => ({ __esModule: true, default: () => null }));
jest.mock('rehype-raw', () => ({ __esModule: true, default: () => null }));
jest.mock('rehype-sanitize', () => ({ __esModule: true, default: () => null }));

const activity = (id: string): ActivityListItem => ({
    id, name: id, type: 'RUN', startDate: '2026-11-01T10:00:00Z', distance: 5000,
    movingTime: 1800, averageSpeed: 2.7, averageHr: null,
    maxHr: null, averageCadence: null, totalElevation: 0, calories: null,
    trainingType: 'EASY', hasHeartrate: false, stravaId: '1', sportType: 'Run', description: null,
    maxSpeed: null, gradeAdjustedSpeed: null, elevHigh: null, elevLow: null,
    trimp: null, runningTss: null, estimatedVdot: null, hrZone1Time: null, hrZone2Time: null,
    hrZone3Time: null, hrZone4Time: null, hrZone5Time: null, hrZone6Time: null, hrZone7Time: null,
});
const reply = (id: string, latlng: number[][]) => ({ ok: true, json: async () => ({id, streams: { time: [0, 1], latlng }}) });

it('hides previous GPS on activity switch and ignores a response that resolves after abort', async () => {
    let resolveFirst!: (value: ReturnType<typeof reply>) => void;
    const first = new Promise<ReturnType<typeof reply>>(resolve => { resolveFirst = resolve; });
    const fetchMock = jest.fn((url: string) => {
        if (url === '/api/activities/first') return first;
        if (url === '/api/activities/second') return Promise.resolve(reply('second', [[45, 25], [46, 26]]));
        return Promise.resolve({ok: true, json: async () => ({})});
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const {rerender, container} = render(<ActivityDetailsModal isOpen onClose={() => {}} activity={activity('first')} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/activities/first', expect.any(Object)));
    rerender(<ActivityDetailsModal isOpen onClose={() => {}} activity={activity('second')} />);
    await screen.findByRole('img', {name: 'GPS route from start to finish'});
    const secondRoute = container.ownerDocument.querySelector('polyline')?.getAttribute('points');
    const firstSignal = (fetchMock.mock.calls.find(call => call[0] === '/api/activities/first') as unknown as [string, RequestInit])[1].signal;
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => { resolveFirst(reply('first', [[0, 0], [0, 1]])); await first; });
    expect(container.ownerDocument.querySelector('polyline')?.getAttribute('points')).toBe(secondRoute);
});

it('retries details without resetting an in-progress activity name edit', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const fetchMock = jest.fn((url: string) => {
        if (url === '/api/activities/retry') {
            attempts++;
            return Promise.resolve(attempts === 1 ? {ok: false} : reply('retry', [[45, 25], [46, 26]]));
        }
        return Promise.resolve({ok: true, json: async () => ({})});
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<ActivityDetailsModal isOpen onClose={() => {}} activity={activity('retry')} />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', {name: 'Edit activity name'}));
    fireEvent.change(screen.getByLabelText('Activity name input'), {target: {value: 'My edited name'}});
    fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
    await screen.findByRole('img', {name: 'GPS route from start to finish'});
    expect(screen.getByLabelText('Activity name input')).toHaveValue('My edited name');
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/settings/cycling')).toHaveLength(1);
    logged.mockRestore();
});
