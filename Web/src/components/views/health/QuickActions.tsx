import { BookOpen, Camera, Search, Sparkles } from 'lucide-react';
import { FastingWidget } from '../FastingWidget';

interface Props {
    onOpenAiScan: () => void;
    onOpenBarcode: () => void;
    onOpenSearch: () => void;
    onOpenLibrary: () => void;
}

export function QuickActions({ onOpenAiScan, onOpenBarcode, onOpenSearch, onOpenLibrary }: Props) {
    return (
        <>
            <FastingWidget />
            <div className="grid grid-cols-4 gap-3">
                <button type="button" onClick={onOpenAiScan} className="glass-card glass-card-hover py-3 flex flex-col items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-workout-tempo" />
                    <span className="text-[10px] font-semibold text-foreground">AI Scan</span>
                </button>
                <button type="button" onClick={onOpenBarcode} className="glass-card glass-card-hover py-3 flex flex-col items-center gap-1.5">
                    <Camera className="w-5 h-5 text-accent-blue" />
                    <span className="text-[10px] font-semibold text-foreground">Barcode</span>
                </button>
                <button type="button" onClick={onOpenSearch} className="glass-card glass-card-hover py-3 flex flex-col items-center gap-1.5">
                    <Search className="w-5 h-5 text-positive" />
                    <span className="text-[10px] font-semibold text-foreground">Search</span>
                </button>
                <button type="button" onClick={onOpenLibrary} className="glass-card glass-card-hover py-3 flex flex-col items-center gap-1.5">
                    <BookOpen className="w-5 h-5 text-workout-long-run" />
                    <span className="text-[10px] font-semibold text-foreground">Library</span>
                </button>
            </div>
        </>
    );
}
