import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import {
    isUserPaidPremium,
    createConsentCsrfToken,
    isAllowedMcpRedirectUri,
    isSameProviderOrLoopback,
} from '@/lib/mcp/oauth';
import { Shield, ShieldAlert, Sparkles, Check, ArrowRight } from 'lucide-react';
import { AuthorizeClientActions } from './AuthorizeClientActions';

interface AuthorizePageProps {
    searchParams: Promise<{
        client_id?: string;
        redirect_uri?: string;
        response_type?: string;
        code_challenge?: string;
        code_challenge_method?: string;
        state?: string;
        scope?: string;
    }>;
}

export default async function McpAuthorizePage({ searchParams }: AuthorizePageProps) {
    const params = await searchParams;
    const {
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method = 'S256',
        state = '',
        scope = 'mcp:full',
    } = params;

    const session = await auth();

    if (!session?.user?.id) {
        const fullPath = `/mcp/authorize?client_id=${encodeURIComponent(client_id || '')}&redirect_uri=${encodeURIComponent(redirect_uri || '')}&code_challenge=${encodeURIComponent(code_challenge || '')}&code_challenge_method=${encodeURIComponent(code_challenge_method)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scope)}`;
        redirect(`/login?callbackUrl=${encodeURIComponent(fullPath)}`);
    }

    if (!client_id || !redirect_uri || !code_challenge) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <ShieldAlert className="w-8 h-8" />
                        <h1 className="text-xl font-bold">Invalid OAuth Request</h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        The authorization request is missing required parameters (client_id, redirect_uri, or code_challenge).
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Return to RunFlow
                    </Link>
                </div>
            </div>
        );
    }

    if (!isAllowedMcpRedirectUri(redirect_uri)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-900">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <ShieldAlert className="w-8 h-8" />
                        <h1 className="text-xl font-bold">Invalid Redirect URI</h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        The requested redirect URI is not permitted. Only authorized external AI hosts (Claude, Google, OpenAI) or local loopback are allowed.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Return to RunFlow
                    </Link>
                </div>
            </div>
        );
    }

    let client = await prisma.mcpOAuthClient.findUnique({
        where: { clientId: client_id },
    });

    if (!client) {
        if (isAllowedMcpRedirectUri(redirect_uri)) {
            client = await prisma.mcpOAuthClient.create({
                data: {
                    clientId: client_id,
                    clientName: 'External AI Assistant (MCP)',
                    redirectUris: [redirect_uri],
                },
            });
        } else {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <ShieldAlert className="w-8 h-8" />
                            <h1 className="text-xl font-bold">Unknown Client</h1>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Client ID was not found or has been revoked.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Return to RunFlow
                        </Link>
                    </div>
                </div>
            );
        }
    }

    const registeredUris = (client.redirectUris as string[]) || [];
    if (!registeredUris.includes(redirect_uri)) {
        if (isAllowedMcpRedirectUri(redirect_uri) && registeredUris.some((regUri) => isSameProviderOrLoopback(redirect_uri, regUri))) {
            const updatedUris = [...registeredUris, redirect_uri];
            await prisma.mcpOAuthClient.update({
                where: { clientId: client_id },
                data: { redirectUris: updatedUris },
            });
            client.redirectUris = updatedUris;
        } else {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-900">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <ShieldAlert className="w-8 h-8" />
                            <h1 className="text-xl font-bold">Unregistered Redirect URI</h1>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            The requested redirect URI does not match any URI registered for this client.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Return to RunFlow
                        </Link>
                    </div>
                </div>
            );
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            aiSettings: {
                select: {
                    usageTier: true,
                },
            },
        },
    });

    if (!user) {
        redirect('/login');
    }

    const isPaid = isUserPaidPremium(user);

    // Free tier user: Display Upgrade Required card
    if (!isPaid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-amber-300 dark:border-amber-800">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="inline-block px-2.5 py-1 text-xs font-bold tracking-wider uppercase text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 rounded-full mb-3">
                        RunFlow Pro Required
                    </span>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
                        Personal MCP Access Requires Pro
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                        Connecting RunFlow directly to external AI assistants like <strong>Claude</strong>, <strong>Gemini</strong>, or <strong>ChatGPT</strong> via
                        Model Context Protocol (MCP) requires an active <strong>Paid Premium (Tier 2/3)</strong> subscription.
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-800">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            What you unlock with Pro MCP:
                        </h2>
                        <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                Direct domain login in Claude Desktop, Gemini Custom MCP, and Cursor
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                Comprehensive athlete profile, VDOT, FTP, and HR zones inspection
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                Full plan generation, workout creation, and dynamic schedule adaptation
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                Multi-rule safety advisory engine and auto-rollback protection
                            </li>
                        </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Link
                            href="/settings"
                            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-md transition-all"
                        >
                            Upgrade to Pro
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href={redirect_uri ? `${redirect_uri}${redirect_uri.includes('?') ? '&' : '?'}error=access_denied&state=${encodeURIComponent(state)}` : '/'}
                            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-center transition-all"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Cryptographic CSRF token bound to session user and OAuth client parameters
    const consentCsrfToken = createConsentCsrfToken({
        userId: user.id,
        clientId: client.clientId,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge,
        state,
    });

    // Deny URL
    const denyUrl = `${redirect_uri}${redirect_uri.includes('?') ? '&' : '?'}error=access_denied&error_description=The+user+denied+the+authorization+request${state ? `&state=${encodeURIComponent(state)}` : ''}`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            RunFlow MCP Consent
                        </span>
                        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                            Authorize Connection
                        </h1>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 mb-6">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
                        <strong>{client.clientName}</strong> is requesting permission to access your RunFlow personal training data on behalf of{' '}
                        <strong>{user.email || user.name || 'your account'}</strong>.
                    </p>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Read your training profile, VDOT, FTP, heart rate zones, and readiness logs</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Read and build training plans, adapt workouts, and record coaching summaries</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>All plan mutations include automatic snapshots and safety advisory verification</span>
                        </div>
                    </div>
                </div>

                <AuthorizeClientActions
                    clientId={client.clientId}
                    clientName={client.clientName}
                    redirectUri={redirect_uri}
                    codeChallenge={code_challenge}
                    codeChallengeMethod={code_challenge_method}
                    state={state}
                    scope={scope}
                    consentCsrfToken={consentCsrfToken}
                    denyUrl={denyUrl}
                />

                <p className="mt-5 text-center text-xs text-gray-400">
                    You can revoke access to external MCP clients at any time in your RunFlow settings.
                </p>
            </div>
        </div>
    );
}
