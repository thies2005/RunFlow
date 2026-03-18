# Performance Monitoring Tab

## Overview

The Performance tab provides real-time system performance metrics and resource usage monitoring for your RunFlow application. Access it via:

**URL:** `https://your-domain.com/admin?tab=performance`

**Authentication:** Requires admin credentials (same as other admin tabs)

## Features

### 1. Health Status
- Overall system health (healthy/unhealthy)
- Database connection status and latency
- Strava integration status
- AI provider configuration status
- Memory usage status

### 2. Quick Stats
- **Uptime:** How long the application has been running
- **Avg Response:** Average API response time in milliseconds
- **Error Rate:** Percentage of failed requests in last 5 minutes
- **CPU Usage:** Current CPU utilization percentage with load average

### 3. Memory Usage
Visual breakdown of memory consumption:
- **Heap Memory:** Used vs total heap allocation
- **RSS (Resident Set Size):** Physical memory used
- **External:** Memory used by C++ objects
- **Array Buffers:** Memory used by typed arrays

Color-coded indicators:
- 🟢 Green: < 70% usage
- 🟡 Yellow: 70-90% usage
- 🔴 Red: > 90% usage

### 4. Database Connection Pool
- Total connections in pool
- Currently active connections
- Idle connections available

### 5. System Information
- Node.js version
- Platform (OS)
- Last update timestamp

## Auto-Refresh

The performance data automatically refreshes every 10 seconds. You can also manually refresh using the "Refresh" button.

## API Endpoint

You can access performance data programmatically via:

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://your-domain.com/api/admin/performance
```

### Response Format

```json
{
  "timestamp": "2024-03-18T15:30:00.000Z",
  "data": {
    "health": {
      "status": "healthy",
      "checks": {
        "database": { "status": "healthy", "latency": 15 },
        "strava": { "status": "healthy" },
        "aiProviders": { "status": "healthy" },
        "memory": { "status": "healthy", "usedMB": 512, "totalMB": 1024, "percentage": 50 }
      }
    },
    "system": {
      "uptime": 3600.5,
      "platform": "linux",
      "nodeVersion": "v22.12.0",
      "memory": {
        "used": 512,
        "total": 1024,
        "percentage": 50,
        "rss": 640,
        "heapTotal": 1024,
        "heapUsed": 512,
        "external": 128,
        "arrayBuffers": 64
      },
      "cpu": {
        "usage": 45.5,
        "loadAverage": [1.2, 1.1, 1.0]
      }
    },
    "requests": {
      "errorRate": 0.5,
      "avgResponseTime": 150,
      "uptime": 3600,
      "totalMetrics": 1250
    },
    "database": {
      "connectionPool": {
        "totalCount": 10,
        "activeCount": 3,
        "idleCount": 7
      },
      "queriesLastMinute": 0
    }
  }
}
```

## Troubleshooting

### High Memory Usage
If memory usage consistently exceeds 90%:
1. Check for memory leaks in custom code
2. Review database query optimization
3. Consider increasing container memory limits in docker-compose.yml

### High CPU Usage
If CPU usage consistently exceeds 80%:
1. Review slow API endpoints (check logs for high duration)
2. Optimize database queries
3. Consider scaling horizontally

### High Error Rate
If error rate exceeds 1%:
1. Check application logs for errors
2. Review database connectivity
3. Verify external API integrations (Strava, AI providers)

### Database Connection Pool Issues
If connection pool is exhausted:
1. Increase connection pool size
2. Check for connection leaks
3. Review query optimization

## Integration with Other Monitoring

### Request Logging
All API requests are logged with timing information in the middleware. View logs in Coolify:
- Coolify → Your Resource → Logs tab
- Search for "Request completed" to see response times

### Health Check Endpoint
Simple health check available without authentication:
```bash
curl https://your-domain.com/api/health
```

## Performance Best Practices

1. **Monitor Regularly:** Check the Performance tab daily, especially after deployments
2. **Set Alerts:** Configure monitoring tools to alert on:
   - Error rate > 1%
   - Memory usage > 90%
   - CPU usage > 80%
   - Database latency > 1s
3. **Baseline Metrics:** Establish baseline performance metrics for comparison
4. **After Changes:** Always review performance after:
   - Code deployments
   - Database migrations
   - Configuration changes

## Technical Details

### Data Collection
- Metrics are collected in-memory for the last 5 minutes
- Health checks run on-demand when requested
- System metrics are collected from Node.js process and OS

### Performance Impact
The monitoring system has minimal performance impact:
- In-memory metrics storage (no database writes)
- Health checks only run when requested
- Lightweight sampling for CPU/memory

### Memory Management
- Metrics buffer automatically clears old data (> 5 minutes)
- Maximum 1,000 metric entries retained
- Automatic cleanup when limits exceeded
