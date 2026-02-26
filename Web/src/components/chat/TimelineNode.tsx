import React from 'react';

interface TimelineNodeProps {
    children: React.ReactNode;
    dotColor?: string;
    lineColor?: string;
}

export default function TimelineNode({
    children,
    dotColor = 'timeline-dot-blue',
    lineColor = 'var(--glass-border)'
}: TimelineNodeProps) {
    return (
        <div
            className="timeline-node mb-6 relative"
            style={{ borderLeftColor: lineColor }}
        >
            <div className={`timeline-dot ${dotColor} flex items-center justify-center p-0.5`} />
            <div className="pt-1">
                {children}
            </div>
        </div>
    );
}
