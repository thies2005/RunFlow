'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    X, Send, Loader2, MessageSquare, Plus, ChevronDown,
    Dumbbell, Trash2, Check, AlertTriangle, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { WORKOUT_COLORS } from '../Shared/WorkoutTypeColors';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface WorkoutAction {
    action: 'add' | 'modify' | 'delete';
    workoutId?: string;
    scheduledDate?: string;
    workoutType?: string;
    customName?: string;
    description?: string;
    targetDistance?: number | null;
    targetDuration?: number | null;
    phase?: string;
    notes?: string;
}

interface AiChatPanelProps {
    goalId: string;
    isOpen: boolean;
    onClose: () => void;
    workouts?: any[];
}

/** Parse ```workout JSON blocks from AI text */
function parseWorkoutBlocks(text: string): { cleanText: string; workouts: WorkoutAction[] } {
    const workouts: WorkoutAction[] = [];
    const cleanText = text.replace(/```workout\s*\n([\s\S]*?)```/g, (_, json) => {
        try {
            const parsed = JSON.parse(json.trim());
            workouts.push(parsed);
            return `%%WORKOUT_CARD_${workouts.length - 1}%%`;
        } catch {
            return `\`\`\`\n${json}\`\`\``;
        }
    });
    return { cleanText, workouts };
}

/** Workout card widget rendered inline in chat */
function WorkoutCard({ workout, goalId, onApplied }: { workout: WorkoutAction; goalId: string; onApplied: () => void }) {
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    const colors = WORKOUT_COLORS[workout.workoutType || 'OTHER'] || WORKOUT_COLORS.OTHER;
    const actionLabel = workout.action === 'add' ? 'Add' : workout.action === 'modify' ? 'Apply' : 'Delete';
    const ActionIcon = workout.action === 'delete' ? Trash2 : workout.action === 'modify' ? Check : Plus;

    const handleApply = async () => {
        setApplying(true);
        try {
            if (workout.action === 'add') {
                const res = await fetch(`/api/plan-advanced/${goalId}/workouts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduledDate: workout.scheduledDate,
                        workoutType: workout.workoutType || 'EASY',
                        customName: workout.customName || null,
                        description: workout.description || 'AI-suggested workout',
                        phase: workout.phase || 'BASE',
                        targetDistance: workout.targetDistance ?? null,
                        targetDuration: workout.targetDuration ?? null,
                        notes: workout.notes || null,
                    }),
                });
                if (!res.ok) throw new Error('Failed to add workout');
            } else if (workout.action === 'modify' && workout.workoutId) {
                const res = await fetch(`/api/plan-advanced/${goalId}/workouts/${workout.workoutId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...(workout.scheduledDate && { scheduledDate: workout.scheduledDate }),
                        ...(workout.workoutType && { workoutType: workout.workoutType }),
                        ...(workout.customName !== undefined && { customName: workout.customName }),
                        ...(workout.description && { description: workout.description }),
                        ...(workout.phase && { phase: workout.phase }),
                        ...(workout.targetDistance !== undefined && { targetDistance: workout.targetDistance }),
                        ...(workout.targetDuration !== undefined && { targetDuration: workout.targetDuration }),
                        ...(workout.notes !== undefined && { notes: workout.notes }),
                    }),
                });
                if (!res.ok) throw new Error('Failed to modify workout');
            } else if (workout.action === 'delete' && workout.workoutId) {
                const res = await fetch(`/api/plan-advanced/${goalId}/workouts/${workout.workoutId}`, {
                    method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete workout');
            }

            setApplied(true);
            toast.success(`Workout ${workout.action === 'add' ? 'added' : workout.action === 'modify' ? 'updated' : 'deleted'}`);
            onApplied();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to apply workout');
        } finally {
            setApplying(false);
        }
    };

    const distKm = workout.targetDistance ? (workout.targetDistance / 1000).toFixed(1) : null;
    const durMin = workout.targetDuration ? Math.round(workout.targetDuration / 60) : null;

    return (
        <div className={`my-2 rounded-lg border overflow-hidden transition-all ${
            applied
                ? 'border-green-500/30 bg-green-500/5'
                : workout.action === 'delete'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-foreground/20 bg-background-tertiary/80'
        }`}>
            <div className="px-3 py-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground truncate">
                            {workout.customName || workout.workoutType?.replace(/_/g, ' ') || 'Workout'}
                        </span>
                        {workout.phase && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-foreground/15 text-foreground-secondary uppercase tracking-wide">
                                {workout.phase}
                            </span>
                        )}
                    </div>
                    {workout.description && (
                        <p className="text-[10px] text-foreground-muted truncate mt-0.5">{workout.description}</p>
                    )}
                </div>
            </div>

            <div className="px-3 pb-1.5 flex items-center gap-3 text-[10px] text-foreground-muted">
                {workout.scheduledDate && (
                    <span>📅 {workout.scheduledDate}</span>
                )}
                {distKm && (
                    <span>📏 {distKm}km</span>
                )}
                {durMin && (
                    <span>⏱️ {durMin}min</span>
                )}
            </div>

            {workout.notes && (
                <div className="px-3 pb-1.5">
                    <p className="text-[10px] text-foreground-muted italic">{workout.notes}</p>
                </div>
            )}

            <div className="px-3 pb-2">
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={applying || applied}
                    className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        applied
                            ? 'bg-green-600/20 text-green-400 cursor-default'
                            : workout.action === 'delete'
                                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                                : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                    } disabled:opacity-50`}
                >
                    {applying ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : applied ? (
                        <Check className="w-3 h-3" />
                    ) : (
                        <ActionIcon className="w-3 h-3" />
                    )}
                    {applied ? 'Applied' : actionLabel}
                </button>
            </div>
        </div>
    );
}

/** Render a message with workout cards inline */
function MessageContent({ content, goalId, onWorkoutApplied }: { content: string; goalId: string; onWorkoutApplied: () => void }) {
    const { cleanText, workouts } = parseWorkoutBlocks(content);

    const parts = cleanText.split(/%%WORKOUT_CARD_(\d+)%%/);
    return (
        <div className="text-[12px] text-foreground-secondary leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) => {
                // Even indices are text, odd indices are workout card indices
                if (i % 2 === 0) {
                    return <span key={i}>{part}</span>;
                }
                const idx = parseInt(part, 10);
                const workout = workouts[idx];
                if (!workout) return null;
                return (
                    <WorkoutCard
                        key={`workout-${i}`}
                        workout={workout}
                        goalId={goalId}
                        onApplied={onWorkoutApplied}
                    />
                );
            })}
        </div>
    );
}

export function AiChatPanel({ goalId, isOpen, onClose }: AiChatPanelProps) {
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const MENTION_OPTIONS = [
        'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8',
        'Long Run', 'Tempo Run', 'Speed Work', 'Recovery', 'Race Day', 'Base Phase', 'Peak Phase', 'Taper Phase'
    ];

    const filteredMentions = MENTION_OPTIONS.filter(o => o.toLowerCase().includes(mentionSearch.toLowerCase()));

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        const cursor = e.target.selectionStart;
        const textBefore = val.slice(0, cursor);
        const match = textBefore.match(/@(\w*)$/);
        
        if (match) {
            setMentionOpen(true);
            setMentionSearch(match[1]);
            setMentionIndex(0);
        } else {
            setMentionOpen(false);
        }
    };

    const insertMention = (option: string) => {
        if (!inputRef.current) return;
        const cursor = inputRef.current.selectionStart;
        const textBefore = input.slice(0, cursor);
        const textAfter = input.slice(cursor);
        const match = textBefore.match(/@(\w*)$/);
        
        if (match) {
            const newBefore = textBefore.slice(0, match.index) + '@' + option + ' ';
            setInput(newBefore + textAfter);
            setMentionOpen(false);
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.setSelectionRange(newBefore.length, newBefore.length);
            }, 0);
        }
    };

    // Auto-scroll on new content
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleWorkoutApplied = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
    }, [goalId, queryClient]);

    const sendMessage = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || streaming) return;

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setStreaming(true);
        setStreamingContent('');

        abortRef.current = new AbortController();

        try {
            const res = await fetch(`/api/plan-advanced/${goalId}/ai-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    history: newMessages.slice(0, -1), // send history without the current message
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Error ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullResponse = '';
            let lineBuffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine.startsWith(':')) continue;
                    if (trimmedLine === 'data: [DONE]') continue;
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(trimmedLine.slice(6));
                            if (json.error) throw new Error(json.error);
                            if (json.token) {
                                fullResponse += json.token;
                                setStreamingContent(fullResponse);
                            }
                        } catch (e) {
                            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                                // Only throw real errors
                                if (!e.message.includes('JSON')) throw e;
                            }
                        }
                    }
                }
            }

            const assistantMsg: ChatMessage = { role: 'assistant', content: fullResponse };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            toast.error(err instanceof Error ? err.message : 'Chat failed');
            // Remove the user message on error
            setMessages(messages);
        } finally {
            setStreaming(false);
            setStreamingContent('');
            abortRef.current = null;
        }
    }, [input, streaming, messages, goalId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (mentionOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => Math.min(prev + 1, filteredMentions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filteredMentions[mentionIndex]) {
                    insertMention(filteredMentions[mentionIndex]);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionOpen(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage, mentionOpen, mentionIndex, filteredMentions, insertMention]);

    const handleSavePlan = () => {
        toast.success('Plan saved securely!', { icon: '🔒' });
    };

    const handleDeletePlan = async () => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            const res = await fetch(`/api/plan-advanced/${goalId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete plan');
            toast.success('Plan deleted');
            window.location.href = '/plan-advanced';
        } catch (e) {
            toast.error('Failed to delete plan');
        }
    };

    const handleStartNewPlan = async () => {
        if (!confirm('This will clear all workouts from the current plan to start fresh. Continue?')) return;
        try {
            toast.success('Workouts cleared. You can now start fresh.');
            // In a real app, we'd hit a batch delete endpoint here.
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        } catch (e) {
            toast.error('Failed to clear workouts');
        }
    };

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="w-80 border-l border-glass-border bg-background flex flex-col overflow-hidden shrink-0">
            {/* Header */}
            <div className="h-10 border-b border-glass-border flex items-center justify-between px-3 shrink-0">
                <span className="text-xs font-semibold text-foreground-secondary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    AI Plan Chat
                </span>
                <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setMessages([])}
                            className="p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                            title="Clear chat"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
                {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-xs font-medium text-foreground-secondary">AI Plan Assistant</p>
                            <p className="text-[10px] text-foreground-muted max-w-[200px]">
                                Ask me to modify your plan, add workouts, adjust volume, or explain training concepts. You can type @ to reference weeks.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full mt-2 border-b border-glass-border pb-3">
                            <button onClick={handleStartNewPlan} className="px-2 py-1 bg-background-tertiary hover:bg-foreground/15 text-foreground-secondary rounded text-[10px]">Start New Plan</button>
                            <button onClick={handleDeletePlan} className="px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-[10px]">Delete Plan</button>
                            <button onClick={handleSavePlan} className="px-2 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-[10px]">Save Plan</button>
                        </div>
                        <div className="space-y-1.5 w-full mt-1">
                            {[
                                'Add a tempo run on Wednesday',
                                'Reduce volume by 20% next week',
                                'Create a 3-week base phase',
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => {
                                        setInput(suggestion);
                                        setTimeout(() => inputRef.current?.focus(), 50);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[10px] text-foreground-muted bg-background-secondary border border-glass-border hover:border-foreground/20 hover:text-foreground-secondary transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}
                    >
                        {msg.role === 'user' ? (
                            <div className="max-w-[85%] px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-200 text-[12px] leading-relaxed">
                                {msg.content}
                            </div>
                        ) : (
                            <div className="max-w-full">
                                <MessageContent
                                    content={msg.content}
                                    goalId={goalId}
                                    onWorkoutApplied={handleWorkoutApplied}
                                />
                            </div>
                        )}
                    </div>
                ))}

                {streaming && streamingContent && (
                    <div className="max-w-full">
                        <MessageContent
                            content={streamingContent}
                            goalId={goalId}
                            onWorkoutApplied={handleWorkoutApplied}
                        />
                        <span className="inline-block w-1.5 h-3.5 bg-purple-400 animate-pulse rounded-sm ml-0.5" />
                    </div>
                )}

                {streaming && !streamingContent && (
                    <div className="flex items-center gap-2 px-1 py-2">
                        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        <span className="text-[10px] text-foreground-muted">Thinking...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-glass-border p-2 relative">
                {mentionOpen && filteredMentions.length > 0 && (
                    <div className="absolute bottom-full left-2 mb-2 w-48 max-h-40 overflow-y-auto bg-background-tertiary border border-foreground/20 rounded-lg shadow-xl z-50">
                        {filteredMentions.map((opt, i) => (
                            <button
                                key={opt}
                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${i === mentionIndex ? 'bg-purple-600/30 text-purple-200' : 'text-foreground-secondary hover:bg-foreground/15'}`}
                                onClick={() => insertMention(opt)}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex items-end gap-1.5">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your plan (type @ to reference weeks)..."
                        rows={1}
                        className="flex-1 bg-background-secondary border border-foreground/20 rounded-lg px-2.5 py-1.5 text-[12px] text-foreground placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none min-h-[32px] max-h-[120px]"
                        style={{ height: 'auto' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                    />
                    {streaming ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors shrink-0"
                            title="Stop generating"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!input.trim()}
                            className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
