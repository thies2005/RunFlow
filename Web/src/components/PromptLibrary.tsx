'use client';

import { useState } from 'react';
import { Book, X, ChevronRight, MessageSquare } from 'lucide-react';
import { PROMPT_LIBRARY } from '@/lib/data/prompts';

interface PromptLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPrompt: (_text: string) => void;
}

export default function PromptLibrary({ isOpen, onClose, onSelectPrompt }: PromptLibraryProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(PROMPT_LIBRARY[0].category);

    if (!isOpen) return null;

    const activeCategory = PROMPT_LIBRARY.find((c) => c.category === selectedCategory);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/[var(--modal-backdrop-opacity)]">
            <div className="bg-background-secondary border border-line rounded-md w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-background-secondary">
                    <div className="flex items-center gap-3">
                        <div className="bg-background-tertiary p-2 rounded-md">
                            <Book className="w-5 h-5 text-foreground-muted" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Prompt Library</h2>
                            <p className="text-xs text-foreground-muted">Curated questions for your AI Coach</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-foreground-muted hover:text-foreground transition-colors p-2 hover:bg-foreground/5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / Categories */}
                    <div className="w-1/3 border-r border-line overflow-y-auto bg-background-tertiary">
                        <div className="p-3 space-y-1">
                            {PROMPT_LIBRARY.map((category) => (
                                <button
                                    key={category.category}
                                    onClick={() => setSelectedCategory(category.category)}
                                    className={`w-full text-left px-4 py-3 rounded-md text-sm transition-colors flex items-center justify-between group ${selectedCategory === category.category
                                            ? 'bg-accent-orange text-white'
                                            : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
                                        }`}
                                >
                                    <span>{category.category}</span>
                                    {selectedCategory === category.category && (
                                        <ChevronRight className="w-4 h-4 opacity-50" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompts List */}
                    <div className="flex-1 overflow-y-auto bg-background-secondary p-6">
                        <div className="space-y-4">
                            {activeCategory?.prompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onSelectPrompt(prompt.text);
                                        onClose();
                                    }}
                                    className="w-full text-left bg-background-secondary hover:bg-surface-hover border border-line hover:border-line-strong rounded-md p-4 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-background-tertiary group-hover:bg-accent-orange/10 p-1.5 rounded-sm transition-colors">
                                            <MessageSquare className="w-4 h-4 text-foreground-muted group-hover:text-accent-orange" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-foreground mb-1 group-hover:text-foreground transition-colors">
                                                {prompt.title}
                                            </h3>
                                            <p className="text-sm text-foreground-muted line-clamp-2 leading-relaxed">
                                                {prompt.text}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
