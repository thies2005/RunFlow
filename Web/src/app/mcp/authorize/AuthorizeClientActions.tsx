'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface AuthorizeClientActionsProps {
    clientId: string;
    clientName: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state: string;
    scope: string;
    consentCsrfToken: string;
    denyUrl: string;
}

export function AuthorizeClientActions({
    clientId,
    clientName,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state,
    scope,
    consentCsrfToken,
    denyUrl,
}: AuthorizeClientActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/mcp/oauth/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    code_challenge: codeChallenge,
                    code_challenge_method: codeChallengeMethod,
                    state,
                    scope,
                    consentCsrfToken,
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error_description || data.error || 'Authorization failed. Please try again.');
                setLoading(false);
                return;
            }

            if (data.redirect_uri) {
                // Keep the launch URL around so users of custom app schemes
                // (cursor://, claude://, vscode://, ...) always get a clickable link
                setFallbackUrl(data.redirect_uri);
                window.location.href = data.redirect_uri;
            } else {
                setError('Invalid server response');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Network error during authorization');
            setLoading(false);
        }
    };

    const handleDeny = () => {
        window.location.assign(denyUrl);
    };

    return (
        <div className="space-y-3">
            {error && (
                <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
                    {error}
                </div>
            )}
            <button
                type="button"
                onClick={handleAuthorize}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authorizing...
                    </>
                ) : (
                    `Authorize ${clientName}`
                )}
            </button>
            <button
                type="button"
                onClick={handleDeny}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-center transition-all cursor-pointer"
            >
                <X className="w-4 h-4" />
                Deny / Cancel
            </button>
            {fallbackUrl && (
                <a
                    href={fallbackUrl}
                    className="block mt-3 text-xs text-accent-cyan underline text-center"
                >
                    Click here if your app did not open automatically
                </a>
            )}
        </div>
    );
}

export default AuthorizeClientActions;
