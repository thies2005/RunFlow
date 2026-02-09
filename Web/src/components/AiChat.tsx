'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Bot, Loader2, AlertCircle, Settings2 } from 'lucide-react';

interface AiChatProps {
    activityId?: string;
    compact?: boolean;
    onOpenSettings?: () => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function AiChat({ activityId, compact = false, onOpenSettings }: AiChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Check if AI is enabled
    const { data: settingsData, isLoading: settingsLoading } = useQuery({
        queryKey: ['ai-settings'],
        queryFn: async () => {
            const res = await fetch('/api/ai/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
    });

    const aiEnabled = settingsData?.settings?.aiEnabled || settingsData?.settings?.hasCustomApiKey;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsStreaming(true);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    activityId,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            // Add empty assistant message to stream into
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            // Read the stream
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;
                    if (!trimmed.startsWith('data: ')) continue;

                    try {
                        const json = JSON.parse(trimmed.slice(6));
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
                        // Skip invalid JSON
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                // Request was aborted, ignore
                return;
            }
            setError((err as Error).message);
            // Remove the empty assistant message if there was an error
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Compact variant for activity detail
    if (compact) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-white">Chat about this activity</h3>
                </div>

                {!aiEnabled ? (
                    <div className="text-sm text-gray-400">
                        <button
                            onClick={onOpenSettings}
                            className="text-purple-400 hover:text-purple-300"
                        >
                            Enable AI features
                        </button>
                        {' '}to chat about this activity.
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        {messages.length > 0 && (
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`text-sm ${msg.role === 'user' ? 'text-gray-300' : 'text-white'
                                            }`}
                                    >
                                        <span className="font-medium">
                                            {msg.role === 'user' ? 'You: ' : 'Coach: '}
                                        </span>
                                        {msg.content}
                                        {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                                            <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1" />
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* Input */}
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
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isStreaming}
                                className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isStreaming ? (
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 mt-2">{error}</p>
                        )}
                    </>
                )}
            </div>
        );
    }

    // Full chat view
    if (settingsLoading) {
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
                <p className="text-gray-400 mb-6 max-w-sm">
                    Get personalized training advice, analyze your workouts, and ask questions about your fitness data.
                </p>
                <button
                    onClick={onOpenSettings}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 transition-colors"
                >
                    <Settings2 className="w-5 h-5" />
                    Enable AI Features
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <Bot className="w-12 h-12 text-purple-400 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">AI Running Coach</h3>
                        <p className="text-gray-400 text-sm max-w-xs">
                            Ask me anything about your training, get workout advice, or analyze your progress.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {[
                                'How should I prepare for my race?',
                                'Am I training too hard?',
                                'What should I do tomorrow?',
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => setInput(suggestion)}
                                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-full transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-white'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                    {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content && (
                                        <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1" />
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask your AI coach..."
                        disabled={isStreaming}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isStreaming}
                        className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isStreaming ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
