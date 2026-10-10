import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Cpu, HardDrive, Zap, AlertTriangle, Clock } from 'lucide-react';

interface RealTimeMetrics {
  requestsPerSecond: number;
  errorsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

interface SparklineDataPoint {
  value: number;
  timestamp: number;
}

interface RealTimeDashboardProps {
  refreshInterval?: number;
}

const MAX_HISTORY = 60;

export default function RealTimeDashboard({ refreshInterval = 1000 }: RealTimeDashboardProps) {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<RealTimeMetrics | null>(null);
  const [history, setHistory] = useState<{
    requests: SparklineDataPoint[];
    responseTime: SparklineDataPoint[];
    cpu: SparklineDataPoint[];
    memory: SparklineDataPoint[];
  }>({
    requests: [],
    responseTime: [],
    cpu: [],
    memory: [],
  });

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/performance-metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.realTime) {
          setMetrics(prev => {
            if (prev) setPreviousMetrics(prev);
            return data.realTime;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  useEffect(() => {
    if (!metrics) return;
    const now = Date.now();
    setHistory(prev => ({
      requests: [...prev.requests.slice(-(MAX_HISTORY - 1)), { value: metrics.requestsPerSecond, timestamp: now }],
      responseTime: [...prev.responseTime.slice(-(MAX_HISTORY - 1)), { value: metrics.avgResponseTime, timestamp: now }],
      cpu: [...prev.cpu.slice(-(MAX_HISTORY - 1)), { value: metrics.cpuUsage, timestamp: now }],
      memory: [...prev.memory.slice(-(MAX_HISTORY - 1)), { value: metrics.memoryUsage, timestamp: now }],
    }));
  }, [metrics]);

  const getChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === null || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      positive: change > 0,
    };
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Real-Time Metrics
        </h3>
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Clock className="w-4 h-4" />
          {new Date(metrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Requests/sec"
          value={metrics.requestsPerSecond.toFixed(2)}
          icon={Zap}
          color="bg-accent-blue"
          change={getChange(metrics.requestsPerSecond, previousMetrics?.requestsPerSecond)}
          inverse={true}
        />
        <MetricCard
          title="Errors/sec"
          value={metrics.errorsPerSecond.toFixed(2)}
          icon={AlertTriangle}
          color="bg-negative"
          change={getChange(metrics.errorsPerSecond, previousMetrics?.errorsPerSecond)}
          inverse={true}
        />
        <MetricCard
          title="Avg Response"
          value={`${metrics.avgResponseTime.toFixed(0)}ms`}
          icon={Clock}
          color="bg-workout-long-run"
          change={getChange(metrics.avgResponseTime, previousMetrics?.avgResponseTime)}
          inverse={true}
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(2)}%`}
          icon={AlertTriangle}
          color={metrics.errorRate > 1 ? 'bg-negative' : 'bg-positive'}
          change={getChange(metrics.errorRate, previousMetrics?.errorRate)}
          inverse={true}
        />
        <MetricCard
          title="CPU Usage"
          value={`${metrics.cpuUsage.toFixed(1)}%`}
          icon={Cpu}
          color={metrics.cpuUsage > 80 ? 'bg-negative' : metrics.cpuUsage > 60 ? 'bg-workout-tempo' : 'bg-positive'}
          change={getChange(metrics.cpuUsage, previousMetrics?.cpuUsage)}
          inverse={true}
        />
        <MetricCard
          title="Memory Usage"
          value={`${metrics.memoryUsage.toFixed(0)}MB`}
          icon={HardDrive}
          color={metrics.memoryUsage > 1024 ? 'bg-negative' : metrics.memoryUsage > 512 ? 'bg-workout-tempo' : 'bg-positive'}
          change={getChange(metrics.memoryUsage, previousMetrics?.memoryUsage)}
          inverse={true}
        />
      </div>

      <div className="bg-background-secondary rounded-md p-4">
        <h4 className="text-sm font-medium text-foreground-secondary mb-3">Trends (last 60 readings)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Sparkline
            label="Requests/sec"
            data={history.requests}
            color="var(--accent-blue)"
            height={60}
          />
          <Sparkline
            label="Response Time (ms)"
            data={history.responseTime}
            color="var(--workout-long-run)"
            height={60}
          />
          <Sparkline
            label="CPU %"
            data={history.cpu}
            color="var(--positive)"
            height={60}
          />
          <Sparkline
            label="Memory (MB)"
            data={history.memory}
            color="var(--workout-tempo)"
            height={60}
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change?: { value: string; positive: boolean } | null;
  inverse?: boolean;
}

function MetricCard({ title, value, icon: Icon, color, change, inverse = false }: MetricCardProps) {
  return (
    <div className="bg-background-secondary p-6 rounded-md  border border-line">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-md ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-foreground-muted text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">{value}</h3>
            {change && (
              <div className={`flex items-center text-xs mt-1 ${
                (change.positive && !inverse) || (!change.positive && inverse) ? 'text-negative' : 'text-positive'
              }`}>
                <span className="mr-1">{change.positive ? '\u2191' : '\u2193'}</span>
                {change.value}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SparklineProps {
  label: string;
  data: SparklineDataPoint[];
  color: string;
  height: number;
}

function Sparkline({ label, data, color, height }: SparklineProps) {
  if (data.length < 2) {
    return (
      <div>
        <p className="text-xs text-foreground-muted mb-2">{label}</p>
        <div
          className="rounded-md flex items-center justify-center border border-line"
          style={{
            background: 'var(--background-tertiary)',
            height: `${height}px`,
          }}
        >
          <span className="text-xs text-foreground-muted">Collecting data...</span>
        </div>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const svgWidth = 200;
  const step = svgWidth / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - 4 - ((d.value - minVal) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${svgWidth},${height}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-foreground-muted">{label}</p>
        {data.length > 0 && (
          <span className="text-xs font-medium font-mono tabular-nums" style={{ color }}>
            {data[data.length - 1].value < 10
              ? data[data.length - 1].value.toFixed(2)
              : data[data.length - 1].value.toFixed(0)}
          </span>
        )}
      </div>
      <div className="rounded-md overflow-hidden border border-line" style={{ background: 'var(--background-tertiary)' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${svgWidth} ${height}`}
          preserveAspectRatio="none"
        >
          <polygon points={areaPoints} fill="none" />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {data.length > 0 && (
            <circle
              cx={(data.length - 1) * step}
              cy={height - 4 - ((data[data.length - 1].value - minVal) / range) * (height - 8)}
              r="3"
              fill={color}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
