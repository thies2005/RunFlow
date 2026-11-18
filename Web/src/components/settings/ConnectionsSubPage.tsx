'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    Sliders, Link2, RefreshCw, Copy, Check, AlertCircle,
} from 'lucide-react';

export function ConnectionsSubPage({ onBack: _onBack }: { onBack: () => void }) {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState('');
    const [showReauthPrompt, setShowReauthPrompt] = useState(false);
    const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
    const [showMcpDocs, setShowMcpDocs] = useState(false);

    const mcpEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/mcp` : 'https://runflow.schuelken.uk/mcp';

    const { data: mcpTokensData, refetch: refetchMcpTokens, isLoading: isLoadingMcpTokens } = useQuery({
        queryKey: ['mcp-tokens'],
        queryFn: async () => {
            const res = await fetch('/api/settings/mcp-tokens');
            if (!res.ok) throw new Error('Failed to load MCP tokens');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const revokeMcpTokenMutation = useMutation({
        mutationFn: async (tokenId?: string) => {
            const url = tokenId ? `/api/settings/mcp-tokens?tokenId=${encodeURIComponent(tokenId)}` : '/api/settings/mcp-tokens';
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to revoke MCP client');
            return res.json();
        },
        onSuccess: (_data, tokenId) => {
            setMessage(tokenId ? 'Disconnected MCP client.' : 'Revoked all connected MCP clients.');
            refetchMcpTokens();
        },
        onError: () => setMessage('Error revoking MCP client token.'),
    });

    const resyncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/sync', {
                method: 'POST',
                body: JSON.stringify({ range: 'ALL' }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to resync');
            }
            return res.json();
        },
        onSuccess: () => {
            setMessage('Full resync started! May take a few minutes.');
            setShowReauthPrompt(false);
            queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        },
        onError: (err) => {
            const isAuthError = err.message.toLowerCase().includes('authenticate') ||
                err.message.toLowerCase().includes('token') ||
                err.message.includes('400') || err.message.includes('401');
            if (isAuthError) {
                setMessage('Connection lost. Reconnect Strava.');
                setShowReauthPrompt(true);
            } else {
                setMessage(`Resync failed: ${err.message}`);
                setShowReauthPrompt(false);
            }
        },
    });

    const activeMcpTokens: Array<{
        id: string;
        clientId: string;
        clientName?: string;
        scope: string;
        createdAt: string;
        lastUsedAt?: string | null;
        expiresAt: string;
    }> = mcpTokensData?.tokens || [];

    return (
        <div className="p-5 space-y-5">
            <h3 className="text-lg font-bold text-foreground">Connections</h3>

            <div className="space-y-3">
                <h4 className="text-xs text-accent-orange font-semibold">Strava</h4>
                <button
                    onClick={() => resyncMutation.mutate()}
                    disabled={resyncMutation.isPending}
                    className="w-full py-3 border border-line text-foreground rounded-md hover:bg-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
                    {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
                </button>
                <button
                    onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                    className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Link2 className="w-4 h-4" />
                    Reconnect Strava
                </button>
                <p className="text-[10px] text-foreground-muted">Re-authenticate if sync is failing</p>
            </div>

            {/* MCP Server Documentation & Connected AI Clients Organization */}
            <div className="space-y-3 pt-3 border-t border-line">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs text-positive font-semibold flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                        MCP Server & AI Clients
                    </h4>
                    <button
                        type="button"
                        onClick={() => setShowMcpDocs(!showMcpDocs)}
                        className="text-[11px] text-positive hover:underline font-medium"
                    >
                        {showMcpDocs ? 'Hide Setup Guide' : 'MCP Setup Guide'}
                    </button>
                </div>

                <div className="p-3 bg-surface border border-line rounded-md space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
                        Remote MCP Endpoint URL
                    </label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background-secondary border border-line rounded px-2.5 py-1.5 text-xs font-mono text-foreground truncate">
                            {mcpEndpointUrl}
                        </code>
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(mcpEndpointUrl);
                                setCopiedMcpUrl(true);
                                setTimeout(() => setCopiedMcpUrl(false), 2000);
                            }}
                            className="px-2.5 py-1.5 bg-positive/15 text-positive hover:bg-positive/25 rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                            {copiedMcpUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedMcpUrl ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <p className="text-[10px] text-foreground-muted leading-relaxed">
                        Connect Claude, Cursor, Windsurf, ChatGPT, or Gemini to inspect your training readiness, activities, and manage workouts.
                    </p>
                </div>

                {showMcpDocs && (
                    <div className="p-3.5 bg-background-tertiary border border-line rounded-md space-y-3 text-xs">
                        <div>
                            <p className="font-semibold text-foreground mb-1">1. OAuth 2.1 Interactive Login (Full Read + Write)</p>
                            <p className="text-[11px] text-foreground-muted leading-relaxed">
                                In Claude Desktop/Web, Cursor, or ChatGPT Connectors, add a Remote MCP Server with URL <code className="text-positive font-mono">{mcpEndpointUrl}</code>. RunFlow supports OAuth 2.1 Dynamic Client Registration + PKCE—your browser will open a consent screen to authorize full plan and workout tools (<code className="font-mono">create_planned_workout</code>, <code className="font-mono">update_planned_workout</code>, <code className="font-mono">complete_workout</code>, <code className="font-mono">swap_workout_days</code>, <code className="font-mono">log_daily_nutrition</code>).
                            </p>
                        </div>
                        <div className="border-t border-line pt-2.5">
                            <p className="font-semibold text-foreground mb-1">2. Headless API Key (Read-Only)</p>
                            <p className="text-[11px] text-foreground-muted leading-relaxed mb-1.5">
                                For scripts or CLI MCP hosts, generate a personal <code className="font-mono">rf_...</code> key in <strong>App Settings → API Access</strong> and pass it as a Bearer token:
                            </p>
                            <pre className="p-2 bg-background border border-line rounded text-[10px] font-mono text-foreground-secondary overflow-x-auto">
{`{
  "mcpServers": {
    "runflow": {
      "url": "${mcpEndpointUrl}",
      "headers": {
        "Authorization": "Bearer rf_YOUR_API_KEY"
      }
    }
  }
}`}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Connected MCP OAuth Clients Organization */}
                <div className="p-3 bg-surface border border-line rounded-md space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                            Connected MCP Clients ({activeMcpTokens.length})
                        </span>
                        {activeMcpTokens.length > 1 && (
                            <button
                                type="button"
                                onClick={() => revokeMcpTokenMutation.mutate(undefined)}
                                disabled={revokeMcpTokenMutation.isPending}
                                className="text-[11px] text-negative hover:underline font-medium"
                            >
                                Revoke All
                            </button>
                        )}
                    </div>

                    {isLoadingMcpTokens ? (
                        <p className="text-[11px] text-foreground-muted">Loading connected clients...</p>
                    ) : activeMcpTokens.length === 0 ? (
                        <p className="text-[11px] text-foreground-muted">
                            No active OAuth MCP clients connected. Connect an AI client to <code className="font-mono">{mcpEndpointUrl}</code> to see it here.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {activeMcpTokens.map((tok) => (
                                <div
                                    key={tok.id}
                                    className="flex items-center justify-between gap-2 p-2 rounded bg-background-secondary border border-line"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-foreground truncate">
                                                {tok.clientName || tok.clientId}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-positive/15 text-positive text-[9px] font-mono">
                                                {tok.scope}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-foreground-muted">
                                            Connected {new Date(tok.createdAt).toLocaleDateString()}
                                            {tok.lastUsedAt ? ` • Last used ${new Date(tok.lastUsedAt).toLocaleDateString()}` : ''}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => revokeMcpTokenMutation.mutate(tok.id)}
                                        disabled={revokeMcpTokenMutation.isPending}
                                        className="px-2 py-1 rounded border border-negative/30 text-negative hover:bg-negative/10 text-[11px] font-medium shrink-0 transition-colors"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${message.includes('Error') || message.includes('failed') || message.includes('lost') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {message}
                    </div>
                    {showReauthPrompt && (
                        <button
                            onClick={() => signIn('strava', { callbackUrl: window.location.href })}
                            className="mt-1 w-full py-2 bg-negative/15 hover:bg-negative/25 text-negative rounded-md text-xs flex items-center justify-center gap-2 transition-colors font-semibold"
                        >
                            <Link2 className="w-3 h-3" />
                            Reconnect Now
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
