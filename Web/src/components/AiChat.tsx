'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Bot, Loader2, AlertCircle, Settings2, Book } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PromptLibrary from './PromptLibrary';

interface AiChatProps {
    activityId?: string;
    compact?: boolean;
    onOpenSettings?: () => void;
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

export default function AiChat({ activityId, compact = false, onOpenSettings }: AiChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
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

    // Fetch Chat History
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['chat-history', activityId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (activityId) params.append('activityId', activityId);

            const res = await fetch(`/api/ai/chat/history?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        enabled: !!settingsData, // Only fetch if settings loaded (and potentially if AI enabled, but let's fetch anyway)
    });

    // Load history into messages when fetched
    useEffect(() => {
        if (historyData?.messages) {
            console.log('Chat history loaded:', historyData.messages.length);
            setMessages(historyData.messages);
        }
    }, [historyData]);

    const adminAllowed = settingsData?.settings?.adminAllowed;
    const aiEnabled = settingsData?.settings?.aiEnabled || settingsData?.settings?.hasCustomApiKey;

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

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

    // If admin has disabled AI features globally for this user, hide everything
    if (adminAllowed === false) {
        return null;
    }

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
                                {messages.map((msg, i) => {
                                    const cleanedContent = cleanContent(msg.content);
                                    // If content is empty after cleaning (and it wasn't empty before), it means we're in a thinking block
                                    const isThinking = isStreaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content && !cleanedContent;

                                    return (
                                        <div
                                            key={i}
                                            className={`text-sm ${msg.role === 'user' ? 'text-gray-300' : 'text-white'
                                                }`}
                                        >
                                            <span className="font-medium">
                                                {msg.role === 'user' ? 'You: ' : 'Coach: '}
                                            </span>
                                            <div className="inline-block align-top markdown-content">
                                                {isThinking ? (
                                                    <span className="text-gray-400 italic flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin inline" />
                                                        Thinking...
                                                    </span>
                                                ) : (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="inline" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc ml-4 inline-block" {...props} />,
                                                            li: ({ node, ...props }) => <li className="inline-block mr-2" {...props} />,
                                                        }}
                                                    >
                                                        {cleanedContent}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                            {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && cleanedContent && (
                                                <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1" />
                                            )}
                                        </div>
                                    );
                                })}
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
    if (settingsLoading || (historyLoading && aiEnabled)) {
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
        <div className="flex-1 flex flex-col h-full relative">
            <PromptLibrary
                isOpen={isPromptLibraryOpen}
                onClose={() => setIsPromptLibraryOpen(false)}
                onSelectPrompt={(text) => {
                    setInput(text);
                }}
            />

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <Bot className="w-12 h-12 text-purple-400 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">AI Running Coach</h3>
                        <p className="text-gray-400 text-sm max-w-xs mb-6">
                            Ask me anything about your training, get workout advice, or analyze your progress.
                        </p>

                        <button
                            onClick={() => setIsPromptLibraryOpen(true)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-purple-400 text-sm rounded-full transition-colors flex items-center gap-2 border border-purple-500/20 hover:border-purple-500/50"
                        >
                            <Book className="w-4 h-4" />
                            Browse Prompt Library
                        </button>

                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {[
                                'How should I prepare for my race?',
                                'Am I training too hard?',
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
                        {messages.map((msg, i) => {
                            const cleanedContent = cleanContent(msg.content);
                            // If content is empty after cleaning (and it wasn't empty before), it means we're in a thinking block
                            const isThinking = isStreaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content && !cleanedContent;

                            return (
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
                                        <div className="text-sm markdown-content">
                                            {isThinking ? (
                                                <div className="flex items-center gap-2 text-gray-400 italic">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span>Thinking...</span>
                                                </div>
                                            ) : (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 border-b border-gray-700 pb-1" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-md font-bold mb-2" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                        code: ({ node, inline, className, children, ...props }: any) => {
                                                            const match = /language-(\w+)/.exec(className || '');
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
                                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg" {...props} /></div>,
                                                        thead: ({ node, ...props }) => <thead className="bg-gray-800/50" {...props} />,
                                                        th: ({ node, ...props }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider" {...props} />,
                                                        td: ({ node, ...props }) => <td className="px-3 py-2 text-sm text-gray-400 border-t border-gray-700" {...props} />,
                                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-3 bg-purple-500/5 italic" {...props} />,
                                                        a: ({ node, ...props }) => <a className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    }}
                                                >
                                                    {cleanedContent}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                        {/* Loading spinner for initial non-thinking state */}
                                        {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && !msg.content && (
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        )}
                                        {/* Cursor for typing effect when not reasoning */}
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

            {/* Error Message */}
            {error && (
                <div className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-background mt-auto z-10">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsPromptLibraryOpen(true)}
                        className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-500/50 rounded-xl text-gray-400 hover:text-purple-400 transition-colors"
                        title="Prompt Library"
                    >
                        <Book className="w-5 h-5" />
                    </button>
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
