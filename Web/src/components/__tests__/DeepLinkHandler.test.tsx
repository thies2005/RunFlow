/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import DeepLinkHandler, { resolveDeepLink } from '../DeepLinkHandler';

const mockPush = jest.fn();
const mockAddListener = jest.fn().mockResolvedValue({ remove: jest.fn() });

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@capacitor/app', () => ({
    App: {
        addListener: (...args: unknown[]) => mockAddListener(...args),
    },
}));

// The exact URLs from the audit record (Web/src/components/DeepLinkHandler.tsx:
// runflow-scheme-hostname-bypass) plus the adjacent variants.
describe('resolveDeepLink (runflow: scheme hostname bypass)', () => {
    it('ignores the empty-authority protocol-relative payload', () => {
        expect(resolveDeepLink('runflow:////evil.com/phish?next=/dashboard')).toBe(null);
    });

    it('ignores a custom-scheme URI with an attacker authority', () => {
        expect(resolveDeepLink('runflow://evil.com/api/auth/session?attack=1')).toBe(null);
    });

    it('ignores a custom-scheme URI whose only content is a host', () => {
        expect(resolveDeepLink('runflow://dashboard')).toBe(null);
    });

    it('ignores custom-scheme /api/ paths (no forced window.location)', () => {
        expect(resolveDeepLink('runflow:/api/auth/callback/strava?code=x')).toBe(null);
    });

    it('ignores backslash forms', () => {
        expect(resolveDeepLink('runflow:/\\evil.com/x')).toBe(null);
    });

    it('ignores userinfo-like @ payloads', () => {
        expect(resolveDeepLink('runflow:/@evil/x')).toBe(null);
    });

    it('ignores percent-encoded scheme-relative paths', () => {
        expect(resolveDeepLink('runflow:/%2F%2Fevil.com/x')).toBe(null);
    });

    it('ignores unknown top-level segments', () => {
        expect(resolveDeepLink('runflow:/not-a-real-route')).toBe(null);
    });

    it('accepts a plain relative app path with query', () => {
        expect(resolveDeepLink('runflow:/activities?x=1')).toBe('/activities?x=1');
    });

    it('accepts the bare root', () => {
        expect(resolveDeepLink('runflow:/')).toBe('/');
    });

    it('accepts nested paths under allowlisted segments', () => {
        expect(resolveDeepLink('runflow:/plan-advanced/abc/workouts')).toBe(
            '/plan-advanced/abc/workouts',
        );
        expect(resolveDeepLink('runflow:/activity/123/analysis')).toBe(
            '/activity/123/analysis',
        );
    });

    it('matches schemes case-insensitively and accepts runflow2:', () => {
        expect(resolveDeepLink('RUNFLOW:/activities')).toBe('/activities');
        expect(resolveDeepLink('runflow2:/health')).toBe('/health');
    });

    it('keeps the https exact-hostname branch working', () => {
        expect(resolveDeepLink('https://runflow.schuelken.uk/plan?tab=1')).toBe(
            '/plan?tab=1',
        );
        // API paths remain reachable via the trusted hostname only
        expect(
            resolveDeepLink('https://runflow.schuelken.uk/api/auth/strava/callback?code=x'),
        ).toBe('/api/auth/strava/callback?code=x');
    });

    it('rejects suffix-host lookalikes on the https branch', () => {
        expect(resolveDeepLink('https://runflow.schuelken.uk.evil.com/dashboard')).toBe(null);
    });

    it('rejects protocol-relative paths on the https branch', () => {
        expect(resolveDeepLink('https://runflow.schuelken.uk//evil.com/x')).toBe(null);
    });

    it('ignores foreign hostnames and non-https schemes', () => {
        expect(resolveDeepLink('https://evil.com/dashboard')).toBe(null);
        expect(resolveDeepLink('ftp://runflow.schuelken.uk/x')).toBe(null);
        expect(resolveDeepLink('intent:#Intent;end')).toBe(null);
    });

    it('ignores unparseable URLs', () => {
        expect(resolveDeepLink('not a url')).toBe(null);
    });
});

describe('DeepLinkHandler component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getRegisteredHandler(): (event: { url: string }) => void {
        expect(mockAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
        return mockAddListener.mock.calls[0][1] as (event: { url: string }) => void;
    }

    it('registers the appUrlOpen listener', () => {
        render(<DeepLinkHandler />);
        expect(mockAddListener).toHaveBeenCalledTimes(1);
        expect(mockAddListener.mock.calls[0][0]).toBe('appUrlOpen');
    });

    it('navigates in-app for a safe custom-scheme link', () => {
        render(<DeepLinkHandler />);
        const handler = getRegisteredHandler();
        handler({ url: 'runflow:/health' });
        expect(mockPush).toHaveBeenCalledWith('/health');
    });

    it('navigates in-app for a trusted https deep link', () => {
        render(<DeepLinkHandler />);
        const handler = getRegisteredHandler();
        handler({ url: 'https://runflow.schuelken.uk/plan' });
        expect(mockPush).toHaveBeenCalledWith('/plan');
    });

    it('does not navigate for the protocol-relative bypass payload', () => {
        render(<DeepLinkHandler />);
        const handler = getRegisteredHandler();
        handler({ url: 'runflow:////evil.com/phish?next=/dashboard' });
        expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate for the same-origin /api/ bypass payload', () => {
        render(<DeepLinkHandler />);
        const handler = getRegisteredHandler();
        handler({ url: 'runflow://evil.com/api/auth/session?attack=1' });
        expect(mockPush).not.toHaveBeenCalled();
    });
});
