'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, Loader2, AlertCircle, Settings2, Book, Plus, Camera, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
import PromptLibrary from './PromptLibrary';
import ProactiveRunWidget from './chat/ProactiveRunWidget';
import ProactiveCalorieSnapWidget from './chat/ProactiveCalorieSnapWidget';
import MacroLoggedWidget from './chat/MacroLoggedWidget';
import TimelineNode from './chat/TimelineNode';
import { FoodScannerModal } from './views/FoodScannerModal';

interface AiChatProps {
    activityId?: string;
    sessionId?: string;
    compact?: boolean;
    onOpenSettings?: () => void;
    isPromptLibraryOpen?: boolean;
    onClosePromptLibrary?: () => void;
    onOpenPromptLibrary?: () => void;
    hideInputActions?: boolean;
    onOpenHistory?: () => void;
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
const parseMealLoggedData = (content: string): { mealName: string; calories: number; protein: number; carbs: number; fats: number } | null => {
    try {
        // Primary: explicit HTML-comment widget trigger
        const match = content.match(/<!-- MEAL_LOGGED_WIDGET (.*?) -->/);
        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            if (data.mealName && typeof data.calories === 'number') {
                return { mealName: data.mealName, calories: data.calories, protein: data.protein ?? 0, carbs: data.carbs ?? 0, fats: data.fats ?? 0 };
            }
        }

        // Fallback: JSON code fence that explicitly contains a "MEAL_LOGGED" key
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            const data = JSON.parse(jsonMatch[1]);
            if (data.MEAL_LOGGED && data.mealName && typeof data.calories === 'number') {
                return { mealName: data.mealName, calories: data.calories, protein: data.protein ?? 0, carbs: data.carbs ?? 0, fats: data.fats ?? 0 };
            }
        }
    } catch (e) {
        // Stream might be incomplete, return null and wait for more data
        return null;
    }
    return null;
};

import ErrorBoundary from '@/components/ErrorBoundary';

function AiChatInner({ activityId, sessionId, compact = false, onOpenSettings, isPromptLibraryOpen, onClosePromptLibrary, onOpenPromptLibrary, hideInputActions = false, onOpenHistory }: AiChatProps) {
    useEffect(() => {
        console.log('[AI CHAT] Component mounted');
        return () => {
            console.log('[AI CHAT] Component unmounting');
        };
    }, []);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPromptLibraryOpenLocal, setIsPromptLibraryOpenLocal] = useState(false);
    const [showFoodScanner, setShowFoodScanner] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);

    const isLibraryOpen = isPromptLibraryOpen !== undefined ? isPromptLibraryOpen : isPromptLibraryOpenLocal;
    const closeLibrary = onClosePromptLibrary || (() => setIsPromptLibraryOpenLocal(false));
    const openLibrary = onOpenPromptLibrary || (() => setIsPromptLibraryOpenLocal(true));

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

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
    const { data: settingsData, isLoading: settingsLoading } = useQuery({
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
    const aiEnabled = settingsData?.settings?.aiEnabled || settingsData?.settings?.hasCustomApiKey;

    // Permission checks
    const accessActivityLogs = settingsData?.settings?.accessActivityLogs;
    const accessNutritionLogs = settingsData?.settings?.accessNutritionLogs;

    // --- PROACTIVE WIDGET DATA FETCHING ---
    const [recentActivity, setRecentActivity] = useState<any>(null);
    const [nutritionTargetData, setNutritionTargetData] = useState<any>(null);

    useEffect(() => {
        if (!accessActivityLogs) return;
        async function fetchRecentActivity() {
            try {
                const res = await fetch('/api/activities?limit=5');
                if (!res.ok) return;
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
                        setRecentActivity(mostRecent);
                    }
                }
            } catch (err) { }
        }
        fetchRecentActivity();
    }, [accessActivityLogs]);

    useEffect(() => {
        if (!accessNutritionLogs) return;
        async function fetchNutritionData() {
            try {
                const targetRes = await fetch('/api/health/nutrition/target');
                if (targetRes.ok) {
                    const target = await targetRes.json();
                    const historyRes = await fetch('/api/health/nutrition/log/history');
                    let consumed = 0;
                    if (historyRes.ok) {
                        const historyData = await historyRes.json();
                        const todayStr = new Date().toISOString().split('T')[0];
                        const todayLogs = historyData.filter((log: any) => log.date === todayStr);
                        consumed = todayLogs.reduce((acc: number, log: any) => acc + (log.calories || 0), 0);
                    }
                    if (target) {
                        setNutritionTargetData({
                            ...target,
                            remainingCalories: Math.max(0, target.dailyCalories - consumed),
                        });
                    }
                }
            } catch (err) { }
        }
        fetchNutritionData();
    }, [accessNutritionLogs]);
    // --------------------------------------

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    const handleSend = async (e?: React.FormEvent | React.MouseEvent | null, overrideText?: string) => {
        if (e) e.preventDefault();

        const userMessage = (overrideText || input).trim();
        if (!userMessage || isStreaming) return;

        setInput('');
        setError(null);
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsStreaming(true);

        abortControllerRef.current = new AbortController();

        // Log if abort is triggered
        abortControllerRef.current.signal.addEventListener('abort', () => {
            console.error('[AI CHAT] Fetch aborted!', new Error().stack);
        });

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    activityId,
                    sessionId,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
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
                            // Update URL without full reload (using standard parameter name)
                            router.replace(`/chat?sessionId=${json.sessionId}`, { scroll: false });
                            // Invalidate sessions list
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
                            throw new Error(json.error);
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
            if ((err as Error).name === 'AbortError') return;
            setError((err as Error).message);
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

    const handleNewChat = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setMessages([]);
        setInput('');
        setError(null);
        router.push('/chat');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (adminAllowed === false) return null;

    if (compact) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-white">Chat about this activity</h3>
                </div>

                {!aiEnabled ? (
                    <div className="text-sm text-gray-400">
                        <button onClick={onOpenSettings} className="text-purple-400 hover:text-purple-300">
                            Enable AI features
                        </button>{' '}to chat about this activity.
                    </div>
                ) : (
                    <>
                        {messages.length > 0 && (
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-gray-300' : 'text-white'}`}>
                                        <span className="font-medium">{msg.role === 'user' ? 'You: ' : 'Coach: '}</span>
                                        <div className="inline-block align-top markdown-content">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{DOMPurify.sanitize(cleanContent(msg.content))}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about this activity..."
                                disabled={isStreaming}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                            />
                            <button onClick={handleSend} disabled={!input.trim() || isStreaming} className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50">
                                {isStreaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Full chat view
    if (settingsLoading || (historyLoading && aiEnabled && messages.length === 0)) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    if (!aiEnabled) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">AI Coach</h2>
                <p className="text-gray-400 mb-6 max-w-sm">Get personalized training advice, analyze your workouts, and ask questions about your fitness data.</p>
                <button onClick={onOpenSettings} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 transition-colors">
                    <Settings2 className="w-5 h-5" />
                    Enable AI Features
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
            <div className={`flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4 min-h-0 ${messages.length === 0 ? 'flex flex-col justify-center' : ''}`} style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
                <div className="max-w-5xl mx-auto w-full">
                    {messages.length === 0 ? (
                        <div className="flex flex-col p-4 sm:p-8">
                            <div className="mb-8 text-left">
                                <p className="text-gray-400 text-lg mb-1">{(() => {
                                    const h = new Date().getHours();
                                    if (h < 12) return 'Good Morning';
                                    if (h < 18) return 'Good Afternoon';
                                    return 'Good Evening';
                                })()},</p>
                                <h2 className="text-3xl font-extrabold text-white leading-tight">How can I assist?</h2>
                            </div>

                            {/* Contextual Suggestions Timeline */}
                            {(accessActivityLogs || accessNutritionLogs) && (recentActivity || nutritionTargetData) && (
                                <div className="mb-8 max-w-2xl">
                                    {accessActivityLogs && recentActivity && (
                                        <TimelineNode dotColor="timeline-dot-blue" lineColor="var(--glass-border)">
                                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">You Just Finished</p>
                                            <ProactiveRunWidget activity={recentActivity} onAutoFillChat={(text) => handleSend(null, text)} />
                                        </TimelineNode>
                                    )}

                                    {accessNutritionLogs && nutritionTargetData && (
                                        <TimelineNode dotColor="timeline-dot-gray" lineColor="var(--glass-border)">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Post-Run Fuel</p>
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
                                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-white border border-gray-700'}`}>
                                            <div className="text-sm sm:text-base leading-relaxed markdown-content">
                                                {isThinking ? (
                                                    <div className="flex items-center gap-2 text-gray-400 italic">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>Thinking...</span>
                                                    </div>
                                                ) : (() => {
                                                    const mealData = parseMealLoggedData(cleanedContent);
                                                    if (mealData && msg.role === 'assistant') {
                                                        return <MacroLoggedWidget {...mealData} />;
                                                    }
                                                    return (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeSanitize]}
                                                            components={{
                                                                h1: ({ node: _node, ...props }) => <h1 className="text-lg font-bold mb-2 border-b border-gray-700 pb-1" {...props} />,
                                                                h2: ({ node: _node, ...props }) => <h2 className="text-md font-bold mb-2" {...props} />,
                                                                h3: ({ node: _node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                                                p: ({ node: _node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                                                ul: ({ node: _node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                                                ol: ({ node: _node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                                                li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
                                                                code: ({ node: _node, inline, className, children, ...props }: any) => {
                                                                    const _match = /language-(\w+)/.exec(className || '');
                                                                    return !inline ? (
                                                                        <pre className="bg-black/40 p-3 rounded-lg my-3 overflow-x-auto border border-white/5">
                                                                            <code className={className} {...props}>
                                                                                {children}
                                                                            </code>
                                                                        </pre>
                                                                    ) : (
                                                                        <code className="bg-black/30 rounded px-1.5 py-0.5 font-mono text-xs" {...props}>
                                                                            {children}
                                                                        </code>
                                                                    );
                                                                },
                                                                table: ({ node: _node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg" {...props} /></div>,
                                                                thead: ({ node: _node, ...props }) => <thead className="bg-gray-800/50" {...props} />,
                                                                th: ({ node: _node, ...props }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider" {...props} />,
                                                                td: ({ node: _node, ...props }) => <td className="px-3 py-2 text-sm text-gray-400 border-t border-gray-700" {...props} />,
                                                                blockquote: ({ node: _node, ...props }) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-3 bg-purple-500/5 italic" {...props} />,
                                                                a: ({ node: _node, ...props }) => <a className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                            }}
                                                        >
                                                            {DOMPurify.sanitize(cleanedContent)}
                                                        </ReactMarkdown>
                                                    );
                                                })()}
                                            </div>
                                            {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            )}
                                            {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && cleanedContent && (
                                                <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-auto mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm max-w-5xl w-full">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="z-20 pb-2 sm:pb-6 px-4 sm:px-0 mt-auto">
                <div className="glass-card rounded-full p-1.5 flex items-center shadow-2xl max-w-5xl mx-auto backdrop-blur-md border border-white/10 shadow-purple-900/10">
                    {!hideInputActions && (
                        <div className="relative">
                            <button
                                onClick={() => setShowPlusMenu(!showPlusMenu)}
                                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            {showPlusMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowPlusMenu(false)} />
                                    <div className="absolute bottom-14 left-0 w-48 bg-gray-900 border border-gray-700/50 shadow-xl rounded-xl p-2 z-20 flex flex-col gap-1">
                                        <button
                                            onClick={() => { setShowFoodScanner(true); setShowPlusMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm text-gray-300 transition-colors text-left"
                                        >
                                            <Camera className="w-4 h-4 text-purple-400" />
                                            Calorie Snap
                                        </button>
                                        <button
                                            onClick={() => { openLibrary(); setShowPlusMenu(false); }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm text-gray-300 transition-colors text-left"
                                        >
                                            <Book className="w-4 h-4 text-purple-400" />
                                            Prompt Library
                                        </button>
                                        {onOpenHistory && (
                                            <button
                                                onClick={() => { onOpenHistory(); setShowPlusMenu(false); }}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm text-gray-300 transition-colors text-left"
                                            >
                                                <Menu className="w-4 h-4 text-purple-400" />
                                                Chat History
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message AI..."
                        className="flex-1 min-w-0 bg-transparent px-4 py-2 text-white placeholder-gray-400 focus:outline-none"
                    />

                    {(input.trim() || isStreaming) && (
                        <button
                            onClick={(e) => handleSend(e)}
                            disabled={!input.trim() || isStreaming}
                            className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0 disabled:cursor-not-allowed hover:bg-purple-500"
                        >
                            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
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
                        const msg = `I just ate ${result.mealName}. It has ${result.totalCalories} kcal (${result.totalProtein}g protein, ${result.totalCarbs}g carbs, ${result.totalFats}g fat).`;
                        handleSend(null, msg);
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
