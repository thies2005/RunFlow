/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoachDrawerProvider, useCoachDrawer } from '@/components/providers/CoachDrawerProvider';
import ReadinessCard from '@/components/views/health/ReadinessCard';

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
}));

jest.mock('@/components/AiChat', () => ({
    __esModule: true,
    default: ({ mode, initialPrompt, autoSend }: { mode?: string; initialPrompt?: string; autoSend?: boolean }) => (
        <div data-testid="mock-aichat" data-mode={mode} data-prompt={initialPrompt} data-autosend={String(!!autoSend)} />
    ),
}));

jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Area: () => <div />,
}));

function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <CoachDrawerProvider>{ui}</CoachDrawerProvider>
        </QueryClientProvider>
    );
}

describe('Phase 3 CoachDrawer & ReadinessCard Adaptation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });
        HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
            this.removeAttribute('open');
        });
    });

    it('opens and closes CoachDrawer with contextual prompt and drawer mode', () => {
        function Trigger() {
            const { openCoach, isOpen } = useCoachDrawer();
            return (
                <div>
                    <span data-testid="drawer-state">{isOpen ? 'open' : 'closed'}</span>
                    <button
                        type="button"
                        onClick={() =>
                            openCoach({
                                title: 'Test Coach',
                                contextType: 'readiness',
                                prompt: 'How is my readiness?',
                                autoSend: true,
                            })
                        }
                    >
                        Open
                    </button>
                </div>
            );
        }

        renderWithProviders(<Trigger />);
        expect(screen.getByTestId('drawer-state').textContent).toBe('closed');

        fireEvent.click(screen.getByText('Open'));
        expect(screen.getByTestId('drawer-state').textContent).toBe('open');
        const chat = screen.getByTestId('mock-aichat');
        expect(chat.getAttribute('data-mode')).toBe('drawer');
        expect(chat.getAttribute('data-prompt')).toBe('How is my readiness?');
        expect(chat.getAttribute('data-autosend')).toBe('true');

        fireEvent.click(screen.getByLabelText('Close coach'));
        expect(screen.getByTestId('drawer-state').textContent).toBe('closed');
    });

    it('applies and restores readiness adaptation via PATCH /api/health/readiness/adaptation', async () => {
        const mockDaily = {
            id: 'r1',
            date: '2026-11-15',
            compositeScore: 48,
            state: 'REDUCED',
            confidence: 'high',
            componentScores: {},
            reasons: ['Low HRV'],
            hrvJson: { todayHrv: 42 },
            computedAt: null,
            syncedAt: null,
        };
        const mockAdaptation = {
            id: 'adapt-1',
            originalWorkoutId: 'w-1',
            originalType: 'TEMPO',
            adaptedType: 'EASY',
            adaptationType: 'SWAP',
            originalTargetDuration: 60,
            adaptedTargetDuration: 40,
            originalTargetDistance: 10000,
            adaptedTargetDistance: 6500,
            reason: 'Readiness reduced',
            isAccepted: false,
        };

        let currentAdaptation = { ...mockAdaptation };

        global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input.toString();
            if (url.includes('/api/health/readiness/daily')) {
                return new Response(JSON.stringify(mockDaily), { status: 200 });
            }
            if (url.includes('/api/health/readiness/history')) {
                return new Response(JSON.stringify([mockDaily]), { status: 200 });
            }
            if (url.includes('/api/health/readiness/adaptation') && init?.method === 'PATCH') {
                const body = JSON.parse(String(init.body));
                currentAdaptation = {
                    ...currentAdaptation,
                    isAccepted: body.action === 'APPLY',
                };
                return new Response(JSON.stringify(currentAdaptation), { status: 200 });
            }
            if (url.includes('/api/health/readiness/adaptation')) {
                return new Response(JSON.stringify(currentAdaptation), { status: 200 });
            }
            return new Response(JSON.stringify(null), { status: 200 });
        }) as jest.Mock;

        renderWithProviders(<ReadinessCard />);

        const applyBtn = await screen.findByText('Apply adaptation');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(screen.getByText('Applied')).toBeTruthy();
            expect(screen.getByText('Undo adaptation')).toBeTruthy();
        });

        fireEvent.click(screen.getByText('Undo adaptation'));
        await waitFor(() => {
            expect(screen.getByText('Apply adaptation')).toBeTruthy();
        });
    });
});
