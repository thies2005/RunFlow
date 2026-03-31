import React, { useEffect, useState } from 'react';
import { GitCommit, GitBranch, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Release {
  id: string;
  version: string;
  deployedAt: string;
  deployedBy?: string;
  commitHash?: string;
  notes?: string;
}

interface ReleaseComparison {
  earlierRelease: {
    version: string;
    deployedAt: string;
    metrics: any;
  };
  laterRelease: {
    version: string;
    deployedAt: string;
    metrics: any;
  };
  comparison: {
    avgResponseTimeChange: number;
    errorRateChange: number;
    requestCountChange: number;
  };
}

export default function ReleaseTrackingDashboard() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<[string, string] | null>(null);
  const [comparison, setComparison] = useState<ReleaseComparison | null>(null);
  const [tracking, setTracking] = useState(false);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/releases');
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases);
      }
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (version1: string, version2: string) => {
    try {
      const res = await fetch(`/api/admin/releases?compare=${version1},${version2}`);
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      }
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
    }
  };

  const trackRelease = async () => {
    try {
      setTracking(true);
      const res = await fetch('/api/admin/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Manual release tracking' }),
      });

      if (res.ok) {
        fetchReleases();
      }
    } catch (error) {
      console.error('Failed to track release:', error);
    } finally {
      setTracking(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  useEffect(() => {
    if (selectedVersions && selectedVersions[0] && selectedVersions[1]) {
      fetchComparison(selectedVersions[0], selectedVersions[1]);
    }
  }, [selectedVersions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <GitCommit className="w-5 h-5" />
          Release Tracking
        </h3>
        <Button onClick={trackRelease} disabled={tracking} size="sm">
          {tracking ? 'Tracking...' : 'Track Current Release'}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h4 className="font-medium text-gray-800">Deployment History</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deployed At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deployed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {releases.map((release, index) => (
                <tr key={release.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline">{release.version}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(release.deployedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {release.deployedBy || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {release.commitHash || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      value={selectedVersions?.[index % 2] || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const versions: [string, string] = [
                            selectedVersions?.[0] || '',
                            selectedVersions?.[1] || '',
                          ];
                          versions[index % 2] = e.target.value;
                          setSelectedVersions(versions);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      {releases.map(r => (
                        <option key={r.id} value={r.version}>{r.version}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {comparison && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6">
          <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Performance Comparison
          </h4>
          <div className="grid grid-cols-3 gap-6">
            <ComparisonMetric
              label="Avg Response Time"
              before={comparison.earlierRelease.metrics.avgResponseTime}
              after={comparison.laterRelease.metrics.avgResponseTime}
              change={comparison.comparison.avgResponseTimeChange}
              unit="ms"
              inverse
            />
            <ComparisonMetric
              label="Error Rate"
              before={comparison.earlierRelease.metrics.errorRate}
              after={comparison.laterRelease.metrics.errorRate}
              change={comparison.comparison.errorRateChange}
              unit="%"
              inverse
            />
            <ComparisonMetric
              label="Request Count"
              before={comparison.earlierRelease.metrics.requestCount}
              after={comparison.laterRelease.metrics.requestCount}
              change={comparison.comparison.requestCountChange}
              unit=""
            />
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{comparison.earlierRelease.version}</Badge>
              <Calendar className="w-4 h-4" />
              {new Date(comparison.earlierRelease.deployedAt).toLocaleDateString()}
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{comparison.laterRelease.version}</Badge>
              <Calendar className="w-4 h-4" />
              {new Date(comparison.laterRelease.deployedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ComparisonMetricProps {
  label: string;
  before: number;
  after: number;
  change: number;
  unit: string;
  inverse?: boolean;
}

function ComparisonMetric({ label, before, after, change, unit, inverse }: ComparisonMetricProps) {
  const isPositive = (change > 0 && !inverse) || (change < 0 && inverse);
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">Before</span>
        <span className="font-medium">{before.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">After</span>
        <span className="font-medium">{after.toFixed(2)}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
