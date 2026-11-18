'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { X, Camera, Upload, ScanLine, Loader2, MessageSquare } from 'lucide-react';

interface FoodScanItem {
    name: string;
    estimatedGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export interface ScanResult {
    mealName: string;
    items: FoodScanItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    confidence: 'high' | 'medium' | 'low';
}

const formatScannerError = (
    rawMessage: unknown,
    fallback: string,
    retryAfterSeconds?: unknown,
    retryAfterHeader?: string | null
): string => {
    const cleaned = typeof rawMessage === 'string'
        ? rawMessage.replace(/^(?:[A-Za-z]*Error:\s*)+/i, '').trim()
        : '';
    const base = cleaned || fallback;
    const rawRetry = retryAfterSeconds ?? retryAfterHeader;
    const seconds = typeof rawRetry === 'number'
        ? rawRetry
        : typeof rawRetry === 'string' && rawRetry.trim()
            ? Number(rawRetry)
            : NaN;
    if (Number.isFinite(seconds) && seconds > 0 && !/\b\d+\s*s(?:ec(?:ond)?s?)?\b/i.test(base)) {
        const ceil = Math.ceil(seconds);
        return /[.!?]$/.test(base) ? `${base} Try again in ${ceil}s.` : `${base} (Try again in ${ceil}s)`;
    }
    return base;
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (_result: ScanResult) => void;
    embedded?: boolean;
}

export function FoodScannerModal({ isOpen, onClose, onScanComplete, embedded = false }: Props) {
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
        if (!isOpen || embedded) return;
        window.history.pushState({ modal: 'FoodScanner' }, '');
        const handlePopState = () => onCloseRef.current();
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (window.history.state?.modal === 'FoodScanner') {
                window.history.back();
            }
        };
    }, [isOpen, embedded]);

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

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
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
            let data: any = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch {
                    if (!res.ok) {
                        throw new Error(`Server error (${res.status}${res.statusText ? `: ${res.statusText}` : ''})`);
                    }
                    throw new Error('Failed to parse response from server');
                }
            }

            if (!res.ok) {
                const message = formatScannerError(
                    data?.error ?? data?.message,
                    `Failed to analyze food (${res.status})`,
                    data?.retryAfterSeconds ?? data?.retryAfter,
                    res.headers?.get?.('retry-after')
                );
                throw new Error(message);
            }

            if (!data) {
                throw new Error('Empty response from server');
            }

            onScanComplete(data);
            resetState();
        } catch (err) {
            setError(
                err instanceof Error
                    ? formatScannerError(err.message, 'Failed to analyze food')
                    : 'Failed to analyze food'
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!isOpen) return null;

    const innerContent = (
        <div className={embedded ? 'flex flex-col flex-1 min-h-0' : 'bg-background-secondary border border-line w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-md flex flex-col overflow-hidden animate-in slide-in-from-bottom'}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-line shrink-0">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-workout-tempo" />
                        <h2 className="text-lg font-semibold text-foreground">AI Food Scanner</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 -mr-2 text-foreground-muted hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                    {/* Image Capture Area */}
                    {!imagePreview && !isTextOnly ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <button
                                onClick={handleCameraClick}
                                className="w-full aspect-[4/3] border-2 border-dashed border-line-strong rounded-md flex flex-col items-center justify-center gap-4 hover:border-workout-tempo/50 hover:bg-workout-tempo/5 transition-colors group"
                            >
                                <div className="w-16 h-16 rounded-full bg-workout-tempo/10 flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-workout-tempo" />
                                </div>
                                <div className="text-center">
                                    <p className="text-foreground font-medium mb-1">Take a Photo</p>
                                    <p className="text-foreground-muted text-sm">Snap your meal for instant AI analysis</p>
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
                                    className="flex-1 bg-background-tertiary hover:bg-glass-bg-hover border border-line transition-colors rounded-md p-3 flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4 text-foreground-muted" />
                                    <span className="text-sm text-foreground-muted">Gallery</span>
                                </button>
                                <button
                                    onClick={() => setIsTextOnly(true)}
                                    className="flex-1 bg-background-tertiary hover:bg-glass-bg-hover border border-line transition-colors rounded-md p-3 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-4 h-4 text-foreground-muted" />
                                    <span className="text-sm text-foreground-muted">Describe food</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="relative rounded-md overflow-hidden bg-black/50">
                                    <Image
                                        src={imageBase64 || imagePreview}
                                        alt="Food to analyze"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 600px"
                                        className="object-cover"
                                    />
                                    <div className="w-full aspect-[4/3]" />
                                    <button
                                        onClick={() => {
                                            setImagePreview(null);
                                            setImageBase64(null);
                                            setError(null);
                                            if (cameraInputRef.current) cameraInputRef.current.value = '';
                                            if (galleryInputRef.current) galleryInputRef.current.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Text Only Mode Header */}
                            {isTextOnly && (
                                <div className="flex items-center justify-between p-3 bg-workout-tempo/10 border border-workout-tempo/20 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-workout-tempo" />
                                        <span className="text-sm text-workout-tempo font-medium">Text Description Mode</span>
                                    </div>
                                    <button onClick={() => setIsTextOnly(false)} className="text-foreground-muted hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Caption Input */}
                            <div>
                                <label className="flex items-center gap-1.5 text-xs text-foreground-muted mb-1.5 font-medium">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {isTextOnly ? 'Describe Your Meal' : 'Add Details (Optional)'}
                                </label>
                                <textarea
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder={isTextOnly ? 'e.g. "A large bowl of oatmeal with a sliced banana, 2 tablespoons of peanut butter, and a drizzle of honey"' : 'e.g. "salad with 2 spoons of olive oil"'}
                                    className="w-full bg-background-tertiary border border-line rounded-md px-4 py-3 text-foreground placeholder-foreground-muted focus:outline-hidden transition-colors min-h-[100px] resize-none"
                                    disabled={isAnalyzing}
                                />
                                <p className="text-[11px] text-foreground-muted mt-1.5 ml-1">
                                    {isTextOnly ? 'Be descriptive with portions and sizes for better accuracy' : 'Help the AI identify ingredients, sauces, or portions for better accuracy'}
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div role="alert" className="bg-negative/10 border border-negative/20 rounded-md p-3 text-sm text-negative">
                                    {error}
                                </div>
                            )}

                            {/* Analyze Button */}
                            <div className="mt-auto pt-2">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || (!imageBase64 && !caption.trim())}
                                    className="w-full py-3.5 bg-accent-orange text-white font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-accent-orange/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Analyzing food photo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ScanLine className="w-5 h-5" />
                                            {isTextOnly ? 'Analyze Text' : 'Analyze Food'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
        </div>
    );

    if (embedded) return innerContent;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 sm:items-center sm:justify-center">
            {innerContent}
        </div>
    );
}
