'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Workout {
    id: string;
    scheduledDate: string | Date;
}

interface SelectionContextValue {
    selectedIds: Set<string>;
    selectWorkout: (id: string, multi?: boolean, range?: boolean, anchorId?: string) => void;
    clearSelection: () => void;
    selectAllInWeek: (workouts: Workout[]) => void;
    isSelected: (id: string) => boolean;
    setAnchorId: (id: string | null) => void;
    anchorId: string | null;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelection() {
    const ctx = useContext(SelectionContext);
    if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
    return ctx;
}

interface SelectionProviderProps {
    children: ReactNode;
    workouts: Workout[];
}

export function SelectionProvider({ children, workouts }: SelectionProviderProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [anchorId, setAnchorIdState] = useState<string | null>(null);

    const selectWorkout = useCallback(
        (id: string, multi?: boolean, range?: boolean, providedAnchorId?: string) => {
            setSelectedIds((prev) => {
                const next = new Set(multi ? prev : new Set<string>());

                if (range && providedAnchorId) {
                    const allIds = workouts.map((w) => w.id);
                    const startIdx = allIds.indexOf(providedAnchorId);
                    const endIdx = allIds.indexOf(id);
                    if (startIdx !== -1 && endIdx !== -1) {
                        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                        for (let i = lo; i <= hi; i++) {
                            next.add(allIds[i]);
                        }
                        return next;
                    }
                }

                if (multi) {
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                } else {
                    next.clear();
                    next.add(id);
                }

                return next;
            });
        },
        [workouts],
    );

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setAnchorIdState(null);
    }, []);

    const selectAllInWeek = useCallback((weekWorkouts: Workout[]) => {
        setSelectedIds((prev) => {
            const allSelected = weekWorkouts.every((w) => prev.has(w.id));
            const next = new Set(prev);
            for (const w of weekWorkouts) {
                if (allSelected) next.delete(w.id);
                else next.add(w.id);
            }
            return next;
        });
    }, []);

    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds],
    );

    const setAnchorId = useCallback((id: string | null) => {
        setAnchorIdState(id);
    }, []);

    return (
        <SelectionContext.Provider
            value={{
                selectedIds,
                selectWorkout,
                clearSelection,
                selectAllInWeek,
                isSelected,
                setAnchorId,
                anchorId,
            }}
        >
            {children}
        </SelectionContext.Provider>
    );
}
