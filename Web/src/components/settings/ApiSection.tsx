'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Key, Copy, Check, ExternalLink, Trash2 } from 'lucide-react';

export function ApiSection({ onBack }: { onBack: () => void }) {
    const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    const [message, setMessage] = useState('');

    const { data: apiKeyData, refetch: refetchApiKey } = useQuery({
        queryKey: ['api-key'],
        queryFn: async () => {
            const res = await fetch('/api/settings/api-key');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        refetchOnWindowFocus: false,
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My API Key' }),
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data) => { setGeneratedApiKey(data.apiKey); refetchApiKey(); },
        onError: () => setMessage('Failed to generate API key.'),
    });

    const revokeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: () => { setGeneratedApiKey(null); setShowRevokeConfirm(false); refetchApiKey(); setMessage('API key revoked.'); },
        onError: () => setMessage('Failed to revoke.'),
    });

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-2">
                <button aria-label="Back to settings" onClick={onBack} className="text-foreground-muted hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-lg font-bold text-foreground">API Access</h3>
            </div>

            <p className="text-xs text-foreground-muted">Enable read-only API access for external AI assistants.</p>

            <div className="flex justify-end">
                <Link href="/api-docs" target="_blank" className="text-xs text-accent-blue hover:opacity-80 flex items-center gap-1">
                    API Docs <ExternalLink className="w-3 h-3" />
                </Link>
            </div>

            {generatedApiKey ? (
                <div className="bg-positive/10 border border-positive/20 rounded-md p-4">
                    <p className="text-positive text-xs mb-2 font-medium flex items-center gap-1">
                        <Key className="w-3 h-3" /> Your API Key (copy now):
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background-tertiary px-3 py-2 rounded-md text-xs text-positive font-mono break-all">{generatedApiKey}</code>
                        <button aria-label="Copy API key" onClick={() => { navigator.clipboard.writeText(generatedApiKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 bg-positive/15 rounded-md hover:bg-positive/25">
                            {copied ? <Check className="w-4 h-4 text-positive" /> : <Copy className="w-4 h-4 text-positive" />}
                        </button>
                    </div>
                </div>
            ) : apiKeyData?.hasKey ? (
                <div className="bg-surface border border-line rounded-md p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-foreground text-sm">Active API Key</p>
                            <code className="text-xs text-foreground-muted font-mono">{apiKeyData.keyPrefix}</code>
                        </div>
                        {apiKeyData.lastUsedAt && <p className="text-[10px] text-foreground-muted">Last: {new Date(apiKeyData.lastUsedAt).toLocaleDateString()}</p>}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                {!apiKeyData?.hasKey ? (
                    <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="w-full py-3 border border-accent-blue/30 text-accent-blue rounded-md hover:bg-accent-blue/10 text-sm flex items-center justify-center gap-2">
                        <Key className="w-4 h-4" />
                        {generateMutation.isPending ? 'Generating...' : 'Generate API Key'}
                    </button>
                ) : !showRevokeConfirm ? (
                    <button onClick={() => setShowRevokeConfirm(true)} className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 text-sm flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" /> Revoke API Key
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => setShowRevokeConfirm(false)} className="flex-1 py-2 bg-background-tertiary text-foreground text-xs rounded-md hover:bg-surface-hover">Cancel</button>
                        <button onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} className="flex-1 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                            {revokeMutation.isPending ? 'Revoking...' : 'Confirm'}
                        </button>
                    </div>
                )}
            </div>

            {message && <p className={`text-sm ${message.includes('Failed') ? 'text-negative' : 'text-positive'}`}>{message}</p>}
        </div>
    );
}
