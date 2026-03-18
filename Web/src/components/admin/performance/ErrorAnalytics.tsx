import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ErrorLog {
  id: string;
  routePath: string;
  method: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  userAgent?: string;
  timestamp: string;
  resolved: boolean;
  count: number;
  fingerprint?: string;
}

interface ErrorGroup {
  fingerprint: string;
  errorMessage: string;
  routePath: string;
  method: string;
  count: number;
  resolved: boolean;
  firstSeen: string;
  lastSeen: string;
}

interface ErrorAnalyticsProps {
  onResolveError?: (errorId: string) => void;
}

export default function ErrorAnalytics({ onResolveError }: ErrorAnalyticsProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filters, setFilters] = useState({
    resolved: '' as '' | 'true' | 'false',
    route: '',
  });

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.resolved) params.set('resolved', filters.resolved);
      if (filters.route) params.set('route', filters.route);

      const res = await fetch(`/api/admin/error-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors);
        setErrorGroups(data.errorGroups || []);
      }
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [filters]);

  const handleResolve = async (errorId: string) => {
    try {
      const res = await fetch(`/api/admin/error-logs/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });

      if (res.ok) {
        onResolveError?.(errorId);
        fetchErrors();
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const unresolvedCount = errors.filter(e => !e.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Error Analytics
        </h3>
        <div className="flex items-center gap-2">
          {unresolvedCount > 0 && (
            <Badge variant="destructive">
              {unresolvedCount} Unresolved
            </Badge>
          )}
          <Button onClick={fetchErrors} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by route..."
              value={filters.route}
              onChange={(e) => setFilters({ ...filters, route: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.resolved}
            onChange={(e) => setFilters({ ...filters, resolved: e.target.value as '' | 'true' | 'false' })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Errors</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h4 className="font-medium text-gray-800">Error Groups</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {errorGroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No errors found
            </div>
          ) : (
            errorGroups.map((group) => (
              <ErrorGroupItem
                key={group.fingerprint}
                group={group}
                onClick={() => {
                  const error = errors.find(e => e.fingerprint === group.fingerprint);
                  if (error) setSelectedError(error);
                }}
                onResolve={() => {
                  const error = errors.find(e => e.fingerprint === group.fingerprint);
                  if (error) handleResolve(error.id);
                }}
              />
            ))
          )}
        </div>
      </div>

      {selectedError && (
        <ErrorDetailModal
          error={selectedError}
          onClose={() => setSelectedError(null)}
          onResolve={() => {
            handleResolve(selectedError.id);
            setSelectedError(null);
          }}
        />
      )}
    </div>
  );
}

interface ErrorGroupItemProps {
  group: ErrorGroup;
  onClick: () => void;
  onResolve: () => void;
}

function ErrorGroupItem({ group, onClick, onResolve }: ErrorGroupItemProps) {
  return (
    <div
      className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={group.resolved ? 'secondary' : 'destructive'}>
              {group.resolved ? 'Resolved' : 'Unresolved'}
            </Badge>
            <Badge variant="outline">{group.method}</Badge>
            <span className="text-xs text-gray-500">{group.count} occurrences</span>
          </div>
          <p className="text-sm font-medium text-gray-800 mb-1">{group.errorMessage}</p>
          <p className="text-xs text-gray-500 font-mono">{group.routePath}</p>
        </div>
        {!group.resolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Resolve
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <span>First: {new Date(group.firstSeen).toLocaleString()}</span>
        <span>Last: {new Date(group.lastSeen).toLocaleString()}</span>
      </div>
    </div>
  );
}

interface ErrorDetailModalProps {
  error: ErrorLog;
  onClose: () => void;
  onResolve: () => void;
}

function ErrorDetailModal({ error, onClose, onResolve }: ErrorDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Error Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Message</label>
              <p className="mt-1 text-gray-800">{error.errorMessage}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Route</label>
              <p className="mt-1 font-mono text-sm bg-gray-50 p-2 rounded">{error.routePath}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Method</label>
              <Badge className="mt-1">{error.method}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Timestamp</label>
              <p className="mt-1 text-sm text-gray-600">{new Date(error.timestamp).toLocaleString()}</p>
            </div>
            {error.stackTrace && (
              <div>
                <label className="text-sm font-medium text-gray-600">Stack Trace</label>
                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {error.stackTrace}
                </pre>
              </div>
            )}
            {error.userId && (
              <div>
                <label className="text-sm font-medium text-gray-600">User ID</label>
                <p className="mt-1 text-sm">{error.userId}</p>
              </div>
            )}
            <div className="flex gap-2">
              {!error.resolved && (
                <Button onClick={onResolve}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Error
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
