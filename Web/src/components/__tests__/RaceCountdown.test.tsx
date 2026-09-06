/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { RaceCountdown } from '../RaceCountdown';
import { useDeviceType } from '@/hooks/useDeviceType';
import type { Goal } from '@/lib/types';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: undefined, isLoading: false }),
    useQueryClient: () => ({ invalidateQueries: jest.fn() }),
    useMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/useDeviceType', () => ({
    useDeviceType: jest.fn(),
}));

jest.mock('../providers/UserMetricsProvider', () => ({
    useUserMetrics: () => ({
        marathonShape: { shape: 0.9 },
        effectiveVO2max: 52,
        correctionFactor: 1,
        currentWeekMileage: 40,
    }),
}));

jest.mock('@/lib/units', () => ({
    useUnits: () => ({ useImperial: false }),
    formatDistanceWithUnit: (meters: number | null) =>
        meters == null ? '–' : `${(meters / 1000).toFixed(1)} km`,
    formatPace: (secPerKm: number | null) => (secPerKm == null ? '–' : `${secPerKm}`),
}));

const mockedUseDeviceType = useDeviceType as jest.MockedFunction<typeof useDeviceType>;

// Goal far enough in the future to hit the ACTIVE state (button branch)
const goal = {
    id: 'goal-1',
    name: 'Rome Half',
    raceType: 'HALF_MARATHON',
    raceDate: new Date(Date.now() + 41 * 24 * 60 * 60 * 1000),
    planWeeks: 13,
    isActive: true,
} as unknown as Goal;

describe('RaceCountdown plan-surface link', () => {
    it('shows "View Calendar →" with a real arrow character on desktop', () => {
        mockedUseDeviceType.mockReturnValue({ isMobile: false, isLoading: false });
        render(<RaceCountdown goal={goal} />);
        const btn = screen.getByText('View Calendar →');
        expect(btn).toBeInTheDocument();
        // The arrow must be the real Unicode character, not the literal entity
        expect(btn.textContent).not.toContain('&rarr;');
        expect(btn.textContent).toContain('\u2192');
    });

    it('shows "View Full Plan →" with a real arrow character on mobile', () => {
        mockedUseDeviceType.mockReturnValue({ isMobile: true, isLoading: false });
        render(<RaceCountdown goal={goal} />);
        const btn = screen.getByText('View Full Plan →');
        expect(btn).toBeInTheDocument();
        expect(btn.textContent).not.toContain('&rarr;');
        expect(btn.textContent).toContain('\u2192');
    });
});
