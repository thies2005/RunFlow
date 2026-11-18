'use client';

import React from 'react';
import type { StepNode } from '@/lib/plans/structured';
import type { calculateTrainingPaces } from '@/lib/metrics/vdot';
import { RepeatGroupCard } from './RepeatGroupCard';
import { StepCard } from './StepCard';

export interface StepNodeListProps {
    nodes: StepNode[];
    onChange: (nodes: StepNode[]) => void;
    depth: number;
    resolvedSport: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
    trainingPaces: ReturnType<typeof calculateTrainingPaces>;
    ftpWatts: number;
}

export function StepNodeList({
    nodes,
    onChange,
    depth,
    resolvedSport,
    trainingPaces,
    ftpWatts,
}: StepNodeListProps) {
    const updateNode = (index: number, updated: StepNode) => {
        const copy = [...nodes];
        copy[index] = updated;
        onChange(copy);
    };

    const removeNode = (index: number) => {
        onChange(nodes.filter((_, i) => i !== index));
    };

    const duplicateNode = (index: number) => {
        const target = JSON.parse(JSON.stringify(nodes[index]));
        const copy = [...nodes];
        copy.splice(index + 1, 0, target);
        onChange(copy);
    };

    const moveNode = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= nodes.length) return;
        const copy = [...nodes];
        const [removed] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, removed);
        onChange(copy);
    };

    return (
        <div className="space-y-2">
            {nodes.map((node, idx) => {
                if (node.kind === 'repeat') {
                    return (
                        <RepeatGroupCard
                            key={idx}
                            group={node}
                            onChange={(updated) => updateNode(idx, updated)}
                            onDelete={() => removeNode(idx)}
                            onDuplicate={() => duplicateNode(idx)}
                            onMoveUp={() => moveNode(idx, 'up')}
                            onMoveDown={() => moveNode(idx, 'down')}
                            isFirst={idx === 0}
                            isLast={idx === nodes.length - 1}
                            depth={depth}
                            resolvedSport={resolvedSport}
                            trainingPaces={trainingPaces}
                            ftpWatts={ftpWatts}
                        />
                    );
                }

                return (
                    <StepCard
                        key={idx}
                        step={node}
                        onChange={(updated) => updateNode(idx, updated)}
                        onDelete={() => removeNode(idx)}
                        onDuplicate={() => duplicateNode(idx)}
                        onMoveUp={() => moveNode(idx, 'up')}
                        onMoveDown={() => moveNode(idx, 'down')}
                        isFirst={idx === 0}
                        isLast={idx === nodes.length - 1}
                        resolvedSport={resolvedSport}
                        trainingPaces={trainingPaces}
                        ftpWatts={ftpWatts}
                    />
                );
            })}
        </div>
    );
}
