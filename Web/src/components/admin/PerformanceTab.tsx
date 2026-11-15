'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  AlertTriangle,
  GitCommit,
  Clock,
  Filter,
  Download,
  Database,
  Wifi,
  MemoryStick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApiRoutesTable from '@/components/admin/performance/ApiRoutesTable';
import RealTimeDashboard from '@/components/admin/performance/RealTimeDashboard';
import ErrorAnalytics from '@/components/admin/performance/ErrorAnalytics';
import ReleaseTracking from '@/components/admin/performance/ReleaseTracking';

type TabType = 'realtime' | 'routes' | 'errors' | 'releases';

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export default function PerformanceTab() {
  const [activeTab, setActiveTab] = useState<TabType>('realtime');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [routeErrorFilter, setRouteErrorFilter] = useState<string>('');

  const tabs = [
    { id: 'realtime' as TabType, label: 'Real-Time', icon: Activity },
    { id: 'routes' as TabType, label: 'API Routes', icon: Zap },
    { id: 'errors' as TabType, label: 'Errors', icon: AlertTriangle },
    { id: 'releases' as TabType, label: 'Releases', icon: GitCommit },
  ];

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1 hour' },
    { value: '6h', label: '6 hours' },
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
  ];

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/performance-metrics?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-metrics-${timeRange}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silently fail export
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">System Performance</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-foreground-muted" aria-hidden="true" />
            <label htmlFor="perf-time-range" className="sr-only">Time range</label>
            <select
              id="perf-time-range"
              aria-label="Time range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="text-sm border border-line bg-background rounded px-3 py-1.5 focus:ring-2 focus:ring-accent-orange focus:border-accent-orange"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <div className="border-b border-line">
        <div
          role="tablist"
          aria-label="Performance telemetry views"
          className="flex gap-2 overflow-x-auto"
          onKeyDown={(e) => {
            const idx = tabs.findIndex((t) => t.id === activeTab);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              const next = tabs[(idx + 1) % tabs.length];
              setActiveTab(next.id);
              document.getElementById(`perf-tab-${next.id}`)?.focus();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
              setActiveTab(prev.id);
              document.getElementById(`perf-tab-${prev.id}`)?.focus();
            }
          }}
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`perf-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`perf-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                  selected
                    ? 'border-accent-orange text-foreground font-semibold'
                    : 'border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${selected ? 'text-accent-orange' : ''}`} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`perf-panel-${activeTab}`}
        aria-labelledby={`perf-tab-${activeTab}`}
        className="min-h-[600px]"
      >
        {activeTab === 'realtime' && (
          <RealTimeDashboard refreshInterval={10000} />
        )}

        {activeTab === 'routes' && (
          <ApiRoutesTab
            timeRange={timeRange}
            onInspectRouteErrors={(routePath) => {
              setRouteErrorFilter(routePath);
              setActiveTab('errors');
            }}
          />
        )}

        {activeTab === 'errors' && (
          <ErrorAnalytics initialRouteFilter={routeErrorFilter} />
        )}

        {activeTab === 'releases' && (
          <ReleaseTracking />
        )}
      </div>
    </div>
  );
}

interface ApiRoutesTabProps {
  timeRange: TimeRange;
  onInspectRouteErrors?: (_routePath: string) => void;
}

type SortableRouteColumn =
  | 'routePath'
  | 'method'
  | 'requestCount'
  | 'avgResponseTime'
  | 'p95ResponseTime'
  | 'p99ResponseTime'
  | 'errorCount'
  | 'avgCpuUsage'
  | 'avgMemoryUsage';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1h': '1 hour',
  '6h': '6 hours',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

function ApiRoutesTab({ timeRange, onInspectRouteErrors }: ApiRoutesTabProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortableRouteColumn>('requestCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/performance-metrics?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        setDataSource(data.dataSource || 'unknown');
      }
    } catch {
      // silently fail fetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleSort = (column: string) => {
    const col = column as SortableRouteColumn;
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder(col === 'routePath' || col === 'method' ? 'asc' : 'desc');
    }
  };

  const sortedRoutes = React.useMemo(() => {
    return [...routes].sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      const numDiff = (Number(aVal) || 0) - (Number(bVal) || 0);
      return sortOrder === 'asc' ? numDiff : -numDiff;
    });
  }, [routes, sortBy, sortOrder]);

  const getDataSourceBadge = () => {
    switch (dataSource) {
      case 'aggregated':
        return { label: 'Pre-aggregated', icon: Database, color: 'text-positive bg-positive/10' };
      case 'database':
        return { label: 'Live from DB', icon: Database, color: 'text-accent-blue bg-accent-blue/10' };
      case 'memory':
        return { label: 'In-memory (current session)', icon: MemoryStick, color: 'text-workout-tempo bg-workout-tempo/10' };
      default:
        return { label: 'Unknown', icon: Wifi, color: 'text-foreground-secondary bg-background-secondary' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-orange"></div>
      </div>
    );
  }

  const sourceBadge = getDataSourceBadge();
  const SourceIcon = sourceBadge.icon;

  return (
    <div className="space-y-4">
      <div className="bg-background-secondary p-6 rounded-md  border border-line">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">API Routes Performance</h3>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sourceBadge.color}`}>
              <SourceIcon className="w-3 h-3" />
              {sourceBadge.label}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Clock className="w-4 h-4" />
              Last {TIME_RANGE_LABELS[timeRange]}
            </div>
            <Button onClick={fetchRoutes} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
        <ApiRoutesTable
          routes={sortedRoutes}
          _sortBy={sortBy}
          _sortOrder={sortOrder}
          onSort={handleSort}
          onRouteClick={(route) => onInspectRouteErrors?.(route.routePath)}
        />
      </div>
    </div>
  );
}
