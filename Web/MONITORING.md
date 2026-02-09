# Monitoring Guide

## Overview

RunFlow uses a multi-layered monitoring approach to ensure production reliability:

- **Sentry** - Error tracking and performance monitoring
- **Health Checks** - `/api/health` endpoint for system status
- **Metrics Collection** - Real-time error rate and response time tracking

---

## What's Being Monitored

### 1. Error Tracking (Sentry)

All unhandled errors and exceptions are automatically captured and sent to Sentry:

- API route errors
- Server-side rendering errors
- Database query errors (via Prisma integration)
- Authentication failures
- Rate limit violations

### 2. Performance Monitoring (Sentry)

Performance traces are sampled at 10% (`tracesSampleRate: 0.1`) to track:

- API route response times
- Database query performance (Prisma integration)
- End-to-end transaction durations

### 3. Health Checks

The `/api/health` endpoint provides real-time system status:

#### Response Format

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-02-09T12:00:00.000Z",
  "version": "1.2.8",
  "uptime": 3600,
  "responseTime": {
    "ms": 45,
    "ns": 45000000
  },
  "checks": {
    "database": {
      "status": "healthy" | "degraded" | "unhealthy",
      "latency": 23
    },
    "memory": {
      "status": "healthy" | "degraded" | "unhealthy",
      "used": 256,
      "total": 512,
      "percentage": 50
    }
  },
  "metrics": {
    "errorRate": 0.01,
    "avgResponseTime": 45.5
  }
}
```

#### Status Definitions

| Status | Description | HTTP Status Code |
|--------|-------------|------------------|
| `healthy` | All systems operational | 200 |
| `degraded` | Some warnings but still functional | 200 |
| `unhealthy` | System is not operational | 503 |

---

## How to Access Dashboards

### Sentry

1. Visit your Sentry organization dashboard
2. Filter by:
   - **Project**: RunFlow
   - **Environment**: `production` or `development`
3. Use these saved views:
   - **Errors**: Unhandled exceptions and API failures
   - **Performance**: Transaction traces and DB queries
   - **Releases**: Deployments and error rates per version

### Health Check Endpoint

```bash
curl https://your-domain.com/api/health
```

### Docker Health Checks

The application uses built-in Docker health checks that query `/api/health` every 30 seconds. Container status is available via:

```bash
docker ps --filter name=runflow
```

---

## Alert Thresholds

### Health Check Status

| Check | Degraded | Unhealthy |
|-------|----------|-----------|
| Database Latency | > 1000ms | Connection failure |
| Memory Usage | > 75% | > 90% |
| Error Rate | > 5% | > 10% |

### Sentry Alerts (Recommended Configuration)

| Alert Type | Threshold | Time Window |
|------------|-----------|-------------|
| Error Count | > 100 | 5 minutes |
| Error Rate | > 5% | 5 minutes |
| P95 Response Time | > 1000ms | 5 minutes |
| Database Query Time | > 500ms | 5 minutes |

---

## Troubleshooting Guide

### Health Check Returns `unhealthy`

#### Database Issues

**Symptoms**: `"database": { "status": "unhealthy", "error": "..." }`

**Steps**:
1. Check database connection string in `.env`
2. Verify database is accessible: `prisma studio`
3. Run `prisma db push` to ensure schema is up to date
4. Check Sentry for specific database errors

#### Memory Issues

**Symptoms**: `"memory": { "status": "unhealthy", "percentage": 92 }`

**Steps**:
1. Review recent deployments for memory leaks
2. Check Sentry for out-of-memory events
3. Restart container: `docker restart runflow`
4. Consider scaling to larger instance

### Sentry Shows High Error Rate

1. **Identify the error type**:
   - Filter by `level: error`
   - Group by `exception.type`

2. **Check recent changes**:
   - Compare error rate before/after latest deployment
   - Review recent commits

3. **Common issues**:
   - `PrismaClientKnownRequestError` - Database constraint violations
   - `Unauthorized` - Authentication token issues
   - `Too many requests` - Rate limiting

### Performance Degradation

**Symptoms**: P95 response time > 1000ms

**Steps**:
1. Check Sentry Performance tab for slow endpoints
2. Review database query times (Prisma integration)
3. Check for external API latency (Strava, OpenAI)
4. Verify database indexes are optimal

---

## Adding Custom Monitoring

### Tracking Custom Metrics

```typescript
import { recordMetric } from '@/lib/monitoring/health';

const start = Date.now();
try {
  await performOperation();
  recordMetric(Date.now() - start, false);
} catch (error) {
  recordMetric(Date.now() - start, true);
  throw error;
}
```

### Adding Sentry Breadcrumbs

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'user',
  message: 'User completed workout',
  level: 'info',
  data: { workoutId, userId },
});
```

---

## Configuration

### Sentry Environment Variables

```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_APP_VERSION=1.2.8
```

### Performance Sampling Rate

Adjust `tracesSampleRate` in `sentry.server.config.ts`:

```typescript
tracesSampleRate: 0.1,  // 10% of transactions
```

| Rate | Use Case |
|------|----------|
| 0.01 | Production with high traffic |
| 0.1 | Standard production (default) |
| 1.0 | Development or debugging |

---

## Related Files

- `sentry.server.config.ts` - Sentry server configuration
- `sentry.client.config.ts` - Sentry client configuration
- `src/lib/monitoring/health.ts` - Health check utilities
- `src/app/api/health/route.ts` - Health check endpoint
