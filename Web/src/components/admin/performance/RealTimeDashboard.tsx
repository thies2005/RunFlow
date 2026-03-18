import React, { useEffect, useState } from 'react';
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

interface RealTimeDashboardProps {
  refreshInterval?: number;
}

export default function RealTimeDashboard({ refreshInterval = 1000 }: RealTimeDashboardProps) {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<RealTimeMetrics | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/performance-metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.realTime);
      }
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    if (metrics && !previousMetrics) {
      setPreviousMetrics(metrics);
    }
  }, [metrics]);

  const getChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      positive: change > 0,
    };
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-50';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Real-Time Metrics
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          {new Date(metrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Requests/sec"
          value={metrics.requestsPerSecond.toFixed(2)}
          icon={Zap}
          color="bg-blue-500"
          change={getChange(metrics.requestsPerSecond, previousMetrics?.requestsPerSecond)}
          inverse={true}
        />
        <MetricCard
          title="Errors/sec"
          value={metrics.errorsPerSecond.toFixed(2)}
          icon={AlertTriangle}
          color="bg-red-500"
          change={getChange(metrics.errorsPerSecond, previousMetrics?.errorsPerSecond)}
          inverse={true}
        />
        <MetricCard
          title="Avg Response"
          value={`${metrics.avgResponseTime.toFixed(0)}ms`}
          icon={Clock}
          color="bg-purple-500"
          change={getChange(metrics.avgResponseTime, previousMetrics?.avgResponseTime)}
          inverse={true}
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(2)}%`}
          icon={AlertTriangle}
          color={metrics.errorRate > 1 ? 'bg-red-500' : 'bg-green-500'}
          change={getChange(metrics.errorRate, previousMetrics?.errorRate)}
          inverse={true}
        />
        <MetricCard
          title="CPU Usage"
          value={`${metrics.cpuUsage.toFixed(1)}%`}
          icon={Cpu}
          color={metrics.cpuUsage > 80 ? 'bg-red-500' : metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}
          change={getChange(metrics.cpuUsage, previousMetrics?.cpuUsage)}
          inverse={true}
        />
        <MetricCard
          title="Memory Usage"
          value={`${metrics.memoryUsage.toFixed(0)}MB`}
          icon={HardDrive}
          color={metrics.memoryUsage > 1024 ? 'bg-red-500' : metrics.memoryUsage > 512 ? 'bg-yellow-500' : 'bg-green-500'}
          change={getChange(metrics.memoryUsage, previousMetrics?.memoryUsage)}
          inverse={true}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-600 mb-3">Mini Sparklines</h4>
        <div className="grid grid-cols-3 gap-4">
          <Sparkline
            label="Requests"
            color="#3B82F6"
            height={60}
          />
          <Sparkline
            label="Response Time"
            color="#8B5CF6"
            height={60}
          />
          <Sparkline
            label="CPU"
            color="#10B981"
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            {change && (
              <div className={`flex items-center text-xs mt-1 ${
                (change.positive && !inverse) || (!change.positive && inverse) ? 'text-red-500' : 'text-green-500'
              }`}>
                <span className="mr-1">{change.positive ? '↑' : '↓'}</span>
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
  color: string;
  height: number;
}

function Sparkline({ label, color, height }: SparklineProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div
        className="rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}05)`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '4px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: `${Math.random() * 60 + 20}%`,
            background: color,
            borderRadius: '4px',
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}
