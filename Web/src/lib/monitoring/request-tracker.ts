interface TrackedRequest {
  routePath: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
}

const requestBuffer: TrackedRequest[] = [];
const MAX_BUFFER_SIZE = 5000;
const BUFFER_TTL = 5 * 60 * 1000;

const routeCountMap = new Map<string, { count: number; errorCount: number; totalResponseTime: number; lastSeen: number }>();

export function recordTrackedRequest(data: TrackedRequest): void {
  requestBuffer.push(data);

  while (requestBuffer.length > 0 && Date.now() - requestBuffer[0].timestamp > BUFFER_TTL) {
    requestBuffer.shift();
  }

  while (requestBuffer.length > MAX_BUFFER_SIZE) {
    requestBuffer.shift();
  }

  const key = `${data.method}:${data.routePath}`;
  const existing = routeCountMap.get(key);
  if (existing) {
    existing.count += 1;
    existing.totalResponseTime += data.responseTime;
    existing.lastSeen = data.timestamp;
    if (data.statusCode >= 400) {
      existing.errorCount += 1;
    }
  } else {
    routeCountMap.set(key, {
      count: 1,
      errorCount: data.statusCode >= 400 ? 1 : 0,
      totalResponseTime: data.responseTime,
      lastSeen: data.timestamp,
    });
  }
}

export function getRecentTrackedRequests(durationMs: number = 60000): TrackedRequest[] {
  const cutoff = Date.now() - durationMs;
  return requestBuffer.filter(r => r.timestamp >= cutoff);
}

export function getTrackedRouteStats(): Array<{
  routePath: string;
  method: string;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastSeen: number;
}> {
  const results: Array<{
    routePath: string;
    method: string;
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    lastSeen: number;
  }> = [];

  routeCountMap.forEach((stats, key) => {
    const [method, ...pathParts] = key.split(':');
    const routePath = pathParts.join(':');
    results.push({
      routePath,
      method,
      requestCount: stats.count,
      errorCount: stats.errorCount,
      avgResponseTime: stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
      lastSeen: stats.lastSeen,
    });
  });

  return results.sort((a, b) => b.requestCount - a.requestCount);
}

export function getRealTimeStats(): {
  requestsPerSecond: number;
  errorsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
  totalRequests: number;
} {
  const now = Date.now();
  const lastMinute = requestBuffer.filter(r => now - r.timestamp < 60000);

  const requestsPerSecond = lastMinute.length / 60;
  const errors = lastMinute.filter(r => r.statusCode >= 400);
  const errorsPerSecond = errors.length / 60;
  const avgResponseTime = lastMinute.length > 0
    ? lastMinute.reduce((sum, r) => sum + r.responseTime, 0) / lastMinute.length
    : 0;
  const errorRate = lastMinute.length > 0
    ? (errors.length / lastMinute.length) * 100
    : 0;

  return {
    requestsPerSecond,
    errorsPerSecond,
    avgResponseTime,
    errorRate,
    totalRequests: lastMinute.length,
  };
}
