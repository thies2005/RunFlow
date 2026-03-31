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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/[var(--modal-backdrop-opacity)] backdrop-blur-xs">
            <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Book className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Prompt Library</h2>
                            <p className="text-xs text-gray-400">Curated questions for your AI Coach</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / Categories */}
                    <div className="w-1/3 border-r border-white/5 overflow-y-auto bg-black/20">
                        <div className="p-3 space-y-1">
                            {PROMPT_LIBRARY.map((category) => (
                                <button
                                    key={category.category}
                                    onClick={() => setSelectedCategory(category.category)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group ${selectedCategory === category.category
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
                    <div className="flex-1 overflow-y-auto bg-[#1c1c1e] p-6">
                        <div className="space-y-4">
                            {activeCategory?.prompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onSelectPrompt(prompt.text);
                                        onClose();
                                    }}
                                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-xl p-4 transition-all group group-hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-gray-800 group-hover:bg-purple-500/20 p-1.5 rounded-lg transition-colors">
                                            <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white mb-1 group-hover:text-purple-300 transition-colors">
                                                {prompt.title}
                                            </h3>
                                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
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
