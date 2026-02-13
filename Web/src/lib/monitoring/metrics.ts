interface MetricEntry {
    name: string;
    value: number;
    timestamp: number;
}

const metricsStore = new Map<string, MetricEntry[]>();
const MAX_METRICS_PER_NAME = 1000;
const MAX_METRICS_TOTAL = 10000;
const METRICS_TTL = 5 * 60 * 1000;

export function recordMetric(name: string, value: number): void {
    const now = Date.now();
    const entry: MetricEntry = { name, value, timestamp: now };

    if (!metricsStore.has(name)) {
        metricsStore.set(name, []);
    }

    const metrics = metricsStore.get(name)!;
    metrics.push(entry);

    while (metrics.length > MAX_METRICS_PER_NAME) {
        metrics.shift();
    }

    cleanupOldMetrics();
}

export function getMetrics(name: string): MetricEntry[] {
    const metrics = metricsStore.get(name) || [];
    return metrics.filter(m => Date.now() - m.timestamp <= METRICS_TTL);
}

export function getAllMetrics(): Record<string, MetricEntry[]> {
    const result: Record<string, MetricEntry[]> = {};
    const now = Date.now();

    const entries = Array.from(metricsStore.entries());
    for (const [name, metrics] of entries) {
        const validMetrics = metrics.filter(m => now - m.timestamp <= METRICS_TTL);
        if (validMetrics.length > 0) {
            result[name] = validMetrics;
        }
    }

    return result;
}

export function getAverageMetric(name: string, duration: number): number {
    const metrics = getMetrics(name);
    const now = Date.now();
    const cutoff = now - duration;

    const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
        return 0;
    }

    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
}

function cleanupOldMetrics(): void {
    const now = Date.now();
    let totalMetrics = 0;

    const entries = Array.from(metricsStore.entries());
    for (const [name, metrics] of entries) {
        const validMetrics = metrics.filter(m => now - m.timestamp <= METRICS_TTL);
        metricsStore.set(name, validMetrics);
        totalMetrics += validMetrics.length;
    }

    if (totalMetrics > MAX_METRICS_TOTAL) {
        const sortedNames = Array.from(metricsStore.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(entry => entry[0]);

        let remainingToRemove = totalMetrics - MAX_METRICS_TOTAL;
        for (const name of sortedNames) {
            if (remainingToRemove <= 0) break;

            const metrics = metricsStore.get(name)!;
            const toRemove = Math.min(metrics.length, remainingToRemove);
            metrics.splice(0, toRemove);
            remainingToRemove -= toRemove;
        }
    }
}