import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useStravaSync } from '../useStravaSync';

function response(data: unknown, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => data };
}

const originalFetch = global.fetch;
const fetchMock = jest.fn();
beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
});
afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
});

function setup(userId: string) {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    return { ...renderHook(() => useStravaSync({ lastSyncAt: null }, userId), { wrapper }), invalidate };
}

it('polls only progress while starting and running, then refreshes the dashboard once', async () => {
    fetchMock
        .mockResolvedValueOnce(response({ status: 'started' }))
        .mockResolvedValueOnce(response({ syncInProgress: false, lastSyncAt: null }))
        .mockResolvedValueOnce(response({ syncInProgress: true, lastSyncAt: null }))
        .mockResolvedValueOnce(response({ syncInProgress: false, lastSyncAt: '2026-11-04T10:00:00.000Z' }));
    const { result, invalidate } = setup('manual');
    await act(async () => { await result.current.syncMutation.mutateAsync(); });
    expect(result.current.syncStatus?.syncInProgress).toBe(true);

    await act(async () => { await jest.advanceTimersByTimeAsync(4000); });
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { await jest.advanceTimersByTimeAsync(6000); });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        '/api/sync', '/api/sync?progress=1', '/api/sync?progress=1', '/api/sync?progress=1',
    ]);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard-data'] });
    expect(result.current.syncStatus?.syncInProgress).toBe(false);
});

it('follows a concurrent import and detects completion between polls', async () => {
    fetchMock
        .mockResolvedValueOnce(response({}, 409))
        .mockResolvedValueOnce(response({ syncInProgress: false, lastSyncAt: '2026-11-04T10:00:00.000Z' }));
    const { result, invalidate } = setup('concurrent');
    await act(async () => { await result.current.syncMutation.mutateAsync(); });
    await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(result.current.syncStatus?.syncInProgress).toBe(false);
});

it('keeps following an accepted import after the dashboard layout remounts', async () => {
    fetchMock
        .mockResolvedValueOnce(response({ status: 'started' }))
        .mockResolvedValueOnce(response({ syncInProgress: false, lastSyncAt: '2026-11-04T10:00:00.000Z' }));
    const first = setup('layout-swap');
    await act(async () => { await first.result.current.syncMutation.mutateAsync(); });
    first.unmount();

    const second = setup('layout-swap');
    expect(second.result.current.syncStatus?.syncInProgress).toBe(true);
    await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
    expect(first.invalidate).not.toHaveBeenCalled();
    expect(second.invalidate).toHaveBeenCalledTimes(1);
    expect(second.result.current.syncStatus?.syncInProgress).toBe(false);
});
