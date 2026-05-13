'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type PlanCreationMode = 'EXPERT_MANUAL' | 'GUIDED' | 'AI_ASSISTED';

const STORAGE_KEY = 'planEditorMode';

const MODE_MAP: Record<PlanCreationMode, string> = {
    EXPERT_MANUAL: 'none',
    GUIDED: 'light',
    AI_ASSISTED: 'full',
};

const REVERSE_MODE_MAP: Record<string, PlanCreationMode> = {
    none: 'EXPERT_MANUAL',
    light: 'GUIDED',
    full: 'AI_ASSISTED',
};

function getStoredMode(): PlanCreationMode {
    if (typeof window === 'undefined') return 'EXPERT_MANUAL';
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            if (stored in REVERSE_MODE_MAP) return REVERSE_MODE_MAP[stored];
            if (['EXPERT_MANUAL', 'GUIDED', 'AI_ASSISTED'].includes(stored)) return stored as PlanCreationMode;
        }
    } catch {}
    return 'EXPERT_MANUAL';
}

interface GoalData {
    guidanceLevel: string | null;
}

export function usePlanMode(goalId: string) {
    const queryClient = useQueryClient();
    const [mode, setModeState] = useState<PlanCreationMode>('EXPERT_MANUAL');
    const [initialized, setInitialized] = useState(false);

    const { data: goal } = useQuery<{ plan: GoalData }>({
        queryKey: ['plan-advanced', goalId],
        queryFn: async () => {
            const res = await fetch(`/api/plan-advanced/${goalId}`);
            if (!res.ok) throw new Error('Failed to fetch goal');
            return res.json();
        },
        enabled: !!goalId,
    });

    useEffect(() => {
        if (!initialized) {
            const guidanceLevel = goal?.plan?.guidanceLevel;
            if (guidanceLevel && guidanceLevel in REVERSE_MODE_MAP) {
                setModeState(REVERSE_MODE_MAP[guidanceLevel]);
            } else {
                setModeState(getStoredMode());
            }
            setInitialized(true);
        }
    }, [goal, initialized]);

    const updateMutation = useMutation({
        mutationFn: async (newMode: PlanCreationMode) => {
            const res = await fetch(`/api/plan-advanced/${goalId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guidanceLevel: MODE_MAP[newMode] }),
            });
            if (!res.ok) throw new Error('Failed to update mode');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plan-advanced', goalId] });
        },
    });

    const setMode = useCallback(
        (newMode: PlanCreationMode) => {
            setModeState(newMode);
            try {
                localStorage.setItem(STORAGE_KEY, MODE_MAP[newMode]);
            } catch {}

            updateMutation.mutate(newMode);

            if (newMode === 'GUIDED') {
                toast.info('Guided mode enabled', {
                    description: 'Helpful tips will appear as you build your plan.',
                    duration: 3000,
                });
            }
        },
        [updateMutation],
    );

    return {
        mode,
        setMode,
        isExpert: mode === 'EXPERT_MANUAL',
        isGuided: mode === 'GUIDED',
        isAiAssisted: mode === 'AI_ASSISTED',
        initialized,
    };
}
