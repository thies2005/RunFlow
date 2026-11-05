import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AiSettingsModal from '../AiSettingsModal';

const settings = {
    adminAllowed: true, aiEnabled: true, hasCustomApiKey: false,
    customBaseUrl: null, customModel: null, feedbackMode: 'off',
};

test('rejects an invalid provider URL before testing or saving', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ settings, usage: null }) });
    global.fetch = fetchMock;
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AiSettingsModal isOpen onClose={() => {}} /></QueryClientProvider>);
    const url = await screen.findByLabelText('Provider base URL');
    await user.type(url, 'qa@example.com');
    await user.type(screen.getByLabelText('Provider API key'), 'test-key');
    expect(screen.getByRole('button', { name: /test api key/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save settings/i })).toBeDisabled();
    expect(url).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
});
