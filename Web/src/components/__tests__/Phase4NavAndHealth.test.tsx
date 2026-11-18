/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppTopBar } from '@/components/layout/AppTopBar';
import HealthView from '@/components/views/HealthView';
import ChatSidebar from '@/components/ChatSidebar';
import { CoachDrawerProvider } from '@/components/providers/CoachDrawerProvider';

let mockPathname = '/';
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...props} alt={props.alt || ''} />
    ),
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { id: 'user-1', name: 'Runner' } },
        status: 'authenticated',
    }),
}));

jest.mock('@/components/MinimalistPillsMenu', () => ({
    MinimalistPillsMenu: () => <div data-testid="minimalist-pills-menu" />,
}));

jest.mock('@/components/AiChat', () => ({
    __esModule: true,
    default: () => <div data-testid="mock-aichat" />,
}));

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('rehype-raw', () => () => {});
jest.mock('rehype-sanitize', () => () => {});
jest.mock('dompurify', () => ({
    __esModule: true,
    default: { sanitize: (s: string) => s },
}));

jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Line: () => <div />,
    BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Bar: () => <div />,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Area: () => <div />,
    PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Pie: () => <div />,
    Cell: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    ReferenceLine: () => <div />,
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

describe('Phase 4 Navigation & Health IA Simplification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPathname = '/';
        HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });
        HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
            this.removeAttribute('open');
        });
        global.fetch = jest.fn(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();
            if (url.includes('/api/health/daily')) {
                return new Response(JSON.stringify({ dailyHealth: { waterIntake: 1000, weight: 70 }, foodLogs: [], supplementLogs: [], meta: {} }), { status: 200 });
            }
            if (url.includes('/api/health/nutrition/target')) {
                return new Response(JSON.stringify({ dailyCalories: 2200, proteinPercent: 30, carbsPercent: 45, fatsPercent: 25 }), { status: 200 });
            }
            if (url.includes('/api/health/fasting')) {
                return new Response(JSON.stringify({ enabled: true, goalHours: 16, currentSession: null }), { status: 200 });
            }
            if (url.includes('/api/health/supplements')) {
                return new Response(JSON.stringify([]), { status: 200 });
            }
            if (url.includes('/api/health/readiness/history')) {
                return new Response(JSON.stringify([]), { status: 200 });
            }
            if (url.includes('/api/health/readiness/daily')) {
                return new Response(JSON.stringify({
                    date: '2026-11-15',
                    compositeScore: 78,
                    status: 'OPTIMAL',
                    hrvJson: { todayHrv: 55 },
                    componentScores: {},
                }), { status: 200 });
            }
            if (url.includes('/api/health/readiness/adaptation')) {
                return new Response(JSON.stringify(null), { status: 404 });
            }
            if (url.includes('/api/health/nutrition/analytics')) {
                return new Response(JSON.stringify({
                    target: { dailyCalories: 2200, proteinPercent: 30, carbsPercent: 45, fatsPercent: 25, targetProtein: 165, targetCarbs: 247, targetFats: 61 },
                    today: { date: '2026-11-15', calories: 1200, protein: 90, carbs: 130, fats: 35, fiber: 15, sugar: 20, saturatedFat: 8, sodium: 1000, potassium: 2000, cholesterol: 150, calcium: 400, iron: 8 },
                    dailyData: [],
                    avgDaily: null,
                    adherenceScore: 85,
                    topContributors: { sodium: [], sugar: [], calories: [] },
                }), { status: 200 });
            }
            if (url.includes('/api/health/insights')) {
                return new Response(JSON.stringify({ insight: null }), { status: 200 });
            }
            if (url.includes('/api/health/body-composition') || url.includes('/api/health/history')) {
                return new Response(JSON.stringify({ measurements: [], history: [] }), { status: 200 });
            }
            if (url.includes('/api/ai/chat/sessions')) {
                return new Response(JSON.stringify({
                    sessions: [{ id: 'sess-1', title: 'Marathon taper advice', updatedAt: '2026-11-15T10:00:00.000Z' }],
                }), { status: 200 });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        }) as jest.Mock;
    });

    it('AppTopBar renders all 5 primary links and marks the active route with aria-current="page"', () => {
        mockPathname = '/health';
        render(<AppTopBar />);

        const nav = screen.getByRole('navigation', { name: 'Primary' });
        expect(nav).toBeInTheDocument();

        const links = [
            { name: 'Home', href: '/' },
            { name: 'Calendar', href: '/calendar' },
            { name: 'Analytics', href: '/analytics' },
            { name: 'Health', href: '/health' },
            { name: 'Coach', href: '/chat' },
        ];

        for (const item of links) {
            const link = screen.getByRole('link', { name: item.name });
            expect(link).toHaveAttribute('href', item.href);
            if (item.href === '/health') {
                expect(link).toHaveAttribute('aria-current', 'page');
            } else {
                expect(link).not.toHaveAttribute('aria-current');
            }
        }
    });

    it('HealthView organizes content into 3 accessible tabs with keyboard navigation and opens unified AddFoodSheet', async () => {
        mockPathname = '/health';
        renderWithProviders(<HealthView showHeader={true} />);

        const todayTab = screen.getByRole('tab', { name: 'Today' });
        const trendsTab = screen.getByRole('tab', { name: 'Trends & Body' });
        const insightsTab = screen.getByRole('tab', { name: 'Insights' });

        expect(todayTab).toHaveAttribute('aria-selected', 'true');
        expect(trendsTab).toHaveAttribute('aria-selected', 'false');
        expect(insightsTab).toHaveAttribute('aria-selected', 'false');

        // Keyboard navigation ArrowRight -> Trends & Body
        fireEvent.keyDown(todayTab, { key: 'ArrowRight' });
        expect(trendsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Body Composition')).toBeInTheDocument();

        // Keyboard navigation ArrowRight -> Insights
        fireEvent.keyDown(trendsTab, { key: 'ArrowRight' });
        expect(insightsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('AI Weekly Insights')).toBeInTheDocument();

        // ArrowLeft -> Trends & Body, then click Today
        fireEvent.keyDown(insightsTab, { key: 'ArrowLeft' });
        expect(trendsTab).toHaveAttribute('aria-selected', 'true');

        fireEvent.click(todayTab);
        expect(todayTab).toHaveAttribute('aria-selected', 'true');

        // Quick action opens unified AddFoodSheet on Photo Scan tab without mutating window.history
        const pushStateSpy = jest.spyOn(window.history, 'pushState');
        const backSpy = jest.spyOn(window.history, 'back');

        const aiScanBtn = await screen.findByRole('button', { name: /AI Scan/i });
        fireEvent.click(aiScanBtn);

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Photo Scan' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Search & Log' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tab', { name: 'Barcode' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tab', { name: 'Saved Meals' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tab', { name: 'Suggestions' })).toHaveAttribute('aria-selected', 'false');

        // Switch tabs inside AddFoodSheet and close it -> embedded modals must not mutate window.history
        fireEvent.click(screen.getByRole('tab', { name: 'Search & Log' }));
        expect(screen.getByRole('tab', { name: 'Search & Log' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('tab', { name: 'Saved Meals' }));
        expect(screen.getByRole('tab', { name: 'Saved Meals' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('button', { name: /Close/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(pushStateSpy).not.toHaveBeenCalled();
        expect(backSpy).not.toHaveBeenCalled();
        pushStateSpy.mockRestore();
        backSpy.mockRestore();
    });

    it('ChatSidebar uses ConfirmDialog instead of window.confirm / window.alert', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

        renderWithProviders(<ChatSidebar />);

        const deleteBtn = await screen.findByRole('button', { name: 'Delete chat Marathon taper advice' });
        fireEvent.click(deleteBtn);

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();

        const dialog = await screen.findByRole('dialog', { name: 'Delete this chat?' });
        expect(dialog).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Delete this chat?' })).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Delete All History/i }));
        expect(await screen.findByRole('dialog', { name: 'Delete all chat history?' })).toBeInTheDocument();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
        alertSpy.mockRestore();
    });
});
