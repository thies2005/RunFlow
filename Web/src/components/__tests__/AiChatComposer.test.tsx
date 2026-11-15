import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('next/navigation', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('remark-gfm', () => () => {});
jest.mock('rehype-sanitize', () => () => {});

import AiChat from '../AiChat';

describe('AiChat Phase 2 composer & empty state', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Coach empty state without greeting hero, disables empty Send, and guards IME Enter', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                settings: { adminAllowed: true, aiEnabled: true, accessActivityLogs: false, accessNutritionLogs: false },
            }),
        });
        global.fetch = fetchMock;

        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={client}>
                <AiChat />
            </QueryClientProvider>
        );

        const textarea = await screen.findByLabelText('Message Coach');
        expect(textarea.tagName).toBe('TEXTAREA');
        expect(screen.queryByText(/How can I assist\?/i)).not.toBeInTheDocument();
        expect(screen.getByText('Coach')).toBeInTheDocument();

        const sendBtn = screen.getByRole('button', { name: 'Send message' });
        expect(sendBtn).toBeDisabled();

        await userEvent.type(textarea, 'Hello');
        expect(sendBtn).toBeEnabled();

        // IME keyCode 229 must not submit
        fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
        expect(fetchMock).toHaveBeenCalledTimes(1); // Only settings fetch

        // Native isComposing must not submit
        const composingEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        Object.defineProperty(composingEvent, 'isComposing', { value: true });
        textarea.dispatchEvent(composingEvent);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('shows Stop response button while streaming and aborts via AbortController', async () => {
        let capturedSignal: AbortSignal | null | undefined;
        const fetchMock = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
            if (url === '/api/ai/settings') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        settings: { adminAllowed: true, aiEnabled: true, accessActivityLogs: false, accessNutritionLogs: false },
                    }),
                });
            }
            if (url === '/api/ai/chat') {
                capturedSignal = init?.signal;
                return new Promise(() => {
                    // Keep stream pending until aborted
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({}) });
        });
        global.fetch = fetchMock;

        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={client}>
                <AiChat />
            </QueryClientProvider>
        );

        const textarea = await screen.findByLabelText('Message Coach');
        await userEvent.type(textarea, 'Analyze run{enter}');

        const stopBtn = await screen.findByRole('button', { name: 'Stop response' });
        expect(capturedSignal).toBeDefined();
        expect(capturedSignal?.aborted).toBe(false);

        await userEvent.click(stopBtn);
        expect(capturedSignal?.aborted).toBe(true);
    });
});
