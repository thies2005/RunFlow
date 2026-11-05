import { projectRoute } from '@/lib/routeProjection';

export default function ActivityRoute({ latlng, loading = false, error, onRetry }: {
    latlng: unknown;
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
}) {
    const points = projectRoute(latlng);
    return <section className="mb-8" aria-label="Activity route">
        <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2 mb-4">Route</h3>
        {loading ? <div className="text-foreground-muted" role="status">Loading route…</div> : error ? <div role="alert" className="text-foreground-muted">
            {error}
            {onRetry && <button type="button" onClick={onRetry} className="ml-3 underline text-foreground">Retry</button>}
        </div> : points.length < 2 ? <div className="text-foreground-muted italic">No GPS route available</div> : <>
            <svg viewBox="0 0 400 220" role="img" aria-label="GPS route from start to finish" className="w-full h-56 text-accent-orange">
                <polyline points={points.map(p => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={points[0][0]} cy={points[0][1]} r="7" className="fill-positive" />
                <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="4" className="fill-negative" />
            </svg>
            <div className="flex gap-4 text-xs text-foreground-muted">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-positive" />Start</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-negative" />Finish</span>
            </div>
        </>}
    </section>;
}
