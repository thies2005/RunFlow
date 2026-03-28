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
    } catch (error) {
      // silently fail export
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">System Performance</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'realtime' && (
          <RealTimeDashboard refreshInterval={1000} />
        )}

        {activeTab === 'routes' && (
          <ApiRoutesTab timeRange={timeRange} />
        )}

        {activeTab === 'errors' && (
          <ErrorAnalytics />
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
}

function ApiRoutesTab({ timeRange }: ApiRoutesTabProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/performance-metrics?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      // silently fail fetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">API Routes Performance</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            Last {timeRange === '1h' ? 'hour' : timeRange === '24h' ? '24 hours' : timeRange + ' days'}
          </div>
        </div>
        <ApiRoutesTable
          routes={routes}
          onRouteClick={(_route) => {}}
        />
      </div>
    </div>
  );
}
