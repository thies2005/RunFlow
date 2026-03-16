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
                <button type="button" onClick={onOpenAiScan} className="glass-card border border-glass-border py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all hover:bg-white/10 active:scale-[0.98]">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase text-white">AI Scan</span>
                </button>
                <button type="button" onClick={onOpenBarcode} className="glass-card border border-glass-border py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all hover:bg-white/10 active:scale-[0.98]">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase text-white">Barcode</span>
                </button>
                <button type="button" onClick={onOpenSearch} className="glass-card border border-glass-border py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all hover:bg-white/10 active:scale-[0.98]">
                    <Search className="w-5 h-5 text-green-400" />
                    <span className="text-[10px] font-bold uppercase text-white">Search</span>
                </button>
                <button type="button" onClick={onOpenLibrary} className="glass-card border border-glass-border py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all hover:bg-white/10 active:scale-[0.98]">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <span className="text-[10px] font-bold uppercase text-white">Library</span>
                </button>
            </div>
        </>
    );
}
