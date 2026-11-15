import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { csrfHeaders } from '@/lib/admin/csrfHelper';

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
  onResolveError?: (_errorId: string) => void;
  initialRouteFilter?: string;
}

export default function ErrorAnalytics({ onResolveError, initialRouteFilter = '' }: ErrorAnalyticsProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filters, setFilters] = useState({
    resolved: '' as '' | 'true' | 'false',
    route: initialRouteFilter,
  });

  useEffect(() => {
    if (initialRouteFilter) {
      setFilters((prev) => ({ ...prev, route: initialRouteFilter }));
    }
  }, [initialRouteFilter]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.resolved, filters.route]);

  const handleResolve = async (errorId: string) => {
    try {
      const res = await fetch(`/api/admin/error-logs/${errorId}`, {
        method: 'PATCH',
        headers: csrfHeaders(),
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

  if (loading && errors.length === 0) {
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

      <div className="bg-background-secondary border border-line p-4 rounded">
        <div role="search" aria-label="Filter errors" className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted w-4 h-4 pointer-events-none" aria-hidden="true" />
            <label htmlFor="error-route-search" className="sr-only">Search errors by route</label>
            <input
              id="error-route-search"
              type="search"
              placeholder="Search by route..."
              value={filters.route}
              onChange={(e) => setFilters({ ...filters, route: e.target.value })}
              className="w-full pl-9 pr-4 py-2 bg-background border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange text-sm"
            />
          </div>
          <div>
            <label htmlFor="error-resolved-filter" className="sr-only">Filter errors by status</label>
            <select
              id="error-resolved-filter"
              value={filters.resolved}
              onChange={(e) => setFilters({ ...filters, resolved: e.target.value as '' | 'true' | 'false' })}
              className="w-full sm:w-auto px-3 py-2 bg-background border border-line rounded focus:ring-2 focus:ring-accent-orange focus:border-accent-orange text-sm"
            >
              <option value="">All Errors</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary rounded-md  border border-line overflow-hidden">
        <div className="p-4 border-b border-line">
          <h4 className="font-medium text-foreground">Error Groups</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {errorGroups.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-positive mx-auto mb-3" />
              <p className="text-foreground-secondary font-medium">No errors found</p>
              <p className="text-foreground-muted text-sm mt-1">
                Errors from API routes (status 400+) will automatically appear here when they occur.
              </p>
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
      className="p-4 border-b border-line hover:bg-background-secondary cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={group.resolved ? 'secondary' : 'destructive'}>
              {group.resolved ? 'Resolved' : 'Unresolved'}
            </Badge>
            <Badge variant="outline">{group.method}</Badge>
            <span className="text-xs text-foreground-muted">{group.count} occurrences</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{group.errorMessage}</p>
          <p className="text-xs text-foreground-muted font-mono">{group.routePath}</p>
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
      <div className="flex items-center gap-4 mt-2 text-xs text-foreground-muted">
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
    <Modal isOpen={true} onClose={onClose} title="Error Details" maxWidth="2xl">
      <div className="space-y-4">
        <dl className="space-y-4">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Message</dt>
            <dd className="mt-1 text-foreground text-sm">{error.errorMessage}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Route</dt>
            <dd className="mt-1 font-mono text-sm bg-background border border-line p-2 rounded">{error.routePath}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Method</dt>
            <dd className="mt-1"><Badge>{error.method}</Badge></dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Timestamp</dt>
            <dd className="mt-1 text-sm font-mono tabular-nums text-foreground-secondary">{new Date(error.timestamp).toLocaleString()}</dd>
          </div>
          {error.stackTrace && (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Stack Trace</dt>
              <dd>
                <pre className="mt-1 text-xs bg-background border border-line p-3 rounded overflow-x-auto font-mono">
                  {error.stackTrace}
                </pre>
              </dd>
            </div>
          )}
          {error.userId && (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-foreground-muted">User ID</dt>
              <dd className="mt-1 text-sm font-mono">{error.userId}</dd>
            </div>
          )}
        </dl>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          {!error.resolved && (
            <Button type="button" onClick={onResolve}>
              <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              Resolve Error
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
