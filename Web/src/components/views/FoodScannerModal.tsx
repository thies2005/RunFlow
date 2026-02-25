'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Camera, Upload, Sparkles, Loader2, MessageSquare } from 'lucide-react';

interface FoodScanItem {
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface ScanResult {
    mealName: string;
    items: FoodScanItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    confidence: 'high' | 'medium' | 'low';
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (result: ScanResult) => void;
}

export function FoodScannerModal({ isOpen, onClose, onScanComplete }: Props) {
    const { data: session } = useSession();
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isTextOnly, setIsTextOnly] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        window.history.pushState({ modal: 'FoodScanner' }, '');
        const handlePopState = () => onCloseRef.current();
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.modal === 'FoodScanner') {
                window.history.back();
            }
        };
    }, [isOpen]);

    const resetState = () => {
        setImagePreview(null);
        setImageBase64(null);
        setCaption('');
        setIsTextOnly(false);
        setIsAnalyzing(false);
        setError(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // Preview
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImageBase64(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalyze = async () => {
        if ((!imageBase64 && !caption.trim()) || !session?.user?.id) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const res = await fetch('/api/health/nutrition/scan-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64,
                    caption: caption.trim() || undefined,
                    userId: session.user.id,
                }),
            });

            const text = await res.text();
            let data: any = { error: 'Unknown error occurred' };
            try {
                data = JSON.parse(text);
            } catch (e) {
                if (!res.ok) {
                    throw new Error(`Server returned ${res.status}: ${res.statusText}`);
                }
                throw new Error('Failed to parse response from server');
            }

            if (!res.ok) {
                throw new Error(data.error || `Error ${res.status}`);
            }

            onScanComplete(data);
            resetState();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze food');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="bg-[#1c1c1e] w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">AI Food Scanner</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                    {/* Image Capture Area */}
                    {!imagePreview && !isTextOnly ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="w-full aspect-[4/3] border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Camera className="w-8 h-8 text-amber-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-medium mb-1">Take a Photo</p>
                                    <p className="text-gray-400 text-sm">Snap your meal for instant AI analysis</p>
                                </div>
                            </button>

                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <div className="flex gap-3 mt-4 w-full">
                                <button
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-xl p-3 flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">Gallery</span>
                                </button>
                                <button
                                    onClick={() => setIsTextOnly(true)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-xl p-3 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-300">Describe food</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative rounded-2xl overflow-hidden bg-black/50">
                                    <img
                                        src={imageBase64 || imagePreview || undefined}
                                        alt="Food to analyze"
                                        className="w-full aspect-[4/3] object-cover"
                                    />
                                    <button
                                        onClick={() => {
                                            setImagePreview(null);
                                            setImageBase64(null);
                                            setError(null);
                                            if (cameraInputRef.current) cameraInputRef.current.value = '';
                                            if (galleryInputRef.current) galleryInputRef.current.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white hover:bg-black/80 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Text Only Mode Header */}
                            {isTextOnly && (
                                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm text-amber-500 font-medium">Text Description Mode</span>
                                    </div>
                                    <button onClick={() => setIsTextOnly(false)} className="text-gray-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Caption Input */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-widest mb-1.5 font-medium">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {isTextOnly ? 'Describe Your Meal' : 'Add Details (Optional)'}
                                </label>
                                <textarea
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder={isTextOnly ? 'e.g. "A large bowl of oatmeal with a sliced banana, 2 tablespoons of peanut butter, and a drizzle of honey"' : 'e.g. "salad with 2 spoons of olive oil"'}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors min-h-[100px] resize-none"
                                    disabled={isAnalyzing}
                                />
                                <p className="text-[11px] text-gray-500 mt-1.5 ml-1">
                                    {isTextOnly ? 'Be descriptive with portions and sizes for better accuracy' : 'Help the AI identify ingredients, sauces, or portions for better accuracy'}
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Analyze Button */}
                            <div className="mt-auto pt-2">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || (!imageBase64 && !caption.trim())}
                                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Analyzing with Gemini...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            {isTextOnly ? 'Analyze Text' : 'Analyze Food'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
