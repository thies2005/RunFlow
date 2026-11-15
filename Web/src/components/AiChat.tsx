'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Square, Loader2, AlertCircle, Settings2, Book, Plus, Camera, Menu, SquarePen, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
import PromptLibrary from './PromptLibrary';
import ProactiveRunWidget from './chat/ProactiveRunWidget';
import ProactiveCalorieSnapWidget from './chat/ProactiveCalorieSnapWidget';
import MacroLoggedWidget from './chat/MacroLoggedWidget';
import WaterLoggedWidget from './chat/WaterLoggedWidget';
import TimelineNode from './chat/TimelineNode';
import { FoodScannerModal, type ScanResult } from './views/FoodScannerModal';
import { FoodScanResultView } from './views/FoodScanResultView';

interface AiChatProps {
    activityId?: string;
    sessionId?: string;
    mode?: 'page' | 'drawer';
    initialPrompt?: string;
    autoSend?: boolean;
    contextType?: string;
    onOpenSettings?: () => void;
    isPromptLibraryOpen?: boolean;
    onClosePromptLibrary?: () => void;
    onOpenPromptLibrary?: () => void;
    hideInputActions?: boolean;
    onOpenHistory?: () => void;
    onNewChat?: () => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Helper to separate reasoning from response
const cleanContent = (content: string) => {
    // Remove complete think blocks
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Handle incomplete think block at the end (streaming)
    // If we have an open <think> that isn't closed, we should hide everything after it
    const openThinkIndex = cleaned.indexOf('<think>');
    if (openThinkIndex !== -1) {
        cleaned = cleaned.slice(0, openThinkIndex);
    }

    return cleaned;
};

// Helper to parse streamed meal log data safely
const parseMealLoggedData = (content: string): { mealName: string; calories: number; protein: number; carbs: number; fats: number; items?: Array<{ name: string; calories: number; estimatedGrams?: number }> } | null => {
    try {
        // Primary: match both "<!-- MEAL_LOGGED_WIDGET: {...} -->" (new format with colon)
        // and legacy "<!-- MEAL_LOGGED_WIDGET {...} -->" (old format with space)
        const match = content.match(/<!-- MEAL_LOGGED_WIDGET[:\s]\s*([\s\S]*?)\s*-->/);
        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            // Support both 'name' (new backend) and 'mealName' (legacy) fields
            const mealName = data.mealName || data.name;
            if (mealName && typeof data.calories === 'number') {
                return {
                    mealName,
                    calories: data.calories,
                    protein: data.protein ?? 0,
                    carbs: data.carbs ?? 0,
                    fats: data.fats ?? data.fat ?? 0,
                    items: data.items,
                };
            }
        }

        // Fallback: JSON code fence that explicitly contains a "MEAL_LOGGED" key
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            const data = JSON.parse(jsonMatch[1]);
            const mealName = data.mealName || data.name;
            if (data.MEAL_LOGGED && mealName && typeof data.calories === 'number') {
                return { mealName, calories: data.calories, protein: data.protein ?? 0, carbs: data.carbs ?? 0, fats: data.fats ?? data.fat ?? 0, items: data.items };
            }
        }
    } catch {
        // Stream might be incomplete, return null and wait for more data
        return null;
    }
    return null;
};

// Helper to parse water logged data
const parseWaterLoggedData = (content: string): { amount: number } | null => {
    try {
        const match = content.match(/<!-- WATER_LOGGED_WIDGET[:\s]\s*([\s\S]*?)\s*-->/);
        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            if (typeof data.amount === 'number') {
                return { amount: data.amount };
            }
        }
    } catch {
        return null;
    }
    return null;
};

// Strip widget comment tags from content for clean markdown rendering
const stripWidgetComments = (content: string): string => {
    return content
        .replace(/<!-- MEAL_LOGGED_WIDGET[:\s][\s\S]*?-->/g, '')
        .replace(/<!-- WATER_LOGGED_WIDGET[:\s][\s\S]*?-->/g, '')
        .trim();
};

const stripErrorPrefix = (message: string): string =>
    message.replace(/^(?:[A-Za-z]*Error:\s*)+/i, '').trim();

const parseRetryAfterSeconds = (rawRetryAfter: unknown, headerValue?: string | null): number | undefined => {
    const candidate = typeof rawRetryAfter === 'number'
        ? rawRetryAfter
        : typeof rawRetryAfter === 'string' && rawRetryAfter.trim()
            ? Number(rawRetryAfter)
            : headerValue && headerValue.trim()
                ? Number(headerValue)
                : NaN;
    if (Number.isFinite(candidate) && candidate > 0) {
        return Math.ceil(candidate);
    }
    return undefined;
};

const formatAiErrorMessage = (
    rawMessage: unknown,
    fallback: string,
    retryAfterSeconds?: number
): string => {
    const cleaned = typeof rawMessage === 'string' ? stripErrorPrefix(rawMessage) : '';
    const base = cleaned || fallback;
    if (retryAfterSeconds && retryAfterSeconds > 0 && !/\b\d+\s*s(?:ec(?:ond)?s?)?\b/i.test(base)) {
        const suffix = /[.!?]$/.test(base) ? ` Try again in ${retryAfterSeconds}s.` : ` (Try again in ${retryAfterSeconds}s)`;
        return `${base}${suffix}`;
    }
    return base;
};

import ErrorBoundary from '@/components/ErrorBoundary';

function AiChatInner({ activityId, sessionId, mode = 'page', initialPrompt, autoSend = false, onOpenSettings, isPromptLibraryOpen, onClosePromptLibrary, onOpenPromptLibrary, hideInputActions = false, onOpenHistory, onNewChat }: AiChatProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState(!autoSend && initialPrompt ? initialPrompt : '');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPromptLibraryOpenLocal, setIsPromptLibraryOpenLocal] = useState(false);
    const [showFoodScanner, setShowFoodScanner] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);

    const isLibraryOpen = isPromptLibraryOpen !== undefined ? isPromptLibraryOpen : isPromptLibraryOpenLocal;
    const closeLibrary = onClosePromptLibrary || (() => setIsPromptLibraryOpenLocal(false));
    const openLibrary = onOpenPromptLibrary || (() => setIsPromptLibraryOpenLocal(true));

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);
    const autoSentRef = useRef(false);

    const activeSessionIdRef = useRef<string | undefined>(sessionId);

    // Ref to track the currently active session internally
    // We only update this when we successfully load a chat or start a stream
    // This allows us to detect when the PROP sessionId changes away from what we are showing

    // Reset messages when sessionId changes, but NOT if it matches what we are currently streaming
    useEffect(() => {
        if (!isStreaming && sessionId !== activeSessionIdRef.current) {
            setMessages([]);
            setError(null);
        }
    }, [sessionId, isStreaming]);

    // Cleanup: Abort only on unmount (manual aborts are handled in send/newChat)
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Check if AI is enabled
    const { data: settingsData, isLoading: settingsLoading, isError: settingsError } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const res = await fetch('/api/ai/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
    });

    // Fetch Chat History
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['chat-history', activityId, sessionId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (activityId) params.append('activityId', activityId);
            if (sessionId) params.append('sessionId', sessionId);

            const res = await fetch(`/api/ai/chat/history?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: !!settingsData && (!!sessionId || !!activityId),
    });

    // Load history into messages when fetched
    useEffect(() => {
        if (historyData?.messages && !isStreaming) {
            // Only load history if:
            // 1. We have no messages currently
            // 2. OR the sessionId prop has changed to a DIFFERENT chat than our current active one
            const isDifferentSession = sessionId && activeSessionIdRef.current && sessionId !== activeSessionIdRef.current;
            const hasNoMessages = messages.length === 0;

            if (hasNoMessages || isDifferentSession) {
                setMessages(historyData.messages);
                // Sync our tracker to this new session we just loaded
                activeSessionIdRef.current = sessionId;
            }
        }
    }, [historyData, isStreaming, sessionId, messages.length]);

    const adminAllowed = settingsData?.settings?.adminAllowed;
    const aiEnabled = settingsData?.settings?.aiEnabled;

    // Permission checks
    const accessActivityLogs = settingsData?.settings?.accessActivityLogs;
    const accessNutritionLogs = settingsData?.settings?.accessNutritionLogs;

    // --- PROACTIVE WIDGET DATA FETCHING ---
    const { data: recentActivity } = useQuery({
        queryKey: ['proactiveActivity', accessActivityLogs],
        queryFn: async () => {
            if (!accessActivityLogs) return null;
            const res = await fetch('/api/activities?limit=5');
            if (!res.ok) return null;
            const data = await res.json();
            if (data.activities && data.activities.length > 0) {
                const mostRecent = data.activities[0];
                const activityDate = new Date(mostRecent.startDate);
                const today = new Date();
                if (
                    activityDate.getDate() === today.getDate() &&
                    activityDate.getMonth() === today.getMonth() &&
                    activityDate.getFullYear() === today.getFullYear()
                ) {
                    return mostRecent;
                }
            }
            return null;
        },
        enabled: accessActivityLogs,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    const { data: nutritionTargetData } = useQuery({
        queryKey: ['proactiveNutrition', accessNutritionLogs],
        queryFn: async () => {
            if (!accessNutritionLogs) return null;
            const targetRes = await fetch('/api/health/nutrition/target');
            if (!targetRes.ok) return null;
            const target = await targetRes.json();
            const historyRes = await fetch('/api/health/nutrition/log/history');
            let consumed = 0;
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                const todayStr = new Date().toISOString().split('T')[0];
                const todayLogs = Array.isArray(historyData?.[todayStr]) ? historyData[todayStr] : [];
                consumed = todayLogs.reduce((acc: number, log: { calories?: number }) => acc + (log.calories || 0), 0);
            }
            if (target) {
                return {
                    ...target,
                    remainingCalories: Math.max(0, target.dailyCalories - consumed),
                };
            }
            return null;
        },
        enabled: accessNutritionLogs,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
    // --------------------------------------

    const handleScroll = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    // Keep pinned to bottom via instant scrollTop only while near the bottom
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (el && isNearBottomRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, isStreaming]);

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    const handleSend = async (e?: React.FormEvent | React.MouseEvent | null, overrideText?: string) => {
        if (e) e.preventDefault();

        const userMessage = (overrideText || input).trim();
        if (!userMessage || isStreaming) return;

        isNearBottomRef.current = true;
        setInput('');
        setError(null);
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsStreaming(true);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    activityId,
                    sessionId: sessionId ?? activeSessionIdRef.current,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                let errorData: { error?: unknown; message?: unknown; retryAfterSeconds?: unknown; retryAfter?: unknown } | null = null;
                if (typeof response.text === 'function') {
                    const rawBody = await response.text().catch(() => '');
                    if (rawBody) {
                        try {
                            errorData = JSON.parse(rawBody);
                        } catch {
                            errorData = null;
                        }
                    }
                } else if (typeof response.json === 'function') {
                    errorData = await response.json().catch(() => null);
                }
                const retryAfter = parseRetryAfterSeconds(
                    errorData?.retryAfterSeconds ?? errorData?.retryAfter,
                    response.headers?.get?.('retry-after')
                );
                const message = formatAiErrorMessage(
                    errorData?.error ?? errorData?.message,
                    `Failed to send message (${response.status})`,
                    retryAfter
                );
                throw new Error(message);
            }

            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let receivedDone = false;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === 'data: [DONE]') {
                        receivedDone = true;
                        continue;
                    }
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    try {
                        const json = JSON.parse(trimmed.slice(6));

                        // Handle new session creation
                        if (json.sessionId && activeSessionIdRef.current !== json.sessionId) {
                            activeSessionIdRef.current = json.sessionId;
                            if (mode === 'page') {
                                router.replace(`/chat?sessionId=${json.sessionId}`, { scroll: false });
                            }
                            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
                        }

                        if (json.token) {
                            setMessages((prev) => {
                                const updated = [...prev];
                                const lastMsg = updated[updated.length - 1];
                                if (lastMsg?.role === 'assistant') {
                                    lastMsg.content += json.token;
                                }
                                return updated;
                            });
                        }
                        if (json.error) {
                            const retryAfter = parseRetryAfterSeconds(json.retryAfterSeconds ?? json.retryAfter);
                            throw new Error(
                                formatAiErrorMessage(json.error, 'AI response failed. Please try again.', retryAfter)
                            );
                        }
                    } catch (e) {
                        // Re-throw intentional errors (from json.error above)
                        // Only swallow JSON parse errors from malformed SSE lines
                        if (e instanceof SyntaxError) {
                            console.warn('[AI CHAT] Malformed SSE line:', trimmed);
                        } else {
                            throw e;
                        }
                    }
                }
            }

            if (!receivedDone) {
                console.warn('AI Chat: Stream ended without [DONE] signal');
                // We don't necessarily throw here as some proxies might strip the last line
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'assistant' && !last.content) {
                        return prev.slice(0, -1);
                    }
                    return prev;
                });
                return;
            }
            setError(formatAiErrorMessage((err as Error)?.message, 'Failed to send message'));
            setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && !last.content) {
                    return prev.slice(0, -1);
                }
                return prev;
            });
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSendRef = useRef(handleSend);
    handleSendRef.current = handleSend;

    useEffect(() => {
        const waitingForHistory = Boolean((sessionId || activityId) && historyLoading);
        if (
            autoSend &&
            initialPrompt &&
            !autoSentRef.current &&
            !settingsLoading &&
            !waitingForHistory &&
            aiEnabled &&
            adminAllowed !== false
        ) {
            autoSentRef.current = true;
            void handleSendRef.current(null, initialPrompt);
        }
    }, [autoSend, initialPrompt, settingsLoading, sessionId, activityId, historyLoading, aiEnabled, adminAllowed]);

    if (settingsError) {
        return <p role="alert" className="p-4 text-sm text-negative">Unable to load AI access settings. Please try again later.</p>;
    }

    // Full chat view (shared across page and drawer modes)
    if (settingsLoading || (historyLoading && aiEnabled && messages.length === 0)) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent-orange animate-spin" />
            </div>
        );
    }

    if (!aiEnabled || adminAllowed === false) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 bg-background-tertiary border border-line rounded-md flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-foreground-muted" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Coach</h2>
                <p className="text-foreground-muted mb-6 max-w-sm">{adminAllowed ? 'Set up AI coaching to review workouts, adjust training load, and log nutrition.' : 'AI access requires approval from your administrator. View access details to learn more.'}</p>
                <button onClick={onOpenSettings} className="px-6 py-3 bg-[var(--primary-button-bg)] hover:opacity-90 text-[var(--primary-button-fg)] rounded-md flex items-center gap-2 transition-opacity">
                    <Settings2 className="w-5 h-5" aria-hidden="true" />
                    {adminAllowed ? 'Set up AI features' : 'View AI access'}
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative min-h-0">
            <PromptLibrary
                isOpen={isLibraryOpen}
                onClose={closeLibrary}
                onSelectPrompt={(text) => setInput(text)}
            />

            {/* Chat Messages */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4 min-h-0 ${messages.length === 0 ? 'flex flex-col justify-center' : ''}`}
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
            >
                <div className="max-w-5xl mx-auto w-full">
                    {messages.length === 0 ? (
                        <div className="flex flex-col p-4 sm:p-8">
                            <div className="mb-6 text-left border-b border-line pb-5">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="inline-flex items-center rounded-[3px] border border-line bg-background-tertiary px-2 py-0.5 text-xs font-mono font-medium text-foreground">
                                        Coach
                                    </span>
                                    <span className="text-xs text-foreground-muted">Training &amp; nutrition context</span>
                                </div>
                                <p className="text-sm text-foreground-secondary max-w-xl">
                                    Ask about recent workouts, pacing, weekly volume, or log a meal.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {[
                                        'Analyze my most recent workout',
                                        'How is my training load this week?',
                                        'Log a post-run meal',
                                    ].map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            onClick={() => handleSend(null, prompt)}
                                            className="px-3 py-1.5 rounded-[3px] border border-line bg-background-secondary hover:bg-surface-hover hover:border-line-strong text-xs text-foreground transition-colors text-left"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Contextual Suggestions Timeline */}
                            {mode === 'page' && (accessActivityLogs || accessNutritionLogs) && (recentActivity || nutritionTargetData) && (
                                <div className="mb-8 max-w-2xl">
                                    {accessActivityLogs && recentActivity && (
                                        <TimelineNode dotColor="timeline-dot-blue" lineColor="var(--glass-border)">
                                            <p className="text-xs font-bold text-accent-blue mb-3">You Just Finished</p>
                                            <ProactiveRunWidget activity={recentActivity} onAutoFillChat={(text) => handleSend(null, text)} />
                                        </TimelineNode>
                                    )}

                                    {accessNutritionLogs && nutritionTargetData && (
                                        <TimelineNode dotColor="timeline-dot-gray" lineColor="var(--glass-border)">
                                            <p className="text-xs font-bold text-foreground-muted mb-3">Post-Run Fuel</p>
                                            <ProactiveCalorieSnapWidget targetData={nutritionTargetData} onOpenScanner={() => setShowFoodScanner(true)} />
                                        </TimelineNode>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => {
                                const cleanedContent = cleanContent(msg.content);
                                const isThinking = isStreaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content && !cleanedContent;
                                return (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-md px-5 py-3 ${msg.role === 'user' ? 'bg-accent-orange text-white' : 'bg-glass-bg text-foreground border border-line'}`}>
                                            <div className="text-sm sm:text-base leading-relaxed markdown-content">
                                                {isThinking ? (
                                                    <div className="flex items-center gap-2 text-foreground-muted italic">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>Thinking...</span>
                                                    </div>
                                                ) : (() => {
                                                    const mealData = parseMealLoggedData(cleanedContent);
                                                    const waterData = parseWaterLoggedData(cleanedContent);
                                                    const displayContent = stripWidgetComments(cleanedContent);
                                                    return (
                                                        <>
                                                            {displayContent && (
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    rehypePlugins={[rehypeSanitize]}
                                                                    components={{
                                                                        h1: ({ node: _node, ...props }) => <h1 className="text-lg font-bold mb-2 border-b border-line pb-1" {...props} />,
                                                                        h2: ({ node: _node, ...props }) => <h2 className="text-md font-bold mb-2" {...props} />,
                                                                        h3: ({ node: _node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                                                        p: ({ node: _node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                                                        ul: ({ node: _node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                                                        ol: ({ node: _node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                                                        li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
                                                                        code: ({ node: _node, inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { node?: unknown; inline?: boolean }) => {
                                                                            const _match = /language-(\w+)/.exec(className || '');
                                                                            return !inline ? (
                                                                                <pre className="bg-background-tertiary p-3 rounded-md my-3 overflow-x-auto border border-line font-mono">
                                                                                    <code className={className} {...props}>
                                                                                        {children}
                                                                                    </code>
                                                                                </pre>
                                                                            ) : (
                                                                                <code className="bg-background-tertiary rounded-sm px-1.5 py-0.5 font-mono text-xs" {...props}>
                                                                                    {children}
                                                                                </code>
                                                                            );
                                                                        },
                                                                        table: ({ node: _node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-line border border-line rounded-md" {...props} /></div>,
                                                                        thead: ({ node: _node, ...props }) => <thead className="bg-background-tertiary" {...props} />,
                                                                        th: ({ node: _node, ...props }) => <th className="px-3 py-2 text-left text-xs font-semibold text-foreground-muted" {...props} />,
                                                                        td: ({ node: _node, ...props }) => <td className="px-3 py-2 text-sm text-foreground-muted border-t border-line" {...props} />,
                                                                        blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-4 border-line-strong pl-4 py-1 my-3 bg-background-tertiary italic" {...props} />,
                                                                        a: ({ node: _node, ...props }) => <a className="text-accent-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                                    }}
                                                                >
                                                                    {DOMPurify.sanitize(displayContent)}
                                                                </ReactMarkdown>
                                                            )}
                                                            {mealData && <MacroLoggedWidget {...mealData} onEditMacros={() => router.push('/health')} />}
                                                            {waterData && <WaterLoggedWidget {...waterData} />}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                                                <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />
                                            )}
                                            {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && cleanedContent && (
                                                <span className="inline-block w-1 h-4 bg-accent-orange ml-1" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className={mode === 'drawer' ? 'px-3 mb-2' : 'px-4 sm:px-0 mb-2'}>
                    <div
                        role="alert"
                        className="mx-auto p-3 bg-negative/10 border border-negative/30 rounded-md flex items-start justify-between gap-2 text-negative text-sm max-w-5xl w-full"
                    >
                        <div className="flex items-start gap-2 min-w-0">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="break-words">{error}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            aria-label="Dismiss error"
                            className="p-0.5 rounded-sm hover:bg-negative/20 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}

            <div className={`z-20 mt-auto ${mode === 'drawer' ? 'pb-3 px-3' : 'pb-2 sm:pb-6 px-4 sm:px-0'}`}>
                <div className="bg-background-secondary rounded-md p-1.5 flex items-end gap-1.5 max-w-5xl mx-auto border border-line">
                    {!hideInputActions && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowPlusMenu(!showPlusMenu)}
                                aria-label="Chat actions" aria-expanded={showPlusMenu}
                                className="w-10 h-10 rounded-md bg-background-tertiary flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors flex-shrink-0"
                            >
                                <Plus className="w-5 h-5" aria-hidden="true" />
                            </button>
                            {showPlusMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowPlusMenu(false)} />
                                    <div className="absolute bottom-14 left-0 w-48 bg-background-secondary border border-line rounded-md p-2 z-20 flex flex-col gap-1 animate-fade-in">
                                        {onNewChat && (
                                            <button
                                                onClick={() => { onNewChat(); setShowPlusMenu(false); }}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-background-tertiary text-sm text-foreground-muted transition-colors text-left"
                                            >
                                                <SquarePen className="w-4 h-4 text-foreground-muted" />
                                                New Chat
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setShowFoodScanner(true); setShowPlusMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-background-tertiary text-sm text-foreground-muted transition-colors text-left"
                                        >
                                            <Camera className="w-4 h-4 text-foreground-muted" />
                                            Calorie Snap
                                        </button>
                                        <button
                                            onClick={() => { openLibrary(); setShowPlusMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-background-tertiary text-sm text-foreground-muted transition-colors text-left"
                                        >
                                            <Book className="w-4 h-4 text-foreground-muted" />
                                            Prompt Library
                                        </button>
                                        {onOpenHistory && (
                                            <button
                                                onClick={() => { onOpenHistory(); setShowPlusMenu(false); }}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-background-tertiary text-sm text-foreground-muted transition-colors text-left"
                                            >
                                                <Menu className="w-4 h-4 text-foreground-muted" />
                                                Chat History
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message Coach..."
                        aria-label="Message Coach"
                        rows={1}
                        className="flex-1 min-w-0 bg-transparent border-0 px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-foreground-muted focus:outline-hidden resize-none [field-sizing:content] [min-block-size:2.5lh] [max-block-size:9lh]"
                    />

                    {isStreaming ? (
                        <button
                            type="button"
                            aria-label="Stop response"
                            onClick={handleStop}
                            className="w-10 h-10 rounded-md bg-negative flex items-center justify-center text-white transition-opacity flex-shrink-0 hover:opacity-90"
                        >
                            <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            aria-label="Send message"
                            onClick={(e) => handleSend(e)}
                            disabled={!input.trim()}
                            className="w-10 h-10 rounded-md bg-[var(--primary-button-bg)] text-[var(--primary-button-fg)] flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0 disabled:cursor-not-allowed hover:opacity-90"
                        >
                            <Send className="w-5 h-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {showFoodScanner && (
                <FoodScannerModal
                    isOpen={showFoodScanner}
                    onClose={() => setShowFoodScanner(false)}
                    onScanComplete={(result) => {
                        setShowFoodScanner(false);
                        setScanResult(result);
                    }}
                />
            )}

            {scanResult && (
                <FoodScanResultView
                    isOpen={!!scanResult}
                    result={scanResult}
                    onClose={() => setScanResult(null)}
                    onLogSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['daily-health'] });
                        queryClient.invalidateQueries({ queryKey: ['proactiveNutrition'] });
                        const loggedSummary = `<!-- MEAL_LOGGED_WIDGET: ${JSON.stringify({
                            name: scanResult.mealName,
                            calories: scanResult.totalCalories,
                            protein: scanResult.totalProtein,
                            carbs: scanResult.totalCarbs,
                            fats: scanResult.totalFats,
                            items: scanResult.items,
                        })} -->`;
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: `Logged **${scanResult.mealName}** (${scanResult.totalCalories} kcal) to your nutrition log.\n\n${loggedSummary}`,
                            },
                        ]);
                    }}
                />
            )}
        </div>
    );
}

export default function AiChat(props: AiChatProps) {
    return (
        <ErrorBoundary componentName="AiChat" showRetry>
            <AiChatInner {...props} />
        </ErrorBoundary>
    );
}
