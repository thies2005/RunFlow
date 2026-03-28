import { BarChart3, HeartPulse, Plus } from 'lucide-react';
import { SupplementItem } from '@/components/health/SupplementItem';
import type { Supplement, SupplementStack, SupplementLog } from '@/lib/types/health';

type StackWithSupplements = SupplementStack & { supplements: Supplement[] };

interface Props {
    supplements: Supplement[];
    stacks: StackWithSupplements[];
    morningStandalone: Supplement[];
    noonStandalone: Supplement[];
    eveningStandalone: Supplement[];
    isLoading: boolean;
    getSupplementLog: (_supplementId: string) => SupplementLog | undefined;
    onOpenAnalytics: () => void;
    onAddStack: () => void;
    onAddSupplement: () => void;
    onEditStack: (_stack: StackWithSupplements) => void;
    onEditSupplement: (_supplement: Supplement) => void;
    onToggleStack: (_stackId: string, _taken: boolean) => void;
    onToggleSupplement: (_supplementId: string, _taken: boolean) => void;
    onShowStats: (_config: { targetId: string; targetType: 'supplement' | 'stack'; targetName: string }) => void;
    pendingSupplementId?: string | null;
    pendingStackId?: string | null;
}

export function SupplementsSection({
    supplements,
    stacks,
    morningStandalone,
    noonStandalone,
    eveningStandalone,
    isLoading,
    getSupplementLog,
    onOpenAnalytics,
    onAddStack,
    onAddSupplement,
    onEditStack,
    onEditSupplement,
    onToggleStack,
    onToggleSupplement,
    onShowStats,
    pendingSupplementId,
    pendingStackId,
}: Props) {
    const renderSupplementItem = (supp: Supplement) => {
        const log = getSupplementLog(supp.id);
        const isTaken = log?.taken || false;

        return (
            <SupplementItem
                key={supp.id}
                supplement={supp}
                isTaken={isTaken}
                variant="standalone"
                isPending={pendingSupplementId === supp.id}
                onEdit={onEditSupplement}
                onToggle={(id, taken) => onToggleSupplement(id, taken)}
                onShowStats={(id, name) => onShowStats({ targetId: id, targetType: 'supplement', targetName: name })}
            />
        );
    };

    const renderStack = (stack: StackWithSupplements) => {
        const activeSupplements = (stack.supplements || []).filter((supp: Supplement) => {
            if (supp.isActive === false) return false;
            return true;
        });
        const hasSupplements = activeSupplements.length > 0;
        const allTaken = hasSupplements && activeSupplements.every((supp: Supplement) => getSupplementLog(supp.id)?.taken);

        return (
            <div key={stack.id} className="mb-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10 hover:bg-white/10 transition-colors">
                    <button type="button" className="flex-1 text-left" onClick={() => onEditStack(stack)}>
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            {stack.name} {stack.timeOfDay && <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/10 px-1.5 py-0.5 rounded ml-1">{stack.timeOfDay}</span>}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{stack.supplements?.length || 0} items</p>
                    </button>

                    {hasSupplements && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                aria-label={`View ${stack.name} stats`}
                                onClick={() => onShowStats({ targetId: stack.id, targetType: 'stack', targetName: stack.name })}
                                className="w-6 h-6 rounded flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20"
                            >
                                <BarChart3 className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                                type="button"
                                aria-label={`${allTaken ? 'Untake' : 'Take'} ${stack.name}`}
                                onClick={() => onToggleStack(stack.id, !allTaken)}
                                disabled={pendingStackId === stack.id}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border ${allTaken ? 'bg-blue-500 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white' : 'bg-transparent border-gray-500 text-gray-500 hover:border-gray-400'} disabled:opacity-50`}
                            >
                                {allTaken ? <HeartPulse className="w-4 h-4" /> : <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />}
                            </button>
                        </div>
                    )}
                </div>

                {hasSupplements && (
                    <div className="p-2 space-y-1">
                        {activeSupplements.map((supp: Supplement) => {
                            const log = getSupplementLog(supp.id);
                            const isTaken = log?.taken || false;

                            return (
                                <SupplementItem
                                    key={supp.id}
                                    supplement={supp}
                                    isTaken={isTaken}
                                    variant="stack-item"
                                    isPending={pendingSupplementId === supp.id}
                                    onEdit={onEditSupplement}
                                    onToggle={(id, taken) => onToggleSupplement(id, taken)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="glass-card border border-glass-border rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2 text-sm">Daily Supplements</h3>
                <div className="flex gap-2">
                    <button type="button" onClick={onOpenAnalytics} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-500/20 transition-colors">
                        <BarChart3 className="w-3.5 h-3.5" /> Analytics
                    </button>
                    <button type="button" onClick={onAddStack} className="bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Stack
                    </button>
                    <button type="button" onClick={onAddSupplement} className="bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Supp
                    </button>
                </div>
            </div>

            {isLoading ? (
                <p className="text-xs text-gray-500">Loading supplements...</p>
            ) : supplements.length === 0 && stacks.length === 0 ? (
                <div className="flex gap-3 mt-2">
                    <button type="button" onClick={onAddSupplement} className="flex-1 text-center py-6 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg transition-colors group flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400 tracking-wide font-medium group-hover:text-white transition-colors">Add Supplement</p>
                    </button>
                    <button type="button" onClick={onAddStack} className="flex-1 text-center py-6 border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 rounded-lg transition-colors group flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                            <Plus className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-400 tracking-wide font-medium group-hover:text-blue-400 transition-colors">Create Stack</p>
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {stacks.slice().sort((a: StackWithSupplements, b: StackWithSupplements) => {
                        const order: Record<string, number> = { MORNING: 1, NOON: 2, EVENING: 3 };
                        const valA = order[a.timeOfDay ?? ''] || 4;
                        const valB = order[b.timeOfDay ?? ''] || 4;
                        return valA - valB;
                    }).map(renderStack)}

                    {morningStandalone.length > 0 && <div><h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Morning Standalones</h4>{morningStandalone.map(renderSupplementItem)}</div>}
                    {noonStandalone.length > 0 && <div><h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-1">Noon Standalones</h4>{noonStandalone.map(renderSupplementItem)}</div>}
                    {eveningStandalone.length > 0 && <div><h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4 px-1">Evening Standalones</h4>{eveningStandalone.map(renderSupplementItem)}</div>}
                </div>
            )}
        </div>
    );
}
